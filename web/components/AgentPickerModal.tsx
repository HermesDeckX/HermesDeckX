import React, { useState, useEffect } from 'react';
import { gwApi } from '../services/api';

interface AgentInfo {
  id: string;
  name?: string;
  emoji?: string;
  isDefault?: boolean;
}

interface AgentPickerModalProps {
  locale: {
    title?: string;
    desc?: string;
    confirm?: string;
    cancel?: string;
    loading?: string;
    noAgents?: string;
  };
  onSelect: (agentId: string) => void;
  onCancel: () => void;
}

const AgentPickerModal: React.FC<AgentPickerModalProps> = ({ locale, onSelect, onCancel }) => {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    gwApi.agents()
      .then((data: any) => {
        const raw = Array.isArray(data) ? data : data?.agents || [];
        const defaultId = data?.defaultId || null;
        const mapped = raw.map((a: any) => ({
          id: a.id || a.agentId || '',
          name: a.name || a.id || a.agentId || '',
          emoji: a.emoji || a.avatar || '',
          isDefault: !!(defaultId && (a.id === defaultId || a.agentId === defaultId)),
        })).filter((a: AgentInfo) => a.id);
        setAgents(mapped);
        // 只有一个代理或有默认代理时，直接跳过选择器
        const def = mapped.find((a: AgentInfo) => a.isDefault);
        if (def) {
          onSelect(def.id);
          return;
        }
        if (mapped.length === 1) {
          onSelect(mapped[0].id);
          return;
        }
        // 多个代理时显示选择器
        if (mapped.length > 1) {
          setSelectedId(mapped[0].id);
        }
      })
      .catch(() => setAgents([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-[#1c1f26] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 w-[380px] max-w-[90vw] overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="px-6 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px] text-blue-500">smart_toy</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">{locale.title || 'Select Agent'}</h3>
              <p className="text-[10px] text-slate-400 dark:text-white/40">{locale.desc || 'Choose an agent to apply files to'}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 pb-4 max-h-[50vh] overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <span className="material-symbols-outlined text-[24px] text-primary animate-spin">progress_activity</span>
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-[36px] text-slate-200 dark:text-white/10">person_off</span>
              <p className="mt-2 text-[11px] text-slate-400 dark:text-white/30">{locale.noAgents || 'No agents found'}</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {agents.map(agent => (
                <button
                  key={agent.id}
                  onClick={() => setSelectedId(agent.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-start transition-all ${
                    selectedId === agent.id
                      ? 'bg-primary/10 border-primary/30 ring-1 ring-primary/20'
                      : 'hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                  } border border-slate-200/60 dark:border-white/[0.06]`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    selectedId === agent.id
                      ? 'bg-primary/20 text-primary'
                      : 'bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-white/50'
                  }`}>
                    {agent.emoji ? (
                      <span className="text-[18px]">{agent.emoji}</span>
                    ) : (
                      <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[12px] font-bold truncate ${
                      selectedId === agent.id
                        ? 'text-primary'
                        : 'text-slate-700 dark:text-white/70'
                    }`}>{agent.name}</p>
                    <div className="flex items-center gap-1.5">
                      <p className="text-[10px] text-slate-400 dark:text-white/30 font-mono truncate">{agent.id}</p>
                      {agent.isDefault && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/10 text-blue-500">default</span>
                      )}
                    </div>
                  </div>
                  {selectedId === agent.id && (
                    <span className="material-symbols-outlined text-[18px] text-primary shrink-0">check_circle</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-5 pt-2 border-t border-slate-100 dark:border-white/[0.04]">
          <button
            onClick={onCancel}
            className="flex-1 h-9 rounded-xl text-[12px] font-bold text-slate-500 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
          >
            {locale.cancel || 'Cancel'}
          </button>
          <button
            onClick={() => selectedId && onSelect(selectedId)}
            disabled={!selectedId || agents.length === 0}
            className="flex-1 h-9 rounded-xl text-[12px] font-bold bg-primary text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {locale.confirm || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentPickerModal;
