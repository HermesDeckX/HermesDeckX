import React, { useMemo } from 'react';
import { SectionProps } from '../sectionTypes';
import { ConfigSection, NumberField, SelectField, SwitchField } from '../fields';
import { getTranslation } from '../../../locales';
import { schemaTooltip } from '../schemaTooltip';

// ============================================================================
// hermes-agent Logging & Network Section
// ============================================================================
// hermes-agent config.yaml paths:
//   logging.level         — minimum level for agent.log: DEBUG, INFO, WARNING
//   logging.max_size_mb   — max size per log file before rotation
//   logging.backup_count  — number of rotated backup files to keep
//   network.force_ipv4    — force IPv4 for all outbound connections

export const LoggingSection: React.FC<SectionProps> = ({ config, schema, setField, getField, language }) => {
  const es = useMemo(() => (getTranslation(language) as any).es || {}, [language]);
  const tip = (key: string) => schemaTooltip(key, language, schema);

  const LOG_LEVEL_OPTIONS = useMemo(() => [
    { value: 'DEBUG', label: 'DEBUG' },
    { value: 'INFO', label: 'INFO' },
    { value: 'WARNING', label: 'WARNING' },
  ], []);

  return (
    <div className="space-y-4">
      <ConfigSection title={es.loggingConfig || 'Logging'} icon="description" iconColor="text-yellow-500">
        <SelectField
          label={es.logLevel || 'Log Level'}
          desc={es.logLevelDesc || 'Minimum level for agent.log. Logs are saved to ~/.hermes/logs/.'}
          tooltip={tip('logging.level')}
          value={getField(['logging', 'level']) || 'INFO'}
          onChange={v => setField(['logging', 'level'], v)}
          options={LOG_LEVEL_OPTIONS}
        />
        <NumberField
          label={es.maxSizeMb || 'Max Size (MB)'}
          desc={es.maxSizeMbDesc || 'Max size per log file before rotation.'}
          tooltip={tip('logging.max_size_mb')}
          value={getField(['logging', 'max_size_mb'])}
          onChange={v => setField(['logging', 'max_size_mb'], v)}
          min={1}
        />
        <NumberField
          label={es.backupCount || 'Backup Count'}
          desc={es.backupCountDesc || 'Number of rotated backup files to keep.'}
          tooltip={tip('logging.backup_count')}
          value={getField(['logging', 'backup_count'])}
          onChange={v => setField(['logging', 'backup_count'], v)}
          min={0}
        />
      </ConfigSection>

      {/* Network */}
      <ConfigSection title={es.networkConfig || 'Network'} icon="wifi" iconColor="text-green-500" defaultOpen={false}>
        <SwitchField
          label={es.forceIpv4 || 'Force IPv4'}
          desc={es.forceIpv4Desc || 'Force all outbound connections to use IPv4. Useful in environments with broken IPv6.'}
          tooltip={tip('network.force_ipv4')}
          value={getField(['network', 'force_ipv4']) === true}
          onChange={v => setField(['network', 'force_ipv4'], v)}
        />
      </ConfigSection>
    </div>
  );
};
