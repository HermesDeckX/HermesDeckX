import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Language } from '../../types';
import { getTranslation } from '../../locales';
import { llmApi, gwApi } from '../../services/api';
import type { CliExecResult, ExecCapability } from '../../services/api';
import { useToast } from '../Toast';
import { copyToClipboard } from '../../utils/clipboard';

interface TestCenterPanelProps {
  language: Language;
}

interface CommandEntry {
  id: string;
  label: string;
  icon: string;
  description: string;
  command: string;
  args: string[];
  category: 'llm' | 'gateway' | 'system';
  timeoutMs?: number;
}

interface ExecLog {
  id: string;
  command: string;
  args: string[];
  timestamp: string;
  result?: CliExecResult;
  error?: string;
  running: boolean;
}

const EXEC_LOG_KEY = 'doctor.testCenter.logs';
const MAX_LOGS = 30;

// Strip ANSI escape codes (colors, cursor, etc.)
const stripAnsi = (str: string): string =>
  str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');

const copyText = async (text: string) => {
  try { await copyToClipboard(text); } catch {}
};

const TestCenterPanel: React.FC<TestCenterPanelProps> = ({ language }) => {
  const t = useMemo(() => getTranslation(language) as any, [language]);
  const { toast } = useToast();
  const dr = (t.dr || {}) as any;

  const [logs, setLogs] = useState<ExecLog[]>(() => {
    try {
      const raw = localStorage.getItem(EXEC_LOG_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return parsed.map((l: any) => ({ ...l, running: false }));
    } catch { return []; }
  });
  const [customCmd, setCustomCmd] = useState('');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'all' | 'llm' | 'gateway' | 'system'>('all');
  const [presetsOpen, setPresetsOpen] = useState(false);
  const outputEndRef = useRef<HTMLDivElement>(null);
  const [execCap, setExecCap] = useState<ExecCapability | null>(null);

  useEffect(() => {
    llmApi.execCapabilityCached(15000).then(setExecCap).catch(() => {});
  }, []);

  const presetCommands = useMemo((): CommandEntry[] => [
    // --- Gateway ---
    // hermes CLI commands (text output, no --json support)
    {
      id: 'doctor',
      label: dr.tcDoctor || 'Doctor',
      icon: 'health_and_safety',
      description: dr.tcDoctorDesc || 'Run full health diagnostics',
      command: 'hermes',
      args: ['doctor'],
      category: 'gateway',
    },
    {
      id: 'status',
      label: dr.tcStatus || 'Status',
      icon: 'monitor_heart',
      description: dr.tcStatusDesc || 'Comprehensive system status overview',
      command: 'hermes',
      args: ['status'],
      category: 'gateway',
    },
    {
      id: 'gateway-status',
      label: dr.tcGatewayStatus || 'Gateway Status',
      icon: 'dns',
      description: dr.tcGatewayStatusDesc || 'Show gateway service status',
      command: 'hermes',
      args: ['gateway', 'status'],
      category: 'gateway',
    },
    {
      id: 'gateway-status-deep',
      label: dr.tcGatewayStatusDeep || 'Gateway Deep Status',
      icon: 'troubleshoot',
      description: dr.tcGatewayStatusDeepDesc || 'Deep gateway status check',
      command: 'hermes',
      args: ['gateway', 'status', '--deep'],
      category: 'gateway',
    },
    {
      id: 'cron-list',
      label: dr.tcCronList || 'Cron Jobs',
      icon: 'schedule',
      description: dr.tcCronListDesc || 'List scheduled cron jobs',
      command: 'hermes',
      args: ['cron', 'list'],
      category: 'gateway',
    },
    // --- System ---
    {
      id: 'config-show',
      label: dr.tcConfigGet || 'Config Show',
      icon: 'settings',
      description: dr.tcConfigGetDesc || 'Display current hermes configuration',
      command: 'hermes',
      args: ['config', 'show'],
      category: 'system',
    },
    {
      id: 'config-check',
      label: dr.tcConfigCheck || 'Config Check',
      icon: 'fact_check',
      description: dr.tcConfigCheckDesc || 'Check for missing or outdated config',
      command: 'hermes',
      args: ['config', 'check'],
      category: 'system',
    },
    {
      id: 'version',
      label: dr.tcVersion || 'Version',
      icon: 'info',
      description: dr.tcVersionDesc || 'Show Hermes Agent version information',
      command: 'hermes',
      args: ['--version'],
      category: 'system',
    },
    {
      id: 'dump',
      label: dr.tcDump || 'Dump',
      icon: 'summarize',
      description: dr.tcDumpDesc || 'Dump setup summary for support and debugging',
      command: 'hermes',
      args: ['dump'],
      category: 'system',
    },
    {
      id: 'skills-list',
      label: dr.tcSkillsList || 'Skills List',
      icon: 'psychology',
      description: dr.tcSkillsListDesc || 'List all installed skills',
      command: 'hermes',
      args: ['skills', 'list'],
      category: 'system',
    },
    {
      id: 'skills-check',
      label: dr.tcSkillsCheck || 'Skills Check',
      icon: 'checklist',
      description: dr.tcSkillsCheckDesc || 'Check installed skills for updates',
      command: 'hermes',
      args: ['skills', 'check'],
      category: 'system',
    },
    {
      id: 'plugins-list',
      label: dr.tcPluginsList || 'Plugins List',
      icon: 'extension',
      description: dr.tcPluginsListDesc || 'List all installed plugins',
      command: 'hermes',
      args: ['plugins', 'list'],
      category: 'system',
    },
    {
      id: 'tools-list',
      label: dr.tcToolsList || 'Tools List',
      icon: 'build',
      description: dr.tcToolsListDesc || 'List all tools and their enabled status',
      command: 'hermes',
      args: ['tools', 'list'],
      category: 'system',
    },
    {
      id: 'tools-summary',
      label: dr.tcToolsSummary || 'Tools Summary',
      icon: 'dashboard',
      description: dr.tcToolsSummaryDesc || 'Summary of enabled tools per platform',
      command: 'hermes',
      args: ['tools', '--summary'],
      category: 'system',
    },
  ], [dr]);

  const filteredCommands = useMemo(() => {
    if (activeCategory === 'all') return presetCommands;
    return presetCommands.filter(c => c.category === activeCategory);
  }, [activeCategory, presetCommands]);

  const saveLogs = useCallback((next: ExecLog[]) => {
    const toSave = next.filter(l => !l.running).slice(0, MAX_LOGS);
    try { localStorage.setItem(EXEC_LOG_KEY, JSON.stringify(toSave)); } catch {}
  }, []);

  const execCommand = useCallback(async (command: string, args: string[], timeoutMs = 30000) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const entry: ExecLog = {
      id,
      command,
      args,
      timestamp: new Date().toISOString(),
      running: true,
    };

    setLogs(prev => {
      const next = [entry, ...prev].slice(0, MAX_LOGS);
      return next;
    });
    setExpandedLog(id);

    try {
      const result = await llmApi.exec(command, args, timeoutMs);
      setLogs(prev => {
        const next = prev.map(l => l.id === id ? { ...l, result, running: false } : l);
        saveLogs(next);
        return next;
      });
      if (result.exitCode === 0) {
        toast('success', `${command} ${args.join(' ')} — ${dr.ok || 'OK'} (${result.durationMs}ms)`);
      } else {
        toast('warning', `${command} ${args.join(' ')} — exit ${result.exitCode}`);
      }
    } catch (err: any) {
      setLogs(prev => {
        const next = prev.map(l => l.id === id ? { ...l, error: err?.message || 'Unknown error', running: false } : l);
        saveLogs(next);
        return next;
      });
      toast('error', `${dr.tcExecFail || 'Execution failed'}: ${err?.message || ''}`);
    }

    setTimeout(() => outputEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [dr, saveLogs, toast]);

  const runPreset = useCallback((cmd: CommandEntry) => {
    execCommand(cmd.command, cmd.args, cmd.timeoutMs);
  }, [execCommand]);

  const runCustom = useCallback(() => {
    const trimmed = customCmd.trim();
    if (!trimmed) return;
    const parts = trimmed.split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);
    execCommand(cmd, args);
    setCustomCmd('');
  }, [customCmd, execCommand]);

  const clearLogs = useCallback(() => {
    setLogs([]);
    localStorage.removeItem(EXEC_LOG_KEY);
  }, []);

  const runQuickAction = useCallback(async (action: string) => {
    switch (action) {
      case 'probe-all':
        execCommand('hermes', ['status'], 60000);
        break;
      case 'refresh-auth':
        execCommand('hermes', ['config', 'check']);
        break;
      case 'full-doctor':
        execCommand('hermes', ['doctor']);
        break;
      case 'security-audit':
        execCommand('hermes', ['dump'], 30000);
        break;
      case 'gateway-health':
        try {
          const result = await gwApi.health() as any;
          toast('info', `Gateway: ${result?.status || result?.message || 'OK'}`);
        } catch (err: any) {
          toast('error', `Gateway check failed: ${err?.message || ''}`);
        }
        break;
      case 'export-report': {
        const report = {
          timestamp: new Date().toISOString(),
          logs: logs.filter(l => !l.running),
        };
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `health-report-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast('success', dr.tcExported || 'Report exported');
        break;
      }
    }
  }, [dr.tcExported, execCommand, logs, toast]);

  const quickActions = useMemo(() => [
    { id: 'probe-all', icon: 'network_check', label: dr.tcQuickProbeAll || 'Probe All Providers', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-500/20' },
    { id: 'refresh-auth', icon: 'key', label: dr.tcQuickRefreshAuth || 'Refresh Auth Status', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-500/20' },
    { id: 'full-doctor', icon: 'health_and_safety', label: dr.tcQuickDoctor || 'Full Diagnostics', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-500/20' },
    { id: 'security-audit', icon: 'shield', label: dr.tcQuickSecurity || 'Security Audit', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-500/20' },
    { id: 'gateway-health', icon: 'router', label: dr.tcQuickGateway || 'Gateway Health', color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200/50 dark:border-violet-500/20' },
    { id: 'export-report', icon: 'download', label: dr.tcQuickExport || 'Export Report', color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200/50 dark:border-white/10' },
  ], [dr]);

  const categoryBtns = [
    { id: 'all' as const, label: dr.all || 'All', icon: 'apps' },
    { id: 'llm' as const, label: dr.tcCategoryLlm || 'LLM', icon: 'smart_toy' },
    { id: 'gateway' as const, label: dr.summaryGateway || 'Gateway', icon: 'router' },
    { id: 'system' as const, label: dr.sourceSystem || 'System', icon: 'settings' },
  ];

  const categoryColors: Record<string, { border: string; icon: string; hover: string; activeBg: string; badge: string }> = {
    llm: {
      border: 'border-l-violet-400 dark:border-l-violet-500',
      icon: 'text-violet-500 dark:text-violet-400',
      hover: 'hover:border-violet-300 dark:hover:border-violet-500/40',
      activeBg: 'hover:bg-violet-50/50 dark:hover:bg-violet-500/[0.04]',
      badge: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    },
    gateway: {
      border: 'border-l-blue-400 dark:border-l-blue-500',
      icon: 'text-blue-500 dark:text-blue-400',
      hover: 'hover:border-blue-300 dark:hover:border-blue-500/40',
      activeBg: 'hover:bg-blue-50/50 dark:hover:bg-blue-500/[0.04]',
      badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    system: {
      border: 'border-l-amber-400 dark:border-l-amber-500',
      icon: 'text-amber-500 dark:text-amber-400',
      hover: 'hover:border-amber-300 dark:hover:border-amber-500/40',
      activeBg: 'hover:bg-amber-50/50 dark:hover:bg-amber-500/[0.04]',
      badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
  };

  const modeLabel = execCap?.mode === 'remote'
    ? (dr.tcModeRemote || 'Remote')
    : execCap?.mode === 'local'
      ? (dr.tcModeLocal || 'Local')
      : (dr.tcModeUnavailable || 'Unavailable');

  const modeColor = execCap?.mode === 'remote'
    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-500/20'
    : execCap?.mode === 'local'
      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-500/20'
      : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200/50 dark:border-red-500/20';

  const modeIcon = execCap?.mode === 'remote' ? 'cloud' : execCap?.mode === 'local' ? 'computer' : 'cloud_off';

  return (
    <div className="space-y-2 max-w-6xl mx-auto">
      {/* Mode badge + Quick Actions — compact horizontal bar */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {execCap && (
          <div className={`h-7 px-2.5 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 shrink-0 ${modeColor}`}
            title={execCap.mode === 'remote'
              ? (dr.tcModeRemoteHint || 'Commands are proxied to the remote gateway via WebSocket RPC')
              : execCap.mode === 'local'
                ? (dr.tcModeLocalHint || 'Commands execute locally on the HermesDeckX host')
                : (dr.tcModeUnavailableHint || 'Cannot execute commands — gateway not connected or CLI not installed')}>
            <span className="material-symbols-outlined text-[14px]">{modeIcon}</span>
            {modeLabel}
          </div>
        )}
        {execCap?.mode === 'unavailable' && (
          <div className="h-7 px-2.5 rounded-lg border border-amber-200/50 dark:border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] flex items-center gap-1.5 shrink-0">
            <span className="material-symbols-outlined text-[14px]">warning</span>
            {execCap.is_remote && !execCap.gw_connected
              ? (dr.tcRemoteDisconnected || 'Remote gateway not connected')
              : (dr.tcCliNotInstalled || 'hermes CLI not found')}
          </div>
        )}
        {quickActions.map(a => (
          <button key={a.id} onClick={() => runQuickAction(a.id)}
            className={`h-7 px-2.5 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0 ${a.color}`}>
            <span className="material-symbols-outlined text-[14px]">{a.icon}</span>
            {a.label}
          </button>
        ))}
      </div>

      {/* Custom Command + Preset toggle — single row */}
      <div className="rounded-xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-2">
        <div className="flex gap-2 items-center">
          <button onClick={() => setPresetsOpen(!presetsOpen)}
            className={`h-8 px-2 rounded-lg text-[10px] font-bold flex items-center gap-1 shrink-0 transition-all border ${presetsOpen ? 'bg-primary/10 text-primary border-primary/20' : 'bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-white/40 border-slate-200 dark:border-white/10'}`}>
            <span className="material-symbols-outlined text-[14px]">terminal</span>
            {dr.tcPresetCommands || 'Presets'}
            <span className={`material-symbols-outlined text-[12px] transition-transform ${presetsOpen ? 'rotate-180' : ''}`}>expand_more</span>
          </button>
          <div className="flex-1 relative">
            <span className="absolute start-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 dark:text-white/30 font-mono">$</span>
            <input
              type="text"
              value={customCmd}
              onChange={e => setCustomCmd(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') runCustom(); }}
              placeholder={dr.tcCustomPlaceholder || 'hermes doctor'}
              className="w-full h-8 ps-6 pe-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-[11px] font-mono text-slate-700 dark:text-white/70 placeholder:text-slate-300 dark:placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
          <button onClick={runCustom} disabled={!customCmd.trim()}
            className="h-8 px-3 rounded-lg text-[11px] font-bold bg-primary text-white disabled:opacity-40 flex items-center gap-1 shrink-0">
            <span className="material-symbols-outlined text-[14px]">play_arrow</span>
            {dr.tcRun || 'Run'}
          </button>
        </div>
      </div>

      {/* Preset Commands — collapsible panel */}
      {presetsOpen && (
        <div className="rounded-xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-2 animate-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-1 mb-2">
            {categoryBtns.map(c => {
              const cc = c.id !== 'all' ? categoryColors[c.id] : null;
              return (
                <button key={c.id} onClick={() => setActiveCategory(c.id)}
                  className={`h-6 px-2 rounded text-[9px] font-bold flex items-center gap-1 transition-all ${
                    activeCategory === c.id
                      ? (cc ? cc.badge : 'bg-primary/15 text-primary')
                      : 'bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-white/40'
                  }`}>
                  <span className="material-symbols-outlined text-[10px]">{c.icon}</span>
                  {c.label}
                </button>
              );
            })}
            <span className="text-[9px] text-slate-400 dark:text-white/25 ms-auto">{filteredCommands.length} {dr.items || 'commands'}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-1.5 max-h-[220px] overflow-y-auto">
            {filteredCommands.map(cmd => {
              const cc = categoryColors[cmd.category];
              return (
                <button key={cmd.id} onClick={() => { runPreset(cmd); setPresetsOpen(false); }}
                  className={`rounded-lg border border-l-[3px] border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] px-2 py-1.5 text-start transition-all group ${cc ? `${cc.border} ${cc.hover} ${cc.activeBg}` : 'hover:border-primary/30'}`}>
                  <div className="flex items-center gap-1.5">
                    <span className={`material-symbols-outlined text-[14px] transition-colors ${cc ? cc.icon : 'text-slate-400 group-hover:text-primary'}`}>{cmd.icon}</span>
                    <p className="text-[11px] font-bold text-slate-700 dark:text-white/75 truncate flex-1">{cmd.label}</p>
                    <span className="material-symbols-outlined text-[12px] text-slate-300 dark:text-white/20 group-hover:text-primary transition-colors shrink-0">play_arrow</span>
                  </div>
                  <p className="text-[9px] font-mono text-slate-400/60 dark:text-white/25 mt-0.5 truncate">{cmd.command} {cmd.args.join(' ')}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Output Panel */}
      <div className="rounded-xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-2 flex-1">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-white/40 flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">output</span>
            {dr.tcOutput || 'Output'} ({logs.length})
          </p>
          {logs.length > 0 && (
            <button onClick={clearLogs} className="text-[10px] text-red-500 hover:opacity-80 flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[12px]">delete</span>
              {dr.tcClear || 'Clear'}
            </button>
          )}
        </div>
        {logs.length === 0 ? (
          <p className="text-[11px] text-slate-400 dark:text-white/40 py-6 text-center">{dr.tcNoOutput || 'No output yet. Run a command to see results.'}</p>
        ) : (
          <div className="space-y-1.5 max-h-[calc(100vh-320px)] min-h-[200px] overflow-y-auto">
            {logs.map(log => {
              const isExpanded = expandedLog === log.id;
              const hasOutput = log.result?.stdout || log.result?.stderr || log.error;
              return (
                <div key={log.id}
                  className={`rounded-lg border transition-all ${
                    log.running ? 'border-primary/30 bg-primary/5 dark:bg-primary/5' :
                    log.error || (log.result && log.result.exitCode !== 0) ? 'border-red-200/50 dark:border-red-500/20 bg-red-50/30 dark:bg-red-500/5' :
                    'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]'
                  }`}>
                  <button onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                    className="w-full px-2.5 py-2 text-start">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {log.running ? (
                          <span className="material-symbols-outlined text-[14px] text-primary animate-spin">progress_activity</span>
                        ) : log.error || (log.result && log.result.exitCode !== 0) ? (
                          <span className="material-symbols-outlined text-[14px] text-red-500">error</span>
                        ) : (
                          <span className="material-symbols-outlined text-[14px] text-emerald-500">check_circle</span>
                        )}
                        <p className="text-[10px] font-mono font-bold text-slate-600 dark:text-white/60 truncate">
                          {log.command} {log.args.join(' ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {log.result?.durationMs !== undefined && (
                          <span className="text-[9px] text-slate-400 dark:text-white/30">{log.result.durationMs}ms</span>
                        )}
                        <span className="text-[9px] text-slate-400 dark:text-white/25">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        {hasOutput && (
                          <span className={`material-symbols-outlined text-[12px] text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                        )}
                      </div>
                    </div>
                  </button>
                  {isExpanded && hasOutput && (() => {
                    const fullText = [
                      log.result?.stdout ? stripAnsi(log.result.stdout) : '',
                      log.result?.stderr ? stripAnsi(log.result.stderr) : '',
                      log.error ? stripAnsi(log.error) : '',
                    ].filter(Boolean).join('\n');
                    return (
                      <div className="px-2.5 pb-2">
                        <div className="rounded-lg bg-slate-900 dark:bg-black/50 p-3 max-h-[400px] overflow-auto relative group/output">
                          <button
                            onClick={() => { copyText(fullText); toast('success', dr.tcCopied || 'Copied'); }}
                            className="absolute top-2 end-2 h-6 px-1.5 rounded bg-white/10 text-white/50 hover:text-white hover:bg-white/20 text-[9px] font-bold flex items-center gap-0.5 opacity-0 group-hover/output:opacity-100 transition-opacity z-10"
                            title={dr.tcCopy || 'Copy'}
                          >
                            <span className="material-symbols-outlined text-[12px]">content_copy</span>
                          </button>
                          {log.result?.stdout && (
                            <pre className="text-[11px] font-mono text-emerald-400 whitespace-pre-wrap break-all leading-relaxed select-text">{stripAnsi(log.result.stdout)}</pre>
                          )}
                          {log.result?.stderr && (
                            <pre className="text-[11px] font-mono text-red-400 whitespace-pre-wrap break-all leading-relaxed mt-1 select-text">{stripAnsi(log.result.stderr)}</pre>
                          )}
                          {log.error && (
                            <pre className="text-[11px] font-mono text-red-400 whitespace-pre-wrap break-all leading-relaxed select-text">{stripAnsi(log.error)}</pre>
                          )}
                          {log.result && (
                            <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-3 text-[9px]">
                              <span className={log.result.exitCode === 0 ? 'text-emerald-400' : 'text-red-400'}>
                                exit: {log.result.exitCode}
                              </span>
                              <span className="text-slate-500">duration: {log.result.durationMs}ms</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
            <div ref={outputEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};

export default TestCenterPanel;
