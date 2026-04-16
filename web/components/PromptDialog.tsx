import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { getTranslation } from '../locales';
import { Language } from '../types';

interface PromptOptions {
  title: string;
  message?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
}

interface PromptContextValue {
  prompt: (options: PromptOptions) => Promise<string | null>;
}

const PromptContext = createContext<PromptContextValue>({ prompt: () => Promise.resolve(null) });

export const usePromptDialog = () => useContext(PromptContext);

export const PromptProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState<boolean>(false);
  const [options, setOptions] = useState<PromptOptions>({ title: '' });
  const [value, setValue] = useState('');
  const resolveRef = useRef<((value: string | null) => void) | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  const prompt = useCallback((opts: PromptOptions): Promise<string | null> => {
    setOptions(opts);
    setValue(opts.defaultValue || '');
    setOpen(true);
    return new Promise<string | null>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [open]);

  const handleConfirm = useCallback(() => {
    setOpen(false);
    resolveRef.current?.(value);
  }, [value]);

  const handleCancel = useCallback(() => {
    setOpen(false);
    resolveRef.current?.(null);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConfirm();
    else if (e.key === 'Escape') handleCancel();
  }, [handleConfirm, handleCancel]);

  const lang = (localStorage.getItem('lang') as Language) || 'zh';
  const t = getTranslation(lang) as any;

  return (
    <PromptContext.Provider value={{ prompt }}>
      {children}
      {open && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleCancel} />
          <div className="relative mac-glass rounded-2xl shadow-2xl overflow-hidden animate-scale-in w-[360px] backdrop-blur-3xl">
            <div className="px-6 pt-6 pb-4">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px] text-primary">edit</span>
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white mb-2 text-center">{options.title}</h3>
              {options.message && (
                <p className="text-[13px] text-slate-600 dark:text-white/70 leading-relaxed text-center mb-3">
                  {options.message}
                </p>
              )}
              <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={options.placeholder}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200/30 dark:border-white/15 bg-white/10 dark:bg-white/5 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
            </div>
            <div className="flex border-t border-slate-200/20 dark:border-white/10">
              <button
                onClick={handleCancel}
                className="flex-1 py-3.5 text-[13px] font-medium text-slate-600 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/10 transition-colors border-e border-slate-200/20 dark:border-white/10"
              >
                {options.cancelText || t.cancel}
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-3.5 text-[13px] font-bold text-primary hover:bg-primary/10 transition-colors"
              >
                {options.confirmText || t.ok}
              </button>
            </div>
          </div>
        </div>
      )}
    </PromptContext.Provider>
  );
};
