import { Language } from '../../types';
import { getTooltip } from '../../locales/tooltips';

/**
 * Resolve a schema node by dotted config path.
 * e.g. "agents.defaults.maxConcurrent" → walk schema.properties.agents.properties.defaults.properties.maxConcurrent
 */
function resolveSchemaNode(schema: Record<string, any> | null | undefined, dottedPath: string): Record<string, any> | null {
  if (!schema) return null;
  const root = schema.schema || schema;
  const parts = dottedPath.split('.');
  let node = root;
  for (const p of parts) {
    node = node?.properties?.[p];
    if (!node) return null;
  }
  return node;
}

/**
 * Build a range/enum suffix string from a schema node.
 * Examples:
 *   { minimum: 1, maximum: 64 }          → " [1–64]"
 *   { minimum: 0 }                        → " [≥0]"
 *   { maximum: 100 }                      → " [≤100]"
 *   { enum: ["off","on","ask"] }           → " (off | on | ask)"
 *   { type: "boolean" }                    → "" (no suffix needed)
 */
function schemaConstraintSuffix(node: Record<string, any>): string {
  const parts: string[] = [];

  // enum values
  if (Array.isArray(node.enum) && node.enum.length > 0 && node.enum.length <= 12) {
    parts.push(`(${node.enum.join(' | ')})`);
  }

  // numeric range
  const min = node.minimum;
  const max = node.maximum;
  if (min != null && max != null) {
    parts.push(`[${min}–${max}]`);
  } else if (min != null) {
    parts.push(`[≥${min}]`);
  } else if (max != null) {
    parts.push(`[≤${max}]`);
  }

  // default value
  if (node.default !== undefined && node.default !== null && node.default !== '') {
    const def = typeof node.default === 'object' ? JSON.stringify(node.default) : String(node.default);
    if (def.length <= 30) {
      parts.push(`Default: ${def}`);
    }
  }

  return parts.length > 0 ? '\n' + parts.join('  ') : '';
}

/**
 * Schema-aware tooltip resolver.
 *
 * Priority:
 * 1. Hand-written locale tooltip (from tooltips.json)
 * 2. Schema description fallback (from Hermes Agent config schema)
 * 3. Schema title fallback (from Hermes Agent config schema)
 *
 * In all cases, range/enum info from schema is appended.
 */
export function schemaTooltip(
  key: string,
  language: Language,
  schema?: Record<string, any> | null,
): string {
  const handWritten = getTooltip(key, language);
  const node = resolveSchemaNode(schema, key);
  const suffix = node ? schemaConstraintSuffix(node) : '';

  if (handWritten) {
    return handWritten + suffix;
  }

  // Fallback to schema description
  if (node?.description) {
    return node.description + suffix;
  }

  // Fallback to schema title
  if (node?.title) {
    return node.title + suffix;
  }

  return '';
}

/**
 * Schema-aware label resolver for auto-generated fields.
 *
 * Priority:
 * 1. Schema title (human-readable label from Hermes Agent schema)
 * 2. Humanized key name (camelCase → "Camel Case")
 */
export function schemaLabel(
  key: string,
  schema?: Record<string, any> | null,
): string {
  const node = resolveSchemaNode(schema, key);
  if (node?.title) return node.title;
  // Humanize the last segment: "maxConcurrent" → "Max Concurrent"
  const leaf = key.split('.').pop() || key;
  return leaf
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/^./, s => s.toUpperCase());
}
