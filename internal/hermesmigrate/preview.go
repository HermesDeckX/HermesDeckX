package hermesmigrate

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

// isRedactedPlaceholder returns true if the value looks like the result
// of OpenClaw's config.get redaction pipeline ("<redacted>", "****",
// "${VAR}" env-var placeholders, or a SecretRef shape).
func isRedactedPlaceholder(v interface{}) bool {
	switch t := v.(type) {
	case string:
		s := strings.TrimSpace(t)
		if s == "" {
			return false
		}
		if s == "<redacted>" || strings.HasPrefix(s, "<redacted-") {
			return true
		}
		if strings.HasPrefix(s, "${") && strings.HasSuffix(s, "}") {
			return true
		}
		// env-var placeholder values kept verbatim are not redactions
		return false
	case map[string]interface{}:
		// SecretRef shape: { source: "file"|"env", ... }
		if src, ok := t["source"].(string); ok && (src == "file" || src == "env" || src == "keychain") {
			return true
		}
	}
	return false
}

// stringifyShort renders a value for UI display, redacting / truncating
// where appropriate.
func stringifyShort(v interface{}, sensitive bool) string {
	if v == nil {
		return ""
	}
	if sensitive {
		return "<redacted>"
	}
	switch t := v.(type) {
	case string:
		if len(t) > 96 {
			return t[:96] + "…"
		}
		return t
	case bool:
		if t {
			return "true"
		}
		return "false"
	case float64, int, int64:
		return fmt.Sprintf("%v", t)
	}
	b, err := json.Marshal(v)
	if err != nil {
		return fmt.Sprintf("%v", v)
	}
	s := string(b)
	if len(s) > 96 {
		return s[:96] + "…"
	}
	return s
}

// secretTargetIDFor derives an OpenClaw secrets.resolve target ID from a
// source dotted path. OpenClaw's target-registry uses dotted path IDs
// that match the config path (e.g. "channels.telegram.botToken"), so the
// source path itself is the canonical target ID. If the Gateway reports
// "unknown target id", the field is simply left empty and skipped.
func secretTargetIDFor(sourcePath string) string {
	return sourcePath
}

// BuildPreview produces a Preview report from an OpenClaw snapshot plus
// (optionally) the current hermes config for conflict detection.
func BuildPreview(source Source, openclawPath string, snap *OpenClawSnapshot, hermesCfg map[string]interface{}, hermesEnv map[string]string) *Preview {
	p := &Preview{
		Source:       source,
		OpenClawPath: openclawPath,
		GeneratedAt:  time.Now().UTC(),
	}
	groupIndex := map[string]*PreviewGroup{}
	order := []string{}

	for _, m := range fieldMappings {
		val, exists := lookupSource(snap.Config, m.SourcePath)
		if !exists && m.Sensitive && m.TargetKind == TargetEnv && snap.Env != nil {
			// Local case: value might live only in .env
			if raw, ok := snap.Env[m.TargetKey]; ok && raw != "" {
				val = raw
				exists = true
			}
		}
		if !exists {
			continue
		}

		field := PreviewField{
			SourcePath: m.SourcePath,
			TargetKey:  m.TargetKey,
			TargetKind: m.TargetKind,
			Label:      m.Label,
			Sensitive:  m.Sensitive,
		}

		redacted := isRedactedPlaceholder(val)

		if m.Sensitive {
			field.Status = StatusNeedsSecret
			field.Display = "<redacted>"
			field.SecretTargetID = secretTargetIDFor(m.SourcePath)
			if source == SourceLocal && !redacted {
				// Local scan has the plaintext already — but we still
				// mark it sensitive so downstream UI warns the user.
				field.Notes = "本地文件中已包含明文，迁移时将直接写入 .env。"
			}
		} else {
			field.Status = StatusMapped
			field.Display = stringifyShort(val, false)
		}

		// Conflict detection against current hermes config / env
		if existing, has := existingHermesValue(hermesCfg, hermesEnv, m); has {
			field.Status = StatusConflict
			field.ExistingHermes = stringifyShort(existing, m.Sensitive)
		}

		groupID, groupName := groupLabel(m.SourcePath)
		g, ok := groupIndex[groupID]
		if !ok {
			g = &PreviewGroup{Key: groupID, Label: groupName}
			groupIndex[groupID] = g
			order = append(order, groupID)
		}
		g.Fields = append(g.Fields, field)
	}

	for _, k := range order {
		g := groupIndex[k]
		for _, f := range g.Fields {
			switch f.Status {
			case StatusMapped:
				p.TotalMapped++
			case StatusNeedsSecret:
				p.TotalSecrets++
			case StatusConflict:
				p.TotalConflicts++
			case StatusArchive:
				p.TotalArchive++
			}
		}
		p.Groups = append(p.Groups, *g)
	}
	return p
}

// existingHermesValue returns the current value in hermes config/env for
// comparison with an incoming openclaw value.
func existingHermesValue(cfg map[string]interface{}, env map[string]string, m FieldMapping) (interface{}, bool) {
	if m.TargetKind == TargetEnv {
		if env == nil {
			return nil, false
		}
		v, ok := env[m.TargetKey]
		if !ok || v == "" {
			return nil, false
		}
		return v, true
	}
	return lookupNested(cfg, m.TargetKey)
}

func lookupNested(cfg map[string]interface{}, dotted string) (interface{}, bool) {
	if cfg == nil {
		return nil, false
	}
	parts := splitDot(dotted)
	var cur interface{} = cfg
	for _, p := range parts {
		m, ok := cur.(map[string]interface{})
		if !ok {
			return nil, false
		}
		v, exists := m[p]
		if !exists {
			return nil, false
		}
		cur = v
	}
	return cur, true
}
