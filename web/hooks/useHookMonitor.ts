import { useEffect, useRef } from 'react';

const IS_DEV = import.meta.env.DEV;
const ENABLED_KEY = 'clawdeck.hookMonitor';

function isEnabled(): boolean {
  if (!IS_DEV) return false;
  try { return localStorage.getItem(ENABLED_KEY) === '1'; } catch { return false; }
}

/**
 * useHookMonitor — dev-only hook state logger.
 *
 * Enable in browser console:  localStorage.setItem('clawdeck.hookMonitor', '1')
 * Disable:                    localStorage.removeItem('clawdeck.hookMonitor')
 *
 * Usage:
 *   useHookMonitor('Dashboard', { gwStatus, sessions, health });
 *
 * Logs state diffs to console with timing info when enabled.
 */
export function useHookMonitor(label: string, state: Record<string, unknown>) {
  const prevRef = useRef<Record<string, unknown>>({});
  const mountRef = useRef(Date.now());

  useEffect(() => {
    if (!isEnabled()) return;

    const prev = prevRef.current;
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    let hasChange = false;

    for (const key of Object.keys(state)) {
      if (prev[key] !== state[key]) {
        changes[key] = { from: prev[key], to: state[key] };
        hasChange = true;
      }
    }

    if (hasChange) {
      const elapsed = ((Date.now() - mountRef.current) / 1000).toFixed(1);
      console.groupCollapsed(
        `%c[HookMonitor] %c${label} %c+${elapsed}s`,
        'color: #8b5cf6; font-weight: bold',
        'color: #06b6d4; font-weight: bold',
        'color: #94a3b8; font-weight: normal',
      );
      for (const [k, v] of Object.entries(changes)) {
        console.log(`  ${k}:`, v.from, '→', v.to);
      }
      console.groupEnd();
    }

    prevRef.current = { ...state };
  });
}

/**
 * useRenderCount — dev-only render counter.
 * Logs a warning when a component re-renders more than `threshold` times.
 */
export function useRenderCount(label: string, threshold = 50) {
  const countRef = useRef(0);

  useEffect(() => {
    if (!isEnabled()) return;
    countRef.current++;
    if (countRef.current === threshold) {
      console.warn(
        `%c[HookMonitor] %c${label} rendered ${threshold}+ times — possible performance issue`,
        'color: #f59e0b; font-weight: bold',
        'color: #ef4444; font-weight: bold',
      );
    }
  });
}

/**
 * useEffectTiming — dev-only effect duration tracker.
 * Wraps an async effect and logs its execution time.
 */
export function useEffectTiming(label: string, effect: () => Promise<void> | void, deps: unknown[]) {
  useEffect(() => {
    if (!isEnabled()) {
      effect();
      return;
    }
    const start = performance.now();
    const result = effect();
    if (result instanceof Promise) {
      result.then(() => {
        const ms = (performance.now() - start).toFixed(1);
        console.log(
          `%c[HookMonitor] %c${label} %c${ms}ms`,
          'color: #8b5cf6; font-weight: bold',
          'color: #06b6d4',
          'color: #22c55e; font-weight: bold',
        );
      }).catch(() => {});
    } else {
      const ms = (performance.now() - start).toFixed(1);
      if (parseFloat(ms) > 16) {
        console.log(
          `%c[HookMonitor] %c${label} %c${ms}ms (slow)`,
          'color: #8b5cf6; font-weight: bold',
          'color: #06b6d4',
          'color: #f59e0b; font-weight: bold',
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
