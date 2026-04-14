import React, { useMemo, useState } from 'react';
import { SectionProps } from '../sectionTypes';
import { getTranslation } from '../../../locales';
import { ConfigSection, PasswordField } from '../fields';
import { FieldMetadata, getSecretFields } from '../fieldMetadata';

interface SecretsSectionProps extends SectionProps {
  fields: FieldMetadata[];
  onOpenYaml?: () => void;
}

function getNestedValue(obj: any, path: string[]): any {
  let current = obj;
  for (const key of path) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[key];
  }
  return current;
}

export const SecretsSection: React.FC<SecretsSectionProps> = ({
  config,
  setField,
  language,
  fields,
  onOpenYaml,
}) => {
  const t = useMemo(() => getTranslation(language), [language]);
  const ed = (t as any).cfgEditor || {};
  const secrets = useMemo(() => getSecretFields(fields), [fields]);
  const [query, setQuery] = useState('');

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = !q
      ? secrets
      : secrets.filter((field) =>
          field.path.toLowerCase().includes(q)
          || field.label.toLowerCase().includes(q)
          || field.description.toLowerCase().includes(q)
          || field.section.toLowerCase().includes(q)
        );
    const map = new Map<string, FieldMetadata[]>();
    for (const field of filtered) {
      const key = field.section;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(field);
    }
    return Array.from(map.entries());
  }, [query, secrets]);

  if (secrets.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-5 text-[11px] text-slate-400 dark:text-white/35">
        {ed.secretEmpty || 'No sensitive fields detected from the current schema.'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-white/5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[12px] font-bold text-slate-700 dark:text-white/70">{ed.secretTitle || 'Secrets & Credentials'}</h3>
            <p className="text-[10px] text-slate-400 dark:text-white/35 mt-0.5">{ed.secretHint || 'Sensitive config fields are collected here for safer review and editing.'}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onOpenYaml && (
              <button
                onClick={onOpenYaml}
                className="h-8 px-3 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold hover:bg-emerald-500/20 transition-colors"
              >
                {ed.secretOpenYaml || 'Open YAML / .env'}
              </button>
            )}
          </div>
        </div>
        <div className="p-4 border-b border-slate-100 dark:border-white/5">
          <div className="relative">
            <span className="material-symbols-outlined absolute start-2 top-1/2 -translate-y-1/2 text-[14px] text-slate-400">search</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={ed.searchSecretPlaceholder || 'Search secret fields'}
              className="w-full h-9 ps-8 pe-3 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-[11px] text-slate-700 dark:text-white/70 outline-none focus:border-primary"
            />
          </div>
        </div>
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar neon-scrollbar">
          {grouped.map(([section, sectionFields]) => (
            <ConfigSection
              key={section}
              title={`${section} (${sectionFields.length})`}
              icon="key"
              iconColor="text-amber-500"
              defaultOpen={section === 'models' || section === 'channels'}
            >
              <div className="space-y-1.5">
                {sectionFields.map((field) => {
                  const value = getNestedValue(config, field.path.split('.'));
                  return (
                    <PasswordField
                      key={field.path}
                      label={field.label}
                      desc={field.description || field.path}
                      tooltip={field.path}
                      value={value == null ? '' : String(value)}
                      onChange={(next) => setField(field.path.split('.'), next)}
                      placeholder={field.placeholder || field.path}
                    />
                  );
                })}
              </div>
            </ConfigSection>
          ))}
        </div>
      </div>
    </div>
  );
};
