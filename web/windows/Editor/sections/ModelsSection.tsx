import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { SectionProps } from '../sectionTypes';
import { ConfigSection, ConfigCard, TextField, PasswordField, SelectField, NumberField, SwitchField, EmptyState } from '../fields';
import { post } from '../../../services/request';
import { getTranslation } from '../../../locales';
import { useToast } from '../../../components/Toast';
import { useConfirm } from '../../../components/ConfirmDialog';
import { schemaTooltip } from '../schemaTooltip';
import ProviderHealthGrid from '../../../components/ProviderHealthGrid';

// ============================================================================
// hermes-agent provider presets
// ============================================================================
// hermes-agent config.yaml structure:
//   model: "anthropic/claude-sonnet-4-5"        # top-level model string
//   providers:                                    # dict of provider overrides
//     my-provider:
//       api: "https://..."                        # base URL
//       api_key: "sk-..."                         # API key
//       transport: "openai"                       # optional transport
//       name: "Display Name"                      # optional display name
//   fallback_providers: ["openrouter", ...]       # fallback provider IDs
//   delegation:
//     model: ""                                   # subagent model override
//     provider: ""                                # subagent provider override

interface ProviderPreset {
  id: string;
  name: string;
  icon: string;
  category: 'builtin' | 'oauth' | 'local' | 'custom';
  envVars: string[];
  defaultModel: string;
  models: { id: string; name: string; ctx?: string }[];
  baseUrl: string;
  helpUrl?: string;
  needsBaseUrl?: boolean;
  labelKey?: string;
}

const ZH_PROVIDER_NAMES: Record<string, string> = {
  deepseek: '深度求索',
  minimax: 'MiniMax',
  'minimax-cn': 'MiniMax 中国',
  'kimi-coding': 'Kimi / 月之暗面',
  zai: '智谱 Z.AI',
  alibaba: '阿里云 DashScope',
  huggingface: 'Hugging Face',
  nvidia: '英伟达 NIM',
  stepfun: '阶跃星辰',
  xiaomi: '小米 MiMo',
};

interface ProviderTestResult {
  status: 'idle' | 'testing' | 'ok' | 'fail' | 'warning';
  latencyMs?: number;
  model?: string;
  message?: string;
  error?: string;
}

function resolveProviderDisplayName(params: { language: string; providerId: string; fallbackName: string }): string {
  const lang = params.language.toLowerCase();
  if (!lang.startsWith('zh')) return params.fallbackName;
  return ZH_PROVIDER_NAMES[params.providerId] || params.fallbackName;
}

function formatFriendlyError(err: any, es: any): string {
  const raw = String(err?.message || '').trim();
  const lower = raw.toLowerCase();
  const msgMatch = raw.match(/HTTP\s*[:\s]?(\d{3})/i);
  const msgStatus = msgMatch ? Number(msgMatch[1]) : null;
  const direct = Number(err?.status ?? err?.response?.status ?? err?.code);
  const directOk = Number.isFinite(direct) && direct >= 100 && direct <= 599;
  const status = (msgStatus && msgStatus >= 100 && msgStatus <= 599) ? msgStatus : (directOk ? direct : null);
  const withStatus = (msg: string) => (status ? `${msg} (HTTP ${status})` : msg);

  if (status === 401 || status === 403) return withStatus(es.errAuthForbidden);
  if (status === 404) return withStatus(es.errEndpointNotFound);
  if (status === 429) return withStatus(es.errRateLimited);
  if (status && status >= 500) return withStatus(es.errServerUnavailable);
  if (lower.includes('<!doctype') || lower.includes('<html')) return withStatus(es.errEndpointReturnedHtml);
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('ecconnrefused') || lower.includes('timeout')) return es.errNetworkUnavailable;
  if (raw) return raw.length > 200 ? `${raw.slice(0, 200)}...` : raw;
  return es.errOperationFailed || es.failed;
}

// Provider presets aligned with hermes-agent PROVIDER_REGISTRY (auth.py)
const PROVIDERS: ProviderPreset[] = [
  { id: 'openrouter', name: 'OpenRouter', icon: '🔀', category: 'builtin', envVars: ['OPENROUTER_API_KEY', 'OPENAI_API_KEY'], defaultModel: 'anthropic/claude-sonnet-4-5', models: [
    { id: 'anthropic/claude-sonnet-4-5', name: 'Claude Sonnet 4.5', ctx: '200K' },
    { id: 'anthropic/claude-opus-4-6', name: 'Claude Opus 4', ctx: '200K' },
    { id: 'google/gemini-2.5-flash-preview', name: 'Gemini 2.5 Flash', ctx: '1M' },
    { id: 'openai/gpt-4o', name: 'GPT-4o', ctx: '128K' },
  ], baseUrl: 'https://openrouter.ai/api/v1', helpUrl: 'https://openrouter.ai' },
  { id: 'anthropic', name: 'Anthropic', icon: '🅰️', category: 'builtin', envVars: ['ANTHROPIC_API_KEY'], defaultModel: 'claude-sonnet-4-5', models: [
    { id: 'claude-opus-4-6', name: 'Claude Opus 4', ctx: '200K' },
    { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', ctx: '200K' },
    { id: 'claude-sonnet-4-1', name: 'Claude Sonnet 4.1', ctx: '200K' },
  ], baseUrl: 'https://api.anthropic.com', helpUrl: 'https://console.anthropic.com' },
  { id: 'gemini', name: 'Google AI Studio', icon: '✨', category: 'builtin', envVars: ['GOOGLE_API_KEY', 'GEMINI_API_KEY'], defaultModel: 'gemini-2.5-flash', models: [
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', ctx: '1M' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', ctx: '1M' },
  ], baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', helpUrl: 'https://aistudio.google.com' },
  { id: 'copilot', name: 'GitHub Copilot', icon: '🐙', category: 'builtin', envVars: ['COPILOT_GITHUB_TOKEN', 'GH_TOKEN', 'GITHUB_TOKEN'], defaultModel: 'claude-sonnet-4-5', models: [
    { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', ctx: '200K' },
    { id: 'gpt-4o', name: 'GPT-4o', ctx: '128K' },
  ], baseUrl: 'https://api.githubcopilot.com', helpUrl: 'https://github.com/features/copilot' },
  { id: 'deepseek', name: 'DeepSeek', icon: '🐋', category: 'builtin', envVars: ['DEEPSEEK_API_KEY'], defaultModel: 'deepseek-chat', models: [
    { id: 'deepseek-chat', name: 'DeepSeek Chat', ctx: '64K' },
    { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', ctx: '64K' },
  ], baseUrl: 'https://api.deepseek.com/v1', helpUrl: 'https://platform.deepseek.com' },
  { id: 'xai', name: 'xAI', icon: '✖️', category: 'builtin', envVars: ['XAI_API_KEY'], defaultModel: 'grok-3', models: [
    { id: 'grok-3', name: 'Grok 3', ctx: '128K' },
    { id: 'grok-3-mini', name: 'Grok 3 Mini', ctx: '128K' },
  ], baseUrl: 'https://api.x.ai/v1', helpUrl: 'https://x.ai/api' },
  { id: 'zai', name: 'Z.AI / GLM', icon: '🧿', category: 'builtin', envVars: ['GLM_API_KEY', 'ZAI_API_KEY'], defaultModel: 'glm-4-plus', models: [
    { id: 'glm-4-plus', name: 'GLM-4 Plus', ctx: '128K' },
    { id: 'glm-4-flash', name: 'GLM-4 Flash', ctx: '128K' },
  ], baseUrl: 'https://api.z.ai/api/paas/v4', helpUrl: 'https://open.bigmodel.cn' },
  { id: 'kimi-coding', name: 'Kimi / Moonshot', icon: '🌙', category: 'builtin', envVars: ['KIMI_API_KEY'], defaultModel: 'kimi-k2', models: [
    { id: 'kimi-k2', name: 'Kimi K2', ctx: '128K' },
  ], baseUrl: 'https://api.moonshot.ai/v1', helpUrl: 'https://kimi.ai' },
  { id: 'minimax', name: 'MiniMax', icon: 'Ⓜ️', category: 'builtin', envVars: ['MINIMAX_API_KEY'], defaultModel: 'MiniMax-M2', models: [
    { id: 'MiniMax-M2', name: 'MiniMax M2', ctx: '200K' },
  ], baseUrl: 'https://api.minimax.io/anthropic', helpUrl: 'https://platform.minimaxi.com' },
  { id: 'minimax-cn', name: 'MiniMax (China)', icon: 'Ⓜ️', category: 'builtin', envVars: ['MINIMAX_CN_API_KEY'], defaultModel: 'MiniMax-M2', models: [
    { id: 'MiniMax-M2', name: 'MiniMax M2', ctx: '200K' },
  ], baseUrl: 'https://api.minimaxi.com/anthropic', helpUrl: 'https://platform.minimaxi.com' },
  { id: 'alibaba', name: 'Alibaba DashScope', icon: '☁️', category: 'builtin', envVars: ['DASHSCOPE_API_KEY'], defaultModel: 'qwen-max', models: [
    { id: 'qwen-max', name: 'Qwen Max', ctx: '128K' },
    { id: 'qwen-turbo', name: 'Qwen Turbo', ctx: '128K' },
  ], baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1', helpUrl: 'https://dashscope.aliyun.com' },
  { id: 'huggingface', name: 'Hugging Face', icon: '🤗', category: 'builtin', envVars: ['HF_TOKEN'], defaultModel: 'meta-llama/Llama-3.3-70B-Instruct', models: [], baseUrl: 'https://router.huggingface.co/v1', helpUrl: 'https://huggingface.co/inference-api' },
  { id: 'ai-gateway', name: 'AI Gateway', icon: '▲', category: 'builtin', envVars: ['AI_GATEWAY_API_KEY'], defaultModel: 'anthropic/claude-sonnet-4-5', models: [], baseUrl: 'https://ai-gateway.vercel.sh/v1', helpUrl: 'https://vercel.com/docs/ai-gateway' },
  { id: 'opencode-zen', name: 'OpenCode Zen', icon: '💻', category: 'builtin', envVars: ['OPENCODE_ZEN_API_KEY'], defaultModel: 'claude-opus-4-6', models: [], baseUrl: 'https://opencode.ai/zen/v1', helpUrl: 'https://opencode.ai' },
  { id: 'opencode-go', name: 'OpenCode Go', icon: '💻', category: 'builtin', envVars: ['OPENCODE_GO_API_KEY'], defaultModel: 'glm-4-plus', models: [], baseUrl: 'https://opencode.ai/zen/go/v1', helpUrl: 'https://opencode.ai' },
  { id: 'kilocode', name: 'Kilo Code', icon: '📊', category: 'builtin', envVars: ['KILOCODE_API_KEY'], defaultModel: 'claude-opus-4-6', models: [], baseUrl: 'https://api.kilo.ai/api/gateway', helpUrl: 'https://kilo.ai' },
  { id: 'arceeai', name: 'Arcee AI', icon: '🏹', category: 'builtin', envVars: ['ARCEEAI_API_KEY'], defaultModel: 'arcee-blitz', models: [], baseUrl: 'https://conductor.arcee.ai/v1', helpUrl: 'https://chat.arcee.ai' },
  { id: 'ollama-cloud', name: 'Ollama Cloud', icon: '☁️', category: 'builtin', envVars: ['OLLAMA_API_KEY'], defaultModel: '', models: [], baseUrl: 'https://ollama.com/v1', helpUrl: 'https://ollama.com/settings' },
  { id: 'nvidia', name: 'NVIDIA NIM', icon: '🟢', category: 'builtin', envVars: ['NVIDIA_API_KEY'], defaultModel: 'meta/llama-3.3-70b-instruct', models: [
    { id: 'meta/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', ctx: '128K' },
  ], baseUrl: 'https://integrate.api.nvidia.com/v1', helpUrl: 'https://build.nvidia.com' },
  { id: 'stepfun', name: 'StepFun', icon: '🪜', category: 'builtin', envVars: ['STEPFUN_API_KEY'], defaultModel: 'step-2-16k', models: [
    { id: 'step-2-16k', name: 'Step 2 16K', ctx: '16K' },
  ], baseUrl: 'https://api.stepfun.com/v1', helpUrl: 'https://platform.stepfun.com' },
  { id: 'xiaomi', name: 'Xiaomi MiMo', icon: '📱', category: 'builtin', envVars: ['XIAOMI_API_KEY'], defaultModel: 'MiMo-7B-RL', models: [
    { id: 'MiMo-7B-RL', name: 'MiMo 7B RL', ctx: '128K' },
  ], baseUrl: 'https://api.xiaomi.com/v1', helpUrl: 'https://xiaomi.com/ai' },
  // ── OAuth providers ──
  { id: 'nous', name: 'Nous Portal', icon: '🧠', category: 'oauth', envVars: [], defaultModel: '', models: [], baseUrl: 'https://inference-api.nousresearch.com/v1', helpUrl: 'https://portal.nousresearch.com' },
  { id: 'openai-codex', name: 'OpenAI Codex', icon: '🤖', category: 'oauth', envVars: [], defaultModel: 'codex-mini-latest', models: [
    { id: 'codex-mini-latest', name: 'Codex Mini', ctx: '192K' },
  ], baseUrl: 'https://chatgpt.com/backend-api/codex', helpUrl: 'https://chatgpt.com/codex' },
  { id: 'qwen-oauth', name: 'Qwen OAuth', icon: '🔮', category: 'oauth', envVars: [], defaultModel: 'qwen3-coder', models: [
    { id: 'qwen3-coder', name: 'Qwen 3 Coder', ctx: '128K' },
  ], baseUrl: 'https://portal.qwen.ai/v1', helpUrl: 'https://portal.qwen.ai' },
  // ── Local runners ──
  { id: 'ollama', name: 'Ollama', icon: '🦙', category: 'local', envVars: [], defaultModel: 'llama3', models: [], baseUrl: 'http://localhost:11434/v1', needsBaseUrl: true, helpUrl: 'https://ollama.com' },
  { id: 'lmstudio', name: 'LM Studio', icon: '🖥️', category: 'local', envVars: [], defaultModel: 'local-model', models: [], baseUrl: 'http://localhost:1234/v1', needsBaseUrl: true, helpUrl: 'https://lmstudio.ai' },
  { id: 'vllm', name: 'vLLM', icon: '⚙️', category: 'local', envVars: [], defaultModel: '', models: [], baseUrl: 'http://127.0.0.1:8000/v1', needsBaseUrl: true, helpUrl: 'https://docs.vllm.ai' },
  { id: 'litellm', name: 'LiteLLM', icon: '🔗', category: 'local', envVars: [], defaultModel: '', models: [], baseUrl: 'http://localhost:4000', needsBaseUrl: true, helpUrl: 'https://litellm.ai' },
  // ── Custom endpoint ──
  { id: 'custom', name: 'Custom', labelKey: 'customProvider', icon: '⚙️', category: 'custom', envVars: [], defaultModel: '', models: [], baseUrl: '', needsBaseUrl: true },
];

// Provider IDs natively known to hermes-agent's PROVIDER_REGISTRY.
// Any provider not in this set must be persisted as model.provider="custom".
const KNOWN_BUILTIN_PROVIDERS = new Set(PROVIDERS.map(p => p.id));

// ============================================================================
// Accordion Step
// ============================================================================
interface AccordionStepProps {
  stepNum: number;
  icon: string;
  title: string;
  summary?: string;
  open: boolean;
  done: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const AccordionStep: React.FC<AccordionStepProps> = ({ stepNum, icon, title, summary, open, done, onToggle, children }) => (
  <div className={`border rounded-xl transition-colors ${open ? 'overflow-visible border-primary/40 theme-panel' : 'overflow-hidden ' + (done ? 'border-green-300 dark:border-green-500/30 bg-green-50/50 dark:bg-green-500/5' : 'border-slate-200 dark:border-white/[0.06] theme-panel')}`}>
    <div className={`flex items-center gap-2.5 px-4 py-3 cursor-pointer transition-colors ${open ? '' : 'hover:bg-slate-100 dark:hover:bg-white/[0.03]'}`} onClick={onToggle}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${done ? 'bg-green-500 text-white' : open ? 'bg-primary text-white' : 'theme-field theme-text-muted'}`}>
        {done ? <span className="material-symbols-outlined text-[14px]">check</span> : stepNum}
      </div>
      <span className={`material-symbols-outlined text-[16px] ${done ? 'text-green-500' : open ? 'text-primary' : 'theme-text-muted'}`}>{icon}</span>
      <div className="flex-1 min-w-0">
        <span className={`text-xs font-bold ${open ? 'text-[var(--color-text)] dark:text-white' : 'theme-text-secondary'}`}>{title}</span>
        {!open && summary && <p className="text-[10px] theme-text-muted truncate">{summary}</p>}
      </div>
      <span className={`material-symbols-outlined text-[16px] theme-text-muted transition-transform ${open ? 'rotate-180' : ''}`}>expand_more</span>
    </div>
    {open && <div className="px-4 pb-4 border-t border-slate-100 dark:border-white/[0.04]">{children}</div>}
  </div>
);

// ============================================================================
// 模型路径搜索组件（provider/model-id 自动补全）
// ============================================================================
interface ModelPathSearchProps {
  value: string;
  onChange: (v: string) => void;
  options: { path: string; provider: string; model: string; name?: string }[];
  placeholder?: string;
  exclude?: string[];
  clearOnSelect?: boolean;
}

const ModelPathSearch: React.FC<ModelPathSearchProps> = ({ value, onChange, options, placeholder, exclude, clearOnSelect }) => {
  const [open, setOpen] = useState(false);
  const [hl, setHl] = useState(-1);
  const [localInput, setLocalInput] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const displayValue = clearOnSelect ? localInput : value;

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const q = displayValue.toLowerCase();
  const filtered = options.filter(o =>
    (!exclude || !exclude.includes(o.path)) &&
    (!q || o.path.toLowerCase().includes(q) || (o.name && o.name.toLowerCase().includes(q)))
  );

  const handleSelect = (path: string) => {
    onChange(path);
    if (clearOnSelect) setLocalInput('');
    setOpen(false); setHl(-1);
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <span className="material-symbols-outlined text-[14px] theme-text-muted absolute start-2.5 top-1/2 -translate-y-1/2 pointer-events-none">search</span>
        <input type="text" value={displayValue}
          onChange={e => {
            if (clearOnSelect) setLocalInput(e.target.value);
            else onChange(e.target.value);
            setOpen(true); setHl(-1);
          }}
          onFocus={() => { setOpen(true); setHl(-1); }}
          onKeyDown={e => {
            if (e.key === 'ArrowDown' && open && filtered.length > 0) { e.preventDefault(); setHl(i => (i + 1) % filtered.length); }
            else if (e.key === 'ArrowUp' && open && filtered.length > 0) { e.preventDefault(); setHl(i => (i <= 0 ? filtered.length - 1 : i - 1)); }
            else if (e.key === 'Enter') {
              e.preventDefault();
              if (hl >= 0 && hl < filtered.length) handleSelect(filtered[hl].path);
              else if (displayValue.trim()) handleSelect(displayValue.trim());
            } else if (e.key === 'Escape') { setOpen(false); setHl(-1); }
          }}
          placeholder={placeholder}
          className="w-full h-8 ps-8 pe-3 theme-field rounded-md text-xs font-mono outline-none focus:border-primary" />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute start-0 end-0 mt-1 max-h-48 overflow-y-auto custom-scrollbar neon-scrollbar rounded-lg border border-slate-200 dark:border-white/10 bg-[var(--color-surface)] dark:bg-[var(--color-surface-overlay)] backdrop-blur-xl shadow-xl z-50">
          {filtered.map((o, idx) => (
            <button key={o.path}
              onMouseEnter={() => setHl(idx)}
              onClick={() => handleSelect(o.path)}
              ref={el => { if (idx === hl && el) el.scrollIntoView({ block: 'nearest' }); }}
              className={`w-full text-start px-3 py-2 flex items-center gap-2 transition-colors border-b border-slate-100 dark:border-white/[0.06] last:border-b-0 ${idx === hl ? 'bg-primary/10 dark:bg-primary/20' : 'hover:bg-slate-50 dark:hover:bg-white/[0.06]'}`}>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-mono font-bold text-[var(--color-text)] truncate">{o.path}</div>
                {o.name && o.name !== o.model && <div className="text-[11px] text-[var(--color-text-secondary)] truncate">{o.name}</div>}
              </div>
              <span className="text-[11px] px-1.5 py-0.5 rounded shrink-0 bg-slate-100 dark:bg-white/10 text-[var(--color-text-muted)]">{o.provider}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// ModelsSection
// ============================================================================
export const ModelsSection: React.FC<SectionProps> = ({ config, schema, setField, getField, deleteField, language }) => {
  const es = useMemo(() => (getTranslation(language) as any).es || {}, [language]);
  const tip = (key: string) => schemaTooltip(key, language, schema);
  const { toast } = useToast();
  const { confirm } = useConfirm();

  // ── Config paths (hermes-agent) ──
  // model: top-level string e.g. "anthropic/claude-sonnet-4-5"
  // providers: top-level dict { providerName: { api, api_key, transport, name, ... } }
  // fallback_providers: top-level list of provider ID strings
  // delegation.model / delegation.provider: subagent overrides

  const providers = getField(['providers']) || {};
  const providerEntries = Object.entries(providers);
  const rawModel = getField(['model']);
  // model can be a string ("anthropic/claude-opus-4.6") or an object
  // ({ base_url, default, provider }) — extract the model name either way.
  const modelIsObject = rawModel && typeof rawModel === 'object';
  const currentModel: string = typeof rawModel === 'string' ? rawModel
    : modelIsObject ? (rawModel.default || rawModel.primary || rawModel.name || rawModel.id || '')
    : '';
  // Helper: set model value — preserves object shape if model is an object.
  const setModelValue = useCallback((val: string) => {
    if (modelIsObject) {
      setField(['model', 'default'], val);
    } else {
      setField(['model'], val);
    }
  }, [modelIsObject, setField]);
  const rawFallbacks = getField(['fallback_providers']);
  const fallbacks = useMemo(() => {
    if (!Array.isArray(rawFallbacks)) return [] as string[];
    return rawFallbacks
      .map((entry: any) => {
        if (!entry) return '';
        if (typeof entry === 'string') return entry;
        const provider = String(entry.provider || '').trim();
        const model = String(entry.model || '').trim();
        return provider && model ? `${provider}/${model}` : '';
      })
      .filter(Boolean);
  }, [rawFallbacks]);
  const setFallbacks = useCallback((paths: string[]) => {
    const normalized = paths
      .map((path) => {
        const trimmed = String(path || '').trim();
        if (!trimmed.includes('/')) return null;
        const [provider, ...rest] = trimmed.split('/');
        const model = rest.join('/').trim();
        if (!provider || !model) return null;
        return { provider, model };
      })
      .filter(Boolean);
    setField(['fallback_providers'], normalized);
  }, [setField]);

  // 所有已知的 provider/model 路径（用于全局模型搜索下拉）
  const allModelPaths = useMemo(() => {
    const paths: { path: string; provider: string; model: string; name?: string }[] = [];
    // Only from user-configured providers
    for (const [pid, pCfg] of Object.entries(providers)) {
      if (!pCfg || typeof pCfg !== 'object') continue;
      const pName = (pCfg as any).name || pid;
      // models may be stored as an array of strings or objects
      const pModels: any[] = Array.isArray((pCfg as any).models) ? (pCfg as any).models : [];
      for (const m of pModels) {
        const mid = typeof m === 'string' ? m : (m?.id || m?.name || '');
        if (!mid) continue;
        const path = mid.includes('/') ? mid : `${pid}/${mid}`;
        if (!paths.some(x => x.path === path)) {
          paths.push({ path, provider: pid, model: mid, name: typeof m === 'object' ? (m.name || mid) : mid });
        }
      }
      // If no models array but there is a current model for this provider, include it
      if (pModels.length === 0 && currentModel) {
        const providerOfModel = modelIsObject ? String(rawModel?.provider || '') : '';
        if (providerOfModel === pid || (!modelIsObject && currentModel.startsWith(`${pid}/`))) {
          const mid = modelIsObject ? currentModel : currentModel.split('/').slice(1).join('/');
          const path = modelIsObject ? `${pid}/${mid}` : currentModel;
          if (mid && !paths.some(x => x.path === path)) {
            paths.push({ path, provider: pid, model: mid, name: pName });
          }
        }
      }
    }
    return paths;
  }, [providers, currentModel, modelIsObject, rawModel]);

  // ── Add model to existing provider ──
  const [showAddModel, setShowAddModel] = useState<string | null>(null);
  const [newModel, setNewModel] = useState({
    id: '', name: '', reasoning: false, contextWindow: '',
    inputCapability: 'text+image' as 'text' | 'text+image',
  });
  const [addModelDiscovering, setAddModelDiscovering] = useState(false);
  const [addModelDiscovered, setAddModelDiscovered] = useState<{ id: string; name?: string }[]>([]);
  const [addModelSearchOpen, setAddModelSearchOpen] = useState(false);
  const [addModelHighlight, setAddModelHighlight] = useState(-1);
  const addModelSearchRef = useRef<HTMLDivElement>(null);

  const CAPABILITY_OPTIONS = useMemo(() => [
    { value: 'text', label: es.capTextOnly || 'Text Only' },
    { value: 'text+image', label: es.capTextImage || 'Text + Image' },
  ], [es]);

  useEffect(() => {
    if (!addModelSearchOpen) return;
    const handler = (e: MouseEvent) => {
      if (addModelSearchRef.current && !addModelSearchRef.current.contains(e.target as Node)) setAddModelSearchOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [addModelSearchOpen]);

  // ── Wizard state ──
  const wizardRef = useRef<HTMLDivElement>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [wizApiKey, setWizApiKey] = useState('');
  const [wizShowKey, setWizShowKey] = useState(false);
  const [wizBaseUrl, setWizBaseUrl] = useState('');
  const [wizModels, setWizModels] = useState<string[]>([]);
  const [wizCustomName, setWizCustomName] = useState('');
  const [wizTransport, setWizTransport] = useState('openai_chat');
  const TRANSPORT_OPTIONS = useMemo(() => [
    { value: 'openai_chat', label: 'OpenAI' },
    { value: 'anthropic_messages', label: 'Anthropic' },
    { value: 'codex_responses', label: 'Codex' },
  ], []);
  const [wizSearchInput, setWizSearchInput] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail' | 'warning'>('idle');
  const [providerTestResults, setProviderTestResults] = useState<Record<string, ProviderTestResult>>({});
  const [modelSearchOpen, setModelSearchOpen] = useState(false);
  const [modelHighlight, setModelHighlight] = useState(-1);
  const [discoveringModels, setDiscoveringModels] = useState(false);
  const [discoveredModels, setDiscoveredModels] = useState<{ id: string; name: string }[]>([]);
  const [autoDiscoverAttemptKey, setAutoDiscoverAttemptKey] = useState('');
  const modelSearchRef = useRef<HTMLDivElement>(null);

  const preset = PROVIDERS.find(p => p.id === selectedProvider);
  const wizFinalModel = wizModels[0] || '';
  const transportToApiType = useCallback((transport?: string) => {
    switch ((transport || '').trim()) {
      case 'anthropic_messages':
        return 'anthropic-messages';
      case 'codex_responses':
        return 'codex-responses';
      default:
        return 'openai-completions';
    }
  }, []);

  // ── Discover models for existing provider (add-model modal) ──
  const discoverModelsForProvider = useCallback(async (providerName: string) => {
    const cfg = getField(['providers', providerName]) as any;
    if (!cfg) return;
    setAddModelDiscovering(true);
    try {
      const apiType = transportToApiType(cfg?.transport);
      const data = await post<{ models?: { id: string; name?: string }[] }>('/api/v1/setup/discover-models', {
        provider: providerName,
        apiKey: cfg.api_key || '',
        baseUrl: cfg.api || '',
        apiType,
      });
      const list = Array.isArray(data?.models)
        ? data.models
            .filter((m: any) => m && typeof m.id === 'string' && m.id.trim())
            .map((m: any) => ({ id: m.id.trim(), name: (m.name || m.id).trim() }))
        : [];
      setAddModelDiscovered(list);
      if (list.length > 0) {
        toast('success', `${es.discoverModelsOk || 'Models discovered'} (${list.length})`);
      } else {
        toast('warning', es.discoverModelsEmpty || 'No models found');
      }
    } catch (err: any) {
      toast('error', formatFriendlyError(err, es) || es.discoverModelsFail || es.failed || 'Discovery failed');
    } finally {
      setAddModelDiscovering(false);
    }
  }, [getField, transportToApiType, toast, es]);

  useEffect(() => {
    if (showAddModel) {
      setAddModelDiscovered([]);
      setAddModelDiscovering(false);
      setAddModelSearchOpen(false);
      setAddModelHighlight(-1);
      discoverModelsForProvider(showAddModel);
    }
  }, [showAddModel]);

  const addModel = useCallback(() => {
    if (!showAddModel || !newModel.id.trim()) return;
    const rawModels = getField(['providers', showAddModel, 'models']);
    const models: string[] = Array.isArray(rawModels) ? rawModels : [];
    const mid = newModel.id.trim();
    if (!models.includes(mid)) {
      setField(['providers', showAddModel, 'models'], [...models, mid]);
    }
    setNewModel({ id: '', name: '', reasoning: false, contextWindow: '', inputCapability: 'text+image' });
    setShowAddModel(null);
  }, [showAddModel, newModel, getField, setField]);

  const wizardModelCandidates = useMemo(() => {
    const merged = new Map<string, { id: string; name: string; ctx?: string }>();
    for (const m of preset?.models || []) merged.set(m.id, m);
    for (const m of discoveredModels) {
      if (!merged.has(m.id)) merged.set(m.id, m);
    }
    return Array.from(merged.values());
  }, [preset, discoveredModels]);

  const autoDiscoverKey = useMemo(
    () => [selectedProvider, wizTransport, wizBaseUrl.trim(), String(wizApiKey.length)].join('|'),
    [selectedProvider, wizTransport, wizBaseUrl, wizApiKey]
  );

  const providerCardsByCategory = useMemo(() => {
    const cards = PROVIDERS.map((p) => {
      const baseName = p.labelKey ? (es as any)[p.labelKey] || p.name : p.name;
      return {
        id: p.id,
        name: resolveProviderDisplayName({ language, providerId: p.id, fallbackName: baseName }),
        category: p.category,
      };
    });
    return {
      builtin: cards.filter(p => p.category === 'builtin').sort((a, b) => a.name.localeCompare(b.name)),
      oauth: cards.filter(p => p.category === 'oauth').sort((a, b) => a.name.localeCompare(b.name)),
      local: cards.filter(p => p.category === 'local').sort((a, b) => a.name.localeCompare(b.name)),
      custom: cards.filter(p => p.category === 'custom'),
    };
  }, [es, language]);

  // ── Close model search dropdown on outside click ──
  useEffect(() => {
    if (!modelSearchOpen) return;
    const handler = (e: MouseEvent) => {
      if (modelSearchRef.current && !modelSearchRef.current.contains(e.target as Node)) setModelSearchOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [modelSearchOpen]);

  // ── Wizard helpers ──
  const resetWizard = useCallback(() => {
    setWizardStep(0);
    setSelectedProvider('');
    setWizApiKey('');
    setWizShowKey(false);
    setWizBaseUrl('');
    setWizModels([]);
    setWizCustomName('');
    setWizTransport('openai_chat');
    setWizSearchInput('');
    setTestStatus('idle');
    setModelSearchOpen(false);
    setDiscoveredModels([]);
    setDiscoveringModels(false);
    setAutoDiscoverAttemptKey('');
  }, []);

  const openWizard = useCallback(() => { resetWizard(); setWizardOpen(true); }, [resetWizard]);
  const closeWizard = useCallback(() => { setWizardOpen(false); resetWizard(); }, [resetWizard]);

  const selectPreset = useCallback((id: string) => {
    const p = PROVIDERS.find(pr => pr.id === id);
    setSelectedProvider(id);
    setWizBaseUrl(p?.baseUrl || '');
    if (p?.defaultModel) setWizModels([p.defaultModel]);
    else setWizModels([]);
    setWizSearchInput('');
    setAutoDiscoverAttemptKey('');
    setWizardStep(1);
  }, []);

  const [wizSaving, setWizSaving] = useState(false);

  // ── Model discovery ──
  const discoverModelsForWizard = useCallback(async () => {
    if (!selectedProvider) return;
    setDiscoveringModels(true);
    try {
      const apiType = selectedProvider === 'custom' ? wizTransport.replace('_', '-') : (
        selectedProvider === 'anthropic' ? 'anthropic-messages' :
        (selectedProvider === 'gemini' || selectedProvider === 'google') ? 'google-generative-ai' :
        'openai-completions'
      );
      const data = await post<{ models?: { id: string; name?: string }[] }>('/api/v1/setup/discover-models', {
        provider: selectedProvider,
        apiKey: wizApiKey,
        baseUrl: wizBaseUrl || preset?.baseUrl || '',
        apiType,
      });
      const list = Array.isArray(data?.models)
        ? data.models
            .filter((m: any) => m && typeof m.id === 'string' && m.id.trim())
            .map((m: any) => ({ id: m.id.trim(), name: (m.name || m.id).trim() }))
        : [];
      setDiscoveredModels(list);
      if (list.length > 0) {
        toast('success', `${es.discoverModelsOk || 'Models discovered'} (${list.length})`);
      } else {
        toast('warning', es.discoverModelsEmpty || 'No models found');
      }
    } catch (err: any) {
      toast('error', formatFriendlyError(err, es) || es.discoverModelsFail || es.failed || 'Discovery failed');
    } finally {
      setDiscoveringModels(false);
    }
  }, [selectedProvider, wizApiKey, wizBaseUrl, wizTransport, preset, toast, es]);

  // Auto-discover models when entering step 2 (model selection) if preset has no models
  useEffect(() => {
    if (wizardStep !== 2 || !selectedProvider) return;
    if ((preset?.models?.length || 0) > 0) return;
    if (discoveredModels.length > 0 || discoveringModels) return;
    if (autoDiscoverAttemptKey === autoDiscoverKey) return;
    setAutoDiscoverAttemptKey(autoDiscoverKey);
    discoverModelsForWizard();
  }, [wizardStep, selectedProvider, preset, discoveredModels.length, discoveringModels, discoverModelsForWizard, autoDiscoverAttemptKey, autoDiscoverKey]);

  const handleTestConnection = useCallback(async () => {
    setTestStatus('testing');
    try {
      const apiType = selectedProvider === 'custom' ? wizTransport.replace('_', '-') : (
        selectedProvider === 'anthropic' ? 'anthropic-messages' :
        (selectedProvider === 'gemini' || selectedProvider === 'google') ? 'google-generative-ai' :
        'openai-completions'
      );
      const result = await post<{ status?: string; message?: string }>('/api/v1/setup/test-model', {
        provider: selectedProvider,
        apiKey: wizApiKey,
        baseUrl: wizBaseUrl || preset?.baseUrl || '',
        model: wizFinalModel,
        apiType,
      });
      if (result?.status === 'warning') {
        setTestStatus('warning');
        toast('warning', result.message || es.connected || 'Connected');
      } else {
        setTestStatus('ok');
        toast('success', es.connected || 'Connected');
      }
    } catch (err: any) {
      setTestStatus('fail');
      toast('error', formatFriendlyError(err, es) || es.failed || 'Failed');
    }
    setTimeout(() => setTestStatus('idle'), 3000);
  }, [selectedProvider, wizApiKey, wizBaseUrl, wizFinalModel, wizTransport, preset, toast, es]);

  const confirmProvider = useCallback(async () => {
    if (!selectedProvider || wizModels.length === 0) return;
    setWizSaving(true);

    try {
      // Call backend model-wizard API which writes hermes-agent config.yaml
      // format (model.default, model.provider, model.base_url) and API key
      // to ~/.hermes/.env.
      await post('/api/v1/config/model-wizard', {
        provider: selectedProvider,
        displayName: wizCustomName.trim() || (KNOWN_BUILTIN_PROVIDERS.has(selectedProvider) ? '' : selectedProvider),
        apiKey: wizApiKey,
        baseUrl: wizBaseUrl || preset?.baseUrl || '',
        model: wizModels[0],
        apiType: selectedProvider === 'custom' ? wizTransport : 'chat_completions',
      });

      // Also update the in-memory config state so the UI reflects changes
      // without requiring a page reload.
      const isBuiltin = KNOWN_BUILTIN_PROVIDERS.has(selectedProvider);
      const effectiveProvider = isBuiltin ? selectedProvider : 'custom';
      const modelObj: Record<string, any> = {
        default: wizModels[0],
        provider: effectiveProvider,
      };
      const effectiveBaseUrl = wizBaseUrl || preset?.baseUrl || '';
      if (effectiveBaseUrl) modelObj.base_url = effectiveBaseUrl;
      setField(['model'], modelObj);

      const providerObj: Record<string, any> = {
        transport: selectedProvider === 'custom' ? wizTransport : 'openai_chat',
      };
      const displayName = wizCustomName.trim() || (!isBuiltin ? selectedProvider : '');
      if (displayName) providerObj.name = displayName;
      if (effectiveBaseUrl) providerObj.api = effectiveBaseUrl;
      if (wizApiKey) providerObj.api_key = wizApiKey;
      if (wizModels.length > 0) providerObj.models = wizModels;
      setField(['providers', selectedProvider], providerObj);

      closeWizard();
      toast('success', es.providerAdded || 'Provider added');
    } catch (e: any) {
      toast('error', e?.message || 'Save failed');
    }
    setWizSaving(false);
  }, [selectedProvider, preset, wizBaseUrl, wizApiKey, wizModels, wizTransport, setField, closeWizard, toast, es]);

  // ── Test provider connection ──
  const testProvider = useCallback(async (providerId: string, cfg: any) => {
    setProviderTestResults(prev => ({ ...prev, [providerId]: { status: 'testing' } }));
    try {
      const start = performance.now();
      const providerModel = typeof rawModel === 'object' && rawModel?.provider === providerId
        ? String(rawModel?.default || '')
        : '';
      const result = await post<ProviderTestResult>('/api/v1/setup/test-provider-smart', {
        provider: providerId,
        apiKey: cfg?.api_key || '',
        baseUrl: cfg?.api || '',
        model: providerModel || currentModel || preset?.defaultModel || 'gpt-4.1-mini',
        apiType: transportToApiType(cfg?.transport),
      });
      const latencyMs = result?.latencyMs ?? Math.round(performance.now() - start);
      const status = result?.status === 'fail' ? 'fail' : result?.status === 'warning' ? 'warning' : 'ok';
      setProviderTestResults(prev => ({
        ...prev,
        [providerId]: { ...result, status, latencyMs },
      }));
    } catch (err: any) {
      setProviderTestResults(prev => ({ ...prev, [providerId]: { status: 'fail', error: formatFriendlyError(err, es) } }));
    }
  }, [currentModel, es, preset?.defaultModel, rawModel, transportToApiType]);

  // ── Delete provider ──
  const removeProvider = useCallback(async (key: string) => {
    const ok = await confirm({
      title: es.removeProvider || 'Remove Provider',
      message: `${es.confirmRemoveProvider || 'Remove provider'} "${key}"?`,
      confirmText: es.removeProvider || 'Remove',
      danger: true,
    });
    if (!ok) return;

    deleteField(['providers', key]);
    if (String(getField(['delegation', 'provider']) || '') === key) {
      deleteField(['delegation', 'provider']);
    }

    const filteredFallbacks = fallbacks.filter(path => !String(path).startsWith(`${key}/`));
    const currentPath = modelIsObject
      ? (rawModel?.provider && currentModel ? `${rawModel.provider}/${currentModel}` : '')
      : currentModel;
    const removingPrimary = typeof currentPath === 'string' && currentPath.startsWith(`${key}/`);

    if (removingPrimary) {
      const nextPrimary = filteredFallbacks[0] || '';
      const remainingFallbacks = filteredFallbacks.slice(nextPrimary ? 1 : 0);

      if (modelIsObject) {
        if (nextPrimary.includes('/')) {
          const [nextProvider, ...rest] = nextPrimary.split('/');
          setField(['model', 'provider'], nextProvider);
          setField(['model', 'default'], rest.join('/'));
        } else {
          setField(['model', 'provider'], '');
          setField(['model', 'default'], '');
        }
        deleteField(['model', 'base_url']);
      } else {
        setField(['model'], nextPrimary);
      }

      setFallbacks(remainingFallbacks);
    } else {
      setFallbacks(filteredFallbacks);
    }

    toast('info', es.providerRemoved || 'Provider removed');
  }, [confirm, currentModel, deleteField, fallbacks, getField, modelIsObject, rawModel, setFallbacks, setField, toast, es]);

  // ── Step summaries ──
  const stepSummaries = useMemo(() => [
    preset ? `${preset.icon} ${preset.name}` : '',
    wizApiKey ? `${es.apiKey || 'API Key'} ✓` : preset?.category === 'local' ? (es.localModels || 'Local') : '',
    wizModels.length > 0 ? `${wizModels[0]}${wizModels.length > 1 ? ` +${wizModels.length - 1}` : ''}` : '',
    wizModels.length > 0 ? `${wizModels.length} ${es.models || 'models'}` : (es.default || 'Default'),
  ], [preset, wizApiKey, wizModels, es]);

  useEffect(() => {
    if (!wizardOpen || !wizardRef.current) return;
    requestAnimationFrame(() => {
      wizardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, [wizardStep, wizardOpen]);

  // ── Render ──
  return (
    <div className="space-y-4">
      {/* Provider Health Grid — live status + latency per provider */}
      <ProviderHealthGrid t={(es as any).ph || {}} compact />

      {/* ================================================================ */}
      {/* 已配置的服务商列表 (matches ClawDeckX layout) */}
      {/* ================================================================ */}
      <ConfigSection
        title={es.providers || 'Providers'}
        icon="cloud"
        iconColor="text-blue-500"
        desc={`${providerEntries.length} ${es.providerCount || 'providers'}`}
      >
        {providerEntries.length === 0 ? (
          <EmptyState message={es.noProviders || 'No providers configured'} icon="cloud_off" />
        ) : (
          providerEntries.map(([name, cfg]: [string, any]) => {
            const presetMatch = PROVIDERS.find(p => p.id === name);
            const displayName = cfg?.name || presetMatch?.name || name;
            const testResult = providerTestResults[name] || { status: 'idle' as const };
            const testState = testResult.status;
            return (
              <ConfigCard
                key={name}
                title={displayName}
                icon="dns"
                onDelete={() => removeProvider(name)}
                defaultOpen={false}
                actions={
                  <div className="flex items-center gap-1">
                    {testState === 'ok' && testResult.latencyMs != null && (
                      <span className="flex items-center gap-0.5 text-[9px] font-mono tabular-nums text-green-600 dark:text-green-400 bg-green-500/10 rounded-md px-1.5 py-0.5">
                        {testResult.latencyMs}ms
                      </span>
                    )}
                    {testState === 'fail' && testResult.error && (
                      <span className="max-w-[120px] truncate text-[9px] text-red-500 dark:text-red-400" title={testResult.error}>
                        {testResult.error}
                      </span>
                    )}
                    <button
                      onClick={() => testProvider(name, cfg)}
                      disabled={testState === 'testing'}
                      title={es.testConn || 'Test Connection'}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                        testState === 'testing' ? 'text-slate-400 cursor-wait' :
                        testState === 'ok' ? 'text-green-500 hover:text-green-600' :
                        testState === 'fail' ? 'text-red-500 hover:text-red-600' :
                        'text-slate-400 hover:text-primary hover:bg-primary/5'
                      }`}
                    >
                      <span className={`material-symbols-outlined text-[16px] ${testState === 'testing' ? 'animate-spin' : ''}`}>
                        {testState === 'testing' ? 'progress_activity' :
                         testState === 'ok' ? 'check_circle' :
                         testState === 'fail' ? 'error' :
                         'play_arrow'}
                      </span>
                    </button>
                  </div>
                }
              >
                <TextField label={es.baseUrl || 'Base URL'} value={cfg?.api || ''} onChange={v => setField(['providers', name, 'api'], v)} placeholder={presetMatch?.baseUrl || 'https://api.example.com/v1'} />
                <PasswordField label={es.apiKey || 'API Key'} value={cfg?.api_key || ''} onChange={v => setField(['providers', name, 'api_key'], v)} placeholder={es.phApiKey || 'sk-...'} />
                <SelectField label={es.transport || 'Transport'} value={cfg?.transport || 'openai_chat'} onChange={v => setField(['providers', name, 'transport'], v)} options={[
                  { value: 'openai_chat', label: 'OpenAI' },
                  { value: 'anthropic_messages', label: 'Anthropic' },
                  { value: 'codex_responses', label: 'Codex' },
                ]} />
                {/* 模型列表 (matches ClawDeckX) */}
                {(() => {
                  const models: string[] = Array.isArray(cfg?.models) ? cfg.models : [];
                  return (
                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-white/[0.04]">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold theme-text-secondary">{es.models || 'Models'} ({models.length})</span>
                        <button onClick={() => { setShowAddModel(name); setNewModel({ id: '', name: '', reasoning: false, contextWindow: '', inputCapability: 'text+image' }); }} className="text-[11px] font-bold text-primary hover:underline">+ {es.add || 'Add'}</button>
                      </div>
                      {models.map((mid: string, mi: number) => {
                        const path = mid.includes('/') ? mid : `${name}/${mid}`;
                        const isPrimary = currentModel === path || currentModel === mid;
                        const isFallback = fallbacks.includes(path);
                        return (
                          <div key={mi} className={`flex items-center gap-2 px-2 py-1.5 rounded-md mb-1 ${isPrimary ? 'bg-primary/5 border border-primary/20' : 'theme-panel'}`}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-bold text-[var(--color-text)] dark:text-slate-300 truncate">{mid}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button onClick={() => setModelValue(path)} title={es.setPrimary || 'Set as Primary'} aria-label={es.setPrimary || 'Set as Primary'} className={`w-6 h-6 flex items-center justify-center rounded ${isPrimary ? 'text-primary' : 'text-slate-400 hover:text-primary'}`}>
                                <span className="material-symbols-outlined text-[14px]">{isPrimary ? 'star' : 'star_outline'}</span>
                              </button>
                              <button onClick={() => {
                                const fb = [...fallbacks];
                                const idx = fb.indexOf(path);
                                if (idx >= 0) fb.splice(idx, 1); else fb.push(path);
                                setFallbacks(fb);
                              }} title={es.fallback || 'Fallback'} aria-label={es.fallback || 'Fallback'} className={`w-6 h-6 flex items-center justify-center rounded text-[11px] font-bold ${isFallback ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'}`}>
                                FB
                              </button>
                              <button onClick={() => {
                                const newModels = models.filter((_: string, j: number) => j !== mi);
                                setField(['providers', name, 'models'], newModels);
                              }} title={es.removeModel || 'Remove'} aria-label={es.removeModel || 'Remove'} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-red-500">
                                <span className="material-symbols-outlined text-[13px]">close</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </ConfigCard>
            );
          })
        )}
      </ConfigSection>

      {/* ================================================================ */}
      {/* 添加服务商向导（Accordion Stepper — matches ClawDeckX） */}
      {/* ================================================================ */}
      {!wizardOpen ? (
        <button
          onClick={openWizard}
          className="w-full py-3 border-2 border-dashed border-primary/30 hover:border-primary/60 rounded-xl text-xs font-bold text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">add_circle</span>
          {es.addProviderWizardTitle || es.addProvider || 'Add Provider'}
        </button>
      ) : (
        <div ref={wizardRef} className="space-y-2">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xs font-bold text-[var(--color-text)] dark:text-white/80 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-primary">auto_fix_high</span>
              {es.addProviderWizardTitle || es.addProvider || 'Add Provider'}
            </h3>
            <button onClick={closeWizard} className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-white/60">
              {es.cancel || 'Cancel'}
            </button>
          </div>

          {/* Step 1: 选择服务商 */}
          <AccordionStep stepNum={1} icon="dns" title={es.selectProvider || 'Select Provider'} summary={stepSummaries[0]} open={wizardStep === 0} done={!!selectedProvider} onToggle={() => setWizardStep(0)}>
            <div className="space-y-3 pt-3">
              {(['builtin', 'oauth', 'local', 'custom'] as const).map(cat => {
                const items = providerCardsByCategory[cat];
                if (!items || items.length === 0) return null;
                const label = cat === 'builtin' ? (es.builtInProviders || 'Cloud Providers')
                  : cat === 'oauth' ? (es.oauthProviders || 'OAuth Providers')
                  : cat === 'local' ? (es.localProviders || 'Local / Self-hosted')
                  : (es.customProvider || 'Custom');
                const q = wizSearchInput.toLowerCase();
                const filtered = items.filter(p => !q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
                if (filtered.length === 0) return null;
                return (
                  <div key={cat}>
                    <div className="text-[10px] font-medium text-slate-400 dark:text-white/40 mb-1.5">{label}</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {filtered.map(p => (
                        <button key={p.id} onClick={() => selectPreset(p.id)}
                          className={`p-2.5 rounded-lg border-2 transition-all text-start ${selectedProvider === p.id ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-slate-200 dark:border-white/10 hover:border-primary/40'}`}>
                          <div className="min-w-0">
                            <span className="text-[11px] font-bold text-[var(--color-text)] dark:text-white/80 truncate block">{p.name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </AccordionStep>

          {/* Step 2: 填写凭证 */}
          <AccordionStep stepNum={2} icon="key" title={es.credentials || 'Credentials'} summary={stepSummaries[1]} open={wizardStep === 1} done={wizardStep > 1} onToggle={() => selectedProvider && setWizardStep(1)}>
            {preset && (
              <div className="space-y-3 pt-3">
                {preset.id === 'custom' && (
                  <div>
                    <label className="text-[10px] font-bold theme-text-secondary mb-1 block">{es.providerName || 'Provider Name'}</label>
                    <input type="text" value={wizCustomName}
                      onChange={e => setWizCustomName(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                      placeholder={es.phProviderName || 'my-provider'}
                      className="w-full h-8 theme-field rounded-md px-3 text-xs font-mono outline-none focus:border-primary" />
                    <span className="text-[11px] theme-text-muted mt-0.5 block">{es.providerNameHint || 'Lowercase letters, numbers, - and _ only'}</span>
                  </div>
                )}
                {preset.category !== 'local' && (
                  <div>
                    <label className="text-[10px] font-bold theme-text-secondary mb-1 flex items-center gap-2">
                      {es.apiKey || 'API Key'}
                      {preset.envVars?.[0] && <span className="text-[11px] px-1.5 py-0.5 theme-field rounded font-mono">{preset.envVars[0]}</span>}
                    </label>
                    <div className="relative mt-1">
                      <input type={wizShowKey ? 'text' : 'password'} value={wizApiKey} onChange={e => setWizApiKey(e.target.value)}
                        placeholder={es.phApiKey || 'sk-...'} className="w-full h-8 pe-8 theme-field rounded-md px-3 text-xs font-mono outline-none focus:border-primary" />
                      <button onClick={() => setWizShowKey(!wizShowKey)} className="absolute end-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <span className="material-symbols-outlined text-[14px]">{wizShowKey ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                    {preset.helpUrl && (
                      <a href={preset.helpUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary hover:underline mt-1 inline-flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[11px]">open_in_new</span>{preset.helpUrl}
                      </a>
                    )}
                  </div>
                )}
                {(preset.needsBaseUrl || preset.category === 'local' || preset.id === 'custom') && (
                  <div>
                    <label className="text-[10px] font-bold theme-text-secondary mb-1 block">{es.baseUrl || 'Base URL'}</label>
                    <input type="text" value={wizBaseUrl} onChange={e => setWizBaseUrl(e.target.value)}
                      placeholder={preset.baseUrl || 'https://api.example.com/v1'}
                      className="w-full h-8 theme-field rounded-md px-3 text-xs font-mono outline-none focus:border-primary" />
                  </div>
                )}
                {preset.id === 'custom' && (
                  <div>
                    <label className="text-[10px] font-bold theme-text-secondary mb-1 block">{es.apiType || 'API Type'}</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {TRANSPORT_OPTIONS.map(o => (
                        <button key={o.value} onClick={() => setWizTransport(o.value)}
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium border-2 transition-all ${wizTransport === o.value ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 dark:border-white/10 text-slate-500'}`}>
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-end">
                  <button onClick={() => setWizardStep(2)} className="px-4 py-1.5 bg-primary text-white text-[11px] font-bold rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1">
                    {es.next || 'Next'}<span className="material-symbols-outlined text-[14px]">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </AccordionStep>

          {/* Step 3: 选择模型（带自动发现） */}
          <AccordionStep stepNum={3} icon="smart_toy" title={es.selectModel || 'Select Model'} summary={stepSummaries[2]} open={wizardStep === 2} done={wizardStep > 2} onToggle={() => selectedProvider && setWizardStep(2)}>
            {preset && (() => {
              const q = wizSearchInput.toLowerCase();
              const filtered = wizardModelCandidates.filter(m => !wizModels.includes(m.id) && (!q || m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)));
              const addModelToList = (id: string) => {
                if (id && !wizModels.includes(id)) {
                  setWizModels(prev => [...prev, id]);
                }
                setWizSearchInput('');
                setModelSearchOpen(false);
                setModelHighlight(-1);
              };
              return (
                <div className="space-y-3 pt-3" style={{ overflow: 'visible' }}>
                  {/* 搜索输入 + 发现按钮 */}
                  <div ref={modelSearchRef}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <label className="text-[10px] font-bold text-slate-500">{es.modelSearchPlaceholder || 'Search or type model ID'}</label>
                      <button
                        onClick={discoverModelsForWizard}
                        disabled={discoveringModels}
                        className="h-6 px-2 rounded-md border border-slate-200 dark:border-white/10 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:text-primary hover:border-primary/40 disabled:opacity-40 inline-flex items-center gap-1"
                        title={es.discoverModels || 'Discover Models'}
                      >
                        {discoveringModels
                          ? <span className="material-symbols-outlined text-[12px] animate-spin">progress_activity</span>
                          : <span className="material-symbols-outlined text-[12px]">sync</span>}
                        {es.discoverModels || 'Discover'}
                      </button>
                    </div>
                    <div className="flex gap-1.5">
                      <div className="relative flex-1">
                        <span className="material-symbols-outlined text-[14px] text-slate-400 absolute start-2.5 top-1/2 -translate-y-1/2 pointer-events-none">search</span>
                        <input type="text" value={wizSearchInput}
                          onChange={e => { setWizSearchInput(e.target.value); setModelSearchOpen(true); setModelHighlight(-1); }}
                          onFocus={() => { setModelSearchOpen(true); setModelHighlight(-1); }}
                          onKeyDown={e => {
                            if (e.key === 'ArrowDown' && modelSearchOpen && filtered.length > 0) { e.preventDefault(); setModelHighlight(i => (i + 1) % filtered.length); }
                            else if (e.key === 'ArrowUp' && modelSearchOpen && filtered.length > 0) { e.preventDefault(); setModelHighlight(i => (i <= 0 ? filtered.length - 1 : i - 1)); }
                            else if (e.key === 'Enter') {
                              e.preventDefault();
                              if (modelHighlight >= 0 && modelHighlight < filtered.length) addModelToList(filtered[modelHighlight].id);
                              else if (wizSearchInput.trim()) addModelToList(wizSearchInput.trim());
                            } else if (e.key === 'Escape') { setModelSearchOpen(false); setModelHighlight(-1); }
                          }}
                          placeholder={es.modelSearchPlaceholder || 'Search or type model ID...'}
                          className="w-full h-8 ps-8 pe-3 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-md text-xs font-mono text-slate-800 dark:text-slate-200 outline-none focus:border-primary" />
                      </div>
                      <button onClick={() => { if (wizSearchInput.trim()) addModelToList(wizSearchInput.trim()); }}
                        disabled={!wizSearchInput.trim() || wizModels.includes(wizSearchInput.trim())}
                        className="px-3 h-8 bg-primary text-white text-[10px] font-bold rounded-md hover:bg-primary/90 transition-colors disabled:opacity-30 shrink-0 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">add</span>{es.addToList || 'Add'}
                      </button>
                    </div>
                    {modelSearchOpen && filtered.length > 0 && (
                      <div className="mt-1 max-h-52 overflow-y-auto custom-scrollbar neon-scrollbar rounded-lg border border-slate-200 dark:border-white/10 theme-panel shadow-xl" style={{ position: 'relative', zIndex: 50 }}>
                        {filtered.map((m, idx) => (
                          <button key={m.id}
                            onMouseEnter={() => setModelHighlight(idx)}
                            onClick={() => addModelToList(m.id)}
                            ref={el => { if (idx === modelHighlight && el) el.scrollIntoView({ block: 'nearest' }); }}
                            className={`w-full text-start px-3 py-2.5 flex items-center justify-between gap-2 transition-colors border-b border-slate-100 dark:border-white/[0.04] last:border-b-0 ${idx === modelHighlight ? 'bg-primary/10 dark:bg-primary/20' : 'hover:bg-slate-50 dark:hover:bg-white/[0.04]'}`}>
                            <div className="min-w-0">
                              <div className="text-[11px] font-bold text-[var(--color-text)] dark:text-white/80 truncate">{m.name}</div>
                              <div className="text-[11px] font-mono theme-text-secondary truncate">{m.id}</div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {m.ctx && <span className="text-[11px] px-1.5 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded">{m.ctx}</span>}
                              <span className="material-symbols-outlined text-[14px] text-primary/60">add_circle</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* 已选模型列表 */}
                  {wizModels.length > 0 && (
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 mb-1 block">{es.modelList || 'Selected Models'} ({wizModels.length})</label>
                      <div className="rounded-lg border border-slate-200 dark:border-white/10 divide-y divide-slate-100 dark:divide-white/[0.04]">
                        {wizModels.map((mid, idx) => {
                          const info = wizardModelCandidates.find(m => m.id === mid);
                          return (
                            <div key={mid} className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded shrink-0 ${idx === 0 ? 'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400' : 'theme-field theme-text-muted'}`}>
                                  {idx === 0 ? (es.primary || 'Primary') : `${es.fallbackN || 'Fallback'} ${idx}`}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <span className="text-[11px] font-mono text-[var(--color-text)] dark:text-white/80 truncate block">{mid}</span>
                                  {info && info.name !== mid && <span className="text-[11px] text-slate-400 truncate block">{info.name}{info.ctx ? ` · ${info.ctx}` : ''}</span>}
                                </div>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  {idx > 0 && (
                                    <button onClick={() => setWizModels(prev => { const n = [...prev];[n[idx - 1], n[idx]] = [n[idx], n[idx - 1]]; return n; })}
                                      className="p-0.5 text-slate-300 hover:text-slate-500 dark:text-white/20 dark:hover:text-white/50" title={es.moveUp || 'Move up'}>
                                      <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                                    </button>
                                  )}
                                  <button onClick={() => setWizModels(prev => prev.filter((_, i) => i !== idx))}
                                    className="p-0.5 text-slate-300 hover:text-red-500 dark:text-white/20 dark:hover:text-red-400" title={es.removeModel || 'Remove'}>
                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">{es.fallbackModelDesc || 'When primary fails, fallback models will be tried in order'}</p>
                    </div>
                  )}
                  <div className="flex justify-end">
                    <button onClick={() => setWizardStep(3)} disabled={wizModels.length === 0}
                      className="px-4 py-1.5 bg-primary text-white text-[11px] font-bold rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1 disabled:opacity-50">
                      {es.next || 'Next'}<span className="material-symbols-outlined text-[14px]">chevron_right</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </AccordionStep>

          {/* Step 4: 确认配置 */}
          <AccordionStep stepNum={4} icon="tune" title={es.confirmConfig || 'Confirm'} summary={stepSummaries[3]} open={wizardStep === 3} done={false} onToggle={() => wizFinalModel && setWizardStep(3)}>
            {preset && (
              <div className="space-y-3 pt-3">
                {/* 配置预览 */}
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06]">
                  <div className="text-[10px] font-bold theme-text-secondary mb-1.5">{es.configSummary || 'Config Summary'}</div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div><span className="theme-text-muted">{es.provider || 'Provider'}:</span> <span className="font-bold text-[var(--color-text)] dark:text-white/80">{preset.icon} {preset.name}</span></div>
                    <div><span className="theme-text-muted">{es.apiKey || 'API Key'}:</span> <span className="font-bold text-[var(--color-text)] dark:text-white/80">{wizApiKey ? '✓' : '—'}</span></div>
                    {(wizBaseUrl || preset.baseUrl) && <div className="col-span-2"><span className="theme-text-muted">{es.baseUrl || 'Base URL'}:</span> <span className="font-bold font-mono text-[var(--color-text)] dark:text-white/80 truncate">{wizBaseUrl || preset.baseUrl}</span></div>}
                  </div>
                  {wizModels.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-200 dark:border-white/[0.06] space-y-0.5">
                      {wizModels.map((mid, idx) => (
                        <div key={mid} className="text-[10px] font-mono theme-text-secondary">
                          <span className={`inline-block w-14 text-[11px] font-bold ${idx === 0 ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}`}>
                            {idx === 0 ? (es.primary || 'Primary') : `${es.fallbackN || 'FB'} ${idx}`}
                          </span>
                          {mid}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Test Connection */}
                <button onClick={handleTestConnection} disabled={testStatus === 'testing'}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-all disabled:opacity-50">
                  <span className={`material-symbols-outlined text-[14px] ${testStatus === 'testing' ? 'animate-spin' : testStatus === 'ok' ? 'text-green-500' : testStatus === 'fail' ? 'text-red-500' : ''}`}>
                    {testStatus === 'testing' ? 'progress_activity' : testStatus === 'ok' ? 'check_circle' : testStatus === 'fail' ? 'error' : 'play_arrow'}
                  </span>
                  {testStatus === 'testing' ? (es.testing || 'Testing...') : testStatus === 'ok' ? (es.connected || 'Connected') : testStatus === 'fail' ? (es.failed || 'Failed') : (es.testConn || 'Test Connection')}
                </button>
                <div className="flex justify-end gap-2">
                  <button onClick={closeWizard} className="px-4 py-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-white/60">
                    {es.cancel || 'Cancel'}
                  </button>
                  <button onClick={confirmProvider}
                    disabled={wizModels.length === 0}
                    className="px-5 py-1.5 bg-green-500 hover:bg-green-600 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50">
                    <span className="material-symbols-outlined text-[14px]">check</span>
                    {es.saveApply || es.addProvider || 'Save & Apply'}
                  </button>
                </div>
              </div>
            )}
          </AccordionStep>
        </div>
      )}

      {/* ================================================================ */}
      {/* 模型选择（主模型/备用模型 — matches ClawDeckX） */}
      {/* ================================================================ */}
      <ConfigSection title={es.models || 'Models'} icon="star" iconColor="text-amber-500">
        {(() => {
          const globalModels = [currentModel, ...fallbacks].filter(Boolean);
          const addGlobalModel = (path: string) => {
            if (!path || globalModels.includes(path)) return;
            if (!currentModel) { setModelValue(path); }
            else { setFallbacks([...fallbacks, path]); }
          };
          const removeGlobalModel = (idx: number) => {
            if (idx === 0) {
              setModelValue(fallbacks[0] || '');
              setFallbacks(fallbacks.slice(1));
            } else {
              const n = [...fallbacks]; n.splice(idx - 1, 1);
              setFallbacks(n);
            }
          };
          const moveGlobalModelUp = (idx: number) => {
            if (idx <= 0) return;
            const all = [...globalModels];
            [all[idx - 1], all[idx]] = [all[idx], all[idx - 1]];
            setModelValue(all[0]);
            setFallbacks(all.slice(1));
          };
          return (
            <div className="space-y-3 pt-1" style={{ overflow: 'visible' }}>
              <ModelPathSearch
                value=""
                onChange={addGlobalModel}
                options={allModelPaths}
                placeholder={es.modelSearchPlaceholder || 'Search or type model ID...'}
                exclude={globalModels}
                clearOnSelect
              />
              {globalModels.length > 0 && (
                <div>
                  <label className="text-[10px] font-bold text-slate-500 mb-1 block">{es.modelList || 'Selected Models'} ({globalModels.length})</label>
                  <div className="rounded-lg border border-slate-200 dark:border-white/10 divide-y divide-slate-100 dark:divide-white/[0.04]">
                    {globalModels.map((path, idx) => {
                      const info = allModelPaths.find(o => o.path === path);
                      return (
                        <div key={path} className="flex items-center gap-2 px-3 py-2">
                          <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded shrink-0 ${idx === 0 ? 'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400' : 'theme-field theme-text-muted'}`}>
                            {idx === 0 ? (es.primary || 'Primary') : `${es.fallbackN || 'Fallback'} ${idx}`}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] font-mono text-[var(--color-text)] dark:text-white/80 truncate block">{path}</span>
                            {info && info.name && info.name !== info.model && <span className="text-[11px] text-slate-400 truncate block">{info.name}</span>}
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            {idx > 0 && (
                              <button onClick={() => moveGlobalModelUp(idx)}
                                className="p-0.5 text-slate-300 hover:text-slate-500 dark:text-white/20 dark:hover:text-white/50" title={es.moveUp || 'Move up'}>
                                <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                              </button>
                            )}
                            <button onClick={() => removeGlobalModel(idx)}
                              className="p-0.5 text-slate-300 hover:text-red-500 dark:text-white/20 dark:hover:text-red-400" title={es.removeModel || 'Remove'}>
                              <span className="material-symbols-outlined text-[14px]">close</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{es.fallbackModelDesc || 'When primary fails, fallback models will be tried in order'}</p>
                </div>
              )}
              {/* 子代理模型 */}
              <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-white/[0.04]">
                <div className="flex items-start gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 whitespace-nowrap shrink-0">{es.delegationModel || 'Delegation Model'}</label>
                  {(es.delegationModelDesc) && <span className="text-[11px] text-slate-400 leading-4 min-w-0">— {es.delegationModelDesc || 'Override model for subagents'}</span>}
                </div>
                <ModelPathSearch
                  value={getField(['delegation', 'model']) || ''}
                  onChange={v => setField(['delegation', 'model'], v)}
                  options={allModelPaths}
                  placeholder={es.phProviderModelId || 'provider/model-id'}
                />
              </div>
            </div>
          );
        })()}
      </ConfigSection>

      {/* ================================================================ */}
      {/* 高级设置 (Delegation details + Credential Pool) */}
      {/* ================================================================ */}
      <ConfigSection title={es.advancedSettings || 'Advanced Settings'} icon="settings" iconColor="text-blue-500" defaultOpen={false}>
        <div className="space-y-3">
          <TextField
            label={es.delegationProvider || 'Delegation Provider'}
            desc={es.delegationProviderDesc || 'Provider for subagent inference (empty = inherit)'}
            value={getField(['delegation', 'provider']) || ''}
            onChange={v => setField(['delegation', 'provider'], v)}
            placeholder="openrouter"
            tooltip={tip('delegation.provider')}
          />
          <TextField
            label={es.delegationBaseUrl || 'Delegation Base URL'}
            value={getField(['delegation', 'base_url']) || ''}
            onChange={v => setField(['delegation', 'base_url'], v)}
            placeholder=""
            tooltip={tip('delegation.base_url')}
          />
          <PasswordField
            label={es.delegationApiKey || 'Delegation API Key'}
            value={getField(['delegation', 'api_key']) || ''}
            onChange={v => setField(['delegation', 'api_key'], v)}
            placeholder="sk-..."
            tooltip={tip('delegation.api_key')}
          />
          <TextField
            label={es.credentialPool || 'Credential Pool Strategies'}
            desc={es.credentialPoolDesc || 'JSON object mapping provider IDs to pool strategies'}
            value={JSON.stringify(getField(['credential_pool_strategies']) || {}, null, 2)}
            onChange={v => { try { setField(['credential_pool_strategies'], JSON.parse(v)); } catch {} }}
            placeholder='{}'
            tooltip={tip('credential_pool_strategies')}
          />
        </div>
      </ConfigSection>

      {/* ================================================================ */}
      {/* Auxiliary Models — per-task model overrides (vision, web, etc.) */}
      {/* ================================================================ */}
      <ConfigSection title={es.auxiliaryModels || 'Auxiliary Models'} icon="hub" iconColor="text-emerald-500" defaultOpen={false}>
        <p className="text-[10px] theme-text-muted mb-2">{es.auxiliaryModelsDesc || 'Override the model used for specific background tasks. Empty = use main model. Provider "auto" = auto-detect best available.'}</p>
        {([
          { key: 'vision', icon: 'visibility', label: es.auxVision || 'Vision', desc: es.auxVisionDesc || 'Image analysis and visual understanding' },
          { key: 'web_extract', icon: 'language', label: es.auxWebExtract || 'Web Extract', desc: es.auxWebExtractDesc || 'Web page summarization and extraction' },
          { key: 'compression', icon: 'compress', label: es.auxCompression || 'Compression', desc: es.auxCompressionDesc || 'Context compression summaries' },
          { key: 'session_search', icon: 'search', label: es.auxSessionSearch || 'Session Search', desc: es.auxSessionSearchDesc || 'Semantic session search' },
          { key: 'skills_hub', icon: 'extension', label: es.auxSkillsHub || 'Skills Hub', desc: es.auxSkillsHubDesc || 'Skill discovery and matching' },
          { key: 'approval', icon: 'verified_user', label: es.auxApproval || 'Approval', desc: es.auxApprovalDesc || 'Smart command approval classification' },
          { key: 'mcp', icon: 'settings_input_component', label: es.auxMcp || 'MCP', desc: es.auxMcpDesc || 'MCP tool schema conversion' },
          { key: 'flush_memories', icon: 'neurology', label: es.auxFlushMemories || 'Flush Memories', desc: es.auxFlushMemoriesDesc || 'Memory consolidation and flush' },
          { key: 'title_generation', icon: 'title', label: es.auxTitleGeneration || 'Title Generation', desc: es.auxTitleGenerationDesc || 'Auto-generate session titles' },
        ] as const).map(task => (
          <ConfigSection key={task.key} title={task.label} icon={task.icon} iconColor="text-slate-400" defaultOpen={false}>
            <p className="text-[10px] theme-text-muted mb-1">{task.desc}</p>
            <TextField
              label={es.auxProvider || 'Provider'}
              desc={es.auxProviderDesc || '"auto" = auto-detect, or a specific provider name'}
              value={getField(['auxiliary', task.key, 'provider']) || 'auto'}
              onChange={v => setField(['auxiliary', task.key, 'provider'], v)}
              placeholder="auto"
              tooltip={tip(`auxiliary.${task.key}.provider`)}
            />
            <TextField
              label={es.auxModel || 'Model'}
              desc={es.auxModelDesc || 'Model slug (empty = provider default)'}
              value={getField(['auxiliary', task.key, 'model']) || ''}
              onChange={v => setField(['auxiliary', task.key, 'model'], v)}
              placeholder=""
              tooltip={tip(`auxiliary.${task.key}.model`)}
            />
            <TextField
              label={es.auxBaseUrl || 'Base URL'}
              desc={es.auxBaseUrlDesc || 'Direct endpoint (overrides provider)'}
              value={getField(['auxiliary', task.key, 'base_url']) || ''}
              onChange={v => setField(['auxiliary', task.key, 'base_url'], v)}
              placeholder=""
              tooltip={tip(`auxiliary.${task.key}.base_url`)}
            />
            <PasswordField
              label={es.auxApiKey || 'API Key'}
              value={getField(['auxiliary', task.key, 'api_key']) || ''}
              onChange={v => setField(['auxiliary', task.key, 'api_key'], v)}
              placeholder="sk-..."
              tooltip={tip(`auxiliary.${task.key}.api_key`)}
            />
            <NumberField
              label={es.auxTimeout || 'Timeout (s)'}
              value={getField(['auxiliary', task.key, 'timeout'])}
              onChange={v => setField(['auxiliary', task.key, 'timeout'], v)}
              min={1}
              tooltip={tip(`auxiliary.${task.key}.timeout`)}
            />
            {task.key === 'vision' && (
              <NumberField
                label={es.auxDownloadTimeout || 'Download Timeout (s)'}
                desc={es.auxDownloadTimeoutDesc || 'Image HTTP download timeout'}
                value={getField(['auxiliary', 'vision', 'download_timeout'])}
                onChange={v => setField(['auxiliary', 'vision', 'download_timeout'], v)}
                min={1}
                tooltip={tip('auxiliary.vision.download_timeout')}
              />
            )}
          </ConfigSection>
        ))}
      </ConfigSection>

      {/* ================================================================ */}
      {/* AWS Bedrock — discovery / guardrail (hermes-agent v0.10.0+) */}
      {/* ================================================================ */}
      <ConfigSection title={es.bedrockConfig || 'AWS Bedrock'} icon="cloud" iconColor="text-amber-500" defaultOpen={false}>
        <p className="text-[10px] theme-text-muted mb-2">
          {es.bedrockDesc || 'Amazon Bedrock region, model discovery and guardrail settings. Requires AWS credentials via standard IAM / env vars.'}
        </p>
        <TextField
          label={es.bedrockRegion || 'AWS Region'}
          desc={es.bedrockRegionDesc || 'Region for Bedrock API calls (empty = AWS_REGION env var → us-east-1).'}
          tooltip={tip('bedrock.region')}
          value={getField(['bedrock', 'region']) || ''}
          onChange={v => setField(['bedrock', 'region'], v)}
          placeholder="us-east-1"
        />
        <ConfigSection title={es.bedrockDiscovery || 'Model Discovery'} icon="travel_explore" iconColor="text-sky-500" defaultOpen={false}>
          <SwitchField
            label={es.bedrockDiscoveryEnabled || 'Enable Auto-Discovery'}
            desc={es.bedrockDiscoveryEnabledDesc || 'Auto-discover models via ListFoundationModels.'}
            tooltip={tip('bedrock.discovery.enabled')}
            value={getField(['bedrock', 'discovery', 'enabled']) !== false}
            onChange={v => setField(['bedrock', 'discovery', 'enabled'], v)}
          />
          <TextField
            label={es.bedrockProviderFilter || 'Provider Filter'}
            desc={es.bedrockProviderFilterDesc || 'Comma-separated provider list (e.g. "anthropic,amazon"). Empty = all.'}
            tooltip={tip('bedrock.discovery.provider_filter')}
            value={(() => { const arr = getField(['bedrock', 'discovery', 'provider_filter']); return Array.isArray(arr) ? arr.join(',') : ''; })()}
            onChange={v => {
              const arr = v.split(',').map(s => s.trim()).filter(Boolean);
              setField(['bedrock', 'discovery', 'provider_filter'], arr.length ? arr : []);
            }}
            placeholder="anthropic,amazon"
          />
          <NumberField
            label={es.bedrockRefreshInterval || 'Refresh Interval (s)'}
            desc={es.bedrockRefreshIntervalDesc || 'Cache discovery results for this many seconds.'}
            tooltip={tip('bedrock.discovery.refresh_interval')}
            value={getField(['bedrock', 'discovery', 'refresh_interval'])}
            onChange={v => setField(['bedrock', 'discovery', 'refresh_interval'], v)}
            min={60}
          />
        </ConfigSection>
        <ConfigSection title={es.bedrockGuardrail || 'Guardrail'} icon="shield" iconColor="text-red-500" defaultOpen={false}>
          <TextField
            label={es.bedrockGuardrailId || 'Guardrail Identifier'}
            desc={es.bedrockGuardrailIdDesc || 'Bedrock Guardrail ID, e.g. "abc123def456".'}
            tooltip={tip('bedrock.guardrail.guardrail_identifier')}
            value={getField(['bedrock', 'guardrail', 'guardrail_identifier']) || ''}
            onChange={v => setField(['bedrock', 'guardrail', 'guardrail_identifier'], v)}
            placeholder=""
          />
          <TextField
            label={es.bedrockGuardrailVersion || 'Guardrail Version'}
            desc={es.bedrockGuardrailVersionDesc || 'Version number or "DRAFT".'}
            tooltip={tip('bedrock.guardrail.guardrail_version')}
            value={getField(['bedrock', 'guardrail', 'guardrail_version']) || ''}
            onChange={v => setField(['bedrock', 'guardrail', 'guardrail_version'], v)}
            placeholder="DRAFT"
          />
          <SelectField
            label={es.bedrockStreamProcessing || 'Stream Processing Mode'}
            tooltip={tip('bedrock.guardrail.stream_processing_mode')}
            value={getField(['bedrock', 'guardrail', 'stream_processing_mode']) || 'async'}
            onChange={v => setField(['bedrock', 'guardrail', 'stream_processing_mode'], v)}
            options={[
              { value: 'sync', label: 'Sync' },
              { value: 'async', label: 'Async' },
            ]}
          />
          <SelectField
            label={es.bedrockTrace || 'Trace'}
            tooltip={tip('bedrock.guardrail.trace')}
            value={getField(['bedrock', 'guardrail', 'trace']) || 'disabled'}
            onChange={v => setField(['bedrock', 'guardrail', 'trace'], v)}
            options={[
              { value: 'enabled', label: 'Enabled' },
              { value: 'disabled', label: 'Disabled' },
              { value: 'enabled_full', label: 'Enabled Full' },
            ]}
          />
        </ConfigSection>
      </ConfigSection>

      {/* ================================================================ */}
      {/* 添加模型弹窗 (matches ClawDeckX) */}
      {/* ================================================================ */}
      {showAddModel && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAddModel(null)}>
          <div className="bg-white dark:bg-[#1e2028] rounded-xl shadow-2xl w-full max-w-sm p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">{es.add || 'Add'} {es.model || 'Model'} → {showAddModel}</h3>
            <div className="space-y-3">
              <div ref={addModelSearchRef}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-slate-500">{es.modelIdRequired || 'Model ID *'}</label>
                  <button
                    onClick={() => showAddModel && discoverModelsForProvider(showAddModel)}
                    disabled={addModelDiscovering}
                    className="h-6 px-2 rounded-md border border-slate-200 dark:border-white/10 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:text-primary hover:border-primary/40 disabled:opacity-40 inline-flex items-center gap-1"
                    title={es.discoverModels || 'Discover'}
                  >
                    {addModelDiscovering
                      ? <span className="material-symbols-outlined text-[12px] animate-spin">progress_activity</span>
                      : <span className="material-symbols-outlined text-[12px]">sync</span>}
                    {es.discoverModels || 'Discover'}
                  </button>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined text-[14px] text-slate-400 absolute start-2.5 top-1/2 -translate-y-1/2 pointer-events-none">search</span>
                  <input value={newModel.id}
                    onChange={e => { setNewModel({ ...newModel, id: e.target.value }); if (addModelDiscovered.length > 0) { setAddModelSearchOpen(true); setAddModelHighlight(-1); } }}
                    onFocus={() => { if (addModelDiscovered.length > 0) { setAddModelSearchOpen(true); setAddModelHighlight(-1); } }}
                    onKeyDown={e => {
                      if (addModelSearchOpen && addModelDiscovered.length > 0) {
                        const q = newModel.id.toLowerCase();
                        const filtered = addModelDiscovered.filter(m => !q || m.id.toLowerCase().includes(q) || (m.name && m.name.toLowerCase().includes(q)));
                        if (e.key === 'ArrowDown') { e.preventDefault(); setAddModelHighlight(i => (i + 1) % filtered.length); }
                        else if (e.key === 'ArrowUp') { e.preventDefault(); setAddModelHighlight(i => (i <= 0 ? filtered.length - 1 : i - 1)); }
                        else if (e.key === 'Enter' && addModelHighlight >= 0 && addModelHighlight < filtered.length) {
                          e.preventDefault();
                          setNewModel({ ...newModel, id: filtered[addModelHighlight].id, name: filtered[addModelHighlight].name || '' });
                          setAddModelSearchOpen(false); setAddModelHighlight(-1);
                          return;
                        } else if (e.key === 'Escape') { setAddModelSearchOpen(false); setAddModelHighlight(-1); return; }
                      }
                      if (e.key === 'Enter') addModel();
                    }}
                    placeholder={es.phProviderModelId || 'provider/model-id'}
                    className="w-full h-8 ps-8 pe-3 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-md text-xs font-mono text-slate-800 dark:text-slate-200 outline-none focus:border-primary" />
                </div>
                {addModelSearchOpen && addModelDiscovered.length > 0 && (() => {
                  const q = newModel.id.toLowerCase();
                  const existingModels = (getField(['providers', showAddModel!, 'models']) as any[] || []).map((m: any) => typeof m === 'string' ? m : m?.id);
                  const filtered = addModelDiscovered.filter(m =>
                    (!q || m.id.toLowerCase().includes(q) || (m.name && m.name.toLowerCase().includes(q))) &&
                    !existingModels.includes(m.id)
                  );
                  return filtered.length > 0 ? (
                    <div className="mt-1 max-h-48 overflow-y-auto custom-scrollbar neon-scrollbar rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#2a2a2e] shadow-xl z-50 relative">
                      {filtered.map((m, idx) => (
                        <button key={m.id}
                          onMouseEnter={() => setAddModelHighlight(idx)}
                          onClick={() => {
                            setNewModel({ ...newModel, id: m.id, name: m.name || '' });
                            setAddModelSearchOpen(false); setAddModelHighlight(-1);
                          }}
                          ref={el => { if (idx === addModelHighlight && el) el.scrollIntoView({ block: 'nearest' }); }}
                          className={`w-full text-start px-3 py-2 flex items-center gap-2 transition-colors border-b border-slate-100 dark:border-white/[0.04] last:border-b-0 ${idx === addModelHighlight ? 'bg-primary/10 dark:bg-primary/20' : 'hover:bg-slate-50 dark:hover:bg-white/[0.04]'}`}>
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-mono font-bold text-[var(--color-text)] dark:text-white/80 truncate">{m.id}</div>
                            {m.name && m.name !== m.id && <div className="text-[11px] text-slate-400 truncate">{m.name}</div>}
                          </div>
                          <span className="material-symbols-outlined text-[14px] text-primary/60 shrink-0">add_circle</span>
                        </button>
                      ))}
                    </div>
                  ) : null;
                })()}
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 mb-1 block">{es.name || 'Name'}</label>
                <input value={newModel.name} onChange={e => setNewModel({ ...newModel, name: e.target.value })} placeholder={es.phModelName || 'Model name'} className="w-full h-8 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-md px-3 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-primary" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-slate-500 mb-1 block">{es.contextWindow || 'Context Window'}</label>
                  <input type="number" value={newModel.contextWindow} onChange={e => setNewModel({ ...newModel, contextWindow: e.target.value })} placeholder={es.phContextWindow || '128000'} className="w-full h-8 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-md px-3 text-xs font-mono text-slate-800 dark:text-slate-200 outline-none focus:border-primary" />
                  <p className="text-[11px] text-slate-400 mt-0.5">{es.contextWindowDesc || 'Max tokens the model supports'}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 mb-1 block">{es.reasoning || 'Reasoning'}</label>
                  <button onClick={() => setNewModel({ ...newModel, reasoning: !newModel.reasoning })} className={`w-9 h-5 rounded-full relative transition-colors mt-1.5 ${newModel.reasoning ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${newModel.reasoning ? 'translate-x-[18px] rtl:-translate-x-[18px]' : 'translate-x-0.5 rtl:-translate-x-0.5'}`} />
                  </button>
                  <p className="text-[11px] text-slate-400 mt-0.5">{es.reasoningDesc || 'Reasoning model'}</p>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 mb-1 block">{es.modelCapability || 'Input Capability'}</label>
                <div className="flex gap-1.5">
                  {CAPABILITY_OPTIONS.map(o => (
                    <button key={o.value} onClick={() => setNewModel({ ...newModel, inputCapability: o.value as 'text' | 'text+image' })}
                      className={`flex-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border-2 transition-all ${newModel.inputCapability === o.value ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 dark:border-white/10 text-slate-500'}`}>
                      {o.value === 'text+image' && <span className="material-symbols-outlined text-[12px] align-middle me-0.5">image</span>}
                      {o.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">{es.modelCapabilityDesc || 'Whether the model supports image input'}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowAddModel(null)} className="px-4 h-8 text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">{es.cancel || 'Cancel'}</button>
              <button onClick={addModel} disabled={!newModel.id.trim()} className="px-4 h-8 bg-primary text-white text-[11px] font-bold rounded-lg disabled:opacity-50">{es.add || 'Add'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
