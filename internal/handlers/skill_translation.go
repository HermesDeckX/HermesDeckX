package handlers

import (
	"context"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"HermesDeckX/internal/database"
	"HermesDeckX/internal/logger"
	"HermesDeckX/internal/hermes"
	"HermesDeckX/internal/translate"
	"HermesDeckX/internal/web"
)

// SkillTranslationHandler manages skill description translations.
type SkillTranslationHandler struct {
	translator *translate.Translator
	repo       *database.SkillTranslationRepo
	mu         sync.Mutex
	running    map[string]bool // track in-flight translation jobs
}

func NewSkillTranslationHandler() *SkillTranslationHandler {
	settingRepo := database.NewSettingRepo()
	t := translate.New()
	t.SetModelPreference(func() string {
		v, err := settingRepo.Get("translate_model")
		if err != nil {
			return ""
		}
		return v
	})
	return &SkillTranslationHandler{
		translator: t,
		repo:       database.NewSkillTranslationRepo(),
		running:    make(map[string]bool),
	}
}

// SetGWClient injects a gateway client so the translator can resolve
// model provider config from a remote gateway (not just local files).
func (h *SkillTranslationHandler) SetGWClient(client *hermes.GWClient) {
	if client == nil {
		return
	}
	h.translator.SetConfigResolver(func() map[string]interface{} {
		return resolveProvidersFromGWClient(client)
	})
}

// translationEntry is the JSON response for a single skill translation.
type translationEntry struct {
	SkillKey    string `json:"skill_key"`
	Lang        string `json:"lang"`
	Name        string `json:"name"`
	Description string `json:"description"`
	SourceHash  string `json:"source_hash"`
	Status      string `json:"status"`           // "cached", "translating", "none"
	Engine      string `json:"engine,omitempty"` // "llm" or "free"
}

// Get returns cached translations for the requested skill keys and language.
// Cache invalidation is handled by sourceHash comparison in Translate(), not by time expiry.
// GET /api/v1/skills/translations?lang=zh&keys=skill1,skill2
func (h *SkillTranslationHandler) Get(w http.ResponseWriter, r *http.Request) {
	lang := r.URL.Query().Get("lang")
	keysParam := r.URL.Query().Get("keys")
	if lang == "" || keysParam == "" {
		web.Fail(w, r, "INVALID_PARAMS", "lang and keys are required", http.StatusBadRequest)
		return
	}

	keys := strings.Split(keysParam, ",")
	for i := range keys {
		keys[i] = strings.TrimSpace(keys[i])
	}

	cached, err := h.repo.GetByKeys(lang, keys)
	if err != nil {
		web.Fail(w, r, "DB_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}

	// Build lookup map
	cacheMap := make(map[string]*database.SkillTranslation, len(cached))
	for i := range cached {
		cacheMap[cached[i].SkillKey] = &cached[i]
	}

	entries := make([]translationEntry, 0, len(keys))
	h.mu.Lock()
	for _, key := range keys {
		if t, ok := cacheMap[key]; ok {
			// Discard cached entries where the translated name is garbage (e.g. URL).
			// This forces the frontend to show the original name and re-trigger translation.
			if isGarbageTranslation("", t.Name) {
				entries = append(entries, translationEntry{
					SkillKey: key,
					Lang:     lang,
					Status:   "none",
				})
			} else {
				entries = append(entries, translationEntry{
					SkillKey:    key,
					Lang:        lang,
					Name:        t.Name,
					Description: t.Description,
					SourceHash:  t.SourceHash,
					Status:      "cached",
					Engine:      t.Engine,
				})
			}
		} else if h.running[key+":"+lang] {
			entries = append(entries, translationEntry{
				SkillKey: key,
				Lang:     lang,
				Status:   "translating",
			})
		} else {
			entries = append(entries, translationEntry{
				SkillKey: key,
				Lang:     lang,
				Status:   "none",
			})
		}
	}
	h.mu.Unlock()

	web.OK(w, r, entries)
}

// translateRequest is the JSON body for POST /api/v1/skills/translations.
type translateRequest struct {
	Lang   string      `json:"lang"`
	Skills []skillItem `json:"skills"`
	Engine string      `json:"engine,omitempty"` // "llm", "free", or "" (auto)
}

type skillItem struct {
	SkillKey    string `json:"skill_key"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

// Translate triggers async translation for the given skills.
// POST /api/v1/skills/translations
func (h *SkillTranslationHandler) Translate(w http.ResponseWriter, r *http.Request) {
	var req translateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.Fail(w, r, "INVALID_JSON", err.Error(), http.StatusBadRequest)
		return
	}
	if req.Lang == "" || len(req.Skills) == 0 {
		web.Fail(w, r, "INVALID_PARAMS", "lang and skills are required", http.StatusBadRequest)
		return
	}
	// Skip translation for English
	if req.Lang == "en" {
		web.OK(w, r, map[string]string{"status": "skipped", "reason": "source is english"})
		return
	}

	// Filter out already cached (with same source hash) and already running
	var toTranslate []skillItem
	cached, _ := h.repo.GetByKeys(req.Lang, skillKeys(req.Skills))
	type cacheEntry struct{ hash, engine string }
	cacheMap := make(map[string]cacheEntry, len(cached))
	for _, c := range cached {
		cacheMap[c.SkillKey] = cacheEntry{hash: c.SourceHash, engine: c.Engine}
	}

	h.mu.Lock()
	for _, sk := range req.Skills {
		sourceText := sk.Name + "\n" + sk.Description
		hash := hashText(sourceText)
		jobKey := sk.SkillKey + ":" + req.Lang
		// Skip if already running
		if h.running[jobKey] {
			continue
		}
		// Skip if cached with same hash AND matching engine (or no engine preference)
		if entry, ok := cacheMap[sk.SkillKey]; ok && entry.hash == hash {
			if req.Engine == "" || req.Engine == entry.engine {
				continue
			}
		}
		h.running[jobKey] = true
		toTranslate = append(toTranslate, sk)
	}
	h.mu.Unlock()

	if len(toTranslate) == 0 {
		web.OK(w, r, map[string]interface{}{"status": "ok", "queued": 0})
		return
	}

	// Limit batch size to prevent overloading translation API
	const maxBatchSize = 10
	if len(toTranslate) > maxBatchSize {
		// Release running flags for items we won't process this batch
		h.mu.Lock()
		for i := maxBatchSize; i < len(toTranslate); i++ {
			jobKey := toTranslate[i].SkillKey + ":" + req.Lang
			delete(h.running, jobKey)
		}
		h.mu.Unlock()
		toTranslate = toTranslate[:maxBatchSize]
	}

	// Run translations in background
	go h.translateBatch(req.Lang, toTranslate, req.Engine)

	web.OK(w, r, map[string]interface{}{"status": "ok", "queued": len(toTranslate)})
}

func (h *SkillTranslationHandler) translateBatch(lang string, skills []skillItem, preferEngine string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	for _, sk := range skills {
		jobKey := sk.SkillKey + ":" + lang
		sourceText := sk.Name + "\n" + sk.Description
		hash := hashText(sourceText)

		// Translate name
		translatedName, engineName, err := h.translator.TranslateForced(ctx, sk.Name, "en", lang, preferEngine)
		if err != nil || isGarbageTranslation(sk.Name, translatedName) {
			if err != nil {
				logger.Log.Warn().Err(err).Str("skill", sk.SkillKey).Msg("translate name failed")
			} else {
				logger.Log.Warn().Str("skill", sk.SkillKey).Str("got", translatedName).Msg("translate name returned garbage, using original")
			}
			translatedName = sk.Name
		}

		// Translate description (engine from name translation is representative)
		translatedDesc, engineDesc, err := h.translator.TranslateForced(ctx, sk.Description, "en", lang, preferEngine)
		if err != nil || isGarbageTranslation(sk.Description, translatedDesc) {
			if err != nil {
				logger.Log.Warn().Err(err).Str("skill", sk.SkillKey).Msg("translate description failed")
			} else {
				logger.Log.Warn().Str("skill", sk.SkillKey).Str("got", translatedDesc).Msg("translate description returned garbage, using original")
			}
			translatedDesc = sk.Description
		}

		// Use the engine from whichever translation succeeded last
		engine := engineName
		if engineDesc != "" {
			engine = engineDesc
		}

		// Save to DB
		if err := h.repo.Upsert(&database.SkillTranslation{
			SkillKey:    sk.SkillKey,
			Lang:        lang,
			SourceHash:  hash,
			Name:        translatedName,
			Description: translatedDesc,
			Engine:      engine,
		}); err != nil {
			logger.Log.Error().Err(err).Str("skill", sk.SkillKey).Msg("save translation failed")
		}

		// Remove from running
		h.mu.Lock()
		delete(h.running, jobKey)
		h.mu.Unlock()
	}
}

func skillKeys(skills []skillItem) []string {
	keys := make([]string, len(skills))
	for i, s := range skills {
		keys[i] = s.SkillKey
	}
	return keys
}

func hashText(text string) string {
	return fmt.Sprintf("%x", md5.Sum([]byte(text)))
}

// isGarbageTranslation detects when a translation API returns garbage instead of
// a real translation (e.g. a URL, or content completely unrelated to the source).
// This prevents translated skill names from being replaced by random URLs.
func isGarbageTranslation(source, translated string) bool {
	t := strings.TrimSpace(translated)
	if t == "" {
		return true
	}
	// If the source doesn't contain a URL but the translation does, it's garbage.
	sourceHasURL := strings.Contains(source, "http://") || strings.Contains(source, "https://")
	translatedHasURL := strings.HasPrefix(t, "http://") || strings.HasPrefix(t, "https://")
	if !sourceHasURL && translatedHasURL {
		return true
	}
	return false
}
