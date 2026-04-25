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

      <ConfigSection title={es.sessionAutoPrune || 'Auto-Prune'} icon="auto_delete" iconColor="text-amber-500" defaultOpen={false}>
        <SwitchField
          label={es.autoPrune || 'Enable Auto-Prune'}
          desc={es.autoPruneDesc || 'Automatically delete old sessions on startup to free disk space.'}
          tooltip={tip('sessions.auto_prune')}
          value={getField(['sessions', 'auto_prune']) === true}
          onChange={v => setField(['sessions', 'auto_prune'], v)}
        />
        <NumberField
          label={es.retentionDays || 'Retention Days'}
          desc={es.retentionDaysDesc || 'Sessions older than this many days are eligible for pruning.'}
          tooltip={tip('sessions.retention_days')}
          value={getField(['sessions', 'retention_days'])}
          onChange={v => setField(['sessions', 'retention_days'], v)}
          min={1}
        />
        <SwitchField
          label={es.vacuumAfterPrune || 'VACUUM After Prune'}
          desc={es.vacuumAfterPruneDesc || 'Run SQLite VACUUM after pruning to reclaim disk space.'}
          tooltip={tip('sessions.vacuum_after_prune')}
          value={getField(['sessions', 'vacuum_after_prune']) !== false}
          onChange={v => setField(['sessions', 'vacuum_after_prune'], v)}
        />
        <NumberField
          label={es.minIntervalHours || 'Min Interval (hours)'}
          desc={es.minIntervalHoursDesc || 'Minimum hours between auto-prune runs to avoid repeated cleanup.'}
          tooltip={tip('sessions.min_interval_hours')}
          value={getField(['sessions', 'min_interval_hours'])}
          onChange={v => setField(['sessions', 'min_interval_hours'], v)}
          min={1}
        />
      </ConfigSection>
    </div>
  );
};
