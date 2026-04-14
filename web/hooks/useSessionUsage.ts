import { useState, useEffect, useCallback } from 'react';

interface UsageData {
  input: number;
  output: number;
  cacheRead?: number;
  totalCost: number;
  inputCost: number;
  outputCost: number;
  messageCounts?: {
    user: number;
    assistant: number;
    toolCalls: number;
    errors: number;
  };
  latency?: {
    count: number;
    sum: number;
    p95Max: number;
  };
  dailyBreakdown?: { date: string; tokens: number }[];
  modelUsage?: { model: string; count: number }[];
}

interface UseSessionUsageReturn {
  usage: UsageData | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useSessionUsage(
  sessionKey: string,
  gwReady: boolean,
  loadFn: (key: string) => Promise<any>,
): UseSessionUsageReturn {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!gwReady || !sessionKey) return;
    setLoading(true);
    setError(null);
    try {
      const data = await loadFn(sessionKey);
      setUsage(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load usage');
    }
    setLoading(false);
  }, [gwReady, sessionKey, loadFn]);

  useEffect(() => { reload(); }, [reload]);

  return { usage, loading, error, reload };
}
