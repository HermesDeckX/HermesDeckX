import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Language } from '../types';
import { getTranslation } from '../locales';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import { sshHostsApi } from '../services/ssh-hosts';
import type { SSHHost, SSHHostCreateRequest } from '../services/ssh-hosts';
import { TerminalWSClient } from '../services/terminal-ws';
import type { TerminalMessage, TerminalCreatedPayload, TerminalOutputPayload, TerminalExitPayload, TerminalErrorPayload } from '../services/terminal-ws';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

interface Props {
  language: Language;
}

type View = 'hosts' | 'terminal' | 'add' | 'edit';

interface HostFormData {
  name: string;
  host: string;
  port: number;
  username: string;
  auth_type: 'password' | 'key';
  password: string;
  private_key: string;
  passphrase: string;
  is_favorite: boolean;
}

const emptyForm: HostFormData = {
  name: '', host: '', port: 22, username: 'root',
  auth_type: 'password', password: '', private_key: '', passphrase: '',
  is_favorite: false,
};

const TerminalPage: React.FC<Props> = ({ language }) => {
  const t = useMemo(() => getTranslation(language) as any, [language]);
  const tt = t?.terminalPage || {};
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const [view, setView] = useState<View>('hosts');
  const [hosts, setHosts] = useState<SSHHost[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<HostFormData>({ ...emptyForm });
  const [editId, setEditId] = useState<number | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Terminal state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [connectedHost, setConnectedHost] = useState<string>('');
  const [connecting, setConnecting] = useState(false);

  const termRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsClientRef = useRef<TerminalWSClient | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Load hosts
  const loadHosts = useCallback(async () => {
    try {
      setLoading(true);
      const list = await sshHostsApi.list();
      setHosts(list || []);
    } catch {
      toast('error', tt.loadFailed || 'Failed to load hosts');
    } finally {
      setLoading(false);
    }
  }, [toast, tt]);

  useEffect(() => { loadHosts(); }, [loadHosts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wsClientRef.current?.disconnect();
      xtermRef.current?.dispose();
      resizeObserverRef.current?.disconnect();
    };
  }, []);

  // Connect to host
  const connectToHost = useCallback(async (host: SSHHost) => {
    setConnecting(true);
    setView('terminal');
    setConnectedHost(host.name);

    // Create xterm instance
    const xterm = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'JetBrains Mono, Consolas, monospace',
      theme: {
        background: '#1a1b26',
        foreground: '#c0caf5',
        cursor: '#c0caf5',
        selectionBackground: '#33467c',
        black: '#15161e',
        red: '#f7768e',
        green: '#9ece6a',
        yellow: '#e0af68',
        blue: '#7aa2f7',
        magenta: '#bb9af7',
        cyan: '#7dcfff',
        white: '#a9b1d6',
        brightBlack: '#414868',
        brightRed: '#f7768e',
        brightGreen: '#9ece6a',
        brightYellow: '#e0af68',
        brightBlue: '#7aa2f7',
        brightMagenta: '#bb9af7',
        brightCyan: '#7dcfff',
        brightWhite: '#c0caf5',
      },
      allowProposedApi: true,
    });
    xtermRef.current = xterm;

    const fitAddon = new FitAddon();
    fitAddonRef.current = fitAddon;
    xterm.loadAddon(fitAddon);
    xterm.loadAddon(new WebLinksAddon());

    // Wait for DOM
    await new Promise<void>((resolve) => {
      const tryMount = () => {
        if (termRef.current) {
          xterm.open(termRef.current);
          fitAddon.fit();
          resolve();
        } else {
          requestAnimationFrame(tryMount);
        }
      };
      tryMount();
    });

    // Resize observer
    if (termRef.current) {
      const ro = new ResizeObserver(() => {
        try { fitAddon.fit(); } catch { /* ignore */ }
      });
      ro.observe(termRef.current);
      resizeObserverRef.current = ro;
    }

    xterm.writeln(`\x1b[36m⟡ Connecting to ${host.name} (${host.username}@${host.host}:${host.port})...\x1b[0m`);

    // Create WS client
    const client = new TerminalWSClient();
    wsClientRef.current = client;

    try {
      await client.connect();
    } catch {
      xterm.writeln('\x1b[31m✗ WebSocket connection failed\x1b[0m');
      setConnecting(false);
      return;
    }

    // Wire up events
    client.on('terminal.created', (msg: TerminalMessage) => {
      const p = msg.payload as TerminalCreatedPayload;
      setSessionId(p.sessionId);
      setConnecting(false);
      xterm.writeln(`\x1b[32m✓ Connected (session: ${p.sessionId})\x1b[0m\r\n`);
      xterm.focus();
    });

    client.on('terminal.output', (msg: TerminalMessage) => {
      const p = msg.payload as TerminalOutputPayload;
      xterm.write(p.data);
    });

    client.on('terminal.exit', (msg: TerminalMessage) => {
      const p = msg.payload as TerminalExitPayload;
      xterm.writeln(`\r\n\x1b[33m⟡ Session ended: ${p.reason}\x1b[0m`);
      setSessionId(null);
    });

    client.on('terminal.error', (msg: TerminalMessage) => {
      const p = msg.payload as TerminalErrorPayload;
      xterm.writeln(`\r\n\x1b[31m✗ Error: ${p.message}\x1b[0m`);
      setConnecting(false);
    });

    // User input → SSH
    xterm.onData((data: string) => {
      client.sendInput(sessionId || '', data);
    });

    // Terminal resize → SSH
    xterm.onResize(({ cols, rows }: { cols: number; rows: number }) => {
      if (sessionId) {
        client.resizeSession(sessionId, cols, rows);
      }
    });

    // Fix: capture sessionId via closure update
    let currentSessionId = '';
    client.on('terminal.created', (msg: TerminalMessage) => {
      currentSessionId = (msg.payload as TerminalCreatedPayload).sessionId;
    });
    xterm.onData((data: string) => {
      if (currentSessionId) client.sendInput(currentSessionId, data);
    });
    xterm.onResize(({ cols, rows }: { cols: number; rows: number }) => {
      if (currentSessionId) client.resizeSession(currentSessionId, cols, rows);
    });

    // Send create request
    const dims = fitAddon.proposeDimensions();
    client.createSession(host.id, dims?.cols || 120, dims?.rows || 30);
  }, [toast, tt]);

  // Disconnect
  const disconnectTerminal = useCallback(() => {
    if (sessionId && wsClientRef.current) {
      wsClientRef.current.closeSession(sessionId);
    }
    wsClientRef.current?.disconnect();
    wsClientRef.current = null;
    xtermRef.current?.dispose();
    xtermRef.current = null;
    fitAddonRef.current = null;
    resizeObserverRef.current?.disconnect();
    resizeObserverRef.current = null;
    setSessionId(null);
    setConnectedHost('');
    setView('hosts');
  }, [sessionId]);

  // Host form actions
  const handleSave = useCallback(async () => {
    if (!form.name.trim() || !form.host.trim() || !form.username.trim()) {
      toast('error', tt.fieldsRequired || 'Name, host, and username are required');
      return;
    }
    setSaving(true);
    try {
      const req: SSHHostCreateRequest = {
        name: form.name, host: form.host, port: form.port || 22,
        username: form.username, auth_type: form.auth_type,
        password: form.auth_type === 'password' ? form.password : undefined,
        private_key: form.auth_type === 'key' ? form.private_key : undefined,
        passphrase: form.auth_type === 'key' ? form.passphrase : undefined,
        is_favorite: form.is_favorite,
      };
      if (editId) {
        await sshHostsApi.update(editId, req);
        toast('success', tt.hostUpdated || 'Host updated');
      } else {
        await sshHostsApi.create(req);
        toast('success', tt.hostCreated || 'Host created');
      }
      setForm({ ...emptyForm });
      setEditId(null);
      setView('hosts');
      loadHosts();
    } catch (e: any) {
      toast('error', e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [form, editId, toast, tt, loadHosts]);

  const handleTest = useCallback(async () => {
    setTesting(true);
    try {
      const result = await sshHostsApi.test({
        name: form.name, host: form.host, port: form.port || 22,
        username: form.username, auth_type: form.auth_type,
        password: form.password, private_key: form.private_key, passphrase: form.passphrase,
      });
      if (result.success) {
        toast('success', tt.testSuccess || 'Connection successful');
      } else {
        toast('error', result.error || 'Connection failed');
      }
    } catch (e: any) {
      toast('error', e?.message || 'Test failed');
    } finally {
      setTesting(false);
    }
  }, [form, toast, tt]);

  const handleDelete = useCallback(async (host: SSHHost) => {
    const ok = await confirm({
      title: tt.deleteConfirmTitle || 'Delete Host',
      message: (tt.deleteConfirmMsg || 'Delete "{name}"?').replace('{name}', host.name),
      danger: true,
    });
    if (!ok) return;
    try {
      await sshHostsApi.delete(host.id);
      toast('success', tt.hostDeleted || 'Host deleted');
      loadHosts();
    } catch (e: any) {
      toast('error', e?.message || 'Delete failed');
    }
  }, [confirm, toast, tt, loadHosts]);

  const startEdit = useCallback((host: SSHHost) => {
    setForm({
      name: host.name, host: host.host, port: host.port, username: host.username,
      auth_type: host.auth_type, password: '', private_key: '', passphrase: '',
      is_favorite: host.is_favorite,
    });
    setEditId(host.id);
    setView('edit');
  }, []);

  // === Render ===

  // Host list view
  if (view === 'hosts') {
    return (
      <div className="h-full flex flex-col bg-surface text-text overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl text-cyan-400">terminal</span>
            <h2 className="text-base font-semibold">{tt.title || 'SSH Terminal'}</h2>
            <span className="text-xs text-text-muted">({hosts.length})</span>
          </div>
          <button
            onClick={() => { setForm({ ...emptyForm }); setEditId(null); setView('add'); }}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            {tt.addHost || 'Add Host'}
          </button>
        </div>

        {/* Host list */}
        <div className="flex-1 overflow-y-auto p-4 neon-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-text-muted">
              <span className="material-symbols-outlined animate-spin me-2">progress_activity</span>
            </div>
          ) : hosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-text-muted gap-3">
              <span className="material-symbols-outlined text-4xl opacity-40">dns</span>
              <p className="text-sm">{tt.noHosts || 'No SSH hosts configured'}</p>
              <button
                onClick={() => { setForm({ ...emptyForm }); setEditId(null); setView('add'); }}
                className="text-xs text-cyan-400 hover:underline"
              >{tt.addFirstHost || 'Add your first host'}</button>
            </div>
          ) : (
            <div className="grid gap-2">
              {hosts.map((host) => (
                <div
                  key={host.id}
                  className="sci-card p-3 flex items-center gap-3 group hover:border-cyan-500/30 transition-colors cursor-pointer"
                  onClick={() => connectToHost(host)}
                >
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0">
                    <span className="material-symbols-outlined text-lg">dns</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{host.name}</span>
                      {host.is_favorite && (
                        <span className="material-symbols-outlined text-xs text-amber-400">star</span>
                      )}
                    </div>
                    <div className="text-xs text-text-muted truncate">
                      {host.username}@{host.host}:{host.port}
                      {host.last_connected_at && (
                        <span className="ms-2 opacity-60">
                          • {new Date(host.last_connected_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => startEdit(host)}
                      className="p-1.5 rounded-md hover:bg-white/10 text-text-muted hover:text-text transition-colors"
                      title={tt.edit || 'Edit'}
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(host)}
                      className="p-1.5 rounded-md hover:bg-red-500/20 text-text-muted hover:text-red-400 transition-colors"
                      title={tt.delete || 'Delete'}
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                  <span className="material-symbols-outlined text-sm text-text-muted opacity-0 group-hover:opacity-60 transition-opacity">chevron_right</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Terminal view
  if (view === 'terminal') {
    return (
      <div className="h-full flex flex-col bg-[#1a1b26] overflow-hidden">
        {/* Terminal toolbar */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#1a1b26] border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-cyan-400">terminal</span>
            <span className="text-xs text-white/70 font-mono">{connectedHost}</span>
            {connecting && (
              <span className="material-symbols-outlined text-xs text-amber-400 animate-spin">progress_activity</span>
            )}
            {sessionId && (
              <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded bg-green-500/20 text-green-400">
                {tt.connected || 'connected'}
              </span>
            )}
          </div>
          <button
            onClick={disconnectTerminal}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded-md text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
            {tt.disconnect || 'Disconnect'}
          </button>
        </div>
        {/* xterm container */}
        <div ref={termRef} className="flex-1 min-h-0 p-1" />
      </div>
    );
  }

  // Add / Edit form
  return (
    <div className="h-full flex flex-col bg-surface text-text overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
        <button onClick={() => { setView('hosts'); setEditId(null); }} className="p-1 rounded-md hover:bg-white/10 text-text-muted">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
        </button>
        <span className="material-symbols-outlined text-lg text-cyan-400">{editId ? 'edit' : 'add_circle'}</span>
        <h2 className="text-base font-semibold">
          {editId ? (tt.editHost || 'Edit Host') : (tt.addHost || 'Add Host')}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 neon-scrollbar">
        <div className="max-w-lg mx-auto space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs text-text-muted mb-1 block">{tt.hostName || 'Name'}</label>
            <input
              className="sci-input w-full px-3 py-2 rounded-lg bg-surface-sunken text-sm"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="My Server"
            />
          </div>
          {/* Host + Port */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-text-muted mb-1 block">{tt.hostAddr || 'Host'}</label>
              <input
                className="sci-input w-full px-3 py-2 rounded-lg bg-surface-sunken text-sm"
                value={form.host}
                onChange={(e) => setForm({ ...form, host: e.target.value })}
                placeholder="192.168.1.100"
              />
            </div>
            <div className="w-24">
              <label className="text-xs text-text-muted mb-1 block">{tt.port || 'Port'}</label>
              <input
                type="number"
                className="sci-input w-full px-3 py-2 rounded-lg bg-surface-sunken text-sm"
                value={form.port}
                onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) || 22 })}
              />
            </div>
          </div>
          {/* Username */}
          <div>
            <label className="text-xs text-text-muted mb-1 block">{tt.username || 'Username'}</label>
            <input
              className="sci-input w-full px-3 py-2 rounded-lg bg-surface-sunken text-sm"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="root"
            />
          </div>
          {/* Auth type */}
          <div>
            <label className="text-xs text-text-muted mb-1 block">{tt.authType || 'Auth Type'}</label>
            <div className="flex gap-2">
              <button
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${form.auth_type === 'password' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-surface-sunken text-text-muted hover:bg-white/5'}`}
                onClick={() => setForm({ ...form, auth_type: 'password' })}
              >{tt.password || 'Password'}</button>
              <button
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${form.auth_type === 'key' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-surface-sunken text-text-muted hover:bg-white/5'}`}
                onClick={() => setForm({ ...form, auth_type: 'key' })}
              >{tt.privateKey || 'Private Key'}</button>
            </div>
          </div>
          {/* Password */}
          {form.auth_type === 'password' && (
            <div>
              <label className="text-xs text-text-muted mb-1 block">{tt.password || 'Password'}</label>
              <input
                type="password"
                className="sci-input w-full px-3 py-2 rounded-lg bg-surface-sunken text-sm"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editId ? (tt.leaveBlank || 'Leave blank to keep') : ''}
              />
            </div>
          )}
          {/* Private Key */}
          {form.auth_type === 'key' && (
            <>
              <div>
                <label className="text-xs text-text-muted mb-1 block">{tt.privateKey || 'Private Key'}</label>
                <textarea
                  className="sci-input w-full px-3 py-2 rounded-lg bg-surface-sunken text-sm font-mono resize-none"
                  rows={5}
                  value={form.private_key}
                  onChange={(e) => setForm({ ...form, private_key: e.target.value })}
                  placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                />
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1 block">{tt.passphrase || 'Passphrase'}</label>
                <input
                  type="password"
                  className="sci-input w-full px-3 py-2 rounded-lg bg-surface-sunken text-sm"
                  value={form.passphrase}
                  onChange={(e) => setForm({ ...form, passphrase: e.target.value })}
                  placeholder={tt.optional || 'Optional'}
                />
              </div>
            </>
          )}
          {/* Favorite */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_favorite}
              onChange={(e) => setForm({ ...form, is_favorite: e.target.checked })}
              className="w-4 h-4 rounded accent-cyan-500"
            />
            <span className="text-xs text-text-muted">{tt.favorite || 'Favorite'}</span>
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
        <button
          onClick={handleTest}
          disabled={testing || !form.host || !form.username}
          className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-white/5 text-text-muted hover:bg-white/10 disabled:opacity-40 transition-colors"
        >
          {testing ? (
            <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
          ) : (
            <span className="material-symbols-outlined text-sm">lan</span>
          )}
          {tt.testConnection || 'Test Connection'}
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setView('hosts'); setEditId(null); }}
            className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-text-muted hover:bg-white/10 transition-colors"
          >{tt.cancel || 'Cancel'}</button>
          <button
            onClick={handleSave}
            disabled={saving || !form.name || !form.host || !form.username}
            className="flex items-center gap-1 px-4 py-1.5 text-xs font-medium rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-40 transition-colors"
          >
            {saving && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
            {tt.save || 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TerminalPage;
