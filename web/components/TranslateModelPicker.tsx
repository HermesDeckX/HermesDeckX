import React, { useState, useEffect, useCallback } from 'react';
import { settingsApi, gwApi } from '../services/api';
import CustomSelect from './CustomSelect';

interface TranslateModelPickerProps {
  sk: Record<string, string>;
  className?: string;
  compact?: boolean;
}

const TranslateModelPicker: React.FC<TranslateModelPickerProps> = ({ sk, className = '', compact = false }) => {
  const [value, setValue] = useState('');
  const [models, setModels] = useState<{ value: string; label: string }[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load current setting + configured models from config center
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [settings, gwCfg] = await Promise.all([
          settingsApi.getAll(),
          gwApi.configGet().catch(() => null),
        ]);
        if (cancelled) return;

        const current = (settings as any)?.translate_model || '';
        setValue(current);

        // Build model options from config center providers
        const opts: { value: string; label: string }[] = [
          { value: '', label: sk.translateModelAuto || 'Auto (cheapest available)' },
        ];

        // Extract providers from gateway config (same structure as ModelsSection)
        const cfg = gwCfg as any;
        const providers = cfg?.models?.providers || cfg?.parsed?.models?.providers || cfg?.config?.models?.providers || {};
        const seen = new Set<string>();

        for (const [pName, pCfg] of Object.entries(providers) as [string, any][]) {
          const pModels = Array.isArray(pCfg?.models) ? pCfg.models : [];
          for (const m of pModels) {
            const id = typeof m === 'string' ? m : m?.id;
            if (!id) continue;
            const path = `${pName}/${id}`;
            if (seen.has(path)) continue;
            seen.add(path);
            const name = typeof m === 'object' && m?.name ? m.name : id;
            opts.push({ value: path, label: `${pName} / ${name}` });
          }
        }

        setModels(opts);
        setLoaded(true);
      } catch {
        setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [sk.translateModelAuto]);

  const handleChange = useCallback(async (v: string) => {
    setValue(v);
    try {
      await settingsApi.update({ translate_model: v });
    } catch {
      // silently fail
    }
  }, []);

  if (!loaded || models.length <= 1) return null;

  if (compact) {
    return (
      <CustomSelect
        value={value}
        onChange={handleChange}
        options={models}
        className={`h-9 px-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-[10px] font-bold text-slate-600 dark:text-white/60 outline-none shrink-0 min-w-[160px] ${className}`}
        placeholder={sk.translateModel || 'Translation Model'}
      />
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-[12px] font-medium text-slate-500 dark:text-white/40 shrink-0">
        {sk.translateModel || 'Translation Model'}
      </span>
      <CustomSelect
        value={value}
        onChange={handleChange}
        options={models}
        className="h-9 px-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-[12px] text-slate-700 dark:text-white/80 outline-none min-w-[260px]"
      />
    </div>
  );
};

export default TranslateModelPicker;
