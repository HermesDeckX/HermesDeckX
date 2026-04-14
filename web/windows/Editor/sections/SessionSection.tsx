import React, { useMemo } from 'react';
import { SectionProps } from '../sectionTypes';
import { ConfigSection, TextField, NumberField, SwitchField, SelectField } from '../fields';
import { getTranslation } from '../../../locales';
import { schemaTooltip } from '../schemaTooltip';

// ============================================================================
// hermes-agent Session Section
// ============================================================================
// hermes-agent gateway session config paths (in gateway/config.py):
//   gateway.session_reset.*    — already in GatewaySection
// This section covers session-adjacent config.yaml paths:
//   save_trajectories          — save conversation trajectories to disk

export const SessionSection: React.FC<SectionProps> = ({ config, schema, setField, getField, language }) => {
  const es = useMemo(() => (getTranslation(language) as any).es || {}, [language]);
  const tip = (key: string) => schemaTooltip(key, language, schema);

  return (
    <div className="space-y-4">
      <ConfigSection title={es.sessionConfig || 'Session'} icon="history" iconColor="text-teal-500">
        <div className="rounded-lg border border-slate-200/60 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] px-3 py-2 mb-2">
          <p className="text-[10px] theme-text-muted">
            {es.sessionHint || 'Session reset policies and streaming settings are configured in the Gateway section. This section covers additional session-related settings.'}
          </p>
        </div>
        <SwitchField
          label={es.saveTrajectories || 'Save Trajectories'}
          desc={es.saveTrajectoriesDesc || 'Save full conversation trajectories to disk for replay/analysis.'}
          tooltip={tip('save_trajectories')}
          value={getField(['save_trajectories']) === true}
          onChange={v => setField(['save_trajectories'], v)}
        />
      </ConfigSection>
    </div>
  );
};
