/**
 * sectionRegistry.ts — Central registry of config keys covered by hand-coded Editor sections.
 *
 * Each entry maps a top-level config key (e.g. "gateway") to the set of dotted sub-paths
 * that the hand-coded UI explicitly handles. When a key is listed here, the
 * UnmappedConfigSection will skip it and let the hand-coded Section render it instead.
 *
 * Use `'*'` as a wildcard to indicate "the entire subtree is covered" (e.g. for sections
 * that handle dynamic/array content like channels, skills, plugins).
 *
 * To mark a new key as covered after adding it to a hand-coded Section:
 *   1. Add it to the appropriate array below
 *   2. That's it — UnmappedConfigSection will stop showing it
 */

// ── hermes-agent config.yaml paths covered by hand-coded UI sections ──

// ModelsSection — model, providers, fallback, delegation, auxiliary, credential_pool, bedrock
const MODELS_KEYS = [
  'model', 'model.*',
  'providers.*',
  'fallback_model', 'fallback_providers', 'fallback_providers.*',
  'credential_pool_strategies', 'credential_pool_strategies.*',
  'delegation.*',
  'auxiliary.*',
  'custom_providers', 'custom_providers.*',
  'bedrock.*',
];

// AgentsSection — agent core, personalities, quick_commands, prefill
const AGENTS_KEYS = [
  'agent.*',
  'personalities', 'personalities.*',
  'quick_commands', 'quick_commands.*',
  'prefill_messages_file',
  'system_prompt',
];

// GatewaySection — agent gateway settings, approvals, session reset, streaming, discord, whatsapp, privacy, human_delay, timezone
const GATEWAY_KEYS = [
  'approvals.*',
  'command_allowlist', 'command_allowlist.*',
  'gateway.*',
  'discord.*',
  'whatsapp.*',
  'privacy.*',
  'human_delay.*',
  'timezone',
];

// ChannelsSection — channels are managed via wizard, not config.yaml sections directly
// but global channel behavior settings are under gateway.*
const CHANNELS_KEYS: string[] = [];

// MessagesSection — display.*
const MESSAGES_KEYS = [
  'display.*',
];

// ToolsSection — toolsets, terminal, browser, checkpoints, file_read, security, compression, smart_model_routing
const TOOLS_KEYS = [
  'toolsets', 'toolsets.*',
  'terminal.*',
  'browser.*',
  'checkpoints.*',
  'file_read_max_chars',
  'security.*',
  'compression.*',
  'smart_model_routing.*',
];

// AudioSection — tts, stt, voice
const AUDIO_KEYS = [
  'tts.*',
  'stt.*',
  'voice.*',
];

// MemorySection — memory, context
const MEMORY_KEYS = [
  'memory.*',
  'context.*',
];

// SessionSection — save_trajectories
const SESSION_KEYS = [
  'save_trajectories',
];

// LoggingSection — logging, network
const LOGGING_KEYS = [
  'logging.*',
  'network.*',
];

// ExtensionsSection — skills.external_dirs, honcho
const EXTENSIONS_KEYS = [
  'skills.*',
  'honcho.*',
];

// CronSection — cron
const CRON_KEYS = ['cron.*'];

// HooksSection — stub (hermes-agent has no hooks config section)
const HOOKS_KEYS: string[] = [];

// AuthSection — no config.yaml auth section; managed via .env
const AUTH_KEYS: string[] = [];

// Internal/meta keys — suppress from unmapped
const META_KEYS = [
  '_config_version',
  'mcp_servers', 'mcp_servers.*',
];

/** All explicitly registered keys across hand-coded sections */
const ALL_REGISTERED: string[] = [
  ...MODELS_KEYS, ...AGENTS_KEYS, ...GATEWAY_KEYS, ...CHANNELS_KEYS,
  ...MESSAGES_KEYS, ...TOOLS_KEYS, ...AUDIO_KEYS, ...MEMORY_KEYS,
  ...SESSION_KEYS, ...LOGGING_KEYS, ...EXTENSIONS_KEYS, ...CRON_KEYS,
  ...HOOKS_KEYS, ...AUTH_KEYS, ...META_KEYS,
];

/** Exact keys (no wildcard) */
const exactKeys = new Set(ALL_REGISTERED.filter(k => !k.endsWith('.*')));

/** Wildcard prefixes (e.g. "models" from "models.*") */
const wildcardPrefixes = ALL_REGISTERED
  .filter(k => k.endsWith('.*'))
  .map(k => k.slice(0, -2)); // strip ".*"

/**
 * Check whether a dotted config path is covered by hand-coded sections.
 * Returns true if the key (or its parent subtree) is registered.
 */
export function isKeyCovered(dottedPath: string): boolean {
  if (exactKeys.has(dottedPath)) return true;
  for (const prefix of wildcardPrefixes) {
    if (dottedPath === prefix || dottedPath.startsWith(prefix + '.')) return true;
  }
  return false;
}

/**
 * Given a flat list of all config keys from schema, return those NOT covered.
 */
export function getUnmappedKeys(allSchemaKeys: string[]): string[] {
  return allSchemaKeys.filter(k => !isKeyCovered(k));
}

/**
 * Extract all leaf-level dotted paths from a JSON Schema's properties tree.
 * Example: { gateway: { properties: { port: { type: 'number' } } } }
 *  → ['gateway.port']
 */
export function extractSchemaKeys(schema: any, prefix = ''): string[] {
  if (!schema || typeof schema !== 'object') return [];
  const props = schema.properties;
  if (!props) return prefix ? [prefix] : [];

  const keys: string[] = [];
  for (const [key, sub] of Object.entries(props)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const subSchema = sub as any;
    if (subSchema.properties) {
      keys.push(...extractSchemaKeys(subSchema, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

/** Version key for schema diff tracking in localStorage */
export const SCHEMA_KEYS_STORAGE_KEY = 'editor.knownSchemaKeys';
