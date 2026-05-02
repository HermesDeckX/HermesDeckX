import React from 'react';
import CustomSelect from './CustomSelect';

export interface ReleaseItem {
  tagName: string;
  prerelease: boolean;
  hasAsset: boolean;
  isCurrent?: boolean;
  isOlder?: boolean;
}

export interface VersionPickerLabels {
  title: string;
  latest: string;
  current: string;
  older: string;
  beta: string;
  noAsset: string;
  refresh: string;
}

export interface VersionPickerProps {
  value: string;
  onChange: (tag: string) => void;
  releases: ReleaseItem[];
  labels: VersionPickerLabels;
  loading?: boolean;
  onRefresh?: () => void;
  inline?: boolean;
}

const VersionPicker: React.FC<VersionPickerProps> = ({
  value,
  onChange,
  releases,
  labels,
  loading = false,
  onRefresh,
  inline = false,
}) => {
  if (releases.length === 0) return null;

  const options = [
    { value: '', label: labels.latest },
    ...releases.map(r => {
      const plain = r.tagName.replace(/^v/, '');
      const tags: string[] = [];
      if (r.isCurrent) tags.push(labels.current);
      else if (r.isOlder) tags.push(labels.older);
      if (r.prerelease) tags.push(labels.beta);
      if (!r.hasAsset) tags.push(labels.noAsset);
      const suffix = tags.length > 0 ? `  (${tags.join(' · ')})` : '';
      return { value: plain, label: `v${plain}${suffix}` };
    }),
  ];

  const rootCls = inline
    ? 'inline-flex items-center gap-2 min-w-0'
    : 'mb-3 flex items-center gap-2';
  const selectCls = inline
    ? 'h-9 px-3 min-w-[140px] max-w-[240px] bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-[12px] text-slate-700 dark:text-white/80 outline-none'
    : 'flex-1 min-w-0 h-9 px-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-[12px] text-slate-700 dark:text-white/80 outline-none';

  return (
    <div className={rootCls}>
      <span className="text-[12px] font-medium text-slate-500 dark:text-white/40 shrink-0">
        {labels.title}
      </span>
      <CustomSelect
        value={value}
        onChange={onChange}
        options={options}
        className={selectCls}
      />
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          title={labels.refresh}
          className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/40 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-40"
        >
          <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
        </button>
      )}
    </div>
  );
};

export default VersionPicker;
