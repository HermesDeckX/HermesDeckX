import React, { useMemo } from 'react';
import { SectionProps } from '../sectionTypes';
import { ConfigSection } from '../fields';
import { getTranslation } from '../../../locales';

// hermes-agent does not have a hooks system equivalent to OpenClaw.
// This section is kept as a minimal stub for index.tsx compatibility.

export const HooksSection: React.FC<SectionProps> = ({ language }) => {
  const es = useMemo(() => (getTranslation(language) as any).es || {}, [language]);
  return (
    <div className="space-y-4">
      <ConfigSection title={es.hooks || 'Hooks'} icon="webhook" iconColor="text-pink-500">
        <div className="rounded-lg border border-slate-200/60 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] px-3 py-2">
          <p className="text-[10px] theme-text-muted">
            {es.hooksNotAvailable || 'Hooks are not available in hermes-agent. Use cron jobs or quick commands for automation.'}
          </p>
        </div>
      </ConfigSection>
    </div>
  );
};
