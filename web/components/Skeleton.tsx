import React from 'react';

// ---------------------------------------------------------------------------
// Shared Skeleton primitives for loading placeholders.
//
// Replaces 18+ scattered inline animate-pulse div patterns.
// ---------------------------------------------------------------------------

interface SkeletonProps {
  className?: string;
}

/** SkeletonLine — a single animated line placeholder. */
export const SkeletonLine: React.FC<SkeletonProps> = ({ className = 'h-3 w-24' }) => (
  <div className={`animate-pulse rounded bg-slate-200 dark:bg-white/10 ${className}`} />
);

/** SkeletonBlock — a rectangular block placeholder. */
export const SkeletonBlock: React.FC<SkeletonProps> = ({ className = 'h-16 w-full' }) => (
  <div className={`animate-pulse rounded-xl bg-slate-200 dark:bg-white/10 ${className}`} />
);

/** SkeletonCard — a card-shaped placeholder with rounded corners and padding. */
export const SkeletonCard: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div className={`animate-pulse rounded-xl bg-slate-100 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 p-4 space-y-3 ${className}`}>
    <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-white/10" />
    <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-white/10" />
    <div className="h-3 w-5/6 rounded bg-slate-200 dark:bg-white/10" />
  </div>
);

/** SkeletonList — repeated line items for list loading states. */
export const SkeletonList: React.FC<{ count?: number; className?: string }> = ({ count = 4, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-xl bg-slate-100 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
        <div className="h-8 w-8 rounded-lg bg-slate-200 dark:bg-white/10 shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-1/3 rounded bg-slate-200 dark:bg-white/10" />
          <div className="h-2.5 w-2/3 rounded bg-slate-200 dark:bg-white/10" />
        </div>
      </div>
    ))}
  </div>
);

/** SkeletonGrid — card grid placeholder for dashboard-style layouts. */
export const SkeletonGrid: React.FC<{ count?: number; className?: string }> = ({ count = 4, className = '' }) => (
  <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 ${className}`}>
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="animate-pulse rounded-xl bg-slate-100 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 p-3 space-y-2">
        <div className="h-2.5 w-1/2 rounded bg-slate-200 dark:bg-white/10" />
        <div className="h-5 w-2/3 rounded bg-slate-200 dark:bg-white/10" />
      </div>
    ))}
  </div>
);
