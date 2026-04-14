package runtime

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

// Component identifies a runtime-managed binary.
type Component string

const (
	ComponentHermesDeckX Component = "hermesdeckx"
	ComponentHermesAgent  Component = "hermes-agent"
)

// Manifest records which version is active in the runtime overlay volume.
// Stored as /data/runtime/<component>/manifest.json.
type Manifest struct {
	Component   Component `json:"component"`
	Version     string    `json:"version"`
	InstalledAt time.Time `json:"installed_at"`
	Source      string    `json:"source"` // e.g. "github-release", "npm"
	BinaryPath  string    `json:"binary_path"`
	PrevVersion string    `json:"prev_version,omitempty"`
}

// Status represents the current state of a runtime component.
type Status struct {
	Component      Component `json:"component"`
	ActiveVersion  string    `json:"active_version"`
	ImageVersion   string    `json:"image_version"`
	RuntimeVersion string    `json:"runtime_version,omitempty"`
	Source         string    `json:"source,omitempty"`
	InstalledAt    string    `json:"installed_at,omitempty"`
	PrevVersion    string    `json:"prev_version,omitempty"`
	UsingOverlay   bool      `json:"using_overlay"`
}

// AllStatus is the combined status for both components.
type AllStatus struct {
	IsDocker  bool   `json:"is_docker"`
	HermesDeckX Status `json:"hermesdeckx"`
	HermesAgent  Status `json:"hermes-agent"`
}

// readManifestFile reads and parses a manifest.json from disk.
func readManifestFile(path string) (*Manifest, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	var mf Manifest
	if err := json.Unmarshal(data, &mf); err != nil {
		return nil, fmt.Errorf("parse manifest: %w", err)
	}
	return &mf, nil
}

// writeManifestFile writes a manifest.json to disk.
func writeManifestFile(path string, mf *Manifest) error {
	data, err := json.MarshalIndent(mf, "", "  ")
	if err != nil {
		return err
	}
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}
