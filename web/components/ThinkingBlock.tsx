import React, { useState } from 'react';

interface ThinkingBlockProps {
  content: string;
  labels?: { thinking?: string; expand?: string; collapse?: string };
}

export const ThinkingBlock: React.FC<ThinkingBlockProps> = ({ content, labels }) => {
  const [open, setOpen] = useState(false);

  if (!content) return null;

  return (
    <div className="my-1.5 rounded-xl border border-purple-200/30 dark:border-purple-500/10 bg-gradient-to-r from-purple-50/30 to-transparent dark:from-purple-500/[0.03] dark:to-transparent overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-start"
      >
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-purple-500/15 to-purple-400/5 border border-purple-500/10 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[11px] text-purple-400">
            psychology
          </span>
        </div>
        <span className="text-[10px] font-semibold text-purple-400/70 dark:text-purple-400/50 flex-1">
          {labels?.thinking || 'Thinking'}
        </span>
        <span className="material-symbols-outlined text-[11px] text-slate-300 dark:text-white/15 transition-transform duration-150"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          expand_more
        </span>
      </button>

      {open && (
        <div className="px-3 pb-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <pre className="text-[9px] font-mono text-slate-400 dark:text-white/25 leading-relaxed
                          whitespace-pre-wrap break-words max-h-60 overflow-auto">
            {content}
          </pre>
        </div>
      )}
    </div>
  );
};
