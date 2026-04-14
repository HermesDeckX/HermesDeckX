import { useCallback, useState } from 'react';

export interface HermesAgentUpdateEvent {
  type: 'phase' | 'step' | 'progress' | 'log' | 'success' | 'error' | 'complete';
  phase?: string;
  step?: string;
  message: string;
  progress?: number;
  data?: any;
}

interface RunOptions {
  mapStepMessage?: (event: HermesAgentUpdateEvent) => string;
  maxLogLines?: number;
}

export function useHermesAgentUpdate() {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [step, setStep] = useState('');
  const [progress, setProgress] = useState(0);

  const reset = useCallback(() => {
    setLogs([]);
    setStep('');
    setProgress(0);
  }, []);

  const run = useCallback(async (options?: RunOptions) => {
    setRunning(true);
    reset();

    try {
      const resp = await fetch('/api/v1/setup/update-hermesagent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const reader = resp.body?.getReader();
      if (!reader) {
        throw new Error('stream reader unavailable');
      }

      const decoder = new TextDecoder();
      let buf = '';
      let streamError = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += decoder.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop() || '';

        for (const part of parts) {
          if (!part.startsWith('data: ')) continue;

          try {
            const ev: HermesAgentUpdateEvent = JSON.parse(part.slice(6));

            if (ev.type === 'log') {
              const maxLogLines = options?.maxLogLines ?? 50;
              setLogs(prev => [...prev.slice(-(maxLogLines - 1)), ev.message]);
            } else if (ev.type === 'phase' || ev.type === 'step') {
              const text = options?.mapStepMessage ? options.mapStepMessage(ev) : ev.message;
              setStep(text);
              setProgress(ev.progress || 0);
            } else if (ev.type === 'progress') {
              setProgress(ev.progress || 0);
            } else if (ev.type === 'error') {
              streamError = ev.message || 'update stream reported error';
            } else if (ev.type === 'complete') {
              setProgress(100);
              setStep(ev.message);
            }
          } catch {
            // ignore parse errors
          }
        }
      }

      if (streamError) {
        throw new Error(streamError);
      }
    } finally {
      setRunning(false);
    }
  }, [reset]);

  return {
    running,
    logs,
    step,
    progress,
    reset,
    run,
  };
}
