import React, { useMemo } from 'react';
import { SectionProps } from '../sectionTypes';
import { ConfigSection, TextField, NumberField, SelectField, SwitchField, KeyValueField } from '../fields';
import { getTranslation } from '../../../locales';
import { schemaTooltip } from '../schemaTooltip';

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
        <TextField
          label={es.skin || 'CLI Skin'}
          desc={es.skinDesc || 'CLI theme skin name.'}
          tooltip={tip('display.skin')}
          value={getField(['display', 'skin']) || ''}
          onChange={v => setField(['display', 'skin'], v)}
          placeholder="default"
        />
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
