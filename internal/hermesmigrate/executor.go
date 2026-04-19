package hermesmigrate

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"time"

	"gopkg.in/yaml.v3"
)

// ExecuteInput bundles everything the executor needs at Step 5.
type ExecuteInput struct {
	Snapshot         *OpenClawSnapshot
	ResolvedSecrets  map[string]string // targetId -> plaintext (from secrets.resolve or local .env)
	HermesConfigPath string            // destination config.yaml
	HermesEnvPath    string            // destination .env
	ArchiveRoot      string            // parent of <timestamp>/ archive dirs
	Request          ExecuteRequest
}

// Execute performs the merge, conflict-resolution, and atomic writes.
// It is safe to run even if the hermes files do not yet exist.
func Execute(in ExecuteInput) (*ExecuteReport, error) {
	start := time.Now()
	report := &ExecuteReport{}

	// 1) Load current hermes state (may be missing)
	hermesCfg := map[string]interface{}{}
	if data, err := os.ReadFile(in.HermesConfigPath); err == nil {
		_ = yaml.Unmarshal(data, &hermesCfg)
	}
	hermesEnv := map[string]string{}
	if data, err := os.ReadFile(in.HermesEnvPath); err == nil {
		hermesEnv = parseDotEnv(string(data))
	}

	// 2) Build a fast selection set
	selected := map[string]bool{}
	for _, s := range in.Request.SelectedSourcePaths {
		selected[s] = true
	}
	all := len(selected) == 0

	strategy := in.Request.ConflictStrategy
	if strategy == "" {
		strategy = ConflictSkip
	}

	// 3) Iterate mappings in table order
	for _, m := range fieldMappings {
		if !all && !selected[m.SourcePath] {
			continue
		}
		val, exists := lookupSource(in.Snapshot.Config, m.SourcePath)
		// For sensitive env-target fields, prefer the local .env plaintext
		// when the config value is missing or redacted.
		if m.Sensitive && m.TargetKind == TargetEnv && in.Snapshot.Env != nil {
			if !exists || isRedactedPlaceholder(val) {
				if raw, ok := in.Snapshot.Env[m.TargetKey]; ok && raw != "" {
					val = raw
					exists = true
				}
			}
		}
		if !exists {
			continue
		}

		// Sensitive: require either resolved plaintext or local raw value
		var writeVal interface{} = val
		if m.Sensitive {
			if !in.Request.MigrateSecrets {
				report.SkippedKeys = append(report.SkippedKeys, fmt.Sprintf("%s (未启用敏感迁移)", m.SourcePath))
				continue
			}
			if plain, ok := in.ResolvedSecrets[secretTargetIDFor(m.SourcePath)]; ok && plain != "" {
				writeVal = plain
			} else if isRedactedPlaceholder(val) {
				report.SkippedKeys = append(report.SkippedKeys, fmt.Sprintf("%s (未取得明文)", m.SourcePath))
				continue
			}
			// else: val is already plaintext (from local .env or non-redacted config)
		}

		// Conflict check
		if existing, has := existingHermesValue(hermesCfg, hermesEnv, m); has {
			resolved := applyConflictStrategy(strategy, m, existing, writeVal)
			switch resolved.Action {
			case "skip":
				report.ConflictedKeys = append(report.ConflictedKeys, ConflictRow{
					Key: m.TargetKey, TargetKind: m.TargetKind,
					HermesValue:   stringifyShort(existing, m.Sensitive),
					OpenClawValue: stringifyShort(writeVal, m.Sensitive),
					Resolution:    "skip",
				})
				report.SkippedKeys = append(report.SkippedKeys, m.TargetKey)
				continue
			case "rename":
				// Write to renamed key instead.
				writeKey := resolved.NewKey
				if m.TargetKind == TargetYAML {
					setNested(hermesCfg, writeKey, writeVal)
				} else {
					hermesEnv[writeKey] = fmt.Sprintf("%v", writeVal)
				}
				report.ConflictedKeys = append(report.ConflictedKeys, ConflictRow{
					Key: m.TargetKey, TargetKind: m.TargetKind,
					HermesValue:   stringifyShort(existing, m.Sensitive),
					OpenClawValue: stringifyShort(writeVal, m.Sensitive),
					Resolution:    "renamed:" + writeKey,
				})
				report.WrittenKeys = append(report.WrittenKeys, writeKey)
				continue
			case "overwrite":
				report.ConflictedKeys = append(report.ConflictedKeys, ConflictRow{
					Key: m.TargetKey, TargetKind: m.TargetKind,
					HermesValue:   stringifyShort(existing, m.Sensitive),
					OpenClawValue: stringifyShort(writeVal, m.Sensitive),
					Resolution:    "overwrite",
				})
				// fall through to write
			}
		}

		if m.TargetKind == TargetYAML {
			setNested(hermesCfg, m.TargetKey, writeVal)
		} else {
			hermesEnv[m.TargetKey] = fmt.Sprintf("%v", writeVal)
		}
		report.WrittenKeys = append(report.WrittenKeys, m.TargetKey)
	}

	// 4) Archive unmapped / complex sections
	if in.Request.ArchiveUnmapped {
		archivePath, err := archiveUnmapped(in.ArchiveRoot, in.Snapshot.Config)
		if err != nil {
			report.Warnings = append(report.Warnings, "归档失败: "+err.Error())
		} else {
			report.ArchivePath = archivePath
		}
	}

	// 5) Backup & atomic write
	if path, err := backupFile(in.HermesConfigPath); err == nil {
		report.ConfigBackupPath = path
	}
	if path, err := backupFile(in.HermesEnvPath); err == nil {
		report.EnvBackupPath = path
	}

	if err := writeYAMLAtomic(in.HermesConfigPath, hermesCfg); err != nil {
		return nil, fmt.Errorf("写入 config.yaml 失败: %w", err)
	}
	if err := writeFileAtomic(in.HermesEnvPath, []byte(renderDotEnv(hermesEnv)), 0o600); err != nil {
		return nil, fmt.Errorf("写入 .env 失败: %w", err)
	}

	// Sort for stable report
	sort.Strings(report.WrittenKeys)
	sort.Strings(report.SkippedKeys)
	sort.Strings(report.ArchivedKeys)

	report.DurationMs = time.Since(start).Milliseconds()
	return report, nil
}

type conflictDecision struct {
	Action string // "skip" | "overwrite" | "rename"
	NewKey string
}

func applyConflictStrategy(s ConflictStrategy, m FieldMapping, existing, incoming interface{}) conflictDecision {
	switch s {
	case ConflictOverwrite:
		return conflictDecision{Action: "overwrite"}
	case ConflictRename:
		newKey := m.TargetKey + "_from_openclaw"
		if m.TargetKind == TargetEnv {
			newKey = m.TargetKey + "_FROM_OPENCLAW"
		}
		return conflictDecision{Action: "rename", NewKey: newKey}
	default:
		return conflictDecision{Action: "skip"}
	}
}

// setNested walks/creates nested maps to set cfg[a][b][c] = val.
func setNested(cfg map[string]interface{}, dotted string, val interface{}) {
	parts := splitDot(dotted)
	cur := cfg
	for i, p := range parts {
		if i == len(parts)-1 {
			cur[p] = val
			return
		}
		next, ok := cur[p].(map[string]interface{})
		if !ok {
			next = map[string]interface{}{}
			cur[p] = next
		}
		cur = next
	}
}

// backupFile copies a file to a sibling "<name>.bak.<ts>" if it exists.
func backupFile(path string) (string, error) {
	if path == "" {
		return "", nil
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	ts := time.Now().Format("20060102-150405")
	bak := path + ".bak." + ts
	if err := os.WriteFile(bak, data, 0o600); err != nil {
		return "", err
	}
	return bak, nil
}

func writeYAMLAtomic(path string, data map[string]interface{}) error {
	if path == "" {
		return fmt.Errorf("empty path")
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	buf, err := yaml.Marshal(data)
	if err != nil {
		return err
	}
	return writeFileAtomic(path, buf, 0o644)
}

func writeFileAtomic(path string, data []byte, mode os.FileMode) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, data, mode); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

// archiveUnmapped writes the raw openclaw config plus a README to
// <archiveRoot>/<timestamp>/ for manual review of anything we didn't map.
func archiveUnmapped(archiveRoot string, raw map[string]interface{}) (string, error) {
	ts := time.Now().Format("20060102-150405")
	dir := filepath.Join(archiveRoot, ts)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	body, err := json.MarshalIndent(raw, "", "  ")
	if err != nil {
		return "", err
	}
	if err := os.WriteFile(filepath.Join(dir, "openclaw-raw.json"), body, 0o600); err != nil {
		return "", err
	}
	readme := `# OpenClaw 迁移归档

此目录保存了 OpenClaw 配置的完整原始 JSON，用于迁移后人工补齐未自动映射的字段。
HermesDeckX 的一键迁移仅迁移已支持的字段子集；复杂配置（如自定义 soul、插件设置、
高级频道规则）请参考 openclaw-raw.json 手动迁移。
`
	_ = os.WriteFile(filepath.Join(dir, "README.md"), []byte(readme), 0o644)
	return dir, nil
}
