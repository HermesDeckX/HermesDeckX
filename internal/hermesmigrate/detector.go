package hermesmigrate

import (
	"encoding/json"
	"os"
	"path/filepath"
)

// LocalDetectResult is returned by DetectLocal.
type LocalDetectResult struct {
	Found         bool     `json:"found"`
	OpenClawDir   string   `json:"openclawDir,omitempty"`
	ConfigFile    string   `json:"configFile,omitempty"`
	EnvFile       string   `json:"envFile,omitempty"`
	Candidates    []string `json:"candidates"`            // all directories scanned
	ProviderCount int      `json:"providerCount"`
	ChannelCount  int      `json:"channelCount"`
	SkillCount    int      `json:"skillCount"`
}

// candidateDirs returns the typical OpenClaw state directories checked in order.
func candidateDirs() []string {
	home, _ := os.UserHomeDir()
	if home == "" {
		return nil
	}
	return []string{
		filepath.Join(home, ".openclaw"),
		filepath.Join(home, ".clawdbot"),
		filepath.Join(home, ".moltbot"),
	}
}

// DetectLocal scans the well-known OpenClaw state directories and returns
// the first one containing an openclaw.json file.
func DetectLocal() LocalDetectResult {
	res := LocalDetectResult{Candidates: candidateDirs()}
	for _, dir := range res.Candidates {
		cfg := filepath.Join(dir, "openclaw.json")
		if !fileExists(cfg) {
			continue
		}
		res.Found = true
		res.OpenClawDir = dir
		res.ConfigFile = cfg
		// .env may or may not exist
		env := filepath.Join(dir, ".env")
		if fileExists(env) {
			res.EnvFile = env
		}
		// shallow-parse to produce headline counts
		if snap, err := ReadLocalSnapshot(dir); err == nil {
			res.ProviderCount = len(mapGet(snap.Config, "models", "providers"))
			res.ChannelCount = len(mapGet(snap.Config, "channels"))
			res.SkillCount = len(mapGet(snap.Config, "skills", "installed"))
		}
		return res
	}
	return res
}

// ReadLocalSnapshot loads openclaw.json and .env from a local directory.
func ReadLocalSnapshot(dir string) (*OpenClawSnapshot, error) {
	cfgBytes, err := os.ReadFile(filepath.Join(dir, "openclaw.json"))
	if err != nil {
		return nil, err
	}
	var cfg map[string]interface{}
	if err := json.Unmarshal(cfgBytes, &cfg); err != nil {
		return nil, err
	}
	snap := &OpenClawSnapshot{Config: cfg, Env: map[string]string{}}
	envPath := filepath.Join(dir, ".env")
	if fileExists(envPath) {
		if data, err := os.ReadFile(envPath); err == nil {
			snap.Env = parseDotEnv(string(data))
		}
	}
	return snap, nil
}

func fileExists(p string) bool {
	st, err := os.Stat(p)
	return err == nil && !st.IsDir()
}

// mapGet walks nested maps and returns the element at the given dotted
// path. If the path does not lead to a map, an empty map is returned.
func mapGet(root map[string]interface{}, keys ...string) map[string]interface{} {
	cur := root
	for _, k := range keys {
		if cur == nil {
			return map[string]interface{}{}
		}
		next, ok := cur[k].(map[string]interface{})
		if !ok {
			return map[string]interface{}{}
		}
		cur = next
	}
	if cur == nil {
		return map[string]interface{}{}
	}
	return cur
}
