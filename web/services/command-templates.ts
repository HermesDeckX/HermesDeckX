// SSH command templates REST API service layer
import { get, post, put, del } from './request';

export interface CommandTemplate {
  id: number;
  label: string;
  command: string;
  description: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CommandTemplatePayload {
  label: string;
  command: string;
  description?: string;
  sort_order?: number;
}

export type CommandTemplateImportStrategy = 'append' | 'skip_duplicates' | 'replace';

export interface CommandTemplateImportItem {
  label: string;
  command: string;
  description?: string;
  sort_order?: number;
}

export interface CommandTemplateImportResult {
  inserted: number;
  skipped: number;
  replaced: number;
  total: number;
}

export interface CommandTemplateBundle {
  version: number;
  type: 'hermesdeckx.command-templates';
  exported_at: string;
  app: string;
  templates: CommandTemplateImportItem[];
}

export const COMMAND_TEMPLATE_BUNDLE_TYPE = 'hermesdeckx.command-templates';
export const COMMAND_TEMPLATE_BUNDLE_VERSION = 1;

export const commandTemplatesApi = {
  list: () => get<CommandTemplate[]>('/api/v1/ssh/command-templates'),
  create: (payload: CommandTemplatePayload) =>
    post<CommandTemplate>('/api/v1/ssh/command-templates', payload),
  update: (id: number, payload: CommandTemplatePayload) =>
    put<CommandTemplate>(`/api/v1/ssh/command-templates?id=${id}`, payload),
  delete: (id: number) =>
    del<{ deleted: boolean }>(`/api/v1/ssh/command-templates?id=${id}`),
  reorder: (ids: number[]) =>
    post<{ ok: boolean }>('/api/v1/ssh/command-templates/reorder', { ids }),
  import: (items: CommandTemplateImportItem[], strategy: CommandTemplateImportStrategy) =>
    post<CommandTemplateImportResult>('/api/v1/ssh/command-templates/import', {
      items,
      strategy,
    }),
};

/** Build an exportable bundle from the current list (strips server-managed fields). */
export function buildCommandTemplateBundle(templates: CommandTemplate[]): CommandTemplateBundle {
  return {
    version: COMMAND_TEMPLATE_BUNDLE_VERSION,
    type: COMMAND_TEMPLATE_BUNDLE_TYPE,
    exported_at: new Date().toISOString(),
    app: 'HermesDeckX',
    templates: templates.map((t) => ({
      label: t.label,
      command: t.command,
      description: t.description || '',
      sort_order: t.sort_order ?? 0,
    })),
  };
}

/**
 * Parse and validate a pasted / uploaded bundle. Accepts either the full
 * bundle shape OR a bare array of templates for convenience. Throws Error
 * with a human-readable message when the input is not usable.
 */
export function parseCommandTemplateBundle(raw: string): CommandTemplateImportItem[] {
  const text = raw.trim();
  if (!text) throw new Error('Empty input');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e: any) {
    throw new Error(`Invalid JSON: ${e?.message || 'parse error'}`);
  }
  let items: unknown;
  if (Array.isArray(parsed)) {
    items = parsed;
  } else if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if (obj.type && obj.type !== COMMAND_TEMPLATE_BUNDLE_TYPE) {
      throw new Error(`Unsupported bundle type: ${String(obj.type)}`);
    }
    items = obj.templates;
  } else {
    throw new Error('Unsupported JSON shape');
  }
  if (!Array.isArray(items)) {
    throw new Error('Missing "templates" array');
  }
  const result: CommandTemplateImportItem[] = [];
  items.forEach((it, idx) => {
    if (!it || typeof it !== 'object') {
      throw new Error(`Item #${idx + 1} is not an object`);
    }
    const o = it as Record<string, unknown>;
    const label = typeof o.label === 'string' ? o.label.trim() : '';
    const command = typeof o.command === 'string' ? o.command.trim() : '';
    if (!label || !command) {
      throw new Error(`Item #${idx + 1} is missing label or command`);
    }
    result.push({
      label,
      command,
      description: typeof o.description === 'string' ? o.description : '',
      sort_order: typeof o.sort_order === 'number' ? o.sort_order : undefined,
    });
  });
  if (result.length === 0) {
    throw new Error('No valid templates found');
  }
  return result;
}
