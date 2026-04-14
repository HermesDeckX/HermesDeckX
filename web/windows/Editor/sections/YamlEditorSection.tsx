import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Language } from '../../../types';
import { getTranslation } from '../../../locales';
import { configApi } from '../../../services/api';

interface YamlEditorSectionProps {
  language: Language;
}

export const YamlEditorSection: React.FC<YamlEditorSectionProps> = ({ language }) => {
  const es = useMemo(() => (getTranslation(language) as any).es || {}, [language]);
  const ed = useMemo(() => (getTranslation(language) as any).cfgEditor || {}, [language]);

  const [text, setText] = useState('');
  const [originalText, setOriginalText] = useState('');
  const [configPath, setConfigPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveResult, setSaveResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [lineCount, setLineCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumberRef = useRef<HTMLDivElement>(null);

  // Single key set state
  const [setKey, setSetKey] = useState('');
  const [setVal, setSetVal] = useState('');
  const [setSending, setSetSending] = useState(false);
  const [setResult, setSetResult] = useState<{ ok: boolean; text: string } | null>(null);

  // .env editor state
  const [envText, setEnvText] = useState('');
  const [envOriginal, setEnvOriginal] = useState('');
  const [envPath, setEnvPath] = useState('');
  const [envLoading, setEnvLoading] = useState(false);
  const [envSaving, setEnvSaving] = useState(false);
  const [envError, setEnvError] = useState('');
  const [envSaveResult, setEnvSaveResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [envLineCount, setEnvLineCount] = useState(0);
  const [envMasked, setEnvMasked] = useState(true);
  const envTextareaRef = useRef<HTMLTextAreaElement>(null);
  const envLineNumberRef = useRef<HTMLDivElement>(null);

  const dirty = text !== originalText;
  const envDirty = envText !== envOriginal;

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError('');
    setSaveResult(null);
    try {
      const res = await configApi.getRaw() as any;
      const raw = res?.raw || '';
      setText(raw);
      setOriginalText(raw);
      setLineCount(raw.split('\n').length);
      if (res?.path) setConfigPath(res.path);
    } catch (err: any) {
      setError(err?.message || es.fetchFailed || 'Failed to load config');
    }
    setLoading(false);
  }, [es]);

  useEffect(() => { loadConfig(); }, []);

  const handleChange = useCallback((value: string) => {
    setText(value);
    setLineCount(value.split('\n').length);
  }, []);

  const handleSave = useCallback(async () => {
    if (!text.trim() || saving) return;
    setSaving(true);
    setSaveResult(null);
    try {
      await configApi.updateRaw(text);
      setOriginalText(text);
      setSaveResult({ ok: true, text: es.yamlSaveOk || 'Config saved' });
      window.dispatchEvent(new CustomEvent('hermesdeck:config-yaml-synced'));
      setTimeout(() => setSaveResult(null), 3000);
    } catch (err: any) {
      const msg = err?.message || es.yamlSaveFailed || 'Failed to save';
      setSaveResult({ ok: false, text: msg });
    }
    setSaving(false);
  }, [text, saving, es]);

  const handleReload = useCallback(() => {
    loadConfig();
  }, [loadConfig]);

  // Sync scroll between textarea and line numbers
  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumberRef.current) {
      lineNumberRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  // Config set single key handler
  const handleConfigSet = useCallback(async () => {
    if (!setKey.trim() || setSending) return;
    setSetSending(true);
    setSetResult(null);
    try {
      let val = setVal.trim();
      let isJson = true;
      try { JSON.parse(val); } catch { isJson = false; }
      await configApi.setKey(setKey.trim(), val, isJson);
      setSetResult({ ok: true, text: `${es.configSetOk || 'Key set'}: ${setKey.trim()}` });
      window.dispatchEvent(new CustomEvent('hermesdeck:config-key-set'));
      setSetKey('');
      setSetVal('');
      setTimeout(() => setSetResult(null), 3000);
      // Reload to reflect single-key change
      loadConfig();
    } catch (err: any) {
      setSetResult({ ok: false, text: `${es.configSetFailed || 'Failed'}: ${err?.message || ''}` });
    }
    setSetSending(false);
  }, [setKey, setVal, setSending, es, loadConfig]);

  // .env handlers
  const loadEnv = useCallback(async () => {
    setEnvLoading(true);
    setEnvError('');
    setEnvSaveResult(null);
    try {
      const res = await configApi.getEnv() as any;
      const raw = res?.raw || '';
      setEnvText(raw);
      setEnvOriginal(raw);
      setEnvLineCount(Math.max(raw.split('\n').length, 1));
      if (res?.path) setEnvPath(res.path);
    } catch (err: any) {
      setEnvError(err?.message || es.fetchFailed || 'Failed to load .env');
    }
    setEnvLoading(false);
  }, [es]);

  useEffect(() => { loadEnv(); }, []);

  useEffect(() => {
    const handleExternalSync = () => {
      void loadConfig();
      void loadEnv();
    };
    window.addEventListener('hermesdeck:config-form-synced', handleExternalSync);
    return () => window.removeEventListener('hermesdeck:config-form-synced', handleExternalSync);
  }, [loadConfig, loadEnv]);

  const handleEnvChange = useCallback((value: string) => {
    setEnvText(value);
    setEnvLineCount(Math.max(value.split('\n').length, 1));
  }, []);

  const handleEnvSave = useCallback(async () => {
    if (envSaving) return;
    setEnvSaving(true);
    setEnvSaveResult(null);
    try {
      await configApi.updateEnv(envText);
      setEnvOriginal(envText);
      setEnvSaveResult({ ok: true, text: es.envSaveOk || '.env saved' });
      window.dispatchEvent(new CustomEvent('hermesdeck:config-env-synced'));
      setTimeout(() => setEnvSaveResult(null), 3000);
    } catch (err: any) {
      setEnvSaveResult({ ok: false, text: err?.message || es.envSaveFailed || 'Failed to save .env' });
    }
    setEnvSaving(false);
  }, [envText, envSaving, es]);

  const handleEnvScroll = useCallback(() => {
    if (envTextareaRef.current && envLineNumberRef.current) {
      envLineNumberRef.current.scrollTop = envTextareaRef.current.scrollTop;
    }
  }, []);

  // Mask values in .env display (show KEY=**** instead of actual values)
  const maskedEnvText = useMemo(() => {
    if (!envMasked) return envText;
    return envText.split('\n').map(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return line;
      const eqIdx = line.indexOf('=');
      if (eqIdx < 1) return line;
      return line.slice(0, eqIdx + 1) + '••••••••';
    }).join('\n');
  }, [envText, envMasked]);

  return (
    <div className="space-y-4">
      {/* YAML Editor */}
      <div className="rounded-xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-amber-500">data_object</span>
            <h3 className="text-[12px] font-bold text-slate-700 dark:text-white/70">{es.yamlEditorTitle || 'YAML Editor'}</h3>
            {configPath && (
              <span className="text-[10px] text-slate-400 dark:text-white/30 font-mono truncate max-w-[300px]">{configPath}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {dirty && (
              <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">edit</span>
                {ed.unsaved || 'Unsaved'}
              </span>
            )}
            <span className="text-[10px] text-slate-400 font-mono">{lineCount} {ed.lines || 'lines'}</span>
            <button onClick={handleReload} disabled={loading}
              className="h-7 px-3 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/40 text-[10px] font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors disabled:opacity-40 flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">{loading ? 'progress_activity' : 'refresh'}</span>
              {ed.refresh || 'Refresh'}
            </button>
          </div>
        </div>

        {error && (
          <div className="px-4 py-2 bg-red-50 dark:bg-red-500/5 text-[10px] text-red-500 font-bold">{error}</div>
        )}

        {loading && !text && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-white/20">
            <span className="material-symbols-outlined text-3xl mb-2 animate-spin">progress_activity</span>
            <p className="text-[11px]">{ed.loading || 'Loading...'}</p>
          </div>
        )}

        {(text || (!loading && !error)) && (
          <div className="p-4 space-y-3">
            {/* Editor area */}
            <div className="border border-slate-200 dark:border-white/[0.06] rounded-xl overflow-hidden bg-[#fafafa] dark:bg-[#141418]">
              <div className="flex overflow-hidden" style={{ maxHeight: 'calc(100vh - 340px)' }}>
                {/* Line numbers */}
                <div
                  ref={lineNumberRef}
                  className="w-10 md:w-12 bg-slate-100 dark:bg-[#1a1a1e] border-e border-slate-200 dark:border-white/5 py-3 px-1 text-end select-none overflow-hidden shrink-0"
                >
                  {Array.from({ length: lineCount }, (_, i) => (
                    <div key={i} className="text-[10px] md:text-[11px] leading-[1.65] text-slate-300 dark:text-white/15 font-mono">{i + 1}</div>
                  ))}
                </div>
                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={e => handleChange(e.target.value)}
                  onScroll={handleScroll}
                  spellCheck={false}
                  className="flex-1 p-3 bg-transparent text-[11px] md:text-[12px] leading-[1.65] font-mono text-slate-800 dark:text-[#d4d4d4] outline-none resize-none overflow-auto custom-scrollbar neon-scrollbar"
                  style={{ minHeight: '400px', tabSize: 2 }}
                />
              </div>
            </div>

            {/* Action bar */}
            <div className="flex items-center gap-2">
              <button onClick={handleSave} disabled={!dirty || saving}
                className="h-7 px-3 bg-primary text-white text-[10px] font-bold rounded-lg flex items-center gap-1 transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
                <span className="material-symbols-outlined text-[12px]">{saving ? 'progress_activity' : 'save'}</span>
                {saving ? (es.saving || 'Saving...') : (es.yamlSaveBtn || 'Save')}
              </button>
              <button onClick={handleReload}
                className="h-7 px-3 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/40 text-[10px] font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">refresh</span>
              </button>
              <span className="flex-1" />
              {!dirty && text && (
                <span className="text-[10px] text-mac-green flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">check_circle</span>
                  {es.yamlSynced || 'Synced'}
                </span>
              )}
            </div>

            {saveResult && (
              <div className={`px-2 py-1.5 rounded-lg text-[10px] font-bold ${saveResult.ok ? 'bg-mac-green/10 text-mac-green' : 'bg-red-50 dark:bg-red-500/5 text-red-500'}`}>
                {saveResult.text}
              </div>
            )}
          </div>
        )}

        {!text && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-white/20">
            <span className="material-symbols-outlined text-3xl mb-2">data_object</span>
            <p className="text-[11px]">{es.yamlEmptyHint || 'No config file found'}</p>
          </div>
        )}
      </div>

      {/* Set Config Key */}
      <div className="rounded-xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-white/5 flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-teal-500">edit_attributes</span>
          <h3 className="text-[12px] font-bold text-slate-700 dark:text-white/70">{es.configSetTitle || 'Set Config Key'}</h3>
        </div>
        <div className="p-4 space-y-2">
          <p className="text-[10px] text-slate-400 dark:text-white/35">{es.yamlSetKeyDesc || 'Set a single configuration key (dot-path notation). Uses hermes CLI to update the config file.'}</p>
          <div className="flex gap-2">
            <input value={setKey} onChange={e => setSetKey(e.target.value)}
              placeholder={es.configSetKeyPlaceholder || 'e.g. model.default'}
              className="flex-1 h-8 px-3 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-[11px] font-mono text-slate-700 dark:text-white/70 outline-none" />
            <input value={setVal} onChange={e => setSetVal(e.target.value)}
              placeholder={es.configSetValPlaceholder || 'value (JSON or string)'}
              onKeyDown={e => e.key === 'Enter' && handleConfigSet()}
              className="flex-1 h-8 px-3 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-[11px] font-mono text-slate-700 dark:text-white/70 outline-none" />
            <button onClick={handleConfigSet} disabled={setSending || !setKey.trim()}
              className="h-8 px-3 bg-teal-500 text-white text-[10px] font-bold rounded-lg disabled:opacity-40 flex items-center gap-1 transition-all hover:bg-teal-600">
              <span className="material-symbols-outlined text-[12px]">{setSending ? 'progress_activity' : 'check'}</span>
              {es.configSetBtn || 'Set'}
            </button>
          </div>
          {setResult && (
            <div className={`px-2 py-1.5 rounded-lg text-[10px] font-bold ${setResult.ok ? 'bg-mac-green/10 text-mac-green' : 'bg-red-50 dark:bg-red-500/5 text-red-500'}`}>
              {setResult.text}
            </div>
          )}
        </div>
      </div>

      {/* .env Editor */}
      <div className="rounded-xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-emerald-500">key</span>
            <h3 className="text-[12px] font-bold text-slate-700 dark:text-white/70">{es.envEditorTitle || 'Environment Variables'}</h3>
            {envPath && (
              <span className="text-[10px] text-slate-400 dark:text-white/30 font-mono truncate max-w-[300px]">{envPath}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {envDirty && (
              <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">edit</span>
                {ed.unsaved || 'Unsaved'}
              </span>
            )}
            <button onClick={() => setEnvMasked(!envMasked)}
              className="h-7 px-2 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/40 text-[10px] font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">{envMasked ? 'visibility_off' : 'visibility'}</span>
              {envMasked ? (es.envShowValues || 'Show') : (es.envHideValues || 'Hide')}
            </button>
            <span className="text-[10px] text-slate-400 font-mono">{envLineCount} {ed.lines || 'lines'}</span>
            <button onClick={loadEnv} disabled={envLoading}
              className="h-7 px-3 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/40 text-[10px] font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors disabled:opacity-40 flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">{envLoading ? 'progress_activity' : 'refresh'}</span>
              {ed.refresh || 'Refresh'}
            </button>
          </div>
        </div>

        {envError && (
          <div className="px-4 py-2 bg-red-50 dark:bg-red-500/5 text-[10px] text-red-500 font-bold">{envError}</div>
        )}

        <div className="px-4 pt-3 pb-1">
          <p className="text-[10px] text-slate-400 dark:text-white/30 flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">info</span>
            {es.envHint || 'API keys and secrets for hermes-agent. Contains sensitive data — handle with care.'}
          </p>
        </div>

        {envLoading && !envText && (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-white/20">
            <span className="material-symbols-outlined text-2xl mb-2 animate-spin">progress_activity</span>
            <p className="text-[11px]">{ed.loading || 'Loading...'}</p>
          </div>
        )}

        {(!envLoading || envText) && (
          <div className="p-4 pt-2 space-y-3">
            <div className="border border-slate-200 dark:border-white/[0.06] rounded-xl overflow-hidden bg-[#fafafa] dark:bg-[#141418]">
              <div className="flex overflow-hidden" style={{ maxHeight: '300px' }}>
                {/* Line numbers */}
                <div
                  ref={envLineNumberRef}
                  className="w-10 md:w-12 bg-slate-100 dark:bg-[#1a1a1e] border-e border-slate-200 dark:border-white/5 py-3 px-1 text-end select-none overflow-hidden shrink-0"
                >
                  {Array.from({ length: envLineCount }, (_, i) => (
                    <div key={i} className="text-[10px] md:text-[11px] leading-[1.65] text-slate-300 dark:text-white/15 font-mono">{i + 1}</div>
                  ))}
                </div>
                {/* Textarea */}
                <textarea
                  ref={envTextareaRef}
                  value={envMasked ? maskedEnvText : envText}
                  onChange={e => { if (!envMasked) handleEnvChange(e.target.value); }}
                  onScroll={handleEnvScroll}
                  readOnly={envMasked}
                  spellCheck={false}
                  className={`flex-1 p-3 bg-transparent text-[11px] md:text-[12px] leading-[1.65] font-mono outline-none resize-none overflow-auto custom-scrollbar neon-scrollbar ${envMasked ? 'text-slate-400 dark:text-white/30 cursor-default' : 'text-slate-800 dark:text-[#d4d4d4]'}`}
                  style={{ minHeight: '120px', tabSize: 2 }}
                />
              </div>
            </div>

            {/* Action bar */}
            <div className="flex items-center gap-2">
              <button onClick={handleEnvSave} disabled={!envDirty || envSaving || envMasked}
                className="h-7 px-3 bg-emerald-500 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 transition-all hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed">
                <span className="material-symbols-outlined text-[12px]">{envSaving ? 'progress_activity' : 'save'}</span>
                {envSaving ? (es.saving || 'Saving...') : (es.yamlSaveBtn || 'Save')}
              </button>
              <button onClick={loadEnv}
                className="h-7 px-3 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/40 text-[10px] font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">refresh</span>
              </button>
              <span className="flex-1" />
              {!envDirty && envText && (
                <span className="text-[10px] text-mac-green flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">check_circle</span>
                  {es.yamlSynced || 'Synced'}
                </span>
              )}
              {envMasked && (
                <span className="text-[10px] text-slate-400 dark:text-white/30 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">lock</span>
                  {es.envMaskedHint || 'Click Show to edit'}
                </span>
              )}
            </div>

            {envSaveResult && (
              <div className={`px-2 py-1.5 rounded-lg text-[10px] font-bold ${envSaveResult.ok ? 'bg-mac-green/10 text-mac-green' : 'bg-red-50 dark:bg-red-500/5 text-red-500'}`}>
                {envSaveResult.text}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
