// Package hermesmigrate implements one-click migration of OpenClaw
// configuration into Hermes Agent (config.yaml + .env), supporting both
// local filesystem scans and remote Gateway JSON-RPC fetches.
//
// The migration never modifies the upstream OpenClaw source tree and
// relies only on OpenClaw's public Gateway protocol (config.get and
// secrets.resolve). Sensitive values require a scope upgrade from
// operator.read to operator.admin, which the OpenClaw Gateway enforces
// via non-silent device pairing approval.
package hermesmigrate

import "time"

// Source identifies where the OpenClaw config came from.
type Source string

const (
	SourceLocal  Source = "local"
	SourceRemote Source = "remote"
)

// FieldStatus is the classification of each mapped field in the preview.
type FieldStatus string

const (
	StatusMapped       FieldStatus = "mapped"        // directly migratable, non-sensitive
	StatusNeedsSecret  FieldStatus = "needs-secret"  // requires operator.admin + secrets.resolve
	StatusConflict     FieldStatus = "conflict"      // hermes already has this key
	StatusUnmapped     FieldStatus = "unmapped"      // no mapping rule (ignored unless archived)
	StatusArchive      FieldStatus = "archive"       // written to migration-archive/ only
	StatusUnsupported  FieldStatus = "unsupported"   // feature not supported in hermes
)

// ConflictStrategy controls what happens when a target key already exists.
type ConflictStrategy string

const (
	ConflictSkip      ConflictStrategy = "skip"      // default — keep existing hermes value
	ConflictOverwrite ConflictStrategy = "overwrite" // replace with openclaw value
	ConflictRename    ConflictStrategy = "rename"    // write to <key>_from_openclaw
)

// TargetKind indicates where the field is written on the hermes side.
type TargetKind string

const (
	TargetYAML TargetKind = "yaml" // ~/.hermes/config.yaml
	TargetEnv  TargetKind = "env"  // ~/.hermes/.env
)

// FieldMapping describes one source→target translation rule.
type FieldMapping struct {
	SourcePath  string      // dotted path in openclaw.json (e.g. "agents.defaults.model")
	TargetKey   string      // dotted path for YAML, or VAR_NAME for env
	TargetKind  TargetKind
	Label       string      // i18n-friendly short label
	Sensitive   bool        // if true, raw value must come from secrets.resolve
	SecretEnvFallback string // for sensitive YAML fields, optional .env key to read instead
}

// PreviewField is a fully-resolved preview row shown in the UI wizard.
type PreviewField struct {
	SourcePath  string      `json:"sourcePath"`
	TargetKey   string      `json:"targetKey"`
	TargetKind  TargetKind  `json:"targetKind"`
	Label       string      `json:"label"`
	Status      FieldStatus `json:"status"`
	Sensitive   bool        `json:"sensitive"`
	Display     string      `json:"display"`           // user-facing rendered value ("<redacted>", excerpt, etc.)
	ExistingHermes string   `json:"existingHermes,omitempty"` // value currently in hermes (for conflict rows)
	SecretTargetID string   `json:"secretTargetId,omitempty"` // OpenClaw secrets.resolve targetId
	Notes       string      `json:"notes,omitempty"`
}

// PreviewGroup buckets fields by section for the UI.
type PreviewGroup struct {
	Key    string         `json:"key"`    // e.g. "channels.telegram"
	Label  string         `json:"label"`  // e.g. "Telegram 频道"
	Fields []PreviewField `json:"fields"`
}

// Preview is the dry-run report returned to the UI wizard.
type Preview struct {
	Source         Source         `json:"source"`
	OpenClawPath   string         `json:"openclawPath,omitempty"` // local path only
	Groups         []PreviewGroup `json:"groups"`
	TotalMapped    int            `json:"totalMapped"`
	TotalSecrets   int            `json:"totalSecrets"`
	TotalConflicts int            `json:"totalConflicts"`
	TotalArchive   int            `json:"totalArchive"`
	GeneratedAt    time.Time      `json:"generatedAt"`
}

// ExecuteRequest is posted from the UI wizard at Step 5.
type ExecuteRequest struct {
	SelectedSourcePaths []string         `json:"selectedSourcePaths"` // empty = all mapped
	ConflictStrategy    ConflictStrategy `json:"conflictStrategy"`    // default: skip
	MigrateSecrets      bool             `json:"migrateSecrets"`      // requires operator.admin
	ArchiveUnmapped     bool             `json:"archiveUnmapped"`     // default: true
}

// ExecuteReport is the result surfaced in Step 6.
type ExecuteReport struct {
	WrittenKeys      []string     `json:"writtenKeys"`
	SkippedKeys      []string     `json:"skippedKeys"`
	ConflictedKeys   []ConflictRow `json:"conflictedKeys"`
	ArchivedKeys     []string     `json:"archivedKeys"`
	Warnings         []string     `json:"warnings"`
	ConfigBackupPath string       `json:"configBackupPath,omitempty"`
	EnvBackupPath    string       `json:"envBackupPath,omitempty"`
	ArchivePath      string       `json:"archivePath,omitempty"`
	DurationMs       int64        `json:"durationMs"`
}

// ConflictRow describes a target key that already exists in hermes.
type ConflictRow struct {
	Key         string `json:"key"`
	TargetKind  TargetKind `json:"targetKind"`
	HermesValue string `json:"hermesValue"`
	OpenClawValue string `json:"openClawValue"`
	Resolution  string `json:"resolution"` // "skip" | "overwrite" | "renamed:<newkey>"
}

// OpenClawSnapshot is the raw config map fetched either from disk
// (local) or from config.get (remote, redacted).
type OpenClawSnapshot struct {
	Config map[string]interface{} `json:"config"`
	Env    map[string]string      `json:"env,omitempty"` // .env parsed (local only)
}
