import React, { useMemo } from 'react';
import { SectionProps } from '../sectionTypes';
import { ConfigSection } from '../fields';
import { getTranslation } from '../../../locales';

// hermes-agent does not have an OpenClaw-style plugins system.
// Skills are the equivalent — see ExtensionsSection.
// This stub is kept for index.tsx compatibility.

export const PluginsSection: React.FC<SectionProps> = ({ language }) => {
  const es = useMemo(() => (getTranslation(language) as any).es || {}, [language]);
  return (
    <div className="space-y-4">
      <ConfigSection title={es.plugins || 'Plugins'} icon="power" iconColor="text-rose-500">
        <div className="rounded-lg border border-slate-200/60 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] px-3 py-2">
          <p className="text-[10px] theme-text-muted">
            {es.pluginsHint || 'hermes-agent uses Skills instead of plugins. Configure skills in the Extensions section, or manage them via `hermes skills`.'}
          </p>
        </div>
      </ConfigSection>
    </div>
  );
};
