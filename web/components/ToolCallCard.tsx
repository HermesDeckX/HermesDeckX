import React, { useState } from 'react';

interface ToolCallCardProps {
  name: string;
  input: unknown;
  result?: string;
  isError?: boolean;
  labels?: { toolCall?: string; toolResult?: string; expand?: string; collapse?: string };
}

export const ToolCallCard: React.FC<ToolCallCardProps> = ({ name, input, result, isError, labels }) => {
  const [open, setOpen] = useState(false);

  const inputStr = typeof input === 'string' ? input : JSON.stringify(input, null, 2);

  return (
    <div className={`my-1.5 rounded-xl border transition-all overflow-hidden ${
      isError
        ? 'border-red-200/60 dark:border-red-500/15 bg-red-50/30 dark:bg-red-500/[0.03]'
        : 'border-slate-200/60 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.04]'
    }`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-start"
      >
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
          isError ? 'bg-gradient-to-br from-red-500/15 to-red-400/5 border border-red-500/15' : 'bg-gradient-to-br from-purple-500/15 to-purple-400/5 border border-purple-500/15'
        }`}>
          <span className={`material-symbols-outlined text-[12px] ${
            isError ? 'text-red-400' : 'text-purple-400'
          }`}>
            {isError ? 'error' : 'build'}
          </span>
        </div>
        <span className="text-[10px] font-mono font-semibold text-slate-600 dark:text-white/50 truncate flex-1">
          {name}
        </span>
        <span className="material-symbols-outlined text-[12px] text-slate-400 dark:text-white/25 transition-transform duration-150"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          expand_more
        </span>
      </button>

      {open && (
        <div className="px-3 pb-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Input */}
          <div>
            <div className="text-[8px] font-bold uppercase text-slate-400 dark:text-white/25 mb-0.5">
              {labels?.toolCall || 'Input'}
            </div>
            <pre className="text-[9px] font-mono text-slate-500 dark:text-white/40 bg-slate-100/50 dark:bg-black/10
                            rounded-lg p-2 overflow-auto max-h-40 whitespace-pre-wrap break-all select-text cursor-text">
              {inputStr}
            </pre>
          </div>

          {/* Result */}
          {result != null && (
            <div>
              <div className="text-[8px] font-bold uppercase text-slate-400 dark:text-white/25 mb-0.5">
                {labels?.toolResult || 'Result'}
              </div>
              {!isError && (!result.trim() || result.trim() === '(no output)') ? (
                <div className="flex items-center gap-1 py-1 px-2 text-[9px] text-emerald-500/70 dark:text-emerald-400/50">
                  <span className="material-symbols-outlined text-[11px]">check_circle</span>
                  <span className="font-medium">OK</span>
                </div>
              ) : (
                <pre className={`text-[9px] font-mono rounded-lg p-2 overflow-auto max-h-40 whitespace-pre-wrap break-all select-text cursor-text ${
                  isError
                    ? 'text-red-500 dark:text-red-400/70 bg-red-50/50 dark:bg-red-500/[0.05]'
                    : 'text-slate-500 dark:text-white/40 bg-slate-100/50 dark:bg-black/10'
                }`}>
                  {result}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
