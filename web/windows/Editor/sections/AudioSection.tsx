import React, { useMemo } from 'react';
import { SectionProps } from '../sectionTypes';
import { ConfigSection, TextField, NumberField, SelectField, SwitchField } from '../fields';
import { getTranslation } from '../../../locales';
import { schemaTooltip } from '../schemaTooltip';

// ============================================================================
// hermes-agent TTS / STT / Voice Section
// ============================================================================
// hermes-agent config.yaml paths:
//   tts.provider              — edge | elevenlabs | openai | minimax | mistral | neutts
//   tts.edge.voice            — Edge TTS voice name
//   tts.elevenlabs.*          — ElevenLabs voice_id, model_id
//   tts.openai.*              — OpenAI TTS model, voice
//   tts.mistral.*             — Mistral TTS model, voice_id
//   tts.neutts.*              — NeuTTS local model config
//   stt.enabled               — Enable speech-to-text
//   stt.provider              — local | groq | openai | mistral
//   stt.local.*               — Local whisper config
//   stt.openai.*              — OpenAI Whisper config
//   stt.mistral.*             — Mistral Voxtral config
//   voice.*                   — Voice recording settings

export const AudioSection: React.FC<SectionProps> = ({ config, schema, setField, getField, language }) => {
  const es = useMemo(() => (getTranslation(language) as any).es || {}, [language]);
  const tip = (key: string) => schemaTooltip(key, language, schema);

  const ttsProviderOptions = useMemo(() => [
    { value: 'edge', label: es.ttsEdge || 'Edge TTS (free)' },
    { value: 'elevenlabs', label: es.ttsElevenlabs || 'ElevenLabs (premium)' },
    { value: 'openai', label: es.ttsOpenai || 'OpenAI' },
    { value: 'minimax', label: es.ttsMinimax || 'MiniMax' },
    { value: 'mistral', label: es.ttsMistral || 'Mistral' },
    { value: 'neutts', label: es.ttsNeutts || 'NeuTTS (local)' },
  ], [es]);

  const sttProviderOptions = useMemo(() => [
    { value: 'local', label: es.sttLocal || 'Local (faster-whisper, free)' },
    { value: 'groq', label: es.sttGroq || 'Groq' },
    { value: 'openai', label: es.sttOpenai || 'OpenAI Whisper' },
    { value: 'mistral', label: es.sttMistral || 'Mistral Voxtral' },
  ], [es]);

  const whisperModelOptions = useMemo(() => [
    { value: 'tiny', label: 'Tiny' },
    { value: 'base', label: 'Base' },
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large-v3', label: 'Large v3' },
  ], []);

  const ttsProvider = getField(['tts', 'provider']) || 'edge';
  const sttProvider = getField(['stt', 'provider']) || 'local';

  return (
    <div className="space-y-4">
      {/* TTS */}
      <ConfigSection title={es.tts || 'Text-to-Speech'} icon="record_voice_over" iconColor="text-blue-500">
        <SelectField
          label={es.ttsProvider || 'TTS Provider'}
          desc={es.ttsProviderDesc || 'Speech synthesis engine.'}
          tooltip={tip('tts.provider')}
          value={ttsProvider}
          onChange={v => setField(['tts', 'provider'], v)}
          options={ttsProviderOptions}
        />

        {/* Edge TTS */}
        {ttsProvider === 'edge' && (
          <TextField
            label={es.edgeVoice || 'Voice'}
            desc={es.edgeVoiceDesc || 'Edge TTS voice name (e.g. en-US-AriaNeural).'}
            tooltip={tip('tts.edge.voice')}
            value={getField(['tts', 'edge', 'voice']) || ''}
            onChange={v => setField(['tts', 'edge', 'voice'], v)}
            placeholder="en-US-AriaNeural"
          />
        )}

        {/* ElevenLabs */}
        {ttsProvider === 'elevenlabs' && (
          <>
            <TextField
              label={es.elevenVoiceId || 'Voice ID'}
              tooltip={tip('tts.elevenlabs.voice_id')}
              value={getField(['tts', 'elevenlabs', 'voice_id']) || ''}
              onChange={v => setField(['tts', 'elevenlabs', 'voice_id'], v)}
              placeholder="pNInz6obpgDQGcFmaJgB"
            />
            <TextField
              label={es.elevenModelId || 'Model ID'}
              tooltip={tip('tts.elevenlabs.model_id')}
              value={getField(['tts', 'elevenlabs', 'model_id']) || ''}
              onChange={v => setField(['tts', 'elevenlabs', 'model_id'], v)}
              placeholder="eleven_multilingual_v2"
            />
          </>
        )}

        {/* OpenAI TTS */}
        {ttsProvider === 'openai' && (
          <>
            <TextField
              label={es.openaiTtsModel || 'Model'}
              tooltip={tip('tts.openai.model')}
              value={getField(['tts', 'openai', 'model']) || ''}
              onChange={v => setField(['tts', 'openai', 'model'], v)}
              placeholder="gpt-4o-mini-tts"
            />
            <SelectField
              label={es.openaiTtsVoice || 'Voice'}
              tooltip={tip('tts.openai.voice')}
              value={getField(['tts', 'openai', 'voice']) || 'alloy'}
              onChange={v => setField(['tts', 'openai', 'voice'], v)}
              options={[
                { value: 'alloy', label: 'Alloy' },
                { value: 'echo', label: 'Echo' },
                { value: 'fable', label: 'Fable' },
                { value: 'onyx', label: 'Onyx' },
                { value: 'nova', label: 'Nova' },
                { value: 'shimmer', label: 'Shimmer' },
              ]}
            />
          </>
        )}

        {/* Mistral TTS */}
        {ttsProvider === 'mistral' && (
          <>
            <TextField
              label={es.mistralTtsModel || 'Model'}
              tooltip={tip('tts.mistral.model')}
              value={getField(['tts', 'mistral', 'model']) || ''}
              onChange={v => setField(['tts', 'mistral', 'model'], v)}
              placeholder="voxtral-mini-tts-2603"
            />
            <TextField
              label={es.mistralVoiceId || 'Voice ID'}
              tooltip={tip('tts.mistral.voice_id')}
              value={getField(['tts', 'mistral', 'voice_id']) || ''}
              onChange={v => setField(['tts', 'mistral', 'voice_id'], v)}
              placeholder="c69964a6-ab8b-4f8a-9465-ec0925096ec8"
            />
          </>
        )}

        {/* NeuTTS (local) */}
        {ttsProvider === 'neutts' && (
          <>
            <TextField
              label={es.neuttsRefAudio || 'Reference Audio'}
              desc={es.neuttsRefAudioDesc || 'Path to reference voice audio (empty = bundled default).'}
              tooltip={tip('tts.neutts.ref_audio')}
              value={getField(['tts', 'neutts', 'ref_audio']) || ''}
              onChange={v => setField(['tts', 'neutts', 'ref_audio'], v)}
              placeholder=""
            />
            <TextField
              label={es.neuttsRefText || 'Reference Text'}
              tooltip={tip('tts.neutts.ref_text')}
              value={getField(['tts', 'neutts', 'ref_text']) || ''}
              onChange={v => setField(['tts', 'neutts', 'ref_text'], v)}
              placeholder=""
            />
            <TextField
              label={es.neuttsModel || 'Model'}
              tooltip={tip('tts.neutts.model')}
              value={getField(['tts', 'neutts', 'model']) || ''}
              onChange={v => setField(['tts', 'neutts', 'model'], v)}
              placeholder="neuphonic/neutts-air-q4-gguf"
            />
            <SelectField
              label={es.neuttsDevice || 'Device'}
              tooltip={tip('tts.neutts.device')}
              value={getField(['tts', 'neutts', 'device']) || 'cpu'}
              onChange={v => setField(['tts', 'neutts', 'device'], v)}
              options={[
                { value: 'cpu', label: 'CPU' },
                { value: 'cuda', label: 'CUDA' },
                { value: 'mps', label: 'MPS (Apple)' },
              ]}
            />
          </>
        )}
      </ConfigSection>

      {/* STT */}
      <ConfigSection title={es.stt || 'Speech-to-Text'} icon="mic" iconColor="text-green-500">
        <SwitchField
          label={es.sttEnabled || 'Enable STT'}
          desc={es.sttEnabledDesc || 'Auto-transcribe inbound voice messages.'}
          tooltip={tip('stt.enabled')}
          value={getField(['stt', 'enabled']) !== false}
          onChange={v => setField(['stt', 'enabled'], v)}
        />
        <SelectField
          label={es.sttProvider || 'STT Provider'}
          tooltip={tip('stt.provider')}
          value={sttProvider}
          onChange={v => setField(['stt', 'provider'], v)}
          options={sttProviderOptions}
        />

        {/* Local whisper */}
        {sttProvider === 'local' && (
          <>
            <SelectField
              label={es.whisperModel || 'Whisper Model'}
              tooltip={tip('stt.local.model')}
              value={getField(['stt', 'local', 'model']) || 'base'}
              onChange={v => setField(['stt', 'local', 'model'], v)}
              options={whisperModelOptions}
            />
            <TextField
              label={es.whisperLanguage || 'Language'}
              desc={es.whisperLanguageDesc || 'Force language (e.g. "en", "es"). Empty = auto-detect.'}
              tooltip={tip('stt.local.language')}
              value={getField(['stt', 'local', 'language']) || ''}
              onChange={v => setField(['stt', 'local', 'language'], v)}
              placeholder=""
            />
          </>
        )}

        {/* OpenAI STT */}
        {sttProvider === 'openai' && (
          <TextField
            label={es.openaiSttModel || 'Whisper Model'}
            tooltip={tip('stt.openai.model')}
            value={getField(['stt', 'openai', 'model']) || ''}
            onChange={v => setField(['stt', 'openai', 'model'], v)}
            placeholder="whisper-1"
          />
        )}

        {/* Mistral STT */}
        {sttProvider === 'mistral' && (
          <TextField
            label={es.mistralSttModel || 'Model'}
            tooltip={tip('stt.mistral.model')}
            value={getField(['stt', 'mistral', 'model']) || ''}
            onChange={v => setField(['stt', 'mistral', 'model'], v)}
            placeholder="voxtral-mini-latest"
          />
        )}
      </ConfigSection>

      {/* Voice Recording */}
      <ConfigSection title={es.voiceRecording || 'Voice Recording'} icon="settings_voice" iconColor="text-purple-500" defaultOpen={false}>
        <TextField
          label={es.recordKey || 'Record Key'}
          desc={es.recordKeyDesc || 'Keyboard shortcut to start/stop recording.'}
          tooltip={tip('voice.record_key')}
          value={getField(['voice', 'record_key']) || ''}
          onChange={v => setField(['voice', 'record_key'], v)}
          placeholder="ctrl+b"
        />
        <NumberField
          label={es.maxRecordingSeconds || 'Max Recording (s)'}
          tooltip={tip('voice.max_recording_seconds')}
          value={getField(['voice', 'max_recording_seconds'])}
          onChange={v => setField(['voice', 'max_recording_seconds'], v)}
          min={1}
        />
        <SwitchField
          label={es.autoTts || 'Auto TTS'}
          desc={es.autoTtsDesc || 'Automatically speak agent responses after voice input.'}
          tooltip={tip('voice.auto_tts')}
          value={getField(['voice', 'auto_tts']) === true}
          onChange={v => setField(['voice', 'auto_tts'], v)}
        />
        <NumberField
          label={es.silenceThreshold || 'Silence Threshold'}
          desc={es.silenceThresholdDesc || 'RMS below this = silence (0-32767).'}
          tooltip={tip('voice.silence_threshold')}
          value={getField(['voice', 'silence_threshold'])}
          onChange={v => setField(['voice', 'silence_threshold'], v)}
          min={0} max={32767}
        />
        <NumberField
          label={es.silenceDuration || 'Silence Duration (s)'}
          desc={es.silenceDurationDesc || 'Seconds of silence before auto-stop.'}
          tooltip={tip('voice.silence_duration')}
          value={getField(['voice', 'silence_duration'])}
          onChange={v => setField(['voice', 'silence_duration'], v)}
          min={0} step={0.5}
        />
      </ConfigSection>
    </div>
  );
};
