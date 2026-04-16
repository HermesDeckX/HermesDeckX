import React, { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
const SftpEditor = lazy(() => import('../components/SftpEditor'));
import type { Language } from '../types';
import { getTranslation } from '../locales';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import { sshHostsApi } from '../services/ssh-hosts';
import type { SSHHost, SSHHostCreateRequest } from '../services/ssh-hosts';
import { TerminalWSClient } from '../services/terminal-ws';
import type { TerminalMessage, TerminalCreatedPayload, TerminalOutputPayload, TerminalExitPayload, TerminalErrorPayload } from '../services/terminal-ws';
import { sftpApi } from '../services/sftp';
import type { FileEntry, ReadFileResult } from '../services/sftp';
import { sysInfoApi } from '../services/sysinfo';
import type { SysInfo } from '../services/sysinfo';
import { snippetsApi } from '../services/snippets';
import { copyToClipboard } from '../utils/clipboard';
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
  group_name: string; save_password: boolean;
}
const emptyForm: HostFormData = {
  name: '', host: '', port: 22, username: 'root',
  auth_type: 'password', password: '', private_key: '', passphrase: '', is_favorite: false,
  group_name: '', save_password: true,
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
  collapsedSections: Set<string>;
  editorFile: EditorFile | null;
  editorDirty: boolean;
  editorSaving: boolean;
  editorLoading: boolean;
}

interface EditorFile {
  path: string;
  name: string;
  content: string;
  originalContent: string;
  etag: string;
  size: number;
  lineEnding: 'lf' | 'crlf';
}
type BottomTab = 'files' | 'commands';
type SysSection = 'processes' | 'disks' | 'network';

const TERM_THEMES: Record<string, { dark: Record<string, string>; light: Record<string, string> }> = {
  'Tokyo Night': {
    dark: { background: '#1a1b26', foreground: '#c0caf5', cursor: '#c0caf5', selectionBackground: '#33467c', black: '#15161e', red: '#f7768e', green: '#9ece6a', yellow: '#e0af68', blue: '#7aa2f7', magenta: '#bb9af7', cyan: '#7dcfff', white: '#a9b1d6', brightBlack: '#414868', brightRed: '#f7768e', brightGreen: '#9ece6a', brightYellow: '#e0af68', brightBlue: '#7aa2f7', brightMagenta: '#bb9af7', brightCyan: '#7dcfff', brightWhite: '#c0caf5' },
    light: { background: '#fafafa', foreground: '#383a42', cursor: '#526fff', selectionBackground: '#d7d7ff', black: '#383a42', red: '#e45649', green: '#50a14f', yellow: '#c18401', blue: '#4078f2', magenta: '#a626a4', cyan: '#0184bc', white: '#a0a1a7', brightBlack: '#4f525e', brightRed: '#e45649', brightGreen: '#50a14f', brightYellow: '#c18401', brightBlue: '#4078f2', brightMagenta: '#a626a4', brightCyan: '#0184bc', brightWhite: '#fafafa' },
  },
  'Dracula': {
    dark: { background: '#282a36', foreground: '#f8f8f2', cursor: '#f8f8f2', selectionBackground: '#44475a', black: '#21222c', red: '#ff5555', green: '#50fa7b', yellow: '#f1fa8c', blue: '#bd93f9', magenta: '#ff79c6', cyan: '#8be9fd', white: '#f8f8f2', brightBlack: '#6272a4', brightRed: '#ff6e6e', brightGreen: '#69ff94', brightYellow: '#ffffa5', brightBlue: '#d6acff', brightMagenta: '#ff92df', brightCyan: '#a4ffff', brightWhite: '#ffffff' },
    light: { background: '#f8f8f2', foreground: '#282a36', cursor: '#282a36', selectionBackground: '#d7d7ff', black: '#282a36', red: '#ff5555', green: '#50fa7b', yellow: '#f1fa8c', blue: '#bd93f9', magenta: '#ff79c6', cyan: '#8be9fd', white: '#f8f8f2', brightBlack: '#6272a4', brightRed: '#ff6e6e', brightGreen: '#69ff94', brightYellow: '#ffffa5', brightBlue: '#d6acff', brightMagenta: '#ff92df', brightCyan: '#a4ffff', brightWhite: '#ffffff' },
  },
  'Monokai': {
    dark: { background: '#272822', foreground: '#f8f8f2', cursor: '#f8f8f0', selectionBackground: '#49483e', black: '#272822', red: '#f92672', green: '#a6e22e', yellow: '#f4bf75', blue: '#66d9ef', magenta: '#ae81ff', cyan: '#a1efe4', white: '#f8f8f2', brightBlack: '#75715e', brightRed: '#f92672', brightGreen: '#a6e22e', brightYellow: '#f4bf75', brightBlue: '#66d9ef', brightMagenta: '#ae81ff', brightCyan: '#a1efe4', brightWhite: '#f9f8f5' },
    light: { background: '#fafafa', foreground: '#272822', cursor: '#272822', selectionBackground: '#e0e0e0', black: '#272822', red: '#f92672', green: '#a6e22e', yellow: '#f4bf75', blue: '#66d9ef', magenta: '#ae81ff', cyan: '#a1efe4', white: '#f8f8f2', brightBlack: '#75715e', brightRed: '#f92672', brightGreen: '#a6e22e', brightYellow: '#f4bf75', brightBlue: '#66d9ef', brightMagenta: '#ae81ff', brightCyan: '#a1efe4', brightWhite: '#f9f8f5' },
  },
  'Solarized': {
    dark: { background: '#002b36', foreground: '#839496', cursor: '#839496', selectionBackground: '#073642', black: '#073642', red: '#dc322f', green: '#859900', yellow: '#b58900', blue: '#268bd2', magenta: '#d33682', cyan: '#2aa198', white: '#eee8d5', brightBlack: '#586e75', brightRed: '#cb4b16', brightGreen: '#586e75', brightYellow: '#657b83', brightBlue: '#839496', brightMagenta: '#6c71c4', brightCyan: '#93a1a1', brightWhite: '#fdf6e3' },
    light: { background: '#fdf6e3', foreground: '#657b83', cursor: '#657b83', selectionBackground: '#eee8d5', black: '#073642', red: '#dc322f', green: '#859900', yellow: '#b58900', blue: '#268bd2', magenta: '#d33682', cyan: '#2aa198', white: '#eee8d5', brightBlack: '#586e75', brightRed: '#cb4b16', brightGreen: '#586e75', brightYellow: '#657b83', brightBlue: '#839496', brightMagenta: '#6c71c4', brightCyan: '#93a1a1', brightWhite: '#fdf6e3' },
  },
  'GitHub': {
    dark: { background: '#0d1117', foreground: '#c9d1d9', cursor: '#c9d1d9', selectionBackground: '#264f78', black: '#0d1117', red: '#ff7b72', green: '#7ee787', yellow: '#d29922', blue: '#79c0ff', magenta: '#d2a8ff', cyan: '#a5d6ff', white: '#c9d1d9', brightBlack: '#484f58', brightRed: '#ffa198', brightGreen: '#aff5b4', brightYellow: '#e3b341', brightBlue: '#a5d6ff', brightMagenta: '#d2a8ff', brightCyan: '#a5d6ff', brightWhite: '#f0f6fc' },
    light: { background: '#ffffff', foreground: '#24292f', cursor: '#24292f', selectionBackground: '#ddf4ff', black: '#24292f', red: '#cf222e', green: '#116329', yellow: '#4d2d00', blue: '#0969da', magenta: '#8250df', cyan: '#1b7c83', white: '#6e7781', brightBlack: '#57606a', brightRed: '#a40e26', brightGreen: '#1a7f37', brightYellow: '#633c01', brightBlue: '#218bff', brightMagenta: '#8250df', brightCyan: '#3192aa', brightWhite: '#8c959f' },
  },
};
const TERM_THEME_NAMES = Object.keys(TERM_THEMES);
const DEFAULT_TERM_THEME = 'Tokyo Night';
const DEFAULT_TERM_FONT_SIZE = 14;
const TERM_FONT_SIZES = [10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24];

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

const fmtUptime = (sec: number, tt: Record<string, string>) => {
  if (!sec) return '';
  const w = Math.floor(sec / 604800); sec %= 604800;
  const d = Math.floor(sec / 86400); sec %= 86400;
  const h = Math.floor(sec / 3600); sec %= 3600;
  const m = Math.floor(sec / 60);
  const parts: string[] = [];
  if (w) parts.push(`${w}${tt.uptimeWeek || 'w'}`);
  if (d) parts.push(`${d}${tt.uptimeDay || 'd'}`);
  if (h) parts.push(`${h}${tt.uptimeHour || 'h'}`);
  if (m) parts.push(`${m}${tt.uptimeMin || 'm'}`);
  return parts.join(' ') || '0m';
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
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; name: string } | null>(null);
  const [sftpHeight, setSftpHeight] = useState(SFTP_PANEL_DEFAULT);
  const resizingRef = useRef(false);
  const [bottomTab, setBottomTab] = useState<BottomTab>('files');
  const [cmdInput, setCmdInput] = useState('');
  const inputBufRef = useRef<Record<string, string>>({});
  const [termTheme, setTermTheme] = useState(() => localStorage.getItem('hdx_term_theme') || DEFAULT_TERM_THEME);
  const [termFontSize, setTermFontSize] = useState(() => parseInt(localStorage.getItem('hdx_term_font_size') || '') || DEFAULT_TERM_FONT_SIZE);
  const [showTermSettings, setShowTermSettings] = useState(false);
  const termSettingsRef = useRef<HTMLDivElement>(null);

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

  // Theme + font sync
  useEffect(() => {
    const themeColors = TERM_THEMES[termTheme] || TERM_THEMES[DEFAULT_TERM_THEME];
    tabs.forEach((tab) => {
      if (!tab.xterm) return;
      tab.xterm.options.theme = isDark ? themeColors.dark : themeColors.light;
      tab.xterm.options.fontSize = termFontSize;
      try { tab.fitAddon?.fit(); } catch { /* */ }
    });
  }, [isDark, tabs, termTheme, termFontSize]);

  // Persist terminal settings
  useEffect(() => { localStorage.setItem('hdx_term_theme', termTheme); }, [termTheme]);
  useEffect(() => { localStorage.setItem('hdx_term_font_size', String(termFontSize)); }, [termFontSize]);

  // Close settings popover on outside click
  useEffect(() => {
    if (!showTermSettings) return;
    const handler = (e: MouseEvent) => { if (termSettingsRef.current && !termSettingsRef.current.contains(e.target as Node)) setShowTermSettings(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showTermSettings]);

  const connectToHost = useCallback(async (host: SSHHost) => {
    const tabId = `tab-${++tabCounter}`;
    const newTab: TabState = {
      id: tabId, hostName: host.name, hostId: host.id,
      sessionId: null, connecting: true, sftpOpen: false,
      xterm: null, fitAddon: null, wsClient: null, resizeObserver: null,
      sftpPath: '/', sftpEntries: [], sftpLoading: false,
      treeCache: {}, expandedDirs: new Set(), treeLoading: new Set(),
      sysInfo: null, sysInfoOpen: true, netHistory: [],
      snippets: [], snippetsLoaded: false, collapsedSections: new Set(),
      editorFile: null, editorDirty: false, editorSaving: false, editorLoading: false,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(tabId);
    setView('sessions');

    const themeColors = TERM_THEMES[termTheme] || TERM_THEMES[DEFAULT_TERM_THEME];
    const xterm = new XTerm({
      cursorBlink: true, fontSize: termFontSize,
      fontFamily: 'JetBrains Mono, Consolas, monospace',
      theme: isDark ? themeColors.dark : themeColors.light, allowProposedApi: true,
    });
    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);
    xterm.loadAddon(new WebLinksAddon());
    xterm.writeln(`\x1b[36m⟡ Connecting to ${host.name} (${host.username}@${host.host}:${host.port})...\x1b[0m`);

    // Smart keyboard shortcuts (Windows Terminal / VS Code style)
    xterm.attachCustomKeyEventHandler((e: KeyboardEvent) => {
      if (e.type !== 'keydown') return true;
      // Ctrl+C: copy if has selection, otherwise send interrupt (^C)
      if (e.ctrlKey && !e.shiftKey && e.key === 'c') {
        const sel = xterm.getSelection();
        if (sel) {
          navigator.clipboard.writeText(sel);
          xterm.clearSelection();
          return false; // handled, don't send ^C
        }
        return true; // no selection → let xterm send ^C
      }
      // Ctrl+V: paste from clipboard
      if (e.ctrlKey && !e.shiftKey && e.key === 'v') {
        navigator.clipboard.readText().then((text) => { if (text) xterm.paste(text); });
        return false;
      }
      // Ctrl+Shift+C/V as fallback
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        const sel = xterm.getSelection();
        if (sel) { navigator.clipboard.writeText(sel); xterm.clearSelection(); }
        return false;
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'V') {
        navigator.clipboard.readText().then((text) => { if (text) xterm.paste(text); });
        return false;
      }
      return true;
    });

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
    xterm.onData((data: string) => {
      if (sid) client.sendInput(sid, data);
      // Buffer keystrokes to capture commands on Enter
      const buf = inputBufRef.current;
      if (!buf[tabId]) buf[tabId] = '';
      if (data === '\r' || data === '\n') {
        const cmd = buf[tabId].trim();
        if (cmd) {
          snippetsApi.record(host.id, cmd).then(() => {
            snippetsApi.list(host.id).then(list => {
              updateTab(tabId, { snippets: list || [], snippetsLoaded: true });
            }).catch(() => {});
          }).catch(() => {});
        }
        buf[tabId] = '';
      } else if (data === '\x7f' || data === '\b') {
        buf[tabId] = buf[tabId].slice(0, -1);
      } else if (data.length === 1 && data >= ' ') {
        buf[tabId] += data;
      } else if (data.length > 1 && !data.startsWith('\x1b')) {
        // Pasted text
        buf[tabId] += data;
      }
    });
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

  const closeTab = useCallback(async (tabId: string) => {
    const tab = tabsRef.current.find((tb) => tb.id === tabId);
    if (tab?.sessionId) {
      const ok = await confirm({ title: tt.closeTabTitle || 'Close Session', message: (tt.closeTabMsg || 'Disconnect from "{name}"?').replace('{name}', tab.hostName), danger: true });
      if (!ok) return;
    }
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
  }, [activeTabId, confirm, tt]);

  // Reconnect a disconnected tab to the same host
  const reconnectTab = useCallback(async (tabId: string) => {
    const tab = tabsRef.current.find((tb) => tb.id === tabId);
    if (!tab || !tab.xterm) return;
    const host = hosts.find((h) => h.id === tab.hostId);
    if (!host) return;

    // Cleanup old ws
    tab.wsClient?.disconnect();
    updateTab(tabId, { connecting: true, sessionId: null, sftpOpen: false });
    tab.xterm.writeln(`\r\n\x1b[36m⟡ Reconnecting to ${host.name}...\x1b[0m`);

    const client = new TerminalWSClient();
    try { await client.connect(); } catch {
      tab.xterm.writeln('\x1b[31m✗ WebSocket connection failed\x1b[0m');
      updateTab(tabId, { connecting: false, wsClient: client });
      return;
    }

    let sid = '';
    client.on('terminal.created', (msg: TerminalMessage) => {
      const p = msg.payload as TerminalCreatedPayload; sid = p.sessionId;
      updateTab(tabId, { sessionId: p.sessionId, connecting: false });
      tab.xterm!.writeln(`\x1b[32m✓ Reconnected (session: ${p.sessionId})\x1b[0m\r\n`);
      tab.xterm!.focus();
    });
    client.on('terminal.output', (msg: TerminalMessage) => { tab.xterm!.write((msg.payload as TerminalOutputPayload).data); });
    client.on('terminal.exit', (msg: TerminalMessage) => {
      tab.xterm!.writeln(`\r\n\x1b[33m⟡ Session ended: ${(msg.payload as TerminalExitPayload).reason}\x1b[0m`);
      updateTab(tabId, { sessionId: null });
    });
    client.on('terminal.error', (msg: TerminalMessage) => {
      tab.xterm!.writeln(`\r\n\x1b[31m✗ Error: ${(msg.payload as TerminalErrorPayload).message}\x1b[0m`);
      updateTab(tabId, { connecting: false });
    });

    // Re-wire input
    const disposable = tab.xterm.onData((data: string) => {
      if (sid) client.sendInput(sid, data);
      const buf = inputBufRef.current;
      if (!buf[tabId]) buf[tabId] = '';
      if (data === '\r' || data === '\n') {
        const cmd = buf[tabId].trim();
        if (cmd) {
          snippetsApi.record(host.id, cmd).then(() => {
            snippetsApi.list(host.id).then(list => {
              updateTab(tabId, { snippets: list || [], snippetsLoaded: true });
            }).catch(() => {});
          }).catch(() => {});
        }
        buf[tabId] = '';
      } else if (data === '\x7f' || data === '\b') {
        buf[tabId] = buf[tabId].slice(0, -1);
      } else if (data.length === 1 && data >= ' ') {
        buf[tabId] += data;
      } else if (data.length > 1 && !data.startsWith('\x1b')) {
        buf[tabId] += data;
      }
    });
    tab.xterm.onResize(({ cols, rows }) => { if (sid) client.resizeSession(sid, cols, rows); });

    updateTab(tabId, { wsClient: client });
    const dims = tab.fitAddon?.proposeDimensions();
    client.createSession(host.id, dims?.cols || 120, dims?.rows || 30);
  }, [updateTab, hosts]);

  // SFTP toggle — terminal stays mounted
  // When opening, auto-expand tree from / down to the user's home directory
  const toggleSFTP = useCallback(async () => {
    if (!activeTab) return;
    if (activeTab.sftpOpen) { updateTab(activeTab.id, { sftpOpen: false }); refitActiveTerminal(); return; }
    if (!activeTab.sessionId) { toast('error', tt.sftpNeedSession || 'SFTP requires an active session'); return; }
    updateTab(activeTab.id, { sftpOpen: true, sftpLoading: true });
    refitActiveTerminal();
    try {
      // 1. Get home directory listing (backend defaults to $HOME when no path)
      const homeResult = await sftpApi.list(activeTab.sessionId);
      const homePath = homeResult.path; // e.g. "/root" or "/home/user"
      const newCache: Record<string, FileEntry[]> = { ...activeTab.treeCache, [homePath]: homeResult.entries };
      const newExpanded = new Set(activeTab.expandedDirs);
      newExpanded.add(homePath);

      // 2. Build ancestor paths: / → /home → /home/user
      const segments = homePath.split('/').filter(Boolean);
      const ancestorPaths: string[] = ['/'];
      for (let i = 0; i < segments.length; i++) {
        ancestorPaths.push('/' + segments.slice(0, i + 1).join('/'));
      }

      // 3. Load each ancestor directory in parallel for the tree
      const ancestorLoads = ancestorPaths
        .filter((p) => p !== homePath && !newCache[p])
        .map((p) => sftpApi.list(activeTab.sessionId!, p).then((r) => ({ path: r.path, entries: r.entries })).catch(() => null));
      const results = await Promise.all(ancestorLoads);
      for (const r of results) {
        if (r) { newCache[r.path] = r.entries; newExpanded.add(r.path); }
      }
      // Also expand all ancestors already in cache
      for (const p of ancestorPaths) { newExpanded.add(p); }

      updateTab(activeTab.id, { sftpPath: homePath, sftpEntries: homeResult.entries, sftpLoading: false, treeCache: newCache, expandedDirs: newExpanded });
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
    for (let i = 0; i < files.length; i++) {
      setUploadProgress({ current: i + 1, total: files.length, name: files[i].name });
      try { await sftpApi.upload(activeTab.sessionId, activeTab.sftpPath + '/', files[i]); ok++; } catch { fail++; }
    }
    setUploadProgress(null);
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

  const sftpNewFile = useCallback(async () => {
    if (!activeTab?.sessionId) return;
    const name = prompt(tt.sftpNewFile || 'New file name:');
    if (!name) return;
    const filePath = activeTab.sftpPath === '/' ? `/${name}` : `${activeTab.sftpPath}/${name}`;
    try {
      await sftpApi.writeFile(activeTab.sessionId, filePath, '');
      toast('success', (tt.sftpFileCreated || 'Created: {name}').replace('{name}', name));
      sftpNavigate(activeTab.sftpPath);
    } catch (e: any) { toast('error', e?.message || 'Create file failed'); }
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

  // Snippets / Command History
  const loadSnippets = useCallback(async () => {
    if (!activeTab) return;
    try {
      const list = await snippetsApi.list(activeTab.hostId);
      updateTab(activeTab.id, { snippets: list || [], snippetsLoaded: true });
    } catch { /* silent */ }
  }, [activeTab, updateTab]);

  const recordCommand = useCallback(async (command: string) => {
    if (!activeTab || !command.trim()) return;
    try {
      await snippetsApi.record(activeTab.hostId, command);
      const list = await snippetsApi.list(activeTab.hostId);
      updateTab(activeTab.id, { snippets: list || [], snippetsLoaded: true });
    } catch { /* silent */ }
  }, [activeTab, updateTab]);

  const toggleFavorite = useCallback(async (id: number) => {
    try { await snippetsApi.toggleFavorite(id); loadSnippets(); }
    catch (e: any) { toast('error', e?.message || 'Failed'); }
  }, [toast, loadSnippets]);

  const deleteSnippet = useCallback(async (id: number) => {
    try { await snippetsApi.delete(id); loadSnippets(); }
    catch (e: any) { toast('error', e?.message || 'Delete failed'); }
  }, [toast, loadSnippets]);

  const execSnippet = useCallback((command: string) => {
    if (!activeTab?.sessionId || !activeTab?.wsClient) return;
    activeTab.wsClient.sendInput(activeTab.sessionId, command + '\n');
    recordCommand(command);
  }, [activeTab, recordCommand]);

  const sendCmdInput = useCallback(() => {
    const cmd = cmdInput.trim();
    if (!cmd) return;
    execSnippet(cmd);
    setCmdInput('');
  }, [cmdInput, execSnippet]);

  // Load snippets when switching to commands tab or on connect
  useEffect(() => {
    if (activeTab && !activeTab.snippetsLoaded) { loadSnippets(); }
  }, [activeTab?.id, activeTab?.snippetsLoaded, loadSnippets]);

  // Toggle collapsible sysinfo section
  const toggleSection = useCallback((section: SysSection) => {
    if (!activeTab) return;
    const next = new Set(activeTab.collapsedSections);
    if (next.has(section)) next.delete(section); else next.add(section);
    updateTab(activeTab.id, { collapsedSections: next });
  }, [activeTab, updateTab]);

  // ── File Editor ──
  const openFileInEditor = useCallback(async (entry: FileEntry) => {
    if (!activeTab?.sessionId || entry.is_dir) return;
    if (entry.size > 1024 * 1024) {
      toast('warning', tt.fileTooLarge || 'File is too large to edit (max 1 MB)');
      return;
    }
    // If editor has unsaved changes, confirm
    if (activeTab.editorFile && activeTab.editorDirty) {
      const ok = await confirm(tt.unsavedChanges || 'You have unsaved changes. Discard and open a new file?');
      if (!ok) return;
    }
    updateTab(activeTab.id, { editorLoading: true });
    try {
      const result = await sftpApi.readFile(activeTab.sessionId, entry.path);
      updateTab(activeTab.id, {
        editorFile: {
          path: result.path,
          name: entry.name,
          content: result.content,
          originalContent: result.content,
          etag: result.etag,
          size: result.size,
          lineEnding: result.line_ending,
        },
        editorDirty: false,
        editorSaving: false,
        editorLoading: false,
      });
    } catch (e: any) {
      updateTab(activeTab.id, { editorLoading: false });
      const msg = e?.message || '';
      if (msg.includes('BINARY_FILE')) {
        toast('warning', tt.binaryCannotEdit || 'This file appears to be binary and cannot be edited');
      } else if (msg.includes('FILE_TOO_LARGE')) {
        toast('warning', tt.fileTooLarge || 'File is too large to edit (max 1 MB)');
      } else {
        toast('error', msg || 'Failed to read file');
      }
    }
  }, [activeTab, confirm, toast, tt, updateTab]);

  const editorContentChange = useCallback((content: string) => {
    if (!activeTab?.editorFile) return;
    const dirty = content !== activeTab.editorFile.originalContent;
    updateTab(activeTab.id, {
      editorFile: { ...activeTab.editorFile, content },
      editorDirty: dirty,
    });
  }, [activeTab, updateTab]);

  const editorSave = useCallback(async () => {
    if (!activeTab?.sessionId || !activeTab.editorFile) return;
    updateTab(activeTab.id, { editorSaving: true });
    try {
      const result = await sftpApi.writeFile(
        activeTab.sessionId,
        activeTab.editorFile.path,
        activeTab.editorFile.content,
        activeTab.editorFile.etag,
      );
      updateTab(activeTab.id, {
        editorFile: {
          ...activeTab.editorFile,
          originalContent: activeTab.editorFile.content,
          etag: result.etag,
          size: result.size,
        },
        editorDirty: false,
        editorSaving: false,
      });
      toast('success', tt.fileSaved || 'File saved');
    } catch (e: any) {
      updateTab(activeTab.id, { editorSaving: false });
      const msg = e?.message || '';
      if (msg.includes('CONFLICT')) {
        toast('error', tt.fileConflict || 'File was modified on the server. Please reload and try again.');
      } else {
        toast('error', msg || 'Save failed');
      }
    }
  }, [activeTab, updateTab, toast, tt]);

  const editorClose = useCallback(async () => {
    if (!activeTab) return;
    if (activeTab.editorDirty) {
      const ok = await confirm(tt.unsavedChanges || 'You have unsaved changes. Discard?');
      if (!ok) return;
    }
    updateTab(activeTab.id, { editorFile: null, editorDirty: false, editorSaving: false });
  }, [activeTab, confirm, tt, updateTab]);

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
      const req: SSHHostCreateRequest = { name: form.name, host: form.host, port: form.port || 22, username: form.username, auth_type: form.auth_type, password: form.auth_type === 'password' ? form.password : undefined, private_key: form.auth_type === 'key' ? form.private_key : undefined, passphrase: form.auth_type === 'key' ? form.passphrase : undefined, is_favorite: form.is_favorite, group_name: form.group_name, save_password: form.save_password };
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
    setForm({ name: host.name, host: host.host, port: host.port, username: host.username, auth_type: host.auth_type, password: '', private_key: '', passphrase: '', is_favorite: host.is_favorite, group_name: host.group_name || '', save_password: host.save_password });
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
            <div className="space-y-4">
              {(() => {
                const groups: Record<string, SSHHost[]> = {};
                const ungrouped: SSHHost[] = [];
                hosts.forEach((h) => { if (h.group_name) { (groups[h.group_name] ||= []).push(h); } else { ungrouped.push(h); } });
                const groupNames = Object.keys(groups).sort();
                const renderCard = (host: SSHHost) => (
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
                );
                return (<>
                  {groupNames.map((gn) => (
                    <div key={gn}>
                      <div className={`flex items-center gap-2 mb-2 ${isDark ? 'text-white/40' : 'text-black/40'}`}><span className="material-symbols-outlined text-sm">folder</span><span className="text-xs font-semibold uppercase tracking-wide">{gn}</span><span className="text-[10px]">({groups[gn].length})</span></div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{groups[gn].map(renderCard)}</div>
                    </div>
                  ))}
                  {ungrouped.length > 0 && (
                    <div>
                      {groupNames.length > 0 && <div className={`flex items-center gap-2 mb-2 ${isDark ? 'text-white/40' : 'text-black/40'}`}><span className="material-symbols-outlined text-sm">dns</span><span className="text-xs font-semibold uppercase tracking-wide">{tt.ungrouped || 'Ungrouped'}</span><span className="text-[10px]">({ungrouped.length})</span></div>}
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{ungrouped.map(renderCard)}</div>
                    </div>
                  )}
                </>);
              })()}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Sessions view ──
  if (view === 'sessions') {
    const showSftp = activeTab?.sftpOpen ?? false;
    return (<>
      <div className={`h-full flex flex-col overflow-hidden ${isDark ? 'bg-[#1a1b26]' : 'bg-[#fafafa]'}`}>
        {/* Tab bar */}
        <div className={`flex items-center shrink-0 overflow-x-auto no-scrollbar border-b ${isDark ? 'bg-[#13141c] border-white/5' : 'bg-[#ececec] border-black/5'}`}>
          <div className="flex items-center flex-1 min-w-0 ps-1">
            {tabs.map((tab) => (
              <div key={tab.id} className={`flex items-center gap-1.5 px-3 py-2 text-xs cursor-pointer transition-all shrink-0 rounded-t-lg mx-0.5 ${tab.id === activeTabId ? (isDark ? 'bg-[#1a1b26] text-white shadow-sm' : 'bg-white text-gray-800 shadow-sm') : (isDark ? 'text-white/40 hover:text-white/70 hover:bg-white/5' : 'text-gray-500 hover:text-gray-700 hover:bg-black/5')}`} onClick={() => setActiveTabId(tab.id)}>
                {tab.connecting ? (<span className="material-symbols-outlined text-[11px] text-amber-400 animate-spin">progress_activity</span>) : tab.sessionId ? (<span className="w-2 h-2 rounded-full bg-green-400 shrink-0 shadow-[0_0_4px_rgba(74,222,128,0.5)]" />) : (<span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />)}
                <span className="truncate max-w-[120px] font-medium">{tab.hostName}{(() => { const sameHost = tabs.filter((t) => t.hostId === tab.hostId); return sameHost.length > 1 ? ` #${sameHost.indexOf(tab) + 1}` : ''; })()}</span>
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
              {!activeTab.sessionId && !activeTab.connecting && (<>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded-full bg-red-500/15 text-red-400 font-medium">{tt.disconnected || 'Disconnected'}</span>
                <button onClick={() => reconnectTab(activeTab.id)} className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 font-medium transition-colors">
                  <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>refresh</span>
                  {tt.reconnect || 'Reconnect'}
                </button>
              </>)}
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
              <div className="relative" ref={termSettingsRef}>
                <button onClick={() => setShowTermSettings(!showTermSettings)} className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-all ${showTermSettings ? 'bg-amber-500/20 text-amber-400' : isDark ? 'text-white/40 hover:text-white/70 hover:bg-white/10' : 'text-gray-400 hover:text-gray-600 hover:bg-black/5'}`} title={tt.termSettings || 'Terminal Settings'}>
                  <span className="material-symbols-outlined text-sm">settings</span>
                </button>
                {showTermSettings && (
                  <div className={`absolute end-0 top-full mt-1 z-50 w-52 rounded-xl shadow-lg p-3 space-y-3 ${isDark ? 'bg-[#1e1f2e] border border-white/10' : 'bg-white border border-black/10'}`}>
                    <div>
                      <div className={`text-[10px] font-medium mb-1.5 ${isDark ? 'text-white/40' : 'text-black/40'}`}>{tt.termFontSize || 'Font Size'}</div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setTermFontSize(Math.max(10, termFontSize - 1))} className={`w-6 h-6 flex items-center justify-center rounded-md text-xs font-bold transition-colors ${isDark ? 'bg-white/10 hover:bg-white/20 text-white/60' : 'bg-black/5 hover:bg-black/10 text-black/60'}`}>−</button>
                        <span className={`text-xs font-mono flex-1 text-center ${isDark ? 'text-white/70' : 'text-black/70'}`}>{termFontSize}px</span>
                        <button onClick={() => setTermFontSize(Math.min(24, termFontSize + 1))} className={`w-6 h-6 flex items-center justify-center rounded-md text-xs font-bold transition-colors ${isDark ? 'bg-white/10 hover:bg-white/20 text-white/60' : 'bg-black/5 hover:bg-black/10 text-black/60'}`}>+</button>
                      </div>
                    </div>
                    <div>
                      <div className={`text-[10px] font-medium mb-1.5 ${isDark ? 'text-white/40' : 'text-black/40'}`}>{tt.termTheme || 'Theme'}</div>
                      <div className="space-y-0.5">
                        {TERM_THEME_NAMES.map((name) => (
                          <button key={name} onClick={() => setTermTheme(name)} className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-xs transition-colors ${termTheme === name ? 'bg-cyan-500/20 text-cyan-400' : isDark ? 'text-white/50 hover:bg-white/5 hover:text-white/70' : 'text-black/50 hover:bg-black/5 hover:text-black/70'}`}>
                            <span className="w-3 h-3 rounded-full border shrink-0" style={{ backgroundColor: TERM_THEMES[name].dark.background, borderColor: TERM_THEMES[name].dark.foreground + '40' }} />
                            {name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
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
                    {/* Uptime + Load */}
                    <div className={`flex items-center gap-1 text-[10px] px-1.5 ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                      <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>schedule</span>
                      <span className="truncate">{activeTab.sysInfo.uptime_seconds ? fmtUptime(activeTab.sysInfo.uptime_seconds, tt) : activeTab.sysInfo.uptime}</span>
                    </div>
                    <div className={`flex items-center gap-1 text-[10px] px-1.5 ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                      <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>speed</span>
                      <span>{activeTab.sysInfo.load_avg.load1} / {activeTab.sysInfo.load_avg.load5} / {activeTab.sysInfo.load_avg.load15}</span>
                    </div>

                    {/* ── Ring gauges row: CPU / Mem / Swap ── */}
                    {(() => {
                      const ringSize = 56;
                      const strokeW = 5;
                      const r = (ringSize - strokeW) / 2;
                      const circ = 2 * Math.PI * r;
                      const ring = (pct: number, label: string, sub: string, color: string) => {
                        const offset = circ * (1 - Math.min(100, pct) / 100);
                        return (
                          <div className="flex flex-col items-center gap-0.5">
                            <svg width={ringSize} height={ringSize} className="-rotate-90">
                              <circle cx={ringSize / 2} cy={ringSize / 2} r={r} fill="none" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeWidth={strokeW} />
                              <circle cx={ringSize / 2} cy={ringSize / 2} r={r} fill="none" stroke={color} strokeWidth={strokeW} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-500" />
                              <text x={ringSize / 2} y={ringSize / 2} textAnchor="middle" dominantBaseline="central" fill={color} fontSize="11" fontWeight="700" className="rotate-90" style={{ transformOrigin: 'center' }}>{pct}%</text>
                            </svg>
                            <span className="text-[9px] font-medium" style={{ color }}>{label}</span>
                            <span className={`text-[8px] ${isDark ? 'text-white/25' : 'text-black/25'}`}>{sub}</span>
                          </div>
                        );
                      };
                      const cpuColor = activeTab.sysInfo!.cpu.use_pct > 90 ? '#f87171' : activeTab.sysInfo!.cpu.use_pct > 70 ? '#fbbf24' : '#4ade80';
                      const memColor = activeTab.sysInfo!.memory.use_pct > 90 ? '#f87171' : activeTab.sysInfo!.memory.use_pct > 70 ? '#fbbf24' : '#60a5fa';
                      const swapPct = activeTab.sysInfo!.swap.total > 0 ? activeTab.sysInfo!.swap.use_pct : 0;
                      const swapColor = swapPct > 90 ? '#f87171' : swapPct > 70 ? '#fbbf24' : '#a78bfa';
                      return (
                        <div className={`rounded-lg p-2 ${isDark ? 'bg-white/5' : 'bg-black/[.03]'}`}>
                          <div className="flex items-start justify-around">
                            {ring(activeTab.sysInfo!.cpu.use_pct, 'CPU', `${activeTab.sysInfo!.cpu.cores}C`, cpuColor)}
                            {ring(activeTab.sysInfo!.memory.use_pct, tt.memory || 'Mem', fmtBytes(activeTab.sysInfo!.memory.total), memColor)}
                            {ring(swapPct, 'Swap', activeTab.sysInfo!.swap.total > 0 ? fmtBytes(activeTab.sysInfo!.swap.total) : 'N/A', swapColor)}
                          </div>
                        </div>
                      );
                    })()}

                    {/* ── Network sparkline (always visible) ── */}
                    {activeTab.sysInfo.network.length > 0 && (
                      <div className={`rounded-lg p-1.5 ${isDark ? 'bg-white/5' : 'bg-black/[.03]'}`}>
                        <div className="flex items-center justify-between mb-1 text-[8px]">
                          <span className="text-green-400 flex items-center gap-0.5"><span className="material-symbols-outlined" style={{ fontSize: '9px' }}>download</span>{netRates.length >= 2 ? fmtRate(netRates[netRates.length - 1].rx) : '0 B/s'}</span>
                          <span className="text-blue-400 flex items-center gap-0.5"><span className="material-symbols-outlined" style={{ fontSize: '9px' }}>upload</span>{netRates.length >= 2 ? fmtRate(netRates[netRates.length - 1].tx) : '0 B/s'}</span>
                        </div>
                        {netRates.length >= 2 && (
                          <svg width="100%" height="28" viewBox={`0 0 ${SYSINFO_WIDTH - 24} 28`} preserveAspectRatio="none">
                            {renderSparkline(netRates.map((rv) => rv.rx), '#4ade80', SYSINFO_WIDTH - 24, 28)}
                            {renderSparkline(netRates.map((rv) => rv.tx), '#60a5fa', SYSINFO_WIDTH - 24, 28)}
                          </svg>
                        )}
                      </div>
                    )}

                    {/* ── Disks (collapsible) ── */}
                    {activeTab.sysInfo.disks.length > 0 && (
                      <div>
                        <button onClick={() => toggleSection('disks')} className={`flex items-center gap-1 px-1 py-0.5 w-full text-start rounded transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/[.03]'}`}>
                          <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>{activeTab.collapsedSections.has('disks') ? 'chevron_right' : 'expand_more'}</span>
                          <span className="material-symbols-outlined text-purple-400" style={{ fontSize: '12px' }}>hard_drive_2</span>
                          <span className="text-[10px] font-medium flex-1">{tt.disks || 'Disks'}</span>
                          <span className={`text-[9px] ${isDark ? 'text-white/20' : 'text-black/20'}`}>{activeTab.sysInfo.disks.length}</span>
                        </button>
                        {!activeTab.collapsedSections.has('disks') && activeTab.sysInfo.disks.map((d) => (
                          <div key={d.mount} className={`group/disk relative px-1.5 py-1 rounded text-[9px] mb-1 ${isDark ? 'bg-white/5' : 'bg-black/[.03]'}`}>
                            <div className="flex items-center justify-between mb-0.5">
                              <span className={`font-mono truncate ${isDark ? 'text-white/40' : 'text-black/40'}`}>{d.mount}</span>
                              <button onClick={() => copyToClipboard(d.mount).then(() => toast('success', tt.copied || 'Copied')).catch(() => {})} className={`shrink-0 opacity-0 group-hover/disk:opacity-100 transition-opacity p-0.5 rounded ${isDark ? 'hover:bg-white/10 text-white/25 hover:text-white/60' : 'hover:bg-black/5 text-black/20 hover:text-black/50'}`} title={tt.copyPath || 'Copy path'}><span className="material-symbols-outlined" style={{ fontSize: '11px' }}>content_copy</span></button>
                              <span className={`font-medium ${pctColor(d.use_pct)}`}>{d.use_pct}%</span>
                            </div>
                            {/* Full path tooltip */}
                            <div className={`absolute z-50 hidden group-hover/disk:block start-0 bottom-full mb-1 px-2 py-1 rounded text-[9px] font-mono shadow-lg max-w-[260px] break-all whitespace-pre-wrap ${isDark ? 'bg-[#1e1e2e] border border-white/10 text-white/60' : 'bg-white border border-black/10 text-black/60'}`}>{d.mount}</div>
                            <div className={`w-full h-1 rounded-full ${isDark ? 'bg-white/10' : 'bg-black/10'}`}><div className={`h-full rounded-full ${pctBarColor(d.use_pct)}`} style={{ width: `${Math.min(100, d.use_pct)}%` }} /></div>
                            <div className={`text-[8px] mt-0.5 ${isDark ? 'text-white/20' : 'text-black/20'}`}>{fmtBytes(d.used)} / {fmtBytes(d.total)}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ── Network interfaces (collapsible) ── */}
                    {activeTab.sysInfo.network.length > 0 && (
                      <div>
                        <button onClick={() => toggleSection('network')} className={`flex items-center gap-1 px-1 py-0.5 w-full text-start rounded transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/[.03]'}`}>
                          <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>{activeTab.collapsedSections.has('network') ? 'chevron_right' : 'expand_more'}</span>
                          <span className="material-symbols-outlined text-purple-400" style={{ fontSize: '12px' }}>lan</span>
                          <span className="text-[10px] font-medium flex-1">{tt.network || 'Network'}</span>
                          <span className={`text-[9px] ${isDark ? 'text-white/20' : 'text-black/20'}`}>{activeTab.sysInfo.network.length}</span>
                        </button>
                        {!activeTab.collapsedSections.has('network') && activeTab.sysInfo.network.map((n) => (
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

                    {/* ── Processes (collapsible) ── */}
                    {activeTab.sysInfo.processes?.length > 0 && (
                      <div>
                        <button onClick={() => toggleSection('processes')} className={`flex items-center gap-1 px-1 py-0.5 w-full text-start rounded transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/[.03]'}`}>
                          <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>{activeTab.collapsedSections.has('processes') ? 'chevron_right' : 'expand_more'}</span>
                          <span className="material-symbols-outlined text-purple-400" style={{ fontSize: '12px' }}>list</span>
                          <span className="text-[10px] font-medium flex-1">{tt.processes || 'Processes'}</span>
                          <span className={`text-[9px] ${isDark ? 'text-white/20' : 'text-black/20'}`}>{activeTab.sysInfo.processes.length}</span>
                        </button>
                        {!activeTab.collapsedSections.has('processes') && (
                          <div className={`rounded-lg overflow-hidden ${isDark ? 'bg-white/5' : 'bg-black/[.03]'}`}>
                            <div className={`flex items-center gap-1 px-1.5 py-[2px] text-[8px] font-semibold ${isDark ? 'text-white/25 bg-white/[.03]' : 'text-black/25 bg-black/[.02]'}`}>
                              <span className="w-3 text-end shrink-0">#</span>
                              <span className="flex-1 min-w-0">{tt.processName || 'Process'}</span>
                              <span className="shrink-0 w-8 text-end">MEM</span>
                              <span className="shrink-0 w-8 text-end">CPU</span>
                            </div>
                            {activeTab.sysInfo.processes.map((p, i) => (
                              <div key={`${p.pid}-${i}`} className={`flex items-center gap-1 px-1.5 py-[3px] text-[9px] font-mono ${i % 2 === 0 ? '' : isDark ? 'bg-white/[.02]' : 'bg-black/[.015]'}`}>
                                <span className={`w-3 text-end shrink-0 ${isDark ? 'text-white/20' : 'text-black/20'}`}>{i + 1}</span>
                                <span className={`flex-1 min-w-0 truncate ${isDark ? 'text-white/60' : 'text-black/60'}`}>{p.name}</span>
                                <span className={`shrink-0 w-8 text-end ${pctColor(p.mem_pct)}`}>{p.mem_pct}%</span>
                                <span className={`shrink-0 w-8 text-end ${pctColor(p.cpu_pct)}`}>{p.cpu_pct}%</span>
                              </div>
                            ))}
                          </div>
                        )}
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
                        <button onClick={() => reconnectTab(tab.id)} className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors">
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
                  {uploadProgress && (
                    <div className={`absolute start-0 end-0 top-0 z-40 px-3 py-1.5 flex items-center gap-2 ${isDark ? 'bg-[#1e1f2e]/95' : 'bg-white/95'} border-b ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                      <span className="material-symbols-outlined text-sm text-cyan-400 animate-spin">progress_activity</span>
                      <span className={`text-[11px] font-mono truncate flex-1 ${isDark ? 'text-white/60' : 'text-black/60'}`}>{uploadProgress.name}</span>
                      <span className={`text-[11px] shrink-0 ${isDark ? 'text-white/40' : 'text-black/40'}`}>{uploadProgress.current}/{uploadProgress.total}</span>
                      <div className={`w-20 h-1.5 rounded-full overflow-hidden shrink-0 ${isDark ? 'bg-white/10' : 'bg-black/10'}`}>
                        <div className="h-full rounded-full bg-cyan-400 transition-all" style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }} />
                      </div>
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
                          <button onClick={sftpNewFile} className={`p-1 rounded-md transition-colors ${isDark ? 'hover:bg-white/10 text-white/40' : 'hover:bg-black/5 text-gray-400'}`} title={tt.sftpNewFile || 'New File'}><span className="material-symbols-outlined text-sm">note_add</span></button>
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
                                <div key={entry.path} className={`flex items-center gap-2 px-3 py-1 group cursor-pointer transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/[.03]'}`} onClick={() => entry.is_dir && sftpNavigate(entry.path)} onDoubleClick={() => !entry.is_dir && openFileInEditor(entry)}>
                                  <span className={`material-symbols-outlined text-sm ${fi.color}`}>{fi.icon}</span>
                                  <div className="flex-1 min-w-0"><span className={`text-xs truncate block ${entry.is_dir ? 'text-cyan-400 font-medium' : ''}`}>{entry.name}</span></div>
                                  <span className={`text-[10px] shrink-0 ${isDark ? 'text-white/25' : 'text-black/25'}`}>{entry.is_dir ? '' : formatSize(entry.size)}</span>
                                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {!entry.is_dir && (<button onClick={(e) => { e.stopPropagation(); openFileInEditor(entry); }} className={`p-0.5 rounded transition-colors ${isDark ? 'hover:bg-white/10 text-white/30' : 'hover:bg-black/5 text-gray-400'}`} title={tt.editor || 'Edit'}><span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit_document</span></button>)}
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
                      {/* Command input bar */}
                      <div className={`flex items-center gap-2 px-3 py-2 border-b shrink-0 ${isDark ? 'border-white/5' : 'border-black/5'}`}>
                        <span className={`text-xs font-mono shrink-0 ${isDark ? 'text-cyan-400/60' : 'text-cyan-600/60'}`}>$</span>
                        <div className="flex-1 min-w-0 relative">
                          <input className={`w-full px-2 py-1 rounded-md text-xs font-mono border-none outline-none focus:ring-0 ${cmdInput ? 'pe-6' : ''} ${isDark ? 'bg-white/5 text-white/70 placeholder:text-white/20' : 'bg-black/[.03] text-black/70 placeholder:text-black/20'}`} placeholder={tt.typeCommand || 'Type a command and press Enter...'} value={cmdInput} onChange={(e) => setCmdInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendCmdInput(); }} />
                          {cmdInput && (
                            <button onClick={() => setCmdInput('')} className={`absolute end-1 top-1/2 -translate-y-1/2 p-0.5 rounded transition-colors ${isDark ? 'text-white/25 hover:text-white/60 hover:bg-white/10' : 'text-black/20 hover:text-black/50 hover:bg-black/5'}`} title={tt.clear || 'Clear'}>
                              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                            </button>
                          )}
                        </div>
                        <button onClick={sendCmdInput} disabled={!cmdInput.trim()} className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-40 transition-colors shrink-0">
                          <span className="material-symbols-outlined text-sm">send</span>
                          {tt.send || 'Send'}
                        </button>
                        {/* Command templates dropdown */}
                        <div className="relative shrink-0 group/tpl">
                          <button className={`flex items-center gap-0.5 px-2 py-1 text-[11px] font-medium rounded-md transition-colors shrink-0 ${isDark ? 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70' : 'bg-black/[.03] text-black/40 hover:bg-black/[.06] hover:text-black/70'}`}>
                            <span className="material-symbols-outlined text-sm">terminal</span>
                            {tt.templates || 'Templates'}
                            <span className="material-symbols-outlined text-sm">expand_more</span>
                          </button>
                          <div className={`absolute end-0 top-full mt-1 z-50 hidden group-hover/tpl:block rounded-lg border shadow-xl py-1 min-w-[220px] ${isDark ? 'bg-[#1e2028] border-white/10 shadow-black/40' : 'bg-white border-black/10 shadow-black/10'}`}>
                            {[
                              { label: 'Top', cmd: 'top -bn1 | head -20' },
                              { label: 'Disk', cmd: 'df -h' },
                              { label: 'Memory', cmd: 'free -h' },
                              { label: 'Ports', cmd: 'ss -tlnp' },
                              { label: 'PS', cmd: 'ps aux --sort=-%mem | head -15' },
                              { label: 'Uptime', cmd: 'uptime' },
                              { label: 'IP', cmd: 'ip addr show' },
                              { label: 'Logs', cmd: 'journalctl -n 50 --no-pager' },
                            ].map((tpl) => (
                              <button key={tpl.label} onClick={() => setCmdInput(tpl.cmd)} onDoubleClick={() => execSnippet(tpl.cmd)} className={`w-full flex items-center gap-2 px-3 py-1.5 text-start transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/[.03]'}`}>
                                <span className={`text-[10px] font-semibold w-12 shrink-0 ${isDark ? 'text-cyan-400/60' : 'text-cyan-600/60'}`}>{tpl.label}</span>
                                <span className={`text-[10px] font-mono truncate ${isDark ? 'text-white/50' : 'text-black/50'}`}>{tpl.cmd}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      {/* Command history list */}
                      <div className="flex-1 overflow-y-auto neon-scrollbar">
                        {(() => {
                          const q = cmdInput.trim().toLowerCase();
                          const filtered = q ? activeTab.snippets.filter((s) => s.command.toLowerCase().includes(q)) : activeTab.snippets;
                          if (filtered.length === 0) return (
                            <div className={`flex flex-col items-center justify-center h-24 gap-2 ${isDark ? 'text-white/30' : 'text-black/20'}`}>
                              <span className="material-symbols-outlined text-2xl">terminal</span>
                              <span className="text-xs">{q ? (tt.noResults || 'No matching commands') : (tt.noCommands || 'No command history')}</span>
                            </div>
                          );
                          return (
                            <div className="divide-y divide-white/[.03] dark:divide-white/[.03]">
                              {filtered.map((s) => (
                                <div key={s.id} className={`flex items-center gap-2 px-3 py-1 group cursor-pointer transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/[.03]'}`} onClick={() => setCmdInput(s.command)} onDoubleClick={() => execSnippet(s.command)}>
                                  <span className={`material-symbols-outlined shrink-0 ${s.is_favorite ? 'text-amber-400' : isDark ? 'text-white/20' : 'text-black/15'}`} style={{ fontSize: '14px' }}>{s.is_favorite ? 'star' : 'chevron_right'}</span>
                                  <div className={`flex-1 min-w-0 text-xs font-mono truncate ${isDark ? 'text-white/70' : 'text-black/70'}`}>{s.command}</div>
                                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                    <button onClick={() => toggleFavorite(s.id)} className={`p-0.5 rounded transition-colors ${s.is_favorite ? 'text-amber-400 hover:text-amber-300' : isDark ? 'hover:bg-white/10 text-white/30 hover:text-amber-400' : 'hover:bg-black/5 text-gray-400 hover:text-amber-500'}`} title={s.is_favorite ? (tt.unfavorite || 'Unfavorite') : (tt.favorite || 'Favorite')}>
                                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{s.is_favorite ? 'star' : 'star_outline'}</span>
                                    </button>
                                    <button onClick={() => deleteSnippet(s.id)} className={`p-0.5 rounded transition-colors ${isDark ? 'hover:bg-red-500/20 text-white/30 hover:text-red-400' : 'hover:bg-red-500/10 text-gray-400 hover:text-red-400'}`} title={tt.delete || 'Delete'}>
                                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>delete</span>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── File Loading Overlay ── */}
      {activeTab?.editorLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ animation: 'fade-in 0.1s ease-out' }}>
          <div className={`absolute inset-0 ${isDark ? 'bg-black/40' : 'bg-black/20'} backdrop-blur-sm`} />
          <div className={`relative flex flex-col items-center gap-3 px-8 py-6 rounded-xl shadow-xl ${isDark ? 'bg-[#1e1e2e] border border-white/10' : 'bg-white border border-black/10'}`}>
            <span className="material-symbols-outlined text-3xl text-cyan-400 animate-spin">progress_activity</span>
            <span className={`text-sm font-medium ${isDark ? 'text-white/70' : 'text-black/70'}`}>{tt.loadingFile || 'Loading file...'}</span>
          </div>
        </div>
      )}

      {/* ── File Editor Modal ── */}
      {activeTab?.editorFile && (
        <Suspense fallback={null}>
          <SftpEditor
            content={activeTab.editorFile.content}
            filename={activeTab.editorFile.name}
            filePath={activeTab.editorFile.path}
            isDark={isDark}
            isDirty={activeTab.editorDirty}
            saving={activeTab.editorSaving}
            fileSize={activeTab.editorFile.size}
            lineEnding={activeTab.editorFile.lineEnding}
            onContentChange={editorContentChange}
            onSave={editorSave}
            onClose={editorClose}
            tt={tt}
          />
        </Suspense>
      )}
    </>);
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
          <div><label className="text-xs text-text-muted mb-1 block">{tt.groupName || 'Group'}</label><input className="sci-input w-full px-3 py-2 rounded-lg bg-surface-sunken text-sm" value={form.group_name} onChange={(e) => setForm({ ...form, group_name: e.target.value })} placeholder={tt.groupPlaceholder || 'e.g. Production, Staging...'} list="host-groups" /><datalist id="host-groups">{[...new Set(hosts.map((h) => h.group_name).filter(Boolean))].map((g) => <option key={g} value={g} />)}</datalist></div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_favorite} onChange={(e) => setForm({ ...form, is_favorite: e.target.checked })} className="w-4 h-4 rounded accent-cyan-500" /><span className="text-xs text-text-muted">{tt.favorite || 'Favorite'}</span></label>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.save_password} onChange={(e) => setForm({ ...form, save_password: e.target.checked })} className="w-4 h-4 rounded accent-amber-500" /><span className="text-xs text-text-muted">{tt.savePassword || 'Save Password'}</span></label>
          </div>
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
