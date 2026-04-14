import React, { useState, useEffect, useCallback } from 'react';
import { Language } from '../../types';
import { knowledgeApi } from '../../services/api';
import type { MemoryFileItem } from '../../services/api';

interface Props {
  language: Language;
  t: Record<string, any>;
}

const MemoryExplorer: React.FC<Props> = ({ language, t }) => {
  const k = t.know || {};
  const [files, setFiles] = useState<MemoryFileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedFile, setExpandedFile] = useState<string | null>(null);

  const fetchMemory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await knowledgeApi.memoryFiles();
      setFiles(data.files || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load memory files');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMemory();
  }, [fetchMemory]);

  const toggleExpand = useCallback((name: string) => {
    setExpandedFile(prev => prev === name ? null : name);
  }, []);

  const kindConfig: Record<string, { icon: string; color: string; label: string }> = {
    memory: { icon: 'psychology', color: 'text-success bg-success/10', label: k.memoryLabel || 'Memory' },
    user_profile: { icon: 'person', color: 'text-warning bg-warning/10', label: k.profileLabel || 'User Profile' },
    agent_memory: { icon: 'smart_toy', color: 'text-info bg-info/10', label: k.agentMemoryLabel || 'Agent Memory' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="material-symbols-outlined text-[20px] text-info animate-spin">progress_activity</span>
        <span className="text-xs text-text-muted ms-2">{k.loading || 'Loading...'}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-xs text-danger bg-danger/10 rounded-lg p-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-[14px]">error</span>
        {error}
        <button onClick={fetchMemory} className="ms-auto text-[10px] underline">{k.retry || 'Retry'}</button>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-muted">
        <span className="material-symbols-outlined text-[40px] mb-3 opacity-30">folder_off</span>
        <p className="text-sm font-medium">{k.noMemory || 'No memory files found'}</p>
        <p className="text-[11px] mt-1 opacity-70">
          {k.noMemoryHint || 'Memory and profile files will appear here once created by hermes-agent'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {files.map(file => {
        const cfg = kindConfig[file.kind] || kindConfig.memory;
        const isExpanded = expandedFile === file.name;
        const lines = file.content.split('\n').length;
        const sizeStr = file.size < 1024 ? `${file.size} B` : `${(file.size / 1024).toFixed(1)} KB`;

        return (
          <div key={file.name} className="sci-card rounded-xl overflow-hidden">
            <button
              onClick={() => toggleExpand(file.name)}
              className="w-full text-start px-3 py-2.5 flex items-center gap-3 hover:bg-surface-sunken/50 transition-colors"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.color}`}>
                <span className="material-symbols-outlined text-[16px]">{cfg.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-text truncate">{file.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[10px] text-text-muted">{sizeStr}</span>
                  <span className="text-[10px] text-text-muted">{lines} {k.lines || 'lines'}</span>
                  {file.modTime && (
                    <span className="text-[10px] text-text-muted">
                      {new Date(file.modTime).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <span className={`material-symbols-outlined text-[14px] text-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>
            {isExpanded && (
              <div className="border-t border-surface-sunken">
                <pre className="text-[11px] text-text-secondary leading-relaxed p-3 max-h-[300px] overflow-y-auto custom-scrollbar neon-scrollbar whitespace-pre-wrap break-words font-mono">
                  {file.content || (k.empty || '(empty)')}
                </pre>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default React.memo(MemoryExplorer);
