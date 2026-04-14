import { useSyncExternalStore, useCallback } from 'react';
import { doctorApi, dashboardApi } from '../services/api';

// ---------------------------------------------------------------------------
// Runtime summary model
// ---------------------------------------------------------------------------

export interface RuntimeSummary {
  /** True after the first fetch completes */
  loaded: boolean;
  /** Doctor score (0–100) */
  score: number;
  /** Overall status: ok | warn | error */
  status: 'ok' | 'warn' | 'error';
  /** One-line summary from doctor */
  summary: string;
  /** Health check state */
  healthCheck: {
    enabled: boolean;
    failCount: number;
    maxFails: number;
    lastOk: string;
  };
  /** Exception stats from doctor summary */
  exceptionStats: {
    medium5m: number;
    high5m: number;
    critical5m: number;
    total1h: number;
    total24h: number;
  };
  /** Recent issues from doctor */
  recentIssues: Array<{
    id: string;
    source: string;
    category: string;
    risk: string;
    title: string;
    detail?: string;
    timestamp: string;
  }>;
  /** Dashboard monitor summary */
  monitorSummary: {
    totalEvents: number;
    events24h: number;
    riskCounts: Record<string, number>;
  };
  /** Recent alerts from dashboard */
  recentAlerts: any[];
  /** Timestamp of last successful fetch */
  lastFetchAt: number;
}

const INITIAL: RuntimeSummary = {
  loaded: false,
  score: 0,
  status: 'ok',
  summary: '',
  healthCheck: { enabled: false, failCount: 0, maxFails: 0, lastOk: '' },
  exceptionStats: { medium5m: 0, high5m: 0, critical5m: 0, total1h: 0, total24h: 0 },
  recentIssues: [],
  monitorSummary: { totalEvents: 0, events24h: 0, riskCounts: {} },
  recentAlerts: [],
  lastFetchAt: 0,
};

// ---------------------------------------------------------------------------
// Singleton bus (shared across all hook consumers)
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 10000;

class RuntimeSummaryBus {
  private snapshot: RuntimeSummary = { ...INITIAL };
  private listeners = new Set<() => void>();
  private refCount = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  getSnapshot = (): RuntimeSummary => this.snapshot;

  subscribe = (onStoreChange: () => void): (() => void) => {
    this.listeners.add(onStoreChange);
    this.refCount += 1;
    if (this.refCount === 1) this.start();

    return () => {
      this.listeners.delete(onStoreChange);
      this.refCount = Math.max(0, this.refCount - 1);
      if (this.refCount === 0) this.stop();
    };
  };

  refresh = (): void => {
    this.fetch();
  };

  // -- internals --

  private emit() {
    for (const fn of this.listeners) fn();
  }

  private update(patch: Partial<RuntimeSummary>) {
    const next = { ...this.snapshot, ...patch };
    this.snapshot = next;
    this.emit();
  }

  private fetch = () => {
    Promise.allSettled([
      doctorApi.summaryCached(8000),
      dashboardApi.get(),
    ]).then(([doctorRes, dashRes]) => {
      const patch: Partial<RuntimeSummary> = { loaded: true, lastFetchAt: Date.now() };

      if (doctorRes.status === 'fulfilled' && doctorRes.value) {
        const d = doctorRes.value as any;
        patch.score = d.score ?? this.snapshot.score;
        patch.status = d.status ?? this.snapshot.status;
        patch.summary = d.summary ?? this.snapshot.summary;
        patch.healthCheck = d.healthCheck ?? this.snapshot.healthCheck;
        patch.exceptionStats = d.exceptionStats ?? this.snapshot.exceptionStats;
        patch.recentIssues = d.recentIssues ?? this.snapshot.recentIssues;
      }

      if (dashRes.status === 'fulfilled' && dashRes.value) {
        const d = dashRes.value as any;
        if (d.monitor_summary) {
          patch.monitorSummary = {
            totalEvents: d.monitor_summary.total_events ?? 0,
            events24h: d.monitor_summary.events_24h ?? 0,
            riskCounts: d.monitor_summary.risk_counts ?? {},
          };
        }
        patch.recentAlerts = d.recent_alerts ?? this.snapshot.recentAlerts;
      }

      this.update(patch);
    }).catch(() => {
      this.update({ loaded: true, lastFetchAt: Date.now() });
    });
  };

  private onVisibilityChange = () => {
    if (document.hidden) {
      if (this.timer) { clearInterval(this.timer); this.timer = null; }
    } else {
      if (!this.timer && this.refCount > 0) {
        this.fetch();
        this.timer = setInterval(this.fetch, POLL_INTERVAL_MS);
      }
    }
  };

  private start() {
    this.fetch();
    this.timer = setInterval(this.fetch, POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  private stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }
}

const bus = new RuntimeSummaryBus();

// ---------------------------------------------------------------------------
// React hook
// ---------------------------------------------------------------------------

/**
 * useRuntimeSummary — shared runtime health & monitoring data.
 *
 * Uses a singleton polling bus so that all consumers share the same
 * data (no redundant network requests). Polls every 10s, pauses when
 * the tab is hidden.
 */
export function useRuntimeSummary() {
  const summary = useSyncExternalStore(bus.subscribe, bus.getSnapshot, bus.getSnapshot);
  const refresh = useCallback(() => bus.refresh(), []);
  return { ...summary, refresh };
}
