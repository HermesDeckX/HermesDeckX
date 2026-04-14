import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Language } from '../../types';
import { getTranslation } from '../../locales';
import { templateSystem, ScenarioTemplate, MultiAgentTemplate, AgentTemplate, KnowledgeItem } from '../../services/template-system';
import ScenarioLibraryV2 from '../scenarios/ScenarioLibraryV2';
import MultiAgentCollaborationV2 from '../multiagent/MultiAgentCollaborationV2';
import KnowledgeHub from './KnowledgeHub';
import TemplateSourceManagerUI from './TemplateSourceManager';
import { useToast } from '../Toast';
import { FileApplyConfirm, FileApplyRequest } from '../FileApplyConfirm';
import AgentPickerModal from '../AgentPickerModal';
import { resolveTemplateColor } from '../../utils/templateColors';

type Template = ScenarioTemplate | MultiAgentTemplate | AgentTemplate | KnowledgeItem;

interface TemplateManagerProps {
  language: Language;
  defaultAgentId?: string;
  pendingExpandItem?: string | null;
  onExpandItemConsumed?: () => void;
}

type TabId = 'scenarios' | 'multi-agent' | 'agents' | 'knowledge' | 'search';

const TemplateManager: React.FC<TemplateManagerProps> = ({ language, defaultAgentId, pendingExpandItem, onExpandItemConsumed }) => {
  const t = useMemo(() => getTranslation(language) as any, [language]);
  const tm = (t.templateManager || {}) as any;
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<TabId>('scenarios');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSourceManager, setShowSourceManager] = useState(false);
  const [searchResults, setSearchResults] = useState<Template[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Deep link: switch to knowledge tab when expandItem arrives
  useEffect(() => {
    if (pendingExpandItem) {
      setActiveTab('knowledge');
    }
  }, [pendingExpandItem]);

  // Search templates
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setSearchLoading(true);
      templateSystem.searchAll(searchQuery, language)
        .then(results => setSearchResults(results as Template[]))
        .catch(() => setSearchResults([]))
        .finally(() => setSearchLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, language]);

  const tabs: { id: TabId; icon: string; label: string }[] = [
    { id: 'scenarios', icon: 'auto_awesome', label: tm.scenarios || 'Scenarios' },
    { id: 'multi-agent', icon: 'groups', label: tm.multiAgent || 'Multi-Agent' },
    { id: 'agents', icon: 'person', label: tm.agents || 'Agent Presets' },
    { id: 'knowledge', icon: 'menu_book', label: tm.knowledge || 'Knowledge' },
    { id: 'search', icon: 'search', label: tm.search || 'Search' },
  ];

  const handleApplyScenario = useCallback((scenario: ScenarioTemplate) => {
    toast('success', `${tm.applied || 'Applied'}: ${scenario.metadata.name}`);
  }, [tm, toast]);

  const handleDeployMultiAgent = useCallback((template: MultiAgentTemplate) => {
    toast('success', `${tm.deployed || 'Deployed'}: ${template.metadata.name}`);
  }, [tm, toast]);

  const getTemplateTypeLabel = useCallback((type: string) => {
    const labels: Record<string, string> = {
      scenario: tm.typeScenario || 'Scenario',
      'multi-agent': tm.typeMultiAgent || 'Multi-Agent',
      agent: tm.typeAgent || 'Agent',
      recipe: tm.typeRecipe || 'Recipe',
      tip: tm.typeTip || 'Tip',
      snippet: tm.typeSnippet || 'Snippet',
      faq: tm.typeFaq || 'FAQ',
    };
    return labels[type] || type;
  }, [tm]);

  const getTemplateTypeColor = useCallback((type: string) => {
    const colors: Record<string, string> = {
      scenario: 'bg-blue-500/10 text-blue-500',
      'multi-agent': 'bg-purple-500/10 text-purple-500',
      agent: 'bg-green-500/10 text-green-500',
      recipe: 'bg-amber-500/10 text-amber-500',
      tip: 'bg-emerald-500/10 text-emerald-500',
      snippet: 'bg-cyan-500/10 text-cyan-500',
      faq: 'bg-violet-500/10 text-violet-500',
    };
    return colors[type] || 'bg-slate-500/10 text-slate-500';
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">{tm.title || 'Template Manager'}</h2>
            <p className="text-[10px] text-slate-500 dark:text-white/40">{tm.subtitle || 'Browse and deploy templates'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSourceManager(true)}
              className="h-8 px-3 rounded-lg text-[10px] font-bold border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] text-slate-600 dark:text-white/60 hover:border-primary/30 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">settings</span>
              <span className="hidden sm:inline">{t.templateSource?.manageSource || 'Manage Sources'}</span>
            </button>
            <div className="relative">
              <span className="material-symbols-outlined absolute start-2.5 top-1/2 -translate-y-1/2 text-[16px] text-slate-400 dark:text-white/30">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value.trim()) {
                    setActiveTab('search');
                  }
                }}
                placeholder={tm.searchPlaceholder || 'Search all templates...'}
                className="h-8 ps-8 pe-3 w-56 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 text-[11px] text-slate-700 dark:text-white/70 placeholder:text-slate-400 dark:placeholder:text-white/30 focus:ring-1 focus:ring-primary/50 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mt-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id !== 'search') setSearchQuery('');
              }}
              className={`h-8 px-3 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all ${
                activeTab === tab.id
                  ? 'bg-primary/15 text-primary'
                  : 'bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-white/40 hover:bg-slate-200 dark:hover:bg-white/[0.06]'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        {activeTab === 'scenarios' && (
          <ScenarioLibraryV2
            language={language}
            defaultAgentId={defaultAgentId}
            onApplyScenario={handleApplyScenario}
          />
        )}

        {activeTab === 'multi-agent' && (
          <MultiAgentCollaborationV2
            language={language}
            onDeploy={handleDeployMultiAgent}
          />
        )}

        {activeTab === 'agents' && (
          <AgentPresetsPanel language={language} defaultAgentId={defaultAgentId} />
        )}

        {activeTab === 'knowledge' && (
          <KnowledgeHub language={language} defaultAgentId={defaultAgentId} pendingExpandItem={pendingExpandItem} onExpandItemConsumed={onExpandItemConsumed} />
        )}

        {activeTab === 'search' && (
          <SearchResultsPanel
            results={searchResults}
            loading={searchLoading}
            query={searchQuery}
            language={language}
            getTypeLabel={getTemplateTypeLabel}
            getTypeColor={getTemplateTypeColor}
          />
        )}
      </div>

      {/* Template Source Manager Modal */}
      {showSourceManager && (
        <TemplateSourceManagerUI
          language={language}
          onClose={() => setShowSourceManager(false)}
        />
      )}
    </div>
  );
};

// Agent Presets Panel
interface AgentPresetsPanelProps {
  language: Language;
  defaultAgentId?: string;
}

const AgentPresetsPanel: React.FC<AgentPresetsPanelProps> = ({ language, defaultAgentId }) => {
  const t = useMemo(() => getTranslation(language) as any, [language]);
  const tm = (t.templateManager || {}) as any;
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailTemplate, setDetailTemplate] = useState<AgentTemplate | null>(null);
  const [pendingFileApply, setPendingFileApply] = useState<FileApplyRequest | null>(null);
  const [pendingApplyData, setPendingApplyData] = useState<{ content: string; title: string } | null>(null);

  React.useEffect(() => {
    templateSystem.getAgentTemplates(language).then((data) => {
      setTemplates(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [language]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="material-symbols-outlined text-[24px] text-primary animate-spin">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[14px] font-bold text-slate-800 dark:text-white">{tm.agentPresets || 'Agent Presets'}</h3>
        <p className="text-[12px] text-slate-500 dark:text-white/40">{tm.agentPresetsDesc || 'Personality and communication style presets'}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => setDetailTemplate(template)}
            className="text-start p-4 rounded-xl border transition-all border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] hover:border-primary/40 hover:bg-primary/[0.02] hover:ring-1 hover:ring-primary/15"
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
              style={resolveTemplateColor(template.metadata.color)}
            >
              <span className="material-symbols-outlined text-white text-[24px]">{template.metadata.icon || 'person'}</span>
            </div>
            <h4 className="text-[13px] font-bold text-slate-800 dark:text-white">{template.metadata.name}</h4>
            <p className="text-[11px] text-slate-500 dark:text-white/40 mt-1 line-clamp-2">{template.metadata.description}</p>
          </button>
        ))}
      </div>

      {/* Detail Modal */}
      {detailTemplate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDetailTemplate(null)}>
          <div className="bg-white dark:bg-[#1a1c20] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={resolveTemplateColor(detailTemplate.metadata.color)}>
                  <span className="material-symbols-outlined text-white text-[22px]">{detailTemplate.metadata.icon || 'person'}</span>
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-slate-800 dark:text-white">{detailTemplate.metadata.name}</h3>
                  <p className="text-[12px] text-slate-500 dark:text-white/40">{detailTemplate.metadata.description}</p>
                </div>
              </div>
              <button onClick={() => setDetailTemplate(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white/60 p-1">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 select-text">
              {detailTemplate.metadata.tags && detailTemplate.metadata.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {detailTemplate.metadata.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.06] text-[11px] text-slate-500 dark:text-white/40">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {detailTemplate.content.examples && detailTemplate.content.examples.length > 0 && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-white/30 mb-2 font-bold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">forum</span>
                    {tm.styleExamples || 'Style Examples'}
                  </p>
                  <div className="space-y-2">
                    {(detailTemplate.content.examples as any[]).map((ex, idx) => {
                      const isString = typeof ex === 'string';
                      return isString ? (
                        <div key={idx} className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06]">
                          <span className="material-symbols-outlined text-[14px] text-primary/60 shrink-0 mt-0.5">chat_bubble</span>
                          <span className="text-[12px] text-slate-600 dark:text-white/60 italic">&ldquo;{ex}&rdquo;</span>
                        </div>
                      ) : (
                        <div key={idx} className="rounded-lg border border-slate-100 dark:border-white/[0.06] overflow-hidden">
                          <div className="flex items-start gap-2 px-3 py-2 bg-slate-50 dark:bg-white/[0.03]">
                            <span className="material-symbols-outlined text-[14px] text-slate-400 dark:text-white/30 shrink-0 mt-0.5">person</span>
                            <span className="text-[12px] text-slate-500 dark:text-white/50">{ex.input}</span>
                          </div>
                          <div className="flex items-start gap-2 px-3 py-2 bg-primary/[0.03] border-t border-slate-100 dark:border-white/[0.06]">
                            <span className="material-symbols-outlined text-[14px] text-primary/60 shrink-0 mt-0.5">smart_toy</span>
                            <span className="text-[12px] text-slate-600 dark:text-white/60 italic">&ldquo;{ex.output}&rdquo;</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {detailTemplate.content.soulSnippet && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-white/30 mb-2 font-bold">{tm.preview || 'Preview'}</p>
                  <pre className="text-[12px] text-slate-700 dark:text-white/60 whitespace-pre-wrap font-mono leading-relaxed bg-slate-50 dark:bg-black/20 rounded-xl p-4 max-h-[50vh] overflow-y-auto custom-scrollbar">
                    {detailTemplate.content.soulSnippet}
                  </pre>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 dark:border-white/10 shrink-0">
              <div>
                {detailTemplate.content.soulSnippet && (
                  <button
                    onClick={() => {
                      if (defaultAgentId) {
                        setPendingFileApply({
                          agentId: defaultAgentId,
                          files: [{ fileName: 'SOUL.md', mode: 'replace', content: detailTemplate.content.soulSnippet }],
                          title: detailTemplate.metadata.name,
                        });
                      } else {
                        setPendingApplyData({ content: detailTemplate.content.soulSnippet, title: detailTemplate.metadata.name });
                      }
                    }}
                    className="h-8 px-4 rounded-lg text-[12px] font-bold bg-primary text-white hover:bg-primary/90 transition-colors flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[14px]">edit_document</span>
                    {tm.applyToFile || 'Apply to File'}
                  </button>
                )}
              </div>
              <button
                onClick={() => setDetailTemplate(null)}
                className="h-8 px-4 rounded-lg text-[12px] font-bold text-slate-500 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
              >
                {tm.close || 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agent Picker */}
      {pendingApplyData && (
        <AgentPickerModal
          locale={(t as any).agentPicker || {}}
          onSelect={(agentId) => {
            setPendingFileApply({
              agentId,
              files: [{ fileName: 'SOUL.md', mode: 'replace', content: pendingApplyData.content }],
              title: pendingApplyData.title,
            });
            setPendingApplyData(null);
          }}
          onCancel={() => setPendingApplyData(null)}
        />
      )}

      {/* File Apply Confirm */}
      {pendingFileApply && (
        <FileApplyConfirm
          request={pendingFileApply}
          locale={(t as any).fileApply || {}}
          onDone={() => setPendingFileApply(null)}
          onCancel={() => setPendingFileApply(null)}
        />
      )}
    </div>
  );
};

// Search Results Panel
interface SearchResultsPanelProps {
  results: Template[];
  loading: boolean;
  query: string;
  language: Language;
  getTypeLabel: (type: string) => string;
  getTypeColor: (type: string) => string;
}

const SearchResultsPanel: React.FC<SearchResultsPanelProps> = ({
  results,
  loading,
  query,
  language,
  getTypeLabel,
  getTypeColor,
}) => {
  const t = useMemo(() => getTranslation(language) as any, [language]);
  const tm = (t.templateManager || {}) as any;

  if (!query.trim()) {
    return (
      <div className="text-center py-12">
        <span className="material-symbols-outlined text-[48px] text-slate-200 dark:text-white/10">search</span>
        <p className="mt-2 text-[11px] text-slate-400 dark:text-white/30">{tm.enterSearchQuery || 'Enter a search query'}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="material-symbols-outlined text-[24px] text-primary animate-spin">progress_activity</span>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="material-symbols-outlined text-[48px] text-slate-200 dark:text-white/10">search_off</span>
        <p className="mt-2 text-[11px] text-slate-400 dark:text-white/30">
          {tm.noResults || 'No results found for'} "{query}"
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-slate-500 dark:text-white/40">
        {results.length} {tm.resultsFor || 'results for'} "{query}"
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {results.map((template) => (
          <div
            key={`${template.type}-${template.id}`}
            className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03]"
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={resolveTemplateColor(template.metadata.color)}
              >
                <span className="material-symbols-outlined text-white text-[20px]">{template.metadata.icon || 'auto_awesome'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-[12px] font-bold text-slate-800 dark:text-white truncate">{template.metadata.name}</h4>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${getTypeColor(template.type)}`}>
                    {getTypeLabel(template.type)}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-white/40 mt-0.5 line-clamp-2">{template.metadata.description}</p>
              </div>
            </div>

            {template.metadata.tags && template.metadata.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {template.metadata.tags.slice(0, 4).map((tag) => (
                  <span key={tag} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.05] text-[9px] text-slate-500 dark:text-white/40">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TemplateManager;
