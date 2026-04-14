import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Language } from '../../types';
import { gwApi } from '../../services/api';
import SchemaField from '../../components/SchemaField';
import type { UiHints } from '../../components/SchemaField';
import { isKeyCovered } from './sectionRegistry';

/**
 * SchemaRemainder — Renders config fields from the live JSON Schema that are NOT
 * already handled by hand-coded Section fields.
 *
 * Usage in any Section:
 *   <SchemaRemainder
 *     sectionPath="agents.defaults"
 *     handledKeys={['maxConcurrent', 'thinkingDefault', 'workspace', ...]}
 *     config={config}
 *     setField={setField}
 *     language={language}
 *     schema={schema}
 *   />
 *
 * The component will:
 * 1. Resolve the schema subtree at `sectionPath`
 * 2. Exclude keys listed in `handledKeys` (relative to sectionPath)
 * 3. Exclude keys already marked as covered in sectionRegistry (deep paths)
 * 4. Auto-render remaining fields using SchemaField
 */

interface SchemaRemainderProps {
  sectionPath: string;
  handledKeys: string[];
  config: Record<string, any>;
  setField: (path: string[], value: any) => void;
  language: Language;
  schema?: Record<string, any> | null;
  defaultOpen?: boolean;
  title?: string;
}

function getNestedValue(obj: any, path: string[]): any {
  let curr = obj;
  for (const p of path) {
    if (curr == null || typeof curr !== 'object') return undefined;
    curr = curr[p];
  }
  return curr;
}

function getNestedSchema(rootSchema: any, dottedPath: string): any {
  const parts = dottedPath.split('.');
  let node = rootSchema;
  for (const p of parts) {
    node = node?.properties?.[p];
    if (!node) return null;
  }
  return node;
}

/**
 * Recursively collect leaf keys from a schema node.
 * Returns keys relative to the given node (not full dotted paths).
 */
function collectLeafKeys(schema: any, prefix = ''): string[] {
  if (!schema?.properties) return prefix ? [prefix] : [];
  const keys: string[] = [];
  for (const [key, sub] of Object.entries(schema.properties)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const subSchema = sub as any;
    if (subSchema.properties) {
      keys.push(...collectLeafKeys(subSchema, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

const SchemaRemainder: React.FC<SchemaRemainderProps> = ({
  sectionPath, handledKeys, config, setField, language, schema,
  defaultOpen = false, title,
}) => {
  const [liveSchema, setLiveSchema] = useState<any>(null);
  const [collapsed, setCollapsed] = useState(!defaultOpen);

  // Use prop schema if available, otherwise fetch live
  useEffect(() => {
    if (schema) {
      setLiveSchema(schema);
    } else {
      gwApi.configSchema().then((res: any) => {
        setLiveSchema(res?.schema || res);
      }).catch(() => {});
    }
  }, [schema]);

  const schemaRoot = liveSchema?.schema || liveSchema;
  const hints: UiHints = liveSchema?.uiHints || {};

  const remainderFields = useMemo(() => {
    if (!schemaRoot?.properties) return [];
    const sectionSchema = getNestedSchema(schemaRoot, sectionPath);
    if (!sectionSchema?.properties) return [];

    // Build set of handled keys (support both leaf keys and nested dotted keys)
    const handledSet = new Set<string>();
    for (const k of handledKeys) {
      handledSet.add(k);
      // Also add all leaf descendants of group keys
      const subSchema = getNestedSchema(sectionSchema, k);
      if (subSchema?.properties) {
        for (const leaf of collectLeafKeys(subSchema)) {
          handledSet.add(`${k}.${leaf}`);
        }
      }
    }

    // Collect all top-level property keys of the section
    const topKeys = Object.keys(sectionSchema.properties);

    // Filter: keep keys NOT in handledSet
    const remainder: Array<{ key: string; schema: any }> = [];
    for (const key of topKeys) {
      if (handledSet.has(key)) continue;

      // Check if this entire subtree's leaves are all handled
      const subSchema = sectionSchema.properties[key] as any;
      if (subSchema?.properties) {
        const leaves = collectLeafKeys(subSchema);
        const allHandled = leaves.every(l => handledSet.has(`${key}.${l}`));
        if (allHandled) continue;
      }

      // Check if already covered by sectionRegistry (globally)
      const fullPath = `${sectionPath}.${key}`;
      // We still show it since our Section is the owner — sectionRegistry wildcards
      // claim the whole subtree, but SchemaRemainder fills in the gaps

      remainder.push({ key, schema: subSchema });
    }

    return remainder;
  }, [schemaRoot, sectionPath, handledKeys]);

  const sectionPathArr = useMemo(() => sectionPath.split('.'), [sectionPath]);
  const sectionValue = useMemo(() => getNestedValue(config, sectionPathArr), [config, sectionPathArr]);

  const handleChange = useCallback((pathArr: string[], value: any) => {
    setField(pathArr, value);
  }, [setField]);

  if (remainderFields.length === 0) return null;

  return (
    <div className="rounded-xl border border-dashed border-slate-200/60 dark:border-white/[0.06] overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50/50 dark:bg-white/[0.015] hover:bg-slate-100/50 dark:hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[14px] text-amber-500">auto_awesome</span>
          <span className="text-[11px] font-bold text-slate-600 dark:text-white/60">
            {title || 'Additional Fields'}
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
            {remainderFields.length}
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono">
            schema-driven
          </span>
        </div>
        <span className="material-symbols-outlined text-[16px] text-slate-400">
          {collapsed ? 'expand_more' : 'expand_less'}
        </span>
      </button>
      {!collapsed && (
        <div className="px-4 py-3 space-y-1 border-t border-slate-100 dark:border-white/5">
          {remainderFields.map(({ key, schema: fieldSchema }) => {
            const fullPath = `${sectionPath}.${key}`;
            const val = sectionValue?.[key];
            return (
              <SchemaField
                key={fullPath}
                path={fullPath}
                schema={fieldSchema}
                uiHints={hints}
                value={val}
                onChange={handleChange}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SchemaRemainder;
