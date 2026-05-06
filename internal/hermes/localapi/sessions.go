package localapi

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"HermesDeckX/internal/hermes"

	_ "github.com/glebarez/sqlite"
)

// SessionInfo represents a session from state.db.
type SessionInfo struct {
	ID              string   `json:"id"`
	Source          string   `json:"source"`
	UserID          string   `json:"userId,omitempty"`
	Model           string   `json:"model,omitempty"`
	Title           string   `json:"title,omitempty"`
	StartedAt       float64  `json:"startedAt"`
	EndedAt         *float64 `json:"endedAt,omitempty"`
	EndReason       string   `json:"endReason,omitempty"`
	MessageCount    int      `json:"messageCount"`
	ToolCallCount   int      `json:"toolCallCount"`
	InputTokens     int64    `json:"inputTokens"`
	OutputTokens    int64    `json:"outputTokens"`
	ReasoningTokens int64    `json:"reasoningTokens,omitempty"`
	EstimatedCost   *float64 `json:"estimatedCostUsd,omitempty"`
	ApiCallCount    int      `json:"apiCallCount"`
	ParentSessionID string   `json:"parentSessionId,omitempty"`
	Preview         string   `json:"preview,omitempty"`
	LastActive      string   `json:"lastActive,omitempty"`
}

// MessageInfo represents a message from state.db.
type MessageInfo struct {
	ID                int64           `json:"id"`
	SessionID         string          `json:"sessionId"`
	Role              string          `json:"role"`
	Content           json.RawMessage `json:"content"`
	ToolCallID        string          `json:"toolCallId,omitempty"`
	ToolCalls         json.RawMessage `json:"toolCalls,omitempty"`
	ToolName          string          `json:"toolName,omitempty"`
	Timestamp         float64         `json:"timestamp"`
	TokenCount        *int            `json:"tokenCount,omitempty"`
	FinishReason      string          `json:"finishReason,omitempty"`
	ReasoningContent  string          `json:"reasoningContent,omitempty"`
	CodexMessageItems json.RawMessage `json:"codexMessageItems,omitempty"`
}

// openStateDB opens the hermes-agent state.db in read-only mode.
func openStateDB() (*sql.DB, error) {
	home := hermes.ResolveHermesHome()
	if home == "" {
		return nil, fmt.Errorf("cannot resolve hermes home directory")
	}
	dbPath := filepath.Join(home, "state.db")
	db, err := sql.Open("sqlite", dbPath+"?mode=ro&_journal_mode=WAL")
	if err != nil {
		return nil, fmt.Errorf("open state.db: %w", err)
	}
	return db, nil
}

// ListSessions returns recent sessions from state.db.
func ListSessions(limit int, source string) ([]SessionInfo, error) {
	db, err := openStateDB()
	if err != nil {
		return nil, err
	}
	defer db.Close()

	if limit <= 0 {
		limit = 50
	}

	query := `SELECT s.id, s.source, s.user_id, s.model, s.title,
		s.started_at, s.ended_at, s.end_reason, s.message_count,
		s.tool_call_count, s.input_tokens, s.output_tokens,
		s.reasoning_tokens, s.estimated_cost_usd,
		COALESCE(s.api_call_count, 0), s.parent_session_id,
		(SELECT content FROM messages WHERE session_id = s.id AND role = 'user' ORDER BY timestamp DESC LIMIT 1) as preview
	FROM sessions s`

	var args []interface{}
	var conditions []string

	// Exclude tool sessions by default
	conditions = append(conditions, "s.source != 'tool'")

	if source != "" {
		conditions = append(conditions, "s.source = ?")
		args = append(args, source)
	}

	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}

	query += " ORDER BY COALESCE(s.ended_at, s.started_at) DESC LIMIT ?"
	args = append(args, limit)

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("query sessions: %w", err)
	}
	defer rows.Close()

	var sessions []SessionInfo
	for rows.Next() {
		var s SessionInfo
		var userID, model, title, endReason, parentSessionID sql.NullString
		var endedAt sql.NullFloat64
		var estimatedCost sql.NullFloat64
		var preview sql.NullString
		var reasoningTokens sql.NullInt64

		err := rows.Scan(
			&s.ID, &s.Source, &userID, &model, &title,
			&s.StartedAt, &endedAt, &endReason, &s.MessageCount,
			&s.ToolCallCount, &s.InputTokens, &s.OutputTokens,
			&reasoningTokens, &estimatedCost, &s.ApiCallCount, &parentSessionID, &preview,
		)
		if err != nil {
			continue
		}

		if userID.Valid {
			s.UserID = userID.String
		}
		if model.Valid {
			s.Model = model.String
		}
		if title.Valid {
			s.Title = title.String
		}
		if endedAt.Valid {
			s.EndedAt = &endedAt.Float64
		}
		if endReason.Valid {
			s.EndReason = endReason.String
		}
		if estimatedCost.Valid {
			s.EstimatedCost = &estimatedCost.Float64
		}
		if reasoningTokens.Valid {
			s.ReasoningTokens = reasoningTokens.Int64
		}
		if preview.Valid {
			p := preview.String
			if len(p) > 200 {
				p = p[:200]
			}
			s.Preview = p
		}

		// Compute lastActive as relative time
		activeTs := s.StartedAt
		if s.EndedAt != nil {
			activeTs = *s.EndedAt
		}
		s.LastActive = relativeTime(activeTs)

		sessions = append(sessions, s)
	}

	if sessions == nil {
		sessions = []SessionInfo{}
	}
	return sessions, nil
}

// GetSessionHistory returns message history for a session.
func GetSessionHistory(sessionID string, limit int, maxChars int) ([]MessageInfo, error) {
	db, err := openStateDB()
	if err != nil {
		return nil, err
	}
	defer db.Close()

	if limit <= 0 {
		limit = 1000
	}

	query := `SELECT id, session_id, role, content, tool_call_id, tool_calls,
		tool_name, timestamp, token_count, finish_reason,
		COALESCE(reasoning_content, '') as reasoning_content,
		codex_message_items
	FROM messages WHERE session_id = ? ORDER BY timestamp ASC LIMIT ?`

	rows, err := db.Query(query, sessionID, limit)
	if err != nil {
		return nil, fmt.Errorf("query messages: %w", err)
	}
	defer rows.Close()

	var messages []MessageInfo
	for rows.Next() {
		var m MessageInfo
		var content, toolCallID, toolCalls, toolName, finishReason sql.NullString
		var codexMessageItems sql.NullString
		var tokenCount sql.NullInt64
		var reasoningContent sql.NullString

		err := rows.Scan(
			&m.ID, &m.SessionID, &m.Role, &content, &toolCallID,
			&toolCalls, &toolName, &m.Timestamp, &tokenCount, &finishReason,
			&reasoningContent, &codexMessageItems,
		)
		if err != nil {
			continue
		}

		if content.Valid {
			c := content.String
			if maxChars > 0 && len(c) > maxChars {
				c = c[:maxChars]
			}
			m.Content = json.RawMessage(`"` + escapeJSON(c) + `"`)
		} else {
			m.Content = json.RawMessage(`null`)
		}
		if toolCallID.Valid {
			m.ToolCallID = toolCallID.String
		}
		if toolCalls.Valid && toolCalls.String != "" {
			m.ToolCalls = json.RawMessage(toolCalls.String)
		}
		if toolName.Valid {
			m.ToolName = toolName.String
		}
		if tokenCount.Valid {
			tc := int(tokenCount.Int64)
			m.TokenCount = &tc
		}
		if finishReason.Valid {
			m.FinishReason = finishReason.String
		}
		if reasoningContent.Valid && reasoningContent.String != "" {
			m.ReasoningContent = reasoningContent.String
		}
		if codexMessageItems.Valid && codexMessageItems.String != "" {
			m.CodexMessageItems = json.RawMessage(codexMessageItems.String)
		}

		messages = append(messages, m)
	}

	if messages == nil {
		messages = []MessageInfo{}
	}
	return messages, nil
}

// SessionPreview represents a preview for a single session key.
type SessionPreview struct {
	Key      string            `json:"key"`
	Messages []json.RawMessage `json:"messages"`
}

// GetSessionPreviews returns message previews for the given session keys.
func GetSessionPreviews(keys []string, limit int, maxChars int) ([]SessionPreview, error) {
	db, err := openStateDB()
	if err != nil {
		return nil, err
	}
	defer db.Close()

	if limit <= 0 {
		limit = 12
	}
	if maxChars <= 0 {
		maxChars = 240
	}

	var results []SessionPreview
	for _, key := range keys {
		rows, err := db.Query(
			`SELECT role, content, timestamp FROM messages
			 WHERE session_id = ? ORDER BY timestamp DESC LIMIT ?`, key, limit)
		if err != nil {
			results = append(results, SessionPreview{Key: key, Messages: []json.RawMessage{}})
			continue
		}

		var msgs []json.RawMessage
		for rows.Next() {
			var role, content sql.NullString
			var ts float64
			if rows.Scan(&role, &content, &ts) != nil {
				continue
			}
			c := ""
			if content.Valid {
				c = content.String
				if len(c) > maxChars {
					c = c[:maxChars]
				}
			}
			msg := map[string]interface{}{
				"role":      role.String,
				"content":   c,
				"timestamp": ts,
			}
			raw, _ := json.Marshal(msg)
			msgs = append(msgs, raw)
		}
		rows.Close()

		if msgs == nil {
			msgs = []json.RawMessage{}
		}
		results = append(results, SessionPreview{Key: key, Messages: msgs})
	}

	return results, nil
}

// ResetSession deletes all messages for a session but keeps the session record.
func ResetSession(sessionID string) error {
	home := hermes.ResolveHermesHome()
	if home == "" {
		return fmt.Errorf("cannot resolve hermes home directory")
	}
	dbPath := filepath.Join(home, "state.db")
	db, err := sql.Open("sqlite", dbPath+"?_journal_mode=WAL")
	if err != nil {
		return fmt.Errorf("open state.db: %w", err)
	}
	defer db.Close()

	_, err = db.Exec("DELETE FROM messages WHERE session_id = ?", sessionID)
	if err != nil {
		return fmt.Errorf("reset session messages: %w", err)
	}
	_, err = db.Exec("UPDATE sessions SET message_count = 0, tool_call_count = 0, input_tokens = 0, output_tokens = 0, reasoning_tokens = 0, estimated_cost_usd = NULL WHERE id = ?", sessionID)
	return err
}

// DeleteSession deletes a session and its messages from state.db.
func DeleteSession(sessionID string) error {
	home := hermes.ResolveHermesHome()
	if home == "" {
		return fmt.Errorf("cannot resolve hermes home directory")
	}
	dbPath := filepath.Join(home, "state.db")
	db, err := sql.Open("sqlite", dbPath+"?_journal_mode=WAL")
	if err != nil {
		return fmt.Errorf("open state.db: %w", err)
	}
	defer db.Close()

	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}

	if _, err := tx.Exec("DELETE FROM messages WHERE session_id = ?", sessionID); err != nil {
		tx.Rollback()
		return fmt.Errorf("delete messages: %w", err)
	}
	if _, err := tx.Exec("DELETE FROM sessions WHERE id = ?", sessionID); err != nil {
		tx.Rollback()
		return fmt.Errorf("delete session: %w", err)
	}

	return tx.Commit()
}

// UsageSummary aggregates token usage stats from state.db.
type UsageSummary struct {
	TotalSessions   int     `json:"totalSessions"`
	TotalMessages   int     `json:"totalMessages"`
	TotalToolCalls  int     `json:"totalToolCalls"`
	InputTokens     int64   `json:"inputTokens"`
	OutputTokens    int64   `json:"outputTokens"`
	ReasoningTokens int64   `json:"reasoningTokens,omitempty"`
	EstimatedCost   float64 `json:"estimatedCostUsd"`
}

// GetUsageSummary returns aggregated usage statistics from state.db.
// If days > 0, only sessions from the last N days are included.
func GetUsageSummary(days int) (*UsageSummary, error) {
	db, err := openStateDB()
	if err != nil {
		return nil, err
	}
	defer db.Close()

	query := `SELECT COUNT(*), COALESCE(SUM(message_count),0), COALESCE(SUM(tool_call_count),0),
		COALESCE(SUM(input_tokens),0), COALESCE(SUM(output_tokens),0),
		COALESCE(SUM(reasoning_tokens),0), COALESCE(SUM(estimated_cost_usd),0)
	FROM sessions`

	var args []interface{}
	if days > 0 {
		query += " WHERE started_at >= ?"
		cutoff := float64(time.Now().AddDate(0, 0, -days).Unix())
		args = append(args, cutoff)
	}

	var s UsageSummary
	err = db.QueryRow(query, args...).Scan(
		&s.TotalSessions, &s.TotalMessages, &s.TotalToolCalls,
		&s.InputTokens, &s.OutputTokens, &s.ReasoningTokens, &s.EstimatedCost,
	)
	if err != nil {
		return nil, fmt.Errorf("aggregate usage: %w", err)
	}
	return &s, nil
}

// GetSessionUsageList returns per-session usage details for the given time range.
func GetSessionUsageList(startDate, endDate string, limit int) ([]SessionInfo, error) {
	db, err := openStateDB()
	if err != nil {
		return nil, err
	}
	defer db.Close()

	if limit <= 0 {
		limit = 50
	}

	query := `SELECT id, source, user_id, model, title, started_at, ended_at,
		end_reason, message_count, tool_call_count, input_tokens, output_tokens,
		reasoning_tokens, estimated_cost_usd, COALESCE(api_call_count, 0)
	FROM sessions WHERE 1=1`

	var args []interface{}
	if startDate != "" {
		// Parse date string to unix timestamp
		if t, err := time.Parse("2006-01-02", startDate); err == nil {
			query += " AND started_at >= ?"
			args = append(args, float64(t.Unix()))
		}
	}
	if endDate != "" {
		if t, err := time.Parse("2006-01-02", endDate); err == nil {
			query += " AND started_at <= ?"
			args = append(args, float64(t.Add(24*time.Hour).Unix()))
		}
	}
	query += " ORDER BY started_at DESC LIMIT ?"
	args = append(args, limit)

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("query session usage: %w", err)
	}
	defer rows.Close()

	var sessions []SessionInfo
	for rows.Next() {
		var s SessionInfo
		var userID, model, title, endReason sql.NullString
		var endedAt, estimatedCost sql.NullFloat64
		var reasoningTokens sql.NullInt64

		err := rows.Scan(
			&s.ID, &s.Source, &userID, &model, &title, &s.StartedAt, &endedAt,
			&endReason, &s.MessageCount, &s.ToolCallCount, &s.InputTokens, &s.OutputTokens,
			&reasoningTokens, &estimatedCost, &s.ApiCallCount,
		)
		if err != nil {
			continue
		}
		if userID.Valid {
			s.UserID = userID.String
		}
		if model.Valid {
			s.Model = model.String
		}
		if title.Valid {
			s.Title = title.String
		}
		if endedAt.Valid {
			s.EndedAt = &endedAt.Float64
		}
		if endReason.Valid {
			s.EndReason = endReason.String
		}
		if estimatedCost.Valid {
			s.EstimatedCost = &estimatedCost.Float64
		}
		if reasoningTokens.Valid {
			s.ReasoningTokens = reasoningTokens.Int64
		}
		sessions = append(sessions, s)
	}
	if sessions == nil {
		sessions = []SessionInfo{}
	}
	return sessions, nil
}

// CreateSession creates a new session record in state.db.
func CreateSession(sessionID string, source string, label string) error {
	home := hermes.ResolveHermesHome()
	if home == "" {
		return fmt.Errorf("cannot resolve hermes home directory")
	}
	dbPath := filepath.Join(home, "state.db")
	db, err := sql.Open("sqlite", dbPath+"?_journal_mode=WAL")
	if err != nil {
		return fmt.Errorf("open state.db: %w", err)
	}
	defer db.Close()

	now := float64(time.Now().Unix())
	_, err = db.Exec(
		`INSERT OR IGNORE INTO sessions (id, source, started_at, title) VALUES (?, ?, ?, ?)`,
		sessionID, source, now, label,
	)
	if err != nil {
		return fmt.Errorf("create session: %w", err)
	}
	return nil
}

// PatchSession updates mutable session metadata in state.db.
func PatchSession(sessionID string, patch map[string]interface{}) error {
	home := hermes.ResolveHermesHome()
	if home == "" {
		return fmt.Errorf("cannot resolve hermes home directory")
	}
	dbPath := filepath.Join(home, "state.db")
	db, err := sql.Open("sqlite", dbPath+"?_journal_mode=WAL")
	if err != nil {
		return fmt.Errorf("open state.db: %w", err)
	}
	defer db.Close()

	// Only allow safe fields to be patched
	allowed := map[string]string{
		"label": "title",
		"title": "title",
		"model": "model",
	}

	var sets []string
	var args []interface{}
	for key, val := range patch {
		col, ok := allowed[key]
		if !ok {
			continue
		}
		if val == nil {
			sets = append(sets, col+" = NULL")
		} else {
			sets = append(sets, col+" = ?")
			args = append(args, val)
		}
	}

	if len(sets) == 0 {
		return nil // nothing to update
	}

	args = append(args, sessionID)
	query := "UPDATE sessions SET " + strings.Join(sets, ", ") + " WHERE id = ?"
	_, err = db.Exec(query, args...)
	if err != nil {
		return fmt.Errorf("patch session: %w", err)
	}
	return nil
}

// SearchSessions searches messages via FTS5 and returns matching sessions.
func SearchSessions(query string, limit int) ([]SessionInfo, error) {
	db, err := openStateDB()
	if err != nil {
		return nil, err
	}
	defer db.Close()

	if limit <= 0 {
		limit = 20
	}

	rows, err := db.Query(
		`SELECT DISTINCT s.id, s.source, s.user_id, s.model, s.title,
			s.started_at, s.ended_at, s.end_reason, s.message_count,
			s.tool_call_count, s.input_tokens, s.output_tokens,
			s.reasoning_tokens, s.estimated_cost_usd,
			COALESCE(s.api_call_count, 0), s.parent_session_id
		FROM messages_fts f
		JOIN messages m ON m.id = f.rowid
		JOIN sessions s ON s.id = m.session_id
		WHERE messages_fts MATCH ?
		ORDER BY s.started_at DESC LIMIT ?`,
		query, limit,
	)
	if err != nil {
		return nil, fmt.Errorf("search sessions: %w", err)
	}
	defer rows.Close()

	var sessions []SessionInfo
	for rows.Next() {
		var s SessionInfo
		var userID, model, title, endReason, parentSessionID sql.NullString
		var endedAt, estimatedCost sql.NullFloat64
		var reasoningTokens sql.NullInt64

		err := rows.Scan(
			&s.ID, &s.Source, &userID, &model, &title, &s.StartedAt, &endedAt,
			&endReason, &s.MessageCount, &s.ToolCallCount, &s.InputTokens, &s.OutputTokens,
			&reasoningTokens, &estimatedCost, &s.ApiCallCount, &parentSessionID,
		)
		if err != nil {
			continue
		}
		if userID.Valid {
			s.UserID = userID.String
		}
		if model.Valid {
			s.Model = model.String
		}
		if title.Valid {
			s.Title = title.String
		}
		if endedAt.Valid {
			s.EndedAt = &endedAt.Float64
		}
		if endReason.Valid {
			s.EndReason = endReason.String
		}
		if estimatedCost.Valid {
			s.EstimatedCost = &estimatedCost.Float64
		}
		if reasoningTokens.Valid {
			s.ReasoningTokens = reasoningTokens.Int64
		}
		if parentSessionID.Valid {
			s.ParentSessionID = parentSessionID.String
		}
		sessions = append(sessions, s)
	}
	if sessions == nil {
		sessions = []SessionInfo{}
	}
	return sessions, nil
}

// UsageTotals is the frontend-expected totals shape for the Usage window.
type UsageTotals struct {
	Input          int64   `json:"input"`
	Output         int64   `json:"output"`
	CacheRead      int64   `json:"cacheRead"`
	CacheWrite     int64   `json:"cacheWrite"`
	TotalTokens    int64   `json:"totalTokens"`
	TotalCost      float64 `json:"totalCost"`
	InputCost      float64 `json:"inputCost"`
	OutputCost     float64 `json:"outputCost"`
	CacheReadCost  float64 `json:"cacheReadCost"`
	CacheWriteCost float64 `json:"cacheWriteCost"`
}

// DailyEntry is one day of aggregated usage.
type DailyEntry struct {
	Date   string  `json:"date"`
	Tokens int64   `json:"tokens"`
	Cost   float64 `json:"cost"`
}

// ModelEntry is per-model aggregated usage.
type ModelEntry struct {
	Model  string      `json:"model"`
	Count  int         `json:"count"`
	Totals UsageTotals `json:"totals"`
}

// AnalyticsData is the full payload returned to the Usage window.
type AnalyticsData struct {
	Totals     UsageTotals   `json:"totals"`
	Sessions   []SessionInfo `json:"sessions"`
	Aggregates struct {
		Messages struct {
			Total       int `json:"total"`
			User        int `json:"user"`
			Assistant   int `json:"assistant"`
			ToolCalls   int `json:"toolCalls"`
			ToolResults int `json:"toolResults"`
			Errors      int `json:"errors"`
		} `json:"messages"`
		Tools struct {
			TotalCalls  int           `json:"totalCalls"`
			UniqueTools int           `json:"uniqueTools"`
			Tools       []interface{} `json:"tools"`
		} `json:"tools"`
		ByModel    []ModelEntry `json:"byModel"`
		ByProvider []ModelEntry `json:"byProvider"`
		Daily      []DailyEntry `json:"daily"`
	} `json:"aggregates"`
}

// GetAnalyticsData builds the full AnalyticsData from state.db for the given date range.
func GetAnalyticsData(startDate, endDate string, limit int) (*AnalyticsData, error) {
	db, err := openStateDB()
	if err != nil {
		return nil, err
	}
	defer db.Close()

	if limit <= 0 {
		limit = 200
	}

	// Build WHERE clause
	var conditions []string
	var args []interface{}
	conditions = append(conditions, "source != 'tool'")
	if startDate != "" {
		if t, err := time.Parse("2006-01-02", startDate); err == nil {
			conditions = append(conditions, "started_at >= ?")
			args = append(args, float64(t.Unix()))
		}
	}
	if endDate != "" {
		if t, err := time.Parse("2006-01-02", endDate); err == nil {
			conditions = append(conditions, "started_at <= ?")
			args = append(args, float64(t.Add(24*time.Hour).Unix()))
		}
	}
	where := "WHERE " + strings.Join(conditions, " AND ")

	// Totals
	var totals UsageTotals
	var totalMsgs, totalTools int
	row := db.QueryRow(fmt.Sprintf(
		`SELECT COALESCE(SUM(input_tokens),0), COALESCE(SUM(output_tokens),0),
		        COALESCE(SUM(cache_read_tokens),0),
		        COALESCE(SUM(input_tokens)+SUM(output_tokens),0),
		        COALESCE(SUM(COALESCE(actual_cost_usd, estimated_cost_usd)),0),
		        COALESCE(SUM(message_count),0), COALESCE(SUM(tool_call_count),0)
		 FROM sessions %s`, where), args...)
	if err := row.Scan(&totals.Input, &totals.Output, &totals.CacheRead,
		&totals.TotalTokens, &totals.TotalCost, &totalMsgs, &totalTools); err != nil {
		return nil, err
	}

	// Daily aggregates
	dailyArgs := append([]interface{}{}, args...)
	dailyRows, err := db.Query(fmt.Sprintf(
		`SELECT date(started_at, 'unixepoch') as day,
		        COALESCE(SUM(input_tokens)+SUM(output_tokens),0),
		        COALESCE(SUM(COALESCE(actual_cost_usd, estimated_cost_usd)),0)
		 FROM sessions %s GROUP BY day ORDER BY day ASC`, where), dailyArgs...)
	if err != nil {
		return nil, err
	}
	defer dailyRows.Close()
	var daily []DailyEntry
	for dailyRows.Next() {
		var d DailyEntry
		if dailyRows.Scan(&d.Date, &d.Tokens, &d.Cost) == nil {
			daily = append(daily, d)
		}
	}
	if daily == nil {
		daily = []DailyEntry{}
	}

	// By model
	modelArgs := append([]interface{}{}, args...)
	modelRows, err := db.Query(fmt.Sprintf(
		`SELECT COALESCE(model,'unknown'),
		        COUNT(*),
		        COALESCE(SUM(input_tokens),0), COALESCE(SUM(output_tokens),0),
		        COALESCE(SUM(input_tokens)+SUM(output_tokens),0),
		        COALESCE(SUM(COALESCE(actual_cost_usd, estimated_cost_usd)),0)
		 FROM sessions %s GROUP BY model ORDER BY SUM(input_tokens+output_tokens) DESC`, where), modelArgs...)
	if err != nil {
		return nil, err
	}
	defer modelRows.Close()
	var byModel []ModelEntry
	for modelRows.Next() {
		var m ModelEntry
		if modelRows.Scan(&m.Model, &m.Count,
			&m.Totals.Input, &m.Totals.Output,
			&m.Totals.TotalTokens, &m.Totals.TotalCost) == nil {
			byModel = append(byModel, m)
		}
	}
	if byModel == nil {
		byModel = []ModelEntry{}
	}

	// Sessions list
	sessionArgs := append([]interface{}{}, args...)
	sessionArgs = append(sessionArgs, limit)
	sessionRows, err := db.Query(fmt.Sprintf(
		`SELECT id, source, user_id, model, title, started_at, ended_at,
		        end_reason, message_count, tool_call_count, input_tokens, output_tokens,
		        reasoning_tokens, COALESCE(actual_cost_usd, estimated_cost_usd),
		        COALESCE(api_call_count, 0)
		 FROM sessions %s ORDER BY started_at DESC LIMIT ?`, where), sessionArgs...)
	if err != nil {
		return nil, err
	}
	defer sessionRows.Close()
	var sessions []SessionInfo
	for sessionRows.Next() {
		var s SessionInfo
		var userID, model, title, endReason sql.NullString
		var endedAt, estimatedCost sql.NullFloat64
		var reasoningTokens sql.NullInt64
		if sessionRows.Scan(&s.ID, &s.Source, &userID, &model, &title, &s.StartedAt, &endedAt,
			&endReason, &s.MessageCount, &s.ToolCallCount, &s.InputTokens, &s.OutputTokens,
			&reasoningTokens, &estimatedCost, &s.ApiCallCount) != nil {
			continue
		}
		if userID.Valid {
			s.UserID = userID.String
		}
		if model.Valid {
			s.Model = model.String
		}
		if title.Valid {
			s.Title = title.String
		}
		if endedAt.Valid {
			s.EndedAt = &endedAt.Float64
		}
		if endReason.Valid {
			s.EndReason = endReason.String
		}
		if estimatedCost.Valid {
			s.EstimatedCost = &estimatedCost.Float64
		}
		if reasoningTokens.Valid {
			s.ReasoningTokens = reasoningTokens.Int64
		}
		sessions = append(sessions, s)
	}
	if sessions == nil {
		sessions = []SessionInfo{}
	}

	data := &AnalyticsData{}
	data.Totals = totals
	data.Sessions = sessions
	data.Aggregates.Daily = daily
	data.Aggregates.ByModel = byModel
	data.Aggregates.ByProvider = byModel // same data, provider = model for hermes
	data.Aggregates.Messages.Total = totalMsgs
	data.Aggregates.Messages.ToolCalls = totalTools
	data.Aggregates.Tools.TotalCalls = totalTools
	data.Aggregates.Tools.Tools = []interface{}{}
	return data, nil
}

// relativeTime converts a unix timestamp to a relative time string.
func relativeTime(ts float64) string {
	if ts == 0 {
		return ""
	}
	t := time.Unix(int64(ts), 0)
	d := time.Since(t)
	switch {
	case d < time.Minute:
		return "just now"
	case d < time.Hour:
		m := int(d.Minutes())
		if m == 1 {
			return "1 min ago"
		}
		return fmt.Sprintf("%d min ago", m)
	case d < 24*time.Hour:
		h := int(d.Hours())
		if h == 1 {
			return "1 hour ago"
		}
		return fmt.Sprintf("%d hours ago", h)
	case d < 30*24*time.Hour:
		days := int(d.Hours() / 24)
		if days == 1 {
			return "1 day ago"
		}
		return fmt.Sprintf("%d days ago", days)
	default:
		return t.Format("2006-01-02")
	}
}

// escapeJSON escapes a string for safe embedding in a JSON string literal.
func escapeJSON(s string) string {
	b, _ := json.Marshal(s)
	// Remove surrounding quotes from json.Marshal output
	if len(b) >= 2 {
		return string(b[1 : len(b)-1])
	}
	return s
}
