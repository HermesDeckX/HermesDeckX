import React, { useMemo } from 'react';
import { SectionProps } from '../sectionTypes';
import { ConfigSection } from '../fields';
import { getTranslation } from '../../../locales';

// hermes-agent does not have a commands.* config section like OpenClaw.
// Slash commands are built-in; user-defined quick commands are in AgentsSection.

export const CommandsSection: React.FC<SectionProps> = ({ language }) => {
  const es = useMemo(() => (getTranslation(language) as any).es || {}, [language]);
  return (
    <div className="space-y-4">
      <ConfigSection title={es.commands || 'Commands'} icon="terminal" iconColor="text-amber-500">
        <div className="rounded-lg border border-slate-200/60 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] px-3 py-2">
          <p className="text-[10px] theme-text-muted">
            {es.commandsHint || 'Slash commands are built-in to hermes-agent. User-defined quick commands can be configured in the Agent section.'}
          </p>
        </div>
      </ConfigSection>
    </div>
  );
};
