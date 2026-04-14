type ManagerWSStatus = 'connecting' | 'open' | 'closed';
type ManagerWSMessageHandler = (msg: any) => void;
type ManagerWSStatusHandler = (status: ManagerWSStatus) => void;

class ManagerWSBus {
  private static readonly SUBSCRIBE_MSG = JSON.stringify({ action: 'subscribe', channels: ['gw_event', 'alert', 'activity'] });
  private static readonly PING_MSG = JSON.stringify({ action: 'ping' });
  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private heartbeatTimeout: number | null = null;
  private backoffMs = 800;
  private wasConnected = false;
  private connectedAt = 0;
  private subscribers = new Set<ManagerWSMessageHandler>();
  private statusSubscribers = new Set<ManagerWSStatusHandler>();
  private refCount = 0;
  private visibilityHandler: (() => void) | null = null;

  subscribe(onMessage: ManagerWSMessageHandler, onStatus?: ManagerWSStatusHandler) {
    this.refCount += 1;
    this.subscribers.add(onMessage);
    if (onStatus) this.statusSubscribers.add(onStatus);
    this.ensureConnected();

    // If the WS is already open, immediately notify the new subscriber
    if (onStatus && this.ws && this.ws.readyState === WebSocket.OPEN) {
      queueMicrotask(() => onStatus('open'));
    }

    return () => {
      this.subscribers.delete(onMessage);
      if (onStatus) this.statusSubscribers.delete(onStatus);
      this.refCount = Math.max(0, this.refCount - 1);
      if (this.refCount === 0) {
        this.stop();
      }
    };
  }

  private notifyStatus(status: ManagerWSStatus) {
    for (const fn of this.statusSubscribers) fn(status);
  }

  private ensureConnected() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.connect();
  }

  private connect() {
    if (this.refCount === 0) return;
    this.notifyStatus('connecting');

    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Auth via HttpOnly claw_token cookie (set on login) — avoids leaking JWT in console on connection errors
    const ws = new WebSocket(`${proto}//${location.host}/api/v1/ws`);
    this.ws = ws;

    ws.onopen = () => {
      this.backoffMs = 800;
      this.connectedAt = Date.now();
      ws.send(ManagerWSBus.SUBSCRIBE_MSG);
      const isReconnect = this.wasConnected;
      this.wasConnected = true;
      this.startHeartbeat();
      this.setupVisibilityHandler();
      this.notifyStatus('open');
      if (isReconnect) {
        for (const fn of this.subscribers) fn({ type: '_reconnected' });
      }
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg && msg.action === 'pong') {
          this.clearHeartbeatTimeout();
          return;
        }
        for (const fn of this.subscribers) fn(msg);
      } catch (e) {
        console.warn('[manager-ws] parse error:', e);
      }
    };

    ws.onclose = () => {
      if (this.ws === ws) this.ws = null;
      this.stopHeartbeat();
      if (this.connectedAt > 0) {
        console.debug(`[manager-ws] closed after ${((Date.now() - this.connectedAt) / 1000).toFixed(1)}s`);
        this.connectedAt = 0;
      }
      this.notifyStatus('closed');
      if (this.refCount > 0) this.scheduleReconnect();
    };

    ws.onerror = () => {
      // rely on onclose
    };
  }

  private scheduleReconnect() {
    if (this.refCount === 0) return;
    if (this.reconnectTimer != null) return;
    // Add ±20% jitter to prevent reconnect storms across tabs/clients
    const jitter = 1 + (Math.random() * 0.4 - 0.2);
    const delay = Math.floor(this.backoffMs * jitter);
    this.backoffMs = Math.min(Math.floor(this.backoffMs * 1.7), 15000);
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      try {
        this.ws.send(ManagerWSBus.PING_MSG);
      } catch { return; }
      this.heartbeatTimeout = window.setTimeout(() => {
        console.warn('[manager-ws] heartbeat pong timeout, forcing reconnect');
        if (this.ws) this.ws.close();
      }, 5000);
    }, 30000);
  }

  private clearHeartbeatTimeout() {
    if (this.heartbeatTimeout != null) {
      window.clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer != null) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.clearHeartbeatTimeout();
  }

  private setupVisibilityHandler() {
    this.teardownVisibilityHandler();
    this.visibilityHandler = () => {
      if (document.hidden) {
        // Tab hidden — pause heartbeat to reduce background traffic
        this.stopHeartbeat();
      } else {
        // Tab visible — restart heartbeat; if WS dropped while hidden, reconnect
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.startHeartbeat();
        } else if (this.refCount > 0) {
          this.ensureConnected();
        }
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  private teardownVisibilityHandler() {
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }

  private stop() {
    if (this.reconnectTimer != null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();
    this.teardownVisibilityHandler();
    if (this.ws) {
      const ws = this.ws;
      this.ws = null;
      ws.close();
    }
    this.wasConnected = false;
    this.notifyStatus('closed');
  }
}

const bus = new ManagerWSBus();

export function subscribeManagerWS(onMessage: ManagerWSMessageHandler, onStatus?: ManagerWSStatusHandler) {
  return bus.subscribe(onMessage, onStatus);
}

export type { ManagerWSStatus };
