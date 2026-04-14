import React, { useMemo } from 'react';
import { SectionProps } from '../sectionTypes';
import { ConfigSection, TextField, NumberField, SelectField, SwitchField } from '../fields';
import { getTranslation } from '../../../locales';
import { schemaTooltip } from '../schemaTooltip';

// ============================================================================
// hermes-agent Memory Section
// ============================================================================
// hermes-agent config.yaml paths:
//   memory.memory_enabled       — enable persistent memory
//   memory.user_profile_enabled — enable user profile injection
//   memory.memory_char_limit    — max chars for memory in system prompt
//   memory.user_char_limit      — max chars for user profile
//   memory.provider             — external memory provider plugin name
//   context.engine              — context engine: "compressor" or plugin name

export const MemorySection: React.FC<SectionProps> = ({ config, schema, setField, getField, language }) => {
  const es = useMemo(() => (getTranslation(language) as any).es || {}, [language]);
  const tip = (key: string) => schemaTooltip(key, language, schema);

  return (
    <div className="space-y-4">
      <ConfigSection title={es.memoryConfig || 'Memory'} icon="neurology" iconColor="text-sky-500">
        <SwitchField
          label={es.memoryEnabled || 'Enable Memory'}
          desc={es.memoryEnabledDesc || 'Persistent curated memory injected into system prompt.'}
          tooltip={tip('memory.memory_enabled')}
          value={getField(['memory', 'memory_enabled']) !== false}
          onChange={v => setField(['memory', 'memory_enabled'], v)}
        />
        <SwitchField
          label={es.userProfileEnabled || 'User Profile'}
          desc={es.userProfileEnabledDesc || 'Enable user profile injection into system prompt.'}
          tooltip={tip('memory.user_profile_enabled')}
          value={getField(['memory', 'user_profile_enabled']) !== false}
          onChange={v => setField(['memory', 'user_profile_enabled'], v)}
        />
        <NumberField
          label={es.memoryCharLimit || 'Memory Char Limit'}
          desc={es.memoryCharLimitDesc || 'Max characters for memory in system prompt (~800 tokens at 2.75 chars/token).'}
          tooltip={tip('memory.memory_char_limit')}
          value={getField(['memory', 'memory_char_limit'])}
          onChange={v => setField(['memory', 'memory_char_limit'], v)}
          min={0}
        />
        <NumberField
          label={es.userCharLimit || 'User Profile Char Limit'}
          desc={es.userCharLimitDesc || 'Max characters for user profile (~500 tokens at 2.75 chars/token).'}
          tooltip={tip('memory.user_char_limit')}
          value={getField(['memory', 'user_char_limit'])}
          onChange={v => setField(['memory', 'user_char_limit'], v)}
          min={0}
        />
        <TextField
          label={es.memoryProvider || 'External Memory Provider'}
          desc={es.memoryProviderDesc || 'Plugin name for external memory (empty = built-in only). Options: openviking, mem0, hindsight, holographic, retaindb, byterover.'}
          tooltip={tip('memory.provider')}
          value={getField(['memory', 'provider']) || ''}
          onChange={v => setField(['memory', 'provider'], v)}
          placeholder=""
        />
      </ConfigSection>

      <ConfigSection title={es.contextEngine || 'Context Engine'} icon="compress" iconColor="text-purple-500" defaultOpen={false}>
        <TextField
          label={es.engine || 'Engine'}
          desc={es.engineDesc || 'Context management engine: "compressor" (built-in) or a plugin name (e.g. "lcm").'}
          tooltip={tip('context.engine')}
          value={getField(['context', 'engine']) || ''}
          onChange={v => setField(['context', 'engine'], v)}
          placeholder="compressor"
        />
      </ConfigSection>
    </div>
  );
};
