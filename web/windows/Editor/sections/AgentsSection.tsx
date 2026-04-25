import React, { useMemo } from 'react';
import { SectionProps } from '../sectionTypes';
import { ConfigSection, TextField, PasswordField, NumberField, SelectField, SwitchField, KeyValueField } from '../fields';
import { getTranslation } from '../../../locales';
import { schemaTooltip } from '../schemaTooltip';

// ============================================================================
// hermes-agent Agent & Delegation Section
// ============================================================================
// hermes-agent config.yaml paths:
//   agent.max_turns                — max API call iterations per conversation
//   agent.gateway_timeout          — inactivity timeout (seconds)
//   agent.gateway_timeout_warning  — warning threshold before full timeout
//   agent.restart_drain_timeout    — graceful drain on stop/restart
//   agent.service_tier             — API service tier
//   agent.tool_use_enforcement     — tool-use prompt injection mode
//   delegation.*                   — subagent model/provider overrides
//   personalities                  — custom personality definitions
//   prefill_messages_file          — ephemeral prefill messages path
//   quick_commands                 — user-defined quick commands

export const AgentsSection: React.FC<SectionProps> = ({ config, schema, setField, getField, language }) => {
  const es = useMemo(() => (getTranslation(language) as any).es || {}, [language]);
  const tip = (key: string) => schemaTooltip(key, language, schema);

  const toolEnforcementOptions = useMemo(() => [
    { value: 'auto', label: es.enfAuto || 'Auto (gpt/codex models)' },
    { value: 'true', label: es.enfTrue || 'Always On' },
    { value: 'false', label: es.enfFalse || 'Always Off' },
  ], [es]);

  const reasoningEffortOptions = useMemo(() => [
    { value: '', label: es.inherit || 'Inherit' },
    { value: 'xhigh', label: 'Extra High' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
    { value: 'minimal', label: 'Minimal' },
    { value: 'none', label: 'None' },
  ], [es]);

  return (
    <div className="space-y-4">
      {/* Agent Core Settings */}
      <ConfigSection title={es.agentCore || 'Agent Settings'} icon="smart_toy" iconColor="text-purple-500">
        <NumberField
          label={es.maxTurns || 'Max Turns'}
          desc={es.maxTurnsDesc || 'Maximum API call iterations per conversation.'}
          tooltip={tip('agent.max_turns')}
          value={getField(['agent', 'max_turns'])}
          onChange={v => setField(['agent', 'max_turns'], v)}
          min={1}
        />
        <NumberField
          label={es.gatewayTimeout || 'Gateway Timeout (s)'}
          desc={es.gatewayTimeoutDesc || 'Inactivity timeout for gateway agent execution. 0 = unlimited.'}
          tooltip={tip('agent.gateway_timeout')}
          value={getField(['agent', 'gateway_timeout'])}
          onChange={v => setField(['agent', 'gateway_timeout'], v)}
          min={0}
        />
        <NumberField
          label={es.gatewayTimeoutWarning || 'Timeout Warning (s)'}
          desc={es.gatewayTimeoutWarningDesc || 'Warning threshold before full timeout. 0 = disable.'}
          tooltip={tip('agent.gateway_timeout_warning')}
          value={getField(['agent', 'gateway_timeout_warning'])}
          onChange={v => setField(['agent', 'gateway_timeout_warning'], v)}
          min={0}
        />
        <NumberField
          label={es.restartDrainTimeout || 'Restart Drain Timeout (s)'}
          desc={es.restartDrainTimeoutDesc || 'Graceful drain on gateway stop/restart. 0 = interrupt immediately.'}
          tooltip={tip('agent.restart_drain_timeout')}
          value={getField(['agent', 'restart_drain_timeout'])}
          onChange={v => setField(['agent', 'restart_drain_timeout'], v)}
          min={0}
        />
        <TextField
          label={es.serviceTier || 'Service Tier'}
          desc={es.serviceTierDesc || 'API service tier (e.g. "default", "priority").'}
          tooltip={tip('agent.service_tier')}
          value={getField(['agent', 'service_tier']) || ''}
          onChange={v => setField(['agent', 'service_tier'], v)}
          placeholder=""
        />
        <SelectField
          label={es.toolUseEnforcement || 'Tool Use Enforcement'}
          desc={es.toolUseEnforcementDesc || 'Inject prompt guidance to make the model call tools instead of describing actions.'}
          tooltip={tip('agent.tool_use_enforcement')}
          value={String(getField(['agent', 'tool_use_enforcement']) ?? 'auto')}
          onChange={v => setField(['agent', 'tool_use_enforcement'], v === 'true' ? true : v === 'false' ? false : v)}
          options={toolEnforcementOptions}
        />
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

      {/* Delegation */}
      <ConfigSection title={es.delegation || 'Delegation (Subagents)'} icon="account_tree" iconColor="text-indigo-500">
        <TextField
          label={es.delegationModel || 'Subagent Model'}
          desc={es.delegationModelDesc || 'Model for subagents (empty = inherit parent model).'}
          tooltip={tip('delegation.model')}
          value={getField(['delegation', 'model']) || ''}
          onChange={v => setField(['delegation', 'model'], v)}
          placeholder="google/gemini-3-flash-preview"
        />
        <TextField
          label={es.delegationProvider || 'Subagent Provider'}
          desc={es.delegationProviderDesc || 'Provider for subagents (empty = inherit parent).'}
          tooltip={tip('delegation.provider')}
          value={getField(['delegation', 'provider']) || ''}
          onChange={v => setField(['delegation', 'provider'], v)}
          placeholder="openrouter"
        />
        <TextField
          label={es.delegationBaseUrl || 'Base URL'}
          desc={es.delegationBaseUrlDesc || 'Direct OpenAI-compatible endpoint for subagents.'}
          tooltip={tip('delegation.base_url')}
          value={getField(['delegation', 'base_url']) || ''}
          onChange={v => setField(['delegation', 'base_url'], v)}
          placeholder="https://api.example.com/v1"
        />
        <PasswordField
          label={es.delegationApiKey || 'API Key'}
          desc={es.delegationApiKeyDesc || 'API key for delegation base URL (falls back to OPENAI_API_KEY).'}
          tooltip={tip('delegation.api_key')}
          value={getField(['delegation', 'api_key']) || ''}
          onChange={v => setField(['delegation', 'api_key'], v)}
        />
        <NumberField
          label={es.delegationMaxIterations || 'Max Iterations'}
          desc={es.delegationMaxIterationsDesc || 'Per-subagent iteration cap (independent of parent).'}
          tooltip={tip('delegation.max_iterations')}
          value={getField(['delegation', 'max_iterations'])}
          onChange={v => setField(['delegation', 'max_iterations'], v)}
          min={1}
        />
        <SelectField
          label={es.delegationReasoning || 'Reasoning Effort'}
          desc={es.delegationReasoningDesc || 'Reasoning effort for subagents (empty = inherit parent).'}
          tooltip={tip('delegation.reasoning_effort')}
          value={getField(['delegation', 'reasoning_effort']) || ''}
          onChange={v => setField(['delegation', 'reasoning_effort'], v)}
          options={reasoningEffortOptions}
        />
        <NumberField
          label={es.delegationMaxSpawnDepth || 'Max Spawn Depth'}
          desc={es.delegationMaxSpawnDepthDesc || 'How many levels deep subagents can spawn (0 = no nesting).'}
          tooltip={tip('delegation.max_spawn_depth')}
          value={getField(['delegation', 'max_spawn_depth'])}
          onChange={v => setField(['delegation', 'max_spawn_depth'], v)}
          min={0}
        />
        <SwitchField
          label={es.delegationOrchestrator || 'Orchestrator Mode'}
          desc={es.delegationOrchestratorDesc || 'Allow subagents to act as orchestrators and spawn their own children.'}
          tooltip={tip('delegation.orchestrator_enabled')}
          value={getField(['delegation', 'orchestrator_enabled']) === true}
          onChange={v => setField(['delegation', 'orchestrator_enabled'], v)}
        />
        <NumberField
          label={es.delegationMaxConcurrent || 'Max Concurrent Children'}
          desc={es.delegationMaxConcurrentDesc || 'Maximum number of concurrent subagent tasks.'}
          tooltip={tip('delegation.max_concurrent_children')}
          value={getField(['delegation', 'max_concurrent_children'])}
          onChange={v => setField(['delegation', 'max_concurrent_children'], v)}
          min={1}
        />
        <NumberField
          label={es.delegationChildTimeout || 'Child Timeout (s)'}
          desc={es.delegationChildTimeoutDesc || 'Timeout for each subagent task in seconds (0 = no limit).'}
          tooltip={tip('delegation.child_timeout_seconds')}
          value={getField(['delegation', 'child_timeout_seconds'])}
          onChange={v => setField(['delegation', 'child_timeout_seconds'], v)}
          min={0}
        />
        <SwitchField
          label={es.delegationInheritMcp || 'Inherit MCP Toolsets'}
          desc={es.delegationInheritMcpDesc || 'Subagents inherit MCP server connections from the parent agent.'}
          tooltip={tip('delegation.inherit_mcp_toolsets')}
          value={getField(['delegation', 'inherit_mcp_toolsets']) !== false}
          onChange={v => setField(['delegation', 'inherit_mcp_toolsets'], v)}
        />
      </ConfigSection>

      {/* Personalities */}
      <ConfigSection title={es.personalities || 'Personalities'} icon="mood" iconColor="text-pink-500" defaultOpen={false}>
        <KeyValueField
          label={es.personalitiesMap || 'Custom Personalities'}
          desc={es.personalitiesMapDesc || 'Name → system prompt mapping. Use string format for simple prompts.'}
          tooltip={tip('personalities')}
          value={getField(['personalities']) || {}}
          onChange={v => setField(['personalities'], v)}
          keyPlaceholder="personality-name"
          valuePlaceholder="System prompt text..."
        />
      </ConfigSection>

      {/* Quick Commands */}
      <ConfigSection title={es.quickCommands || 'Quick Commands'} icon="bolt" iconColor="text-amber-500" defaultOpen={false}>
        <KeyValueField
          label={es.quickCommandsMap || 'Quick Commands'}
          desc={es.quickCommandsMapDesc || 'User-defined slash commands that bypass the agent loop (type: exec only).'}
          tooltip={tip('quick_commands')}
          value={getField(['quick_commands']) || {}}
          onChange={v => setField(['quick_commands'], v)}
          keyPlaceholder="/mycommand"
          valuePlaceholder="shell command"
        />
      </ConfigSection>

      {/* Prefill Messages */}
      <ConfigSection title={es.prefillMessages || 'Prefill Messages'} icon="note_add" iconColor="text-slate-500" defaultOpen={false}>
        <TextField
          label={es.prefillMessagesFile || 'Prefill Messages File'}
          desc={es.prefillMessagesFileDesc || 'Path to JSON file with [{role, content}] messages injected at start of every API call.'}
          tooltip={tip('prefill_messages_file')}
          value={getField(['prefill_messages_file']) || ''}
          onChange={v => setField(['prefill_messages_file'], v)}
          placeholder=""
        />
      </ConfigSection>
    </div>
  );
};
