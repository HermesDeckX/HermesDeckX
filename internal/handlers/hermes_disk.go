package handlers

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"HermesDeckX/internal/hermes"
	"HermesDeckX/internal/web"
)

// HermesDiskHandler reports disk usage for the ~/.hermes directory broken
// down by well-known subpaths (sessions / logs / skills / state.db / ...).
// The full `~/.hermes` tree can grow into the GB range after extended use
// and the existing host-info card only shows whole-disk utilisation — users
// have no way to see "which hermes folder is eating my disk" today.
type HermesDiskHandler struct {
	cacheMu sync.Mutex
	cached  *HermesDiskUsageResponse
	cachedAt time.Time
}

func NewHermesDiskHandler() *HermesDiskHandler { return &HermesDiskHandler{} }

// HermesDiskEntry is one row in the breakdown.
type HermesDiskEntry struct {
	Path    string `json:"path"`
	Label   string `json:"label"`
	Bytes   int64  `json:"bytes"`
	Files   int64  `json:"files"`
	Kind    string `json:"kind"` // "dir" | "file"
	Missing bool   `json:"missing"`
}

// HermesDiskUsageResponse is the API payload.
type HermesDiskUsageResponse struct {
	Root       string            `json:"root"`
	TotalBytes int64             `json:"totalBytes"`
	TotalFiles int64             `json:"totalFiles"`
	Entries    []HermesDiskEntry `json:"entries"`
	Other      HermesDiskEntry   `json:"other"`
	GeneratedAt int64            `json:"generatedAt"`
}

// Well-known entries inside ~/.hermes we surface in the UI. The list matches
// hermes-agent's on-disk layout; anything outside these paths gets rolled up
// into the "other" bucket so the totals reconcile.
var hermesKnownEntries = []struct {
	Name    string
	Label   string
	Kind    string // "dir" | "file"
}{
	{"sessions", "Sessions", "dir"},
	{"logs", "Logs", "dir"},
	{"skills", "Skills", "dir"},
	{"memory_store", "Memory store", "dir"},
	{"memory_store.db", "Memory store (db)", "file"},
	{"state.db", "State DB", "file"},
	{"auth.json", "Auth credentials", "file"},
	{"config.yaml", "Config", "file"},
	{"profiles", "Profiles", "dir"},
	{"worktrees", "Worktrees", "dir"},
	{"skins", "Skins", "dir"},
	{"trajectories", "Trajectories", "dir"},
}

// Usage returns the cached (30s) disk breakdown for ~/.hermes.
func (h *HermesDiskHandler) Usage(w http.ResponseWriter, r *http.Request) {
	h.cacheMu.Lock()
	if h.cached != nil && time.Since(h.cachedAt) < 30*time.Second {
		resp := *h.cached
		h.cacheMu.Unlock()
		web.OK(w, r, resp)
		return
	}
	h.cacheMu.Unlock()

	root := hermes.ResolveHermesHome()
	resp := HermesDiskUsageResponse{
		Root:        root,
		Entries:     []HermesDiskEntry{},
		GeneratedAt: time.Now().UnixMilli(),
	}

	if _, err := os.Stat(root); err != nil {
		// ~/.hermes does not exist yet — report empty but don't error.
		web.OK(w, r, resp)
		return
	}

	// Track which direct children are accounted for so the "Other" row can be
	// computed by walking only unaccounted entries.
	accounted := map[string]bool{}

	for _, e := range hermesKnownEntries {
		p := filepath.Join(root, e.Name)
		entry := HermesDiskEntry{Path: p, Label: e.Label, Kind: e.Kind}
		info, err := os.Stat(p)
		if err != nil {
			entry.Missing = true
			resp.Entries = append(resp.Entries, entry)
			continue
		}
		accounted[e.Name] = true
		if info.IsDir() {
			bytes, files := dirSize(p)
			entry.Bytes, entry.Files = bytes, files
		} else {
			entry.Bytes, entry.Files = info.Size(), 1
		}
		resp.TotalBytes += entry.Bytes
		resp.TotalFiles += entry.Files
		resp.Entries = append(resp.Entries, entry)
	}

	// Everything else at the top level → "Other" bucket.
	if children, err := os.ReadDir(root); err == nil {
		other := HermesDiskEntry{Path: root, Label: "Other", Kind: "dir"}
		for _, c := range children {
			if accounted[c.Name()] {
				continue
			}
			p := filepath.Join(root, c.Name())
			info, err := c.Info()
			if err != nil {
				continue
			}
			if info.IsDir() {
				bytes, files := dirSize(p)
				other.Bytes += bytes
				other.Files += files
			} else {
				other.Bytes += info.Size()
				other.Files++
			}
		}
		if other.Bytes > 0 || other.Files > 0 {
			resp.Other = other
			resp.TotalBytes += other.Bytes
			resp.TotalFiles += other.Files
		}
	}

	h.cacheMu.Lock()
	respCopy := resp
	h.cached = &respCopy
	h.cachedAt = time.Now()
	h.cacheMu.Unlock()

	web.OK(w, r, resp)
}

// dirSize walks a directory and returns the total size + file count. Symlinks
// are *not* followed so circular worktrees or aliases don't blow up.
func dirSize(root string) (int64, int64) {
	var bytes, files int64
	_ = filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			// Skip unreadable entries silently — partial totals are still useful.
			if d != nil && d.IsDir() {
				return nil
			}
			return nil
		}
		if d.IsDir() {
			return nil
		}
		if strings.HasPrefix(d.Name(), ".DS_Store") {
			return nil
		}
		info, err := d.Info()
		if err != nil {
			return nil
		}
		bytes += info.Size()
		files++
		return nil
	})
	return bytes, files
}
