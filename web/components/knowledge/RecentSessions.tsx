import React, { useState, useEffect, useCallback } from 'react';
import { Language, dispatchOpenWindow } from '../../types';
import { knowledgeApi } from '../../services/api';
import type { RecentSessionItem } from '../../services/api';

interface Props {
  language: Language;
  t: Record<string, any>;
}

function fmtTime(ts: number): string {
  const d = new Date(ts * 1000);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleDateString();
}

function fmtCost(usd?: number): string {
  if (!usd || usd <= 0) return '';
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

const sourceIcons: Record<string, string> = {
  cli: 'terminal',
  telegram: 'send',
  discord: 'forum',
  slack: 'tag',
  api: 'api',
  web: 'language',
};

const RecentSessions: React.FC<Props> = ({ language, t }) => {
  const k = t.know || {};
  const [sessions, setSessions] = useState<RecentSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await knowledgeApi.recentSessions(15);
      setSessions(data.sessions || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleJump = useCallback((sessionId: string) => {
    dispatchOpenWindow({ id: 'sessions', sessionKey: sessionId });
  }, []);

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
        <button onClick={fetchSessions} className="ms-auto text-[10px] underline">{k.retry || 'Retry'}</button>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-muted">
        <span className="material-symbols-outlined text-[40px] mb-3 opacity-30">chat_bubble_outline</span>
        <p className="text-sm font-medium">{k.noSessions || 'No sessions yet'}</p>
        <p className="text-[11px] mt-1 opacity-70">
          {k.noSessionsHint || 'Recent conversations will appear here'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {sessions.map(s => {
        const srcIcon = sourceIcons[s.source] || 'chat';
        const cost = fmtCost(s.estimatedCostUsd);
        return (
          <button
            key={s.id}
            onClick={() => handleJump(s.id)}
            className="w-full text-start sci-card px-3 py-2.5 rounded-xl hover:ring-1 hover:ring-info/30 transition-all cursor-pointer group flex items-start gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center shrink-0 text-info">
              <span className="material-symbols-outlined text-[16px]">{srcIcon}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-semibold text-text truncate">
                  {s.title || `${s.source} session`}
                </span>
                <span className="text-[9px] text-text-muted shrink-0 ms-auto">
                  {fmtTime(s.startedAt)}
                </span>
              </div>
              {s.preview && (
                <p className="text-[11px] text-text-secondary line-clamp-1 leading-relaxed mb-1">
                  {s.preview}
                </p>
              )}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[9px] text-text-muted flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[10px]">forum</span>
                  {s.messageCount}
                </span>
                {s.model && (
                  <span className="text-[9px] text-text-muted flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[10px]">smart_toy</span>
                    {s.model.split('/').pop()}
                  </span>
                )}
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-surface-raised text-text-muted">
                  {s.source}
                </span>
                {cost && (
                  <span className="text-[9px] text-text-muted">{cost}</span>
                )}
              </div>
            </div>
            <span className="material-symbols-outlined text-[14px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1">
              open_in_new
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default React.memo(RecentSessions);
