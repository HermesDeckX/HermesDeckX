import React, { useMemo } from 'react';
import { SectionProps } from '../sectionTypes';
import { ConfigSection, TextField, PasswordField, NumberField, SelectField, SwitchField, ArrayField } from '../fields';
import { getTranslation } from '../../../locales';
import { schemaTooltip } from '../schemaTooltip';

// ============================================================================
// hermes-agent Gateway & API Server Section
// ============================================================================
// hermes-agent config.yaml paths used here:
//   agent.gateway_timeout          — inactivity timeout for gateway agent execution (seconds)
//   agent.gateway_timeout_warning  — warning threshold before full timeout
//   agent.restart_drain_timeout    — graceful drain on stop/restart
//   agent.max_turns                — max iterations per conversation
//   agent.service_tier             — API service tier
//   approvals.mode                 — approval mode for dangerous commands
//   approvals.timeout              — approval timeout (seconds)
//   command_allowlist              — permanently allowed dangerous commands
//   privacy.redact_pii             — hash user IDs / strip phone numbers
//   discord.*                      — Discord platform settings
//   whatsapp.*                     — WhatsApp platform settings
//   gateway.*                      — gateway-level overrides (session reset, streaming, etc.)
//
// .env vars (displayed as guidance, not editable here):
//   API_SERVER_ENABLED, API_SERVER_KEY, API_SERVER_PORT, API_SERVER_HOST, API_SERVER_MODEL_NAME
//   GATEWAY_ALLOW_ALL_USERS

const GatewaySection: React.FC<SectionProps> = ({ config, schema, setField, getField, language }) => {
  const es = useMemo(() => (getTranslation(language) as any).es || {}, [language]);
  const tip = (key: string) => schemaTooltip(key, language, schema);

  const approvalModeOptions = useMemo(() => [
    { value: 'manual', label: es.approvalManual || 'Manual' },
    { value: 'smart', label: es.approvalSmart || 'Smart (LLM auto-approve)' },
    { value: 'off', label: es.approvalOff || 'Off (--yolo)' },
  ], [es]);

  const sessionResetModeOptions = useMemo(() => [
    { value: 'both', label: es.resetBoth || 'Both (daily + idle)' },
    { value: 'daily', label: es.resetDaily || 'Daily' },
    { value: 'idle', label: es.resetIdle || 'Idle timeout' },
    { value: 'none', label: es.resetNone || 'None' },
  ], [es]);

  const streamingTransportOptions = useMemo(() => [
    { value: 'edit', label: es.streamEdit || 'Edit (progressive updates)' },
    { value: 'off', label: es.streamOff || 'Off' },
  ], [es]);

  return (
    <div className="space-y-4">
      {/* Agent Gateway Settings */}
      <ConfigSection title={es.agentGatewaySettings || 'Agent Gateway Settings'} icon="settings" iconColor="text-teal-500">
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
          desc={es.gatewayTimeoutWarningDesc || 'Warning threshold before full timeout. 0 = disable warning.'}
          tooltip={tip('agent.gateway_timeout_warning')}
          value={getField(['agent', 'gateway_timeout_warning'])}
          onChange={v => setField(['agent', 'gateway_timeout_warning'], v)}
          min={0}
        />
        <NumberField
          label={es.restartDrainTimeout || 'Restart Drain Timeout (s)'}
          desc={es.restartDrainTimeoutDesc || 'Graceful drain timeout for gateway stop/restart. 0 = interrupt immediately.'}
          tooltip={tip('agent.restart_drain_timeout')}
          value={getField(['agent', 'restart_drain_timeout'])}
          onChange={v => setField(['agent', 'restart_drain_timeout'], v)}
          min={0}
        />
        <NumberField
          label={es.maxTurns || 'Max Turns'}
          desc={es.maxTurnsDesc || 'Maximum API call iterations per conversation.'}
          tooltip={tip('agent.max_turns')}
          value={getField(['agent', 'max_turns'])}
          onChange={v => setField(['agent', 'max_turns'], v)}
          min={1}
        />
        <NumberField
          label={es.gatewayNotifyInterval || 'Notify Interval (s)'}
          desc={es.gatewayNotifyIntervalDesc || 'Send "still working" status every N seconds during long tasks. 0 = disable.'}
          tooltip={tip('agent.gateway_notify_interval')}
          value={getField(['agent', 'gateway_notify_interval'])}
          onChange={v => setField(['agent', 'gateway_notify_interval'], v)}
          min={0}
        />
        <TextField
          label={es.serviceTier || 'Service Tier'}
          desc={es.serviceTierDesc || 'API service tier (e.g. "default", "priority"). Leave empty for default.'}
          tooltip={tip('agent.service_tier')}
          value={getField(['agent', 'service_tier']) || ''}
          onChange={v => setField(['agent', 'service_tier'], v)}
          placeholder=""
        />
      </ConfigSection>

      {/* API Server */}
      <ConfigSection title={es.apiServer || 'API Server'} icon="api" iconColor="text-blue-500" defaultOpen={false}>
        <div className="rounded-lg border border-blue-200/60 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/5 px-3 py-2 mb-2">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-[16px] text-blue-500 mt-0.5 shrink-0">info</span>
            <p className="text-[10px] text-blue-700 dark:text-blue-300/80">
              {es.apiServerEnvHint || 'API Server settings are configured via environment variables in ~/.hermes/.env. Edit them there or use `hermes setup`.'}
            </p>
          </div>
        </div>
        <div className="space-y-1.5 text-[10px] font-mono theme-text-muted">
          <div><span className="font-bold">API_SERVER_ENABLED</span> — {es.apiServerEnabledDesc || 'Enable/disable the OpenAI-compatible API server'}</div>
          <div><span className="font-bold">API_SERVER_PORT</span> — {es.apiServerPortDesc || 'Port (default: 8642)'}</div>
          <div><span className="font-bold">API_SERVER_HOST</span> — {es.apiServerHostDesc || 'Bind address (default: 127.0.0.1)'}</div>
          <div><span className="font-bold">API_SERVER_KEY</span> — {es.apiServerKeyDesc || 'Bearer token for auth (required for non-loopback)'}</div>
          <div><span className="font-bold">API_SERVER_MODEL_NAME</span> — {es.apiServerModelNameDesc || 'Model name advertised on /v1/models'}</div>
          <div><span className="font-bold">GATEWAY_ALLOW_ALL_USERS</span> — {es.gatewayAllowAllDesc || 'Allow all users to interact with bots'}</div>
        </div>
      </ConfigSection>

      {/* Approvals */}
      <ConfigSection title={es.approvals || 'Command Approvals'} icon="gavel" iconColor="text-orange-500">
        <SelectField
          label={es.approvalMode || 'Approval Mode'}
          desc={es.approvalModeDesc || 'How dangerous commands are handled: manual prompt, smart auto-approve, or skip all.'}
          tooltip={tip('approvals.mode')}
          value={getField(['approvals', 'mode']) || 'manual'}
          onChange={v => setField(['approvals', 'mode'], v)}
          options={approvalModeOptions}
        />
        <NumberField
          label={es.approvalTimeout || 'Approval Timeout (s)'}
          desc={es.approvalTimeoutDesc || 'Seconds to wait for user approval before timing out.'}
          tooltip={tip('approvals.timeout')}
          value={getField(['approvals', 'timeout'])}
          onChange={v => setField(['approvals', 'timeout'], v)}
          min={0}
        />
        <ArrayField
          label={es.commandAllowlist || 'Command Allowlist'}
          desc={es.commandAllowlistDesc || 'Permanently allowed dangerous command patterns (added via "always" approval).'}
          tooltip={tip('command_allowlist')}
          value={getField(['command_allowlist']) || []}
          onChange={v => setField(['command_allowlist'], v)}
          placeholder="npm install *"
        />
      </ConfigSection>

      {/* Session Reset Policy */}
      <ConfigSection title={es.sessionReset || 'Session Reset Policy'} icon="restart_alt" iconColor="text-purple-500" defaultOpen={false}>
        <SelectField
          label={es.resetMode || 'Reset Mode'}
          desc={es.resetModeDesc || 'When sessions auto-reset: daily, after idle timeout, both, or never.'}
          tooltip={tip('gateway.session_reset.mode')}
          value={getField(['gateway', 'session_reset', 'mode']) || 'both'}
          onChange={v => setField(['gateway', 'session_reset', 'mode'], v)}
          options={sessionResetModeOptions}
        />
        <NumberField
          label={es.resetAtHour || 'Daily Reset Hour'}
          desc={es.resetAtHourDesc || 'Hour for daily reset (0-23, local time).'}
          tooltip={tip('gateway.session_reset.at_hour')}
          value={getField(['gateway', 'session_reset', 'at_hour'])}
          onChange={v => setField(['gateway', 'session_reset', 'at_hour'], v)}
          min={0} max={23}
        />
        <NumberField
          label={es.idleMinutes || 'Idle Minutes'}
          desc={es.idleMinutesDesc || 'Minutes of inactivity before session reset.'}
          tooltip={tip('gateway.session_reset.idle_minutes')}
          value={getField(['gateway', 'session_reset', 'idle_minutes'])}
          onChange={v => setField(['gateway', 'session_reset', 'idle_minutes'], v)}
          min={0}
        />
        <SwitchField
          label={es.resetNotify || 'Notify on Reset'}
          desc={es.resetNotifyDesc || 'Send notification when session auto-resets.'}
          tooltip={tip('gateway.session_reset.notify')}
          value={getField(['gateway', 'session_reset', 'notify']) !== false}
          onChange={v => setField(['gateway', 'session_reset', 'notify'], v)}
        />
        <SwitchField
          label={es.saveTrajectories || 'Save Trajectories'}
          desc={es.saveTrajectoriesDesc || 'Save full conversation trajectories to disk for replay/analysis.'}
          tooltip={tip('save_trajectories')}
          value={getField(['save_trajectories']) === true}
          onChange={v => setField(['save_trajectories'], v)}
        />
      </ConfigSection>

      {/* Streaming */}
      <ConfigSection title={es.streaming || 'Streaming'} icon="stream" iconColor="text-cyan-500" defaultOpen={false}>
        <SwitchField
          label={es.streamingEnabled || 'Enable Streaming'}
          desc={es.streamingEnabledDesc || 'Stream tokens to messaging platforms in real-time.'}
          tooltip={tip('gateway.streaming.enabled')}
          value={getField(['gateway', 'streaming', 'enabled']) === true}
          onChange={v => setField(['gateway', 'streaming', 'enabled'], v)}
        />
        <SelectField
          label={es.streamTransport || 'Transport'}
          desc={es.streamTransportDesc || 'How tokens are delivered to the client.'}
          tooltip={tip('gateway.streaming.transport')}
          value={getField(['gateway', 'streaming', 'transport']) || 'edit'}
          onChange={v => setField(['gateway', 'streaming', 'transport'], v)}
          options={streamingTransportOptions}
        />
        <NumberField
          label={es.editInterval || 'Edit Interval (s)'}
          desc={es.editIntervalDesc || 'Seconds between message edits during streaming.'}
          tooltip={tip('gateway.streaming.edit_interval')}
          value={getField(['gateway', 'streaming', 'edit_interval'])}
          onChange={v => setField(['gateway', 'streaming', 'edit_interval'], v)}
          min={0} step={0.1}
        />
        <NumberField
          label={es.bufferThreshold || 'Buffer Threshold'}
          desc={es.bufferThresholdDesc || 'Characters accumulated before forcing an edit.'}
          tooltip={tip('gateway.streaming.buffer_threshold')}
          value={getField(['gateway', 'streaming', 'buffer_threshold'])}
          onChange={v => setField(['gateway', 'streaming', 'buffer_threshold'], v)}
          min={1}
        />
        <TextField
          label={es.streamCursor || 'Cursor'}
          desc={es.streamCursorDesc || 'Cursor character shown during streaming.'}
          tooltip={tip('gateway.streaming.cursor')}
          value={getField(['gateway', 'streaming', 'cursor']) || ''}
          onChange={v => setField(['gateway', 'streaming', 'cursor'], v)}
          placeholder=" ▉"
        />
      </ConfigSection>

      {/* Discord Settings */}
      <ConfigSection title={es.discordSettings || 'Discord Settings'} icon="forum" iconColor="text-indigo-500" defaultOpen={false}>
        <SwitchField
          label={es.requireMention || 'Require @mention'}
          desc={es.requireMentionDesc || 'Require @mention to respond in server channels.'}
          tooltip={tip('discord.require_mention')}
          value={getField(['discord', 'require_mention']) !== false}
          onChange={v => setField(['discord', 'require_mention'], v)}
        />
        <TextField
          label={es.freeResponseChannels || 'Free Response Channels'}
          desc={es.freeResponseChannelsDesc || 'Comma-separated channel IDs where bot responds without mention.'}
          tooltip={tip('discord.free_response_channels')}
          value={getField(['discord', 'free_response_channels']) || ''}
          onChange={v => setField(['discord', 'free_response_channels'], v)}
          placeholder=""
        />
        <TextField
          label={es.allowedChannels || 'Allowed Channels'}
          desc={es.allowedChannelsDesc || 'If set, bot ONLY responds in these channel IDs (whitelist).'}
          tooltip={tip('discord.allowed_channels')}
          value={getField(['discord', 'allowed_channels']) || ''}
          onChange={v => setField(['discord', 'allowed_channels'], v)}
          placeholder=""
        />
        <SwitchField
          label={es.autoThread || 'Auto Thread'}
          desc={es.autoThreadDesc || 'Auto-create threads on @mention in channels.'}
          tooltip={tip('discord.auto_thread')}
          value={getField(['discord', 'auto_thread']) !== false}
          onChange={v => setField(['discord', 'auto_thread'], v)}
        />
        <SwitchField
          label={es.reactions || 'Reactions'}
          desc={es.reactionsDesc || 'Add processing reactions to messages.'}
          tooltip={tip('discord.reactions')}
          value={getField(['discord', 'reactions']) !== false}
          onChange={v => setField(['discord', 'reactions'], v)}
        />
      </ConfigSection>

      {/* Privacy */}
      <ConfigSection title={es.privacy || 'Privacy'} icon="shield" iconColor="text-green-500" defaultOpen={false}>
        <SwitchField
          label={es.redactPii || 'Redact PII'}
          desc={es.redactPiiDesc || 'Hash user IDs and strip phone numbers from LLM context.'}
          tooltip={tip('privacy.redact_pii')}
          value={getField(['privacy', 'redact_pii']) === true}
          onChange={v => setField(['privacy', 'redact_pii'], v)}
        />
      </ConfigSection>

      {/* Human Delay */}
      <ConfigSection title={es.humanDelay || 'Human Delay'} icon="timer" iconColor="text-slate-500" defaultOpen={false}>
        <SelectField
          label={es.humanDelayMode || 'Mode'}
          desc={es.humanDelayModeDesc || 'Simulate human typing speed for outgoing messages.'}
          tooltip={tip('human_delay.mode')}
          value={getField(['human_delay', 'mode']) || 'off'}
          onChange={v => setField(['human_delay', 'mode'], v)}
          options={[
            { value: 'off', label: es.humanDelayOff || 'Off' },
            { value: 'on', label: es.humanDelayOn || 'On' },
          ]}
        />
        <NumberField
          label={es.humanDelayMin || 'Min Delay (ms)'}
          tooltip={tip('human_delay.min_ms')}
          value={getField(['human_delay', 'min_ms'])}
          onChange={v => setField(['human_delay', 'min_ms'], v)}
          min={0} step={100}
        />
        <NumberField
          label={es.humanDelayMax || 'Max Delay (ms)'}
          tooltip={tip('human_delay.max_ms')}
          value={getField(['human_delay', 'max_ms'])}
          onChange={v => setField(['human_delay', 'max_ms'], v)}
          min={0} step={100}
        />
      </ConfigSection>

      {/* Timezone */}
      <ConfigSection title={es.timezone || 'Timezone'} icon="schedule" iconColor="text-amber-500" defaultOpen={false}>
        <TextField
          label={es.timezone || 'Timezone'}
          desc={es.timezoneDesc || 'IANA timezone (e.g. "Asia/Kolkata"). Empty = server local time.'}
          tooltip={tip('timezone')}
          value={getField(['timezone']) || ''}
          onChange={v => setField(['timezone'], v)}
          placeholder="America/New_York"
        />
      </ConfigSection>
    </div>
  );
};
export { GatewaySection };
