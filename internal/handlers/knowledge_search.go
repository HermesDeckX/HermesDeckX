package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"HermesDeckX/internal/hermes"
	"HermesDeckX/internal/web"

	_ "github.com/glebarez/sqlite"
)

// KnowledgeSearchHandler provides unified search across hermes-agent
// sessions, memory files, and user profile.
type KnowledgeSearchHandler struct{}

func NewKnowledgeSearchHandler() *KnowledgeSearchHandler {
	return &KnowledgeSearchHandler{}
}

// --- Response types ---

type KnowledgeSearchResult struct {
	ID         string      `json:"id"`
	Kind       string      `json:"kind"` // session_message, memory_entry, user_profile_entry
	Title      string      `json:"title"`
	Snippet    string      `json:"snippet"`
	Source     string      `json:"source,omitempty"`
	AgentID    string      `json:"agentId,omitempty"`
	SessionID  string      `json:"sessionId,omitempty"`
	FileName   string      `json:"fileName,omitempty"`
	Timestamp  int64       `json:"timestamp,omitempty"`
	Score      int         `json:"score"`
	JumpTarget *JumpTarget `json:"jumpTarget,omitempty"`
}

type JumpTarget struct {
	Window     string `json:"window"`
	SessionKey string `json:"sessionKey,omitempty"`
	AgentID    string `json:"agentId,omitempty"`
	Panel      string `json:"panel,omitempty"`
	FileName   string `json:"fileName,omitempty"`
	Section    string `json:"section,omitempty"`
}

type RecentSessionItem struct {
	ID               string   `json:"id"`
	Title            string   `json:"title,omitempty"`
	Source           string   `json:"source"`
	StartedAt        float64  `json:"startedAt"`
	LastActive       float64  `json:"lastActive,omitempty"`
	MessageCount     int      `json:"messageCount"`
	Preview          string   `json:"preview,omitempty"`
	Model            string   `json:"model,omitempty"`
	EstimatedCostUsd *float64 `json:"estimatedCostUsd,omitempty"`
}

type MemoryFileItem struct {
	Name    string `json:"name"`
	Content string `json:"content"`
	Size    int64  `json:"size"`
	ModTime string `json:"modTime,omitempty"`
	Kind    string `json:"kind"` // memory, user_profile, agent_memory
	AgentID string `json:"agentId,omitempty"`
}

// --- Endpoints ---

// Search performs unified search across sessions, memory, and profile.
// GET /api/v1/knowledge/search?q=...&sources=sessions,memory&limit=20
func (h *KnowledgeSearchHandler) Search(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("q"))
	if query == "" {
		web.Fail(w, r, "INVALID_PARAMS", "q is required", http.StatusBadRequest)
		return
	}

	sourcesParam := r.URL.Query().Get("sources")
	if sourcesParam == "" {
		sourcesParam = "sessions,memory"
	}
	sources := strings.Split(sourcesParam, ",")

	limitStr := r.URL.Query().Get("limit")
	limit := 20
	if limitStr != "" {
		if v, err := strconv.Atoi(limitStr); err == nil && v > 0 && v <= 100 {
			limit = v
		}
	}

	var results []KnowledgeSearchResult

	for _, src := range sources {
		switch strings.TrimSpace(src) {
		case "sessions":
			results = append(results, h.searchSessions(query, limit)...)
		case "memory":
			results = append(results, h.searchMemory(query)...)
		}
	}

	// Sort by score descending, then timestamp descending
	sort.Slice(results, func(i, j int) bool {
		if results[i].Score != results[j].Score {
			return results[i].Score > results[j].Score
		}
		return results[i].Timestamp > results[j].Timestamp
	})

	if len(results) > limit {
		results = results[:limit]
	}

	web.OK(w, r, map[string]interface{}{
		"results": results,
		"count":   len(results),
		"query":   query,
	})
}

// RecentSessions returns the most recent sessions.
// GET /api/v1/knowledge/recent-sessions?limit=10
func (h *KnowledgeSearchHandler) RecentSessions(w http.ResponseWriter, r *http.Request) {
	limitStr := r.URL.Query().Get("limit")
	limit := 10
	if limitStr != "" {
		if v, err := strconv.Atoi(limitStr); err == nil && v > 0 && v <= 50 {
			limit = v
		}
	}

	dbPath := resolveStateDB()
	if dbPath == "" {
		web.OK(w, r, map[string]interface{}{
			"sessions": []RecentSessionItem{},
			"count":    0,
			"error":    "state.db not found",
		})
		return
	}

	db, err := sql.Open("sqlite", dbPath+"?mode=ro&_journal_mode=WAL")
	if err != nil {
		web.OK(w, r, map[string]interface{}{
			"sessions": []RecentSessionItem{},
			"count":    0,
			"error":    err.Error(),
		})
		return
	}
	defer db.Close()

	rows, err := db.Query(`
		SELECT id, source, COALESCE(model, ''), COALESCE(title, ''),
		       started_at, COALESCE(ended_at, 0), message_count,
		       COALESCE(estimated_cost_usd, 0)
		FROM sessions
		WHERE parent_session_id IS NULL
		ORDER BY started_at DESC
		LIMIT ?
	`, limit)
	if err != nil {
		web.OK(w, r, map[string]interface{}{
			"sessions": []RecentSessionItem{},
			"count":    0,
			"error":    err.Error(),
		})
		return
	}
	defer rows.Close()

	var sessions []RecentSessionItem
	for rows.Next() {
		var s RecentSessionItem
		var endedAt float64
		var cost float64
		if err := rows.Scan(&s.ID, &s.Source, &s.Model, &s.Title,
			&s.StartedAt, &endedAt, &s.MessageCount, &cost); err != nil {
			continue
		}
		if endedAt > 0 {
			s.LastActive = endedAt
		}
		if cost > 0 {
			s.EstimatedCostUsd = &cost
		}
		// Fetch preview: first user message
		var preview sql.NullString
		_ = db.QueryRow(`
			SELECT content FROM messages
			WHERE session_id = ? AND role = 'user'
			ORDER BY timestamp ASC LIMIT 1
		`, s.ID).Scan(&preview)
		if preview.Valid && len(preview.String) > 200 {
			s.Preview = preview.String[:200] + "…"
		} else if preview.Valid {
			s.Preview = preview.String
		}
		sessions = append(sessions, s)
	}

	if sessions == nil {
		sessions = []RecentSessionItem{}
	}

	web.OK(w, r, map[string]interface{}{
		"sessions": sessions,
		"count":    len(sessions),
	})
}

// MemoryFiles returns memory and user profile file contents.
// GET /api/v1/knowledge/memory?agentId=main
func (h *KnowledgeSearchHandler) MemoryFiles(w http.ResponseWriter, r *http.Request) {
	agentID := r.URL.Query().Get("agentId")

	var files []MemoryFileItem

	// Global memories: ~/.hermes/memories/MEMORY.md and USER.md
	stateDir := hermes.ResolveStateDir()
	if stateDir != "" {
		memoriesDir := filepath.Join(stateDir, "memories")
		for _, name := range []string{"MEMORY.md", "USER.md"} {
			p := filepath.Join(memoriesDir, name)
			if info, err := os.Stat(p); err == nil {
				content, _ := os.ReadFile(p)
				kind := "memory"
				if name == "USER.md" {
					kind = "user_profile"
				}
				files = append(files, MemoryFileItem{
					Name:    name,
					Content: string(content),
					Size:    info.Size(),
					ModTime: info.ModTime().Format(time.RFC3339),
					Kind:    kind,
				})
			}
		}

		// Agent workspace memory files
		if agentID != "" && agentID != "global" {
			agentMemDir := filepath.Join(stateDir, "agents", agentID, "memory")
			if entries, err := os.ReadDir(agentMemDir); err == nil {
				datePattern := regexp.MustCompile(`^\d{4}-\d{2}-\d{2}\.md$`)
				for _, e := range entries {
					if e.IsDir() || !datePattern.MatchString(e.Name()) {
						continue
					}
					p := filepath.Join(agentMemDir, e.Name())
					info, err := e.Info()
					if err != nil {
						continue
					}
					content, _ := os.ReadFile(p)
					files = append(files, MemoryFileItem{
						Name:    e.Name(),
						Content: string(content),
						Size:    info.Size(),
						ModTime: info.ModTime().Format(time.RFC3339),
						Kind:    "agent_memory",
						AgentID: agentID,
					})
				}
			}
		}
	}

	if files == nil {
		files = []MemoryFileItem{}
	}

	web.OK(w, r, map[string]interface{}{
		"files": files,
		"count": len(files),
	})
}

// SessionDetail returns messages for a single session (for preview pane).
// GET /api/v1/knowledge/session?id=xxx&limit=50
func (h *KnowledgeSearchHandler) SessionDetail(w http.ResponseWriter, r *http.Request) {
	sessionID := r.URL.Query().Get("id")
	if sessionID == "" {
		web.Fail(w, r, "INVALID_PARAMS", "id is required", http.StatusBadRequest)
		return
	}

	limitStr := r.URL.Query().Get("limit")
	limit := 50
	if limitStr != "" {
		if v, err := strconv.Atoi(limitStr); err == nil && v > 0 && v <= 200 {
			limit = v
		}
	}

	dbPath := resolveStateDB()
	if dbPath == "" {
		web.Fail(w, r, "DB_NOT_FOUND", "state.db not found", http.StatusNotFound)
		return
	}

	db, err := sql.Open("sqlite", dbPath+"?mode=ro&_journal_mode=WAL")
	if err != nil {
		web.Fail(w, r, "DB_OPEN_FAILED", err.Error(), http.StatusInternalServerError)
		return
	}
	defer db.Close()

	// Session metadata
	var title, source, model sql.NullString
	var startedAt float64
	var msgCount int
	err = db.QueryRow(`
		SELECT COALESCE(title, ''), COALESCE(source, ''), COALESCE(model, ''),
		       started_at, message_count
		FROM sessions WHERE id = ?
	`, sessionID).Scan(&title, &source, &model, &startedAt, &msgCount)
	if err != nil {
		web.Fail(w, r, "SESSION_NOT_FOUND", "session not found", http.StatusNotFound)
		return
	}

	// Messages
	rows, err := db.Query(`
		SELECT role, COALESCE(content, ''), timestamp, COALESCE(tool_name, '')
		FROM messages
		WHERE session_id = ?
		ORDER BY timestamp ASC
		LIMIT ?
	`, sessionID, limit)
	if err != nil {
		web.Fail(w, r, "QUERY_FAILED", err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type msgEntry struct {
		Role     string  `json:"role"`
		Content  string  `json:"content"`
		Time     float64 `json:"timestamp"`
		ToolName string  `json:"toolName,omitempty"`
	}

	var messages []msgEntry
	for rows.Next() {
		var m msgEntry
		if err := rows.Scan(&m.Role, &m.Content, &m.Time, &m.ToolName); err != nil {
			continue
		}
		// Truncate very long messages
		if len(m.Content) > 2000 {
			m.Content = m.Content[:2000] + "\n…[truncated]"
		}
		messages = append(messages, m)
	}

	if messages == nil {
		messages = []msgEntry{}
	}

	web.OK(w, r, map[string]interface{}{
		"session": map[string]interface{}{
			"id":           sessionID,
			"title":        title.String,
			"source":       source.String,
			"model":        model.String,
			"startedAt":    startedAt,
			"messageCount": msgCount,
		},
		"messages": messages,
		"count":    len(messages),
	})
}

// Stats returns quick knowledge-center stats.
// GET /api/v1/knowledge/stats
func (h *KnowledgeSearchHandler) Stats(w http.ResponseWriter, r *http.Request) {
	sessionCount := 0
	messageCount := 0
	memoryFileCount := 0
	var hasUserProfile, hasMemory bool

	dbPath := resolveStateDB()
	if dbPath != "" {
		if db, err := sql.Open("sqlite", dbPath+"?mode=ro&_journal_mode=WAL"); err == nil {
			defer db.Close()
			_ = db.QueryRow(`SELECT COUNT(*) FROM sessions WHERE parent_session_id IS NULL`).Scan(&sessionCount)
			_ = db.QueryRow(`SELECT COUNT(*) FROM messages`).Scan(&messageCount)
		}
	}

	stateDir := hermes.ResolveStateDir()
	if stateDir != "" {
		memoriesDir := filepath.Join(stateDir, "memories")
		if _, err := os.Stat(filepath.Join(memoriesDir, "MEMORY.md")); err == nil {
			hasMemory = true
			memoryFileCount++
		}
		if _, err := os.Stat(filepath.Join(memoriesDir, "USER.md")); err == nil {
			hasUserProfile = true
			memoryFileCount++
		}
	}

	web.OK(w, r, map[string]interface{}{
		"sessionCount":    sessionCount,
		"messageCount":    messageCount,
		"memoryFileCount": memoryFileCount,
		"hasUserProfile":  hasUserProfile,
		"hasMemory":       hasMemory,
	})
}

// --- Internal helpers ---

func resolveStateDB() string {
	stateDir := hermes.ResolveStateDir()
	if stateDir == "" {
		return ""
	}
	p := filepath.Join(stateDir, "state.db")
	if _, err := os.Stat(p); err != nil {
		return ""
	}
	return p
}

func (h *KnowledgeSearchHandler) searchSessions(query string, limit int) []KnowledgeSearchResult {
	dbPath := resolveStateDB()
	if dbPath == "" {
		return nil
	}

	db, err := sql.Open("sqlite", dbPath+"?mode=ro&_journal_mode=WAL")
	if err != nil {
		return nil
	}
	defer db.Close()

	// FTS5 search
	ftsQuery := buildFTS5Query(query)
	rows, err := db.Query(`
		SELECT m.session_id, m.role, m.content, m.timestamp,
		       COALESCE(s.title, ''), COALESCE(s.source, ''), COALESCE(s.model, ''),
		       s.started_at
		FROM messages_fts fts
		JOIN messages m ON m.id = fts.rowid
		JOIN sessions s ON s.id = m.session_id
		WHERE messages_fts MATCH ?
		  AND m.role IN ('user', 'assistant')
		  AND s.parent_session_id IS NULL
		ORDER BY rank
		LIMIT ?
	`, ftsQuery, limit*3)
	if err != nil {
		return nil
	}
	defer rows.Close()

	// Deduplicate by session
	seen := map[string]bool{}
	var results []KnowledgeSearchResult

	for rows.Next() {
		var sessionID, role, content, sessTitle, source, model string
		var ts, startedAt float64
		if err := rows.Scan(&sessionID, &role, &content, &ts,
			&sessTitle, &source, &model, &startedAt); err != nil {
			continue
		}

		snippet := extractSnippet(content, query, 200)
		title := sessTitle
		if title == "" {
			title = fmt.Sprintf("Session from %s", source)
		}

		result := KnowledgeSearchResult{
			ID:        fmt.Sprintf("sm_%s_%.0f", sessionID, ts),
			Kind:      "session_message",
			Title:     title,
			Snippet:   snippet,
			Source:    source,
			SessionID: sessionID,
			Timestamp: int64(ts),
			Score:     100,
			JumpTarget: &JumpTarget{
				Window:     "sessions",
				SessionKey: sessionID,
			},
		}

		if !seen[sessionID] {
			seen[sessionID] = true
			result.Score = 150 // First hit per session ranks higher
		}

		results = append(results, result)
		if len(results) >= limit {
			break
		}
	}

	return results
}

func (h *KnowledgeSearchHandler) searchMemory(query string) []KnowledgeSearchResult {
	stateDir := hermes.ResolveStateDir()
	if stateDir == "" {
		return nil
	}

	queryLower := strings.ToLower(query)
	var results []KnowledgeSearchResult

	memoriesDir := filepath.Join(stateDir, "memories")
	for _, name := range []string{"MEMORY.md", "USER.md"} {
		p := filepath.Join(memoriesDir, name)
		content, err := os.ReadFile(p)
		if err != nil {
			continue
		}
		text := string(content)
		if !strings.Contains(strings.ToLower(text), queryLower) {
			continue
		}

		kind := "memory_entry"
		title := "Agent Memory"
		if name == "USER.md" {
			kind = "user_profile_entry"
			title = "User Profile"
		}

		// Search entry-by-entry (delimiter: \n§\n)
		entries := strings.Split(text, "\n§\n")
		for i, entry := range entries {
			entry = strings.TrimSpace(entry)
			if entry == "" || !strings.Contains(strings.ToLower(entry), queryLower) {
				continue
			}
			snippet := extractSnippet(entry, query, 200)
			results = append(results, KnowledgeSearchResult{
				ID:       fmt.Sprintf("mem_%s_%d", name, i),
				Kind:     kind,
				Title:    title,
				Snippet:  snippet,
				FileName: name,
				Score:    120,
				JumpTarget: &JumpTarget{
					Window:  "settings",
					Section: "memory",
				},
			})
		}
	}

	return results
}

// buildFTS5Query converts a user query into FTS5 syntax.
// Simple approach: wrap each term with * for prefix matching, join with OR for broad recall.
func buildFTS5Query(query string) string {
	terms := strings.Fields(query)
	if len(terms) == 0 {
		return query
	}
	// If user already uses FTS5 syntax (OR, AND, NOT, quotes), pass through
	upper := strings.ToUpper(query)
	if strings.Contains(upper, " OR ") || strings.Contains(upper, " AND ") ||
		strings.Contains(upper, " NOT ") || strings.Contains(query, "\"") {
		return query
	}
	// Add prefix matching
	var parts []string
	for _, t := range terms {
		t = strings.TrimSpace(t)
		if t == "" {
			continue
		}
		// Escape double quotes in terms
		t = strings.ReplaceAll(t, "\"", "")
		if t != "" {
			parts = append(parts, fmt.Sprintf(`"%s"*`, t))
		}
	}
	if len(parts) == 0 {
		return query
	}
	return strings.Join(parts, " OR ")
}

// extractSnippet returns a substring of content centered around the first match of query terms.
func extractSnippet(content, query string, maxLen int) string {
	content = strings.TrimSpace(content)
	if len(content) <= maxLen {
		return content
	}

	lower := strings.ToLower(content)
	terms := strings.Fields(strings.ToLower(query))
	bestPos := 0
	for _, t := range terms {
		pos := strings.Index(lower, t)
		if pos >= 0 {
			bestPos = pos
			break
		}
	}

	half := maxLen / 2
	start := bestPos - half
	if start < 0 {
		start = 0
	}
	end := start + maxLen
	if end > len(content) {
		end = len(content)
		start = end - maxLen
		if start < 0 {
			start = 0
		}
	}

	snippet := content[start:end]
	if start > 0 {
		snippet = "…" + snippet
	}
	if end < len(content) {
		snippet = snippet + "…"
	}
	return snippet
}
