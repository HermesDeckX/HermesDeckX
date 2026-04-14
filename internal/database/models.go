package database

import (
	"time"
)

type User struct {
	ID             uint       `gorm:"primaryKey" json:"id"`
	Username       string     `gorm:"uniqueIndex;not null" json:"username"`
	PasswordHash   string     `gorm:"not null" json:"-"`
	Role           string     `gorm:"not null;default:admin" json:"role"`
	LockedUntil    *time.Time `json:"locked_until,omitempty"`
	FailedAttempts int        `gorm:"default:0" json:"-"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

type Activity struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	EventID     string    `gorm:"index" json:"event_id"`
	Timestamp   time.Time `gorm:"index" json:"timestamp"`
	Category    string    `gorm:"index" json:"category"`
	Risk        string    `gorm:"index" json:"risk"`
	Summary     string    `json:"summary"`
	Detail      string    `gorm:"type:text" json:"detail,omitempty"`
	Source      string    `json:"source"`
	ActionTaken string    `json:"action_taken"`
	SessionID   string    `json:"session_id"`
	CreatedAt   time.Time `json:"created_at"`
}

type Alert struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	AlertID   string    `gorm:"index" json:"alert_id"`
	Risk      string    `gorm:"index" json:"risk"`
	Message   string    `json:"message"`
	Detail    string    `gorm:"type:text" json:"detail,omitempty"`
	Notified  bool      `gorm:"default:false" json:"notified"`
	CreatedAt time.Time `gorm:"index" json:"created_at"`
}

type AuditLog struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"index" json:"user_id"`
	Username  string    `json:"username"`
	Action    string    `gorm:"index" json:"action"`
	Detail    string    `gorm:"type:text" json:"detail,omitempty"`
	Result    string    `json:"result"`
	IP        string    `json:"ip"`
	CreatedAt time.Time `gorm:"index" json:"created_at"`
}

type MonitorState struct {
	ID               uint       `gorm:"primaryKey" json:"id"`
	ConsecutiveBad   int        `gorm:"default:0" json:"consecutive_bad"`
	LastRestartAt    *time.Time `json:"last_restart_at,omitempty"`
	SnapshotTimeouts int        `gorm:"default:0" json:"snapshot_timeouts"`
	RestartCount     int        `gorm:"default:0" json:"restart_count"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

type SnapshotRecord struct {
	ID                  uint      `gorm:"primaryKey" json:"id"`
	SnapshotID          string    `gorm:"uniqueIndex;not null" json:"snapshot_id"`
	SnapshotVersion     int       `gorm:"not null;default:1" json:"snapshot_version"`
	Note                string    `json:"note"`
	Trigger             string    `gorm:"index" json:"trigger"`
	ResourceCount       int       `gorm:"not null" json:"resource_count"`
	ResourceTypesJSON   string    `gorm:"type:text" json:"resource_types"`
	ManifestSummaryJSON string    `gorm:"type:text" json:"manifest_summary"`
	SizeBytes           int64     `json:"size_bytes"`
	CipherAlg           string    `gorm:"not null" json:"cipher_alg"`
	KDFAlg              string    `gorm:"not null" json:"kdf_alg"`
	KDFParamsJSON       string    `gorm:"type:text;not null" json:"kdf_params"`
	SaltB64             string    `gorm:"type:text;not null" json:"salt_b64"`
	WrappedDEKB64       string    `gorm:"type:text;not null" json:"wrapped_dek_b64"`
	WrapNonceB64        string    `gorm:"type:text;not null" json:"wrap_nonce_b64"`
	DataNonceB64        string    `gorm:"type:text;not null" json:"data_nonce_b64"`
	Ciphertext          []byte    `gorm:"type:blob;not null" json:"-"`
	CreatedAt           time.Time `gorm:"index" json:"created_at"`
}

type Setting struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Key       string    `gorm:"uniqueIndex" json:"key"`
	Value     string    `gorm:"type:text" json:"value"`
	UpdatedAt time.Time `json:"updated_at"`
}

type CredentialScan struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	FilePath       string    `json:"file_path"`
	KeyType        string    `gorm:"index" json:"key_type"`
	PatternMatched string    `json:"pattern_matched"`
	Risk           string    `json:"risk"`
	Resolved       bool      `gorm:"default:false" json:"resolved"`
	FirstSeenAt    time.Time `json:"first_seen_at"`
	CreatedAt      time.Time `json:"created_at"`
}

type ConnectionLog struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	IPAddress string    `gorm:"index" json:"ip_address"`
	UserAgent string    `json:"user_agent"`
	Endpoint  string    `json:"endpoint"`
	Allowed   bool      `json:"allowed"`
	CreatedAt time.Time `gorm:"index" json:"created_at"`
}

type SkillHash struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	SkillName     string    `gorm:"index" json:"skill_name"`
	FilePath      string    `json:"file_path"`
	SHA256Hash    string    `json:"sha256_hash"`
	Tampered      bool      `gorm:"default:false" json:"tampered"`
	LastCheckedAt time.Time `json:"last_checked_at"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type SkillTranslation struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	SkillKey    string    `gorm:"uniqueIndex:idx_skill_lang;not null" json:"skill_key"`
	Lang        string    `gorm:"uniqueIndex:idx_skill_lang;not null;size:10" json:"lang"`
	SourceHash  string    `gorm:"not null" json:"source_hash"`
	Name        string    `json:"name"`
	Description string    `gorm:"type:text" json:"description"`
	Engine      string    `gorm:"size:10;default:''" json:"engine"` // "llm" or "free"
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// ReleaseNotesTranslation caches translated release notes by (product, version, lang).
type ReleaseNotesTranslation struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	Product    string    `gorm:"uniqueIndex:idx_rnt_prod_ver_lang;not null;size:32" json:"product"` // "hermesdeckx" or "hermes-agent"
	Version    string    `gorm:"uniqueIndex:idx_rnt_prod_ver_lang;not null;size:32" json:"version"`
	Lang       string    `gorm:"uniqueIndex:idx_rnt_prod_ver_lang;not null;size:10" json:"lang"`
	SourceHash string    `gorm:"not null" json:"source_hash"`
	Translated string    `gorm:"type:text;not null" json:"translated"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// GatewayLifecycle records gateway process lifecycle events (started, shutdown, crashed, unreachable, recovered).
type GatewayLifecycle struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Timestamp   time.Time `gorm:"index" json:"timestamp"`
	EventType   string    `gorm:"index;not null" json:"event_type"` // started, shutdown, crashed, unreachable, recovered
	GatewayHost string    `json:"gateway_host"`
	GatewayPort int       `json:"gateway_port"`
	ProfileName string    `json:"profile_name"`
	IsRemote    bool      `json:"is_remote"`
	Reason      string    `json:"reason"`
	ErrorDetail string    `gorm:"type:text" json:"error_detail,omitempty"`
	UptimeSec   int64     `json:"uptime_sec"` // how long the gateway was up before this event (for shutdown/crash/unreachable)
	CreatedAt   time.Time `json:"created_at"`
}

type Template struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	TemplateID string    `gorm:"uniqueIndex;not null" json:"template_id"`
	TargetFile string    `gorm:"index;not null" json:"target_file"`
	Icon       string    `json:"icon"`
	Category   string    `gorm:"index" json:"category"`
	Tags       string    `gorm:"type:text" json:"tags"`
	Author     string    `json:"author"`
	BuiltIn    bool      `gorm:"default:false;index" json:"built_in"`
	I18n       string    `gorm:"type:text;not null" json:"i18n"`
	Version    int       `gorm:"default:1" json:"version"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}
