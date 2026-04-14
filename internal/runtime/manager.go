package runtime

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"HermesDeckX/internal/logger"
	"HermesDeckX/internal/version"
)

// Manager handles the runtime overlay logic for Docker deployments.
type Manager struct {
	runtimeDir string // e.g. /data/runtime
	mu         sync.RWMutex
}

// NewManager creates a runtime manager for the given base directory.
func NewManager(runtimeDir string) *Manager {
	return &Manager{runtimeDir: runtimeDir}
}

// RuntimeDir returns the base runtime directory.
func (m *Manager) RuntimeDir() string {
	return m.runtimeDir
}

// EnsureDirs creates the runtime directory structure.
func (m *Manager) EnsureDirs() error {
	for _, comp := range []Component{ComponentHermesDeckX, ComponentHermesAgent} {
		dir := filepath.Join(m.runtimeDir, string(comp))
		if err := os.MkdirAll(dir, 0755); err != nil {
			return fmt.Errorf("create runtime dir %s: %w", dir, err)
		}
	}
	return nil
}

// manifestPath returns the manifest.json path for a component.
func (m *Manager) manifestPath(comp Component) string {
	return filepath.Join(m.runtimeDir, string(comp), "manifest.json")
}

// binaryDir returns the binary directory for a component.
func (m *Manager) binaryDir(comp Component) string {
	return filepath.Join(m.runtimeDir, string(comp))
}

// ReadManifest reads the manifest for a component. Returns nil if not found.
func (m *Manager) ReadManifest(comp Component) (*Manifest, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return readManifestFile(m.manifestPath(comp))
}

// WriteManifest writes the manifest for a component.
func (m *Manager) WriteManifest(mf *Manifest) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	return writeManifestFile(m.manifestPath(mf.Component), mf)
}

// GetStatus returns the current status of a component.
func (m *Manager) GetStatus(comp Component) Status {
	st := Status{Component: comp}

	switch comp {
	case ComponentHermesDeckX:
		st.ImageVersion = imageHermesDeckXVersion()
		st.ActiveVersion = version.Version
	case ComponentHermesAgent:
		st.ImageVersion = imageHermesAgentVersion()
		st.ActiveVersion = currentHermesAgentVersion()
	}

	mf, err := m.ReadManifest(comp)
	if err == nil && mf != nil {
		st.RuntimeVersion = mf.Version
		st.Source = mf.Source
		st.InstalledAt = mf.InstalledAt.Format(time.RFC3339)
		st.PrevVersion = mf.PrevVersion
		st.UsingOverlay = true
		st.ActiveVersion = mf.Version
	}

	return st
}

// GetAllStatus returns status for both components.
func (m *Manager) GetAllStatus() AllStatus {
	return AllStatus{
		IsDocker:  IsDocker(),
		HermesDeckX: m.GetStatus(ComponentHermesDeckX),
		HermesAgent:  m.GetStatus(ComponentHermesAgent),
	}
}

// Rollback removes the runtime overlay for a component, reverting to the image version.
func (m *Manager) Rollback(comp Component) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	dir := m.binaryDir(comp)

	// Read manifest for logging
	mfPath := filepath.Join(dir, "manifest.json")
	mf, _ := readManifestFile(mfPath)

	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}

	for _, entry := range entries {
		fp := filepath.Join(dir, entry.Name())
		if err := os.RemoveAll(fp); err != nil {
			logger.Log.Warn().Err(err).Str("path", fp).Msg("failed to remove runtime overlay file")
		}
	}

	prevVer := ""
	if mf != nil {
		prevVer = mf.Version
	}
	logger.Log.Info().
		Str("component", string(comp)).
		Str("was_version", prevVer).
		Msg("runtime overlay rolled back")

	return nil
}
