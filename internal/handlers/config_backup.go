package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"HermesDeckX/internal/hermes"
	"HermesDeckX/internal/web"

	"gopkg.in/yaml.v3"
)

type ConfigBackupHandler struct{}

func NewConfigBackupHandler() *ConfigBackupHandler {
	return &ConfigBackupHandler{}
}

type ConfigBackupFile struct {
	Name    string `json:"name"`
	Path    string `json:"path"`
	Size    int64  `json:"size"`
	ModTime string `json:"modTime"`
	Index   int    `json:"index"` // 0 = .bak, 1 = .bak.1, etc.
}

// List returns all .bak files for the hermes-agent config.
func (h *ConfigBackupHandler) List(w http.ResponseWriter, r *http.Request) {
	configPath := hermes.ResolveConfigPath()
	if configPath == "" {
		web.FailErr(w, r, web.ErrInvalidParam, "HermesAgent config path not found")
		return
	}

	backups := h.findBackupFiles(configPath)
	web.OK(w, r, map[string]any{
		"configPath": configPath,
		"backups":    backups,
	})
}

// Preview returns the content of a specific .bak file.
func (h *ConfigBackupHandler) Preview(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Path string `json:"path"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.FailErr(w, r, web.ErrInvalidBody)
		return
	}

	configPath := hermes.ResolveConfigPath()
	if configPath == "" {
		web.FailErr(w, r, web.ErrInvalidParam, "HermesAgent config path not found")
		return
	}

	// Security: only allow reading .bak files in the same directory as the config
	if !h.isValidBackupPath(configPath, req.Path) {
		web.FailErr(w, r, web.ErrInvalidParam, "invalid backup path")
		return
	}

	data, err := os.ReadFile(req.Path)
	if err != nil {
		web.FailErr(w, r, web.ErrInvalidParam, fmt.Sprintf("cannot read file: %v", err))
		return
	}

	// Validate it's valid YAML (hermes-agent uses config.yaml in YAML format)
	var parsed any
	if err := yaml.Unmarshal(data, &parsed); err != nil {
		web.OK(w, r, map[string]any{"content": string(data), "valid": false})
		return
	}

	web.OK(w, r, map[string]any{"content": string(data), "valid": true})
}

// Restore replaces the current config.yaml with a .bak file's content.
func (h *ConfigBackupHandler) Restore(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Path string `json:"path"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.FailErr(w, r, web.ErrInvalidBody)
		return
	}

	configPath := hermes.ResolveConfigPath()
	if configPath == "" {
		web.FailErr(w, r, web.ErrInvalidParam, "HermesAgent config path not found")
		return
	}

	if !h.isValidBackupPath(configPath, req.Path) {
		web.FailErr(w, r, web.ErrInvalidParam, "invalid backup path")
		return
	}

	// Read backup file
	bakData, err := os.ReadFile(req.Path)
	if err != nil {
		web.FailErr(w, r, web.ErrInvalidParam, fmt.Sprintf("cannot read backup: %v", err))
		return
	}

	// Validate YAML
	var parsed any
	if err := yaml.Unmarshal(bakData, &parsed); err != nil {
		web.FailErr(w, r, web.ErrInvalidParam, "backup file contains invalid YAML")
		return
	}

	// Write to config path (HermesAgent will auto-create .bak on next write)
	if err := os.WriteFile(configPath, bakData, 0o600); err != nil {
		web.FailErr(w, r, web.ErrInvalidParam, fmt.Sprintf("cannot write config: %v", err))
		return
	}

	web.OK(w, r, map[string]any{"restored": true})
}

// Diff returns the current config and the backup content for comparison.
func (h *ConfigBackupHandler) Diff(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Path string `json:"path"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.FailErr(w, r, web.ErrInvalidBody)
		return
	}

	configPath := hermes.ResolveConfigPath()
	if configPath == "" {
		web.FailErr(w, r, web.ErrInvalidParam, "HermesAgent config path not found")
		return
	}

	if !h.isValidBackupPath(configPath, req.Path) {
		web.FailErr(w, r, web.ErrInvalidParam, "invalid backup path")
		return
	}

	currentData, err := os.ReadFile(configPath)
	if err != nil {
		web.FailErr(w, r, web.ErrInvalidParam, fmt.Sprintf("cannot read current config: %v", err))
		return
	}

	bakData, err := os.ReadFile(req.Path)
	if err != nil {
		web.FailErr(w, r, web.ErrInvalidParam, fmt.Sprintf("cannot read backup: %v", err))
		return
	}

	// YAML content is already human-readable; use raw strings for diff
	currentPretty := string(currentData)
	bakPretty := string(bakData)

	// Compute line-level diff
	diffLines := computeLineDiff(currentPretty, bakPretty)

	// Compute semantic diff (key-path level changes)
	var jsonChanges []JsonChange
	var currentMap, bakMap map[string]any
	if yaml.Unmarshal(currentData, &currentMap) == nil && yaml.Unmarshal(bakData, &bakMap) == nil {
		jsonChanges = computeJsonDiff("", currentMap, bakMap)
	}

	web.OK(w, r, map[string]any{
		"current":     currentPretty,
		"backup":      bakPretty,
		"diffLines":   diffLines,
		"jsonChanges": jsonChanges,
	})
}

// DiffLine represents a single line in the diff output.
type DiffLine struct {
	Type string `json:"type"` // "equal", "add", "remove"
	Text string `json:"text"`
}

// computeLineDiff computes a line-level diff between current and backup text.
func computeLineDiff(current, backup string) []DiffLine {
	currentLines := strings.Split(current, "\n")
	backupLines := strings.Split(backup, "\n")
	m, n := len(currentLines), len(backupLines)

	// Build LCS table
	lcs := make([][]int, m+1)
	for i := range lcs {
		lcs[i] = make([]int, n+1)
	}
	for i := 1; i <= m; i++ {
		for j := 1; j <= n; j++ {
			if currentLines[i-1] == backupLines[j-1] {
				lcs[i][j] = lcs[i-1][j-1] + 1
			} else if lcs[i-1][j] >= lcs[i][j-1] {
				lcs[i][j] = lcs[i-1][j]
			} else {
				lcs[i][j] = lcs[i][j-1]
			}
		}
	}

	// Backtrack to build diff
	var result []DiffLine
	i, j := m, n
	var stack []DiffLine
	for i > 0 || j > 0 {
		if i > 0 && j > 0 && currentLines[i-1] == backupLines[j-1] {
			stack = append(stack, DiffLine{Type: "equal", Text: currentLines[i-1]})
			i--
			j--
		} else if j > 0 && (i == 0 || lcs[i][j-1] >= lcs[i-1][j]) {
			stack = append(stack, DiffLine{Type: "add", Text: backupLines[j-1]})
			j--
		} else {
			stack = append(stack, DiffLine{Type: "remove", Text: currentLines[i-1]})
			i--
		}
	}
	// Reverse
	for k := len(stack) - 1; k >= 0; k-- {
		result = append(result, stack[k])
	}

	// Compact: only keep diff hunks with context (3 lines before/after changes)
	const contextLines = 3
	changed := make([]bool, len(result))
	for idx, dl := range result {
		if dl.Type != "equal" {
			changed[idx] = true
		}
	}
	// Mark context lines around changes
	show := make([]bool, len(result))
	for idx := range result {
		if changed[idx] {
			for c := max(0, idx-contextLines); c <= min(len(result)-1, idx+contextLines); c++ {
				show[c] = true
			}
		}
	}

	var compact []DiffLine
	lastShown := -1
	for idx, dl := range result {
		if !show[idx] {
			continue
		}
		if lastShown >= 0 && idx > lastShown+1 {
			compact = append(compact, DiffLine{Type: "separator", Text: "···"})
		}
		compact = append(compact, dl)
		lastShown = idx
	}

	if len(compact) == 0 {
		return []DiffLine{{Type: "equal", Text: "(no differences)"}}
	}
	return compact
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// JsonChange represents a semantic difference at a specific JSON key path.
type JsonChange struct {
	Path     string `json:"path"`
	Type     string `json:"type"` // "changed", "added", "removed"
	OldValue string `json:"oldValue,omitempty"`
	NewValue string `json:"newValue,omitempty"`
}

// computeJsonDiff recursively compares two JSON objects and returns key-path level changes.
// "current" is the live config, "backup" is the .bak file.
// "removed" = key exists in current but not backup (would be lost on restore)
// "added" = key exists in backup but not current (would be gained on restore)
// "changed" = key exists in both but value differs
func computeJsonDiff(prefix string, current, backup map[string]any) []JsonChange {
	var changes []JsonChange

	allKeys := map[string]struct{}{}
	for k := range current {
		allKeys[k] = struct{}{}
	}
	for k := range backup {
		allKeys[k] = struct{}{}
	}

	// Sort keys for deterministic output
	keys := make([]string, 0, len(allKeys))
	for k := range allKeys {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	for _, k := range keys {
		path := k
		if prefix != "" {
			path = prefix + "." + k
		}

		curVal, curOk := current[k]
		bakVal, bakOk := backup[k]

		if curOk && !bakOk {
			changes = append(changes, JsonChange{Path: path, Type: "removed", OldValue: jsonCompact(curVal)})
			continue
		}
		if !curOk && bakOk {
			changes = append(changes, JsonChange{Path: path, Type: "added", NewValue: jsonCompact(bakVal)})
			continue
		}

		// Both exist — recurse if both are objects
		curMap, curIsMap := curVal.(map[string]any)
		bakMap, bakIsMap := bakVal.(map[string]any)
		if curIsMap && bakIsMap {
			changes = append(changes, computeJsonDiff(path, curMap, bakMap)...)
			continue
		}

		// Compare as JSON strings
		curStr := jsonCompact(curVal)
		bakStr := jsonCompact(bakVal)
		if curStr != bakStr {
			changes = append(changes, JsonChange{Path: path, Type: "changed", OldValue: curStr, NewValue: bakStr})
		}
	}
	return changes
}

// jsonCompact returns a compact JSON representation of a value, truncated for display.
func jsonCompact(v any) string {
	b, err := json.Marshal(v)
	if err != nil {
		return fmt.Sprintf("%v", v)
	}
	s := string(b)
	if len(s) > 120 {
		s = s[:117] + "..."
	}
	return s
}

func (h *ConfigBackupHandler) findBackupFiles(configPath string) []ConfigBackupFile {
	dir := filepath.Dir(configPath)
	base := filepath.Base(configPath)
	bakBase := base + ".bak"

	var backups []ConfigBackupFile

	// Check primary .bak
	bakPath := filepath.Join(dir, bakBase)
	if info, err := os.Stat(bakPath); err == nil {
		backups = append(backups, ConfigBackupFile{
			Name:    bakBase,
			Path:    bakPath,
			Size:    info.Size(),
			ModTime: info.ModTime().Format(time.RFC3339),
			Index:   0,
		})
	}

	// Check numbered .bak.1 through .bak.9
	for i := 1; i <= 9; i++ {
		name := fmt.Sprintf("%s.%d", bakBase, i)
		p := filepath.Join(dir, name)
		if info, err := os.Stat(p); err == nil {
			backups = append(backups, ConfigBackupFile{
				Name:    name,
				Path:    p,
				Size:    info.Size(),
				ModTime: info.ModTime().Format(time.RFC3339),
				Index:   i,
			})
		}
	}

	// Sort by index
	sort.Slice(backups, func(i, j int) bool { return backups[i].Index < backups[j].Index })
	return backups
}

func (h *ConfigBackupHandler) isValidBackupPath(configPath, bakPath string) bool {
	configDir := filepath.Dir(configPath)
	configBase := filepath.Base(configPath)

	// Must be in the same directory
	bakDir := filepath.Dir(bakPath)
	if bakDir != configDir {
		return false
	}

	// Must start with config basename + ".bak"
	bakName := filepath.Base(bakPath)
	if !strings.HasPrefix(bakName, configBase+".bak") {
		return false
	}

	// Must actually exist
	if _, err := os.Stat(bakPath); err != nil {
		return false
	}

	return true
}
