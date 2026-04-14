import React from 'react';

interface NumberStepperProps {
  value: string | number;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  buttonClassName?: string;
  increaseAriaLabel?: string;
  decreaseAriaLabel?: string;
}

const getDefaultAriaLabel = (type: 'increase' | 'decrease') => {
  return type === 'increase' ? 'Increase value' : 'Decrease value';
};

const getPrecision = (step?: number) => {
  if (!step || Number.isInteger(step)) return 0;
  const s = String(step);
  const idx = s.indexOf('.');
  return idx >= 0 ? s.length - idx - 1 : 0;
};

const clamp = (value: number, min?: number, max?: number) => {
  if (typeof min === 'number' && value < min) return min;
  if (typeof max === 'number' && value > max) return max;
  return value;
};

const NumberStepper: React.FC<NumberStepperProps> = ({
  value,
  onChange,
  min,
  max,
  step = 1,
  placeholder,
  disabled,
  className,
  inputClassName,
  buttonClassName,
  increaseAriaLabel,
  decreaseAriaLabel,
}) => {
  const decLabel = decreaseAriaLabel || getDefaultAriaLabel('decrease');
  const incLabel = increaseAriaLabel || getDefaultAriaLabel('increase');
  const adjust = (delta: number) => {
    const raw = String(value ?? '').trim();
    const base = raw === '' || Number.isNaN(Number(raw)) ? (typeof min === 'number' ? min : 0) : Number(raw);
    const next = clamp(base + delta, min, max);
    const precision = getPrecision(step);
    const normalized = precision > 0 ? next.toFixed(precision) : String(Math.round(next));
    onChange(normalized);
  };

  return (
    <div
      className={`flex items-stretch rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 overflow-hidden focus-within:ring-1 focus-within:ring-primary/30 transition-colors ${disabled ? 'opacity-60' : ''} ${className || ''}`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => adjust(-step)}
        className={`w-7 shrink-0 border-e border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/60 font-semibold hover:bg-slate-100 dark:hover:bg-white/10 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors ${buttonClassName || ''}`}
        aria-label={decLabel}
      >
        −
      </button>
      <input
        type="text"
        inputMode={step < 1 ? 'decimal' : 'numeric'}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`flex-1 min-w-0 bg-transparent px-2 text-center outline-none text-[12px] md:text-xs font-mono text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 ${inputClassName || ''}`}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => adjust(step)}
        className={`w-7 shrink-0 border-s border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/60 font-semibold hover:bg-slate-100 dark:hover:bg-white/10 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors ${buttonClassName || ''}`}
        aria-label={incLabel}
      >
        +
      </button>
    </div>
  );
};

export default NumberStepper;
