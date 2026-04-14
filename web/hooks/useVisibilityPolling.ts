import { useEffect, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// useVisibilityPolling — visibility-aware polling hook.
//
// Runs `callback` immediately, then every `intervalMs`.
// Pauses the interval when the tab is hidden and resumes (with an immediate
// call) when the tab becomes visible again.
//
// Replaces 6+ duplicate visibilitychange + setInterval patterns across pages.
// ---------------------------------------------------------------------------

export function useVisibilityPolling(
  callback: () => void,
  intervalMs: number,
  enabled = true,
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const tick = useCallback(() => callbackRef.current(), []);

  useEffect(() => {
    if (!enabled) return;

    tick();
    let timer: ReturnType<typeof setInterval> | null = setInterval(tick, intervalMs);

    const onVisibility = () => {
      if (document.hidden) {
        if (timer) { clearInterval(timer); timer = null; }
      } else {
        if (!timer) {
          timer = setInterval(tick, intervalMs);
          tick();
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs, enabled, tick]);
}
