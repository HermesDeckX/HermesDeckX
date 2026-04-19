import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SectionProps } from '../sectionTypes';
import { ConfigSection, TextField, NumberField, SelectField, SwitchField, KeyValueField } from '../fields';
import { getTranslation } from '../../../locales';
import { schemaTooltip } from '../schemaTooltip';
import { get as apiGet, put as apiPut } from '../../../services/request';
import { useToast } from '../../../components/Toast';

interface SkinInfo { name: string; description: string; source: 'builtin' | 'user'; }
interface SkinsResponse { active: string; skins: SkinInfo[]; }

// Dropdown-backed skin picker. Falls back to a raw text input when the
// /api/v1/skins endpoint isn't reachable (older backend).
const SkinPicker: React.FC<{ value: string; onChange: (v: string) => void; es: Record<string, any> }> = ({ value, onChange, es }) => {
  const { toast } = useToast();
  const [data, setData] = useState<SkinsResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(() => {
    apiGet<SkinsResponse>('/api/v1/skins')
      .then(r => { setData(r); setLoadFailed(false); })
      .catch(() => setLoadFailed(true));
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleChange = useCallback((name: string) => {
    if (!data || name === value) return;
    // Write immediately through the dedicated endpoint so the CLI config
    // and this form stay in lock-step.
    setBusy(true);
    apiPut<SkinsResponse>('/api/v1/skins/active', { name })
      .then((r) => {
        setData(r);
        onChange(name);
        toast('success', ((es.skinSwitched as string) || 'CLI skin set to "{name}". Restart hermes CLI to apply.').replace('{name}', name));
      })
      .catch((e: any) => toast('error', e?.message || (es.skinSwitchFailed as string) || 'Failed to set skin'))
      .finally(() => setBusy(false));
  }, [data, value, onChange, toast, es]);

  if (loadFailed) {
    // Endpoint missing — degrade to the classic text field so the user can
    // still type a skin name and have it written through the normal save flow.
    return (
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="default"
        className="w-full px-2 py-1.5 rounded-lg text-[11px] bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-primary"
      />
    );
  }

  const current = data?.active || value || 'default';
  const active = data?.skins.find(s => s.name === current);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={current}
        disabled={busy || !data}
        onChange={e => handleChange(e.target.value)}
        className="px-2 py-1.5 rounded-lg text-[11px] font-bold bg-white dark:bg-white/5 text-slate-700 dark:text-white/80 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-40"
      >
        {(data?.skins || [{ name: current, description: '', source: 'builtin' as const }]).map(sk => (
          <option key={sk.name} value={sk.name}>
            {sk.name} {sk.source === 'user' ? '(user)' : ''}
          </option>
        ))}
      </select>
      {active?.description && (
        <p className="text-[10px] text-slate-400 dark:text-white/30 flex-1 min-w-0 truncate">{active.description}</p>
      )}
      <button
        onClick={load}
        disabled={busy}
        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 disabled:opacity-40"
        title={es.refresh || 'Refresh'}
      >
        <span className={`material-symbols-outlined text-[14px] ${busy ? 'animate-spin' : ''}`}>refresh</span>
      </button>
    </div>
  );
};

// ============================================================================
// hermes-agent Messages / Display Section — ALL display.* config.yaml paths
// ============================================================================
// display.compact                  — compact CLI output
// display.personality              — CLI personality (kawaii, etc.)
// display.resume_display           — full / compact / off
// display.busy_input_mode          — interrupt / queue / ignore
// display.bell_on_complete         — terminal bell on task completion
// display.show_reasoning           — show reasoning tokens in output
// display.streaming                — stream tokens in CLI mode
// display.inline_diffs             — show inline diff previews
// display.show_cost                — show $ cost in status bar
// display.skin                     — CLI theme skin name
// display.interim_assistant_messages — show mid-turn status in gateway
// display.tool_progress_command    — enable /verbose in gateway
// display.tool_progress_overrides  — (deprecated) per-platform overrides
// display.tool_preview_length      — max chars for tool call previews
// display.platforms                — per-platform display overrides

export const MessagesSection: React.FC<SectionProps> = ({ config, schema, setField, getField, language }) => {
  const es = useMemo(() => (getTranslation(language) as any).es || {}, [language]);
  const tip = (key: string) => schemaTooltip(key, language, schema);

  const personalityOptions = useMemo(() => [
    { value: 'kawaii', label: es.personalityKawaii || 'Kawaii (default)' },
    { value: 'professional', label: es.personalityProfessional || 'Professional' },
    { value: 'minimal', label: es.personalityMinimal || 'Minimal' },
  ], [es]);

  const resumeDisplayOptions = useMemo(() => [
    { value: 'full', label: es.resumeFull || 'Full' },
    { value: 'compact', label: es.resumeCompact || 'Compact' },
    { value: 'off', label: es.resumeOff || 'Off' },
  ], [es]);

  const busyInputModeOptions = useMemo(() => [
    { value: 'interrupt', label: es.busyInterrupt || 'Interrupt' },
    { value: 'queue', label: es.busyQueue || 'Queue' },
    { value: 'ignore', label: es.busyIgnore || 'Ignore' },
  ], [es]);

  return (
    <div className="space-y-4">
      {/* CLI Appearance */}
      <ConfigSection title={es.cliAppearance || 'CLI Appearance'} icon="palette" iconColor="text-pink-500">
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-600 dark:text-white/70">
            {es.skin || 'CLI Skin'}
          </label>
          <p className="text-[10px] text-slate-400 dark:text-white/40" title={tip('display.skin') || undefined}>
            {es.skinDesc || "Controls the hermes CLI's banner, spinner and tool prefix. Drop YAML files in ~/.hermes/skins/ to add custom skins."}
          </p>
          <SkinPicker
            value={getField(['display', 'skin']) || ''}
            onChange={v => setField(['display', 'skin'], v)}
            es={es}
          />
        </div>
        <SelectField
          label={es.personality || 'Personality'}
          desc={es.personalityDesc || 'CLI spinner personality style.'}
          tooltip={tip('display.personality')}
          value={getField(['display', 'personality']) || 'kawaii'}
          onChange={v => setField(['display', 'personality'], v)}
          options={personalityOptions}
        />
        <SwitchField
          label={es.compact || 'Compact Mode'}
          desc={es.compactDesc || 'Reduce whitespace and decorations in CLI output.'}
          tooltip={tip('display.compact')}
          value={getField(['display', 'compact']) === true}
          onChange={v => setField(['display', 'compact'], v)}
        />
      </ConfigSection>

      {/* Output Behavior */}
      <ConfigSection title={es.outputBehavior || 'Output Behavior'} icon="output" iconColor="text-cyan-500" defaultOpen={false}>
        <SwitchField
          label={es.showReasoning || 'Show Reasoning'}
          desc={es.showReasoningDesc || 'Display reasoning tokens (thinking) in output.'}
          tooltip={tip('display.show_reasoning')}
          value={getField(['display', 'show_reasoning']) === true}
          onChange={v => setField(['display', 'show_reasoning'], v)}
        />
        <SwitchField
          label={es.streaming || 'Streaming'}
          desc={es.streamingDesc || 'Stream tokens in CLI mode for real-time output.'}
          tooltip={tip('display.streaming')}
          value={getField(['display', 'streaming']) === true}
          onChange={v => setField(['display', 'streaming'], v)}
        />
        <SwitchField
          label={es.inlineDiffs || 'Inline Diffs'}
          desc={es.inlineDiffsDesc || 'Show inline diff previews for write_file/patch actions.'}
          tooltip={tip('display.inline_diffs')}
          value={getField(['display', 'inline_diffs']) !== false}
          onChange={v => setField(['display', 'inline_diffs'], v)}
        />
        <SwitchField
          label={es.showCost || 'Show Cost'}
          desc={es.showCostDesc || 'Show $ cost in the CLI status bar.'}
          tooltip={tip('display.show_cost')}
          value={getField(['display', 'show_cost']) === true}
          onChange={v => setField(['display', 'show_cost'], v)}
        />
        <SwitchField
          label={es.bellOnComplete || 'Bell on Complete'}
          desc={es.bellOnCompleteDesc || 'Play terminal bell when agent task completes.'}
          tooltip={tip('display.bell_on_complete')}
          value={getField(['display', 'bell_on_complete']) === true}
          onChange={v => setField(['display', 'bell_on_complete'], v)}
        />
        <SelectField
          label={es.resumeDisplay || 'Resume Display'}
          desc={es.resumeDisplayDesc || 'How to display resumed sessions: full replay, compact, or skip.'}
          tooltip={tip('display.resume_display')}
          value={getField(['display', 'resume_display']) || 'full'}
          onChange={v => setField(['display', 'resume_display'], v)}
          options={resumeDisplayOptions}
        />
        <SelectField
          label={es.busyInputMode || 'Busy Input Mode'}
          desc={es.busyInputModeDesc || 'What happens when user types while agent is busy.'}
          tooltip={tip('display.busy_input_mode')}
          value={getField(['display', 'busy_input_mode']) || 'interrupt'}
          onChange={v => setField(['display', 'busy_input_mode'], v)}
          options={busyInputModeOptions}
        />
      </ConfigSection>

      {/* Gateway Display */}
      <ConfigSection title={es.gatewayDisplay || 'Gateway Display'} icon="chat" iconColor="text-indigo-500" defaultOpen={false}>
        <SwitchField
          label={es.interimAssistantMessages || 'Interim Messages'}
          desc={es.interimAssistantMessagesDesc || 'Show natural mid-turn assistant status messages in gateway.'}
          tooltip={tip('display.interim_assistant_messages')}
          value={getField(['display', 'interim_assistant_messages']) !== false}
          onChange={v => setField(['display', 'interim_assistant_messages'], v)}
        />
        <SwitchField
          label={es.toolProgressCommand || 'Tool Progress Command'}
          desc={es.toolProgressCommandDesc || 'Enable /verbose command in messaging gateway.'}
          tooltip={tip('display.tool_progress_command')}
          value={getField(['display', 'tool_progress_command']) === true}
          onChange={v => setField(['display', 'tool_progress_command'], v)}
        />
        <NumberField
          label={es.toolPreviewLength || 'Tool Preview Length'}
          desc={es.toolPreviewLengthDesc || 'Max chars for tool call previews. 0 = no limit.'}
          tooltip={tip('display.tool_preview_length')}
          value={getField(['display', 'tool_preview_length'])}
          onChange={v => setField(['display', 'tool_preview_length'], v)}
          min={0}
        />
        <KeyValueField
          label={es.platformOverrides || 'Platform Overrides'}
          desc={es.platformOverridesDesc || 'Per-platform display overrides, e.g. {"telegram": {"tool_progress": "all"}}'}
          tooltip={tip('display.platforms')}
          value={getField(['display', 'platforms']) || {}}
          onChange={v => setField(['display', 'platforms'], v)}
        />
      </ConfigSection>
    </div>
  );
};
