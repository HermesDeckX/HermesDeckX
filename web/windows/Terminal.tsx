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
import { sysInfoApi } from '../services/sysinfo';
import type { SysInfo } from '../services/sysinfo';
import { snippetsApi } from '../services/snippets';
import type { SSHSnippet } from '../services/snippets';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

interface Props { language: Language; }
type View = 'hosts' | 'sessions' | 'add' | 'edit';

interface HostFormData {
  name: string; host: string; port: number; username: string;
  auth_type: 'password' | 'key'; password: string;
  private_key: string; passphrase: string; is_favorite: boolean;
}
const emptyForm: HostFormData = {
  name: '', host: '', port: 22, username: 'root',
  auth_type: 'password', password: '', private_key: '', passphrase: '', is_favorite: false,
};

interface TabState {
  id: string; hostName: string; hostId: number;
  sessionId: string | null; connecting: boolean; sftpOpen: boolean;
  xterm: XTerm | null; fitAddon: FitAddon | null;
  wsClient: TerminalWSClient | null; resizeObserver: ResizeObserver | null;
  sftpPath: string; sftpEntries: FileEntry[]; sftpLoading: boolean;
  treeCache: Record<string, FileEntry[]>;
  expandedDirs: Set<string>;
  treeLoading: Set<string>;
  sysInfo: SysInfo | null;
  sysInfoOpen: boolean;
  netHistory: { rx: number; tx: number }[];
  snippets: SSHSnippet[];
  snippetsLoaded: boolean;
}
type BottomTab = 'files' | 'commands';

const XTERM_DARK = {
  background: '#1a1b26', foreground: '#c0caf5', cursor: '#c0caf5', selectionBackground: '#33467c',
  black: '#15161e', red: '#f7768e', green: '#9ece6a', yellow: '#e0af68',
  blue: '#7aa2f7', magenta: '#bb9af7', cyan: '#7dcfff', white: '#a9b1d6',
  brightBlack: '#414868', brightRed: '#f7768e', brightGreen: '#9ece6a',
  brightYellow: '#e0af68', brightBlue: '#7aa2f7', brightMagenta: '#bb9af7',
  brightCyan: '#7dcfff', brightWhite: '#c0caf5',
};
const XTERM_LIGHT = {
  background: '#fafafa', foreground: '#383a42', cursor: '#526fff', selectionBackground: '#d7d7ff',
  black: '#383a42', red: '#e45649', green: '#50a14f', yellow: '#c18401',
  blue: '#4078f2', magenta: '#a626a4', cyan: '#0184bc', white: '#a0a1a7',
  brightBlack: '#4f525e', brightRed: '#e45649', brightGreen: '#50a14f',
  brightYellow: '#c18401', brightBlue: '#4078f2', brightMagenta: '#a626a4',
  brightCyan: '#0184bc', brightWhite: '#fafafa',
};

const fileIcon = (name: string, isDir: boolean): { icon: string; color: string } => {
  if (isDir) return { icon: 'folder', color: 'text-cyan-400' };
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const m: Record<string, { icon: string; color: string }> = {
    ts: { icon: 'code', color: 'text-blue-400' }, tsx: { icon: 'code', color: 'text-blue-400' },
    js: { icon: 'javascript', color: 'text-yellow-400' }, jsx: { icon: 'javascript', color: 'text-yellow-400' },
    py: { icon: 'code', color: 'text-green-400' }, go: { icon: 'code', color: 'text-cyan-400' },
    rs: { icon: 'code', color: 'text-orange-400' }, java: { icon: 'code', color: 'text-red-400' },
    json: { icon: 'data_object', color: 'text-yellow-300' }, yaml: { icon: 'data_object', color: 'text-pink-300' },
    yml: { icon: 'data_object', color: 'text-pink-300' }, toml: { icon: 'data_object', color: 'text-orange-300' },
    md: { icon: 'article', color: 'text-text-muted' }, txt: { icon: 'article', color: 'text-text-muted' },
    sh: { icon: 'terminal', color: 'text-green-300' }, bash: { icon: 'terminal', color: 'text-green-300' },
    png: { icon: 'image', color: 'text-purple-400' }, jpg: { icon: 'image', color: 'text-purple-400' },
    jpeg: { icon: 'image', color: 'text-purple-400' }, gif: { icon: 'image', color: 'text-purple-400' },
    svg: { icon: 'image', color: 'text-purple-400' }, webp: { icon: 'image', color: 'text-purple-400' },
    zip: { icon: 'folder_zip', color: 'text-amber-400' }, tar: { icon: 'folder_zip', color: 'text-amber-400' },
    gz: { icon: 'folder_zip', color: 'text-amber-400' }, rar: { icon: 'folder_zip', color: 'text-amber-400' },
    pdf: { icon: 'picture_as_pdf', color: 'text-red-400' },
    lock: { icon: 'lock', color: 'text-text-muted' }, log: { icon: 'receipt_long', color: 'text-text-muted' },
    css: { icon: 'css', color: 'text-blue-300' }, html: { icon: 'html', color: 'text-orange-400' },
    sql: { icon: 'database', color: 'text-blue-300' }, env: { icon: 'vpn_key', color: 'text-amber-300' },
  };
  return m[ext] || { icon: 'description', color: 'text-text-muted' };
};

const SFTP_PANEL_MIN = 120;
const SFTP_PANEL_MAX = 500;
const SFTP_PANEL_DEFAULT = 220;
const SYSINFO_WIDTH = 220;
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

  const [tabs, setTabs] = useState<TabState[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const tabsRef = useRef<TabState[]>([]);
  tabsRef.current = tabs;
  const termContainerRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const [sftpHeight, setSftpHeight] = useState(SFTP_PANEL_DEFAULT);
  const resizingRef = useRef(false);
  const [bottomTab, setBottomTab] = useState<BottomTab>('files');
  const [snippetForm, setSnippetForm] = useState({ name: '', command: '' });
  const [snippetAdding, setSnippetAdding] = useState(false);

  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const obs = new MutationObserver(() => setIsDark(document.documentElement.classList.contains('dark')));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const activeTab = useMemo(() => tabs.find((tb) => tb.id === activeTabId) || null, [tabs, activeTabId]);

  const loadHosts = useCallback(async () => {
    try { setLoading(true); const list = await sshHostsApi.list(); setHosts(list || []); }
    catch { toast('error', tt.loadFailed || 'Failed to load hosts'); }
    finally { setLoading(false); }
  }, [toast, tt]);

  useEffect(() => { loadHosts(); }, [loadHosts]);

  useEffect(() => {
    return () => { tabsRef.current.forEach((tab) => { tab.wsClient?.disconnect(); tab.xterm?.dispose(); tab.resizeObserver?.disconnect(); }); };
  }, []);

  const updateTab = useCallback((id: string, patch: Partial<TabState>) => {
    setTabs((prev) => prev.map((tab) => (tab.id === id ? { ...tab, ...patch } : tab)));
  }, []);

  const refitActiveTerminal = useCallback(() => {
    if (!activeTab?.fitAddon) return;
    setTimeout(() => { try { activeTab.fitAddon!.fit(); } catch { /* */ } }, 60);
  }, [activeTab]);

  // Mount xterm when tab container available
  useEffect(() => {
    if (!activeTab?.xterm) return;
    const container = termContainerRefs.current[activeTab.id];
    if (!container) return;
    if (container.querySelector('.xterm')) { try { activeTab.fitAddon?.fit(); } catch { /* */ } return; }
    activeTab.xterm.open(container);
    if (activeTab.fitAddon) try { activeTab.fitAddon.fit(); } catch { /* */ }
    if (activeTab.resizeObserver) activeTab.resizeObserver.disconnect();
    const ro = new ResizeObserver(() => { if (activeTab.fitAddon) try { activeTab.fitAddon.fit(); } catch { /* */ } });
    ro.observe(container);
    activeTab.resizeObserver = ro;
    activeTab.xterm.focus();
  }, [activeTabId, activeTab?.xterm]);

  // Theme sync
  useEffect(() => {
    tabs.forEach((tab) => { if (tab.xterm) tab.xterm.options.theme = isDark ? XTERM_DARK : XTERM_LIGHT; });
  }, [isDark, tabs]);

  const connectToHost = useCallback(async (host: SSHHost) => {
    const tabId = `tab-${++tabCounter}`;
    const newTab: TabState = {
      id: tabId, hostName: host.name, hostId: host.id,
      sessionId: null, connecting: true, sftpOpen: false,
      xterm: null, fitAddon: null, wsClient: null, resizeObserver: null,
      sftpPath: '/', sftpEntries: [], sftpLoading: false,
      treeCache: {}, expandedDirs: new Set(), treeLoading: new Set(),
      sysInfo: null, sysInfoOpen: false, netHistory: [],
      snippets: [], snippetsLoaded: false,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(tabId);
    setView('sessions');

    const xterm = new XTerm({
      cursorBlink: true, fontSize: 14,
      fontFamily: 'JetBrains Mono, Consolas, monospace',
      theme: isDark ? XTERM_DARK : XTERM_LIGHT, allowProposedApi: true,
    });
    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);
    xterm.loadAddon(new WebLinksAddon());
    xterm.writeln(`\x1b[36m⟡ Connecting to ${host.name} (${host.username}@${host.host}:${host.port})...\x1b[0m`);

    const client = new TerminalWSClient();
    try { await client.connect(); } catch {
      xterm.writeln('\x1b[31m✗ WebSocket connection failed\x1b[0m');
      updateTab(tabId, { connecting: false, xterm, fitAddon, wsClient: client });
      return;
    }

    let sid = '';
    client.on('terminal.created', (msg: TerminalMessage) => {
      const p = msg.payload as TerminalCreatedPayload; sid = p.sessionId;
      updateTab(tabId, { sessionId: p.sessionId, connecting: false });
      xterm.writeln(`\x1b[32m✓ Connected (session: ${p.sessionId})\x1b[0m\r\n`);
      xterm.focus();
    });
    client.on('terminal.output', (msg: TerminalMessage) => { xterm.write((msg.payload as TerminalOutputPayload).data); });
    client.on('terminal.exit', (msg: TerminalMessage) => {
      xterm.writeln(`\r\n\x1b[33m⟡ Session ended: ${(msg.payload as TerminalExitPayload).reason}\x1b[0m`);
      updateTab(tabId, { sessionId: null });
    });
    client.on('terminal.error', (msg: TerminalMessage) => {
      xterm.writeln(`\r\n\x1b[31m✗ Error: ${(msg.payload as TerminalErrorPayload).message}\x1b[0m`);
      updateTab(tabId, { connecting: false });
    });
    xterm.onData((data: string) => { if (sid) client.sendInput(sid, data); });
    xterm.onResize(({ cols, rows }) => { if (sid) client.resizeSession(sid, cols, rows); });

    updateTab(tabId, { xterm, fitAddon, wsClient: client });
    requestAnimationFrame(() => {
      const container = termContainerRefs.current[tabId];
      if (container) {
        xterm.open(container); fitAddon.fit();
        const ro = new ResizeObserver(() => { try { fitAddon.fit(); } catch { /* */ } });
        ro.observe(container);
        updateTab(tabId, { resizeObserver: ro });
      }
      const dims = fitAddon.proposeDimensions();
      client.createSession(host.id, dims?.cols || 120, dims?.rows || 30);
    });
  }, [updateTab, isDark]);

  const closeTab = useCallback((tabId: string) => {
    const tab = tabsRef.current.find((tb) => tb.id === tabId);
    if (tab) {
      if (tab.sessionId && tab.wsClient) tab.wsClient.closeSession(tab.sessionId);
      tab.wsClient?.disconnect(); tab.xterm?.dispose(); tab.resizeObserver?.disconnect();
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

  // SFTP toggle — terminal stays mounted
  const toggleSFTP = useCallback(async () => {
    if (!activeTab) return;
    if (activeTab.sftpOpen) { updateTab(activeTab.id, { sftpOpen: false }); refitActiveTerminal(); return; }
    if (!activeTab.sessionId) { toast('error', tt.sftpNeedSession || 'SFTP requires an active session'); return; }
    updateTab(activeTab.id, { sftpOpen: true, sftpLoading: true });
    refitActiveTerminal();
    try {
      const result = await sftpApi.list(activeTab.sessionId);
      const newCache = { ...activeTab.treeCache, [result.path]: result.entries };
      const newExpanded = new Set(activeTab.expandedDirs); newExpanded.add(result.path);
      updateTab(activeTab.id, { sftpPath: result.path, sftpEntries: result.entries, sftpLoading: false, treeCache: newCache, expandedDirs: newExpanded });
    } catch (e: any) {
      toast('error', e?.message || 'SFTP list failed');
      updateTab(activeTab.id, { sftpLoading: false, sftpOpen: false }); refitActiveTerminal();
    }
  }, [activeTab, updateTab, toast, tt, refitActiveTerminal]);

  const sftpNavigate = useCallback(async (path: string) => {
    if (!activeTab?.sessionId) return;
    updateTab(activeTab.id, { sftpLoading: true });
    try {
      const result = await sftpApi.list(activeTab.sessionId, path);
      const newCache = { ...activeTab.treeCache, [result.path]: result.entries };
      const newExpanded = new Set(activeTab.expandedDirs); newExpanded.add(result.path);
      updateTab(activeTab.id, { sftpPath: result.path, sftpEntries: result.entries, sftpLoading: false, treeCache: newCache, expandedDirs: newExpanded });
    } catch (e: any) { toast('error', e?.message || 'SFTP list failed'); updateTab(activeTab.id, { sftpLoading: false }); }
  }, [activeTab, updateTab, toast]);

  // Toggle tree directory expand/collapse with lazy loading
  const toggleTreeDir = useCallback(async (dirPath: string) => {
    if (!activeTab?.sessionId) return;
    const expanded = activeTab.expandedDirs;
    if (expanded.has(dirPath)) {
      const newExpanded = new Set(expanded); newExpanded.delete(dirPath);
      updateTab(activeTab.id, { expandedDirs: newExpanded });
      return;
    }
    // If already cached, just expand
    if (activeTab.treeCache[dirPath]) {
      const newExpanded = new Set(expanded); newExpanded.add(dirPath);
      updateTab(activeTab.id, { expandedDirs: newExpanded });
      return;
    }
    // Lazy load
    const newLoading = new Set(activeTab.treeLoading); newLoading.add(dirPath);
    updateTab(activeTab.id, { treeLoading: newLoading });
    try {
      const result = await sftpApi.list(activeTab.sessionId, dirPath);
      const newCache = { ...activeTab.treeCache, [dirPath]: result.entries };
      const newExpanded = new Set(activeTab.expandedDirs); newExpanded.add(dirPath);
      const doneLoading = new Set(activeTab.treeLoading); doneLoading.delete(dirPath);
      updateTab(activeTab.id, { treeCache: newCache, expandedDirs: newExpanded, treeLoading: doneLoading });
    } catch (e: any) {
      toast('error', e?.message || 'Failed to load directory');
      const doneLoading = new Set(activeTab.treeLoading); doneLoading.delete(dirPath);
      updateTab(activeTab.id, { treeLoading: doneLoading });
    }
  }, [activeTab, updateTab, toast]);

  const sftpDownload = useCallback((entry: FileEntry) => {
    if (!activeTab?.sessionId || entry.is_dir) return;
    const a = document.createElement('a'); a.href = sftpApi.downloadUrl(activeTab.sessionId, entry.path); a.download = entry.name; a.click();
  }, [activeTab]);

  const sftpUpload = useCallback(async (file: File) => {
    if (!activeTab?.sessionId) return;
    try { await sftpApi.upload(activeTab.sessionId, activeTab.sftpPath + '/', file); toast('success', (tt.sftpUploaded || 'Uploaded: {name}').replace('{name}', file.name)); sftpNavigate(activeTab.sftpPath); }
    catch (e: any) { toast('error', e?.message || 'Upload failed'); }
  }, [activeTab, toast, tt, sftpNavigate]);

  const sftpUploadMulti = useCallback(async (files: File[]) => {
    if (!activeTab?.sessionId || files.length === 0) return;
    let ok = 0, fail = 0;
    for (const file of files) { try { await sftpApi.upload(activeTab.sessionId, activeTab.sftpPath + '/', file); ok++; } catch { fail++; } }
    if (ok > 0) toast('success', (tt.sftpUploadedCount || '{n} file(s) uploaded').replace('{n}', String(ok)));
    if (fail > 0) toast('error', (tt.sftpUploadFailed || '{n} file(s) failed').replace('{n}', String(fail)));
    sftpNavigate(activeTab.sftpPath);
  }, [activeTab, toast, tt, sftpNavigate]);

  const handleDragEnter = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); dragCounterRef.current++; if (e.dataTransfer.types.includes('Files')) setDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); dragCounterRef.current--; if (dragCounterRef.current <= 0) { dragCounterRef.current = 0; setDragging(false); } }, []);
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); dragCounterRef.current = 0; setDragging(false); const files = Array.from(e.dataTransfer.files); if (files.length > 0) sftpUploadMulti(files); }, [sftpUploadMulti]);

  const sftpMkdir = useCallback(async () => {
    if (!activeTab?.sessionId) return;
    const name = prompt(tt.sftpNewFolder || 'New folder name:');
    if (!name) return;
    try { await sftpApi.mkdir(activeTab.sessionId, activeTab.sftpPath === '/' ? `/${name}` : `${activeTab.sftpPath}/${name}`); sftpNavigate(activeTab.sftpPath); }
    catch (e: any) { toast('error', e?.message || 'Mkdir failed'); }
  }, [activeTab, toast, tt, sftpNavigate]);

  const sftpRemove = useCallback(async (entry: FileEntry) => {
    if (!activeTab?.sessionId) return;
    const ok = await confirm({ title: tt.sftpDeleteTitle || 'Delete', message: (tt.sftpDeleteMsg || 'Delete "{name}"?').replace('{name}', entry.name), danger: true });
    if (!ok) return;
    try { await sftpApi.remove(activeTab.sessionId, entry.path); toast('success', (tt.sftpDeleted || 'Deleted: {name}').replace('{name}', entry.name)); sftpNavigate(activeTab.sftpPath); }
    catch (e: any) { toast('error', e?.message || 'Delete failed'); }
  }, [activeTab, confirm, toast, tt, sftpNavigate]);

  const breadcrumbs = useMemo(() => {
    if (!activeTab) return [];
    const p = activeTab.sftpPath;
    if (p === '/') return [{ label: '/', path: '/' }];
    const parts = p.split('/').filter(Boolean);
    const result = [{ label: '/', path: '/' }];
    let acc = '';
    for (const part of parts) { acc += '/' + part; result.push({ label: part, path: acc }); }
    return result;
  }, [activeTab?.sftpPath]);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); resizingRef.current = true;
    const startY = e.clientY; const startH = sftpHeight;
    const onMove = (ev: MouseEvent) => { if (!resizingRef.current) return; setSftpHeight(Math.max(SFTP_PANEL_MIN, Math.min(SFTP_PANEL_MAX, startH + (startY - ev.clientY)))); };
    const onUp = () => { resizingRef.current = false; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); refitActiveTerminal(); };
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
  }, [sftpHeight, refitActiveTerminal]);

  // Server status
  const NET_HISTORY_MAX = 30;
  const fetchSysInfo = useCallback(async () => {
    if (!activeTab?.sessionId) return;
    try {
      const info = await sysInfoApi.get(activeTab.sessionId);
      // Accumulate total RX/TX for sparkline
      const totalRx = info.network.reduce((s, n) => s + n.rx_bytes, 0);
      const totalTx = info.network.reduce((s, n) => s + n.tx_bytes, 0);
      const prev = activeTab.netHistory;
      const next = [...prev, { rx: totalRx, tx: totalTx }].slice(-NET_HISTORY_MAX);
      updateTab(activeTab.id, { sysInfo: info, netHistory: next });
    } catch { /* silent */ }
  }, [activeTab, updateTab]);

  const toggleSysInfo = useCallback(() => {
    if (!activeTab) return;
    if (activeTab.sysInfoOpen) { updateTab(activeTab.id, { sysInfoOpen: false }); return; }
    if (!activeTab.sessionId) { toast('error', tt.sysInfoNeedSession || 'Requires an active session'); return; }
    updateTab(activeTab.id, { sysInfoOpen: true, netHistory: [] });
    fetchSysInfo();
  }, [activeTab, updateTab, toast, tt, fetchSysInfo]);

  // Auto-refresh sysinfo every 5s when open
  useEffect(() => {
    if (!activeTab?.sysInfoOpen || !activeTab?.sessionId) return;
    const iv = setInterval(fetchSysInfo, 5000);
    return () => clearInterval(iv);
  }, [activeTab?.sysInfoOpen, activeTab?.sessionId, fetchSysInfo]);

  // Snippets
  const loadSnippets = useCallback(async () => {
    if (!activeTab) return;
    try {
      const list = await snippetsApi.list(activeTab.hostId);
      updateTab(activeTab.id, { snippets: list || [], snippetsLoaded: true });
    } catch { /* silent */ }
  }, [activeTab, updateTab]);

  const addSnippet = useCallback(async () => {
    if (!activeTab || !snippetForm.name.trim() || !snippetForm.command.trim()) return;
    setSnippetAdding(true);
    try {
      await snippetsApi.create({ host_id: activeTab.hostId, name: snippetForm.name, command: snippetForm.command });
      setSnippetForm({ name: '', command: '' });
      loadSnippets();
    } catch (e: any) { toast('error', e?.message || 'Failed to save snippet'); }
    finally { setSnippetAdding(false); }
  }, [activeTab, snippetForm, toast, loadSnippets]);

  const deleteSnippet = useCallback(async (id: number) => {
    if (!await confirm(tt.deleteSnippetConfirm || 'Delete this command snippet?')) return;
    try { await snippetsApi.delete(id); loadSnippets(); }
    catch (e: any) { toast('error', e?.message || 'Delete failed'); }
  }, [confirm, toast, tt, loadSnippets]);

  const execSnippet = useCallback((command: string) => {
    if (!activeTab?.xterm || !activeTab?.wsClient) return;
    activeTab.wsClient.send('terminal.input', command + '\n');
  }, [activeTab]);

  // Load snippets when switching to commands tab
  useEffect(() => {
    if (bottomTab === 'commands' && activeTab && !activeTab.snippetsLoaded) { loadSnippets(); }
  }, [bottomTab, activeTab, loadSnippets]);

  const fmtBytes = (b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
    if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
    return `${(b / 1024 ** 3).toFixed(1)} GB`;
  };
  const fmtRate = (bps: number) => fmtBytes(bps) + '/s';
  const pctColor = (pct: number) => pct > 90 ? 'text-red-400' : pct > 70 ? 'text-amber-400' : 'text-green-400';
  const pctBarColor = (pct: number) => pct > 90 ? 'bg-red-400' : pct > 70 ? 'bg-amber-400' : 'bg-green-400';

  // Build rate series from cumulative netHistory (diff between consecutive samples)
  const netRates = useMemo(() => {
    if (!activeTab?.netHistory || activeTab.netHistory.length < 2) return [];
    const h = activeTab.netHistory;
    const rates: { rx: number; tx: number }[] = [];
    for (let i = 1; i < h.length; i++) {
      rates.push({ rx: Math.max(0, (h[i].rx - h[i - 1].rx) / 5), tx: Math.max(0, (h[i].tx - h[i - 1].tx) / 5) });
    }
    return rates;
  }, [activeTab?.netHistory]);

  // SVG sparkline renderer
  const renderSparkline = (data: number[], color: string, w: number, h: number) => {
    if (data.length < 2) return null;
    const max = Math.max(...data, 1);
    const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 2) - 1}`).join(' ');
    return (<polyline points={points} fill="none" stroke={color} strokeWidth="1.2" strokeLinejoin="round" />);
  };

  const handleSave = useCallback(async () => {
    if (!form.name.trim() || !form.host.trim() || !form.username.trim()) { toast('error', tt.fieldsRequired || 'Name, host, and username are required'); return; }
    setSaving(true);
    try {
      const req: SSHHostCreateRequest = { name: form.name, host: form.host, port: form.port || 22, username: form.username, auth_type: form.auth_type, password: form.auth_type === 'password' ? form.password : undefined, private_key: form.auth_type === 'key' ? form.private_key : undefined, passphrase: form.auth_type === 'key' ? form.passphrase : undefined, is_favorite: form.is_favorite };
      if (editId) { await sshHostsApi.update(editId, req); toast('success', tt.hostUpdated || 'Host updated'); }
      else { await sshHostsApi.create(req); toast('success', tt.hostCreated || 'Host created'); }
      setForm({ ...emptyForm }); setEditId(null); setView(tabs.length > 0 ? 'sessions' : 'hosts'); loadHosts();
    } catch (e: any) { toast('error', e?.message || 'Save failed'); } finally { setSaving(false); }
  }, [form, editId, toast, tt, loadHosts, tabs.length]);

  const handleTest = useCallback(async () => {
    setTesting(true);
    try {
      const result = await sshHostsApi.test({ name: form.name, host: form.host, port: form.port || 22, username: form.username, auth_type: form.auth_type, password: form.password, private_key: form.private_key, passphrase: form.passphrase });
      if (result.success) toast('success', tt.testSuccess || 'Connection successful');
      else toast('error', result.error || 'Connection failed');
    } catch (e: any) { toast('error', e?.message || 'Test failed'); } finally { setTesting(false); }
  }, [form, toast, tt]);

  const handleDelete = useCallback(async (host: SSHHost) => {
    const ok = await confirm({ title: tt.deleteConfirmTitle || 'Delete Host', message: (tt.deleteConfirmMsg || 'Delete "{name}"?').replace('{name}', host.name), danger: true });
    if (!ok) return;
    try { await sshHostsApi.delete(host.id); toast('success', tt.hostDeleted || 'Host deleted'); loadHosts(); }
    catch (e: any) { toast('error', e?.message || 'Delete failed'); }
  }, [confirm, toast, tt, loadHosts]);

  const startEdit = useCallback((host: SSHHost) => {
    setForm({ name: host.name, host: host.host, port: host.port, username: host.username, auth_type: host.auth_type, password: '', private_key: '', passphrase: '', is_favorite: host.is_favorite });
    setEditId(host.id); setView('edit');
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  // ═══════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════

  if (view === 'hosts') {
    return (
      <div className="h-full flex flex-col bg-surface text-text overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 dark:border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl text-cyan-400">terminal</span>
            <h2 className="text-base font-semibold">{tt.title || 'SSH Terminal'}</h2>
            {hosts.length > 0 && <span className="text-xs text-text-muted">({hosts.length})</span>}
          </div>
          <div className="flex items-center gap-2">
            {tabs.length > 0 && (
              <button onClick={() => setView('sessions')} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-white/5 text-text-muted hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
                {tt.backToSessions || 'Sessions'} ({tabs.length})
              </button>
            )}
            <button onClick={() => { setForm({ ...emptyForm }); setEditId(null); setView('add'); }} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 transition-colors">
              <span className="material-symbols-outlined text-sm">add</span>
              {tt.addHost || 'Add Host'}
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 neon-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-40"><span className="material-symbols-outlined animate-spin text-2xl text-text-muted">progress_activity</span></div>
          ) : hosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-muted gap-4 py-12">
              <div className="w-20 h-20 rounded-2xl bg-cyan-500/10 flex items-center justify-center"><span className="material-symbols-outlined text-4xl text-cyan-400/60">dns</span></div>
              <div className="text-center">
                <p className="text-sm font-medium mb-1">{tt.noHosts || 'No SSH hosts configured'}</p>
                <p className="text-xs opacity-60">{tt.noHostsHint || 'Add a server to get started'}</p>
              </div>
              <button onClick={() => { setForm({ ...emptyForm }); setEditId(null); setView('add'); }} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 transition-colors">
                <span className="material-symbols-outlined text-lg">add_circle</span>
                {tt.addFirstHost || 'Add your first host'}
              </button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {hosts.map((host) => (
                <div key={host.id} className="sci-card p-4 flex flex-col gap-3 group hover:border-cyan-500/30 transition-all cursor-pointer active:scale-[0.98]" style={{ animation: 'card-enter 0.3s ease-out' }} onClick={() => connectToHost(host)}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/15 flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-xl text-cyan-400">dns</span></div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5"><span className="text-sm font-semibold truncate">{host.name}</span>{host.is_favorite && <span className="material-symbols-outlined text-xs text-amber-400">star</span>}</div>
                        <p className="text-xs text-text-muted font-mono truncate mt-0.5">{host.username}@{host.host}:{host.port}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => startEdit(host)} className="p-1.5 rounded-lg hover:bg-white/10 text-text-muted hover:text-text transition-colors" title={tt.edit || 'Edit'}><span className="material-symbols-outlined text-sm">edit</span></button>
                      <button onClick={() => handleDelete(host)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-text-muted hover:text-red-400 transition-colors" title={tt.delete || 'Delete'}><span className="material-symbols-outlined text-sm">delete</span></button>
                    </div>
                  </div>
                  {host.last_connected_at && (
                    <div className="flex items-center gap-1 text-[10px] text-text-muted opacity-60"><span className="material-symbols-outlined" style={{ fontSize: '11px' }}>schedule</span>{new Date(host.last_connected_at).toLocaleDateString()}</div>
                  )}
                  <div className="flex items-center justify-end"><span className="flex items-center gap-1 text-[11px] text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">{tt.connect || 'Connect'} <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>arrow_forward</span></span></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Sessions view ──
  if (view === 'sessions') {
    const showSftp = activeTab?.sftpOpen ?? false;
    return (
      <div className={`h-full flex flex-col overflow-hidden ${isDark ? 'bg-[#1a1b26]' : 'bg-[#fafafa]'}`}>
        {/* Tab bar */}
        <div className={`flex items-center shrink-0 overflow-x-auto no-scrollbar border-b ${isDark ? 'bg-[#13141c] border-white/5' : 'bg-[#ececec] border-black/5'}`}>
          <div className="flex items-center flex-1 min-w-0 ps-1">
            {tabs.map((tab) => (
              <div key={tab.id} className={`flex items-center gap-1.5 px-3 py-2 text-xs cursor-pointer transition-all shrink-0 rounded-t-lg mx-0.5 ${tab.id === activeTabId ? (isDark ? 'bg-[#1a1b26] text-white shadow-sm' : 'bg-white text-gray-800 shadow-sm') : (isDark ? 'text-white/40 hover:text-white/70 hover:bg-white/5' : 'text-gray-500 hover:text-gray-700 hover:bg-black/5')}`} onClick={() => setActiveTabId(tab.id)}>
                {tab.connecting ? (<span className="material-symbols-outlined text-[11px] text-amber-400 animate-spin">progress_activity</span>) : tab.sessionId ? (<span className="w-2 h-2 rounded-full bg-green-400 shrink-0 shadow-[0_0_4px_rgba(74,222,128,0.5)]" />) : (<span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />)}
                <span className="truncate max-w-[120px] font-medium">{tab.hostName}</span>
                <button onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }} className={`ms-1 p-0.5 rounded-full transition-colors ${isDark ? 'hover:bg-white/10 text-white/20 hover:text-white/60' : 'hover:bg-black/10 text-black/20 hover:text-black/60'}`}><span className="material-symbols-outlined" style={{ fontSize: '12px' }}>close</span></button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1 px-2 shrink-0">
            <button onClick={() => setView('hosts')} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-white/40 hover:text-white/70' : 'hover:bg-black/10 text-black/40 hover:text-black/70'}`} title={tt.addHost || 'Add Host'}><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span></button>
          </div>
        </div>

        {/* Info bar */}
        {activeTab && (
          <div className={`flex items-center justify-between px-3 py-1.5 shrink-0 border-b ${isDark ? 'bg-[#1e1f2e] border-white/5' : 'bg-[#f5f5f5] border-black/5'}`}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-sm text-cyan-400">terminal</span>
              <span className={`text-xs font-mono truncate ${isDark ? 'text-white/60' : 'text-gray-500'}`}>{activeTab.hostName}</span>
              {activeTab.sessionId && (<span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded-full bg-green-500/15 text-green-500 font-medium"><span className="w-1 h-1 rounded-full bg-green-400" />{tt.connected || 'Connected'}</span>)}
              {!activeTab.sessionId && !activeTab.connecting && (<span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded-full bg-red-500/15 text-red-400 font-medium">{tt.disconnected || 'Disconnected'}</span>)}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={toggleSysInfo} className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg transition-all ${activeTab.sysInfoOpen ? 'bg-purple-500/20 text-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.15)]' : isDark ? 'text-white/40 hover:text-white/70 hover:bg-white/10' : 'text-gray-400 hover:text-gray-600 hover:bg-black/5'}`} title={tt.serverStatus || 'Server Status'}>
                <span className="material-symbols-outlined text-sm">monitoring</span>
                <span className="hidden sm:inline">{tt.status || 'Status'}</span>
              </button>
              <button onClick={toggleSFTP} className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg transition-all ${showSftp ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.15)]' : isDark ? 'text-white/40 hover:text-white/70 hover:bg-white/10' : 'text-gray-400 hover:text-gray-600 hover:bg-black/5'}`} title={tt.sftpToggle || 'File Browser'}>
                <span className="material-symbols-outlined text-sm">{showSftp ? 'folder_open' : 'folder'}</span>
                <span className="hidden sm:inline">{tt.files || 'Files'}</span>
              </button>
              <button onClick={() => closeTab(activeTab.id)} className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-colors ${isDark ? 'text-red-400/70 hover:bg-red-500/15 hover:text-red-400' : 'text-red-400 hover:bg-red-500/10'}`}>
                <span className="material-symbols-outlined text-sm">power_settings_new</span>
                <span className="hidden sm:inline">{tt.disconnect || 'Disconnect'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Main: sysinfo left sidebar | (terminal top + SFTP bottom) */}
        <div className="flex-1 min-h-0 relative flex">

          {/* ── Left: Sysinfo sidebar ── */}
          {activeTab?.sysInfoOpen && (
            <div className={`shrink-0 flex flex-col overflow-hidden border-e ${isDark ? 'bg-[#14151d] border-white/5' : 'bg-[#f0f0f0] border-black/5'}`} style={{ width: SYSINFO_WIDTH, animation: 'fade-in 0.2s ease-out' }}>
              {/* Sidebar header */}
              <div className={`flex items-center justify-between px-2.5 py-2 border-b shrink-0 ${isDark ? 'border-white/5' : 'border-black/5'}`}>
                <span className="flex items-center gap-1.5 text-[11px] font-semibold"><span className="material-symbols-outlined text-sm text-purple-400">monitoring</span>{tt.serverStatus || 'Server Status'}</span>
                <div className="flex items-center gap-0.5">
                  <button onClick={fetchSysInfo} className={`p-0.5 rounded transition-colors ${isDark ? 'hover:bg-white/10 text-white/30' : 'hover:bg-black/5 text-gray-400'}`}><span className="material-symbols-outlined" style={{ fontSize: '14px' }}>refresh</span></button>
                  <button onClick={toggleSysInfo} className={`p-0.5 rounded transition-colors ${isDark ? 'hover:bg-white/10 text-white/30' : 'hover:bg-black/5 text-gray-400'}`}><span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span></button>
                </div>
              </div>
              {/* Sidebar content */}
              <div className="flex-1 overflow-y-auto neon-scrollbar">
                {!activeTab.sysInfo ? (
                  <div className="flex items-center justify-center py-12"><span className="material-symbols-outlined animate-spin text-lg text-text-muted">progress_activity</span></div>
                ) : (
                  <div className="p-2 space-y-2">
                    {/* Hostname + Kernel */}
                    <div className={`text-[10px] font-mono px-1.5 py-1 rounded ${isDark ? 'bg-white/5 text-white/50' : 'bg-black/[.03] text-black/50'}`}>
                      <div className="truncate">{activeTab.sysInfo.hostname}</div>
                      <div className="truncate">{activeTab.sysInfo.kernel}</div>
                    </div>
                    {/* Uptime */}
                    <div className={`flex items-center gap-1 text-[10px] px-1.5 ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                      <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>schedule</span>
                      <span className="truncate">{activeTab.sysInfo.uptime}</span>
                    </div>
                    {/* Load */}
                    <div className={`flex items-center gap-1 text-[10px] px-1.5 ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                      <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>speed</span>
                      <span>{activeTab.sysInfo.load_avg.load1} / {activeTab.sysInfo.load_avg.load5} / {activeTab.sysInfo.load_avg.load15}</span>
                    </div>
                    {/* CPU gauge */}
                    <div className={`rounded-lg p-2 ${isDark ? 'bg-white/5' : 'bg-black/[.03]'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="flex items-center gap-1 text-[10px] font-medium"><span className="material-symbols-outlined" style={{ fontSize: '12px' }}>memory</span>CPU</span>
                        <span className={`text-[10px] font-bold ${pctColor(activeTab.sysInfo.cpu.use_pct)}`}>{activeTab.sysInfo.cpu.use_pct}%</span>
                      </div>
                      <div className={`w-full h-1 rounded-full ${isDark ? 'bg-white/10' : 'bg-black/10'}`}><div className={`h-full rounded-full transition-all ${pctBarColor(activeTab.sysInfo.cpu.use_pct)}`} style={{ width: `${Math.min(100, activeTab.sysInfo.cpu.use_pct)}%` }} /></div>
                      <div className={`flex justify-between mt-1 text-[9px] ${isDark ? 'text-white/25' : 'text-black/25'}`}>
                        <span>{activeTab.sysInfo.cpu.cores} {tt.cores || 'cores'}</span>
                        <span>u{activeTab.sysInfo.cpu.user_pct}% s{activeTab.sysInfo.cpu.sys_pct}%</span>
                      </div>
                    </div>
                    {/* Memory gauge */}
                    <div className={`rounded-lg p-2 ${isDark ? 'bg-white/5' : 'bg-black/[.03]'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="flex items-center gap-1 text-[10px] font-medium"><span className="material-symbols-outlined" style={{ fontSize: '12px' }}>memory_alt</span>{tt.memory || 'Mem'}</span>
                        <span className={`text-[10px] font-bold ${pctColor(activeTab.sysInfo.memory.use_pct)}`}>{activeTab.sysInfo.memory.use_pct}%</span>
                      </div>
                      <div className={`w-full h-1 rounded-full ${isDark ? 'bg-white/10' : 'bg-black/10'}`}><div className={`h-full rounded-full transition-all ${pctBarColor(activeTab.sysInfo.memory.use_pct)}`} style={{ width: `${Math.min(100, activeTab.sysInfo.memory.use_pct)}%` }} /></div>
                      <div className={`flex justify-between mt-1 text-[9px] ${isDark ? 'text-white/25' : 'text-black/25'}`}>
                        <span>{fmtBytes(activeTab.sysInfo.memory.used)}</span>
                        <span>{fmtBytes(activeTab.sysInfo.memory.total)}</span>
                      </div>
                    </div>
                    {/* Swap gauge */}
                    <div className={`rounded-lg p-2 ${isDark ? 'bg-white/5' : 'bg-black/[.03]'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="flex items-center gap-1 text-[10px] font-medium"><span className="material-symbols-outlined" style={{ fontSize: '12px' }}>swap_horiz</span>Swap</span>
                        <span className={`text-[10px] font-bold ${activeTab.sysInfo.swap.total > 0 ? pctColor(activeTab.sysInfo.swap.use_pct) : (isDark ? 'text-white/25' : 'text-black/25')}`}>{activeTab.sysInfo.swap.total > 0 ? `${activeTab.sysInfo.swap.use_pct}%` : 'N/A'}</span>
                      </div>
                      <div className={`w-full h-1 rounded-full ${isDark ? 'bg-white/10' : 'bg-black/10'}`}>{activeTab.sysInfo.swap.total > 0 && <div className={`h-full rounded-full transition-all ${pctBarColor(activeTab.sysInfo.swap.use_pct)}`} style={{ width: `${Math.min(100, activeTab.sysInfo.swap.use_pct)}%` }} />}</div>
                      <div className={`flex justify-between mt-1 text-[9px] ${isDark ? 'text-white/25' : 'text-black/25'}`}>
                        <span>{activeTab.sysInfo.swap.total > 0 ? fmtBytes(activeTab.sysInfo.swap.used) : '-'}</span>
                        <span>{activeTab.sysInfo.swap.total > 0 ? fmtBytes(activeTab.sysInfo.swap.total) : '-'}</span>
                      </div>
                    </div>
                    {/* Process list */}
                    {activeTab.sysInfo.processes?.length > 0 && (
                      <div>
                        <div className={`flex items-center justify-between px-1 mb-1`}>
                          <span className="flex items-center gap-1 text-[10px] font-medium"><span className="material-symbols-outlined" style={{ fontSize: '12px' }}>list</span>{tt.processes || 'Processes'}</span>
                          <span className={`text-[9px] ${isDark ? 'text-white/20' : 'text-black/20'}`}>MEM CPU</span>
                        </div>
                        <div className={`rounded-lg overflow-hidden ${isDark ? 'bg-white/5' : 'bg-black/[.03]'}`}>
                          {activeTab.sysInfo.processes.map((p, i) => (
                            <div key={`${p.pid}-${i}`} className={`flex items-center gap-1 px-1.5 py-[3px] text-[9px] font-mono ${i % 2 === 0 ? '' : isDark ? 'bg-white/[.02]' : 'bg-black/[.015]'}`}>
                              <span className={`w-3 text-end shrink-0 ${isDark ? 'text-white/20' : 'text-black/20'}`}>{i + 1}</span>
                              <span className={`flex-1 min-w-0 truncate ${isDark ? 'text-white/60' : 'text-black/60'}`}>{p.name}</span>
                              <span className={`shrink-0 w-8 text-end ${pctColor(p.mem_pct)}`}>{p.mem_pct}%</span>
                              <span className={`shrink-0 w-8 text-end ${pctColor(p.cpu_pct)}`}>{p.cpu_pct}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Disks */}
                    {activeTab.sysInfo.disks.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1 px-1 mb-1"><span className="material-symbols-outlined" style={{ fontSize: '12px', color: 'var(--glow-purple, #a855f7)' }}>hard_drive_2</span><span className="text-[10px] font-medium">{tt.disks || 'Disks'}</span></div>
                        {activeTab.sysInfo.disks.map((d) => (
                          <div key={d.mount} className={`px-1.5 py-1 rounded text-[9px] mb-1 ${isDark ? 'bg-white/5' : 'bg-black/[.03]'}`}>
                            <div className="flex items-center justify-between mb-0.5">
                              <span className={`font-mono truncate ${isDark ? 'text-white/40' : 'text-black/40'}`}>{d.mount}</span>
                              <span className={`font-medium ${pctColor(d.use_pct)}`}>{d.use_pct}%</span>
                            </div>
                            <div className={`w-full h-1 rounded-full ${isDark ? 'bg-white/10' : 'bg-black/10'}`}><div className={`h-full rounded-full ${pctBarColor(d.use_pct)}`} style={{ width: `${Math.min(100, d.use_pct)}%` }} /></div>
                            <div className={`text-[8px] mt-0.5 ${isDark ? 'text-white/20' : 'text-black/20'}`}>{fmtBytes(d.used)} / {fmtBytes(d.total)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Network */}
                    {activeTab.sysInfo.network.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1 px-1 mb-1"><span className="material-symbols-outlined" style={{ fontSize: '12px', color: 'var(--glow-purple, #a855f7)' }}>lan</span><span className="text-[10px] font-medium">{tt.network || 'Network'}</span></div>
                        {/* Sparkline chart */}
                        {netRates.length >= 2 && (
                          <div className={`rounded-lg p-1.5 mb-1.5 ${isDark ? 'bg-white/5' : 'bg-black/[.03]'}`}>
                            <div className="flex items-center justify-between mb-1 text-[8px]">
                              <span className="text-green-400 flex items-center gap-0.5"><span className="material-symbols-outlined" style={{ fontSize: '9px' }}>download</span>{fmtRate(netRates[netRates.length - 1].rx)}</span>
                              <span className="text-blue-400 flex items-center gap-0.5"><span className="material-symbols-outlined" style={{ fontSize: '9px' }}>upload</span>{fmtRate(netRates[netRates.length - 1].tx)}</span>
                            </div>
                            <svg width="100%" height="32" viewBox={`0 0 ${SYSINFO_WIDTH - 24} 32`} preserveAspectRatio="none">
                              {renderSparkline(netRates.map((r) => r.rx), '#4ade80', SYSINFO_WIDTH - 24, 32)}
                              {renderSparkline(netRates.map((r) => r.tx), '#60a5fa', SYSINFO_WIDTH - 24, 32)}
                            </svg>
                          </div>
                        )}
                        {activeTab.sysInfo.network.map((n) => (
                          <div key={n.name} className={`px-1.5 py-1 rounded text-[9px] mb-1 ${isDark ? 'bg-white/5' : 'bg-black/[.03]'}`}>
                            <div className={`font-mono mb-0.5 ${isDark ? 'text-white/40' : 'text-black/40'}`}>{n.name}</div>
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-0.5 text-green-400"><span className="material-symbols-outlined" style={{ fontSize: '10px' }}>download</span>{fmtBytes(n.rx_bytes)}</span>
                              <span className="flex items-center gap-0.5 text-blue-400"><span className="material-symbols-outlined" style={{ fontSize: '10px' }}>upload</span>{fmtBytes(n.tx_bytes)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Right: terminal (top) + SFTP (bottom) ── */}
          <div className="flex-1 min-w-0 min-h-0 flex flex-col">
            {/* Terminal area */}
            <div className="flex-1 min-h-0 relative">
              {tabs.map((tab) => (
                <div key={tab.id} className="absolute inset-0" style={{ display: tab.id === activeTabId ? 'block' : 'none' }}>
                  <div ref={(el) => { termContainerRefs.current[tab.id] = el; }} className="w-full h-full p-1" />
                  {!tab.sessionId && !tab.connecting && (
                    <div className={`absolute inset-0 flex items-center justify-center z-10 ${isDark ? 'bg-black/40' : 'bg-white/60'} backdrop-blur-sm`}>
                      <div className="flex flex-col items-center gap-3 text-center">
                        <span className={`material-symbols-outlined text-3xl ${isDark ? 'text-white/30' : 'text-black/20'}`}>link_off</span>
                        <p className={`text-sm ${isDark ? 'text-white/50' : 'text-black/40'}`}>{tt.sessionEnded || 'Session ended'}</p>
                        <button onClick={() => { const h = hosts.find((x) => x.id === tab.hostId); if (h) { closeTab(tab.id); connectToHost(h); } }} className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors">
                          <span className="material-symbols-outlined text-sm">refresh</span>{tt.reconnect || 'Reconnect'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {tabs.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <div className={`text-center ${isDark ? 'text-white/20' : 'text-black/20'}`}>
                    <span className="material-symbols-outlined text-5xl mb-3 block">terminal</span>
                    <p className="text-sm font-medium">{tt.noTabs || 'No active sessions'}</p>
                    <button onClick={() => setView('hosts')} className="text-xs text-cyan-400 mt-3 hover:underline">{tt.connectHost || 'Connect to a host'}</button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Bottom panel (Files / Commands) ── */}
            {showSftp && activeTab && (
              <>
                <div className={`h-1 cursor-row-resize shrink-0 transition-colors hover:bg-cyan-400/30 active:bg-cyan-400/50 ${isDark ? 'bg-white/5' : 'bg-black/5'}`} onMouseDown={startResize} />
                <div className={`shrink-0 flex flex-col overflow-hidden border-t relative ${isDark ? 'bg-[#16171f] border-white/5' : 'bg-white border-black/5'}`} style={{ height: sftpHeight, animation: 'fade-in 0.15s ease-out' }} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}>
                  {dragging && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-cyan-500/10 border-2 border-dashed border-cyan-400 rounded-xl backdrop-blur-sm pointer-events-none">
                      <div className="flex flex-col items-center gap-2 text-cyan-400"><span className="material-symbols-outlined text-3xl">cloud_upload</span><span className="text-xs font-medium">{tt.sftpDropHere || 'Drop files to upload'}</span></div>
                    </div>
                  )}
                  {/* Header with tabs */}
                  <div className={`flex items-center justify-between px-2 py-1 border-b shrink-0 ${isDark ? 'border-white/5' : 'border-black/5'}`}>
                    <div className="flex items-center gap-0.5">
                      {/* Tab: Files */}
                      <button onClick={() => setBottomTab('files')} className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${bottomTab === 'files' ? (isDark ? 'bg-cyan-500/15 text-cyan-400' : 'bg-cyan-500/10 text-cyan-600') : isDark ? 'text-white/40 hover:text-white/70 hover:bg-white/5' : 'text-gray-400 hover:text-gray-600 hover:bg-black/5'}`}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>folder_open</span>{tt.files || 'Files'}
                      </button>
                      {/* Tab: Commands */}
                      <button onClick={() => setBottomTab('commands')} className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${bottomTab === 'commands' ? (isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-500/10 text-amber-600') : isDark ? 'text-white/40 hover:text-white/70 hover:bg-white/5' : 'text-gray-400 hover:text-gray-600 hover:bg-black/5'}`}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>code</span>{tt.commands || 'Commands'}
                      </button>
                      {/* Breadcrumb (files tab only) */}
                      {bottomTab === 'files' && (
                        <div className="flex items-center gap-0.5 text-[11px] overflow-x-auto no-scrollbar ms-2">
                          {breadcrumbs.map((bc, i) => (
                            <React.Fragment key={bc.path}>
                              {i > 0 && <span className={isDark ? 'text-white/20' : 'text-black/20'} style={{ fontSize: '10px' }}>/</span>}
                              <button onClick={() => sftpNavigate(bc.path)} className={`px-1 py-0.5 rounded transition-colors font-mono shrink-0 ${i === breadcrumbs.length - 1 ? 'text-cyan-400 font-semibold' : isDark ? 'text-white/40 hover:text-white/70 hover:bg-white/5' : 'text-gray-400 hover:text-gray-600 hover:bg-black/5'}`}>{bc.label}</button>
                            </React.Fragment>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5">
                      {bottomTab === 'files' && (
                        <>
                          <button onClick={() => { const newCache = { ...activeTab.treeCache }; Object.keys(newCache).forEach((k) => { if (k === activeTab.sftpPath) delete newCache[k]; }); updateTab(activeTab.id, { treeCache: newCache }); sftpNavigate(activeTab.sftpPath); }} className={`p-1 rounded-md transition-colors ${isDark ? 'hover:bg-white/10 text-white/40' : 'hover:bg-black/5 text-gray-400'}`} title={tt.sftpRefresh || 'Refresh'}><span className="material-symbols-outlined text-sm">refresh</span></button>
                          <button onClick={sftpMkdir} className={`p-1 rounded-md transition-colors ${isDark ? 'hover:bg-white/10 text-white/40' : 'hover:bg-black/5 text-gray-400'}`} title={tt.sftpNewFolder || 'New Folder'}><span className="material-symbols-outlined text-sm">create_new_folder</span></button>
                          <button onClick={() => uploadInputRef.current?.click()} className={`p-1 rounded-md transition-colors ${isDark ? 'hover:bg-white/10 text-white/40' : 'hover:bg-black/5 text-gray-400'}`} title={tt.sftpUpload || 'Upload'}><span className="material-symbols-outlined text-sm">upload_file</span></button>
                          <input ref={uploadInputRef} type="file" multiple className="hidden" onChange={(e) => { const files = Array.from(e.target.files || []); if (files.length === 1) sftpUpload(files[0]); else if (files.length > 1) sftpUploadMulti(files); e.target.value = ''; }} />
                        </>
                      )}
                      <button onClick={toggleSFTP} className={`p-1 rounded-md transition-colors ${isDark ? 'hover:bg-white/10 text-white/40' : 'hover:bg-black/5 text-gray-400'}`} title={tt.close || 'Close'}><span className="material-symbols-outlined text-sm">close</span></button>
                    </div>
                  </div>

                  {/* ── Files tab content ── */}
                  {bottomTab === 'files' && (
                    <div className="flex-1 flex min-h-0 overflow-hidden">
                      {/* Tree */}
                      <div className={`w-[160px] shrink-0 overflow-y-auto neon-scrollbar border-e ${isDark ? 'border-white/5' : 'border-black/5'}`}>
                        <div className="py-1">
                          {(() => {
                            const renderTree = (dirPath: string, depth: number): React.ReactNode => {
                              const entries = activeTab.treeCache[dirPath];
                              if (!entries) return null;
                              const dirs = entries.filter((e) => e.is_dir).sort((a, b) => a.name.localeCompare(b.name));
                              return dirs.map((entry) => {
                                const isExpanded = activeTab.expandedDirs.has(entry.path);
                                const isLoading = activeTab.treeLoading.has(entry.path);
                                const isActive = activeTab.sftpPath === entry.path;
                                return (
                                  <div key={entry.path}>
                                    <div
                                      className={`flex items-center gap-0.5 py-0.5 pe-2 cursor-pointer transition-colors text-[11px] ${isActive ? (isDark ? 'bg-cyan-500/15 text-cyan-400' : 'bg-cyan-500/10 text-cyan-600') : isDark ? 'text-white/50 hover:text-white/80 hover:bg-white/5' : 'text-gray-500 hover:text-gray-700 hover:bg-black/[.03]'}`}
                                      style={{ paddingInlineStart: `${depth * 12 + 4}px` }}
                                      onClick={() => { toggleTreeDir(entry.path); sftpNavigate(entry.path); }}
                                    >
                                      {isLoading ? (
                                        <span className="material-symbols-outlined animate-spin shrink-0" style={{ fontSize: '12px' }}>progress_activity</span>
                                      ) : (
                                        <span className="material-symbols-outlined shrink-0" style={{ fontSize: '12px' }}>{isExpanded ? 'expand_more' : 'chevron_right'}</span>
                                      )}
                                      <span className="material-symbols-outlined shrink-0 text-cyan-400" style={{ fontSize: '13px' }}>{isExpanded ? 'folder_open' : 'folder'}</span>
                                      <span className="truncate">{entry.name}</span>
                                    </div>
                                    {isExpanded && renderTree(entry.path, depth + 1)}
                                  </div>
                                );
                              });
                            };
                            const rootExpanded = activeTab.expandedDirs.has('/');
                            const rootActive = activeTab.sftpPath === '/';
                            return (
                              <>
                                <div
                                  className={`flex items-center gap-0.5 py-0.5 pe-2 cursor-pointer transition-colors text-[11px] ${rootActive ? (isDark ? 'bg-cyan-500/15 text-cyan-400' : 'bg-cyan-500/10 text-cyan-600') : isDark ? 'text-white/50 hover:text-white/80 hover:bg-white/5' : 'text-gray-500 hover:text-gray-700 hover:bg-black/[.03]'}`}
                                  style={{ paddingInlineStart: '4px' }}
                                  onClick={() => sftpNavigate('/')}
                                >
                                  <span className="material-symbols-outlined shrink-0" style={{ fontSize: '12px' }}>{rootExpanded ? 'expand_more' : 'chevron_right'}</span>
                                  <span className="material-symbols-outlined shrink-0 text-cyan-400" style={{ fontSize: '13px' }}>folder_open</span>
                                  <span className="truncate font-medium">/</span>
                                </div>
                                {rootExpanded && renderTree('/', 1)}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      {/* File list */}
                      <div className="flex-1 min-w-0 overflow-y-auto neon-scrollbar">
                        {activeTab.sftpLoading ? (
                          <div className="flex items-center justify-center h-24"><span className="material-symbols-outlined animate-spin text-xl text-text-muted">progress_activity</span></div>
                        ) : activeTab.sftpEntries.length === 0 ? (
                          <div className={`flex flex-col items-center justify-center h-24 gap-2 ${isDark ? 'text-white/30' : 'text-black/20'}`}>
                            <span className="material-symbols-outlined text-2xl">folder_off</span>
                            <span className="text-xs">{tt.sftpEmpty || 'Directory is empty'}</span>
                          </div>
                        ) : (
                          <div className="divide-y divide-white/[.03] dark:divide-white/[.03]">
                            {activeTab.sftpEntries.map((entry) => {
                              const fi = fileIcon(entry.name, entry.is_dir);
                              return (
                                <div key={entry.path} className={`flex items-center gap-2 px-3 py-1 group cursor-pointer transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/[.03]'}`} onClick={() => entry.is_dir && sftpNavigate(entry.path)}>
                                  <span className={`material-symbols-outlined text-sm ${fi.color}`}>{fi.icon}</span>
                                  <div className="flex-1 min-w-0"><span className={`text-xs truncate block ${entry.is_dir ? 'text-cyan-400 font-medium' : ''}`}>{entry.name}</span></div>
                                  <span className={`text-[10px] shrink-0 ${isDark ? 'text-white/25' : 'text-black/25'}`}>{entry.is_dir ? '' : formatSize(entry.size)}</span>
                                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {!entry.is_dir && (<button onClick={(e) => { e.stopPropagation(); sftpDownload(entry); }} className={`p-0.5 rounded transition-colors ${isDark ? 'hover:bg-white/10 text-white/30' : 'hover:bg-black/5 text-gray-400'}`} title={tt.sftpDownload || 'Download'}><span className="material-symbols-outlined" style={{ fontSize: '14px' }}>download</span></button>)}
                                    <button onClick={(e) => { e.stopPropagation(); sftpRemove(entry); }} className={`p-0.5 rounded transition-colors ${isDark ? 'hover:bg-red-500/20 text-white/30 hover:text-red-400' : 'hover:bg-red-500/10 text-gray-400 hover:text-red-400'}`} title={tt.delete || 'Delete'}><span className="material-symbols-outlined" style={{ fontSize: '14px' }}>delete</span></button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Commands tab content ── */}
                  {bottomTab === 'commands' && (
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                      {/* Add snippet form */}
                      <div className={`flex items-center gap-2 px-3 py-2 border-b shrink-0 ${isDark ? 'border-white/5' : 'border-black/5'}`}>
                        <input className={`sci-input flex-[2] min-w-0 px-2 py-1 rounded-md text-xs ${isDark ? 'bg-white/5' : 'bg-black/[.03]'}`} placeholder={tt.snippetName || 'Name'} value={snippetForm.name} onChange={(e) => setSnippetForm({ ...snippetForm, name: e.target.value })} />
                        <input className={`sci-input flex-[3] min-w-0 px-2 py-1 rounded-md text-xs font-mono ${isDark ? 'bg-white/5' : 'bg-black/[.03]'}`} placeholder={tt.snippetCommand || 'Command (e.g. systemctl restart nginx)'} value={snippetForm.command} onChange={(e) => setSnippetForm({ ...snippetForm, command: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') addSnippet(); }} />
                        <button onClick={addSnippet} disabled={snippetAdding || !snippetForm.name.trim() || !snippetForm.command.trim()} className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 disabled:opacity-40 transition-colors shrink-0">
                          {snippetAdding ? <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> : <span className="material-symbols-outlined text-sm">add</span>}
                          {tt.add || 'Add'}
                        </button>
                      </div>
                      {/* Snippet list */}
                      <div className="flex-1 overflow-y-auto neon-scrollbar">
                        {activeTab.snippets.length === 0 ? (
                          <div className={`flex flex-col items-center justify-center h-24 gap-2 ${isDark ? 'text-white/30' : 'text-black/20'}`}>
                            <span className="material-symbols-outlined text-2xl">code_off</span>
                            <span className="text-xs">{tt.noSnippets || 'No saved commands'}</span>
                          </div>
                        ) : (
                          <div className="divide-y divide-white/[.03] dark:divide-white/[.03]">
                            {activeTab.snippets.map((s) => (
                              <div key={s.id} className={`flex items-center gap-2 px-3 py-1.5 group transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/[.03]'}`}>
                                <span className="material-symbols-outlined text-sm text-amber-400" style={{ fontSize: '14px' }}>code</span>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium truncate">{s.name}</div>
                                  <div className={`text-[10px] font-mono truncate ${isDark ? 'text-white/30' : 'text-black/30'}`}>{s.command}</div>
                                </div>
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => execSnippet(s.command)} className={`flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-medium rounded-md transition-colors ${isDark ? 'bg-green-500/15 text-green-400 hover:bg-green-500/25' : 'bg-green-500/10 text-green-600 hover:bg-green-500/20'}`} title={tt.run || 'Run'}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>play_arrow</span>{tt.run || 'Run'}
                                  </button>
                                  <button onClick={() => deleteSnippet(s.id)} className={`p-0.5 rounded transition-colors ${isDark ? 'hover:bg-red-500/20 text-white/30 hover:text-red-400' : 'hover:bg-red-500/10 text-gray-400 hover:text-red-400'}`} title={tt.delete || 'Delete'}><span className="material-symbols-outlined" style={{ fontSize: '14px' }}>delete</span></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Add / Edit form ──
  return (
    <div className="h-full flex flex-col bg-surface text-text overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
        <button onClick={() => { setView(tabs.length > 0 ? 'sessions' : 'hosts'); setEditId(null); }} className="p-1 rounded-md hover:bg-white/10 text-text-muted"><span className="material-symbols-outlined text-sm">arrow_back</span></button>
        <span className="material-symbols-outlined text-lg text-cyan-400">{editId ? 'edit' : 'add_circle'}</span>
        <h2 className="text-base font-semibold">{editId ? (tt.editHost || 'Edit Host') : (tt.addHost || 'Add Host')}</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 neon-scrollbar">
        <div className="max-w-lg mx-auto space-y-4">
          <div><label className="text-xs text-text-muted mb-1 block">{tt.hostName || 'Name'}</label><input className="sci-input w-full px-3 py-2 rounded-lg bg-surface-sunken text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="My Server" /></div>
          <div className="flex gap-3">
            <div className="flex-1"><label className="text-xs text-text-muted mb-1 block">{tt.hostAddr || 'Host'}</label><input className="sci-input w-full px-3 py-2 rounded-lg bg-surface-sunken text-sm" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="192.168.1.100" /></div>
            <div className="w-24"><label className="text-xs text-text-muted mb-1 block">{tt.port || 'Port'}</label><input type="number" className="sci-input w-full px-3 py-2 rounded-lg bg-surface-sunken text-sm" value={form.port} onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) || 22 })} /></div>
          </div>
          <div><label className="text-xs text-text-muted mb-1 block">{tt.username || 'Username'}</label><input className="sci-input w-full px-3 py-2 rounded-lg bg-surface-sunken text-sm" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="root" /></div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">{tt.authType || 'Auth Type'}</label>
            <div className="flex gap-2">
              <button className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${form.auth_type === 'password' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-surface-sunken text-text-muted hover:bg-white/5'}`} onClick={() => setForm({ ...form, auth_type: 'password' })}>{tt.password || 'Password'}</button>
              <button className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${form.auth_type === 'key' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-surface-sunken text-text-muted hover:bg-white/5'}`} onClick={() => setForm({ ...form, auth_type: 'key' })}>{tt.privateKey || 'Private Key'}</button>
            </div>
          </div>
          {form.auth_type === 'password' && (<div><label className="text-xs text-text-muted mb-1 block">{tt.password || 'Password'}</label><input type="password" className="sci-input w-full px-3 py-2 rounded-lg bg-surface-sunken text-sm" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editId ? (tt.leaveBlank || 'Leave blank to keep') : ''} /></div>)}
          {form.auth_type === 'key' && (<>
            <div><label className="text-xs text-text-muted mb-1 block">{tt.privateKey || 'Private Key'}</label><textarea className="sci-input w-full px-3 py-2 rounded-lg bg-surface-sunken text-sm font-mono resize-none" rows={5} value={form.private_key} onChange={(e) => setForm({ ...form, private_key: e.target.value })} placeholder="-----BEGIN OPENSSH PRIVATE KEY-----" /></div>
            <div><label className="text-xs text-text-muted mb-1 block">{tt.passphrase || 'Passphrase'}</label><input type="password" className="sci-input w-full px-3 py-2 rounded-lg bg-surface-sunken text-sm" value={form.passphrase} onChange={(e) => setForm({ ...form, passphrase: e.target.value })} placeholder={tt.optional || 'Optional'} /></div>
          </>)}
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_favorite} onChange={(e) => setForm({ ...form, is_favorite: e.target.checked })} className="w-4 h-4 rounded accent-cyan-500" /><span className="text-xs text-text-muted">{tt.favorite || 'Favorite'}</span></label>
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
