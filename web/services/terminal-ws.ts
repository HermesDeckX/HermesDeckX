// Terminal WebSocket client — dedicated channel for SSH terminal I/O.

import { getToken } from './request';

export type TerminalMessageType =
  | 'terminal.create'
  | 'terminal.created'
  | 'terminal.input'
  | 'terminal.output'
  | 'terminal.resize'
  | 'terminal.close'
  | 'terminal.exit'
  | 'terminal.error'
  | 'ping'
  | 'pong';

export interface TerminalMessage {
  type: TerminalMessageType;
  payload: any;
}

export interface TerminalCreatedPayload {
  sessionId: string;
  host: string;
  cols: number;
  rows: number;
}

export interface TerminalOutputPayload {
  sessionId: string;
  data: string;
}

export interface TerminalExitPayload {
  sessionId: string;
  code: number;
  reason: string;
}

export interface TerminalErrorPayload {
  message: string;
}

type MessageHandler = (msg: TerminalMessage) => void;

export class TerminalWSClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<MessageHandler>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private _closed = false;

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this._closed = false;
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const token = getToken() || '';
      const url = `${proto}//${location.host}/api/v1/terminal/ws?token=${encodeURIComponent(token)}`;

      const ws = new WebSocket(url);
      this.ws = ws;

      ws.onopen = () => {
        this.startPing();
        resolve();
      };

      ws.onerror = () => {
        reject(new Error('terminal WS connection failed'));
      };

      ws.onclose = () => {
        this.stopPing();
        if (!this._closed) {
          this.scheduleReconnect();
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg: TerminalMessage = JSON.parse(event.data);
          this.dispatch(msg);
        } catch {
          // ignore malformed messages
        }
      };
    });
  }

  send(type: TerminalMessageType, payload: any): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type, payload }));
  }

  createSession(hostId: number, cols: number, rows: number): void {
    this.send('terminal.create', { hostId, cols, rows });
  }

  sendInput(sessionId: string, data: string): void {
    this.send('terminal.input', { sessionId, data });
  }

  resizeSession(sessionId: string, cols: number, rows: number): void {
    this.send('terminal.resize', { sessionId, cols, rows });
  }

  closeSession(sessionId: string): void {
    this.send('terminal.close', { sessionId });
  }

  on(type: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
    return () => {
      this.handlers.get(type)?.delete(handler);
    };
  }

  disconnect(): void {
    this._closed = true;
    this.stopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.handlers.clear();
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private dispatch(msg: TerminalMessage): void {
    const handlers = this.handlers.get(msg.type);
    if (handlers) {
      handlers.forEach((h) => h(msg));
    }
    // Also dispatch to wildcard listeners
    const wildcardHandlers = this.handlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach((h) => h(msg));
    }
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      this.send('ping', null);
    }, 25000);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this._closed || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => {
        // will retry on next scheduleReconnect
      });
    }, 3000);
  }
}
