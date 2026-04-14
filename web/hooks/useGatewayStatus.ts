import { useSyncExternalStore, useCallback } from 'react';
import { gwApi, gatewayApi } from '../services/api';

// ---------------------------------------------------------------------------
// Gateway status model
// ---------------------------------------------------------------------------

export interface GatewayStatus {
  /** GW JSON-RPC WebSocket is connected (gwApi.status → connected) */
  connected: boolean;
  /** Gateway process is running (gatewayApi.status → running) */
  running: boolean;
  /** Convenience: connected || running — the gateway is reachable in some way */
  ready: boolean;
  /** True after the first status check completes (avoids flash-of-offline) */
  checked: boolean;
  /** Gateway runtime string from gatewayApi.status (e.g. "2h 13m") */
  runtime: string;
  /** Timestamp of last successful check */
  lastCheckAt: number;
}

const INITIAL: GatewayStatus = {
  connected: false,
  running: false,
  ready: false,
  checked: false,
  runtime: '',
  lastCheckAt: 0,
};

// ---------------------------------------------------------------------------
// Singleton status bus (shared across all hook consumers)
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 5000;
const RECONNECT_COOLDOWN_MS = 30000;

class GatewayStatusBus {
  private snapshot: GatewayStatus = { ...INITIAL };
  private listeners = new Set<() => void>();
  private refCount = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastReconnectAt = 0;

  getSnapshot = (): GatewayStatus => this.snapshot;

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

  /** Force an immediate status refresh (e.g. after user clicks "Retry") */
  refresh = (): void => {
    this.check();
  };

  /** Force reconnect the GW WS client */
  reconnect = (): void => {
    gwApi.reconnect().catch(() => {});
    // Follow up with a status check after a short delay
    setTimeout(() => this.check(), 1500);
  };

  // -- internals --

  private emit() {
    for (const fn of this.listeners) fn();
  }

  private update(patch: Partial<GatewayStatus>) {
    const next = { ...this.snapshot, ...patch };
    // Derive ready from connected/running
    next.ready = next.connected || next.running;
    // Only emit if something actually changed (avoids unnecessary React re-renders)
    const prev = this.snapshot;
    if (
      prev.connected === next.connected &&
      prev.running === next.running &&
      prev.ready === next.ready &&
      prev.checked === next.checked &&
      prev.runtime === next.runtime
    ) {
      // Update lastCheckAt silently without triggering re-renders
      this.snapshot = next;
      return;
    }
    this.snapshot = next;
    this.emit();
  }

  private check = () => {
    Promise.allSettled([gwApi.status(), gatewayApi.statusCached(6000, false)])
      .then(([rpc, svc]) => {
        const rpcConnected = rpc.status === 'fulfilled' && !!(rpc.value as any)?.connected;
        const gwRunning = svc.status === 'fulfilled' && !!(svc.value as any)?.running;
        const runtime = svc.status === 'fulfilled' ? (svc.value as any)?.runtime || '' : this.snapshot.runtime;

        this.update({
          connected: rpcConnected,
          running: gwRunning,
          checked: true,
          runtime,
          lastCheckAt: Date.now(),
        });

        // Self-heal: gateway process is up but GW WS client is disconnected.
        // Only trigger if the backend connectLoop isn't already retrying with
        // a high backoff (which would indicate it's handling reconnection).
        if (!rpcConnected && gwRunning) {
          const now = Date.now();
          const backoffMs = rpc.status === 'fulfilled' ? (rpc.value as any)?.backoff_ms ?? 0 : 0;
          if (now - this.lastReconnectAt > RECONNECT_COOLDOWN_MS && backoffMs < 5000) {
            this.lastReconnectAt = now;
            gwApi.reconnect().catch(() => {});
          }
        }
      })
      .catch(() => {
        this.update({ connected: false, running: false, checked: true, lastCheckAt: Date.now() });
      });
  };

  private onVisibilityChange = () => {
    if (document.hidden) {
      if (this.timer) { clearInterval(this.timer); this.timer = null; }
    } else {
      if (!this.timer && this.refCount > 0) {
        this.check();
        this.timer = setInterval(this.check, POLL_INTERVAL_MS);
      }
    }
  };

  private start() {
    this.check();
    this.timer = setInterval(this.check, POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  private stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    // Keep last known state so re-subscribers get the correct initial value
    // instead of flashing "disconnected" before the first async check resolves.
  }
}

const bus = new GatewayStatusBus();

// ---------------------------------------------------------------------------
// React hook
// ---------------------------------------------------------------------------

/**
 * useGatewayStatus — shared gateway connectivity state.
 *
 * Uses a singleton polling bus so that all consumers share the same status
 * checks (no redundant network requests).
 *
 * @returns GatewayStatus + imperative helpers
 */
export function useGatewayStatus() {
  const status = useSyncExternalStore(bus.subscribe, bus.getSnapshot, bus.getSnapshot);

  const refresh = useCallback(() => bus.refresh(), []);
  const reconnect = useCallback(() => bus.reconnect(), []);

  return { ...status, refresh, reconnect };
}
