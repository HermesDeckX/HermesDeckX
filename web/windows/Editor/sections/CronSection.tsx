import React, { useMemo } from 'react';
import { SectionProps } from '../sectionTypes';
import { ConfigSection, SwitchField, TextField } from '../fields';
import { getTranslation } from '../../../locales';
import { schemaTooltip } from '../schemaTooltip';

// ============================================================================
// hermes-agent Cron Section
// ============================================================================
// hermes-agent config.yaml paths:
//   cron.wrap_response — wrap delivered cron responses with header/footer

export const CronSection: React.FC<SectionProps> = ({ config, schema, setField, getField, deleteField, language }) => {
  const es = useMemo(() => (getTranslation(language) as any).es || {}, [language]);
  const tip = (key: string) => schemaTooltip(key, language, schema);
  const cronConfig = (config?.cron && typeof config.cron === 'object') ? config.cron : {};
  const hasSchedulerKeys = ['enabled', 'store', 'maxConcurrentRuns', 'wakeMode'].some((key) => cronConfig[key] !== undefined);

  return (
    <div className="space-y-4">
      <ConfigSection
        title={es.cronJobs || 'Cron'}
        icon="schedule"
        iconColor="text-lime-500"
        desc={es.cronSectionDesc || 'Hermes cron jobs are created and managed in the Scheduler window. This section configures cron delivery behavior and any optional runtime overrides exposed by your current Hermes config.'}
      >
        <div className="mb-2 rounded-lg border border-slate-200/60 dark:border-white/[0.06] bg-slate-50/80 dark:bg-white/[0.02] px-3 py-2 text-[11px] text-slate-500 dark:text-white/45">
          {es.cronSectionNote || 'Hermes does not use this switch area as the place to create, enable, or pause individual jobs. Use the Scheduler window for job lifecycle operations.'}
        </div>

        <SwitchField
          label={es.wrapResponse || 'Wrap Delivered Response'}
          desc={es.wrapResponseDesc || 'Wrap delivered cron responses with a header (task name) and footer. Turn this off for clean raw output.'}
          tooltip={tip('cron.wrap_response')}
          value={getField(['cron', 'wrap_response']) !== false}
          onChange={v => setField(['cron', 'wrap_response'], v)}
        />

        {hasSchedulerKeys && (
          <>
            <SwitchField
              label={es.enabled || 'Scheduler Enabled'}
              desc={es.cronEnabledDesc || 'Optional Hermes runtime override. If your Hermes build exposes cron.enabled, this controls whether the scheduler loop is allowed to run.'}
              tooltip={tip('cron.enabled')}
              value={getField(['cron', 'enabled']) !== false}
              onChange={v => setField(['cron', 'enabled'], v)}
            />

            <TextField
              label={es.store || 'Cron Store'}
              desc={es.cronStoreDesc || 'Optional cron storage path override. Leave empty to use Hermes defaults.'}
              tooltip={tip('cron.store')}
              value={String(getField(['cron', 'store']) || '')}
              onChange={v => {
                if (v.trim()) setField(['cron', 'store'], v);
                else deleteField(['cron', 'store']);
              }}
              placeholder="~/.hermes/cron"
            />

            <TextField
              label={es.maxConcurrent || 'Max Concurrent Runs'}
              desc={es.cronMaxConcurrentDesc || 'Optional limit for simultaneous cron executions. Leave empty to keep Hermes defaults.'}
              tooltip={tip('cron.maxConcurrentRuns')}
              value={String(getField(['cron', 'maxConcurrentRuns']) ?? '')}
              onChange={v => {
                const trimmed = v.trim();
                if (!trimmed) {
                  deleteField(['cron', 'maxConcurrentRuns']);
                  return;
                }
                const parsed = Number.parseInt(trimmed, 10);
                if (Number.isFinite(parsed)) setField(['cron', 'maxConcurrentRuns'], parsed);
              }}
              placeholder="1"
            />

            <TextField
              label={es.wakeMode || 'Wake Mode'}
              desc={es.cronWakeModeDesc || 'Optional wake strategy override, for example now or next-heartbeat.'}
              tooltip={tip('cron.wakeMode')}
              value={String(getField(['cron', 'wakeMode']) || '')}
              onChange={v => {
                if (v.trim()) setField(['cron', 'wakeMode'], v.trim());
                else deleteField(['cron', 'wakeMode']);
              }}
              placeholder="now"
            />
          </>
        )}
      </ConfigSection>
    </div>
  );
};
