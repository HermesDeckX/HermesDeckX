import { useState, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// useAutoError — error state with auto-clear timer.
//
// Replaces the manual setError + setTimeout pattern in Scheduler and others.
// ---------------------------------------------------------------------------

export function useAutoError(timeoutMs = 8000): [
  error: string | null,
  setError: (msg: string) => void,
  clearError: () => void,
] {
  const [error, setErrorState] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setError = useCallback((msg: string) => {
    setErrorState(msg);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setErrorState(null), timeoutMs);
  }, [timeoutMs]);

  const clearError = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setErrorState(null);
  }, []);

  return [error, setError, clearError];
}
