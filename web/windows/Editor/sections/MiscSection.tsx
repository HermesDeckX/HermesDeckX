import React, { useMemo } from 'react';
import { SectionProps } from '../sectionTypes';
import { ConfigSection, TextField } from '../fields';
import { getTranslation } from '../../../locales';
import { schemaTooltip } from '../schemaTooltip';

// ============================================================================
// hermes-agent Misc Section — System Prompt + uncategorized config
// ============================================================================
// hermes-agent config.yaml paths:
//   system_prompt    — global system prompt override/append
//   timezone         — IANA timezone (already in GatewaySection too)
// Note: MCP Servers are managed via the dedicated MCP tab in Skills.

export const MiscSection: React.FC<SectionProps> = ({ config, schema, setField, getField, language }) => {
  const es = useMemo(() => (getTranslation(language) as any).es || {}, [language]);
  const tip = (key: string) => schemaTooltip(key, language, schema);

  return (
    <div className="space-y-4">
      {/* MCP Servers redirect */}
      <ConfigSection title={es.mcpServers || 'MCP Servers'} icon="hub" iconColor="text-indigo-500">
        <div className="rounded-lg border border-blue-200/60 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/5 px-3 py-2">
          <p className="text-[10px] text-blue-700 dark:text-blue-300/80">
            {es.mcpMovedHint || 'MCP Servers are now managed in the Skills → MCP tab with a visual editor, paste import, and connection testing.'}
          </p>
        </div>
      </ConfigSection>

      {/* System Prompt */}
      <ConfigSection title={es.systemPrompt || 'System Prompt'} icon="description" iconColor="text-slate-500" defaultOpen={false}>
        <TextField
          label={es.systemPromptOverride || 'System Prompt Override'}
          desc={es.systemPromptOverrideDesc || 'Global system prompt text appended to built-in prompt. Leave empty for default.'}
          tooltip={tip('system_prompt')}
          value={getField(['system_prompt']) || ''}
          onChange={v => setField(['system_prompt'], v)}
          multiline
          mono={false}
        />
      </ConfigSection>
    </div>
  );
};
