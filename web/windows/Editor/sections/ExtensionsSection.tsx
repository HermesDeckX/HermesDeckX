import React, { useMemo } from 'react';
import { SectionProps } from '../sectionTypes';
import { ConfigSection, TextField, SwitchField, ArrayField, KeyValueField } from '../fields';
import { getTranslation } from '../../../locales';
import { schemaTooltip } from '../schemaTooltip';

// ============================================================================
// hermes-agent Skills & Honcho Section
// ============================================================================
// hermes-agent config.yaml paths:
//   skills.external_dirs   — additional skill directories
//   honcho                 — Honcho AI-native memory overrides

export const ExtensionsSection: React.FC<SectionProps> = ({ schema, setField, getField, language }) => {
  const es = useMemo(() => (getTranslation(language) as any).es || {}, [language]);
  const tip = (key: string) => schemaTooltip(key, language, schema);

  return (
    <div className="space-y-4">
      <ConfigSection title={es.skillsConfig || 'Skills'} icon="extension" iconColor="text-violet-500">
        <ArrayField
          label={es.externalDirs || 'External Skill Directories'}
          desc={es.externalDirsDesc || 'Additional directories to scan for skills. Supports ~ and ${VAR} expansion. Read-only — skill creation always goes to ~/.hermes/skills/.'}
          tooltip={tip('skills.external_dirs')}
          value={getField(['skills', 'external_dirs']) || []}
          onChange={v => setField(['skills', 'external_dirs'], v)}
          placeholder="~/.agents/skills"
        />
      </ConfigSection>

      <ConfigSection title={es.honcho || 'Honcho (AI Memory)'} icon="psychology" iconColor="text-pink-500" defaultOpen={false}>
        <div className="rounded-lg border border-slate-200/60 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] px-3 py-2 mb-2">
          <p className="text-[10px] theme-text-muted">
            {es.honchoDesc || 'Honcho reads ~/.honcho/config.json as single source of truth. This section is only for hermes-specific overrides.'}
          </p>
        </div>
        <KeyValueField
          label={es.honchoOverrides || 'Honcho Overrides'}
          desc={es.honchoOverridesDesc || 'Key-value overrides for Honcho config.'}
          tooltip={tip('honcho')}
          value={getField(['honcho']) || {}}
          onChange={v => setField(['honcho'], v)}
        />
      </ConfigSection>
    </div>
  );
};
