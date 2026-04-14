package snapshots

import "time"

const (
	SnapshotVersion1        = 1
	RestoreModeFile         = "file"
	RestoreModeJSON         = "json_fields"
	PreviewTokenTTL         = 5 * time.Minute
	DefaultSnapshotTag      = "manual"
	ScheduledSnapshotTag    = "scheduled"
	ScheduleStatusNever     = "never"
	ScheduleStatusSuccess   = "success"
	ScheduleStatusFailed    = "failed"
	ScheduleStatusSkipped   = "skipped"
	DefaultScheduleTimezone = "Local"

	BackupScopeHermesAgent  = "hermes-agent"
	BackupScopeHermesDeckX = "hermesdeckx"
	BackupScopeBoth      = "both"
)

type ResourceDefinition struct {
	ID          string
	Type        string
	DisplayName string
	LogicalPath string
	RestoreMode string
	Required    bool
	Scope       string // "hermes-agent" or "hermesdeckx"
	ResolvePath func() string
}

type ResourceContent struct {
	Definition ResourceDefinition
	Path       string
	Content    []byte
}

type ManifestResource struct {
	ID          string `json:"id"`
	Type        string `json:"type"`
	DisplayName string `json:"display_name"`
	LogicalPath string `json:"logical_path"`
	RestoreMode string `json:"restore_mode"`
	Size        int64  `json:"size"`
	SHA256      string `json:"sha256"`
}

type ConfigFieldEntry struct {
	Path string `json:"path"`
	Kind string `json:"kind"`
	Hash string `json:"hash"`
}

type SnapshotManifest struct {
	SnapshotVersion int                `json:"snapshot_version"`
	CreatedAt       time.Time          `json:"created_at"`
	AppVersion      string             `json:"app_version"`
	Resources       []ManifestResource `json:"resources"`
	ConfigFields    []ConfigFieldEntry `json:"config_fields,omitempty"`
}

type SnapshotSummary struct {
	ID            string    `json:"id"`
	Note          string    `json:"note"`
	Trigger       string    `json:"trigger"`
	CreatedAt     time.Time `json:"created_at"`
	ResourceCount int       `json:"resource_count"`
	SizeBytes     int64     `json:"size_bytes"`
	ResourceIDs   []string  `json:"resource_ids,omitempty"`
	ResourcePaths []string  `json:"resource_paths,omitempty"`
}

type UnlockPreviewResponse struct {
	PreviewToken string             `json:"preview_token"`
	Manifest     SnapshotManifest   `json:"manifest"`
	Resources    []ManifestResource `json:"resources"`
	ConfigFields []ConfigFieldEntry `json:"config_fields"`
}

type RestoreSelections struct {
	Files       []string `json:"files"`
	ConfigPaths []string `json:"config_paths"`
}

type RestorePlanResponse struct {
	WillModifyFiles       int      `json:"will_modify_files"`
	WillModifyConfigPaths int      `json:"will_modify_config_paths"`
	Warnings              []string `json:"warnings"`
}

type RestoreResponse struct {
	RestoredResources    []string `json:"restored_resources"`
	RestoredConfigPaths  []string `json:"restored_config_paths"`
	PreRestoreSnapshotID string   `json:"pre_restore_snapshot_id,omitempty"`
	NeedsGatewayRestart  bool     `json:"needs_gateway_restart"`
	GatewayRestarted     bool     `json:"gateway_restarted"`
	GatewayRestartError  string   `json:"gateway_restart_error,omitempty"`
}

// RestoreProgressEvent is sent via SSE during restore.
type RestoreProgressEvent struct {
	Phase   string `json:"phase"`   // "pre_backup", "file", "config", "done", "error"
	Current int    `json:"current"` // current step index (1-based)
	Total   int    `json:"total"`   // total steps
	File    string `json:"file"`    // current file being restored
	Error   string `json:"error,omitempty"`
}

// ProgressFn is called during restore to report progress.
type ProgressFn func(evt RestoreProgressEvent)

type ScheduleRunNowResponse struct {
	SnapshotID string `json:"snapshotId"`
}

type SnapshotScanSummary struct {
	TotalResources    int   `json:"totalResources"`
	ExistingResources int   `json:"existingResources"`
	MissingResources  int   `json:"missingResources"`
	TotalBytes        int64 `json:"totalBytes"`
}

type SnapshotScanResource struct {
	ID          string `json:"id"`
	Type        string `json:"type"`
	DisplayName string `json:"displayName"`
	LogicalPath string `json:"logicalPath"`
	Scope       string `json:"scope"`
	Required    bool   `json:"required"`
	Exists      bool   `json:"exists"`
	SizeBytes   int64  `json:"sizeBytes"`
}

type SnapshotScanGroup struct {
	ID        string                 `json:"id"`
	Title     string                 `json:"title"`
	Resources []SnapshotScanResource `json:"resources"`
}

type SnapshotScanResult struct {
	Scope   string              `json:"scope"`
	Summary SnapshotScanSummary `json:"summary"`
	Groups  []SnapshotScanGroup `json:"groups"`
}
