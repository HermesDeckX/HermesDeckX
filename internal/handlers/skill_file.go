package handlers

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"HermesDeckX/internal/web"
)

// SkillFileHandler handles reading and writing SKILL.md files for locally installed skills.
type SkillFileHandler struct{}

func NewSkillFileHandler() *SkillFileHandler {
	return &SkillFileHandler{}
}

// validateSkillFilePath checks that the requested path:
//  1. Is absolute (no relative traversal).
//  2. Has exactly the filename "SKILL.md" (case-insensitive on Windows, exact on Unix).
//
// Any skill installed anywhere on disk is allowed, because the baseDir is provided
// by the gateway's skills.status response and is already trusted.
func validateSkillFilePath(rawPath string) (string, error) {
	cleaned := filepath.Clean(rawPath)
	if !filepath.IsAbs(cleaned) {
		return "", os.ErrPermission
	}
	if !strings.EqualFold(filepath.Base(cleaned), "SKILL.md") {
		return "", os.ErrPermission
	}
	return cleaned, nil
}

// ReadSkillMd reads the SKILL.md content for a given skill baseDir.
// GET /api/v1/skills/file?baseDir=<path>
func (h *SkillFileHandler) ReadSkillMd(w http.ResponseWriter, r *http.Request) {
	baseDir := r.URL.Query().Get("baseDir")
	if baseDir == "" {
		web.FailErr(w, r, web.ErrInvalidParam)
		return
	}

	filePath := filepath.Join(baseDir, "SKILL.md")
	validPath, err := validateSkillFilePath(filePath)
	if err != nil {
		web.FailErr(w, r, web.ErrForbidden)
		return
	}

	data, err := os.ReadFile(validPath)
	if err != nil {
		if os.IsNotExist(err) {
			web.OK(w, r, map[string]interface{}{
				"content": "",
				"exists":  false,
				"path":    validPath,
			})
			return
		}
		web.FailErr(w, r, web.ErrConfigReadFailed, err.Error())
		return
	}

	web.OK(w, r, map[string]interface{}{
		"content": string(data),
		"exists":  true,
		"path":    validPath,
	})
}

// WriteSkillMd writes updated SKILL.md content for a given skill baseDir.
// PUT /api/v1/skills/file
func (h *SkillFileHandler) WriteSkillMd(w http.ResponseWriter, r *http.Request) {
	var req struct {
		BaseDir string `json:"baseDir"`
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.FailErr(w, r, web.ErrInvalidBody)
		return
	}
	if req.BaseDir == "" {
		web.FailErr(w, r, web.ErrInvalidParam)
		return
	}

	filePath := filepath.Join(req.BaseDir, "SKILL.md")
	validPath, err := validateSkillFilePath(filePath)
	if err != nil {
		web.FailErr(w, r, web.ErrForbidden)
		return
	}

	if err := os.WriteFile(validPath, []byte(req.Content), 0o644); err != nil {
		web.FailErr(w, r, web.ErrConfigWriteFailed, err.Error())
		return
	}

	web.OK(w, r, map[string]interface{}{
		"saved": true,
		"path":  validPath,
	})
}
