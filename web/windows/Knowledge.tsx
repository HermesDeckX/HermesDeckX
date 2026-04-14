import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Language } from '../types';
import { getTranslation } from '../locales';
import { knowledgeApi } from '../services/api';
import type { KnowledgeStats } from '../services/api';
import { SearchWorkbench, MemoryExplorer, RecentSessions } from '../components/knowledge';

type KnowledgeTab = 'search' | 'recent' | 'memory';

interface KnowledgeProps {
  language: Language;
  pendingExpandItem?: string | null;
  onExpandItemConsumed?: () => void;
}

const Knowledge: React.FC<KnowledgeProps> = ({ language, pendingExpandItem, onExpandItemConsumed }) => {
  const t = getTranslation(language) as Record<string, any>;
  const k = t.know || {};
  const [activeTab, setActiveTab] = useState<KnowledgeTab>('search');
  const [stats, setStats] = useState<KnowledgeStats | null>(null);

  useEffect(() => {
    knowledgeApi.statsCached(30000).then(setStats).catch(() => {});
  }, []);

  // Consume pendingExpandItem if needed (legacy compat)
  useEffect(() => {
    if (pendingExpandItem && onExpandItemConsumed) {
      onExpandItemConsumed();
    }
  }, [pendingExpandItem, onExpandItemConsumed]);

  const tabs: { key: KnowledgeTab; label: string; icon: string; badge?: number }[] = useMemo(() => [
    { key: 'search', label: k.tabSearch || 'Search', icon: 'search' },
    { key: 'recent', label: k.tabRecent || 'Recent Sessions', icon: 'history', badge: stats?.sessionCount },
    { key: 'memory', label: k.tabMemory || 'Memory & Profile', icon: 'psychology', badge: stats?.memoryFileCount },
  ], [k, stats]);

  const handleTabChange = useCallback((tab: KnowledgeTab) => {
    setActiveTab(tab);
  }, []);

  return (
    <div className="h-full flex flex-col p-4 gap-3">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px] text-violet-500">neurology</span>
          </div>
          <div>
            <h2 className="text-sm font-bold text-text">{k.title || 'Knowledge Center'}</h2>
            <p className="text-[10px] text-text-muted">
              {k.subtitle || 'Search sessions, browse memory & user profiles'}
            </p>
          </div>
        </div>
        {/* Stats badges */}
        {stats && (
          <div className="hidden md:flex items-center gap-3">
            {stats.sessionCount > 0 && (
              <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
                <span className="material-symbols-outlined text-[12px] text-info">forum</span>
                {stats.sessionCount} {k.statSessions || 'sessions'}
              </div>
            )}
            {stats.messageCount > 0 && (
              <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
                <span className="material-symbols-outlined text-[12px] text-success">chat</span>
                {stats.messageCount.toLocaleString()} {k.statMessages || 'messages'}
              </div>
            )}
            {stats.hasMemory && (
              <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
                <span className="material-symbols-outlined text-[12px] text-warning">psychology</span>
                {k.statMemoryActive || 'Memory active'}
              </div>
            )}
            {stats.hasUserProfile && (
              <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
                <span className="material-symbols-outlined text-[12px] text-violet-500">person</span>
                {k.statProfileActive || 'Profile active'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 shrink-0 border-b border-surface-sunken pb-0">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`relative text-[11px] px-3 py-2 rounded-t-lg flex items-center gap-1.5 transition-colors font-medium
              ${activeTab === tab.key
                ? 'text-info bg-info/5 border-b-2 border-info -mb-px'
                : 'text-text-secondary hover:text-text hover:bg-surface-raised'
              }`}
          >
            <span className="material-symbols-outlined text-[14px]">{tab.icon}</span>
            {tab.label}
            {tab.badge != null && tab.badge > 0 && (
              <span className="text-[8px] min-w-[16px] h-4 px-1 rounded-full bg-info/15 text-info font-bold flex items-center justify-center">
                {tab.badge > 999 ? '999+' : tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar neon-scrollbar">
        {activeTab === 'search' && (
          <SearchWorkbench language={language} t={t} />
        )}
        {activeTab === 'recent' && (
          <RecentSessions language={language} t={t} />
        )}
        {activeTab === 'memory' && (
          <MemoryExplorer language={language} t={t} />
        )}
      </div>
    </div>
  );
};

export default Knowledge;
