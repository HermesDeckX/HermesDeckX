import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Language } from '../types';
import { getTranslation } from '../locales';
import { mcpApi, McpServerConfig, McpServerEntry, McpServerTestResult, McpToolInfo } from '../services/api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';

interface McpCenterProps {
  language: Language;
}

// Server type options
const SERVER_TYPES = ['stdio', 'sse', 'streamable-http'] as const;
type ServerType = typeof SERVER_TYPES[number];

// Default config templates per type
const TYPE_DEFAULTS: Record<ServerType, McpServerConfig> = {
  stdio: { type: 'stdio', command: '', args: [], env: {} },
  sse: { type: 'sse', url: '', env: {} },
  'streamable-http': { type: 'streamable-http', url: '', env: {} },
};

// Display labels for server types
const SERVER_TYPE_LABELS: Record<ServerType, string> = {
  stdio: 'STDIO',
  sse: 'SSE',
  'streamable-http': 'Streamable HTTP',
};

// Detect server type from config
function detectType(cfg: McpServerConfig): ServerType {
  const transport = ((cfg.transport ?? cfg.type ?? '') as string).toLowerCase();
  if (transport === 'streamable-http') return 'streamable-http';
  if (transport === 'sse' || cfg.type === 'sse' || cfg.url || (cfg as any).baseUrl) return 'sse';
  return 'stdio';
}

// Sensitive header keys that should be redacted in display
const SENSITIVE_HEADER_KEYS = new Set([
  'authorization', 'x-api-key', 'api-key', 'cookie', 'x-auth-token',
  'proxy-authorization', 'x-secret', 'bearer',
]);
const SENSITIVE_ENV_PATTERNS = [/token/i, /secret/i, /key/i, /password/i, /credential/i];

function isSensitiveHeader(key: string): boolean {
  return SENSITIVE_HEADER_KEYS.has(key.toLowerCase());
}

function isSensitiveEnv(key: string): boolean {
  return SENSITIVE_ENV_PATTERNS.some(p => p.test(key));
}

function redactValue(value: string): string {
  if (value.length <= 8) return '••••••••';
  return value.slice(0, 4) + '••••' + value.slice(-4);
}

function isHttpType(type: ServerType): boolean {
  return type === 'sse' || type === 'streamable-http';
}

// ─── Env pair editor ─────────────────────────────────────────────────────────
const EnvEditor: React.FC<{
  env: Record<string, string>;
  onChange: (env: Record<string, string>) => void;
  addLabel: string;
  keyPlaceholder: string;
  valuePlaceholder: string;
}> = ({ env, onChange, addLabel, keyPlaceholder, valuePlaceholder }) => {
  const [pairs, setPairs] = useState<[string, string][]>(() =>
    Object.entries(env).length > 0 ? Object.entries(env) : []
  );

  const sync = (next: [string, string][]) => {
    setPairs(next);
    const map: Record<string, string> = {};
    for (const [k, v] of next) if (k.trim()) map[k.trim()] = v;
    onChange(map);
  };

  return (
    <div className="space-y-1.5">
      {pairs.map(([k, v], i) => (
        <div key={i} className="flex gap-1.5">
          <input
            value={k}
            onChange={e => { const n = [...pairs]; n[i] = [e.target.value, v]; sync(n); }}
            placeholder={keyPlaceholder}
            className="flex-1 h-8 px-2 theme-field rounded text-[11px] font-mono outline-none focus:border-primary sci-input"
          />
          <input
            value={v}
            onChange={e => { const n = [...pairs]; n[i] = [k, e.target.value]; sync(n); }}
            placeholder={valuePlaceholder}
            className="flex-1 h-8 px-2 theme-field rounded text-[11px] font-mono outline-none focus:border-primary sci-input"
          />
          <button
            type="button"
            onClick={() => sync(pairs.filter((_, j) => j !== i))}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-mac-red shrink-0"
          >
            <span className="material-symbols-outlined text-[14px]">remove_circle</span>
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => sync([...pairs, ['', '']])}
        className="text-[11px] text-primary font-bold hover:underline"
      >
        + {addLabel}
      </button>
    </div>
  );
};

// ─── Args editor ──────────────────────────────────────────────────────────────
const ArgsEditor: React.FC<{
  args: string[];
  onChange: (args: string[]) => void;
  addLabel: string;
  placeholder: string;
}> = ({ args, onChange, addLabel, placeholder }) => {
  const [items, setItems] = useState<string[]>(args.length > 0 ? args : []);

  const sync = (next: string[]) => {
    setItems(next);
    onChange(next.filter(a => a.trim() !== ''));
  };

  return (
    <div className="space-y-1.5">
      {items.map((a, i) => (
        <div key={i} className="flex gap-1.5">
          <input
            value={a}
            onChange={e => { const n = [...items]; n[i] = e.target.value; sync(n); }}
            placeholder={`${placeholder} ${i + 1}`}
            className="flex-1 h-8 px-2 theme-field rounded text-[11px] font-mono outline-none focus:border-primary sci-input"
          />
          <button
            type="button"
            onClick={() => sync(items.filter((_, j) => j !== i))}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-mac-red shrink-0"
          >
            <span className="material-symbols-outlined text-[14px]">remove_circle</span>
          </button>
        </div>
      ))}
      <button type="button" onClick={() => sync([...items, ''])} className="text-[11px] text-primary font-bold hover:underline">
        + {addLabel}
      </button>
    </div>
  );
};

// ─── JSON paste parser ────────────────────────────────────────────────────────
interface ParsedServer { name: string; config: McpServerConfig }

function parseMcpJson(raw: string): ParsedServer[] {
  const obj = JSON.parse(raw.trim());
  const results: ParsedServer[] = [];

  // Format 1: { "mcpServers": { "name": { ... } } }  (Claude Desktop / VS Code style)
  const root = obj.mcpServers ?? obj.servers ?? null;
  if (root && typeof root === 'object' && !Array.isArray(root)) {
    for (const [name, cfg] of Object.entries(root)) {
      results.push({ name, config: normalizeConfig(cfg as any) });
    }
    return results;
  }

  // Format 2: single server object { "command": ..., "args": ... } — name unknown
  if (obj.command || obj.url || obj.baseUrl || obj.transport) {
    results.push({ name: '', config: normalizeConfig(obj) });
    return results;
  }

  // Format 3: { "name": { "command": ... } } — top-level key is server name
  for (const [name, cfg] of Object.entries(obj)) {
    if (cfg && typeof cfg === 'object' && !Array.isArray(cfg)) {
      results.push({ name, config: normalizeConfig(cfg as any) });
    }
  }
  return results;
}

function normalizeConfig(raw: any): McpServerConfig {
  const cfg: McpServerConfig = {};
  // transport / type field; baseUrl is an alias for url (used by some MCP configs)
  const transport = (raw.transport ?? raw.type ?? '').toLowerCase();
  const resolvedUrl = raw.url ?? raw.baseUrl ?? '';
  if (transport === 'streamable-http') {
    cfg.type = 'streamable-http';
    cfg.transport = 'streamable-http';
    cfg.url = resolvedUrl;
  } else if (transport === 'http' || transport === 'sse' || resolvedUrl) {
    cfg.type = 'sse';
    cfg.transport = 'sse';
    cfg.url = resolvedUrl;
  } else {
    cfg.type = 'stdio';
    cfg.command = raw.command ?? '';
    if (Array.isArray(raw.args)) cfg.args = raw.args;
  }
  if (raw.env && typeof raw.env === 'object') cfg.env = raw.env;
  if (raw.headers && typeof raw.headers === 'object') cfg.headers = raw.headers;
  if (typeof raw.connectionTimeoutMs === 'number' && raw.connectionTimeoutMs > 0) {
    cfg.connectionTimeoutMs = raw.connectionTimeoutMs;
  }
  if (typeof raw.cwd === 'string') cfg.cwd = raw.cwd;
  if (typeof raw.workingDirectory === 'string') cfg.workingDirectory = raw.workingDirectory;
  // preserve any extra fields
  const known = new Set(['type', 'transport', 'command', 'args', 'url', 'baseUrl', 'env', 'headers', 'connectionTimeoutMs', 'cwd', 'workingDirectory']);
  for (const [k, v] of Object.entries(raw)) {
    if (!known.has(k)) (cfg as any)[k] = v;
  }
  return cfg;
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
const EditModal: React.FC<{
  entry: McpServerEntry | null;
  language: Language;
  onSave: (name: string, config: McpServerConfig, oldName?: string) => Promise<void>;
  onSaveBatch: (servers: ParsedServer[]) => Promise<void>;
  onClose: () => void;
}> = ({ entry, language, onSave, onSaveBatch, onClose }) => {
  const t = (getTranslation(language) as any).sk?.mcp ?? {};
  const isNew = entry === null;
  const originalName = entry?.name ?? '';

  // New servers default to paste mode; editing defaults to form mode
  const [mode, setMode] = useState<'paste' | 'form' | 'json'>(isNew ? 'paste' : 'form');

  // ── JSON tab state (view/edit current config as raw JSON) ──
  const [jsonRaw, setJsonRaw] = useState(() =>
    entry ? JSON.stringify(entry.config, null, 2) : ''
  );
  const [jsonError, setJsonError] = useState('');

  // ── Paste mode state ──
  const [pasteRaw, setPasteRaw] = useState('');
  const [pasteError, setPasteError] = useState('');
  const [parsed, setParsed] = useState<ParsedServer[]>([]);

  // ── Form mode state ──
  const [name, setName] = useState(entry?.name ?? '');
  const [serverType, setServerType] = useState<ServerType>(
    entry ? detectType(entry.config) : 'stdio'
  );
  const [command, setCommand] = useState(entry?.config.command ?? '');
  const [args, setArgs] = useState<string[]>(entry?.config.args ?? []);
  const [url, setUrl] = useState(entry?.config.url ?? '');
  const [headers, setHeaders] = useState<Record<string, string>>(entry?.config.headers ?? {});
  const [env, setEnv] = useState<Record<string, string>>(entry?.config.env ?? {});
  const [timeout, setTimeout_] = useState<number | ''>(typeof (entry?.config as any)?.timeout === 'number' ? (entry?.config as any).timeout : '');
  const [connectTimeout, setConnectTimeout] = useState<number | ''>(typeof (entry?.config as any)?.connect_timeout === 'number' ? (entry?.config as any).connect_timeout : '');
  const [cwd, setCwd] = useState(entry?.config.cwd ?? entry?.config.workingDirectory ?? '');
  const [extraJson, setExtraJson] = useState('');
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState('');
  const [commandError, setCommandError] = useState('');
  const [urlError, setUrlError] = useState('');
  const [modalTesting, setModalTesting] = useState(false);
  const [modalTestResult, setModalTestResult] = useState<McpServerTestResult | null>(null);

  // Parse as user types in paste mode
  const handlePasteChange = (raw: string) => {
    setPasteRaw(raw);
    if (!raw.trim()) { setParsed([]); setPasteError(''); return; }
    try {
      const result = parseMcpJson(raw);
      setParsed(result);
      setPasteError('');
    } catch {
      setParsed([]);
      setPasteError(t.pasteJsonInvalid || 'Invalid JSON');
    }
  };

  // Fill form fields from first parsed result and switch to form mode
  const applyToForm = (p: ParsedServer) => {
    setName(p.name);
    const tp = detectType(p.config);
    setServerType(tp);
    setCommand(p.config.command ?? '');
    setArgs(p.config.args ?? []);
    setUrl(p.config.url ?? '');
    setHeaders(p.config.headers ?? {});
    setEnv(p.config.env ?? {});
    setTimeout_(typeof (p.config as any)?.timeout === 'number' ? (p.config as any).timeout : '');
    setConnectTimeout(typeof (p.config as any)?.connect_timeout === 'number' ? (p.config as any).connect_timeout : '');
    setCwd(p.config.cwd ?? p.config.workingDirectory ?? '');
    setMode('form');
  };

  const handleSavePaste = async () => {
    if (!parsed.length) return;
    setSaving(true);
    try {
      await onSaveBatch(parsed);
    } finally {
      setSaving(false);
    }
  };

  // Convert SSE config to mcp-remote stdio bridge
  const convertToMcpRemote = () => {
    const resolvedUrl = url.trim();
    if (!resolvedUrl) { setUrlError(t.urlRequired || '服务器地址不能为空'); return; }
    const mcpRemoteArgs = ['mcp-remote', resolvedUrl];
    for (const [k, v] of Object.entries(headers)) {
      if (k.trim()) mcpRemoteArgs.push('--header', `${k.trim()}: ${v}`);
    }
    setServerType('stdio');
    setCommand('npx');
    setArgs(mcpRemoteArgs);
    setHeaders({});
    setUrl('');
    setUrlError('');
  };

  const buildFormConfig = (): { name: string; config: McpServerConfig } | null => {
    const trimmed = name.trim();
    let valid = true;
    if (!trimmed) { setNameError(t.nameRequired || '名称不能为空'); valid = false; } else setNameError('');
    if (serverType === 'stdio' && !command.trim()) { setCommandError(t.commandRequired || '命令不能为空'); valid = false; } else setCommandError('');
    if (isHttpType(serverType) && !url.trim()) { setUrlError(t.urlRequired || '服务器地址不能为空'); valid = false; } else setUrlError('');
    if (!valid) return null;

    let config: McpServerConfig = {};
    if (serverType === 'stdio') {
      config.command = command.trim();
      if (args.length > 0) config.args = args;
      if (cwd.trim()) config.cwd = cwd.trim();
    } else {
      config.url = url.trim();
      config.transport = serverType as 'sse' | 'streamable-http';
      if (Object.keys(headers).length > 0) config.headers = headers;
    }
    if (Object.keys(env).length > 0) config.env = env;
    if (typeof timeout === 'number' && timeout > 0) {
      (config as any).timeout = timeout;
    }
    if (typeof connectTimeout === 'number' && connectTimeout > 0) {
      (config as any).connect_timeout = connectTimeout;
    }
    if (extraJson.trim()) {
      try { const extra = JSON.parse(extraJson.trim()); config = { ...config, ...extra }; } catch { /* ignore */ }
    }
    return { name: trimmed, config };
  };

  const handleSaveForm = async () => {
    const built = buildFormConfig();
    if (!built) return;
    setSaving(true);
    try {
      await onSave(built.name, built.config, isNew ? undefined : originalName);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveJson = async () => {
    const trimmedName = name.trim() || originalName.trim();
    if (!trimmedName) { return; }
    let parsed: McpServerConfig;
    try {
      parsed = JSON.parse(jsonRaw);
    } catch (e: any) {
      setJsonError(e.message || 'Invalid JSON');
      return;
    }
    setJsonError('');
    setSaving(true);
    try {
      await onSave(trimmedName, parsed, isNew ? undefined : originalName);
    } finally {
      setSaving(false);
    }
  };

  const handleTestForm = async () => {
    const built = buildFormConfig();
    if (!built) return;
    setModalTesting(true);
    setModalTestResult(null);
    try {
      // Save silently without closing the modal (bypass onSave which triggers close+toast)
      await mcpApi.set(built.name, built.config, isNew ? undefined : originalName);
      const result = await mcpApi.test(built.name);
      setModalTestResult(result);
    } catch (err: any) {
      setModalTestResult({
        name: built.name,
        type: serverType,
        ok: false,
        message: err?.message || t.testFailed || '测试失败',
        target: isHttpType(serverType) ? built.config.url : built.config.command,
      });
    } finally {
      setModalTesting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-4 rounded-2xl shadow-2xl overflow-hidden theme-panel sci-card flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-white/5 flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/15 to-purple-500/15 flex items-center justify-center border border-slate-200/50 dark:border-white/10">
            <span className="material-symbols-outlined text-[18px] text-primary">hub</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-[var(--color-text)] dark:text-white">
              {isNew ? t.addServer : t.editServer}
            </h3>
            {!isNew && (
            <p className="text-[10px] theme-text-muted font-mono truncate">
              {name && name !== originalName ? (
                <><span className="line-through opacity-50">{originalName}</span><span className="ms-1 text-primary">→ {name}</span></>
              ) : originalName}
            </p>
          )}
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-white/10">
            <span className="material-symbols-outlined text-[16px] theme-text-muted">close</span>
          </button>
        </div>

        {/* Mode tabs — shown for both new and edit */}
        <div className="px-5 pt-3 shrink-0 flex gap-1 border-b border-slate-200 dark:border-white/5">
          {isNew && (
            <button
              onClick={() => setMode('paste')}
              className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded-t-lg transition-colors border-b-2 -mb-px ${
                mode === 'paste'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent theme-text-muted hover:text-[var(--color-text)] dark:hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">content_paste</span>
              {t.pasteJson || 'Paste JSON'}
            </button>
          )}
          <button
            onClick={() => setMode('form')}
            className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded-t-lg transition-colors border-b-2 -mb-px ${
              mode === 'form'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent theme-text-muted hover:text-[var(--color-text)] dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">edit_note</span>
            {t.manualForm || 'Manual'}
          </button>
          <button
            onClick={() => {
              // Sync current form → jsonRaw when switching to JSON tab
              const built = buildFormConfig();
              if (built) setJsonRaw(JSON.stringify(built.config, null, 2));
              setJsonError('');
              setMode('json');
            }}
            className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded-t-lg transition-colors border-b-2 -mb-px ${
              mode === 'json'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent theme-text-muted hover:text-[var(--color-text)] dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">data_object</span>
            {t.jsonTab || 'JSON'}
          </button>
        </div>

        {/* ── PASTE MODE ── */}
        {mode === 'paste' && (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar neon-scrollbar">
              {/* Instruction */}
              <div className="flex gap-2 items-start p-3 rounded-xl bg-primary/5 border border-primary/15">
                <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">tips_and_updates</span>
                <p className="text-[11px] theme-text-secondary leading-relaxed">
                  {t.pasteJsonHint || 'Paste the MCP server JSON config you received. Supports Claude Desktop format ({ "mcpServers": {...} }) or a single server object.'}
                </p>
              </div>

              {/* Textarea */}
              <textarea
                value={pasteRaw}
                onChange={e => handlePasteChange(e.target.value)}
                placeholder={t.pasteJsonPlaceholder || '{\n  "mcpServers": {\n    "my-server": {\n      "command": "npx",\n      "args": ["-y", "my-mcp-package"]\n    }\n  }\n}'}
                rows={10}
                spellCheck={false}
                className="w-full px-3 py-2.5 theme-field rounded-xl text-[11px] font-mono outline-none focus:border-primary sci-input resize-none leading-relaxed custom-scrollbar"
              />

              {/* Parse error */}
              {pasteError && (
                <p className="text-[11px] text-mac-red flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">error</span>
                  {pasteError}
                </p>
              )}

              {/* Preview of parsed servers */}
              {parsed.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold theme-text-muted uppercase tracking-wider">
                    {t.pastePreview || 'Detected'} ({parsed.length})
                  </p>
                  {parsed.map((p, i) => {
                    const pType = detectType(p.config);
                    return (
                    <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg theme-field">
                      <span className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                        isHttpType(pType) ? 'bg-blue-500/10' : 'bg-primary/10'
                      }`}>
                        <span className="material-symbols-outlined text-[13px] text-primary">
                          {isHttpType(pType) ? 'wifi' : 'terminal'}
                        </span>
                      </span>
                      <div className="flex-1 min-w-0">
                        {p.name ? (
                          <p className="text-[11px] font-bold text-[var(--color-text)] dark:text-white truncate font-mono">{p.name}</p>
                        ) : (
                          <p className="text-[11px] text-amber-500 italic">{t.pasteNoName || 'Name required — fill in form'}</p>
                        )}
                        <p className="text-[10px] theme-text-muted truncate font-mono">
                          {isHttpType(pType) ? p.config.url : p.config.command}
                        </p>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-primary/10 text-primary shrink-0">
                        {SERVER_TYPE_LABELS[pType]}
                      </span>
                      {/* Edit in form button for single unnamed server */}
                      {parsed.length === 1 && (
                        <button
                          type="button"
                          onClick={() => applyToForm(p)}
                          className="h-6 px-2 rounded-md text-[10px] font-bold theme-field theme-text-secondary hover:bg-slate-200 dark:hover:bg-white/10 shrink-0 flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[11px]">edit</span>
                          {t.editInForm || 'Edit'}
                        </button>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-slate-200 dark:border-white/5 flex justify-end gap-2 shrink-0">
              <button onClick={onClose} className="h-8 px-4 text-xs font-bold theme-text-secondary hover:text-[var(--color-text)] dark:hover:text-white">
                {t.cancel}
              </button>
              <button
                onClick={handleSavePaste}
                disabled={saving || parsed.length === 0 || parsed.some(p => !p.name)}
                className="h-8 px-5 bg-primary text-white text-xs font-bold rounded-lg disabled:opacity-40 flex items-center gap-1.5"
              >
                {saving && <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>}
                {saving ? t.saving : (parsed.length > 1 ? `${t.save} (${parsed.length})` : t.save)}
              </button>
            </div>
          </>
        )}

        {/* ── FORM MODE ── */}
        {mode === 'form' && (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar neon-scrollbar">
              {/* Name */}
              <div>
                <label className="text-[10px] font-bold theme-text-muted uppercase tracking-wider mb-1.5 block">
                  {t.serverName}
                </label>
                <input
                  value={name}
                  onChange={e => { setName(e.target.value); setNameError(''); }}
                  placeholder={t.serverNamePlaceholder}
                  className="w-full h-9 px-3 theme-field rounded-lg text-xs font-mono outline-none focus:border-primary sci-input"
                />
                {nameError && <p className="text-[10px] text-mac-red mt-1">{nameError}</p>}
              </div>

              {/* Type */}
              <div>
                <label className="text-[10px] font-bold theme-text-muted uppercase tracking-wider mb-1.5 block">
                  {t.serverType}
                </label>
                <div className="flex gap-2 flex-wrap">
                  {SERVER_TYPES.map(tp => (
                    <button
                      key={tp}
                      type="button"
                      onClick={() => setServerType(tp)}
                      className={`h-8 px-4 rounded-lg text-[11px] font-bold transition-colors ${
                        serverType === tp
                          ? 'bg-primary text-white'
                          : 'theme-field theme-text-secondary hover:bg-slate-200 dark:hover:bg-white/10'
                      }`}
                    >
                      {SERVER_TYPE_LABELS[tp]}
                    </button>
                  ))}
                </div>
              </div>

              {/* stdio fields */}
              {serverType === 'stdio' && (
                <>
                  <div>
                    <label className="text-[10px] font-bold theme-text-muted uppercase tracking-wider mb-1.5 block">
                      {t.command}
                    </label>
                    <input
                      value={command}
                      onChange={e => { setCommand(e.target.value); setCommandError(''); }}
                      placeholder={t.commandPlaceholder}
                      className={`w-full h-9 px-3 theme-field rounded-lg text-xs font-mono outline-none focus:border-primary sci-input ${commandError ? 'border-mac-red' : ''}`}
                    />
                    {commandError && <p className="text-[10px] text-mac-red mt-1">{commandError}</p>}
                  </div>
                  <div>
                    <label className="text-[10px] font-bold theme-text-muted uppercase tracking-wider mb-1.5 block">
                      {t.args}
                    </label>
                    <ArgsEditor
                      args={args}
                      onChange={setArgs}
                      addLabel={t.addArg}
                      placeholder={t.argPlaceholder}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold theme-text-muted uppercase tracking-wider mb-1.5 block">
                      {t.cwd || 'Working Directory'}
                    </label>
                    <input
                      value={cwd}
                      onChange={e => setCwd(e.target.value)}
                      placeholder={t.cwdPlaceholder || '/path/to/project'}
                      className="w-full h-9 px-3 theme-field rounded-lg text-xs font-mono outline-none focus:border-primary sci-input"
                    />
                  </div>
                </>
              )}

              {/* HTTP fields (sse / streamable-http) */}
              {isHttpType(serverType) && (
                <>
                  <div>
                    <label className="text-[10px] font-bold theme-text-muted uppercase tracking-wider mb-1.5 block">
                      {t.serverUrl}
                    </label>
                    <input
                      value={url}
                      onChange={e => { setUrl(e.target.value); setUrlError(''); }}
                      placeholder={t.urlPlaceholder}
                      className={`w-full h-9 px-3 theme-field rounded-lg text-xs font-mono outline-none focus:border-primary sci-input ${urlError ? 'border-mac-red' : ''}`}
                    />
                    {urlError && <p className="text-[10px] text-mac-red mt-1">{urlError}</p>}
                  </div>
                  <div>
                    <label className="text-[10px] font-bold theme-text-muted uppercase tracking-wider mb-1.5 block">
                      {t.headers || 'Headers'}
                    </label>
                    <EnvEditor
                      env={headers}
                      onChange={setHeaders}
                      addLabel={t.addHeader || 'Add Header'}
                      keyPlaceholder={t.headerKeyPlaceholder || 'Header name'}
                      valuePlaceholder={t.headerValuePlaceholder || 'Value'}
                    />
                  </div>
                </>
              )}

              {/* Timeouts */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold theme-text-muted uppercase tracking-wider mb-1.5 block">
                    {t.toolTimeout || 'Tool Timeout (s)'}
                  </label>
                  <input
                    type="number"
                    value={timeout}
                    onChange={e => setTimeout_(e.target.value ? Number(e.target.value) : '')}
                    placeholder="120"
                    min={0}
                    step={10}
                    className="w-full h-9 px-3 theme-field rounded-lg text-xs font-mono outline-none focus:border-primary sci-input"
                  />
                  <p className="text-[10px] theme-text-muted mt-0.5">{t.toolTimeoutHint || 'Per-tool-call timeout. Default: 120s.'}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold theme-text-muted uppercase tracking-wider mb-1.5 block">
                    {t.connectTimeout || 'Connect Timeout (s)'}
                  </label>
                  <input
                    type="number"
                    value={connectTimeout}
                    onChange={e => setConnectTimeout(e.target.value ? Number(e.target.value) : '')}
                    placeholder="60"
                    min={0}
                    step={10}
                    className="w-full h-9 px-3 theme-field rounded-lg text-xs font-mono outline-none focus:border-primary sci-input"
                  />
                  <p className="text-[10px] theme-text-muted mt-0.5">{t.connectTimeoutHint || 'Initial connection timeout. Default: 60s.'}</p>
                </div>
              </div>

              {/* Env */}
              <div>
                <label className="text-[10px] font-bold theme-text-muted uppercase tracking-wider mb-1.5 block">
                  {t.envVars}
                </label>
                <EnvEditor
                  env={env}
                  onChange={setEnv}
                  addLabel={t.addEnv}
                  keyPlaceholder={t.envKeyPlaceholder}
                  valuePlaceholder={t.envValuePlaceholder}
                />
              </div>

              {/* mcp-remote bridge — shown for HTTP servers */}
              {isHttpType(serverType) && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={convertToMcpRemote}
                    className="flex items-center gap-1.5 px-3 h-7 rounded-lg text-[11px] font-medium border theme-border theme-text-secondary hover:border-primary hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
                    {t.convertToMcpRemote || 'Convert to mcp-remote (stdio)'}
                  </button>
                  <p className="text-[10px] theme-text-muted mt-1">{t.convertToMcpRemoteHint || 'Bridges this HTTP server via mcp-remote so stdio-only runtimes can connect.'}</p>
                </div>
              )}

              {/* Extra JSON */}
              <div>
                <label className="text-[10px] font-bold theme-text-muted uppercase tracking-wider mb-1.5 block">
                  {t.extraJson}
                </label>
                <textarea
                  value={extraJson}
                  onChange={e => setExtraJson(e.target.value)}
                  placeholder={t.extraJsonPlaceholder}
                  rows={3}
                  className="w-full px-3 py-2 theme-field rounded-lg text-[11px] font-mono outline-none focus:border-primary sci-input resize-none"
                />
                <p className="text-[10px] theme-text-muted mt-0.5">{t.extraJsonHint}</p>
              </div>
            </div>
            {/* Inline test result */}
            {modalTestResult && (
              <div className={`mx-5 mb-2 rounded-xl border px-3 py-2 text-[10px] ${
                modalTestResult.ok
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-mac-red/20 bg-mac-red/10 text-mac-red'
              }`}>
                <div className="flex items-center gap-1.5 font-bold">
                  <span className="material-symbols-outlined text-[13px]">{modalTestResult.ok ? 'check_circle' : 'error'}</span>
                  <span className="flex-1">{modalTestResult.ok ? (t.testSuccess || '测试成功') : (t.testFailed || '测试失败')}</span>
                  <button onClick={() => setModalTestResult(null)} className="opacity-50 hover:opacity-100">
                    <span className="material-symbols-outlined text-[13px]">close</span>
                  </button>
                </div>
                <p className="mt-1 break-all opacity-90">{modalTestResult.message}</p>
              </div>
            )}
            <div className="px-5 py-3 border-t border-slate-200 dark:border-white/5 flex items-center gap-2 shrink-0">
              <button onClick={onClose} className="h-8 px-4 text-xs font-bold theme-text-secondary hover:text-[var(--color-text)] dark:hover:text-white">
                {t.cancel}
              </button>
              <div className="flex-1" />
              <button
                onClick={handleTestForm}
                disabled={saving || modalTesting}
                className="h-8 px-4 theme-field text-primary text-xs font-bold rounded-lg disabled:opacity-50 flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <span className={`material-symbols-outlined text-[13px] ${modalTesting ? 'animate-spin' : ''}`}>
                  {modalTesting ? 'progress_activity' : 'network_check'}
                </span>
                {modalTesting ? (t.testing || '测试中...') : (t.test || '测试')}
              </button>
              <button
                onClick={handleSaveForm}
                disabled={saving || modalTesting}
                className="h-8 px-5 bg-primary text-white text-xs font-bold rounded-lg disabled:opacity-50 flex items-center gap-1.5"
              >
                {saving && <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>}
                {saving ? t.saving : t.save}
              </button>
            </div>
          </>
        )}

        {/* ── JSON MODE ── */}
        {mode === 'json' && (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar neon-scrollbar">
              {/* Name field (still needed for new servers) */}
              {isNew && (
                <div>
                  <label className="text-[10px] font-bold theme-text-muted uppercase tracking-wider mb-1.5 block">
                    {t.serverName}
                  </label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={t.serverNamePlaceholder}
                    className="w-full h-9 px-3 theme-field rounded-lg text-xs font-mono outline-none focus:border-primary sci-input"
                  />
                </div>
              )}
              <div>
                <label className="text-[10px] font-bold theme-text-muted uppercase tracking-wider mb-1.5 block">
                  {t.jsonTabConfig || 'Server Config (JSON)'}
                </label>
                <textarea
                  value={jsonRaw}
                  onChange={e => {
                    setJsonRaw(e.target.value);
                    try { JSON.parse(e.target.value); setJsonError(''); }
                    catch (err: any) { setJsonError(err.message || 'Invalid JSON'); }
                  }}
                  spellCheck={false}
                  rows={16}
                  className="w-full px-3 py-2.5 theme-field rounded-xl text-[11px] font-mono outline-none sci-input resize-none leading-relaxed custom-scrollbar neon-scrollbar focus:border-primary"
                  style={jsonError ? { borderColor: 'var(--color-mac-red, #ff5f57)' } : undefined}
                />
                {jsonError && (
                  <p className="text-[10px] text-mac-red mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">error</span>
                    {jsonError}
                  </p>
                )}
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-200 dark:border-white/5 flex items-center gap-2 shrink-0">
              <button onClick={onClose} className="h-8 px-4 text-xs font-bold theme-text-secondary hover:text-[var(--color-text)] dark:hover:text-white">
                {t.cancel}
              </button>
              <div className="flex-1" />
              <button
                onClick={handleSaveJson}
                disabled={saving}
                className="h-8 px-5 bg-primary text-white text-xs font-bold rounded-lg disabled:opacity-50 flex items-center gap-1.5"
              >
                {saving && <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>}
                {saving ? t.saving : t.save}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Server Card ──────────────────────────────────────────────────────────────
const ServerCard: React.FC<{
  entry: McpServerEntry;
  t: any;
  testResult?: McpServerTestResult;
  testing?: boolean;
  onTest: () => void;
  onDismissTest: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ entry, t, testResult, testing, onTest, onDismissTest, onEdit, onDelete }) => {
  const cfg = entry.config;
  const type = detectType(cfg);
  const [expanded, setExpanded] = useState(false);
  const [toolsExpanded, setToolsExpanded] = useState(false);

  return (
    <div className="theme-panel rounded-2xl p-4 flex flex-col gap-2 sci-card hover:border-primary/40 transition-all group">
      {/* Header row */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/10 to-purple-500/10 flex items-center justify-center border border-slate-200/50 dark:border-white/5 shrink-0">
          <span className="material-symbols-outlined text-[16px] text-primary">
            {isHttpType(type) ? 'wifi' : 'terminal'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-[13px] text-slate-800 dark:text-white truncate">{entry.name}</h4>
          <p className="text-[10px] theme-text-muted truncate font-mono">
            {isHttpType(type) ? (cfg.url || '—') : (cfg.command || '—')}
          </p>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
          isHttpType(type)
            ? 'bg-blue-500/10 text-blue-500'
            : 'bg-primary/10 text-primary'
        }`}>
          {SERVER_TYPE_LABELS[type]}
        </span>
      </div>

      {/* Tags row */}
      <div className="flex flex-wrap gap-1">
        {cfg.args && cfg.args.length > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full theme-field theme-text-muted">
            {cfg.args.length} {t.argsCount}
          </span>
        )}
        {cfg.env && Object.keys(cfg.env).length > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full theme-field theme-text-muted">
            {Object.keys(cfg.env).length} {t.envCount}
          </span>
        )}
        {cfg.headers && Object.keys(cfg.headers).length > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full theme-field theme-text-muted">
            {Object.keys(cfg.headers).length} {t.headersCount || 'headers'}
          </span>
        )}
        {(cfg as any).timeout && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full theme-field theme-text-muted">
            {(cfg as any).timeout}s {t.toolTimeoutTag || 'timeout'}
          </span>
        )}
        {(cfg as any).connect_timeout && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full theme-field theme-text-muted">
            {(cfg as any).connect_timeout}s {t.connectTimeoutTag || 'connect'}
          </span>
        )}
        {(cfg.cwd || cfg.workingDirectory) && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full theme-field theme-text-muted" title={cfg.cwd || cfg.workingDirectory}>
            cwd
          </span>
        )}
      </div>

      {testResult && (
        <div className={`rounded-xl border px-3 py-2 text-[10px] ${
          testResult.ok
            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'border-mac-red/20 bg-mac-red/10 text-mac-red'
        }`}>
          <div className="flex items-center gap-1.5 font-bold">
            <span className="material-symbols-outlined text-[13px]">
              {testResult.ok ? 'check_circle' : 'error'}
            </span>
            <span className="flex-1">{testResult.ok ? (t.testSuccess || '测试成功') : (t.testFailed || '测试失败')}</span>
            <button
              onClick={onDismissTest}
              className="ms-auto opacity-50 hover:opacity-100 transition-opacity"
              title={t.testDismiss || '收起'}
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          </div>
          <div className="mt-1 break-all opacity-90">{testResult.message}</div>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px]">
            {testResult.target && (
              <div className="rounded-lg bg-black/5 dark:bg-white/5 px-2 py-1 min-w-0">
                <div className="opacity-70">{t.testTarget || '目标'}</div>
                <div className="font-mono break-all">{testResult.target}</div>
              </div>
            )}
            {typeof testResult.statusCode === 'number' && (
              <div className="rounded-lg bg-black/5 dark:bg-white/5 px-2 py-1 min-w-0">
                <div className="opacity-70">{t.testHttpStatus || 'HTTP 状态'}</div>
                <div className="font-mono">{testResult.statusCode} {testResult.statusText || ''}</div>
              </div>
            )}
            {testResult.stage && (
              <div className="rounded-lg bg-black/5 dark:bg-white/5 px-2 py-1 min-w-0">
                <div className="opacity-70">{t.testStage || '阶段'}</div>
                <div className="font-mono break-all">{testResult.stage}</div>
              </div>
            )}
            {testResult.category && (
              <div className="rounded-lg bg-black/5 dark:bg-white/5 px-2 py-1 min-w-0">
                <div className="opacity-70">{t.testCategory || '错误分类'}</div>
                <div className="font-mono break-all">{testResult.category}</div>
              </div>
            )}
            {testResult.protocol && (
              <div className="rounded-lg bg-black/5 dark:bg-white/5 px-2 py-1 min-w-0">
                <div className="opacity-70">{t.testProtocol || 'MCP 协议版本'}</div>
                <div className="font-mono break-all">{testResult.protocol}</div>
              </div>
            )}
            {testResult.serverName && (
              <div className="rounded-lg bg-black/5 dark:bg-white/5 px-2 py-1 min-w-0">
                <div className="opacity-70">{t.testServerInfo || '服务端信息'}</div>
                <div className="font-mono break-all">{testResult.serverName}{testResult.serverVersion ? ` ${testResult.serverVersion}` : ''}</div>
              </div>
            )}
            {testResult.resolvedPath && (
              <div className="rounded-lg bg-black/5 dark:bg-white/5 px-2 py-1 sm:col-span-2 min-w-0">
                <div className="opacity-70">{t.testResolvedPath || '可执行路径'}</div>
                <div className="font-mono break-all">{testResult.resolvedPath}</div>
              </div>
            )}
          </div>
          {testResult.details && Object.keys(testResult.details).length > 0 && (
            <div className="mt-2 rounded-lg bg-black/5 dark:bg-white/5 px-2 py-2 min-w-0">
              <div className="opacity-70 mb-1">{t.testDetails || '详细信息'}</div>
              <div className="space-y-1">
                {Object.entries(testResult.details).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-[88px_minmax(0,1fr)] gap-2">
                    <div className="opacity-70 font-mono truncate">{key}</div>
                    <div className="font-mono break-all">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {testResult.tools && testResult.tools.length > 0 && (
            <div className="mt-2 rounded-lg bg-black/5 dark:bg-white/5 min-w-0 overflow-hidden">
              <button
                onClick={() => setToolsExpanded(v => !v)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <span className="material-symbols-outlined text-[12px] opacity-60">build</span>
                <span className="opacity-70 flex-1">
                  {t.testTools || '工具列表'}
                  <span className="ms-1 opacity-60">({testResult.tools.length})</span>
                </span>
                <span className={`material-symbols-outlined text-[12px] opacity-50 transition-transform duration-200 ${toolsExpanded ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>
              {toolsExpanded && (
                <div className="px-2 pb-2 space-y-1.5">
                  {testResult.tools.map((tool: McpToolInfo) => (
                    <div key={tool.name} className="rounded-md bg-black/5 dark:bg-white/5 px-2 py-1.5">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-mono text-[9px] font-bold opacity-90 truncate">{tool.name}</span>
                        {tool.title && tool.title !== tool.name && (
                          <span className="text-[9px] opacity-50 truncate">· {tool.title}</span>
                        )}
                      </div>
                      {tool.description && (
                        <div className="opacity-60 text-[9px] leading-relaxed line-clamp-2" title={tool.description}>
                          {tool.description.split('\n')[0]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Expanded JSON view — redact sensitive values */}
      {expanded && (
        <pre className="text-[10px] theme-field rounded-lg p-3 font-mono overflow-x-auto whitespace-pre-wrap break-all theme-text-secondary max-h-48 overflow-y-auto custom-scrollbar neon-scrollbar">
          {JSON.stringify(cfg, (key, value) => {
            if (typeof value !== 'string') return value;
            if (key === 'headers' || key === 'env') return value;
            const parent = key;
            if (isSensitiveHeader(parent) || isSensitiveEnv(parent)) return redactValue(value);
            return value;
          }, 2)}
        </pre>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1.5 mt-1">
        <button
          onClick={() => setExpanded(!expanded)}
          className="h-7 px-2.5 theme-field theme-text-muted text-[10px] font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[12px]">{expanded ? 'expand_less' : 'data_object'}</span>
          {expanded ? t.hide : t.viewJson}
        </button>
        <div className="flex-1" />
        <button
          onClick={onTest}
          disabled={testing}
          className="h-7 px-2.5 theme-field text-primary text-[10px] font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 flex items-center gap-1 disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-[12px] ${testing ? 'animate-spin' : ''}`}>
            {testing ? 'progress_activity' : 'network_check'}
          </span>
          {testing ? (t.testing || '测试中...') : (t.test || '测试')}
        </button>
        <button
          onClick={onEdit}
          className="h-7 px-2.5 theme-field theme-text-secondary text-[10px] font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[12px]">edit</span>
          {t.edit}
        </button>
        <button
          onClick={onDelete}
          className="h-7 px-2.5 text-[10px] font-bold rounded-lg bg-mac-red/10 text-mac-red hover:bg-mac-red/20 flex items-center gap-1 transition-colors"
        >
          <span className="material-symbols-outlined text-[12px]">delete</span>
          {t.delete}
        </button>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const McpCenter: React.FC<McpCenterProps> = ({ language }) => {
  const t = useMemo(() => {
    const testText = language === 'zh' || language === 'zh-TW'
      ? {
        test: '测试',
        testing: '测试中...',
        testSuccess: '测试成功',
        testFailed: '测试失败',
      }
      : {
        test: 'Test',
        testing: 'Testing...',
        testSuccess: 'Test passed',
        testFailed: 'Test failed',
      };
    return { ...testText, ...((getTranslation(language) as any).sk?.mcp ?? {}) };
  }, [language]);
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const [servers, setServers] = useState<McpServerEntry[]>([]);
  const [configPath, setConfigPath] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editEntry, setEditEntry] = useState<McpServerEntry | null | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [testingMap, setTestingMap] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, McpServerTestResult>>({});
  const reqSeqRef = useRef(0);

  const fetchServers = useCallback(async () => {
    const reqId = ++reqSeqRef.current;
    setLoading(true);
    setError('');
    try {
      const res = await mcpApi.list();
      if (reqId !== reqSeqRef.current) return;
      setServers(res.servers ?? []);
      setConfigPath(res.path ?? '');
    } catch (err: any) {
      if (reqId !== reqSeqRef.current) return;
      setError(err?.message || t.loadFailed);
    } finally {
      if (reqId === reqSeqRef.current) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  const handleSave = async (name: string, config: McpServerConfig, oldName?: string) => {
    await mcpApi.set(name, config, oldName);
    toast('success', t.savedOk);
    setEditEntry(undefined);
    if (oldName && oldName !== name) {
      setTestResults(prev => {
        const next = { ...prev };
        delete next[oldName];
        return next;
      });
    }
    await fetchServers();
  };

  const handleSaveBatch = async (servers: ParsedServer[]) => {
    for (const s of servers) {
      await mcpApi.set(s.name, s.config);
    }
    toast('success', servers.length > 1 ? `${servers.length} ${t.serverCount || 'servers'} ${t.savedOk || 'saved'}` : t.savedOk);
    setEditEntry(undefined);
    await fetchServers();
  };

  const handleDelete = async (entry: McpServerEntry) => {
    const ok = await confirm({
      title: t.deleteConfirmTitle,
      message: `${t.deleteConfirmDesc} "${entry.name}"?`,
      danger: true,
    });
    if (!ok) return;
    try {
      await mcpApi.delete(entry.name);
      toast('success', t.deletedOk);
      await fetchServers();
    } catch (err: any) {
      toast('error', err?.message || t.deleteFailed);
    }
  };

  const handleDismissTest = (entry: McpServerEntry) => {
    setTestResults(prev => {
      const next = { ...prev };
      delete next[entry.name];
      return next;
    });
  };

  const handleTest = async (entry: McpServerEntry) => {
    setTestingMap(prev => ({ ...prev, [entry.name]: true }));
    try {
      const result = await mcpApi.test(entry.name);
      setTestResults(prev => ({ ...prev, [entry.name]: result }));
      toast(result.ok ? 'success' : 'error', `${entry.name}: ${result.message}`);
    } catch (err: any) {
      const message = err?.message || t.testFailed || '测试失败';
      const fallbackResult: McpServerTestResult = {
        name: entry.name,
        type: detectType(entry.config),
        ok: false,
        message,
        target: entry.config.url || entry.config.command,
      };
      setTestResults(prev => ({ ...prev, [entry.name]: fallbackResult }));
      toast('error', `${entry.name}: ${message}`);
    } finally {
      setTestingMap(prev => ({ ...prev, [entry.name]: false }));
    }
  };

  const filtered = servers.filter(s =>
    !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-white/5 shrink-0">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <span className="material-symbols-outlined absolute start-2.5 top-1/2 -translate-y-1/2 text-[14px] theme-text-muted pointer-events-none">search</span>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t.search}
            className="w-full h-8 ps-8 pe-3 theme-field rounded-lg text-xs outline-none focus:border-primary sci-input"
          />
        </div>

        <div className="flex-1" />

        {/* Config path hint */}
        {configPath && (
          <span className="text-[10px] theme-text-muted hidden lg:block truncate max-w-[240px]" title={configPath}>
            {configPath}
          </span>
        )}

        {/* Refresh */}
        <button
          onClick={fetchServers}
          disabled={loading}
          className="h-8 w-8 flex items-center justify-center theme-field rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-50"
          title={t.refresh}
        >
          <span className={`material-symbols-outlined text-[16px] theme-text-secondary ${loading ? 'animate-spin' : ''}`}>
            {loading ? 'progress_activity' : 'refresh'}
          </span>
        </button>

        {/* Add */}
        <button
          onClick={() => setEditEntry(null)}
          className="h-8 px-3 bg-primary text-white text-[11px] font-bold rounded-lg hover:bg-primary/90 flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[14px]">add</span>
          {t.addServer}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar neon-scrollbar">
        {/* Error */}
        {error && !loading && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-mac-red/10 border border-mac-red/20 mb-4">
            <span className="material-symbols-outlined text-[18px] text-mac-red shrink-0">error</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-mac-red">{t.loadFailed}</p>
              <p className="text-[10px] theme-text-muted mt-0.5 truncate">{error}</p>
            </div>
            <button onClick={fetchServers} className="h-7 px-3 bg-mac-red/10 text-mac-red text-[10px] font-bold rounded-lg hover:bg-mac-red/20 shrink-0">
              {t.retry}
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && servers.length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="theme-panel rounded-2xl p-4 sci-card animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-white/5 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-slate-200 dark:bg-white/5 rounded w-2/3" />
                    <div className="h-2.5 bg-slate-200 dark:bg-white/5 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-7 bg-slate-200 dark:bg-white/5 rounded-lg" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && servers.length === 0 && (
          <EmptyState
            icon="hub"
            title={t.noServers}
            description={t.noServersDesc}
            action={{ label: t.addServer, onClick: () => setEditEntry(null) }}
          />
        )}

        {/* No search results */}
        {!loading && servers.length > 0 && filtered.length === 0 && (
          <EmptyState
            icon="search_off"
            title={t.noResults}
            description={t.noResultsDesc}
          />
        )}

        {/* Server list */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map(entry => (
              <ServerCard
                key={entry.name}
                entry={entry}
                t={t}
                testResult={testResults[entry.name]}
                testing={!!testingMap[entry.name]}
                onTest={() => handleTest(entry)}
                onDismissTest={() => handleDismissTest(entry)}
                onEdit={() => setEditEntry(entry)}
                onDelete={() => handleDelete(entry)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info footer */}
      <div className="px-4 py-2 border-t border-slate-200 dark:border-white/5 flex items-center gap-2 shrink-0">
        <span className="material-symbols-outlined text-[13px] theme-text-muted">info</span>
        <p className="text-[10px] theme-text-muted">
          {t.footerHint}
        </p>
        <div className="flex-1" />
        <span className="text-[10px] theme-text-muted font-mono">
          {servers.length} {t.serverCount}
        </span>
      </div>

      {/* Edit / Add modal */}
      {editEntry !== undefined && (
        <EditModal
          entry={editEntry}
          language={language}
          onSave={handleSave}
          onSaveBatch={handleSaveBatch}
          onClose={() => setEditEntry(undefined)}
        />
      )}
    </div>
  );
};

export default McpCenter;
