import React, { useState, useMemo, useCallback } from 'react';
import CustomSelect from './CustomSelect';

interface CronBuilderProps {
  value: string;
  onChange: (expr: string) => void;
  labels: Record<string, string>;
  error?: string;
  preview?: string;
}

interface CronPreset {
  label: string;
  expr: string;
}

const MINUTE_OPTIONS = [
  { value: '*', label: '*' },
  { value: '0', label: '0' },
  { value: '5', label: '5' },
  { value: '10', label: '10' },
  { value: '15', label: '15' },
  { value: '20', label: '20' },
  { value: '30', label: '30' },
  { value: '45', label: '45' },
  { value: '*/5', label: '*/5' },
  { value: '*/10', label: '*/10' },
  { value: '*/15', label: '*/15' },
  { value: '*/30', label: '*/30' },
];

const HOUR_OPTIONS = [
  { value: '*', label: '*' },
  ...Array.from({ length: 24 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, '0') })),
  { value: '*/2', label: '*/2' },
  { value: '*/4', label: '*/4' },
  { value: '*/6', label: '*/6' },
  { value: '*/12', label: '*/12' },
];

const DOM_OPTIONS = [
  { value: '*', label: '*' },
  ...Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })),
];

const MONTH_OPTIONS = [
  { value: '*', label: '*' },
  ...Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })),
];

const DOW_OPTIONS = [
  { value: '*', label: '*' },
  { value: '0', label: 'Sun' },
  { value: '1', label: 'Mon' },
  { value: '2', label: 'Tue' },
  { value: '3', label: 'Wed' },
  { value: '4', label: 'Thu' },
  { value: '5', label: 'Fri' },
  { value: '6', label: 'Sat' },
  { value: '1-5', label: 'Mon-Fri' },
  { value: '0,6', label: 'Sat-Sun' },
];

function parseCron(expr: string): [string, string, string, string, string] {
  const parts = expr.trim().split(/\s+/);
  return [
    parts[0] || '*',
    parts[1] || '*',
    parts[2] || '*',
    parts[3] || '*',
    parts[4] || '*',
  ];
}

const CronBuilder: React.FC<CronBuilderProps> = ({ value, onChange, labels, error, preview }) => {
  const [mode, setMode] = useState<'preset' | 'builder' | 'manual'>('preset');
  const [manualValue, setManualValue] = useState(value);

  const presets: CronPreset[] = useMemo(() => [
    { label: labels.cronPresetEveryMin || 'Every minute', expr: '* * * * *' },
    { label: labels.cronPresetEvery5Min || 'Every 5 min', expr: '*/5 * * * *' },
    { label: labels.cronPresetEvery15Min || 'Every 15 min', expr: '*/15 * * * *' },
    { label: labels.cronPresetEvery30Min || 'Every 30 min', expr: '*/30 * * * *' },
    { label: labels.cronPresetEveryHour || 'Every hour', expr: '0 * * * *' },
    { label: labels.cronPresetDaily7am || 'Daily 7:00', expr: '0 7 * * *' },
    { label: labels.cronPresetDaily9am || 'Daily 9:00', expr: '0 9 * * *' },
    { label: labels.cronPresetWeekday9am || 'Weekday 9:00', expr: '0 9 * * 1-5' },
    { label: labels.cronPresetWeekend10am || 'Weekend 10:00', expr: '0 10 * * 0,6' },
    { label: labels.cronPresetMonthly1st || 'Monthly 1st 9:00', expr: '0 9 1 * *' },
  ], [labels]);

  const [min, hour, dom, mon, dow] = useMemo(() => parseCron(value), [value]);

  const handleFieldChange = useCallback((field: number, val: string) => {
    const parts = parseCron(value);
    parts[field] = val;
    const newExpr = parts.join(' ');
    onChange(newExpr);
  }, [value, onChange]);

  const handlePresetClick = useCallback((expr: string) => {
    onChange(expr);
    setManualValue(expr);
  }, [onChange]);

  const handleManualApply = useCallback(() => {
    if (manualValue.trim()) onChange(manualValue.trim());
  }, [manualValue, onChange]);

  return (
    <div className="space-y-2">
      {/* Mode tabs */}
      <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] w-fit">
        {(['preset', 'builder', 'manual'] as const).map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); setManualValue(value); }}
            className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
              mode === m
                ? 'bg-white dark:bg-white/10 text-primary shadow-sm'
                : 'text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/60'
            }`}
          >
            {m === 'preset' ? (labels.cronPreset || 'Preset')
              : m === 'builder' ? (labels.cronBuilder || 'Builder')
              : (labels.cronManual || 'Manual')}
          </button>
        ))}
      </div>

      {/* Preset mode */}
      {mode === 'preset' && (
        <div className="grid grid-cols-2 gap-1.5">
          {presets.map(p => (
            <button
              key={p.expr}
              onClick={() => handlePresetClick(p.expr)}
              className={`text-start px-2.5 py-1.5 rounded-lg border text-[10px] font-medium transition-all ${
                value === p.expr
                  ? 'border-primary/30 bg-primary/5 text-primary'
                  : 'border-slate-200/50 dark:border-white/[0.06] text-slate-600 dark:text-white/50 hover:border-primary/20 hover:bg-primary/[0.02]'
              }`}
            >
              <span className="block font-bold">{p.label}</span>
              <span className="text-[9px] font-mono text-slate-400 dark:text-white/25">{p.expr}</span>
            </button>
          ))}
        </div>
      )}

      {/* Builder mode */}
      {mode === 'builder' && (
        <div className="grid grid-cols-5 gap-2">
          <div>
            <label className="block text-[9px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-wider mb-1">
              {labels.cronMinuteField || 'Min'}
            </label>
            <CustomSelect
              value={MINUTE_OPTIONS.find(o => o.value === min) ? min : min}
              onChange={v => handleFieldChange(0, v)}
              options={MINUTE_OPTIONS}
              className="text-[10px]"
            />
          </div>
          <div>
            <label className="block text-[9px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-wider mb-1">
              {labels.cronHourField || 'Hour'}
            </label>
            <CustomSelect
              value={HOUR_OPTIONS.find(o => o.value === hour) ? hour : hour}
              onChange={v => handleFieldChange(1, v)}
              options={HOUR_OPTIONS}
              className="text-[10px]"
            />
          </div>
          <div>
            <label className="block text-[9px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-wider mb-1">
              {labels.cronDomField || 'Day'}
            </label>
            <CustomSelect
              value={DOM_OPTIONS.find(o => o.value === dom) ? dom : dom}
              onChange={v => handleFieldChange(2, v)}
              options={DOM_OPTIONS}
              className="text-[10px]"
            />
          </div>
          <div>
            <label className="block text-[9px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-wider mb-1">
              {labels.cronMonthField || 'Month'}
            </label>
            <CustomSelect
              value={MONTH_OPTIONS.find(o => o.value === mon) ? mon : mon}
              onChange={v => handleFieldChange(3, v)}
              options={MONTH_OPTIONS}
              className="text-[10px]"
            />
          </div>
          <div>
            <label className="block text-[9px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-wider mb-1">
              {labels.cronDowField || 'Weekday'}
            </label>
            <CustomSelect
              value={DOW_OPTIONS.find(o => o.value === dow) ? dow : dow}
              onChange={v => handleFieldChange(4, v)}
              options={DOW_OPTIONS}
              className="text-[10px]"
            />
          </div>
        </div>
      )}

      {/* Manual mode */}
      {mode === 'manual' && (
        <div className="flex items-center gap-2">
          <input
            value={manualValue}
            onChange={e => setManualValue(e.target.value)}
            onBlur={handleManualApply}
            onKeyDown={e => { if (e.key === 'Enter') handleManualApply(); }}
            placeholder="* * * * *"
            className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] text-[11px] font-mono text-slate-800 dark:text-white/80 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40"
          />
        </div>
      )}

      {/* Current expression display & preview */}
      <div className="flex items-center justify-between px-1">
        <code className="text-[10px] font-mono text-slate-500 dark:text-white/35">{value}</code>
        {preview && !error && (
          <span className="text-[9px] text-primary/70">{labels.cronPreview || 'Preview'}: {preview}</span>
        )}
      </div>
      {error && <p className="text-[10px] text-red-500 mt-0.5">{error}</p>}
    </div>
  );
};

export default CronBuilder;
