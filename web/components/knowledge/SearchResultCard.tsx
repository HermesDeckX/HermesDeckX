import React, { useCallback } from 'react';
import { dispatchOpenWindow, WindowID } from '../../types';
import type { KnowledgeSearchResult } from '../../services/api';

interface Props {
  result: KnowledgeSearchResult;
  t: Record<string, any>;
}

const kindIcons: Record<string, string> = {
  session_message: 'forum',
  memory_entry: 'psychology',
  user_profile_entry: 'person',
};

const kindColors: Record<string, string> = {
  session_message: 'text-info bg-info/10',
  memory_entry: 'text-success bg-success/10',
  user_profile_entry: 'text-warning bg-warning/10',
};

function fmtTime(ts?: number): string {
  if (!ts) return '';
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

const SearchResultCard: React.FC<Props> = ({ result, t }) => {
  const handleJump = useCallback(() => {
    if (!result.jumpTarget) return;
    const jt = result.jumpTarget;
    dispatchOpenWindow({
      id: jt.window as WindowID,
      sessionKey: jt.sessionKey,
      agentId: jt.agentId,
      panel: jt.panel,
      section: jt.section,
    });
  }, [result.jumpTarget]);

  const kindLabel = t.kind?.[result.kind] || result.kind;
  const icon = kindIcons[result.kind] || 'search';
  const colorCls = kindColors[result.kind] || 'text-text-secondary bg-surface-raised';

  return (
    <button
      onClick={handleJump}
      className="w-full text-start sci-card p-3 rounded-xl hover:ring-1 hover:ring-info/30 transition-all cursor-pointer group"
    >
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorCls}`}>
          <span className="material-symbols-outlined text-[16px]">{icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-text truncate">{result.title}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium shrink-0 ${colorCls}`}>
              {kindLabel}
            </span>
            {result.timestamp ? (
              <span className="text-[9px] text-text-muted shrink-0 ms-auto">
                {fmtTime(result.timestamp)}
              </span>
            ) : null}
          </div>
          <p className="text-[11px] text-text-secondary line-clamp-2 leading-relaxed">
            {result.snippet}
          </p>
          {result.source && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="material-symbols-outlined text-[10px] text-text-muted">source</span>
              <span className="text-[9px] text-text-muted">{result.source}</span>
            </div>
          )}
        </div>
        <span className="material-symbols-outlined text-[14px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1">
          open_in_new
        </span>
      </div>
    </button>
  );
};

export default React.memo(SearchResultCard);
