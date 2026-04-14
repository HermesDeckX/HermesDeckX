import { getUnmappedKeys, isKeyCovered } from './sectionRegistry';

export type EditorSectionId =
  | 'models'
  | 'agents'
  | 'tools'
  | 'channels'
  | 'messages'
  | 'gateway'
  | 'cron'
  | 'extensions'
  | 'memory'
  | 'audio'
  | 'logging'
  | 'yaml'
  | 'templates'
  | 'unmapped'
  | 'secrets';

export interface FieldMetadata {
  path: string;
  label: string;
  description: string;
  type: string;
  section: EditorSectionId;
  group: string;
  tags: string[];
  sensitive: boolean;
  advanced: boolean;
  placeholder?: string;
  schema: any;
}

function resolveType(schema: any): string {
  if (!schema) return 'string';
  if (schema.enum) return 'enum';
  const t = schema.type;
  if (typeof t === 'string') return t;
  if (Array.isArray(t)) return t.find((v) => v !== 'null') || 'string';
  if (schema.properties) return 'object';
  if (schema.items) return 'array';
  return 'string';
}

function inferSection(path: string): EditorSectionId {
  const top = path.split('.')[0];
  if (path.startsWith('providers.') || path.startsWith('delegation.') || path.startsWith('auxiliary.') || path.startsWith('custom_providers.') || top === 'model' || top === 'fallback_model' || top === 'fallback_providers' || top === 'credential_pool_strategies') return 'models';
  if (path.startsWith('agent.') || top === 'personalities' || top === 'quick_commands' || top === 'prefill_messages_file' || top === 'system_prompt') return 'agents';
  if (path.startsWith('toolsets') || path.startsWith('terminal.') || path.startsWith('browser.') || path.startsWith('checkpoints.') || path.startsWith('security.') || path.startsWith('compression.') || path.startsWith('smart_model_routing.') || top === 'file_read_max_chars') return 'tools';
  if ([
    'telegram', 'discord', 'slack', 'whatsapp', 'signal', 'mattermost', 'matrix', 'dingtalk', 'feishu', 'wecom', 'wecom_callback', 'weixin', 'bluebubbles', 'sms', 'email', 'homeassistant', 'api_server', 'webhook'
  ].includes(top)) return 'channels';
  if (path.startsWith('display.')) return 'messages';
  if (path.startsWith('gateway.') || path.startsWith('approvals.') || path.startsWith('command_allowlist') || path.startsWith('privacy.') || path.startsWith('human_delay.') || top === 'timezone') return 'gateway';
  if (path.startsWith('cron.')) return 'cron';
  if (path.startsWith('skills.') || path.startsWith('honcho.')) return 'extensions';
  if (path.startsWith('memory.') || path.startsWith('context.')) return 'memory';
  if (path.startsWith('tts.') || path.startsWith('stt.') || path.startsWith('voice.')) return 'audio';
  if (path.startsWith('logging.') || path.startsWith('network.')) return 'logging';
  return isKeyCovered(path) ? 'agents' : 'unmapped';
}

function isSensitivePath(path: string, hint: any, schema: any): boolean {
  if (hint?.sensitive === true) return true;
  const p = path.toLowerCase();
  const label = String(hint?.label || '').toLowerCase();
  const desc = String(hint?.help || schema?.description || '').toLowerCase();
  return /(token|secret|password|api[_-]?key|access[_-]?key|private[_-]?key|client[_-]?secret|auth)/.test(p)
    || /(token|secret|password|key)/.test(label)
    || /(token|secret|password|api key|client secret)/.test(desc);
}

export function getNestedSchema(rootSchema: any, dottedPath: string): any {
  const schemaObj = rootSchema?.schema || rootSchema;
  const parts = dottedPath.split('.');
  let node = schemaObj;
  for (const p of parts) {
    node = node?.properties?.[p];
    if (!node) return null;
  }
  return node;
}

export function extractFieldMetadata(schemaInput: any): FieldMetadata[] {
  const schemaObj = schemaInput?.schema || schemaInput;
  const uiHints = schemaInput?.uiHints || {};
  if (!schemaObj?.properties) return [];

  const walk = (node: any, prefix = ''): FieldMetadata[] => {
    if (!node?.properties) return [];
    const entries: FieldMetadata[] = [];
    for (const [key, child] of Object.entries(node.properties)) {
      const path = prefix ? `${prefix}.${key}` : key;
      const schema = child as any;
      const hint = uiHints[path] || {};
      const type = resolveType(schema);
      if (type === 'object' && schema?.properties) {
        entries.push(...walk(schema, path));
        continue;
      }
      entries.push({
        path,
        label: hint.label || String(key),
        description: hint.help || schema?.description || '',
        type,
        section: inferSection(path),
        group: hint.group || path.split('.')[0],
        tags: Array.isArray(hint.tags) ? hint.tags : [],
        sensitive: isSensitivePath(path, hint, schema),
        advanced: hint.advanced === true,
        placeholder: hint.placeholder,
        schema,
      });
    }
    return entries;
  };

  return walk(schemaObj);
}

export function filterFieldMetadata(fields: FieldMetadata[], query: string): FieldMetadata[] {
  const q = query.trim().toLowerCase();
  if (!q) return fields;
  return fields.filter((field) => {
    return field.path.toLowerCase().includes(q)
      || field.label.toLowerCase().includes(q)
      || field.description.toLowerCase().includes(q)
      || field.group.toLowerCase().includes(q)
      || field.section.toLowerCase().includes(q)
      || field.tags.some((tag) => tag.toLowerCase().includes(q));
  });
}

export function getSecretFields(fields: FieldMetadata[]): FieldMetadata[] {
  return fields.filter((field) => field.sensitive);
}

export function getUnmappedFieldCount(fields: FieldMetadata[]): number {
  return getUnmappedKeys(fields.map((field) => field.path)).length;
}
