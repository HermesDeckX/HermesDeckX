package handlers

import (
	"context"
	"encoding/json"
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

// SkinsHandler lists hermes-agent skins (built-in + user-installed under
// <profile>/skins/) and switches the active one by writing display.skin.
type SkinsHandler struct{}

func NewSkinsHandler() *SkinsHandler {
	return &SkinsHandler{}
}

// Built-in skin names from hermes-agent/hermes_cli/skin_engine.py _BUILTIN_SKINS.
// Keep in sync when upstream adds or removes built-ins.
var builtinSkins = []struct {
	Name        string
	Description string
}{
	{"default", "Classic Hermes — gold and kawaii"},
	{"ares", "War-god theme — crimson and bronze"},
	{"mono", "Monochrome — clean grayscale"},
	{"slate", "Cool blue — developer-focused"},
	{"daylight", "Light theme for bright terminals with dark text and cool blue accents"},
	{"warm-lightmode", "Warm light mode — dark brown/gold text for light terminal backgrounds"},
	{"poseidon", "Ocean-god theme — deep blue and seafoam"},
	{"sisyphus", "Sisyphean theme — austere grayscale with persistence"},
	{"charizard", "Volcanic theme — burnt orange and ember"},
}

// SkinInfo is what the UI renders.
type SkinInfo struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Source      string `json:"source"` // "builtin" | "user"
}

type skinsResponse struct {
	Active string     `json:"active"`
	Skins  []SkinInfo `json:"skins"`
}

// List returns built-in + user-installed skins and the active choice.
func (h *SkinsHandler) List(w http.ResponseWriter, r *http.Request) {
	out := skinsResponse{Skins: []SkinInfo{}}
	seen := map[string]bool{}
	for _, s := range builtinSkins {
		out.Skins = append(out.Skins, SkinInfo{Name: s.Name, Description: s.Description, Source: "builtin"})
		seen[s.Name] = true
	}
	// Scan <home>/skins/*.yaml for user skins in the active profile.
	skinsDir := filepath.Join(hermes.ResolveHermesHome(), "skins")
	if entries, err := os.ReadDir(skinsDir); err == nil {
		for _, e := range entries {
			if e.IsDir() {
				continue
			}
			name := strings.TrimSuffix(e.Name(), ".yaml")
			if name == e.Name() || seen[name] {
				continue
			}
			desc := ""
			if data, err := os.ReadFile(filepath.Join(skinsDir, e.Name())); err == nil {
				var parsed struct {
					Name        string `yaml:"name"`
					Description string `yaml:"description"`
				}
				if yaml.Unmarshal(data, &parsed) == nil {
					if parsed.Name != "" {
						name = parsed.Name
					}
					desc = parsed.Description
				}
			}
			if seen[name] {
				continue
			}
			out.Skins = append(out.Skins, SkinInfo{Name: name, Description: desc, Source: "user"})
			seen[name] = true
		}
	}
	sort.SliceStable(out.Skins, func(i, j int) bool {
		// builtin "default" first, then alphabetical within source.
		if out.Skins[i].Name == "default" {
			return true
		}
		if out.Skins[j].Name == "default" {
			return false
		}
		if out.Skins[i].Source != out.Skins[j].Source {
			return out.Skins[i].Source == "builtin"
		}
		return out.Skins[i].Name < out.Skins[j].Name
	})

	// Active = display.skin in config.yaml, default "default".
	out.Active = "default"
	if cfg := hermes.ReadConfig(); cfg != nil {
		if display, ok := cfg["display"].(map[string]interface{}); ok {
			if v, ok := display["skin"].(string); ok && strings.TrimSpace(v) != "" {
				out.Active = strings.TrimSpace(v)
			}
		}
	}
	web.OK(w, r, out)
}

type setSkinRequest struct {
	Name string `json:"name"`
}

// SetActive writes display.skin = <name> to config.yaml via `hermes config set`.
func (h *SkinsHandler) SetActive(w http.ResponseWriter, r *http.Request) {
	var req setSkinRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.FailErr(w, r, web.ErrInvalidParam, err.Error())
		return
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		web.FailErr(w, r, web.ErrInvalidParam, "skin name is required")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()
	out, err := hermes.RunCLI(ctx, "config", "set", "display.skin", name)
	if err != nil {
		web.FailErr(w, r, web.ErrInvalidParam, strings.TrimSpace(out)+" "+err.Error())
		return
	}
	h.List(w, r)
}
