import React, { useState, useMemo, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import { Language } from '../../types';
import { getTranslation } from '../../locales';
import { useConfigEditor } from './useConfigEditor';
import { useToast } from '../../components/Toast';
import { configApi, gwApi } from '../../services/api';
import { get } from '../../services/request';
import { extractSchemaKeys, getUnmappedKeys } from './sectionRegistry';
import { EditorFieldsI18nProvider } from './fields';
import type { SectionProps } from './sectionTypes';
import { validateChannelsConfig } from './sections/ChannelsSection';
import SchemaField from '../../components/SchemaField';
import type { UiHints } from '../../components/SchemaField';
import { extractFieldMetadata, filterFieldMetadata, getNestedSchema, getSecretFields } from './fieldMetadata';
interface EditorProps {
  language: Language;
  pendingSection?: string | null;
  onSectionConsumed?: () => void;
}

type SectionId =
  | 'models' | 'agents' | 'tools' | 'channels' | 'messages'
  | 'gateway' | 'cron' | 'extensions'
  | 'memory' | 'audio' | 'logging' | 'yaml' | 'templates' | 'secrets'
  | 'unmapped';

interface SectionDef {
  id: SectionId;
  icon: string;
  labelKey: string;
  color: string;
  searchKeys?: string[];
}

const getSectionLabel = (es: any, section: SectionDef): string => {
  return (es as any)?.[section.labelKey] || section.id;
};

const ModelsSection = lazy(() => import('./sections/ModelsSection').then(m => ({ default: m.ModelsSection })));
const AgentsSection = lazy(() => import('./sections/AgentsSection').then(m => ({ default: m.AgentsSection })));
const ToolsSection = lazy(() => import('./sections/ToolsSection').then(m => ({ default: m.ToolsSection })));
const ChannelsSection = lazy(() => import('./sections/ChannelsSection').then(m => ({ default: m.ChannelsSection })));
const MessagesSection = lazy(() => import('./sections/MessagesSection').then(m => ({ default: m.MessagesSection })));
const GatewaySection = lazy(() => import('./sections/GatewaySection').then(m => ({ default: m.GatewaySection })));
const CronSection = lazy(() => import('./sections/CronSection').then(m => ({ default: m.CronSection })));
const ExtensionsSection = lazy(() => import('./sections/ExtensionsSection').then(m => ({ default: m.ExtensionsSection })));
const MemorySection = lazy(() => import('./sections/MemorySection').then(m => ({ default: m.MemorySection })));
const AudioSection = lazy(() => import('./sections/AudioSection').then(m => ({ default: m.AudioSection })));
const LoggingSection = lazy(() => import('./sections/LoggingSection').then(m => ({ default: m.LoggingSection })));
const YamlEditorSection = lazy(() => import('./sections/YamlEditorSection').then(m => ({ default: m.YamlEditorSection })));
const TemplatesSection = lazy(() => import('./sections/TemplatesSectionV2').then(m => ({ default: m.TemplatesSectionV2 })));
const UnmappedConfigSection = lazy(() => import('./sections/UnmappedConfigSection').then(m => ({ default: m.UnmappedConfigSection })));
const SecretsSection = lazy(() => import('./sections/SecretsSection').then(m => ({ default: m.SecretsSection })));
const SECTIONS: SectionDef[] = [
  // core sections
  { id: 'models', icon: 'psychology', labelKey: 'secModels', color: 'text-blue-500',
    searchKeys: ['providers', 'provider', 'model', 'fallback_providers', 'delegation', 'api_key', 'base_url', 'default_model', 'transport', 'credentials', 'openrouter', 'anthropic', 'openai', 'google', 'mistral', 'groq'] },
  { id: 'channels', icon: 'forum', labelKey: 'secChannels', color: 'text-green-500',
    searchKeys: ['telegram', 'discord', 'whatsapp', 'slack', 'signal', 'mattermost', 'matrix', 'dingtalk', 'feishu', 'wecom', 'weixin', 'bluebubbles', 'email', 'homeassistant', 'api_server', 'require_mention', 'auto_thread', 'free_response_channels'] },
  { id: 'gateway', icon: 'dns', labelKey: 'secGateway', color: 'text-teal-500',
    searchKeys: ['gateway_timeout', 'api_server', 'approvals', 'session_reset', 'streaming', 'privacy', 'human_delay', 'timezone', 'redact_pii', 'unauthorized_dm_behavior', 'save_trajectories', 'session'] },
  { id: 'agents', icon: 'smart_toy', labelKey: 'secAgents', color: 'text-purple-500',
    searchKeys: ['agent', 'max_turns', 'gateway_timeout', 'restart_drain_timeout', 'service_tier', 'tool_use_enforcement', 'delegation', 'subagent', 'personalities', 'quick_commands', 'prefill_messages', 'reasoning_effort'] },
  { id: 'tools', icon: 'build', labelKey: 'secTools', color: 'text-orange-500',
    searchKeys: ['toolsets', 'terminal', 'backend', 'docker', 'ssh', 'modal', 'timeout', 'persistent_shell', 'browser', 'checkpoints', 'file_read_max_chars', 'security', 'compression', 'smart_model_routing', 'container'] },
  { id: 'messages', icon: 'chat', labelKey: 'secMessages', color: 'text-cyan-500',
    searchKeys: ['display', 'skin', 'show_cost', 'tool_progress', 'tool_preview_length'] },
  // secondary sections
  { id: 'audio', icon: 'volume_up', labelKey: 'secAudio', color: 'text-fuchsia-500',
    searchKeys: ['tts', 'stt', 'voice', 'speech', 'edge', 'elevenlabs', 'openai', 'whisper', 'recording', 'auto_tts', 'silence', 'neutts', 'mistral', 'groq'] },
  { id: 'memory', icon: 'neurology', labelKey: 'secMemory', color: 'text-sky-500',
    searchKeys: ['memory', 'memory_enabled', 'user_profile', 'memory_char_limit', 'user_char_limit', 'context', 'engine', 'compressor'] },
  { id: 'extensions', icon: 'extension', labelKey: 'secExtensions', color: 'text-violet-500',
    searchKeys: ['skills', 'external_dirs', 'honcho'] },
  { id: 'logging', icon: 'monitoring', labelKey: 'secLogging', color: 'text-yellow-500',
    searchKeys: ['logging', 'log_level', 'max_size_mb', 'backup_count'] },
  { id: 'cron', icon: 'schedule', labelKey: 'secCron', color: 'text-lime-500',
    searchKeys: ['cron', 'wrap_response', 'enabled', 'store', 'maxConcurrentRuns', 'wakeMode'] },
  { id: 'secrets', icon: 'key', labelKey: 'secSecrets', color: 'text-amber-500',
    searchKeys: ['token', 'secret', 'password', 'api_key', 'access_key', 'client_secret', 'auth'] },
  { id: 'unmapped', icon: 'new_releases', labelKey: 'secUnmapped', color: 'text-amber-500' },
  { id: 'yaml', icon: 'data_object', labelKey: 'secYaml', color: 'text-amber-500',
    searchKeys: ['yaml', 'config.yaml', 'raw', 'configSetTitle'] },
];

const Editor: React.FC<EditorProps> = ({ language, pendingSection, onSectionConsumed }) => {
  const t = useMemo(() => getTranslation(language), [language]);
  const ed = (t as any).cfgEditor || {};
  const es = useMemo(() => (t as any).es || {}, [t]);

  const editor = useConfigEditor();
  const { toast } = useToast();
  const handleSave = useCallback(async () => {
    // Pre-save: validate required channel credentials
    if (editor.config) {
      const chErrors = validateChannelsConfig(editor.config, es);
      if (chErrors.length > 0) {
        const msgs = chErrors.map(e => {
          const label = e.account === 'default' ? e.channel : `${e.channel}/${e.account}`;
          return `${label}: ${e.fields.join(', ')}`;
        });
        toast('error', (es.saveCredentialMissing || 'Required channel fields missing') + '\n' + msgs.join('\n'));
        return;
      }
    }
    const ok = await editor.save();
    if (ok) {
      toast('success', ed.saveOkReloading || 'Config saved. Gateway is reloading...');
      window.dispatchEvent(new CustomEvent('hermesdeck:config-form-synced'));
    }
  }, [editor, toast, ed, es]);
  const [activeSection, setActiveSection] = useState<SectionId>('models');
  useEffect(() => {
    if (pendingSection && SECTIONS.some(s => s.id === pendingSection)) {
      setActiveSection(pendingSection as SectionId);
      onSectionConsumed?.();
    }
  }, [pendingSection, onSectionConsumed]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [unmappedCount, setUnmappedCount] = useState<number | null>(null);
  const [uiHints, setUiHints] = useState<UiHints>({});
  const [hermesagentInstalled, setHermesagentInstalled] = useState<boolean | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const scrollBySectionRef = useRef<Partial<Record<SectionId, number>>>({});
  const pendingRestoreSectionRef = useRef<SectionId | null>(null);
  const sectionButtonRefs = useRef<Partial<Record<SectionId, HTMLButtonElement | null>>>({});

  // 当配置文件不存在时，检测 hermesagent 是否已安装
  useEffect(() => {
    if (editor.loadErrorCode === 'CONFIG_NOT_FOUND') {
      get<any>('/api/v1/setup/scan').then((data: any) => {
        const report = data?.data || data;
        setHermesagentInstalled(report?.hermesAgentInstalled ?? false);
      }).catch(() => setHermesagentInstalled(false));
    }
  }, [editor.loadErrorCode]);

  const handleGenerateDefault = useCallback(async () => {
    setGenerating(true);
    setGenerateError('');
    try {
      await configApi.generateDefault();
      await editor.load();
    } catch (e: any) {
      setGenerateError(e?.message || es.genConfigFail);
    } finally {
      setGenerating(false);
    }
  }, [editor, es]);

  // Ctrl+S 淇濆瓨
  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      return target.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select';
    };

    const handler = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) { editor.redo(); } else { editor.undo(); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editor]);

  // Pre-detect unmapped keys count so we can hide the tab when empty
  useEffect(() => {
    gwApi.configSchema().then((res: any) => {
      const schemaObj = res?.schema || res;
      setUiHints(res?.uiHints || {});
      if (!schemaObj?.properties) { setUnmappedCount(0); return; }
      const allKeys = extractSchemaKeys(schemaObj);
      const unmapped = getUnmappedKeys(allKeys);
      setUnmappedCount(unmapped.length);
    }).catch(() => { /* keep null = show tab as fallback */ });
  }, []);

  useEffect(() => {
    const handleYamlSynced = () => {
      void editor.load();
    };
    window.addEventListener('hermesdeck:config-yaml-synced', handleYamlSynced);
    window.addEventListener('hermesdeck:config-env-synced', handleYamlSynced);
    window.addEventListener('hermesdeck:config-key-set', handleYamlSynced);
    window.addEventListener('hermesdeck:config-form-synced', handleYamlSynced);
    return () => {
      window.removeEventListener('hermesdeck:config-yaml-synced', handleYamlSynced);
      window.removeEventListener('hermesdeck:config-env-synced', handleYamlSynced);
      window.removeEventListener('hermesdeck:config-key-set', handleYamlSynced);
      window.removeEventListener('hermesdeck:config-form-synced', handleYamlSynced);
    };
  }, [editor]);

  const fieldMetadata = useMemo(() => extractFieldMetadata(editor.schema), [editor.schema]);
  const secretFieldCount = useMemo(() => getSecretFields(fieldMetadata).length, [fieldMetadata]);
  const fieldSearchResults = useMemo(() => filterFieldMetadata(fieldMetadata, searchQuery).slice(0, 80), [fieldMetadata, searchQuery]);
  const showFieldSearchResults = searchQuery.trim().length > 0 && fieldSearchResults.length > 0;

  // 杩囨护 sections
  const filteredSections = useMemo(() => {
    let list = SECTIONS;
    // Hide the unmapped section when there are no unmapped keys
    if (unmappedCount === 0) list = list.filter(s => s.id !== 'unmapped');
    if (secretFieldCount === 0) list = list.filter(s => s.id !== 'secrets');
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(s => {
      if (getSectionLabel(es, s).toLowerCase().includes(q)) return true;
      if (s.labelKey.toLowerCase().includes(q)) return true;
      if (s.id.includes(q)) return true;
      if (s.searchKeys) {
        return s.searchKeys.some(k => {
          // Match translated label (e.g. Chinese) AND raw key name (English)
          if (k.toLowerCase().includes(q)) return true;
          const v = (es as any)[k];
          return typeof v === 'string' && v.toLowerCase().includes(q);
        });
      }
      return false;
    });
  }, [searchQuery, es, unmappedCount, secretFieldCount]);

  useEffect(() => {
    if (activeSection === 'secrets' && secretFieldCount === 0) {
      setActiveSection('agents');
    }
  }, [activeSection, secretFieldCount]);

  const handleSectionClick = useCallback((id: SectionId) => {
    if (mainScrollRef.current) {
      scrollBySectionRef.current[activeSection] = mainScrollRef.current.scrollTop;
    }
    pendingRestoreSectionRef.current = id;
    setActiveSection(id);
    setSidebarOpen(false);
  }, [activeSection]);

  useEffect(() => {
    if (!editor.config || !mainScrollRef.current) return;
    // Only restore scroll position when switching sections, not on config updates
    if (!pendingRestoreSectionRef.current) return;
    const targetSection = pendingRestoreSectionRef.current;
    const targetTop = scrollBySectionRef.current[targetSection] ?? 0;
    const raf = window.requestAnimationFrame(() => {
      if (mainScrollRef.current) {
        mainScrollRef.current.scrollTop = targetTop;
      }
      pendingRestoreSectionRef.current = null;
    });
    return () => window.cancelAnimationFrame(raf);
  }, [activeSection]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const btn = sectionButtonRefs.current[activeSection];
    if (!btn) return;
    const raf = window.requestAnimationFrame(() => {
      btn.scrollIntoView({ block: 'center', inline: 'nearest' });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [sidebarOpen, activeSection, filteredSections.length]);

  const sectionProps = useMemo<SectionProps | null>(() => {
    if (!editor.config) return null;
    return {
      config: editor.config,
      schema: editor.schema,
      fieldErrors: editor.fieldErrors,
      setField: editor.setField,
      getField: editor.getField,
      deleteField: editor.deleteField,
      appendToArray: editor.appendToArray,
      removeFromArray: editor.removeFromArray,
      language,
      save: editor.save,
    };
  }, [editor.config, editor.schema, editor.fieldErrors, editor.setField, editor.getField, editor.deleteField, editor.appendToArray, editor.removeFromArray, language, editor.save]);

  const renderedSection = useMemo(() => {
    if (!editor.config || !sectionProps) return null;
    switch (activeSection) {
      case 'models': return <ModelsSection {...sectionProps} />;
      case 'agents': return <AgentsSection {...sectionProps} />;
      case 'tools': return <ToolsSection {...sectionProps} />;
      case 'channels': return <ChannelsSection {...sectionProps} />;
      case 'messages': return <MessagesSection {...sectionProps} />;
      case 'gateway': return <GatewaySection {...sectionProps} />;
      case 'cron': return <CronSection {...sectionProps} />;
      case 'extensions': return <ExtensionsSection {...sectionProps} />;
      case 'memory': return <MemorySection {...sectionProps} />;
      case 'audio': return <AudioSection {...sectionProps} />;
      case 'logging': return <LoggingSection {...sectionProps} />;
      case 'secrets': return <SecretsSection {...sectionProps} fields={fieldMetadata} onOpenYaml={() => setActiveSection('yaml')} />;
      case 'templates': return <TemplatesSection language={language} />;
      case 'yaml': return <YamlEditorSection language={language} />;
      case 'unmapped': return <UnmappedConfigSection language={language} config={editor.config} setField={editor.setField} onUnmappedCount={setUnmappedCount} />;
      default: return null;
    }
  }, [activeSection, editor.config, editor.fromJSON, editor.toJSON, fieldMetadata, language, sectionProps]);

  const handleSearchFieldOpen = useCallback((path: string, section: SectionId) => {
    setSearchQuery('');
    handleSectionClick(section);
  }, [handleSectionClick]);

  const currentSection = SECTIONS.find(s => s.id === activeSection);
  const showMobileSaveBar = editor.dirty || editor.saving || !!editor.saveError;

  return (
    <EditorFieldsI18nProvider language={language}>
      <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#1a1c20] relative">
      {/* 椤舵爮 */}
      <header className="h-12 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.03] flex items-center gap-2.5 px-3 md:px-4 shrink-0">
        {/* 绉诲姩绔彍鍗曟寜閽?*/}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="md:hidden text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          aria-label={sidebarOpen ? ed.closeMenu : ed.openMenu}
          title={sidebarOpen ? ed.closeMenu : ed.openMenu}
          aria-expanded={sidebarOpen}
          aria-controls="config-editor-sidebar"
        >
          <span className="material-symbols-outlined text-[20px]">menu</span>
        </button>

        {/* 妯″紡鍒囨崲 */}
        <div className="flex bg-slate-200 dark:bg-black/20 p-0.5 rounded-lg border border-slate-300 dark:border-white/5 shrink-0">
          <button
            onClick={() => editor.setMode('remote')}
            className={`px-2 md:px-3 py-1 rounded-md text-[11px] font-bold transition-all ${editor.mode === 'remote' ? 'bg-white dark:bg-primary shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {ed.remote}
          </button>
          <button
            onClick={() => editor.setMode('local')}
            className={`px-2 md:px-3 py-1 rounded-md text-[11px] font-bold transition-all ${editor.mode === 'local' ? 'bg-white dark:bg-primary shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {ed.local}
          </button>
        </div>

        {/* 鏂囦欢璺緞 */}
        <span className="hidden sm:inline text-[11px] font-mono text-slate-400 dark:text-slate-500 truncate max-w-[360px]" title={editor.configPath || ''}>
          {editor.configPath || (editor.mode === 'local' ? 'config.yaml' : 'remote://gateway')}
        </span>

        <div className="flex-1" />

        {/* 鎾ら攢/閲嶅仛 */}
        <button
          onClick={editor.undo}
          disabled={!editor.canUndo}
          className="hidden sm:flex w-7 h-7 items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title={`${ed.undo} (Ctrl+Z)`}
          aria-label={ed.undo}
        >
          <span className="material-symbols-outlined text-[16px]">undo</span>
        </button>
        <button
          onClick={editor.redo}
          disabled={!editor.canRedo}
          className="hidden sm:flex w-7 h-7 items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title={`${ed.redo} (Ctrl+Shift+Z)`}
          aria-label={ed.redo}
        >
          <span className="material-symbols-outlined text-[16px]">redo</span>
        </button>

        {/* 淇濆瓨 */}
        <button
          onClick={handleSave}
          disabled={!editor.dirty || editor.saving}
          aria-label={ed.saveReload}
          title={ed.saveReload}
          className={`px-3 md:px-4 h-8 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5 ${
            editor.dirty
              ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90'
              : 'bg-slate-200 dark:bg-white/10 text-slate-400 dark:text-slate-500 cursor-not-allowed'
          }`}
        >
          {editor.saving && <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>}
          {ed.saveReload}
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* 绉诲姩绔伄缃?*/}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* 渚ц竟鏍?*/}
        <aside
          id="config-editor-sidebar"
          className={`
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'}
          md:translate-x-0 fixed md:static z-40 md:z-auto
          w-52 md:w-44 lg:w-52 h-full shrink-0
          bg-slate-50 dark:bg-[#161820] border-e border-slate-200 dark:border-white/5
          flex flex-col overflow-hidden transition-transform duration-200
        `}
        >
          {/* 鎼滅储 */}
          <div className="p-2.5">
            <div className="relative">
              <span className="material-symbols-outlined absolute start-2 top-1/2 -translate-y-1/2 text-[14px] text-slate-400">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={ed.search}
                className="w-full h-8 ps-7 pe-2 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-md text-[11px] text-slate-700 dark:text-slate-300 outline-none focus:border-primary placeholder:text-slate-400 dark:placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* 瀵艰埅鍒楄〃 */}
          <nav className="flex-1 overflow-y-auto custom-scrollbar neon-scrollbar px-2 pb-2.5">
            {filteredSections.map(s => (
              <button
                key={s.id}
                ref={el => { sectionButtonRefs.current[s.id] = el; }}
                onClick={() => handleSectionClick(s.id)}
                aria-current={activeSection === s.id ? 'page' : undefined}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-start transition-all mb-1 ${
                  activeSection === s.id
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                }`}
              >
                <span className={`material-symbols-outlined text-[16px] ${activeSection === s.id ? 'text-primary' : s.color}`}>{s.icon}</span>
                <span className="text-[11px] truncate">{getSectionLabel(es, s)}</span>
                {s.id === 'unmapped' && unmappedCount != null && unmappedCount > 0 && (
                  <span className="ms-auto text-[8px] px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">{unmappedCount}</span>
                )}
              </button>
            ))}
          </nav>
        </aside>

        {/* 涓荤紪杈戝尯 */}
        <main
          ref={mainScrollRef}
          className={`flex-1 overflow-y-auto custom-scrollbar neon-scrollbar ${showMobileSaveBar ? 'pb-16 md:pb-0' : ''}`}
          style={{ scrollPaddingBottom: showMobileSaveBar ? 84 : 16 }}
        >
          {editor.loading ? (
            <div className="flex-1 flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3 text-slate-400">
                <span className="material-symbols-outlined text-[32px] animate-spin">progress_activity</span>
                <span className="text-xs">{ed.loading}</span>
              </div>
            </div>
          ) : editor.loadError ? (
            <div className="flex-1 flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-4 text-slate-400 max-w-sm text-center px-4">
                <span className="material-symbols-outlined text-[32px] text-red-400">error</span>
                <span className="text-xs text-red-400">{editor.loadError}</span>
                {editor.loadErrorCode === 'CONFIG_NOT_FOUND' ? (
                  hermesagentInstalled === null ? (
                    <span className="text-xs text-slate-400">{es.checkingInstall}</span>
                  ) : hermesagentInstalled ? (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {es.configMissing}
                      </p>
                      {generateError && <span className="text-xs text-red-400">{generateError}</span>}
                      <button
                        onClick={handleGenerateDefault}
                        disabled={generating}
                        className="px-4 h-8 bg-primary text-white text-[11px] font-bold rounded-lg flex items-center gap-1.5 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                      >
                        {generating && <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>}
                        {es.genDefaultConfig}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-xs text-amber-500">
                        {es.notInstalled}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {es.installHint}
                      </p>
                    </div>
                  )
                ) : (
                  <button onClick={() => editor.load()} className="px-4 h-8 bg-primary text-white text-[11px] font-bold rounded-lg">
                    {ed.retry}
                  </button>
                )}
              </div>
            </div>
          ) : editor.config ? (
            <div className="p-3.5 md:p-5 lg:p-6 max-w-5xl mx-auto">
              {/* 鍖哄潡鏍囬 */}
              {currentSection && (
                <div className="flex items-center gap-2.5 mb-5 md:mb-6">
                  <span className={`material-symbols-outlined text-[22px] ${currentSection.color}`}>{currentSection.icon}</span>
                  <h2 className="text-sm md:text-base font-bold text-slate-800 dark:text-white">
                    {getSectionLabel(es, currentSection)}
                  </h2>
                </div>
              )}
              {showFieldSearchResults && editor.config && editor.schema ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-white/5 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-[12px] font-bold text-slate-700 dark:text-white/70">{ed.searchResults || 'Field Search Results'}</h3>
                        <p className="text-[10px] text-slate-400 dark:text-white/35 mt-0.5">{fieldSearchResults.length} {ed.fields || 'fields'}</p>
                      </div>
                    </div>
                    <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto custom-scrollbar neon-scrollbar">
                      {fieldSearchResults.map((field) => {
                        const value = editor.getField(field.path.split('.'));
                        const keySchema = getNestedSchema(editor.schema, field.path);
                        if (!keySchema) return null;
                        return (
                          <div key={field.path} className="rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-50/60 dark:bg-white/[0.02] p-3">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="min-w-0">
                                <p className="text-[11px] font-bold text-slate-700 dark:text-white/75">{field.label}</p>
                                <p className="text-[10px] text-slate-400 dark:text-white/35 font-mono mt-0.5">{field.path}</p>
                                {field.description && <p className="text-[10px] text-slate-500 dark:text-white/40 mt-1 leading-4">{field.description}</p>}
                              </div>
                              <button
                                onClick={() => handleSearchFieldOpen(field.path, field.section as SectionId)}
                                className="shrink-0 text-[10px] text-primary font-bold hover:underline"
                              >
                                {ed.jumpToField || 'Jump'}
                              </button>
                            </div>
                            <div data-config-path={field.path}>
                              <SchemaField
                                path={field.path}
                                schema={keySchema}
                                uiHints={uiHints}
                                value={value}
                                onChange={(p, v) => editor.setField(p, v)}
                                errors={editor.fieldErrors}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <Suspense fallback={<div className="py-10 flex items-center justify-center text-slate-400"><span className="material-symbols-outlined text-[24px] animate-spin">progress_activity</span></div>}>{renderedSection}</Suspense>
              )}
            </div>
          ) : null}
        </main>
      </div>

      {showMobileSaveBar && (
        <div className="md:hidden px-3 pt-2.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] border-t border-slate-200 dark:border-white/5 bg-white/95 dark:bg-[#161820]/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              {editor.saveError ? (
                <p className="text-[11px] text-red-500 truncate">{editor.saveError}</p>
              ) : (
                <p className="text-[11px] text-amber-500 truncate">{ed.unsaved}</p>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={!editor.dirty || editor.saving}
              className={`h-9 px-3.5 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                editor.dirty
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'bg-slate-200 dark:bg-white/10 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              }`}
            >
              {editor.saving && <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>}
              {ed.saveReload}
            </button>
          </div>
        </div>
      )}

      {/* 搴曟爮 */}
      <footer className="h-7 md:h-8 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#161820] flex items-center px-3 md:px-4 text-[11px] md:text-[10px] text-slate-400 dark:text-slate-500 font-mono gap-3">
        <span className="flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${editor.mode === 'local' ? 'bg-blue-500' : 'bg-green-500'}`} />
          {editor.mode === 'local' ? ed.local : ed.remote}
        </span>
        {editor.dirty && (
          <span className="flex items-center gap-1 text-amber-500">
            <span className="material-symbols-outlined text-[10px]">circle</span>
            {ed.unsaved}
          </span>
        )}
        {editor.saveError && (
          <span className="text-red-400 truncate max-w-[200px]">{editor.saveError}</span>
        )}
        <span className="flex-1" />
        {editor.config && (
          <span>{Object.keys(editor.config).length} {ed.topKeys}</span>
        )}
        {editor.errors.length > 0 && (
          <span className="text-red-400">{editor.errors.length} {ed.errors}</span>
        )}
        <span className="hidden sm:inline flex items-center gap-1">
          {editor.dirty ? (
            <span className="text-amber-500 flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[10px]">circle</span>
              {ed.unsaved}
            </span>
          ) : (
            <span className="text-mac-green flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[10px]">check_circle</span>
              {ed.synced}
            </span>
          )}
        </span>
      </footer>
      </div>
    </EditorFieldsI18nProvider>
  );
};

export default Editor;









