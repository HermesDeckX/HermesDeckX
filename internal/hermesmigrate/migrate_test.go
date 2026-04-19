package hermesmigrate

import (
	"os"
	"path/filepath"
	"testing"

	"gopkg.in/yaml.v3"
)

func TestParseDotEnv_BasicKeyValuePairs(t *testing.T) {
	src := `# comment
FOO=bar
BAZ="hello world"
export QUX='single-quoted'
EMPTY=

INLINE_COMMENT=value # trailing
`
	got := parseDotEnv(src)
	cases := map[string]string{
		"FOO":            "bar",
		"BAZ":            "hello world",
		"QUX":            "single-quoted",
		"EMPTY":          "",
		"INLINE_COMMENT": "value",
	}
	for k, want := range cases {
		if got[k] != want {
			t.Errorf("parseDotEnv[%s] = %q, want %q", k, got[k], want)
		}
	}
}

func TestRenderDotEnv_QuotesSpaces(t *testing.T) {
	out := renderDotEnv(map[string]string{
		"A": "simple",
		"B": "has spaces",
		"C": `has"quote`,
	})
	if want := "A=simple\n"; !contains(out, want) {
		t.Errorf("expected %q in output, got %s", want, out)
	}
	if want := `B="has spaces"`; !contains(out, want) {
		t.Errorf("expected %q in output, got %s", want, out)
	}
}

func TestLookupSource_NestedPath(t *testing.T) {
	cfg := map[string]interface{}{
		"agents": map[string]interface{}{
			"defaults": map[string]interface{}{
				"model": "anthropic/claude-opus-4",
			},
		},
	}
	v, ok := lookupSource(cfg, "agents.defaults.model")
	if !ok || v != "anthropic/claude-opus-4" {
		t.Errorf("lookupSource returned %v ok=%v", v, ok)
	}
	if _, ok := lookupSource(cfg, "agents.defaults.missing"); ok {
		t.Errorf("expected missing path to return ok=false")
	}
}

func TestSetNested_CreatesIntermediates(t *testing.T) {
	cfg := map[string]interface{}{}
	setNested(cfg, "a.b.c", 42)
	m, ok := cfg["a"].(map[string]interface{})
	if !ok {
		t.Fatalf("cfg[a] is not a map: %T", cfg["a"])
	}
	m2, _ := m["b"].(map[string]interface{})
	if m2["c"] != 42 {
		t.Errorf("expected a.b.c=42, got %v", m2["c"])
	}
}

func TestIsRedactedPlaceholder(t *testing.T) {
	cases := []struct {
		v    interface{}
		want bool
	}{
		{"<redacted>", true},
		{"<redacted-source>", true},
		{"${TELEGRAM_BOT_TOKEN}", true},
		{"sk-real-key-abc123", false},
		{"", false},
		{map[string]interface{}{"source": "env", "name": "TOKEN"}, true},
		{map[string]interface{}{"other": "val"}, false},
	}
	for i, c := range cases {
		if got := isRedactedPlaceholder(c.v); got != c.want {
			t.Errorf("case %d: got %v want %v", i, got, c.want)
		}
	}
}

func TestBuildPreview_DetectsConflict(t *testing.T) {
	snap := &OpenClawSnapshot{
		Config: map[string]interface{}{
			"agents": map[string]interface{}{
				"defaults": map[string]interface{}{
					"model": "gpt-4",
				},
			},
		},
	}
	hermesCfg := map[string]interface{}{
		"model": "claude-3-opus",
	}
	p := BuildPreview(SourceLocal, "/fake", snap, hermesCfg, nil)
	if p.TotalConflicts != 1 {
		t.Fatalf("expected 1 conflict, got %d", p.TotalConflicts)
	}
	found := false
	for _, g := range p.Groups {
		for _, f := range g.Fields {
			if f.SourcePath == "agents.defaults.model" && f.Status == StatusConflict {
				found = true
				if f.ExistingHermes != "claude-3-opus" {
					t.Errorf("unexpected existing: %q", f.ExistingHermes)
				}
			}
		}
	}
	if !found {
		t.Errorf("conflict row for model not found")
	}
}

func TestExecute_WritesYAMLAndEnv(t *testing.T) {
	dir := t.TempDir()
	cfgPath := filepath.Join(dir, "config.yaml")
	envPath := filepath.Join(dir, ".env")
	archiveRoot := filepath.Join(dir, "archive")

	snap := &OpenClawSnapshot{
		Config: map[string]interface{}{
			"agents": map[string]interface{}{
				"defaults": map[string]interface{}{
					"model": "anthropic/claude-opus-4",
				},
			},
			"channels": map[string]interface{}{
				"telegram": map[string]interface{}{
					"botToken":   "<redacted>",
					"allowlist":  []interface{}{"user1", "user2"},
					"requireMention": true,
				},
			},
		},
		Env: map[string]string{
			"TELEGRAM_BOT_TOKEN": "real-token-value",
		},
	}
	report, err := Execute(ExecuteInput{
		Snapshot:         snap,
		ResolvedSecrets:  map[string]string{},
		HermesConfigPath: cfgPath,
		HermesEnvPath:    envPath,
		ArchiveRoot:      archiveRoot,
		Request: ExecuteRequest{
			MigrateSecrets:  true,
			ArchiveUnmapped: true,
			ConflictStrategy: ConflictSkip,
		},
	})
	if err != nil {
		t.Fatalf("Execute failed: %v", err)
	}
	if len(report.WrittenKeys) == 0 {
		t.Errorf("expected some written keys")
	}

	// Verify config.yaml
	cfgBytes, err := os.ReadFile(cfgPath)
	if err != nil {
		t.Fatalf("read config: %v", err)
	}
	var cfg map[string]interface{}
	if err := yaml.Unmarshal(cfgBytes, &cfg); err != nil {
		t.Fatalf("yaml parse: %v", err)
	}
	if cfg["model"] != "anthropic/claude-opus-4" {
		t.Errorf("expected model written, got %v", cfg["model"])
	}

	// Verify .env
	envBytes, err := os.ReadFile(envPath)
	if err != nil {
		t.Fatalf("read env: %v", err)
	}
	env := parseDotEnv(string(envBytes))
	if env["TELEGRAM_BOT_TOKEN"] != "real-token-value" {
		t.Errorf("expected TELEGRAM_BOT_TOKEN from .env, got %q", env["TELEGRAM_BOT_TOKEN"])
	}

	// Archive should exist
	if report.ArchivePath == "" {
		t.Errorf("expected archive path")
	}
	if _, err := os.Stat(filepath.Join(report.ArchivePath, "openclaw-raw.json")); err != nil {
		t.Errorf("archive json missing: %v", err)
	}
}

func TestExecute_ConflictSkipPreservesExisting(t *testing.T) {
	dir := t.TempDir()
	cfgPath := filepath.Join(dir, "config.yaml")
	envPath := filepath.Join(dir, ".env")

	// Seed existing config
	existing := map[string]interface{}{"model": "existing-value"}
	data, _ := yaml.Marshal(existing)
	if err := os.WriteFile(cfgPath, data, 0o644); err != nil {
		t.Fatal(err)
	}

	snap := &OpenClawSnapshot{
		Config: map[string]interface{}{
			"agents": map[string]interface{}{
				"defaults": map[string]interface{}{"model": "incoming-value"},
			},
		},
	}
	report, err := Execute(ExecuteInput{
		Snapshot: snap, HermesConfigPath: cfgPath, HermesEnvPath: envPath,
		ArchiveRoot: dir,
		Request:     ExecuteRequest{ConflictStrategy: ConflictSkip},
	})
	if err != nil {
		t.Fatalf("execute: %v", err)
	}
	cfg := map[string]interface{}{}
	b, _ := os.ReadFile(cfgPath)
	_ = yaml.Unmarshal(b, &cfg)
	if cfg["model"] != "existing-value" {
		t.Errorf("expected existing value preserved, got %v", cfg["model"])
	}
	if len(report.ConflictedKeys) != 1 {
		t.Errorf("expected 1 conflict row, got %d", len(report.ConflictedKeys))
	}
}

func contains(s, sub string) bool {
	return len(s) >= len(sub) && indexOf(s, sub) >= 0
}

func indexOf(s, sub string) int {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}
