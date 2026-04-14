package version

// Version is the application version. Injected at build time via ldflags:
//
//	go build -ldflags "-X HermesDeckX/internal/version.Version=0.0.3 -X HermesDeckX/internal/version.Build=42"
//
// Source of truth: web/package.json -> "version" field.
var Version = "0.0.1"

// Build is the build number, injected at compile time.
var Build = "dev"

// HermesAgentCompat is the minimum compatible hermes-agent version.
// Source of truth: web/package.json -> "hermesAgentCompat" field.
var HermesAgentCompat = ">=0.8.0"
