import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Language } from '../types';
import { getTranslation } from '../locales';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import { sshHostsApi } from '../services/ssh-hosts';
import type { SSHHost, SSHHostCreateRequest } from '../services/ssh-hosts';
import { TerminalWSClient } from '../services/terminal-ws';
import type { TerminalMessage, TerminalCreatedPayload, TerminalOutputPayload, TerminalExitPayload, TerminalErrorPayload } from '../services/terminal-ws';
import { sftpApi } from '../services/sftp';
import type { FileEntry } from '../services/sftp';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

interface Props {
  language: Language;
}

type View = 'hosts' | 'sessions' | 'add' | 'edit';

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

// ── Tab types ──
interface TabState {
  id: string;
  hostName: string;
  hostId: number;
  sessionId: string | null;
  connecting: boolean;
  panelMode: 'terminal' | 'sftp';
  // xterm refs (managed imperatively)
  xterm: XTerm | null;
  fitAddon: FitAddon | null;
  wsClient: TerminalWSClient | null;
  resizeObserver: ResizeObserver | null;
  // SFTP state
  sftpPath: string;
  sftpEntries: FileEntry[];
  sftpLoading: boolean;
}

const XTERM_THEME = {
  background: '#1a1b26', foreground: '#c0caf5', cursor: '#c0caf5',
  selectionBackground: '#33467c',
  black: '#15161e', red: '#f7768e', green: '#9ece6a', yellow: '#e0af68',
  blue: '#7aa2f7', magenta: '#bb9af7', cyan: '#7dcfff', white: '#a9b1d6',
  brightBlack: '#414868', brightRed: '#f7768e', brightGreen: '#9ece6a',
  brightYellow: '#e0af68', brightBlue: '#7aa2f7', brightMagenta: '#bb9af7',
  brightCyan: '#7dcfff', brightWhite: '#c0caf5',
};

let tabCounter = 0;

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

  // Multi-tab state
  const [tabs, setTabs] = useState<TabState[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const tabsRef = useRef<TabState[]>([]);
  tabsRef.current = tabs;
  const termContainerRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // SFTP upload ref
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragCounterRef = useRef(0);

  const activeTab = useMemo(() => tabs.find((tb) => tb.id === activeTabId) || null, [tabs, activeTabId]);

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

  // Cleanup all tabs on unmount
  useEffect(() => {
    return () => {
      tabsRef.current.forEach((tab) => {
        tab.wsClient?.disconnect();
        tab.xterm?.dispose();
        tab.resizeObserver?.disconnect();
      });
    };
  }, []);

  // Helper: update a tab by id
  const updateTab = useCallback((id: string, patch: Partial<TabState>) => {
    setTabs((prev) => prev.map((tab) => (tab.id === id ? { ...tab, ...patch } : tab)));
  }, []);

  // Mount xterm when tab becomes active
  useEffect(() => {
    if (!activeTab || activeTab.panelMode !== 'terminal') return;
    const tab = activeTab;
    if (!tab.xterm) return;
    const container = termContainerRefs.current[tab.id];
    if (!container) return;

    // Already mounted to this container
    if (container.querySelector('.xterm')) return;

    tab.xterm.open(container);
    if (tab.fitAddon) {
      try { tab.fitAddon.fit(); } catch { /* ignore */ }
    }

    // Setup resize observer
    if (tab.resizeObserver) tab.resizeObserver.disconnect();
    const ro = new ResizeObserver(() => {
      if (tab.fitAddon) try { tab.fitAddon.fit(); } catch { /* ignore */ }
    });
    ro.observe(container);
    tab.resizeObserver = ro;

    tab.xterm.focus();
  }, [activeTabId, activeTab?.panelMode]);

  // Connect to host → new tab
  const connectToHost = useCallback(async (host: SSHHost) => {
    const tabId = `tab-${++tabCounter}`;
    const newTab: TabState = {
      id: tabId, hostName: host.name, hostId: host.id,
      sessionId: null, connecting: true, panelMode: 'terminal',
      xterm: null, fitAddon: null, wsClient: null, resizeObserver: null,
      sftpPath: '/', sftpEntries: [], sftpLoading: false,
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(tabId);
    setView('sessions');

    // Create xterm
    const xterm = new XTerm({
      cursorBlink: true, fontSize: 14,
      fontFamily: 'JetBrains Mono, Consolas, monospace',
      theme: XTERM_THEME, allowProposedApi: true,
    });
    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);
    xterm.loadAddon(new WebLinksAddon());

    xterm.writeln(`\x1b[36m⟡ Connecting to ${host.name} (${host.username}@${host.host}:${host.port})...\x1b[0m`);

    // Create WS client
    const client = new TerminalWSClient();
    try {
      await client.connect();
    } catch {
      xterm.writeln('\x1b[31m✗ WebSocket connection failed\x1b[0m');
      updateTab(tabId, { connecting: false, xterm, fitAddon, wsClient: client });
      return;
    }

    let currentSessionId = '';

    client.on('terminal.created', (msg: TerminalMessage) => {
      const p = msg.payload as TerminalCreatedPayload;
      currentSessionId = p.sessionId;
      updateTab(tabId, { sessionId: p.sessionId, connecting: false });
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
      updateTab(tabId, { sessionId: null });
    });

    client.on('terminal.error', (msg: TerminalMessage) => {
      const p = msg.payload as TerminalErrorPayload;
      xterm.writeln(`\r\n\x1b[31m✗ Error: ${p.message}\x1b[0m`);
      updateTab(tabId, { connecting: false });
    });

    xterm.onData((data: string) => {
      if (currentSessionId) client.sendInput(currentSessionId, data);
    });

    xterm.onResize(({ cols, rows }: { cols: number; rows: number }) => {
      if (currentSessionId) client.resizeSession(currentSessionId, cols, rows);
    });

    updateTab(tabId, { xterm, fitAddon, wsClient: client });

    // Wait a tick for DOM mount, then fit + create session
    requestAnimationFrame(() => {
      const container = termContainerRefs.current[tabId];
      if (container) {
        xterm.open(container);
        fitAddon.fit();
        const ro = new ResizeObserver(() => {
          try { fitAddon.fit(); } catch { /* ignore */ }
        });
        ro.observe(container);
        updateTab(tabId, { resizeObserver: ro });
      }
      const dims = fitAddon.proposeDimensions();
      client.createSession(host.id, dims?.cols || 120, dims?.rows || 30);
    });
  }, [updateTab]);

  // Close tab
  const closeTab = useCallback((tabId: string) => {
    const tab = tabsRef.current.find((tb) => tb.id === tabId);
    if (tab) {
      if (tab.sessionId && tab.wsClient) tab.wsClient.closeSession(tab.sessionId);
      tab.wsClient?.disconnect();
      tab.xterm?.dispose();
      tab.resizeObserver?.disconnect();
    }
    setTabs((prev) => {
      const next = prev.filter((tb) => tb.id !== tabId);
      if (activeTabId === tabId) {
        setActiveTabId(next.length > 0 ? next[next.length - 1].id : null);
        if (next.length === 0) setView('hosts');
      }
      return next;
    });
  }, [activeTabId]);

  // Toggle SFTP panel for active tab
  const toggleSFTP = useCallback(async () => {
    if (!activeTab) return;
    if (activeTab.panelMode === 'sftp') {
      updateTab(activeTab.id, { panelMode: 'terminal' });
      return;
    }
    if (!activeTab.sessionId) {
      toast('error', tt.sftpNeedSession || 'SFTP requires an active session');
      return;
    }
    updateTab(activeTab.id, { panelMode: 'sftp', sftpLoading: true });
    try {
      const result = await sftpApi.list(activeTab.sessionId);
      updateTab(activeTab.id, { sftpPath: result.path, sftpEntries: result.entries, sftpLoading: false });
    } catch (e: any) {
      toast('error', e?.message || 'SFTP list failed');
      updateTab(activeTab.id, { sftpLoading: false, panelMode: 'terminal' });
    }
  }, [activeTab, updateTab, toast, tt]);

  // SFTP navigate
  const sftpNavigate = useCallback(async (path: string) => {
    if (!activeTab?.sessionId) return;
    updateTab(activeTab.id, { sftpLoading: true });
    try {
      const result = await sftpApi.list(activeTab.sessionId, path);
      updateTab(activeTab.id, { sftpPath: result.path, sftpEntries: result.entries, sftpLoading: false });
    } catch (e: any) {
      toast('error', e?.message || 'SFTP list failed');
      updateTab(activeTab.id, { sftpLoading: false });
    }
  }, [activeTab, updateTab, toast]);

  // SFTP actions
  const sftpDownload = useCallback((entry: FileEntry) => {
    if (!activeTab?.sessionId || entry.is_dir) return;
    const url = sftpApi.downloadUrl(activeTab.sessionId, entry.path);
    const a = document.createElement('a');
    a.href = url; a.download = entry.name; a.click();
  }, [activeTab]);

  const sftpUpload = useCallback(async (file: File) => {
    if (!activeTab?.sessionId) return;
    try {
      await sftpApi.upload(activeTab.sessionId, activeTab.sftpPath + '/', file);
      toast('success', (tt.sftpUploaded || 'Uploaded: {name}').replace('{name}', file.name));
      sftpNavigate(activeTab.sftpPath);
    } catch (e: any) {
      toast('error', e?.message || 'Upload failed');
    }
  }, [activeTab, toast, tt, sftpNavigate]);

  const sftpUploadMulti = useCallback(async (files: File[]) => {
    if (!activeTab?.sessionId || files.length === 0) return;
    let ok = 0;
    let fail = 0;
    for (const file of files) {
      try {
        await sftpApi.upload(activeTab.sessionId, activeTab.sftpPath + '/', file);
        ok++;
      } catch {
        fail++;
      }
    }
    if (ok > 0) toast('success', (tt.sftpUploadedCount || '{n} file(s) uploaded').replace('{n}', String(ok)));
    if (fail > 0) toast('error', (tt.sftpUploadFailed || '{n} file(s) failed').replace('{n}', String(fail)));
    sftpNavigate(activeTab.sftpPath);
  }, [activeTab, toast, tt, sftpNavigate]);

  // Drag & drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes('Files')) setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) { dragCounterRef.current = 0; setDragging(false); }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounterRef.current = 0;
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) sftpUploadMulti(files);
  }, [sftpUploadMulti]);

  const sftpMkdir = useCallback(async () => {
    if (!activeTab?.sessionId) return;
    const name = prompt(tt.sftpNewFolder || 'New folder name:');
    if (!name) return;
    try {
      const newPath = activeTab.sftpPath === '/' ? `/${name}` : `${activeTab.sftpPath}/${name}`;
      await sftpApi.mkdir(activeTab.sessionId, newPath);
      sftpNavigate(activeTab.sftpPath);
    } catch (e: any) {
      toast('error', e?.message || 'Mkdir failed');
    }
  }, [activeTab, toast, tt, sftpNavigate]);

  const sftpRemove = useCallback(async (entry: FileEntry) => {
    if (!activeTab?.sessionId) return;
    const ok = await confirm({
      title: tt.sftpDeleteTitle || 'Delete',
      message: (tt.sftpDeleteMsg || 'Delete "{name}"?').replace('{name}', entry.name),
      danger: true,
    });
    if (!ok) return;
    try {
      await sftpApi.remove(activeTab.sessionId, entry.path);
      toast('success', (tt.sftpDeleted || 'Deleted: {name}').replace('{name}', entry.name));
      sftpNavigate(activeTab.sftpPath);
    } catch (e: any) {
      toast('error', e?.message || 'Delete failed');
    }
  }, [activeTab, confirm, toast, tt, sftpNavigate]);

  // SFTP parent path
  const sftpParentPath = useMemo(() => {
    if (!activeTab) return '/';
    const p = activeTab.sftpPath;
    if (p === '/') return null;
    const parent = p.substring(0, p.lastIndexOf('/')) || '/';
    return parent;
  }, [activeTab?.sftpPath]);

  // Host form actions (same as before)
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
      setView(tabs.length > 0 ? 'sessions' : 'hosts');
      loadHosts();
    } catch (e: any) {
      toast('error', e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [form, editId, toast, tt, loadHosts, tabs.length]);

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

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  // === Render ===

  // Host list view
  if (view === 'hosts') {
    return (
      <div className="h-full flex flex-col bg-surface text-text overflow-hidden">
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
                        <span className="ms-2 opacity-60">• {new Date(host.last_connected_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => startEdit(host)} className="p-1.5 rounded-md hover:bg-white/10 text-text-muted hover:text-text transition-colors" title={tt.edit || 'Edit'}>
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <button onClick={() => handleDelete(host)} className="p-1.5 rounded-md hover:bg-red-500/20 text-text-muted hover:text-red-400 transition-colors" title={tt.delete || 'Delete'}>
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

  // Sessions view — multi-tab terminal
  if (view === 'sessions') {
    return (
      <div className="h-full flex flex-col bg-[#1a1b26] overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-center bg-[#13141c] border-b border-white/5 shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex items-center flex-1 min-w-0">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer border-b-2 transition-colors shrink-0 ${
                  tab.id === activeTabId
                    ? 'border-cyan-400 text-white bg-[#1a1b26]'
                    : 'border-transparent text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
                onClick={() => setActiveTabId(tab.id)}
              >
                <span className="material-symbols-outlined text-xs" style={{ fontSize: '13px' }}>
                  {tab.panelMode === 'sftp' ? 'folder_open' : 'terminal'}
                </span>
                <span className="truncate max-w-[100px]">{tab.hostName}</span>
                {tab.connecting && <span className="material-symbols-outlined text-[10px] text-amber-400 animate-spin">progress_activity</span>}
                {tab.sessionId && !tab.connecting && <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />}
                {!tab.sessionId && !tab.connecting && <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />}
                <button
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                  className="ms-1 p-0.5 rounded hover:bg-white/10 text-white/30 hover:text-white/70 transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>close</span>
                </button>
              </div>
            ))}
          </div>
          {/* New tab + back to hosts */}
          <div className="flex items-center gap-1 px-2 shrink-0">
            <button
              onClick={() => setView('hosts')}
              className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
              title={tt.addHost || 'Add Host'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
            </button>
          </div>
        </div>

        {/* Active tab toolbar */}
        {activeTab && (
          <div className="flex items-center justify-between px-3 py-1 bg-[#1a1b26] border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/50 font-mono">{activeTab.hostName}</span>
              {activeTab.sessionId && (
                <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded bg-green-500/20 text-green-400">
                  {tt.connected || 'connected'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleSFTP}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
                  activeTab.panelMode === 'sftp'
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/10'
                }`}
                title={tt.sftpToggle || 'File Browser'}
              >
                <span className="material-symbols-outlined text-sm">folder_open</span>
                <span className="hidden sm:inline">{tt.files || 'Files'}</span>
              </button>
              {activeTab.panelMode === 'terminal' && (
                <button
                  onClick={() => closeTab(activeTab.id)}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded-md text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                  {tt.disconnect || 'Disconnect'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab content */}
        <div className="flex-1 min-h-0 relative">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className="absolute inset-0"
              style={{ display: tab.id === activeTabId ? 'flex' : 'none', flexDirection: 'column' }}
            >
              {/* Terminal (always present for the session) */}
              {tab.panelMode === 'terminal' && (
                <div
                  ref={(el) => { termContainerRefs.current[tab.id] = el; }}
                  className="flex-1 min-h-0 p-1"
                />
              )}

              {/* SFTP file browser */}
              {tab.panelMode === 'sftp' && (
                <div
                  className="flex-1 flex flex-col overflow-hidden bg-surface text-text relative"
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  {/* Drop overlay */}
                  {dragging && tab.id === activeTabId && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-cyan-500/10 border-2 border-dashed border-cyan-400 rounded-xl backdrop-blur-sm pointer-events-none">
                      <div className="flex flex-col items-center gap-2 text-cyan-400">
                        <span className="material-symbols-outlined text-4xl">cloud_upload</span>
                        <span className="text-sm font-medium">{tt.sftpDropHere || 'Drop files to upload'}</span>
                      </div>
                    </div>
                  )}
                  {/* SFTP toolbar */}
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 shrink-0">
                    <button
                      onClick={() => updateTab(tab.id, { panelMode: 'terminal' })}
                      className="p-1 rounded-md hover:bg-white/10 text-text-muted"
                    >
                      <span className="material-symbols-outlined text-sm">terminal</span>
                    </button>
                    <div className="flex-1 flex items-center gap-1 bg-surface-sunken rounded-lg px-2 py-1 min-w-0">
                      {sftpParentPath !== null && (
                        <button onClick={() => sftpNavigate(sftpParentPath!)} className="p-0.5 rounded hover:bg-white/10 text-text-muted shrink-0">
                          <span className="material-symbols-outlined text-sm">arrow_upward</span>
                        </button>
                      )}
                      <span className="text-xs font-mono text-text-muted truncate">{tab.sftpPath}</span>
                    </div>
                    <button onClick={() => sftpNavigate(tab.sftpPath)} className="p-1 rounded-md hover:bg-white/10 text-text-muted" title={tt.sftpRefresh || 'Refresh'}>
                      <span className="material-symbols-outlined text-sm">refresh</span>
                    </button>
                    <button onClick={sftpMkdir} className="p-1 rounded-md hover:bg-white/10 text-text-muted" title={tt.sftpNewFolder || 'New Folder'}>
                      <span className="material-symbols-outlined text-sm">create_new_folder</span>
                    </button>
                    <button onClick={() => uploadInputRef.current?.click()} className="p-1 rounded-md hover:bg-white/10 text-text-muted" title={tt.sftpUpload || 'Upload'}>
                      <span className="material-symbols-outlined text-sm">upload_file</span>
                    </button>
                    <input
                      ref={uploadInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length === 1) sftpUpload(files[0]);
                        else if (files.length > 1) sftpUploadMulti(files);
                        e.target.value = '';
                      }}
                    />
                  </div>

                  {/* File list */}
                  <div className="flex-1 overflow-y-auto neon-scrollbar">
                    {tab.sftpLoading ? (
                      <div className="flex items-center justify-center h-32 text-text-muted">
                        <span className="material-symbols-outlined animate-spin">progress_activity</span>
                      </div>
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-text-muted border-b border-white/5">
                            <th className="text-start px-3 py-2 font-medium">{tt.sftpName || 'Name'}</th>
                            <th className="text-end px-3 py-2 font-medium w-24">{tt.sftpSize || 'Size'}</th>
                            <th className="text-start px-3 py-2 font-medium w-20">{tt.sftpMode || 'Mode'}</th>
                            <th className="text-end px-3 py-2 font-medium w-32">{tt.sftpModified || 'Modified'}</th>
                            <th className="w-20" />
                          </tr>
                        </thead>
                        <tbody>
                          {tab.sftpEntries.map((entry) => (
                            <tr
                              key={entry.path}
                              className="border-b border-white/[.03] hover:bg-white/5 transition-colors cursor-pointer group"
                              onDoubleClick={() => entry.is_dir && sftpNavigate(entry.path)}
                            >
                              <td className="px-3 py-1.5">
                                <div className="flex items-center gap-2">
                                  <span className={`material-symbols-outlined text-sm ${entry.is_dir ? 'text-cyan-400' : 'text-text-muted'}`}>
                                    {entry.is_dir ? 'folder' : 'description'}
                                  </span>
                                  <span
                                    className={`truncate ${entry.is_dir ? 'text-cyan-400' : ''}`}
                                    onClick={() => entry.is_dir && sftpNavigate(entry.path)}
                                  >{entry.name}</span>
                                </div>
                              </td>
                              <td className="px-3 py-1.5 text-end text-text-muted">{entry.is_dir ? '—' : formatSize(entry.size)}</td>
                              <td className="px-3 py-1.5 text-text-muted font-mono">{entry.mode.slice(0, 10)}</td>
                              <td className="px-3 py-1.5 text-end text-text-muted">{new Date(entry.mod_time * 1000).toLocaleString()}</td>
                              <td className="px-2 py-1.5">
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {!entry.is_dir && (
                                    <button onClick={() => sftpDownload(entry)} className="p-1 rounded hover:bg-white/10 text-text-muted" title={tt.sftpDownload || 'Download'}>
                                      <span className="material-symbols-outlined text-xs">download</span>
                                    </button>
                                  )}
                                  <button onClick={() => sftpRemove(entry)} className="p-1 rounded hover:bg-red-500/20 text-text-muted hover:text-red-400" title={tt.delete || 'Delete'}>
                                    <span className="material-symbols-outlined text-xs">delete</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {tab.sftpEntries.length === 0 && !tab.sftpLoading && (
                            <tr>
                              <td colSpan={5} className="px-3 py-8 text-center text-text-muted">
                                {tt.sftpEmpty || 'Directory is empty'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* No tabs */}
          {tabs.length === 0 && (
            <div className="flex items-center justify-center h-full text-white/30">
              <div className="text-center">
                <span className="material-symbols-outlined text-4xl mb-2 block">terminal</span>
                <p className="text-sm">{tt.noTabs || 'No active sessions'}</p>
                <button onClick={() => setView('hosts')} className="text-xs text-cyan-400 mt-2 hover:underline">
                  {tt.connectHost || 'Connect to a host'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Add / Edit form (same as before)
  return (
    <div className="h-full flex flex-col bg-surface text-text overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
        <button onClick={() => { setView(tabs.length > 0 ? 'sessions' : 'hosts'); setEditId(null); }} className="p-1 rounded-md hover:bg-white/10 text-text-muted">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
        </button>
        <span className="material-symbols-outlined text-lg text-cyan-400">{editId ? 'edit' : 'add_circle'}</span>
        <h2 className="text-base font-semibold">
          {editId ? (tt.editHost || 'Edit Host') : (tt.addHost || 'Add Host')}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 neon-scrollbar">
        <div className="max-w-lg mx-auto space-y-4">
          <div>
            <label className="text-xs text-text-muted mb-1 block">{tt.hostName || 'Name'}</label>
            <input className="sci-input w-full px-3 py-2 rounded-lg bg-surface-sunken text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="My Server" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-text-muted mb-1 block">{tt.hostAddr || 'Host'}</label>
              <input className="sci-input w-full px-3 py-2 rounded-lg bg-surface-sunken text-sm" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="192.168.1.100" />
            </div>
            <div className="w-24">
              <label className="text-xs text-text-muted mb-1 block">{tt.port || 'Port'}</label>
              <input type="number" className="sci-input w-full px-3 py-2 rounded-lg bg-surface-sunken text-sm" value={form.port} onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) || 22 })} />
            </div>
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">{tt.username || 'Username'}</label>
            <input className="sci-input w-full px-3 py-2 rounded-lg bg-surface-sunken text-sm" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="root" />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">{tt.authType || 'Auth Type'}</label>
            <div className="flex gap-2">
              <button className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${form.auth_type === 'password' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-surface-sunken text-text-muted hover:bg-white/5'}`} onClick={() => setForm({ ...form, auth_type: 'password' })}>{tt.password || 'Password'}</button>
              <button className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${form.auth_type === 'key' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-surface-sunken text-text-muted hover:bg-white/5'}`} onClick={() => setForm({ ...form, auth_type: 'key' })}>{tt.privateKey || 'Private Key'}</button>
            </div>
          </div>
          {form.auth_type === 'password' && (
            <div>
              <label className="text-xs text-text-muted mb-1 block">{tt.password || 'Password'}</label>
              <input type="password" className="sci-input w-full px-3 py-2 rounded-lg bg-surface-sunken text-sm" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editId ? (tt.leaveBlank || 'Leave blank to keep') : ''} />
            </div>
          )}
          {form.auth_type === 'key' && (
            <>
              <div>
                <label className="text-xs text-text-muted mb-1 block">{tt.privateKey || 'Private Key'}</label>
                <textarea className="sci-input w-full px-3 py-2 rounded-lg bg-surface-sunken text-sm font-mono resize-none" rows={5} value={form.private_key} onChange={(e) => setForm({ ...form, private_key: e.target.value })} placeholder="-----BEGIN OPENSSH PRIVATE KEY-----" />
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1 block">{tt.passphrase || 'Passphrase'}</label>
                <input type="password" className="sci-input w-full px-3 py-2 rounded-lg bg-surface-sunken text-sm" value={form.passphrase} onChange={(e) => setForm({ ...form, passphrase: e.target.value })} placeholder={tt.optional || 'Optional'} />
              </div>
            </>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_favorite} onChange={(e) => setForm({ ...form, is_favorite: e.target.checked })} className="w-4 h-4 rounded accent-cyan-500" />
            <span className="text-xs text-text-muted">{tt.favorite || 'Favorite'}</span>
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
        <button onClick={handleTest} disabled={testing || !form.host || !form.username} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-white/5 text-text-muted hover:bg-white/10 disabled:opacity-40 transition-colors">
          {testing ? <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> : <span className="material-symbols-outlined text-sm">lan</span>}
          {tt.testConnection || 'Test Connection'}
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => { setView(tabs.length > 0 ? 'sessions' : 'hosts'); setEditId(null); }} className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-text-muted hover:bg-white/10 transition-colors">{tt.cancel || 'Cancel'}</button>
          <button onClick={handleSave} disabled={saving || !form.name || !form.host || !form.username} className="flex items-center gap-1 px-4 py-1.5 text-xs font-medium rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-40 transition-colors">
            {saving && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
            {tt.save || 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TerminalPage;
