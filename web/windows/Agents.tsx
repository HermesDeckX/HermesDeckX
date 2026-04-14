
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Language, dispatchOpenWindow } from '../types';
import { getTranslation } from '../locales';
import { gwApi, workspaceMemoryApi, MemoryFileEntry, multiAgentApi, WizardStep2Request } from '../services/api';
import { useGatewayStatus } from '../hooks/useGatewayStatus';
import { fmtAgoCompact } from '../utils/time';
import { normalizeExecSecurity, type ExecSecurity, type ExecAsk, type AskFallback } from '../utils/exec-policy';
import { SecurityPolicyBadges } from '../components/SecurityPolicyBadges';
import { subscribeManagerWS } from '../services/manager-ws';
import { templateSystem, WorkspaceTemplate, resolveTemplatePrompt, MultiAgentTemplate } from '../services/template-system';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import CustomSelect from '../components/CustomSelect';
import { MultiAgentCollaborationV2 } from '../components/multiagent';
import ScenarioLibraryV2 from '../components/scenarios/ScenarioLibraryV2';

interface AgentsProps { language: Language; }
type Panel = 'overview' | 'files' | 'tools' | 'skills' | 'channels' | 'cron' | 'tasks' | 'run' | 'scenarios' | 'collaboration';


function fmtHeartbeatAgo(ts: number, template: string, never: string): string {
  if (Date.now() - ts < 0) return never;
  return template.replace('{time}', fmtAgoCompact(ts) || '0s');
}

const AGENT_NAME_RE = /^[a-zA-Z0-9_-]{1,64}$/;

function fmtBytes(b?: number) {
  if (b == null) return '-';
  if (b < 1024) return `${b} B`;
  const u = ['KB', 'MB', 'GB']; let s = b / 1024, i = 0;
  while (s >= 1024 && i < u.length - 1) { s /= 1024; i++; }
  return `${s.toFixed(s < 10 ? 1 : 0)} ${u[i]}`;
}

function extractRunText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((block: any) => {
        if (typeof block === 'string') return block;
        if (block?.type === 'text' && typeof block.text === 'string') return block.text;
        if (block?.type === 'tool_use') return `[${block.name || 'tool'}](...)`;
        if (block?.type === 'tool_result') return typeof block.content === 'string' ? block.content : JSON.stringify(block.content);
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  if (content && typeof content === 'object') {
    const c = content as any;
    if (typeof c.text === 'string') return c.text;
    if (typeof c.content === 'string') return c.content;
  }
  return '';
}


const Agents: React.FC<AgentsProps> = ({ language }) => {
  const t = useMemo(() => getTranslation(language), [language]);
  const a = (t as any).agt as any;
  const es = (t as any).es as any;
  const na = (t as any).na || '-';
  const menuAgentsLabel = typeof (t as any).menu?.agents === 'string' ? (t as any).menu.agents : 'Agents';
  const { toast } = useToast();
  const { confirm } = useConfirm();

  // Gateway connectivity (shared singleton hook)
  const { ready: gwReady } = useGatewayStatus();
  const gwReadyRef = useRef(gwReady);
  gwReadyRef.current = gwReady;
  const aRef = useRef(a);
  aRef.current = a;
  const [wsConnecting, setWsConnecting] = useState(false);
  const runIdRef = useRef<string | null>(null);
  const runSessionRef = useRef<string | null>(null);

  // Run panel state
  const [runInput, setRunInput] = useState('');
  const [runSending, setRunSending] = useState(false);
  const [runStream, setRunStream] = useState<string | null>(null);
  const [runMessages, setRunMessages] = useState<Array<{ role: string; text: string; ts: number }>>([]);
  const [runError, setRunError] = useState<string | null>(null);
  const runEndRef = useRef<HTMLDivElement>(null);
  const runTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Heartbeat event state
  const [lastHeartbeat, setLastHeartbeat] = useState<{ ts: number; status?: string } | null>(null);

  const [agentsList, setAgentsList] = useState<any>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>('overview');
  const [loading, setLoading] = useState(false);
  const [identity, setIdentity] = useState<Record<string, any>>({});
  const [config, setConfig] = useState<any>(null);
  const [filesList, setFilesList] = useState<any>(null);
  const [fileActive, setFileActive] = useState<string | null>(null);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [fileDrafts, setFileDrafts] = useState<Record<string, string>>({});
  const [fileSaving, setFileSaving] = useState(false);
  const [tplDropdown, setTplDropdown] = useState(false);
  const [fileTemplates, setFileTemplates] = useState<WorkspaceTemplate[]>([]);
  const [memoryFiles, setMemoryFiles] = useState<MemoryFileEntry[]>([]);
  const [memoryExpanded, setMemoryExpanded] = useState(true);
  const [memoryShowCount, setMemoryShowCount] = useState(7);
  const [skillsReport, setSkillsReport] = useState<any>(null);
  const [skillsFilter, setSkillsFilter] = useState<'all' | 'ready' | 'notReady' | 'disabled'>('ready');
  const [channelsSnap, setChannelsSnap] = useState<any>(null);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null);
  const [bindingSaving, setBindingSaving] = useState(false);
  const [a2aSaving, setA2aSaving] = useState(false);
  const [a2aExpanded, setA2aExpanded] = useState(false);
  const [toolDraft, setToolDraft] = useState<Record<string, any> | null>(null);
  const [toolSaving, setToolSaving] = useState(false);
  const [customToolInput, setCustomToolInput] = useState('');
  const [toolSearch, setToolSearch] = useState('');
  const [toolSourceFilter, setToolSourceFilter] = useState<'all' | 'core' | 'plugin'>('all');
  const [toolProfileFilter, setToolProfileFilter] = useState('all');
  const [toolsCatalog, setToolsCatalog] = useState<any>(null);
  const [toolsCatalogLoading, setToolsCatalogLoading] = useState(false);
  const [toolsExpanded, setToolsExpanded] = useState<Set<string>>(new Set());
  const [a2aDraft, setA2aDraft] = useState<{ enabled: boolean; allow: string[]; ppTurns: number } | null>(null);
  const [subSaving, setSubSaving] = useState(false);
  const [subDraft, setSubDraft] = useState<string[] | null>(null);
  const [cronStatus, setCronStatus] = useState<any>(null);
  const [cronJobs, setCronJobs] = useState<any[]>([]);
  const [tasksData, setTasksData] = useState<any>(null);
  const [taskAudit, setTaskAudit] = useState<any>(null);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [skillsLoaded, setSkillsLoaded] = useState(false);

  // AI file generate state
  const [aiGenOpen, setAiGenOpen] = useState(false);
  const [aiGenPrompt, setAiGenPrompt] = useState('');
  const [aiGenRunning, setAiGenRunning] = useState(false);
  const [aiGenStream, setAiGenStream] = useState('');
  const [aiGenResult, setAiGenResult] = useState<string | null>(null);
  const [aiGenTemplates, setAiGenTemplates] = useState<MultiAgentTemplate[]>([]);
  const [aiGenSelectedTplId, setAiGenSelectedTplId] = useState<string>('');
  const aiGenAbortRef = useRef<AbortController | null>(null);
  const aiGenBufRef = useRef('');
  const aiGenRafRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Core files that support AI generation */
  const AI_GEN_FILES = ['SOUL.md', 'AGENTS.md', 'USER.md', 'IDENTITY.md', 'HEARTBEAT.md'];

  // Load workspace file templates
  useEffect(() => {
    templateSystem.getAllTemplates(language).then(setFileTemplates).catch(() => { /* templates optional */ });
  }, [language]);

  // Re-apply selected template prompt when: file changes, panel opens, template selection changes, OR templates finish loading
  useEffect(() => {
    if (!aiGenOpen || !fileActive) return;
    if (!aiGenSelectedTplId) {
      setAiGenPrompt(buildAiGenFallbackPrompt(fileActive));
      return;
    }
    const tpl = aiGenTemplates.find(t => t.id === aiGenSelectedTplId);
    if (!tpl?.content.prompts) {
      // Templates not loaded yet — keep current prompt, will re-run when aiGenTemplates updates
      return;
    }
    const agentIdentity = selectedId ? identity[selectedId] : null;
    const agentName = agentIdentity?.name || selectedId || '';
    const agentRole = agentIdentity?.role || '';
    const agentDesc = agentIdentity?.description || '';
    const placeholders = { agentName, agentRole, agentDesc, scenarioName: agentRole || agentName };
    const fileKeyMap: Record<string, string> = { agents: 'agents', soul: 'soul', user: 'user', identity: 'identity', heartbeat: 'heartbeat' };
    const mappedKey = fileKeyMap[fileActive.replace('.md', '').toLowerCase()];
    const perFilePrompts = mappedKey ? tpl.content.prompts.files?.[mappedKey as keyof NonNullable<typeof tpl.content.prompts.files>] : undefined;
    const resolved = resolveTemplatePrompt(perFilePrompts ?? tpl.content.prompts.agentFile, language, placeholders);
    if (resolved) setAiGenPrompt(resolved);
    else setAiGenPrompt(buildAiGenFallbackPrompt(fileActive));
  }, [fileActive, aiGenOpen, aiGenSelectedTplId, aiGenTemplates, identity, selectedId]); // identity/selectedId: re-apply when agent data loads

  // Subscribe to shared Manager WS for agent chat streaming events
  useEffect(() => {
    setWsConnecting(true);

    let opened = false;
    const connectTimeout = setTimeout(() => {
      if (!opened) setWsConnecting(false);
    }, 10000);

    const unsubscribe = subscribeManagerWS((msg: any) => {
      try {
        if (msg.type === 'chat') {
          const payload = msg.data;
          if (!payload) return;
          if (payload.sessionKey && payload.sessionKey !== runSessionRef.current) return;

          if (payload.state === 'delta') {
            const m = payload.message as any;
            const text = extractRunText(m?.content ?? m);
            if (text) setRunStream(text);
          } else if (payload.state === 'final') {
            const m = payload.message as any;
            if (m) {
              const text = extractRunText(m?.content ?? m);
              if (text) {
                setRunMessages(prev => [...prev, { role: m.role || 'assistant', text, ts: Date.now() }]);
              }
            }
            setRunStream(null);
            runIdRef.current = null;
          } else if (payload.state === 'aborted') {
            setRunStream(prev => {
              if (prev) {
                setRunMessages(msgs => [...msgs, { role: 'assistant', text: prev, ts: Date.now() }]);
              }
              return null;
            });
            runIdRef.current = null;
          } else if (payload.state === 'error') {
            setRunStream(null);
            runIdRef.current = null;
            setRunError(payload.errorMessage || a.runFailed);
          }
        } else if (msg.type === 'heartbeat') {
          setLastHeartbeat({ ts: Date.now(), status: msg.data?.status || 'running' });
        }
      } catch { /* ignore */ }
    }, (status) => {
      if (status === 'open') {
        opened = true;
        clearTimeout(connectTimeout);
        setWsConnecting(false);
      }
    });

    return () => {
      clearTimeout(connectTimeout);
      unsubscribe();
    };
  }, []);

  // Auto-scroll run panel
  useEffect(() => {
    runEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [runMessages, runStream]);

  const agents: any[] = agentsList?.agents || [];
  const defaultId = agentsList?.defaultId || null;
  const selected = agents.find((ag: any) => ag.id === selectedId) || null;

  // Build model options from gateway config for the edit agent dropdown
  const modelOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    const providers = config?.models?.providers || config?.parsed?.models?.providers || config?.config?.models?.providers || {};
    for (const [pName, pCfg] of Object.entries(providers) as [string, any][]) {
      const models = Array.isArray(pCfg?.models) ? pCfg.models : [];
      for (const m of models) {
        const id = typeof m === 'string' ? m : m?.id;
        if (!id) continue;
        const path = `${pName}/${id}`;
        const name = typeof m === 'object' && m?.name ? m.name : id;
        opts.push({ value: path, label: `${pName} / ${name}` });
      }
    }
    return opts;
  }, [config]);

  const hasUnsavedDraft = useCallback((): boolean => {
    if (!fileActive) return false;
    return fileDrafts[fileActive] != null && fileDrafts[fileActive] !== fileContents[fileActive];
  }, [fileActive, fileDrafts, fileContents]);

  const loadAgents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await gwApi.agents();
      const result = Array.isArray(data) ? { agents: data, defaultId: null } : data;
      setAgentsList(result);
      const list = result?.agents || [];
      setSelectedId(prev => {
        if (prev && list.some((ag: any) => ag.id === prev)) return prev;
        return result?.defaultId || list[0]?.id || null;
      });
      const identityBatch = await Promise.allSettled(
        list.map((ag: any) => gwApi.agentIdentity(ag.id).then((id: any) => ({ agentId: ag.id, id })))
      );
      const newIdentity: Record<string, any> = {};
      for (const r of identityBatch) {
        if (r.status === 'fulfilled') newIdentity[r.value.agentId] = r.value.id;
      }
      setIdentity(prev => ({ ...prev, ...newIdentity }));
    } catch (err: any) { toast('error', err?.message || aRef.current.fetchFailed); }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadConfig = useCallback(() => {
    gwApi.configGet().then(setConfig).catch((err: any) => { toast('error', err?.message || aRef.current.configFetchFailed); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadAgents(); loadConfig(); }, []);

  // Listen for cross-window navigation: { id: 'agents', agentId: 'xxx', panel: 'tools' }
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.id !== 'agents') return;
      if (detail.agentId) setSelectedId(detail.agentId);
      if (detail.panel) setPanel(detail.panel as Panel);
    };
    window.addEventListener('hermesdeck:open-window', handler);
    return () => window.removeEventListener('hermesdeck:open-window', handler);
  }, []);

  const selectAgent = useCallback(async (id: string) => {
    if (hasUnsavedDraft()) {
      const discard = await confirm({
        title: a.unsavedTitle,
        message: a.unsavedWarning,
        confirmText: a.discard,
        cancelText: a.stayEdit,
      });
      if (!discard) return;
    }
    setSelectedId(id);
    setDrawerOpen(false);
    setFilesList(null); setFileActive(null); setFileContents({}); setFileDrafts({});
    setMemoryFiles([]); setMemoryShowCount(7);
    setSkillsReport(null); setSkillsLoaded(false);
    setToolsCatalog(null);
    setSubDraft(null);
  }, [hasUnsavedDraft, confirm, a]);

  const selectPanel = useCallback(async (p: Panel) => {
    if (panel === 'files' && p !== 'files' && hasUnsavedDraft()) {
      const discard = await confirm({
        title: a.unsavedTitle,
        message: a.unsavedWarning,
        confirmText: a.discard,
        cancelText: a.stayEdit,
      });
      if (!discard) return;
    }
    setPanel(p);
    if (p === 'files' && selectedId) {
      gwApi.agentFilesList(selectedId).then(setFilesList).catch((err: any) => { toast('error', err?.message || a.fetchFailed); });
      workspaceMemoryApi.list(selectedId).then(r => setMemoryFiles(r?.files || [])).catch(() => setMemoryFiles([]));
    }
    if (p === 'tools' && !toolsCatalog && !toolsCatalogLoading && selectedId) {
      setToolsCatalogLoading(true);
      gwApi.toolsCatalog({ agentId: selectedId }).then((r: any) => {
        setToolsCatalog(r);
      }).catch(() => {}).finally(() => setToolsCatalogLoading(false));
    }
    if (p === 'skills' && selectedId) {
      setSkillsLoaded(false);
      gwApi.agentSkills(selectedId).then((r: any) => { setSkillsReport(r); setSkillsLoaded(true); }).catch((err: any) => { setSkillsLoaded(true); toast('error', err?.message || a.skillsFetchFailed); });
    }
    if (p === 'channels') {
      setChannelsLoading(true);
      setExpandedChannel(null);
      Promise.all([
        gwApi.channels().then(setChannelsSnap),
        gwApi.configGet().then(setConfig),
      ]).catch((err: any) => { toast('error', err?.message || a.channelsFetchFailed); }).finally(() => setChannelsLoading(false));
    }
    if (p === 'cron') {
      gwApi.cronStatus().then(setCronStatus).catch((err: any) => { toast('error', err?.message || a.cronFetchFailed); });
      gwApi.cron().then((d: any) => setCronJobs(Array.isArray(d) ? d : d?.jobs || [])).catch((err: any) => { toast('error', err?.message || a.cronFetchFailed); });
    }
    if (p === 'tasks') {
      setTasksLoading(true);
      gwApi.info().then((d: any) => { setTasksData(d?.tasks ?? null); setTaskAudit(d?.taskAudit ?? null); }).catch((err: any) => { toast('error', err?.message || a.tasksFetchFailed || 'Failed to fetch tasks'); }).finally(() => setTasksLoading(false));
    }
  }, [selectedId, panel, hasUnsavedDraft, confirm, a]);

  const loadFile = useCallback(async (name: string) => {
    if (!selectedId) return;
    setFileActive(name);
    if (fileContents[name] != null) return;
    try {
      if (name.startsWith('memory/') || name.startsWith('memories/')) {
        const realName = name.replace(/^memor(?:y|ies)\//, '');
        const res = await workspaceMemoryApi.getFile(realName, selectedId).catch(() => null);
        let content = res?.content ?? '';
        // Fallback: try direct file read via agents.files.get
        if (!content) {
          const fallback = await gwApi.agentFileGet(selectedId, name) as any;
          content = fallback?.content ?? fallback?.file?.content ?? '';
        }
        setFileContents(prev => ({ ...prev, [name]: content }));
        setFileDrafts(prev => ({ ...prev, [name]: content }));
      } else {
        const res = await gwApi.agentFileGet(selectedId, name) as any;
        const content = res?.content ?? res?.file?.content ?? '';
        setFileContents(prev => ({ ...prev, [name]: content }));
        setFileDrafts(prev => ({ ...prev, [name]: content }));
      }
    } catch (err: any) { toast('error', err?.message || a.fileLoadFailed); }
  }, [selectedId, fileContents]);

  const saveFile = useCallback(async () => {
    if (!selectedId || !fileActive) return;
    const isMemFile = fileActive.startsWith('memory/') || fileActive.startsWith('memories/');
    const displayName = isMemFile ? fileActive.replace(/^memor(?:y|ies)\//, '') : fileActive;
    const confirmed = await confirm({
      title: a.confirmSave,
      message: (a.confirmSaveMsg || '').replace('{file}', displayName),
      confirmText: a.save,
      cancelText: a.cancel,
    });
    if (!confirmed) return;
    setFileSaving(true);
    try {
      if (isMemFile) {
        const realName = fileActive.replace(/^memor(?:y|ies)\//, '');
        // Try workspace memory API first, fall back to direct file write
        try {
          await workspaceMemoryApi.setFile(realName, fileDrafts[fileActive] || '', selectedId);
        } catch {
          await gwApi.agentFileSet(selectedId, fileActive, fileDrafts[fileActive] || '');
        }
      } else {
        await gwApi.agentFileSet(selectedId, fileActive, fileDrafts[fileActive] || '');
      }
      setFileContents(prev => ({ ...prev, [fileActive!]: fileDrafts[fileActive!] || '' }));
    } catch (err: any) { toast('error', err?.message || a.fileSaveFailed); }
    setFileSaving(false);
  }, [selectedId, fileActive, fileDrafts, a]);

  /** Build a generic fallback prompt for the given file type */
  const buildAiGenFallbackPrompt = useCallback((fileName: string) => {
    const agentIdentity = selectedId ? identity[selectedId] : null;
    const agentName = agentIdentity?.name || selectedId || '';
    const agentRole = agentIdentity?.role || '';
    const agentDesc = agentIdentity?.description || '';
    const isZh = language === 'zh' || language === 'zh-TW';
    const langHint = isZh ? 'Chinese' : language === 'ja' ? 'Japanese' : language === 'ko' ? 'Korean' : 'English';
    const fileKey = fileName.replace('.md', '').toLowerCase();
    const fileHints: Record<string, string> = isZh ? {
      soul: `写一份 SOUL.md 人设文件（Markdown，3-5段，第一人称）。\n涵盖：\n- 核心身份认同与职业哲学（工作风格、质量标准、价值观）\n- 专业领域专长与该智能体负责的具体决策范围\n- 在团队中的协作方式：产出什么、依赖谁、解除哪些阻碍\n- "完成"的定义：质量标准与验收条件\n- 一句指导性原则或个人座右铭`,
      agents: `写一份 AGENTS.md 会话启动指南（Markdown格式）。\n包含：\n- 会话开始时首先加载哪些上下文、文件或历史记录\n- 本次会话的主要目标与预期交付物\n- 与哪些团队成员协作、依赖关系与交接方式\n- 输出格式要求与质量标准\n- 需要遵守的约束条件或注意事项`,
      user: `写一份 USER.md 用户画像文件（Markdown格式）。\n包含：\n- 该智能体服务的用户/负责人的角色背景与决策上下文\n- 他们如何使用该智能体的产出（战略决策、执行落地、审查把关等）\n- 沟通偏好（异步文档、摘要汇报、详细数据等）\n- 对该智能体最看重的能力与期望\n- 对他们来说"高质量交付"意味着什么`,
      identity: `写一行 IDENTITY.md，严格格式：Name: X | Creature: X | Vibe: X | Emoji: X\n选择一种能体现该智能体个性的动物，2-4词的氛围描述，以及一个合适的emoji。`,
      heartbeat: `写一份 HEARTBEAT.md 任务清单（Markdown复选框格式）。\n要求：\n- 5-7个周期性日常/会话任务\n- 每项任务具体、可执行，格式：- [ ] 任务描述\n- 任务应真实反映该智能体的职责范围\n- 不要标题，不要其他文字，只输出复选框列表`,
    } : {
      soul: `Write a SOUL.md persona file in Markdown (3–5 paragraphs, first person).\nCover:\n- Core identity and professional philosophy (working style, quality bar, values)\n- Domain expertise and the specific decisions this agent owns\n- How they collaborate in the team: what they produce, who they depend on, what they unblock\n- Definition of done: quality standards and acceptance criteria\n- A guiding engineering/professional principle or personal motto`,
      agents: `Write an AGENTS.md session-startup guide in Markdown.\nInclude:\n- What context, files, or prior history to load first at session start\n- Primary goal and expected deliverables for this session\n- Collaboration touchpoints: which teammates, handoff format, dependencies\n- Output format requirements and quality standards\n- Constraints or important notes to keep in mind`,
      user: `Write a USER.md profile file in Markdown.\nInclude:\n- Role and background of the human/stakeholder this agent serves\n- How they consume this agent's outputs (strategic decisions, execution, review)\n- Communication preferences (async docs, summary reports, raw data, etc.)\n- What they value most from this agent and their expectations\n- What "high quality delivery" means to them`,
      identity: `Write a single-line IDENTITY.md in this exact format: Name: X | Creature: X | Vibe: X | Emoji: X\nPick a creature that fits the agent's personality, a 2–4 word vibe, and a fitting emoji.`,
      heartbeat: `Write a HEARTBEAT.md task checklist in Markdown.\nRequirements:\n- 5–7 recurring daily/session tasks\n- Each task is specific and actionable, format: - [ ] task description\n- Tasks must reflect this agent's actual responsibilities\n- No headings, no extra text — only the checkbox list`,
    };
    const hint = fileHints[fileKey] || (isZh ? `为 ${fileName} 生成高质量的 Markdown 内容。` : `Generate high-quality Markdown content for ${fileName}.`);
    const header = isZh
      ? `为智能体 "${agentName}" 生成 ${fileName} 文件内容。${agentRole ? `\n角色：${agentRole}` : ''}${agentDesc ? `\n描述：${agentDesc}` : ''}\n语言：中文\n\n`
      : `Generate ${fileName} content for agent "${agentName}".${agentRole ? `\nRole: ${agentRole}` : ''}${agentDesc ? `\nDescription: ${agentDesc}` : ''}\nLanguage: ${langHint}\n\n`;
    return header + hint;
  }, [identity, selectedId, language]);

  // Open AI generate panel — loads template list, starts with generic prompt (no auto-select)
  const openAiGen = useCallback(async () => {
    if (!fileActive || !selectedId) return;
    setAiGenResult(null);
    setAiGenStream('');
    setAiGenSelectedTplId('');
    setAiGenPrompt(buildAiGenFallbackPrompt(fileActive));
    setAiGenOpen(true);
    // Load multi-agent templates for the picker (fire-and-forget)
    try {
      const templates = await templateSystem.getMultiAgentTemplates(language);
      setAiGenTemplates(templates.filter(t =>
        t.content.prompts?.files || t.content.prompts?.agentFile
      ));
    } catch { /* templates optional */ }
  }, [fileActive, selectedId, language, buildAiGenFallbackPrompt]);

  /** Called when user picks a template from the dropdown — resolves per-file prompt */
  const handleAiGenSelectTemplate = useCallback((tplId: string) => {
    setAiGenSelectedTplId(tplId);
    if (!tplId) {
      if (fileActive) setAiGenPrompt(buildAiGenFallbackPrompt(fileActive));
      return;
    }
    const tpl = aiGenTemplates.find(t => t.id === tplId);
    console.debug('[AiGen] selectTemplate', tplId, 'templates loaded:', aiGenTemplates.length, 'found:', !!tpl);
    if (!tpl) {
      // Templates not yet loaded — selection will be re-applied by the useEffect below once they arrive
      console.debug('[AiGen] template list empty, will retry when loaded');
      return;
    }
    if (!tpl.content.prompts) {
      console.debug('[AiGen] template has no prompts, using fallback');
      if (fileActive) setAiGenPrompt(buildAiGenFallbackPrompt(fileActive));
      return;
    }
    const agentIdentity = selectedId ? identity[selectedId] : null;
    const agentName = agentIdentity?.name || selectedId || '';
    const agentRole = agentIdentity?.role || '';
    const agentDesc = agentIdentity?.description || '';
    const placeholders = { agentName, agentRole, agentDesc, scenarioName: agentRole || agentName };
    // Map filename → files key
    const fileKeyMap: Record<string, string> = { 'agents': 'agents', 'soul': 'soul', 'user': 'user', 'identity': 'identity', 'heartbeat': 'heartbeat' };
    const mappedKey = fileActive ? fileKeyMap[fileActive.replace('.md', '').toLowerCase()] : undefined;
    // Prefer prompts.files[key], fall back to prompts.agentFile
    const perFilePrompts = mappedKey ? tpl.content.prompts.files?.[mappedKey as keyof NonNullable<typeof tpl.content.prompts.files>] : undefined;
    console.debug('[AiGen] perFilePrompts:', !!perFilePrompts, 'agentFile:', !!tpl.content.prompts.agentFile, 'language:', language);
    const resolved = resolveTemplatePrompt(perFilePrompts ?? tpl.content.prompts.agentFile, language, placeholders);
    console.debug('[AiGen] resolved length:', resolved?.length ?? 0);
    if (resolved) setAiGenPrompt(resolved);
    else if (fileActive) setAiGenPrompt(buildAiGenFallbackPrompt(fileActive));
  }, [aiGenTemplates, fileActive, identity, selectedId, language, buildAiGenFallbackPrompt]);

  const handleAiGenRun = useCallback(() => {
    if (!fileActive || !selectedId || aiGenRunning) return;
    aiGenAbortRef.current?.abort();
    aiGenBufRef.current = '';
    if (aiGenRafRef.current !== null) { clearTimeout(aiGenRafRef.current); aiGenRafRef.current = null; }
    setAiGenStream('');
    setAiGenResult(null);
    setAiGenRunning(true);
    const agentName = identity?.name || selectedId;
    const agentRole = identity?.role || '';
    const agentDesc = identity?.description || '';
    const langHint = (language === 'zh' || language === 'zh-TW') ? 'Chinese' : language === 'ja' ? 'Japanese' : language === 'ko' ? 'Korean' : 'English';
    const req: WizardStep2Request = {
      agentId: selectedId,
      agentName,
      agentRole,
      agentDesc,
      scenarioName: agentRole || agentName,
      language: langHint,
      customPrompt: aiGenPrompt,
    };
    aiGenAbortRef.current = multiAgentApi.wizardStep2(
      req,
      (token) => {
        aiGenBufRef.current += token;
        if (aiGenRafRef.current === null) {
          aiGenRafRef.current = setTimeout(() => {
            setAiGenStream(aiGenBufRef.current);
            aiGenRafRef.current = null;
          }, 30);
        }
      },
      (data) => {
        setAiGenRunning(false);
        // Extract plain text from the parsed result if possible
        const parsed = data?.parsed ?? data;
        let content = '';
        if (parsed && typeof parsed === 'object') {
          const fileKey = fileActive!.replace('.md', '').toLowerCase();
          const keyMap: Record<string, string[]> = {
            soul: ['soul', 'soulSnippet'],
            agents: ['agentsMd', 'agents'],
            user: ['userMd', 'user'],
            identity: ['identityMd', 'identity'],
            heartbeat: ['heartbeat'],
          };
          const keys = keyMap[fileKey] ?? [];
          for (const k of keys) {
            if (parsed[k]) { content = parsed[k]; break; }
          }
          if (!content) content = aiGenBufRef.current;
        } else {
          content = aiGenBufRef.current;
        }
        setAiGenResult(content);
        setAiGenStream(content);
      },
      (code, msg) => {
        setAiGenRunning(false);
        toast('error', `${code}: ${msg}`);
      },
    );
  }, [fileActive, selectedId, identity, language, aiGenPrompt, aiGenRunning]);

  const handleAiGenStop = useCallback(() => {
    aiGenAbortRef.current?.abort();
    setAiGenRunning(false);
  }, []);

  const handleAiGenApply = useCallback(() => {
    if (!fileActive || !aiGenResult) return;
    setFileDrafts(prev => ({ ...prev, [fileActive!]: aiGenResult }));
    setAiGenOpen(false);
    setAiGenResult(null);
    setAiGenStream('');
  }, [fileActive, aiGenResult]);

  // CRUD state
  const [crudMode, setCrudMode] = useState<'create' | 'edit' | null>(null);
  const [crudName, setCrudName] = useState('');
  const [crudWorkspace, setCrudWorkspace] = useState('');
  const [crudModel, setCrudModel] = useState('');
  const [crudEmoji, setCrudEmoji] = useState('');
  const [crudDefault, setCrudDefault] = useState(false);
  const [crudTheme, setCrudTheme] = useState('');
  const [crudBusy, setCrudBusy] = useState(false);
  const [crudError, setCrudError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteFiles, setDeleteFiles] = useState(true);

  // Wake state
  const [waking, setWaking] = useState(false);
  const [wakeResult, setWakeResult] = useState<{ ok: boolean; text: string } | null>(null);

  // Browser request state
  const [browserUrl, setBrowserUrl] = useState('');
  const [browserMethod, setBrowserMethod] = useState('GET');
  const [browserBody, setBrowserBody] = useState('');
  const [browserSending, setBrowserSending] = useState(false);
  const [browserResult, setBrowserResult] = useState<{ ok: boolean; text: string } | null>(null);

  // Wake menu state (click-based for mobile support)
  const [wakeMenuOpen, setWakeMenuOpen] = useState(false);

  const handleWake = useCallback(async (mode: 'now' | 'next-heartbeat') => {
    setWakeMenuOpen(false);
    setWaking(true);
    setWakeResult(null);
    try {
      await gwApi.proxy('wake', { mode, text: a.wakeText });
      setWakeResult({ ok: true, text: a.wakeOk });
      setTimeout(() => setWakeResult(null), 3000);
    } catch (err: any) {
      setWakeResult({ ok: false, text: `${a.wakeFailed}: ${err?.message || ''}` });
    }
    setWaking(false);
  }, [a]);

  const handleBrowserRequest = useCallback(async () => {
    if (!browserUrl.trim() || browserSending) return;
    setBrowserSending(true);
    setBrowserResult(null);
    try {
      const payload: any = { method: browserMethod, path: browserUrl.trim() };
      if (['POST', 'PUT', 'PATCH'].includes(browserMethod) && browserBody.trim()) {
        try { payload.body = JSON.parse(browserBody.trim()); } catch { payload.body = browserBody.trim(); }
      }
      const res = await gwApi.proxy('browser.request', payload) as any;
      setBrowserResult({ ok: true, text: `${a.browserOk}${res?.status ? ` (${res.status})` : ''}` });
    } catch (err: any) {
      setBrowserResult({ ok: false, text: `${a.browserFailed}: ${err?.message || ''}` });
    }
    setBrowserSending(false);
  }, [browserUrl, browserMethod, browserBody, browserSending, a]);

  const openCreate = useCallback(() => {
    setCrudMode('create');
    // Generate a unique default name (hermes profiles: lowercase alphanumeric + hyphens)
    const existingIds = new Set(agents.map((ag: any) => ag.id));
    let idx = agents.length;
    let suggestedName = `agent-${idx}`;
    while (existingIds.has(suggestedName)) { idx++; suggestedName = `agent-${idx}`; }
    setCrudName(suggestedName);
    setCrudWorkspace('');
    setCrudModel('');
    setCrudEmoji('🤖');
    setCrudDefault(false);
    setCrudTheme('');
    setCrudError(null);
  }, [agents]);

  const openEdit = useCallback(() => {
    if (!selected) return;
    setCrudMode('edit');
    // Read raw values from config entry (not display labels)
    const cfg0 = config?.agents || config?.parsed?.agents || config?.config?.agents || {};
    const list = cfg0?.list || [];
    const entry = list.find((e: any) => e?.id === selected.id);
    const defaults = cfg0?.defaults;
    const rawWorkspace = entry?.workspace || defaults?.workspace || '';
    const rawModel = entry?.model || defaults?.model || '';
    const modelStr = typeof rawModel === 'string' ? rawModel : (rawModel?.primary || '');
    const isDefault = selected.id === defaultId;
    const theme = selected.identity?.theme || identity[selected.id]?.theme || '';
    setCrudName(resolveLabel(selected));
    setCrudWorkspace(rawWorkspace);
    setCrudModel(modelStr);
    setCrudEmoji(resolveEmoji(selected));
    setCrudDefault(isDefault);
    setCrudTheme(theme);
    setCrudError(null);
  }, [selected, config, defaultId, identity]);

  const handleCreate = useCallback(async () => {
    if (!gwReady || crudBusy) return;
    const name = crudName.trim().toLowerCase();
    if (!name) return;
    // hermes profile name: [a-z0-9][a-z0-9_-]{0,63}
    if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(name)) {
      setCrudError(a.nameValidation || 'Name must be lowercase alphanumeric (a-z, 0-9, hyphens, underscores)');
      return;
    }
    setCrudBusy(true); setCrudError(null);
    try {
      await gwApi.proxy('agents.create', {
        name,
        cloneFrom: 'default',
      });
      setCrudMode(null);
      loadAgents();
    } catch (err: any) {
      setCrudError(aRef.current.createFailed + ': ' + (err?.message || ''));
    }
    setCrudBusy(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crudName, crudBusy, loadAgents]);

  const handleUpdate = useCallback(async () => {
    if (!gwReady || crudBusy || !selectedId) return;
    setCrudBusy(true); setCrudError(null);
    try {
      // Build a minimal agent entry patch
      const agentEntry: Record<string, any> = { id: selectedId };
      if (crudName.trim()) agentEntry.name = crudName.trim();
      if (crudWorkspace.trim()) agentEntry.workspace = crudWorkspace.trim();
      if (crudModel.trim()) agentEntry.model = crudModel.trim();
      agentEntry.default = crudDefault || undefined;
      // Build identity patch (emoji + theme)
      const identityPatch: Record<string, any> = {};
      if (crudEmoji.trim()) identityPatch.emoji = crudEmoji.trim();
      if (crudTheme.trim()) identityPatch.theme = crudTheme.trim();
      if (Object.keys(identityPatch).length > 0) agentEntry.identity = identityPatch;
      // Patch config via config.patch (merges agents.list by id)
      await gwApi.configSafePatch({ agents: { list: [agentEntry] } });
      setCrudMode(null);
      loadAgents();
      loadConfig();
    } catch (err: any) {
      setCrudError(aRef.current.updateFailed + ': ' + (err?.message || ''));
    }
    setCrudBusy(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, crudName, crudWorkspace, crudModel, crudEmoji, crudDefault, crudTheme, crudBusy, loadAgents]);

  const handleDelete = useCallback(async () => {
    if (!gwReady || crudBusy || !selectedId) return;
    setCrudBusy(true); setCrudError(null);
    try {
      const deletedId = selectedId;
      await gwApi.proxy('agents.delete', { agentId: deletedId, deleteFiles });
      // Clean up stale agent ID from A2A allow list and subagent configs
      try {
        const cfg: any = await gwApi.configGet();
        const parsed = cfg?.parsed || cfg?.config || cfg || {};
        const patch: Record<string, any> = {};
        let needsPatch = false;
        // Remove deleted agent from tools.agentToAgent.allow
        const a2aAllow: string[] = parsed?.tools?.agentToAgent?.allow;
        if (Array.isArray(a2aAllow) && a2aAllow.includes(deletedId)) {
          const cleaned = a2aAllow.filter(id => id !== deletedId);
          patch.tools = { agentToAgent: { ...parsed.tools.agentToAgent, allow: cleaned.length > 0 ? cleaned : undefined } };
          needsPatch = true;
        }
        // Remove deleted agent from all subagent allowAgents lists
        const agentsList: any[] = parsed?.agents?.list;
        if (Array.isArray(agentsList)) {
          let listChanged = false;
          const cleanedList = agentsList.map((entry: any) => {
            const subs: string[] = entry?.subagents?.allowAgents;
            if (!Array.isArray(subs) || !subs.includes(deletedId)) return entry;
            listChanged = true;
            const filtered = subs.filter(id => id !== deletedId);
            const sub = { ...(entry.subagents || {}), allowAgents: filtered.length > 0 ? filtered : undefined };
            if (!sub.allowAgents && !sub.model && !sub.thinking) return { ...entry, subagents: undefined };
            return { ...entry, subagents: sub };
          });
          if (listChanged) {
            patch.agents = { ...(parsed.agents || {}), list: cleanedList };
            needsPatch = true;
          }
        }
        if (needsPatch) {
          const fresh = await gwApi.configSafePatch(patch);
          setConfig(fresh);
        }
      } catch { /* best-effort cleanup */ }
      setDeleteConfirm(false);
      setSelectedId(null);
      setA2aDraft(null);
      setSubDraft(null);
      loadAgents();
    } catch (err: any) {
      setCrudError(aRef.current.deleteFailed + ': ' + (err?.message || ''));
    }
    setCrudBusy(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, deleteFiles, crudBusy, loadAgents]);

  const resolveLabel = (ag: any) => {
    const id = identity[ag.id];
    const explicitName = ag.name?.trim();
    if (explicitName && explicitName !== ag.id) return explicitName;
    return id?.name?.trim() || ag.identity?.name?.trim() || explicitName || ag.id;
  };
  const resolveEmoji = (ag: any) => {
    const id = identity[ag.id];
    return id?.emoji?.trim() || ag.identity?.emoji?.trim() || id?.avatar?.trim() || ag.identity?.avatar?.trim() || '';
  };

  const resolveAgentLabel = (agentId: string): string => {
    const ag = agents.find((x: any) => x.id === agentId);
    if (ag) return resolveLabel(ag);
    return agentId;
  };

  const resolveAgentConfig = (agentId: string) => {
    if (!config) return { model: na, workspace: a.workspaceDefault, skills: null, tools: null };
    const cfg0 = config?.agents || config?.parsed?.agents || config?.config?.agents || {};
    const list = cfg0?.list || [];
    const entry = list.find((e: any) => e?.id === agentId);
    const defaults = cfg0?.defaults;
    const model = entry?.model || defaults?.model;
    const modelLabel = typeof model === 'string' ? model : (model?.primary || na);
    const fallbacks = typeof model === 'object' ? model?.fallbacks : null;
    const toolsCfg = config?.tools || config?.parsed?.tools || config?.config?.tools || null;
    // runtimeModel: actual model used at runtime from agents.list (hermesagent >=2026.3.28)
    const runtimeEntry = agents.find((ag: any) => ag.id === agentId);
    const runtimeModel: string | undefined = runtimeEntry?.runtimeModel || runtimeEntry?.activeModel || undefined;
    return {
      model: modelLabel + (Array.isArray(fallbacks) && fallbacks.length > 0 ? ` (+${fallbacks.length})` : ''),
      runtimeModel,
      workspace: entry?.workspace || defaults?.workspace || a.workspaceDefault,
      skills: entry?.skills || null,
      tools: entry?.tools || toolsCfg,
      subagents: entry?.subagents || null,
      _entry: entry,
      _defaults: defaults,
    };
  };

  // Send message to agent via REST proxy (streaming events come via Manager WS)
  const sendToAgent = useCallback(async () => {
    if (!gwReady || runSending || !selectedId) return;
    const msg = runInput.trim();
    if (!msg) return;

    // SessionKey format: agent:<agentId>:<sessionName>
    const sessionName = `run-${Date.now()}`;
    const sessionKey = `agent:${selectedId}:${sessionName}`;
    runSessionRef.current = sessionKey;

    setRunMessages(prev => [...prev, { role: 'user', text: msg, ts: Date.now() }]);
    setRunInput('');
    setRunSending(true);
    setRunError(null);
    setRunStream('');

    try {
      const idempotencyKey = `${sessionKey}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const res = await gwApi.proxy('chat.send', {
        sessionKey,
        message: msg,
        idempotencyKey,
      }) as any;
      runIdRef.current = res?.runId || idempotencyKey;
    } catch (err: any) {
      setRunStream(null);
      setRunError(err?.message || aRef.current.runFailed);
    } finally {
      setRunSending(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runInput, runSending, selectedId]);

  const handleRunAbort = useCallback(async () => {
    if (!gwReady) return;
    try {
      await gwApi.proxy('chat.abort', { sessionKey: runSessionRef.current, runId: runIdRef.current || undefined });
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRunKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendToAgent();
    }
  }, [sendToAgent]);

  const handleRunInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRunInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, []);

  const isRunStreaming = runIdRef.current !== null || runStream !== null;

  const ma = ((t as any).multiAgent || {}) as any;
  const sc = ((t as any).scenario || {}) as any;
  const TABS: { id: Panel; icon: string; label: string }[] = [
    { id: 'overview', icon: 'dashboard', label: a.overview },
    { id: 'files', icon: 'description', label: a.files },
    { id: 'tools', icon: 'build', label: a.tools },
    { id: 'skills', icon: 'extension', label: a.skills },
    { id: 'channels', icon: 'forum', label: a.channels },
    { id: 'cron', icon: 'schedule', label: a.cron },
    { id: 'tasks', icon: 'task_alt', label: a.tasks || 'Tasks' },
    // 'scenarios' and 'collaboration' tabs hidden — not yet adapted for hermes-agent
  ];

  const TOOL_SECTIONS = [
    { label: 'Files', tools: ['read', 'write', 'edit', 'apply_patch'] },
    { label: 'Runtime', tools: ['exec', 'process'] },
    { label: 'Web', tools: ['web_search', 'web_fetch'] },
    { label: 'Memory', tools: ['memory_search', 'memory_get'] },
    { label: 'Sessions', tools: ['sessions_list', 'sessions_history', 'sessions_send', 'sessions_spawn', 'session_status'] },
    { label: 'UI', tools: ['browser', 'canvas'] },
    { label: 'Messaging', tools: ['message'] },
    { label: 'Automation', tools: ['cron', 'gateway'] },
    { label: 'Agents', tools: ['agents_list'] },
    { label: 'Media', tools: ['image'] },
  ];

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50/50 dark:bg-transparent">
      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div className="md:hidden fixed top-[32px] bottom-[72px] start-0 end-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
      )}

      {/* Sidebar — desktop: static, mobile: slide-out drawer */}
      <div className={`fixed md:static top-[32px] bottom-[72px] md:top-auto md:bottom-auto start-0 z-50 w-64 md:w-56 lg:w-64 shrink-0 border-e border-slate-200/60 dark:border-white/[0.06] theme-panel flex flex-col transform transition-transform duration-200 ease-out ${drawerOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full md:translate-x-0'}`}>
        <div className="p-3 border-b border-slate-200/60 dark:border-white/[0.06] neon-divider">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-slate-700 dark:text-white/80">{a.title}</h2>
              <p className="text-[11px] text-slate-400 dark:text-white/35">{agents.length} {menuAgentsLabel}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={openCreate} disabled={!gwReady}
                className="p-1 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-all disabled:opacity-30"
                title={a.createAgent}>
                <span className="material-symbols-outlined text-[16px]">add</span>
              </button>
              <button onClick={loadAgents} disabled={loading} className="p-1 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-all disabled:opacity-40">
                <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
              </button>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar neon-scrollbar p-1.5 space-y-0.5">
          {agents.length === 0 ? (
            <p className="text-[10px] text-slate-400 dark:text-white/20 text-center py-8">{a.noAgents}</p>
          ) : agents.map((ag: any) => {
            const emoji = resolveEmoji(ag);
            const label = resolveLabel(ag);
            const isDefault = ag.id === defaultId;
            const isSelected = ag.id === selectedId;
            return (
              <button key={ag.id} onClick={() => selectAgent(ag.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-start transition-all ${isSelected ? 'bg-primary/10 border border-primary/20 glow-border' : 'hover:bg-slate-100 dark:hover:bg-white/[0.03] border border-transparent'}`}>
                <div className={`relative w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${isSelected ? 'bg-primary/20 text-primary' : 'theme-field theme-text-muted'}`}>
                  {emoji || label.slice(0, 1).toUpperCase()}
                  {lastHeartbeat && (Date.now() - lastHeartbeat.ts < 120000) && (
                    <span className="absolute -bottom-0.5 -end-0.5 w-2.5 h-2.5 rounded-full bg-mac-green border-2 border-white dark:border-[#1a1c22]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[11px] font-semibold truncate ${isSelected ? 'text-primary' : 'text-slate-700 dark:text-white/70'}`}>{label}</p>
                  <p className="text-[11px] text-slate-400 dark:text-white/35 font-mono truncate">{ag.id}</p>
                </div>
                {isDefault && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold shrink-0">default</span>}
              </button>
            );
          })}
        </div>

        {/* Agent-to-Agent Communication — hidden (hermes-agent has no A2A concept) */}
        {false && (() => {
          const parsed = config?.parsed || config?.config || config || {};
          const a2aCfg = parsed?.tools?.agentToAgent || {};
          const serverEnabled = a2aCfg.enabled === true;
          const serverAllow: string[] = Array.isArray(a2aCfg.allow) ? a2aCfg.allow : [];
          const serverPPTurns: number = typeof parsed?.session?.agentToAgent?.maxPingPongTurns === 'number' ? parsed.session.agentToAgent.maxPingPongTurns : 5;
          const a2aEnabled = a2aDraft?.enabled ?? serverEnabled;
          const a2aAllow = a2aDraft?.allow ?? serverAllow;
          const ppTurns = a2aDraft?.ppTurns ?? serverPPTurns;
          const agentOpts = agents.filter((ag: any) => !a2aAllow.includes(ag.id)).map((ag: any) => ag.id);
          const a2aDirty = a2aDraft !== null && (a2aDraft.enabled !== serverEnabled || JSON.stringify(a2aDraft.allow) !== JSON.stringify(serverAllow) || a2aDraft.ppTurns !== serverPPTurns);
          const initDraft = () => a2aDraft || { enabled: serverEnabled, allow: [...serverAllow], ppTurns: serverPPTurns };

          const saveA2aAll = async () => {
            if (!a2aDraft) return;
            setA2aSaving(true);
            try {
              // When enabled with empty allow → default to * (all); when disabled → explicitly null to clear via merge-patch
              const resolvedAllow = a2aDraft.enabled
                ? (a2aDraft.allow.length > 0 ? a2aDraft.allow : ['*'])
                : null;
              const fresh = await gwApi.configSafePatch({
                tools: { agentToAgent: { enabled: a2aDraft.enabled, allow: resolvedAllow } },
                session: { agentToAgent: { maxPingPongTurns: a2aDraft.ppTurns } },
              });
              setConfig(fresh);
              setA2aDraft(null);
              toast('success', a.a2aSaved || 'Saved');
            } catch (err: any) {
              toast('error', err?.message || a.a2aSaveFailed || 'Failed to save');
            }
            setA2aSaving(false);
          };

          return (
            <div className="shrink-0 border-t border-slate-200/60 dark:border-white/[0.06] p-2.5">
              <div className={`rounded-lg border p-2.5 transition-colors ${a2aEnabled ? 'bg-violet-50/50 dark:bg-violet-500/[0.03] border-violet-200/60 dark:border-violet-500/[0.12]' : 'bg-white/50 dark:bg-white/[0.02] border-slate-200/40 dark:border-white/[0.04]'}`}>
                <button className="flex items-center justify-between w-full" onClick={() => setA2aExpanded(v => !v)}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`material-symbols-outlined text-[15px] ${a2aEnabled ? 'text-violet-500' : 'text-slate-400 dark:text-white/25'}`}>swap_horiz</span>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-white/60 truncate">{a.a2aTitle || 'Agent-to-Agent'}</span>
                    {a2aEnabled && <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />}
                  </div>
                  <span className={`material-symbols-outlined text-[14px] text-slate-400 dark:text-white/25 transition-transform ${a2aExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                </button>

                {a2aExpanded && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200/40 dark:border-white/[0.06] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-slate-400 dark:text-white/20 uppercase">{a.a2aEnabled || 'Enabled'}</span>
                      <button
                        onClick={() => { const d = initDraft(); const next = !d.enabled; setA2aDraft({ ...d, enabled: next, allow: next ? (d.allow.length > 0 ? d.allow : ['*']) : [] }); }}
                        disabled={a2aSaving}
                        className={`relative w-8 h-4 rounded-full transition-colors shrink-0 ${a2aEnabled ? 'bg-violet-500' : 'bg-slate-300 dark:bg-white/15'} ${a2aSaving ? 'opacity-50' : 'cursor-pointer'}`}
                      >
                        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all ${a2aEnabled ? 'start-[17px]' : 'start-0.5'}`} />
                      </button>
                    </div>

                    <div>
                      <p className="text-[9px] font-bold text-slate-400 dark:text-white/20 uppercase tracking-wider mb-1.5">
                        {a.a2aAllowTitle || 'Allowed Agents'}
                      </p>

                      {a2aAllow.filter(id => id !== '*' && !id.includes('*')).length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {a2aAllow.filter(id => id !== '*' && !id.includes('*')).map(id => (
                              <div key={id} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-200/60 dark:border-violet-500/20">
                                {resolveAgentLabel(id)}
                                <button onClick={() => { const d = initDraft(); setA2aDraft({ ...d, allow: d.allow.filter(x => x !== id) }); }} disabled={a2aSaving}
                                  className="p-0 opacity-40 hover:opacity-100 transition-opacity">
                                  <span className="material-symbols-outlined text-[9px]">close</span>
                                </button>
                              </div>
                          ))}
                        </div>
                      )}

                      <CustomSelect
                        value=""
                        onChange={(v: string) => { if (!v || a2aAllow.includes(v)) return; const d = initDraft(); if (v === '*') { setA2aDraft({ ...d, allow: ['*'] }); } else { setA2aDraft({ ...d, allow: [...d.allow.filter(x => x !== '*'), v] }); } }}
                        options={[
                          { value: '', label: a.a2aAddAgent || 'Add agent…' },
                          { value: '*', label: `* (${a.a2aAllWildcard || 'all agents'})` },
                          ...agentOpts.map((id: string) => ({ value: id, label: resolveAgentLabel(id) }))
                        ]}
                        className="w-full h-7 px-2 bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-md text-[10px] text-slate-600 dark:text-white/60"
                        disabled={a2aSaving}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-dashed border-slate-200/40 dark:border-white/[0.06]">
                      <span className="text-[9px] font-bold text-slate-400 dark:text-white/20 uppercase">{a.a2aPingPong || 'Ping-Pong'}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => { const d = initDraft(); if (d.ppTurns > 0) setA2aDraft({ ...d, ppTurns: d.ppTurns - 1 }); }} disabled={a2aSaving || ppTurns <= 0}
                          className="w-5 h-5 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/40 hover:bg-violet-100 dark:hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-400 transition-colors disabled:opacity-30 flex items-center justify-center">
                          <span className="material-symbols-outlined text-[12px]">remove</span>
                        </button>
                        <span className="w-5 text-center text-[11px] font-bold text-violet-600 dark:text-violet-400">{ppTurns}</span>
                        <button onClick={() => { const d = initDraft(); if (d.ppTurns < 5) setA2aDraft({ ...d, ppTurns: d.ppTurns + 1 }); }} disabled={a2aSaving || ppTurns >= 5}
                          className="w-5 h-5 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/40 hover:bg-violet-100 dark:hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-400 transition-colors disabled:opacity-30 flex items-center justify-center">
                          <span className="material-symbols-outlined text-[12px]">add</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {(a2aDirty || a2aSaving) && (
                  <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-200/40 dark:border-white/[0.06]">
                    <button
                      onClick={saveA2aAll}
                      disabled={a2aSaving || !a2aDirty}
                      className="h-6 px-3 rounded-md text-[10px] font-bold text-white bg-violet-500 hover:bg-violet-600 disabled:opacity-50 transition-colors flex items-center gap-1"
                    >
                      {a2aSaving
                        ? <><span className="material-symbols-outlined text-[11px] animate-spin">progress_activity</span>{a.saving}</>
                        : <><span className="material-symbols-outlined text-[11px]">save</span>{a.save}</>}
                    </button>
                    {a2aDirty && !a2aSaving && (
                      <button
                        onClick={() => setA2aDraft(null)}
                        className="h-6 px-2 rounded-md text-[10px] font-bold text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/60 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                      >{a.reset}</button>
                    )}
                    {a2aDirty && <span className="text-[9px] text-amber-500 font-bold">{a.unsaved}</span>}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Mobile hamburger for empty state */}
            <div className="md:hidden flex items-center px-4 pt-3 pb-1 shrink-0">
              <button onClick={() => setDrawerOpen(true)} className="p-1.5 -ms-1 rounded-lg text-slate-500 dark:text-white/50 hover:text-primary hover:bg-primary/5 transition-all">
                <span className="material-symbols-outlined text-[20px]">menu</span>
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-slate-400 dark:text-white/20">
                <span className="material-symbols-outlined text-4xl mb-2 animate-glow-breathe">smart_toy</span>
                <p className="text-sm">{a.selectAgent}</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Agent Header */}
            <div className="shrink-0 px-4 md:px-5 pt-3 md:pt-4 pb-0">
              <div className="flex items-center gap-3">
                {/* Hamburger menu — mobile only */}
                <button onClick={() => setDrawerOpen(true)} className="md:hidden p-1.5 -ms-1 rounded-lg text-slate-500 dark:text-white/50 hover:text-primary hover:bg-primary/5 transition-all shrink-0">
                  <span className="material-symbols-outlined text-[20px]">menu</span>
                </button>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg font-bold text-primary shrink-0 animate-glow-breathe">
                  {resolveEmoji(selected) || resolveLabel(selected).slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-800 dark:text-white truncate">{resolveLabel(selected)}</h2>
                    {selected.id === defaultId && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{(t as any).default}</span>}
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-white/40 font-mono">{selected.id}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <div className="relative">
                    <button onClick={() => setWakeMenuOpen(v => !v)} disabled={!gwReady || waking}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-500/5 transition-all disabled:opacity-30"
                      title={a.wake}>
                      <span className={`material-symbols-outlined text-[16px] ${waking ? 'animate-spin' : ''}`}>{waking ? 'progress_activity' : 'alarm'}</span>
                    </button>
                    {wakeMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setWakeMenuOpen(false)} />
                        <div className="absolute end-0 top-full mt-1 z-30">
                          <div className="theme-panel sci-card rounded-xl shadow-xl p-1 min-w-[140px]">
                            <button onClick={() => handleWake('now')}
                              className="w-full text-start px-3 py-1.5 rounded-lg text-[10px] font-bold theme-text-secondary hover:bg-amber-500/10 hover:text-amber-600 transition-colors">
                              {a.wakeNow}
                            </button>
                            <button onClick={() => handleWake('next-heartbeat')}
                              className="w-full text-start px-3 py-1.5 rounded-lg text-[10px] font-bold theme-text-secondary hover:bg-amber-500/10 hover:text-amber-600 transition-colors">
                              {a.wakeNext}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <button onClick={openEdit} disabled={!gwReady}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-all disabled:opacity-30"
                    title={a.edit}>
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                  <button onClick={() => selected.id !== defaultId && setDeleteConfirm(true)}
                    disabled={!gwReady || selected.id === defaultId}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-mac-red hover:bg-mac-red/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    title={selected.id === defaultId ? a.defaultCannotDelete : a.delete}>
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
                {wakeResult && (
                  <div className={`absolute top-14 end-4 px-3 py-1.5 rounded-xl text-[10px] font-bold z-30 shadow-lg ${wakeResult.ok ? 'bg-mac-green/10 text-mac-green border border-mac-green/20' : 'bg-red-50 dark:bg-red-500/5 text-red-500 border border-red-200 dark:border-red-500/20'}`}>
                    {wakeResult.text}
                  </div>
                )}
              </div>

              {/* Tabs — horizontally scrollable on mobile */}
              <div className="flex gap-0.5 mt-3 border-b border-slate-200/60 dark:border-white/[0.06] overflow-x-auto no-scrollbar neon-divider">
                {TABS.map(tab => (
                  <button key={tab.id} onClick={() => selectPanel(tab.id)}
                    className={`px-3 py-2 text-[11px] font-medium border-b-2 transition-all whitespace-nowrap shrink-0 flex items-center gap-1 ${panel === tab.id ? 'border-primary text-primary' : 'border-transparent theme-text-muted hover:text-slate-700 dark:hover:text-white/60'}`}>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar neon-scrollbar p-4 md:p-5">
              {/* Overview Panel */}
              {panel === 'overview' && (() => {
                const cfg = resolveAgentConfig(selected.id);
                const ident = identity[selected.id];
                return (
                  <div className="space-y-4 max-w-5xl">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { label: a.workspace, value: cfg.workspace, icon: 'folder' },
                        { label: a.model, value: cfg.runtimeModel && cfg.runtimeModel !== cfg.model ? `${cfg.model} → ${cfg.runtimeModel}` : cfg.model, icon: 'smart_toy' },
                        { label: a.identity, value: ident?.name || selected.identity?.name || na, icon: 'person' },
                        { label: a.agentStatus, value: lastHeartbeat && (Date.now() - lastHeartbeat.ts < 120000) ? a.online : a.offline, icon: 'circle', statusColor: lastHeartbeat && (Date.now() - lastHeartbeat.ts < 120000) ? 'text-mac-green' : 'text-slate-400' },
                        { label: a.lastHeartbeat, value: lastHeartbeat ? fmtHeartbeatAgo(lastHeartbeat.ts, a.heartbeatAgo, a.heartbeatNever) : a.heartbeatNever, icon: 'favorite' },
                        { label: a.isDefault, value: selected.id === defaultId ? a.yes : a.no, icon: 'star' },
                        { label: a.skills, value: cfg.skills ? `${cfg.skills.length} selected` : (t as any).menu?.all, icon: 'extension' },
                      ].map((kv: any) => (
                        <div key={kv.label} className="rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] p-3 sci-card">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className={`material-symbols-outlined text-[13px] ${kv.statusColor || 'text-slate-400 dark:text-white/40'}`}>{kv.icon}</span>
                            <span className="text-[11px] font-bold text-slate-400 dark:text-white/40 uppercase">{kv.label}</span>
                          </div>
                          <p className={`text-[11px] font-semibold font-mono truncate ${kv.statusColor || 'text-slate-700 dark:text-white/70'}`}>{kv.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Toolsets quick summary — link to Tools tab */}
                    <div className="rounded-xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.03] p-4">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-primary">build</span>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[11px] font-bold text-slate-700 dark:text-white/70 uppercase">{a.toolAccess || 'Toolsets'}</h4>
                          <p className="text-[10px] text-slate-400 dark:text-white/30">{a.toolsetOverviewHint || 'Manage enabled toolsets in the Tools tab'}</p>
                        </div>
                        <button onClick={() => selectPanel('tools')}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-colors flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                          {a.tools}
                        </button>
                      </div>
                    </div>

                    {selected.identity?.theme && (
                      <div className="rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] p-3">
                        <p className="text-[11px] font-bold text-slate-400 dark:text-white/40 uppercase mb-1">{a.theme}</p>
                        <p className="text-[11px] text-slate-600 dark:text-white/50">{selected.identity.theme}</p>
                      </div>
                    )}

                    {/* Subagents — hidden (hermes-agent has no subagent concept) */}
                    {false && (() => {
                      const parsed = config?.parsed || config?.config || config || {};
                      const cfg0 = parsed?.agents || {};
                      const list: any[] = cfg0?.list || [];
                      const entry = list.find((e: any) => e?.id === selected.id);
                      const subCfg = entry?.subagents || {};
                      const serverAllow: string[] = Array.isArray(subCfg.allowAgents) ? subCfg.allowAgents : [];
                      const allowAgents = subDraft ?? serverAllow;
                      const hasSubagents = allowAgents.length > 0;
                      const otherAgents = agents.filter((ag: any) => ag.id !== selected.id && !allowAgents.includes(ag.id)).map((ag: any) => ag.id);
                      const subDirty = subDraft !== null && JSON.stringify(subDraft) !== JSON.stringify(serverAllow);

                      const saveSubAll = async () => {
                        if (subDraft === null) return;
                        setSubSaving(true);
                        try {
                          const currentEntry = list.find((e: any) => e?.id === selected.id) || {};
                          const sub = { ...(currentEntry.subagents || {}), allowAgents: subDraft.length > 0 ? subDraft : undefined };
                          // Use null (not undefined) to delete the field via merge-patch semantics
                          const subPatch: any = (!sub.allowAgents && !sub.model && !sub.thinking) ? null : sub;
                          const fresh = await gwApi.configSafePatch({ agents: { list: [{ id: selected.id, subagents: subPatch }] } });
                          setConfig(fresh);
                          setSubDraft(null);
                          toast('success', a.subSaved || 'Saved');
                        } catch (err: any) {
                          toast('error', err?.message || a.subSaveFailed || 'Failed to save');
                        }
                        setSubSaving(false);
                      };

                      return (
                        <div className={`rounded-xl border p-4 transition-colors ${hasSubagents ? 'bg-cyan-50/50 dark:bg-cyan-500/[0.03] border-cyan-200/60 dark:border-cyan-500/[0.12]' : 'bg-white dark:bg-white/[0.03] border-slate-200/60 dark:border-white/[0.06]'}`}>
                          <div className="flex items-center gap-2 mb-3">
                            <span className={`material-symbols-outlined text-[18px] ${hasSubagents ? 'text-cyan-500' : 'text-slate-400 dark:text-white/30'}`}>account_tree</span>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-[11px] font-bold text-slate-700 dark:text-white/70 uppercase">{a.subTitle || 'Subagents'}</h4>
                              <p className="text-[10px] text-slate-400 dark:text-white/30">{a.subDesc || 'Agents this agent can delegate tasks to via sessions_spawn'}</p>
                            </div>
                          </div>

                          <p className="text-[10px] text-slate-400 dark:text-white/25 mb-3">
                            {hasSubagents
                              ? (a.subAllowHint || 'This agent can spawn the listed agents as subagents')
                              : (a.subAllowEmpty || 'No subagent delegation configured — this agent cannot spawn other agents')}
                          </p>

                          {allowAgents.filter(id => id !== '*').length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {allowAgents.filter(id => id !== '*').map(id => {
                                const ag = agents.find((x: any) => x.id === id);
                                return (
                                  <div key={id} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                                    ag
                                      ? 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-200/60 dark:border-cyan-500/20'
                                      : 'bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-white/40 border border-slate-200/60 dark:border-white/10'
                                  }`}>
                                    <span className="material-symbols-outlined text-[11px]">smart_toy</span>
                                    {resolveAgentLabel(id)}
                                    <button
                                      onClick={() => setSubDraft((subDraft ?? [...serverAllow]).filter(x => x !== id))}
                                      disabled={subSaving}
                                      className="p-0 ms-0.5 opacity-40 hover:opacity-100 transition-opacity"
                                    >
                                      <span className="material-symbols-outlined text-[10px]">close</span>
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <CustomSelect
                              value=""
                              onChange={(v: string) => { if (!v || allowAgents.includes(v)) return; if (v === '*') { setSubDraft(['*']); } else { setSubDraft([...(subDraft ?? [...serverAllow]).filter(x => x !== '*'), v]); } }}
                              options={[
                                { value: '', label: a.subAddAgent || 'Add subagent…' },
                                { value: '*', label: `* (${a.a2aAllWildcard || 'all agents'})` },
                                ...otherAgents.map((id: string) => ({ value: id, label: resolveAgentLabel(id) }))
                              ]}
                              className="flex-1 h-8 px-2.5 bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-lg text-[11px] text-slate-600 dark:text-white/60"
                              disabled={subSaving}
                            />
                          </div>

                          {(subDirty || subSaving) && (
                            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-200/40 dark:border-white/[0.06]">
                              <button
                                onClick={saveSubAll}
                                disabled={subSaving || !subDirty}
                                className="h-6 px-3 rounded-md text-[10px] font-bold text-white bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 transition-colors flex items-center gap-1"
                              >
                                {subSaving
                                  ? <><span className="material-symbols-outlined text-[11px] animate-spin">progress_activity</span>{a.saving}</>
                                  : <><span className="material-symbols-outlined text-[11px]">save</span>{a.save}</>}
                              </button>
                              {subDirty && !subSaving && (
                                <button
                                  onClick={() => setSubDraft(null)}
                                  className="h-6 px-2 rounded-md text-[10px] font-bold text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/60 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                                >{a.reset}</button>
                              )}
                              {subDirty && <span className="text-[9px] text-amber-500 font-bold">{a.unsaved}</span>}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}

              {/* Files Panel */}
              {panel === 'files' && (
                <div className="flex flex-col md:flex-row gap-4 max-w-5xl" style={{ minHeight: 300 }}>
                  <div className="w-full md:w-48 shrink-0 space-y-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold theme-text-muted uppercase">{a.coreFiles}</span>
                      <button onClick={() => { if (selectedId) { gwApi.agentFilesList(selectedId).then(setFilesList).catch((err: any) => { toast('error', err?.message || a.fetchFailed); }); workspaceMemoryApi.list(selectedId).then(r => setMemoryFiles(r?.files || [])).catch(() => setMemoryFiles([])); } }} className="text-[10px] text-primary hover:underline">{a.refresh}</button>
                    </div>
                    {(filesList?.files || []).length === 0 ? (
                      <p className="text-[10px] text-slate-400 dark:text-white/20 py-4 text-center">{a.noFiles}</p>
                    ) : (filesList?.files || []).map((f: any) => (
                      <button key={f.name} onClick={() => loadFile(f.name)}
                        className={`w-full text-start px-2.5 py-2 rounded-lg text-[10px] transition-all ${fileActive === f.name ? 'bg-primary/10 text-primary border border-primary/20' : 'hover:bg-slate-100 dark:hover:bg-white/[0.03] border border-transparent'}`}>
                        <p className="font-mono font-semibold truncate">{f.name}</p>
                        <p className="text-[11px] text-slate-400 dark:text-white/35 mt-0.5">
                          {f.missing ? <span className="text-mac-yellow">{a.fileMissing}</span> : fmtBytes(f.size)}
                        </p>
                      </button>
                    ))}

                    {/* Memory Logs Section */}
                    <div className="border-t border-slate-200/40 dark:border-white/[0.06] mt-3 pt-3">
                      <button onClick={() => setMemoryExpanded(!memoryExpanded)}
                        className="w-full flex items-center justify-between mb-2 group">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[13px] text-primary/70 transition-transform" style={{ transform: memoryExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}>expand_more</span>
                          <span className="text-[10px] font-bold theme-text-muted uppercase">{a.memoryLogs || 'Memory Logs'}</span>
                          {memoryFiles.length > 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{memoryFiles.length}</span>
                          )}
                        </div>
                      </button>
                      {memoryExpanded && (
                        <>
                          {memoryFiles.length === 0 ? (
                            <p className="text-[10px] text-slate-400 dark:text-white/20 py-3 text-center">{a.noMemoryLogs || 'No daily memory logs yet'}</p>
                          ) : (
                            <>
                              {memoryFiles.slice(0, memoryShowCount).map((mf: MemoryFileEntry) => {
                                const key = 'memory/' + mf.name;
                                const dateStr = mf.name.replace('.md', '');
                                const today = new Date().toISOString().slice(0, 10);
                                const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
                                const label = dateStr === today ? (a.memoryToday || 'Today') : dateStr === yesterday ? (a.memoryYesterday || 'Yesterday') : dateStr;
                                return (
                                  <button key={key} onClick={() => loadFile(key)}
                                    className={`w-full text-start px-2.5 py-1.5 rounded-lg text-[10px] transition-all ${fileActive === key ? 'bg-primary/10 text-primary border border-primary/20' : 'hover:bg-slate-100 dark:hover:bg-white/[0.03] border border-transparent'}`}>
                                    <div className="flex items-center gap-1.5">
                                      <span className="material-symbols-outlined text-[12px] text-slate-400 dark:text-white/30">calendar_today</span>
                                      <span className="font-mono font-semibold truncate">{label}</span>
                                    </div>
                                    <p className="text-[9px] text-slate-400 dark:text-white/30 mt-0.5 ps-5">{fmtBytes(mf.size)}</p>
                                  </button>
                                );
                              })}
                              {memoryFiles.length > memoryShowCount && (
                                <button onClick={() => setMemoryShowCount(prev => prev + 30)}
                                  className="w-full text-center text-[10px] text-primary hover:underline py-1.5">
                                  {a.showMore || 'Show More'} ({memoryFiles.length - memoryShowCount})
                                </button>
                              )}
                              {memoryShowCount > 7 && memoryFiles.length <= memoryShowCount && (
                                <button onClick={() => setMemoryShowCount(7)}
                                  className="w-full text-center text-[10px] text-slate-400 hover:text-primary hover:underline py-1.5">
                                  {a.showLess || 'Show Less'}
                                </button>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    {!fileActive ? (
                      <div className="flex items-center justify-center h-full text-slate-400 dark:text-white/20 text-[11px]">{a.selectFile}</div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono font-bold theme-text-secondary">
                            {(fileActive?.startsWith('memory/') || fileActive?.startsWith('memories/')) ? (
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px] text-primary/60">calendar_today</span>
                                {fileActive.replace(/^memor(?:y|ies)\//, '')}
                              </span>
                            ) : fileActive}
                          </span>
                          <div className="flex gap-2">
                            {/* AI Generate button — shown for core agent files */}
                            {fileActive && AI_GEN_FILES.includes(fileActive) && !fileActive.startsWith('memory/') && !fileActive.startsWith('memories/') && (
                              <button
                                onClick={() => { setTplDropdown(false); if (aiGenOpen) { setAiGenOpen(false); } else { openAiGen(); } }}
                                className={`text-[10px] px-2 py-1 rounded-lg border font-bold transition-colors flex items-center gap-1 ${
                                  aiGenOpen
                                    ? 'border-violet-500/50 bg-violet-500/10 text-violet-600 dark:text-violet-400'
                                    : 'border-violet-400/40 text-violet-600 dark:text-violet-400 hover:bg-violet-500/5'
                                }`}
                              >
                                <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
                                {a.aiGenerate || 'AI Write'}
                              </button>
                            )}
                            {/* Template insert dropdown */}
                            {fileActive && fileTemplates.filter(t => t.targetFile === fileActive).length > 0 && (
                              <div className="relative">
                                <button onClick={() => setTplDropdown(!tplDropdown)}
                                  className="text-[10px] px-2 py-1 rounded-lg border border-primary/30 text-primary hover:bg-primary/5 font-bold transition-colors flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[12px]">auto_fix_high</span>
                                  {a.insertTemplate}
                                </button>
                                {tplDropdown && (
                                  <div className="absolute end-0 top-full mt-1 z-30 theme-panel sci-card rounded-xl shadow-xl p-1 min-w-[200px]">
                                    {fileTemplates.filter(t => t.targetFile === fileActive).map((tpl: WorkspaceTemplate) => {
                                      const resolved = templateSystem.resolveI18n(tpl, language);
                                      return (
                                        <button key={tpl.id} onClick={() => {
                                          setFileDrafts(prev => ({ ...prev, [fileActive!]: resolved.content }));
                                          setTplDropdown(false);
                                        }}
                                          className="w-full text-start px-3 py-2 rounded-lg text-[10px] hover:bg-primary/5 transition-colors flex items-center gap-2">
                                          <span className="material-symbols-outlined text-[14px] text-primary">{tpl.icon}</span>
                                          <div className="min-w-0">
                                            <p className="font-bold text-slate-700 dark:text-white/70">{resolved.name}</p>
                                            <p className="text-[11px] text-slate-400 dark:text-white/35 truncate">{resolved.desc}</p>
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                            <button onClick={() => { if (fileActive) setFileDrafts(prev => ({ ...prev, [fileActive]: fileContents[fileActive] || '' })); }}
                              disabled={!fileActive || fileDrafts[fileActive] === fileContents[fileActive]}
                              className="text-[10px] px-2 py-1 rounded-lg theme-field theme-text-secondary disabled:opacity-30">{a.reset}</button>
                            <button onClick={saveFile} disabled={fileSaving || !fileActive || fileDrafts[fileActive] === fileContents[fileActive]}
                              className="text-[10px] px-3 py-1 rounded-lg bg-primary text-white font-bold disabled:opacity-30">{fileSaving ? a.saving : a.save}</button>
                          </div>
                        </div>
                        {/* AI Generate Panel */}
                        {aiGenOpen && fileActive && AI_GEN_FILES.includes(fileActive) && (
                          <div className="rounded-xl border border-violet-400/30 bg-violet-500/5 dark:bg-violet-500/[0.06] p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
                                {a.aiGenerateTitle || 'AI Write File Content'}
                              </span>
                              <button onClick={() => { setAiGenOpen(false); setAiGenStream(''); setAiGenResult(null); }}
                                className="text-[10px] text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/60 transition-colors">
                                <span className="material-symbols-outlined text-[14px]">close</span>
                              </button>
                            </div>
                            {/* Template picker */}
                            {aiGenTemplates.length > 0 && (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500 dark:text-white/40 shrink-0">
                                  {a.aiGenTemplate || 'Template'}
                                </span>
                                <CustomSelect
                                  value={aiGenSelectedTplId}
                                  onChange={handleAiGenSelectTemplate}
                                  disabled={aiGenRunning}
                                  placeholder={a.aiGenNoTemplate || '— Generic prompt —'}
                                  className="w-full h-7 px-2 bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-md text-[10px] text-slate-600 dark:text-white/60"
                                  options={[
                                    { value: '', label: a.aiGenNoTemplate || '— Generic prompt —' },
                                    ...aiGenTemplates.map(tpl => ({
                                      value: tpl.id,
                                      label: tpl.metadata?.scope === 'multi-agent'
                                        ? `[${a.aiGenScopeMulti || '多'}] ${tpl.metadata?.name || tpl.id}`
                                        : tpl.metadata?.name || tpl.id,
                                    })),
                                  ]}
                                />
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400 dark:text-white/30 uppercase tracking-wider">
                                {a.aiGenPromptLabel || 'Prompt'}
                              </span>
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
                                aiGenSelectedTplId
                                  ? 'bg-violet-500/10 text-violet-500 dark:text-violet-400'
                                  : 'bg-slate-200 dark:bg-white/10 text-slate-400 dark:text-white/30'
                              }`}>
                                {aiGenSelectedTplId
                                  ? (aiGenTemplates.find(t => t.id === aiGenSelectedTplId)?.metadata?.name ?? aiGenSelectedTplId)
                                  : (a.aiGenPromptSourceDefault || 'Generic')}
                              </span>
                            </div>
                            <textarea
                              value={aiGenPrompt}
                              onChange={e => setAiGenPrompt(e.target.value)}
                              rows={5}
                              disabled={aiGenRunning}
                              className="w-full px-2.5 py-2 rounded-lg bg-white dark:bg-white/[0.03] border border-violet-400/20 text-[11px] font-mono text-slate-700 dark:text-white/70 resize-none focus:outline-none focus:ring-1 focus:ring-violet-500/30 disabled:opacity-60"
                            />
                            <div className="flex items-center gap-2">
                              {!aiGenRunning ? (
                                <button onClick={handleAiGenRun} disabled={!aiGenPrompt.trim()}
                                  className="text-[10px] px-3 py-1.5 rounded-lg bg-violet-600 text-white font-bold hover:bg-violet-700 disabled:opacity-40 transition-colors flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[12px]">play_arrow</span>
                                  {a.aiGenStart || 'Generate'}
                                </button>
                              ) : (
                                <button onClick={handleAiGenStop}
                                  className="text-[10px] px-3 py-1.5 rounded-lg bg-red-500 text-white font-bold hover:bg-red-600 transition-colors flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[12px]">stop</span>
                                  {a.aiGenStop || 'Stop'}
                                </button>
                              )}
                              {aiGenResult && !aiGenRunning && (
                                <button onClick={handleAiGenApply}
                                  className="text-[10px] px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[12px]">check</span>
                                  {a.aiGenApply || 'Apply to File'}
                                </button>
                              )}
                              {aiGenRunning && (
                                <span className="text-[10px] text-violet-500 dark:text-violet-400 animate-pulse">{a.aiGenRunning || 'Generating…'}</span>
                              )}
                            </div>
                            {aiGenStream && (
                              <pre className="w-full max-h-48 overflow-y-auto p-2.5 rounded-lg bg-white dark:bg-black/20 border border-violet-400/20 text-[10px] font-mono text-slate-700 dark:text-white/60 whitespace-pre-wrap break-words neon-scrollbar">
                                {aiGenStream}
                              </pre>
                            )}
                          </div>
                        )}
                        {/* File path hint */}
                        {filesList?.workspace && fileActive && !fileActive.startsWith('memory/') && !fileActive.startsWith('memories/') && (
                          <div className="flex items-center gap-1.5 px-1 -mt-0.5">
                            <span className="material-symbols-outlined text-[11px] text-slate-400 dark:text-white/25">folder_open</span>
                            <span className="text-[9px] font-mono text-slate-400 dark:text-white/25 truncate select-all" title={filesList.workspace + '/' + fileActive}>
                              {filesList.workspace}/{fileActive}
                            </span>
                          </div>
                        )}
                        <textarea
                          value={fileDrafts[fileActive] ?? fileContents[fileActive] ?? ''}
                          onChange={e => setFileDrafts(prev => ({ ...prev, [fileActive!]: e.target.value }))}
                          className="w-full h-80 p-3 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] text-[11px] font-mono text-slate-700 dark:text-white/70 resize-none focus:outline-none focus:ring-1 focus:ring-primary/30"
                          spellCheck={false}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tools Panel */}
              {panel === 'tools' && (() => {
                const toolsets: Array<{ id: string; label: string; description: string; icon: string; tools: string[]; defaultOn: boolean; enabled: boolean }> = toolsCatalog?.toolsets || [];

                const loadCatalog = () => {
                  setToolsCatalogLoading(true);
                  gwApi.toolsCatalog({ agentId: selected.id }).then((r: any) => {
                    setToolsCatalog(r);
                  }).catch(() => {}).finally(() => setToolsCatalogLoading(false));
                };

                const toggleToolset = async (tsId: string, currentEnabled: boolean) => {
                  setToolSaving(true);
                  try {
                    await gwApi.toolsToggle({ agentId: selected.id, toolsetId: tsId, enabled: !currentEnabled });
                    // Reload catalog to reflect updated state
                    const fresh = await gwApi.toolsCatalog({ agentId: selected.id });
                    setToolsCatalog(fresh);
                    toast('success', !currentEnabled ? (a.toolEnabled || 'Enabled') : (a.toolDisabled || 'Disabled'));
                  } catch (err: any) {
                    toast('error', err?.message || a.toolSaveFailed || 'Failed to save');
                  }
                  setToolSaving(false);
                };

                const q = toolSearch.toLowerCase();
                const filtered = toolsets.filter(ts => {
                  if (!q) return true;
                  return ts.id.toLowerCase().includes(q) || ts.label.toLowerCase().includes(q) || ts.description.toLowerCase().includes(q) || ts.tools.some(t => t.toLowerCase().includes(q));
                });

                const enabledCount = toolsets.filter(ts => ts.enabled).length;

                return (
                  <div className="space-y-3">
                    {/* Header stats */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-primary/70">build</span>
                        <span className="text-[13px] font-bold text-slate-700 dark:text-white/80">{a.toolAccess || 'Toolsets'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-white/50 font-bold">
                          {toolsets.length} {a.toolTotal || 'toolsets'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold">
                          {enabledCount} {a.toolEnabled || 'enabled'}
                        </span>
                      </div>
                      <button onClick={loadCatalog} disabled={toolsCatalogLoading} className="ms-auto p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors disabled:opacity-40">
                        <span className={`material-symbols-outlined text-[14px] text-slate-500 dark:text-white/40 ${toolsCatalogLoading ? 'animate-spin' : ''}`}>
                          {toolsCatalogLoading ? 'progress_activity' : 'refresh'}
                        </span>
                      </button>
                    </div>

                    {/* Search */}
                    <div className="relative max-w-xs">
                      <span className="material-symbols-outlined text-[14px] text-slate-400 dark:text-white/30 absolute start-2.5 top-1/2 -translate-y-1/2">search</span>
                      <input type="text" value={toolSearch} onChange={e => setToolSearch(e.target.value)}
                        placeholder={a.toolSearchPlaceholder || 'Search toolsets...'}
                        className="w-full h-8 ps-8 pe-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] text-[11px] text-slate-700 dark:text-white/80 placeholder:text-slate-400 dark:placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-primary/40" />
                    </div>

                    <p className="text-[9px] text-slate-400 dark:text-white/25 px-1">
                      {a.toolsetHint || 'Toggle toolsets to enable/disable them across all platforms. Changes are saved to config.yaml immediately.'}
                    </p>

                    {/* Toolset cards */}
                    {toolsCatalogLoading && toolsets.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <span className="material-symbols-outlined text-[28px] text-primary/60 animate-spin">progress_activity</span>
                        <p className="text-[11px] text-slate-400 dark:text-white/40">{a.loading || 'Loading...'}</p>
                      </div>
                    ) : filtered.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-2">
                        <span className="material-symbols-outlined text-[24px] text-slate-300 dark:text-white/20">search_off</span>
                        <p className="text-[11px] text-slate-400 dark:text-white/35">{a.toolNoResults || 'No toolsets match your search'}</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {filtered.map(ts => (
                          <div key={ts.id}
                            className={`rounded-xl border p-3.5 transition-all ${
                              ts.enabled
                                ? 'bg-emerald-500/[0.04] border-emerald-500/25 hover:border-emerald-500/50'
                                : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200/60 dark:border-white/[0.06] hover:border-primary/30'
                            }`}>
                            <div className="flex items-start gap-2.5 mb-2">
                              <span className={`material-symbols-outlined text-[20px] shrink-0 mt-0.5 ${ts.enabled ? 'text-emerald-500' : 'text-slate-400 dark:text-white/25'}`}>
                                {ts.icon}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-bold text-slate-700 dark:text-white/80 truncate">{ts.label}</p>
                                <p className="text-[10px] text-slate-500 dark:text-white/40 leading-relaxed mt-0.5">{ts.description}</p>
                              </div>
                              {/* Toggle switch */}
                              <button
                                onClick={() => toggleToolset(ts.id, ts.enabled)}
                                disabled={toolSaving}
                                className={`relative w-9 h-5 rounded-full transition-colors shrink-0 mt-0.5 ${
                                  ts.enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-white/15'
                                } ${toolSaving ? 'opacity-50' : 'cursor-pointer'}`}>
                                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${
                                  ts.enabled ? 'start-[18px]' : 'start-0.5'
                                }`} />
                              </button>
                            </div>
                            {/* Tool list */}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {ts.tools.map(t => (
                                <code key={t} className="text-[8px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-white/35 font-mono">{t}</code>
                              ))}
                            </div>
                            {/* Default badge */}
                            {!ts.defaultOn && (
                              <span className="inline-block mt-2 text-[8px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
                                {a.toolOptional || 'Optional'}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Skills Panel */}
              {panel === 'skills' && (() => {
                const allSkills: any[] = skillsReport?.skills || [];
                // Filter skills based on selected filter
                const skills = allSkills.filter((sk: any) => {
                  if (skillsFilter === 'ready') return sk.eligible && !sk.disabled;
                  if (skillsFilter === 'notReady') return !sk.eligible && !sk.disabled;
                  if (skillsFilter === 'disabled') return sk.disabled;
                  return true; // 'all'
                });
                const groups: Record<string, any[]> = {};
                skills.forEach((sk: any) => {
                  const cat = sk.category || (sk.bundled ? a.sourceBuiltIn : (sk.source || a.sourceOther));
                  if (!groups[cat]) groups[cat] = [];
                  groups[cat].push(sk);
                });
                const readyCount = allSkills.filter((sk: any) => sk.eligible && !sk.disabled).length;
                const notReadyCount = allSkills.filter((sk: any) => !sk.eligible && !sk.disabled).length;
                const disabledCnt = allSkills.filter((sk: any) => sk.disabled).length;
                return (
                  <div className="space-y-4 max-w-5xl">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[11px] font-bold theme-text-secondary uppercase">{a.skills}</h3>
                      <button onClick={() => {
                        if (!selectedId) return;
                        setSkillsLoaded(false);
                        gwApi.agentSkills(selectedId).then((r: any) => { setSkillsReport(r); setSkillsLoaded(true); }).catch((err: any) => { setSkillsLoaded(true); toast('error', err?.message || a.skillsFetchFailed); });
                      }}
                        className="text-[10px] text-primary hover:underline">{a.refresh}</button>
                    </div>
                    {/* Filter buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setSkillsFilter('ready')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                          skillsFilter === 'ready'
                            ? 'bg-mac-green/10 text-mac-green border border-mac-green/20'
                            : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/40 hover:bg-slate-200 dark:hover:bg-white/10'
                        }`}
                      >
                        {a.eligible || 'Ready'} ({readyCount})
                      </button>
                      <button
                        onClick={() => setSkillsFilter('notReady')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                          skillsFilter === 'notReady'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/40 hover:bg-slate-200 dark:hover:bg-white/10'
                        }`}
                      >
                        {a.notEligible || 'Not Ready'} ({notReadyCount})
                      </button>
                      {disabledCnt > 0 && (
                        <button
                          onClick={() => setSkillsFilter('disabled')}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                            skillsFilter === 'disabled'
                              ? 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white/70 border border-slate-300 dark:border-white/20'
                              : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/40 hover:bg-slate-200 dark:hover:bg-white/10'
                          }`}
                        >
                          {a.disabled || 'Disabled'} ({disabledCnt})
                        </button>
                      )}
                      <button
                        onClick={() => setSkillsFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                          skillsFilter === 'all'
                            ? 'bg-primary/10 text-primary border border-primary/20'
                            : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/40 hover:bg-slate-200 dark:hover:bg-white/10'
                        }`}
                      >
                        {a.all || 'All'} ({allSkills.length})
                      </button>
                    </div>
                    {skills.length === 0 ? (
                      <p className="text-[10px] text-slate-400 dark:text-white/20 py-8 text-center">{!skillsLoaded ? a.loading : a.noSkills}</p>
                    ) : Object.entries(groups).map(([group, items]) => (
                      <div key={group}>
                        <p className="text-[11px] font-bold text-slate-400 dark:text-white/35 uppercase mb-2">{group} ({items.length})</p>
                        <div className="space-y-1">
                          {items.map((sk: any) => (
                            <div key={sk.skillKey || sk.name} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] ${sk.disabled ? 'opacity-50' : ''}`}>
                              <div className={`w-2 h-2 rounded-full shrink-0 ${sk.disabled ? 'bg-slate-400 dark:bg-white/20' : sk.eligible ? 'bg-mac-green' : 'bg-amber-400'}`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-semibold text-slate-700 dark:text-white/60 truncate">{sk.name}</p>
                                {sk.description && <p className="text-[11px] text-slate-400 dark:text-white/35 truncate">{sk.description}</p>}
                                {/* Missing deps hint */}
                                {!sk.eligible && !sk.disabled && (sk.missing?.bins?.length > 0 || sk.missing?.env?.length > 0 || sk.missing?.os?.length > 0) && (
                                  <div className="flex flex-wrap gap-1.5 mt-1">
                                    {sk.missing.os?.length > 0 && <span className="text-[9px] text-red-500">{a.unsupportedOs || 'Unsupported OS'}</span>}
                                    {sk.missing.bins?.length > 0 && <span className="text-[9px] text-amber-500">{sk.missing.bins.join(', ')}</span>}
                                    {sk.missing.env?.length > 0 && <span className="text-[9px] text-amber-500">{sk.missing.env.join(', ')}</span>}
                                  </div>
                                )}
                              </div>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                                sk.disabled ? 'bg-slate-100 dark:bg-white/5 text-slate-400' :
                                sk.eligible ? 'bg-mac-green/10 text-mac-green' :
                                'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              }`}>
                                {sk.disabled ? (a.disabled || 'Disabled') : sk.eligible ? a.eligible : a.notEligible}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Channels Panel */}
              {panel === 'channels' && (() => {
                // Parse channel data from Hermes Agent Gateway channels.status response
                let channels: any[] = [];
                if (channelsSnap && typeof channelsSnap === 'object') {
                  const order = channelsSnap.channelOrder || [];
                  const channelData = channelsSnap.channels || {};
                  const accounts = channelsSnap.channelAccounts || {};
                  const labels = channelsSnap.channelLabels || {};
                  const meta = channelsSnap.channelMeta || [];
                  
                  // Build channel list from channelOrder
                  channels = order.map((id: string) => {
                    const data = channelData[id];
                    const accountList = accounts[id] || [];
                    const metaEntry = meta.find((m: any) => m.id === id);
                    const label = metaEntry?.label || labels[id] || id;
                    
                    // Determine connection status from accounts
                    let connected = false;
                    let running = false;
                    if (accountList.length > 0) {
                      connected = accountList.some((acc: any) => acc.connected);
                      running = accountList.some((acc: any) => acc.running);
                    } else if (data && typeof data === 'object') {
                      connected = (data as any).connected || false;
                      running = (data as any).running || false;
                    }
                    
                    return {
                      id,
                      label,
                      connected,
                      running,
                      accounts: accountList,
                      data
                    };
                  });
                }

                // Extract bindings + channel config from parsed config
                const parsed = config?.parsed || config?.config || config || {};
                const allBindings: any[] = Array.isArray(parsed.bindings) ? parsed.bindings : [];
                const channelsCfg = parsed.channels || {};
                const agentOpts = agents.map((ag: any) => ag.id);

                const getChannelBindings = (chId: string) =>
                  allBindings.filter((b: any) => b.match?.channel?.toLowerCase() === chId.toLowerCase());

                const getChannelPeerBindings = (chId: string) =>
                  allBindings.filter((b: any) =>
                    b.match?.channel?.toLowerCase() === chId.toLowerCase() &&
                    b.match?.peer?.id &&
                    ['group', 'channel', 'direct'].includes(b.match?.peer?.kind?.toLowerCase() || '')
                  );

                const removePeerBinding = (chId: string, peerKind: string, peerId: string) => {
                  const updated = allBindings.filter((b: any) => !(
                    b.match?.channel?.toLowerCase() === chId.toLowerCase() &&
                    b.match?.peer?.id?.toLowerCase() === peerId.toLowerCase() &&
                    b.match?.peer?.kind?.toLowerCase() === peerKind.toLowerCase()
                  ));
                  saveBindings(updated);
                };

                const getChannelAccountIds = (chId: string, ch: any): string[] => {
                  const cfg = channelsCfg[chId];
                  if (cfg?.accounts && typeof cfg.accounts === 'object') return Object.keys(cfg.accounts);
                  if (ch.accounts?.length > 0) return ch.accounts.map((acc: any) => acc.id || acc.accountId || 'default').filter(Boolean);
                  return cfg?.enabled !== undefined ? ['default'] : [];
                };

                const getBoundAgent = (chId: string, accountId: string): string | null => {
                  const bindings = getChannelBindings(chId);
                  const exact = bindings.find((b: any) => b.match?.accountId?.toLowerCase() === accountId.toLowerCase());
                  if (exact) return exact.agentId || null;
                  const wild = bindings.find((b: any) => b.match?.accountId === '*');
                  if (wild) return wild.agentId || null;
                  return null;
                };

                const hasWildcardBinding = (chId: string): string | null => {
                  const wild = getChannelBindings(chId).find((b: any) => b.match?.accountId === '*');
                  return wild ? (wild.agentId || null) : null;
                };

                const saveBindings = async (newBindings: any[]) => {
                  setBindingSaving(true);
                  try {
                    const fresh = await gwApi.configSafePatch({ bindings: newBindings });
                    setConfig(fresh);
                    toast('success', a.bindingSaved || 'Binding saved');
                  } catch (err: any) {
                    toast('error', err?.message || a.bindingSaveFailed || 'Failed to save binding');
                  }
                  setBindingSaving(false);
                };

                const setBinding = (chId: string, accountId: string, agentId: string | null) => {
                  let updated = allBindings.filter((b: any) =>
                    !(b.match?.channel?.toLowerCase() === chId.toLowerCase() && b.match?.accountId?.toLowerCase() === accountId.toLowerCase())
                  );
                  if (agentId) {
                    updated.push({ agentId, match: { channel: chId, accountId } });
                  }
                  saveBindings(updated);
                };

                const refreshChannels = () => {
                  setChannelsLoading(true);
                  setExpandedChannel(null);
                  Promise.all([
                    gwApi.channels().then(setChannelsSnap),
                    gwApi.configGet().then(setConfig),
                  ]).catch((err: any) => { toast('error', err?.message || a.channelsFetchFailed); }).finally(() => setChannelsLoading(false));
                };

                return (
                  <div className="space-y-4 max-w-5xl">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[11px] font-bold text-slate-600 dark:text-white/60 uppercase">{a.channels} &amp; {a.bindings || 'Bindings'}</h3>
                      <button onClick={refreshChannels}
                        className="text-[10px] text-primary hover:underline">{a.refresh}</button>
                    </div>
                    {channelsLoading ? (
                      <p className="text-[10px] text-slate-400 dark:text-white/20 py-8 text-center">{a.loading}</p>
                    ) : channels.length === 0 ? (
                      <p className="text-[10px] text-slate-400 dark:text-white/20 py-8 text-center">{a.noChannels}</p>
                    ) : (
                      <div className="space-y-2">
                        {channels.map((ch: any, i: number) => {
                          const id = ch.id || ch.name || `ch-${i}`;
                          const label = ch.label || ch.name || id;
                          const isConn = ch.connected || ch.running || ch.status === 'connected';
                          const isExpanded = expandedChannel === id;
                          const accountIds = getChannelAccountIds(id, ch);
                          const chBindings = getChannelBindings(id);
                          const wildcardAgent = hasWildcardBinding(id);
                          // Current agent's binding for this channel (C view highlight)
                          const currentAgentBound = selectedId ? chBindings.some((b: any) =>
                            b.agentId === selectedId && (b.match?.accountId === '*' || accountIds.some(aid => b.match?.accountId?.toLowerCase() === aid.toLowerCase()))
                          ) : false;

                          return (
                            <div key={id} className={`rounded-xl border transition-all ${isExpanded
                              ? 'border-primary/30 dark:border-primary/20 bg-white dark:bg-white/[0.03] shadow-sm'
                              : currentAgentBound
                                ? 'border-primary/20 dark:border-primary/10 bg-primary/[0.02] dark:bg-primary/[0.02]'
                                : 'border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.03]'
                            }`}>
                              {/* Collapsed header — always visible */}
                              <div
                                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer select-none hover:bg-slate-50/50 dark:hover:bg-white/[0.02] rounded-xl transition-colors"
                                onClick={() => setExpandedChannel(isExpanded ? null : id)}
                              >
                                <span className={`material-symbols-outlined text-[14px] text-slate-400 dark:text-white/30 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                  chevron_right
                                </span>
                                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isConn ? 'bg-mac-green animate-pulse' : 'bg-slate-300 dark:bg-white/10'}`} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-[11px] font-semibold text-slate-700 dark:text-white/60">{label}</p>
                                    {currentAgentBound && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">{a.bindingThisAgent || 'This agent'}</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                    <span className="text-[10px] text-slate-400 dark:text-white/30 font-mono">{id}</span>
                                    {accountIds.length > 1 && <span className="text-[10px] text-slate-400/60 font-mono">· {(a.multiAccount || '{count} accounts').replace('{count}', String(accountIds.length))}</span>}
                                    {accountIds.length === 1 && <span className="text-[10px] text-slate-400/60 font-mono">· {a.singleAccount || 'Single account'}</span>}
                                    {(() => {
                                      const chCfg = channelsCfg[id] || {};
                                      const dmP = chCfg.dmPolicy || chCfg.dm_policy;
                                      const grpP = chCfg.groupPolicy || chCfg.group_policy;
                                      const af = chCfg.allowFrom || chCfg.allow_from;
                                      const policyColor = (p: string) => p === 'open' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : p === 'allowlist' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : p === 'pairing' ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/40';
                                      const policyLabel = (p: string) => p === 'open' ? (a.chPolicyOpen || 'Open') : p === 'allowlist' ? (a.chPolicyAllowlist || 'Allowlist') : p === 'pairing' ? (a.chPolicyPairing || 'Pairing') : p === 'disabled' ? (a.chPolicyDisabled || 'Disabled') : p;
                                      return (
                                        <>
                                          {dmP && <span className={`text-[8px] px-1 py-0.5 rounded font-bold ${policyColor(dmP)}`}>{a.chDmPolicy || 'DM'}: {policyLabel(dmP)}</span>}
                                          {grpP && <span className={`text-[8px] px-1 py-0.5 rounded font-bold ${policyColor(grpP)}`}>{a.chGroupPolicy || 'Group'}: {policyLabel(grpP)}</span>}
                                          {af && <span className="text-[8px] px-1 py-0.5 rounded font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">{a.chAllowFrom || 'Allow From'}: {Array.isArray(af) ? af.length : '✓'}</span>}
                                        </>
                                      );
                                    })()}
                                  </div>
                                </div>
                                <span className={`text-[10px] font-bold shrink-0 ${isConn ? 'text-mac-green' : 'text-slate-400'}`}>{isConn ? a.connected : a.disabled}</span>
                              </div>

                              {/* Expanded: account-level binding management */}
                              {isExpanded && (
                                <div className="px-3 pb-3 pt-1 border-t border-slate-200/40 dark:border-white/[0.04] space-y-1.5">
                                  {/* Wildcard binding row */}
                                  <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-slate-50/50 dark:bg-white/[0.02]">
                                    <span className="material-symbols-outlined text-[13px] text-amber-500">asterisk</span>
                                    <span className="text-[10px] font-bold text-slate-600 dark:text-white/50 flex-1">{a.bindingWildcard || 'All (*)'}</span>
                                    <CustomSelect
                                      value={wildcardAgent || ''}
                                      disabled={bindingSaving}
                                      onChange={v => setBinding(id, '*', v || null)}
                                      placeholder={a.bindingNone || 'Unbound'}
                                      options={[
                                        { value: '', label: a.bindingNone || 'Unbound' },
                                        ...agentOpts.map(aid => ({ value: aid, label: aid === selectedId ? `${aid} ◀` : aid }))
                                      ]}
                                      className="text-[10px] border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-slate-600 dark:text-white/60 min-w-[120px] h-7"
                                    />
                                  </div>

                                  {/* Per-account binding rows */}
                                  {accountIds.length > 0 && accountIds.map(accountId => {
                                    const boundAgent = getBoundAgent(id, accountId);
                                    // Find exact binding (not wildcard)
                                    const exactBinding = chBindings.find((b: any) => b.match?.accountId?.toLowerCase() === accountId.toLowerCase());
                                    const exactAgent = exactBinding?.agentId || '';
                                    const isCurrentAgent = exactAgent === selectedId || (!exactAgent && wildcardAgent === selectedId);
                                    return (
                                      <div key={accountId} className={`flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors ${
                                        isCurrentAgent ? 'bg-primary/[0.04] dark:bg-primary/[0.04]' : 'hover:bg-slate-50/50 dark:hover:bg-white/[0.02]'
                                      }`}>
                                        <span className="material-symbols-outlined text-[13px] text-slate-400 dark:text-white/25">person</span>
                                        <span className={`text-[10px] font-mono flex-1 truncate ${
                                          isCurrentAgent ? 'font-bold text-primary' : 'text-slate-600 dark:text-white/50'
                                        }`}>{accountId}</span>
                                        <CustomSelect
                                          value={exactAgent}
                                          disabled={bindingSaving}
                                          onChange={v => setBinding(id, accountId, v || null)}
                                          placeholder={wildcardAgent ? `← ${wildcardAgent} (*)` : (a.bindingNone || 'Unbound')}
                                          options={[
                                            { value: '', label: wildcardAgent ? `← ${wildcardAgent} (*)` : (a.bindingNone || 'Unbound') },
                                            ...agentOpts.map(aid => ({ value: aid, label: aid === selectedId ? `${aid} ◀` : aid }))
                                          ]}
                                          className="text-[10px] border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-slate-600 dark:text-white/60 min-w-[120px] h-7"
                                        />
                                        {boundAgent && (
                                          <span className={`text-[9px] px-1 py-0.5 rounded ${
                                            boundAgent === selectedId ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-white/[0.05] text-slate-500 dark:text-white/40'
                                          } font-bold`}>
                                            → {boundAgent}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}

                                  {accountIds.length === 0 && (
                                    <p className="text-[10px] text-slate-400 dark:text-white/20 py-2 text-center italic">{a.noAccounts || 'No accounts'}</p>
                                  )}

                                  {/* Peer-level bindings (read-only + delete) */}
                                  {(() => {
                                    const peerBindings = getChannelPeerBindings(id);
                                    if (peerBindings.length === 0) return null;
                                    return (
                                      <>
                                        <div className="border-t border-dashed border-slate-200/40 dark:border-white/[0.06] mt-2 pt-2">
                                          <p className="text-[9px] font-bold text-slate-400 dark:text-white/25 uppercase tracking-wider mb-1.5 px-1">
                                            {a.bindingPeerRules || 'Peer Rules'}
                                          </p>
                                          {peerBindings.map((b: any, bi: number) => {
                                            const pk = b.match?.peer?.kind || 'group';
                                            const pid = b.match?.peer?.id || '';
                                            const agent = b.agentId || '';
                                            const isThisAgent = agent === selectedId;
                                            return (
                                              <div key={`peer-${bi}`} className={`flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors ${
                                                isThisAgent ? 'bg-primary/[0.04]' : 'hover:bg-slate-50/50 dark:hover:bg-white/[0.02]'
                                              }`}>
                                                <span className="material-symbols-outlined text-[13px] text-violet-400 dark:text-violet-400/70">
                                                  {pk === 'group' ? 'group' : pk === 'direct' ? 'person' : 'tag'}
                                                </span>
                                                <span className="text-[10px] font-mono text-slate-500 dark:text-white/40 truncate flex-1" title={pid}>{pid}</span>
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                  isThisAgent ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-white/[0.05] text-slate-500 dark:text-white/40'
                                                }`}>{agent}</span>
                                                <button
                                                  onClick={() => removePeerBinding(id, pk, pid)}
                                                  disabled={bindingSaving}
                                                  className="p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-300 hover:text-red-500 dark:text-white/15 dark:hover:text-red-400 transition-colors"
                                                  title={a.bindingRemove || 'Remove'}
                                                >
                                                  <span className="material-symbols-outlined text-[12px]">close</span>
                                                </button>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </>
                                    );
                                  })()}

                                  {/* Channel Policy Config (P3b) */}
                                  {(() => {
                                    const chCfg = channelsCfg[id] || {};
                                    const dmP = chCfg.dmPolicy || chCfg.dm_policy || '';
                                    const grpP = chCfg.groupPolicy || chCfg.group_policy || '';
                                    const af: string[] = Array.isArray(chCfg.allowFrom || chCfg.allow_from) ? (chCfg.allowFrom || chCfg.allow_from) : [];
                                    const POLICY_OPTS = [
                                      { value: '', label: '—' },
                                      { value: 'open', label: a.chPolicyOpen || 'Open' },
                                      { value: 'allowlist', label: a.chPolicyAllowlist || 'Allowlist' },
                                      { value: 'pairing', label: a.chPolicyPairing || 'Pairing' },
                                      { value: 'disabled', label: a.chPolicyDisabled || 'Disabled' },
                                    ];
                                    const saveChPolicy = async (patch: Record<string, any>) => {
                                      setBindingSaving(true);
                                      try {
                                        const parsed = config?.parsed || config?.config || config || {};
                                        const chAll = { ...(parsed?.channels || {}) };
                                        chAll[id] = { ...(chAll[id] || {}), ...patch };
                                        const fresh = await gwApi.configSafePatch({ channels: chAll });
                                        setConfig(fresh);
                                        toast('success', a.bindingSaved || 'Saved');
                                      } catch (err: any) { toast('error', err?.message || a.bindingSaveFailed || 'Failed'); }
                                      setBindingSaving(false);
                                    };
                                    return (
                                      <div className="border-t border-dashed border-slate-200/40 dark:border-white/[0.06] mt-2 pt-2">
                                        <p className="text-[9px] font-bold text-slate-400 dark:text-white/25 uppercase tracking-wider mb-1.5 px-1">{a.chPolicyTitle || 'Channel Policies'}</p>
                                        <div className="grid grid-cols-3 gap-2">
                                          <div>
                                            <label className="text-[9px] font-bold text-slate-400 dark:text-white/20 uppercase block mb-0.5">{a.chDmPolicy || 'DM Policy'}</label>
                                            <CustomSelect value={dmP} disabled={bindingSaving} onChange={v => saveChPolicy({ dmPolicy: v || undefined })} options={POLICY_OPTS}
                                              className="text-[10px] border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-slate-600 dark:text-white/60 w-full h-7" />
                                          </div>
                                          <div>
                                            <label className="text-[9px] font-bold text-slate-400 dark:text-white/20 uppercase block mb-0.5">{a.chGroupPolicy || 'Group Policy'}</label>
                                            <CustomSelect value={grpP} disabled={bindingSaving} onChange={v => saveChPolicy({ groupPolicy: v || undefined })} options={POLICY_OPTS}
                                              className="text-[10px] border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-slate-600 dark:text-white/60 w-full h-7" />
                                          </div>
                                          <div>
                                            <label className="text-[9px] font-bold text-slate-400 dark:text-white/20 uppercase block mb-0.5">{a.chAllowFrom || 'Allow From'} {af.length > 0 && <span className="text-[8px] text-amber-500">({af.length})</span>}</label>
                                            <div className="flex gap-1">
                                              <input id={`af-input-${id}`} placeholder={a.chAfPlaceholder || 'Group/User ID…'} disabled={bindingSaving}
                                                className="flex-1 h-7 px-2 bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-lg text-[9px] font-mono text-slate-500 dark:text-white/40 outline-none focus:border-primary/30 min-w-0"
                                                onKeyDown={e => { if (e.key === 'Enter') { const v = (e.target as HTMLInputElement).value.trim(); if (v && !af.includes(v)) { saveChPolicy({ allowFrom: [...af, v] }); (e.target as HTMLInputElement).value = ''; } } }} />
                                              <button disabled={bindingSaving} onClick={() => { const el = document.getElementById(`af-input-${id}`) as HTMLInputElement; const v = el?.value?.trim(); if (v && !af.includes(v)) { saveChPolicy({ allowFrom: [...af, v] }); el.value = ''; } }}
                                                className="h-7 px-1.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-lg text-[9px] text-slate-400 dark:text-white/20 hover:text-primary transition-colors shrink-0">
                                                <span className="material-symbols-outlined text-[10px]">add</span>
                                              </button>
                                            </div>
                                            {af.length > 0 && (
                                              <div className="flex flex-wrap gap-1 mt-1">
                                                {af.map((item, idx) => (
                                                  <span key={idx} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[8px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                                    {item}
                                                    <button disabled={bindingSaving} onClick={() => saveChPolicy({ allowFrom: af.filter((_, i) => i !== idx) })} className="p-0 opacity-40 hover:opacity-100"><span className="material-symbols-outlined text-[8px]">close</span></button>
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  {bindingSaving && (
                                    <div className="flex items-center justify-center gap-1.5 py-1">
                                      <span className="material-symbols-outlined text-[12px] text-primary animate-spin">progress_activity</span>
                                      <span className="text-[10px] text-slate-400">{a.saving}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Run Panel */}
              {panel === 'run' && (
                <div className="flex flex-col max-w-5xl h-full">
                  {!gwReady ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/20">
                      <span className="material-symbols-outlined text-3xl mb-2">{wsConnecting ? 'progress_activity' : 'cloud_off'}</span>
                      <p className="text-[11px]">{wsConnecting ? a.wsConnecting : a.wsError}</p>
                      {!wsConnecting && <p className="text-[11px] mt-1">{a.configMissing}</p>}
                    </div>
                  ) : (
                    <>
                      {/* Header with clear button */}
                      {runMessages.length > 0 && (
                        <div className="flex justify-end mb-2 shrink-0">
                          <button onClick={async () => {
                            const ok = await confirm({ title: a.clearChat, message: a.clearChatConfirm, confirmText: a.delete, cancelText: a.cancel });
                            if (ok) { setRunMessages([]); setRunStream(null); setRunError(null); }
                          }} className="text-[10px] px-2 py-1 rounded-lg text-slate-400 hover:text-mac-red hover:bg-mac-red/5 transition-all flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">delete_sweep</span>
                            {a.clearChat}
                          </button>
                        </div>
                      )}
                      {/* Messages */}
                      <div className="flex-1 overflow-y-auto custom-scrollbar neon-scrollbar space-y-3 mb-4">
                        {runMessages.length === 0 && !runStream && (
                          <div className="flex flex-col items-center py-12 text-slate-400 dark:text-white/20">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                              <span className="material-symbols-outlined text-[24px] text-primary">play_arrow</span>
                            </div>
                            <p className="text-[11px] font-medium text-slate-500 dark:text-white/40">{a.runAgent}</p>
                            <p className="text-[11px] mt-1">{a.runPrompt}</p>
                          </div>
                        )}

                        {runMessages.map((msg, idx) => {
                          const isUser = msg.role === 'user';
                          return (
                            <div key={idx} className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
                              <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center border mt-0.5 ${isUser
                                ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-black border-slate-700 dark:border-slate-300'
                                : 'bg-primary/10 border-primary/20 text-primary'
                                }`}>
                                <span className="material-symbols-outlined text-[14px]">
                                  {isUser ? 'person' : 'smart_toy'}
                                </span>
                              </div>
                              <div className={`max-w-[80%] ${isUser ? 'text-end' : ''}`}>
                                <div className={`p-3.5 rounded-2xl shadow-sm border ${isUser
                                  ? 'bg-primary text-white border-primary/30 rounded-se-sm'
                                  : 'bg-white dark:bg-white/[0.03] text-slate-800 dark:text-slate-200 border-slate-200 dark:border-white/[0.06] rounded-ss-sm'
                                  }`}>
                                  <div className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">{msg.text}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Streaming */}
                        {runStream !== null && (
                          <div className="flex items-start gap-2.5">
                            <div className="w-7 h-7 shrink-0 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mt-0.5">
                              <span className="material-symbols-outlined text-[14px]">smart_toy</span>
                            </div>
                            <div className="max-w-[80%]">
                              <div className="p-3.5 rounded-2xl rounded-ss-sm shadow-sm border bg-white dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.06]">
                                {runStream ? (
                                  <div className="text-[13px] leading-relaxed whitespace-pre-wrap break-words text-slate-800 dark:text-slate-200">
                                    {runStream}
                                    <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ms-0.5 align-text-bottom" />
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-slate-400">
                                    <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                                    <span className="text-[11px]">{a.running}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {runError && (
                          <div className="flex justify-center">
                            <div className="px-3 py-2 rounded-xl bg-mac-red/10 border border-mac-red/20 text-[10px] text-mac-red font-medium flex items-center gap-2">
                              <span className="material-symbols-outlined text-[14px]">error</span>
                              {runError}
                            </div>
                          </div>
                        )}

                        <div ref={runEndRef} />
                      </div>

                      {/* Input */}
                      <div className="shrink-0 mt-auto">
                        <div className="relative flex items-end gap-1.5 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl p-1.5 shadow-lg shadow-black/5 dark:shadow-black/20 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                          <textarea
                            ref={runTextareaRef}
                            rows={1}
                            className="flex-1 bg-transparent border-none text-[12px] text-slate-800 dark:text-white py-2 px-2 focus:ring-0 outline-none resize-none max-h-28 placeholder:text-slate-400 dark:placeholder:text-white/25"
                            placeholder={a.runPrompt}
                            value={runInput}
                            onChange={handleRunInputChange}
                            onKeyDown={handleRunKeyDown}
                            disabled={!gwReady}
                          />
                          {isRunStreaming ? (
                            <button onClick={handleRunAbort}
                              className="w-8 h-8 rounded-full bg-mac-red text-white flex items-center justify-center shrink-0 shadow-lg transition-all hover:bg-red-600 active:scale-95">
                              <span className="material-symbols-outlined text-[16px]">stop</span>
                            </button>
                          ) : (
                            <button onClick={sendToAgent}
                              disabled={!runInput.trim() || runSending || !gwReady}
                              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95 ${runInput.trim() && !runSending && gwReady
                                ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                : 'bg-slate-100 dark:bg-white/5 text-slate-400'
                                }`}>
                              <span className="material-symbols-outlined text-[16px]">
                                {runSending ? 'progress_activity' : 'arrow_upward'}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Browser Request Panel */}
              {panel === 'tools' && (
                <div className="mt-6 max-w-5xl">
                  <div className="rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] p-4 space-y-3">
                    <h3 className="text-[11px] font-bold text-slate-600 dark:text-white/60 uppercase flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px] text-primary">language</span>
                      {a.browserReq}
                    </h3>
                    <div className="flex gap-2">
                      <CustomSelect value={browserMethod} onChange={v => setBrowserMethod(v)}
                        options={['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'].map(m => ({ value: m, label: m }))}
                        className="h-8 px-2 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-[10px] font-mono text-slate-700 dark:text-white/70" />
                      <input value={browserUrl} onChange={e => setBrowserUrl(e.target.value)}
                        placeholder={a.browserUrl || '/api/...'}
                        className="flex-1 h-8 px-3 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-[10px] font-mono text-slate-700 dark:text-white/70 outline-none" />
                      <button onClick={handleBrowserRequest} disabled={browserSending || !browserUrl.trim() || !gwReady}
                        className="h-8 px-3 bg-primary text-white text-[10px] font-bold rounded-lg disabled:opacity-40 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">{browserSending ? 'progress_activity' : 'send'}</span>
                        {browserSending ? a.browserSending : a.browserSend}
                      </button>
                    </div>
                    {['POST', 'PUT', 'PATCH'].includes(browserMethod) && (
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase block mb-1">{a.browserBody}</label>
                        <textarea value={browserBody} onChange={e => setBrowserBody(e.target.value)}
                          placeholder={a.browserBodyHint || '{"key": "value"}'}
                          rows={3}
                          className="w-full px-3 py-2 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-[10px] font-mono text-slate-700 dark:text-white/70 outline-none resize-none focus:ring-1 focus:ring-primary/30" />
                      </div>
                    )}
                    {browserResult && (
                      <div className={`px-2 py-1.5 rounded-lg text-[10px] ${browserResult.ok ? 'bg-mac-green/10 text-mac-green' : 'bg-red-50 dark:bg-red-500/5 text-red-500'}`}>
                        {browserResult.text}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Cron Panel */}
              {panel === 'cron' && (() => {
                const jobs = cronJobs.filter((j: any) => j.agentId === selected.id || !j.agentId);
                const totalJobs = typeof cronStatus?.jobs === 'number'
                  ? cronStatus.jobs
                  : jobs.length;
                const activeJobs = Number(
                  cronStatus?.activeJobs ?? jobs.filter((j: any) => j?.enabled !== false && j?.state !== 'paused' && j?.state !== 'completed').length,
                );
                return (
                  <div className="space-y-4 max-w-5xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-[11px] font-bold text-slate-600 dark:text-white/60 uppercase">{a.cron}</h3>
                        {cronStatus && (
                          <p className="text-[11px] text-slate-400 dark:text-white/35 mt-0.5">
                            {totalJobs > 0 ? (activeJobs > 0 ? a.enabled : (a.paused || 'Paused')) : (a.noJobs || 'No jobs')} · {totalJobs} jobs
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => dispatchOpenWindow({ id: 'scheduler' })} className="text-[10px] text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center gap-0.5">
                          {a.viewScheduler || 'View Scheduler'}<span className="material-symbols-outlined text-[12px]">chevron_right</span>
                        </button>
                        <button onClick={() => { gwApi.cronStatus().then(setCronStatus).catch((err: any) => { toast('error', err?.message || a.cronFetchFailed); }); gwApi.cron().then((d: any) => setCronJobs(Array.isArray(d) ? d : d?.jobs || [])).catch((err: any) => { toast('error', err?.message || a.cronFetchFailed); }); }}
                          className="text-[10px] text-primary hover:underline">{a.refresh}</button>
                      </div>
                    </div>
                    {jobs.length === 0 ? (
                      <p className="text-[10px] text-slate-400 dark:text-white/20 py-8 text-center">{a.noJobs}</p>
                    ) : (
                      <div className="space-y-2">
                        {jobs.map((job: any, i: number) => (
                          <div key={job.name || i} onClick={() => dispatchOpenWindow({ id: 'scheduler' })} className="px-3 py-2.5 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] cursor-pointer hover:border-amber-400/40 hover:ring-1 hover:ring-amber-400/20 transition-all">
                            <div className="flex items-center justify-between">
                              <p className="text-[11px] font-semibold text-slate-700 dark:text-white/60">{job.name}</p>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${job.enabled ? 'bg-mac-green/10 text-mac-green' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                                {job.enabled ? a.enabled : a.disabled}
                              </span>
                            </div>
                            {job.description && <p className="text-[11px] text-slate-400 dark:text-white/35 mt-0.5">{job.description}</p>}
                            <div className="flex gap-3 mt-1.5 text-[11px] text-slate-400 dark:text-white/35 font-mono">
                              {job.schedule && <span>{a.schedule}: {typeof job.schedule === 'string' ? job.schedule : job.schedule.kind === 'every' ? `${Math.round((job.schedule.everyMs || 0) / 60000)}m` : job.schedule.kind === 'at' ? (job.schedule.at ? new Date(job.schedule.at).toLocaleString() : '-') : job.schedule.expr || '-'}</span>}
                              {job.sessionTarget && <span>→ {job.sessionTarget}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Tasks Panel */}
              {panel === 'tasks' && (() => {
                const td = tasksData;
                const statusColors: Record<string, string> = {
                  queued: 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
                  running: 'bg-cyan-100 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
                  succeeded: 'bg-mac-green/10 text-mac-green',
                  failed: 'bg-red-100 dark:bg-red-500/10 text-red-500',
                  timed_out: 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
                  cancelled: 'bg-slate-100 dark:bg-white/5 text-slate-400',
                  lost: 'bg-red-100 dark:bg-red-500/10 text-red-400',
                };
                const statusIcons: Record<string, string> = {
                  queued: 'hourglass_empty',
                  running: 'play_circle',
                  succeeded: 'check_circle',
                  failed: 'error',
                  timed_out: 'timer_off',
                  cancelled: 'cancel',
                  lost: 'help_outline',
                };
                const runtimeIcons: Record<string, string> = {
                  subagent: 'smart_toy',
                  acp: 'hub',
                  cli: 'terminal',
                  cron: 'schedule',
                };
                const statusLabels: Record<string, string> = {
                  queued: a.taskStatusQueued || 'Queued',
                  running: a.taskStatusRunning || 'Running',
                  succeeded: a.taskStatusSucceeded || 'Succeeded',
                  failed: a.taskStatusFailed || 'Failed',
                  timed_out: a.taskStatusTimedOut || 'Timed Out',
                  cancelled: a.taskStatusCancelled || 'Cancelled',
                  lost: a.taskStatusLost || 'Lost',
                };
                const runtimeLabels: Record<string, string> = {
                  subagent: a.taskRuntimeSubagent || 'Subagent',
                  acp: a.taskRuntimeAcp || 'ACP',
                  cli: a.taskRuntimeCli || 'CLI',
                  cron: a.taskRuntimeCron || 'Cron',
                };
                return (
                  <div className="space-y-4 max-w-5xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-[11px] font-bold text-slate-600 dark:text-white/60 uppercase">{a.tasks || 'Tasks'}</h3>
                        {td && (
                          <p className="text-[11px] text-slate-400 dark:text-white/35 mt-0.5">
                            {td.total ?? 0} {a.tasksTotal || 'total'} · {td.active ?? 0} {a.tasksActive || 'active'} · {td.failures ?? 0} {a.tasksIssues || 'issues'}
                          </p>
                        )}
                      </div>
                      <button onClick={() => {
                        setTasksLoading(true);
                        gwApi.info().then((d: any) => { setTasksData(d?.tasks ?? null); setTaskAudit(d?.taskAudit ?? null); }).catch((err: any) => { toast('error', err?.message || a.tasksFetchFailed || 'Failed to fetch tasks'); }).finally(() => setTasksLoading(false));
                      }} className="text-[10px] text-primary hover:underline">{a.refresh}</button>
                    </div>

                    {tasksLoading && (
                      <p className="text-[10px] text-slate-400 dark:text-white/20 py-8 text-center">{a.loading}</p>
                    )}

                    {!tasksLoading && !td && (
                      <p className="text-[10px] text-slate-400 dark:text-white/20 py-8 text-center">{a.tasksNoData || 'No task data available'}</p>
                    )}

                    {!tasksLoading && td && (
                      <>
                        {/* Summary cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { label: a.tasksTotal || 'Total', value: td.total ?? 0, icon: 'task_alt', color: 'text-primary' },
                            { label: a.tasksActive || 'Active', value: td.active ?? 0, icon: 'play_circle', color: 'text-cyan-500' },
                            { label: a.tasksTerminal || 'Completed', value: td.terminal ?? 0, icon: 'check_circle', color: 'text-mac-green' },
                            { label: a.tasksIssues || 'Issues', value: td.failures ?? 0, icon: 'warning', color: td.failures > 0 ? 'text-red-500' : 'text-slate-400' },
                          ].map(card => (
                            <div key={card.label} className="px-3 py-2.5 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06]">
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className={`material-symbols-outlined text-[14px] ${card.color}`}>{card.icon}</span>
                                <span className="text-[10px] text-slate-400 dark:text-white/35 uppercase font-bold">{card.label}</span>
                              </div>
                              <p className="text-lg font-bold text-slate-700 dark:text-white/80">{card.value}</p>
                            </div>
                          ))}
                        </div>

                        {/* Status breakdown */}
                        {td.byStatus && (
                          <div className="px-3 py-3 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06]">
                            <h4 className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase mb-2">{a.tasksByStatus || 'By Status'}</h4>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(td.byStatus as Record<string, number>).map(([status, count]) => (
                                <div key={status} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold ${statusColors[status] || 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                                  <span className="material-symbols-outlined text-[12px]">{statusIcons[status] || 'radio_button_unchecked'}</span>
                                  {statusLabels[status] || status}: {count}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Runtime breakdown */}
                        {td.byRuntime && (
                          <div className="px-3 py-3 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06]">
                            <h4 className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase mb-2">{a.tasksByRuntime || 'By Runtime'}</h4>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(td.byRuntime as Record<string, number>).map(([runtime, count]) => (
                                runtime === 'cron' ? (
                                  <button key={runtime} onClick={() => dispatchOpenWindow({ id: 'scheduler' })} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 cursor-pointer hover:ring-1 hover:ring-amber-400/40 transition-all">
                                    <span className="material-symbols-outlined text-[12px]">{runtimeIcons[runtime] || 'memory'}</span>
                                    {runtimeLabels[runtime] || runtime}: {count}
                                    <span className="material-symbols-outlined text-[10px]">open_in_new</span>
                                  </button>
                                ) : (
                                  <div key={runtime} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/50">
                                    <span className="material-symbols-outlined text-[12px]">{runtimeIcons[runtime] || 'memory'}</span>
                                    {runtimeLabels[runtime] || runtime}: {count}
                                  </div>
                                )
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Task Audit Health */}
                        {taskAudit && taskAudit.total > 0 && (() => {
                          const auditLabels: Record<string, string> = {
                            stale_queued: a.taskAuditStaleQueued || 'Stale queued',
                            stale_running: a.taskAuditStaleRunning || 'Stale running',
                            lost: a.taskAuditLost || 'Lost tasks',
                            delivery_failed: a.taskAuditDeliveryFailed || 'Delivery failed',
                            missing_cleanup: a.taskAuditMissingCleanup || 'Missing cleanup',
                            inconsistent_timestamps: a.taskAuditInconsistent || 'Inconsistent',
                          };
                          const errorCodes = ['stale_running', 'lost'];
                          return (
                            <div className={`px-3 py-3 rounded-xl border ${taskAudit.errors > 0 ? 'border-red-200/60 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/[0.04]' : 'border-amber-200/60 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/[0.04]'}`}>
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`material-symbols-outlined text-[14px] ${taskAudit.errors > 0 ? 'text-red-500' : 'text-amber-500'}`}>health_and_safety</span>
                                <h4 className="text-[10px] font-bold text-slate-600 dark:text-white/60 uppercase">{a.taskAuditTitle || 'Task Health'}</h4>
                                <span className={`text-[10px] font-bold ${taskAudit.errors > 0 ? 'text-red-500' : 'text-amber-500'}`}>
                                  {(a.taskAuditFindings || '{{total}} finding(s)').replace('{{total}}', String(taskAudit.total))}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {Object.entries(taskAudit.byCode as Record<string, number>)
                                  .filter(([, v]) => v > 0)
                                  .map(([code, count]) => (
                                    <span key={code} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold ${errorCodes.includes(code) ? 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                                      {auditLabels[code] || code} <b>{count as number}</b>
                                    </span>
                                  ))}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Info note */}
                        <div className="px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-500/5 border border-blue-200/60 dark:border-blue-500/10 text-[10px] text-blue-600 dark:text-blue-400 flex items-start gap-1.5">
                          <span className="material-symbols-outlined text-[14px] mt-0.5 shrink-0">info</span>
                          <span>{a.tasksNote || 'Task summary from the gateway status endpoint. Individual task details are managed via the Hermes CLI.'}</span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* Scenarios Panel */}
              {panel === 'scenarios' && (
                <ScenarioLibraryV2
                  language={language}
                  defaultAgentId={selectedId || undefined}
                  onApplyScenario={() => {
                    // 应用场景后刷新文件列表
                    if (selectedId) {
                      gwApi.agentFilesList(selectedId).then(setFilesList).catch((err: any) => { toast('error', err?.message || a.fetchFailed); });
                    }
                  }}
                />
              )}

              {/* Collaboration Panel */}
              {panel === 'collaboration' && (
                <MultiAgentCollaborationV2 
                  language={language} 
                  defaultAgentId={selectedId || undefined}
                  onDeploy={() => {
                    // 部署完成后静默刷新代理列表
                    loadAgents();
                  }}
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      {crudMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 rounded-2xl bg-white dark:bg-[#1a1a2e] border border-slate-200 dark:border-white/10 shadow-2xl p-5">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">{crudMode === 'create' ? 'add_circle' : 'edit'}</span>
              {crudMode === 'create' ? a.createAgent : a.editAgent}
            </h3>

            {crudError && (
              <div className="mb-3 px-3 py-2 rounded-xl bg-mac-red/10 border border-mac-red/20 text-[10px] text-mac-red">{crudError}</div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase block mb-1">{a.agentName}</label>
                <input value={crudName} onChange={e => {
                    const newName = e.target.value;
                    setCrudName(crudMode === 'create' ? newName.toLowerCase().replace(/[^a-z0-9_-]/g, '') : newName);
                  }}
                  placeholder={crudMode === 'create' ? 'my-agent' : a.agentNameHint}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-[12px] text-slate-800 dark:text-white/80 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  disabled={crudBusy} />
                {crudMode === 'create' && (
                  <p className="mt-1 text-[9px] text-slate-400 dark:text-white/25">
                    {a.profileNameHint || 'Lowercase letters, numbers, hyphens, underscores. Config cloned from default profile.'}
                  </p>
                )}
              </div>

              {/* Edit mode: show workspace, model, emoji, theme fields */}
              {crudMode === 'edit' && (<>
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase block mb-1">{a.workspacePath}</label>
                <input value={crudWorkspace} onChange={e => setCrudWorkspace(e.target.value)}
                  placeholder={a.workspaceHint}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-[12px] font-mono text-slate-800 dark:text-white/80 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  disabled={crudBusy} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase block mb-1">{a.model}</label>
                {modelOptions.length > 0 ? (
                  <CustomSelect
                    value={crudModel}
                    onChange={setCrudModel}
                    options={[{ value: '', label: a.modelHint || 'Inherit default' }, ...modelOptions]}
                    disabled={crudBusy}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-[12px] font-mono text-slate-800 dark:text-white/80"
                  />
                ) : (
                  <input value={crudModel} onChange={e => setCrudModel(e.target.value)}
                    placeholder={a.modelHint}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-[12px] font-mono text-slate-800 dark:text-white/80 focus:outline-none focus:ring-1 focus:ring-primary/30"
                    disabled={crudBusy} />
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase block mb-1">{a.emoji}</label>
                  <input value={crudEmoji} onChange={e => setCrudEmoji(e.target.value)}
                    placeholder={a.emojiHint}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-[12px] text-slate-800 dark:text-white/80 focus:outline-none focus:ring-1 focus:ring-primary/30"
                    disabled={crudBusy} />
                </div>
                <div className="shrink-0 pt-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={crudDefault} onChange={e => setCrudDefault(e.target.checked)}
                      className="accent-primary w-3.5 h-3.5" disabled={crudBusy} />
                    <span className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase">{a.isDefault}</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase block mb-1">{a.theme}</label>
                <textarea value={crudTheme} onChange={e => setCrudTheme(e.target.value)}
                  placeholder={a.themeHint || 'Agent personality / instructions...'}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-[12px] text-slate-800 dark:text-white/80 focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
                  disabled={crudBusy} />
              </div>
              </>)}
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setCrudMode(null)} disabled={crudBusy}
                className="px-4 py-2 rounded-xl text-[11px] font-bold text-slate-500 dark:text-white/40 hover:bg-slate-100 dark:hover:bg-white/5 transition-all">{a.cancel}</button>
              <button onClick={crudMode === 'create' ? handleCreate : handleUpdate} disabled={crudBusy || !crudName.trim()}
                className="px-4 py-2 rounded-xl bg-primary text-white text-[11px] font-bold disabled:opacity-40 transition-all">
                {crudBusy ? (crudMode === 'create' ? a.creating : a.updating) : (crudMode === 'create' ? a.create : a.save)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 rounded-2xl bg-white dark:bg-[#1a1a2e] border border-slate-200 dark:border-white/10 shadow-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-mac-red/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px] text-mac-red">delete_forever</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">{a.deleteAgent}</h3>
                <p className="text-[10px] text-slate-400 dark:text-white/40 font-mono">{selectedId}</p>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-white/50 mb-3">{a.confirmDelete}</p>

            {crudError && (
              <div className="mb-3 px-3 py-2 rounded-xl bg-mac-red/10 border border-mac-red/20 text-[10px] text-mac-red">{crudError}</div>
            )}

            <label className="flex items-center gap-2 mb-4">
              <input type="checkbox" checked={deleteFiles} onChange={e => setDeleteFiles(e.target.checked)} className="accent-mac-red" />
              <span className="text-[10px] text-slate-500 dark:text-white/40">{a.deleteFiles}</span>
            </label>

            <div className="flex justify-end gap-2">
              <button onClick={() => { setDeleteConfirm(false); setCrudError(null); }} disabled={crudBusy}
                className="px-4 py-2 rounded-xl text-[11px] font-bold text-slate-500 dark:text-white/40 hover:bg-slate-100 dark:hover:bg-white/5 transition-all">{a.cancel}</button>
              <button onClick={handleDelete} disabled={crudBusy}
                className="px-4 py-2 rounded-xl bg-mac-red text-white text-[11px] font-bold disabled:opacity-40 transition-all">
                {crudBusy ? a.deleting : a.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Agents;
