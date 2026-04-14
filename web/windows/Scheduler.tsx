
import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Language } from '../types';
import { getTranslation } from '../locales';
import { gwApi } from '../services/api';
import { useGatewayStatus } from '../hooks/useGatewayStatus';
import { fmtRelativeFuture } from '../utils/time';
import { useVisibilityPolling } from '../hooks/useVisibilityPolling';
import { useAutoError } from '../hooks/useAutoError';
import { readStorage, writeStorage } from '../utils/storage';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import CustomSelect from '../components/CustomSelect';
import CronBuilder from '../components/CronBuilder';

interface SchedulerProps { language: Language; }

type ScheduleKind = 'interval' | 'once' | 'cron';

interface CronForm {
  name: string; prompt: string; enabled: boolean;
  scheduleKind: ScheduleKind; scheduleAt: string; everyAmount: string; everyUnit: 'minutes' | 'hours' | 'days';
  cronExpr: string;
  deliver: string; skills: string; model: string; provider: string; script: string;
  repeatTimes: string;
}

const DEFAULT_FORM: CronForm = {
  name: '', prompt: '', enabled: true,
  scheduleKind: 'interval', scheduleAt: '', everyAmount: '30', everyUnit: 'minutes',
  cronExpr: '0 7 * * *',
  deliver: 'local', skills: '', model: '', provider: '', script: '',
  repeatTimes: '',
};


function fmtSchedule(job: any, l?: any) {
  const schedule = job.schedule;
  if (!schedule) return job.schedule_display || l?.na || '-';
  if (schedule.kind === 'once') {
    const runAt = schedule.run_at;
    return runAt ? `${l?.once || 'once'} ${new Date(runAt).toLocaleString()}` : (schedule.display || l?.na || '-');
  }
  if (schedule.kind === 'interval') {
    const mins = schedule.minutes || 0;
    if (mins >= 1440) return `${l?.every || 'every'} ${Math.round(mins / 1440)}d`;
    if (mins >= 60) return `${l?.every || 'every'} ${Math.round(mins / 60)}h`;
    return `${l?.every || 'every'} ${mins}m`;
  }
  if (schedule.kind === 'cron') return schedule.expr || schedule.display || (l?.na || '-');
  return schedule.display || l?.na || '-';
}

function fmtPrompt(job: any, s?: any) {
  const prompt = job.prompt || '';
  if (!prompt) return s?.na || '-';
  return prompt.length > 80 ? prompt.slice(0, 77) + '...' : prompt;
}

function cronToHuman(expr: string, s?: any): string {
  if (!expr) return '';
  const parts = expr.trim().split(/\s+/);
  if (parts.length < 5) return expr;
  const [min, hour, dom, mon, dow] = parts;
  if (min === '*' && hour === '*' && dom === '*' && mon === '*' && dow === '*') return s?.cronEveryMinute || 'every minute';
  if (min === '0' && hour === '*' && dom === '*' && mon === '*' && dow === '*') return s?.cronEveryHour || 'every hour';
  if (dom === '*' && mon === '*' && dow === '*' && hour !== '*') {
    return `${s?.cronEveryDay || 'every day'} ${s?.cronAt || 'at'} ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  }
  if (dom === '*' && mon === '*' && dow === '1-5') {
    return `${s?.cronEveryWeekday || 'every weekday'} ${s?.cronAt || 'at'} ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  }
  if (dom === '*' && mon === '*' && (dow === '0,6' || dow === '6,0')) {
    return `${s?.cronEveryWeekend || 'every weekend'} ${s?.cronAt || 'at'} ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  }
  if (min.startsWith('*/')) return `${s?.every || 'every'} ${min.slice(2)} ${s?.cronMinute || 'min'}`;
  if (hour.startsWith('*/')) return `${s?.every || 'every'} ${hour.slice(2)} ${s?.cronHour || 'hr'}`;
  return expr;
}

function normalizeCronRunEntry(run: any) {
  const status = String(run?.status || run?.last_status || run?.result || 'ok').toLowerCase();
  const ts = run?.ts || run?.timestamp || run?.created_at || run?.updated_at || '';
  const summary = run?.summary || run?.file || run?.jobName || run?.job_name || '';
  const error = run?.error || run?.last_error || '';
  const durationMs = run?.durationMs ?? run?.duration_ms ?? undefined;
  return {
    ...run,
    status,
    ts,
    summary,
    error,
    durationMs,
  };
}

function deriveSchedulerState(status: any, jobs: any[], s?: any) {
  const totalJobs = Number(status?.jobs ?? jobs.length ?? 0);
  const activeJobs = Number(
    status?.activeJobs ?? jobs.filter((job: any) => job?.enabled !== false && job?.state !== 'paused' && job?.state !== 'completed').length,
  );
  const runningJobs = jobs.filter((job: any) => job?.state === 'running').length;

  if (totalJobs <= 0) {
    return { label: s?.noJobs || 'No jobs', tone: 'text-slate-400' };
  }
  if (runningJobs > 0) {
    return { label: s?.running || 'Running', tone: 'text-primary' };
  }
  if (activeJobs > 0) {
    return { label: s?.enabled || 'Enabled', tone: 'text-mac-green' };
  }
  return { label: s?.paused || 'Paused', tone: 'text-mac-yellow' };
}

function jobToForm(job: any): CronForm {
  const sch = job.schedule || {};
  let scheduleKind: ScheduleKind = 'interval';
  let everyAmount = '30', everyUnit: 'minutes' | 'hours' | 'days' = 'minutes';
  let scheduleAt = '', cronExpr = '0 7 * * *';
  if (sch.kind === 'once') {
    scheduleKind = 'once';
    scheduleAt = sch.run_at ? new Date(sch.run_at).toISOString().slice(0, 16) : '';
  } else if (sch.kind === 'cron') {
    scheduleKind = 'cron';
    cronExpr = sch.expr || '';
  } else if (sch.kind === 'interval') {
    scheduleKind = 'interval';
    const mins = sch.minutes || 0;
    if (mins >= 1440) { everyAmount = String(Math.round(mins / 1440)); everyUnit = 'days'; }
    else if (mins >= 60) { everyAmount = String(Math.round(mins / 60)); everyUnit = 'hours'; }
    else { everyAmount = String(mins || 30); everyUnit = 'minutes'; }
  }
  const skillsList = Array.isArray(job.skills) ? job.skills : (job.skill ? [job.skill] : []);
  const repeatTimes = job.repeat?.times != null ? String(job.repeat.times) : '';
  return {
    name: job.name || '', prompt: job.prompt || '',
    enabled: job.enabled !== false, scheduleKind, scheduleAt, everyAmount, everyUnit, cronExpr,
    deliver: job.deliver || 'local',
    skills: skillsList.join(', '),
    model: job.model || '', provider: job.provider || '',
    script: job.script || '', repeatTimes,
  };
}

function formToJobPayload(f: CronForm) {
  if (!f.prompt.trim()) throw new Error('errPromptRequired');

  let scheduleObj: any;
  if (f.scheduleKind === 'once') {
    const ms = Date.parse(f.scheduleAt);
    if (!Number.isFinite(ms)) throw new Error('errInvalidTime');
    scheduleObj = { kind: 'once', run_at: new Date(ms).toISOString(), display: `once at ${f.scheduleAt}` };
  } else if (f.scheduleKind === 'interval') {
    const amt = parseInt(f.everyAmount) || 0;
    if (amt <= 0) throw new Error('errInvalidInterval');
    const mult = f.everyUnit === 'minutes' ? 1 : f.everyUnit === 'hours' ? 60 : 1440;
    const minutes = amt * mult;
    scheduleObj = { kind: 'interval', minutes, display: `every ${minutes}m` };
  } else {
    if (!f.cronExpr.trim()) throw new Error('errCronRequired');
    scheduleObj = { kind: 'cron', expr: f.cronExpr.trim(), display: f.cronExpr.trim() };
  }

  const skills = f.skills.split(',').map(s => s.trim()).filter(Boolean);
  const repeat = f.repeatTimes.trim() ? parseInt(f.repeatTimes) || null : null;

  if (!f.name.trim()) throw new Error('errNameRequired');
  return {
    name: f.name.trim(),
    prompt: f.prompt.trim(),
    enabled: f.enabled,
    scheduleObj,
    deliver: f.deliver || 'local',
    skills: skills.length > 0 ? skills : undefined,
    skill: skills[0] || undefined,
    model: f.model.trim() || undefined,
    provider: f.provider.trim() || undefined,
    script: f.script.trim() || undefined,
    repeat: repeat != null && repeat > 0 ? repeat : undefined,
  };
}

const Scheduler: React.FC<SchedulerProps> = ({ language }) => {
  const t = useMemo(() => getTranslation(language), [language]);
  const s = (t as any).sch as any;
  const sRef = useRef(s);
  sRef.current = s;
  const { toast } = useToast();
  const { confirm } = useConfirm();

  // Gateway connectivity (shared singleton hook)
  const { ready: gwReady, checked: gwChecked, refresh: gwRefresh } = useGatewayStatus();

  const SCHEDULER_CACHE_KEY = 'scheduler.cache.v1';
  const readCachedScheduler = () => readStorage<{ status: any; jobs: any[]; jobsTotal: number }>(SCHEDULER_CACHE_KEY);
  const writeCachedScheduler = (status: any, jobs: any[], jobsTotal: number) => writeStorage(SCHEDULER_CACHE_KEY, { status, jobs, jobsTotal });
  const _cachedSch = useMemo(() => readCachedScheduler(), []);
  const [status, setStatus] = useState<any>(_cachedSch?.status ?? null);
  const [jobs, setJobs] = useState<any[]>(_cachedSch?.jobs ?? []);
  const [jobsTotal, setJobsTotal] = useState(_cachedSch?.jobsTotal ?? 0);
  const [loading, setLoading] = useState(!_cachedSch);
  const [error, setErrorWithAutoClear, clearError] = useAutoError();

  // Form state
  const [form, setForm] = useState<CronForm>({ ...DEFAULT_FORM });
  const [showForm, setShowForm] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Per-job busy state
  const [busyJobs, setBusyJobs] = useState<Set<string>>(new Set());

  // Search / filter / sort
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEnabled, setFilterEnabled] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [sortBy, setSortBy] = useState<'nextRunAtMs' | 'updatedAtMs' | 'name'>('nextRunAtMs');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Run history
  const [runsJobId, setRunsJobId] = useState<string | null>(null);
  const [runs, setRuns] = useState<any[]>([]);
  const [runsTotal, setRunsTotal] = useState(0);
  const [runsHasMore, setRunsHasMore] = useState(false);
  const [runsOffset, setRunsOffset] = useState(0);
  const [runsLoading, setRunsLoading] = useState(false);
  const [runsStatusFilter, setRunsStatusFilter] = useState<string>('all');

  // Task audit health
  const [taskAudit, setTaskAudit] = useState<any>(null);


  const na = s?.na || '-';
  const schedulerState = useMemo(() => deriveSchedulerState(status, jobs, s), [status, jobs, s]);


  const toErrorText = useCallback((e: any) => {
    const raw = String(e?.message || e || '');
    if (raw === 'errInvalidTime') return s.errInvalidTime;
    if (raw === 'errInvalidInterval') return s.errInvalidInterval;
    if (raw === 'errCronRequired') return s.errCronRequired;
    if (raw === 'errPromptRequired') return s.errPromptRequired || 'Prompt is required';
    if (raw === 'errNameRequired') return s.errNameRequired;
    return raw;
  }, [s]);


  // Load jobs + status
  const loadAll = useCallback(async () => {
    if (!gwReady) return;
    setLoading(true); clearError();
    try {
      const [statusData, jobsData, infoData] = await Promise.all([
        gwApi.cronStatus().catch(() => null),
        gwApi.cronList({ includeDisabled: true, sortBy, sortDir, query: searchQuery || undefined, enabled: filterEnabled === 'all' ? undefined : filterEnabled }).catch(() => null),
        gwApi.info().catch(() => null),
      ]);
      if (statusData) setStatus(statusData);
      setTaskAudit((infoData as any)?.taskAudit ?? null);
      if (jobsData) {
        const list = Array.isArray(jobsData) ? jobsData : (jobsData as any)?.jobs || [];
        setJobs(list);
        const total = (jobsData as any)?.total ?? list.length;
        setJobsTotal(total);
        writeCachedScheduler(statusData, list, total);
      }
    } catch (e: any) { setErrorWithAutoClear(String(e)); }
    setLoading(false);
  }, [gwReady, sortBy, sortDir, searchQuery, filterEnabled, setErrorWithAutoClear]);

  // Auto-refresh every 10s + on mount
  useVisibilityPolling(loadAll, 10000, gwReady);


  const patchForm = useCallback((patch: Partial<CronForm>) => {
    setForm(prev => ({ ...prev, ...patch }));
    // Clear field errors for patched fields
    setFieldErrors(prev => {
      const next = { ...prev };
      for (const k of Object.keys(patch)) delete next[k];
      return next;
    });
  }, []);

  // Validate form and return field-level errors
  const validateForm = useCallback((): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = sRef.current.errNameRequired;
    if (!form.prompt.trim()) errs.prompt = sRef.current.errPromptRequired || 'Prompt is required';
    if (form.scheduleKind === 'once' && !Number.isFinite(Date.parse(form.scheduleAt))) errs.scheduleAt = sRef.current.errInvalidTime;
    if (form.scheduleKind === 'interval' && (parseInt(form.everyAmount) || 0) <= 0) errs.everyAmount = sRef.current.errInvalidInterval;
    if (form.scheduleKind === 'cron' && !form.cronExpr.trim()) errs.cronExpr = sRef.current.errCronRequired;
    return errs;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  // Add job
  const addJob = useCallback(async () => {
    if (formBusy) return;
    const errs = validateForm();
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setFormBusy(true); clearError(); setFieldErrors({});
    try {
      const payload = formToJobPayload(form);
      await gwApi.cronAdd(payload);
      setForm({ ...DEFAULT_FORM });
      setShowForm(false);
      await loadAll();
      toast('success', sRef.current.jobAdded);
    } catch (e: any) {
      const msg = toErrorText(e);
      setErrorWithAutoClear(msg);
      toast('error', msg);
    }
    setFormBusy(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formBusy, form, loadAll, toast, toErrorText, validateForm, setErrorWithAutoClear]);

  // Edit (update) job
  const updateJob = useCallback(async () => {
    if (formBusy || !editingJobId) return;
    const errs = validateForm();
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setFormBusy(true); clearError(); setFieldErrors({});
    try {
      const payload = formToJobPayload(form);
      await gwApi.cronUpdate(editingJobId, payload);
      setForm({ ...DEFAULT_FORM });
      setShowForm(false);
      setEditingJobId(null);
      await loadAll();
      toast('success', sRef.current.jobUpdated);
    } catch (e: any) {
      const msg = toErrorText(e);
      setErrorWithAutoClear(msg);
      toast('error', msg);
    }
    setFormBusy(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formBusy, editingJobId, form, loadAll, toast, toErrorText, validateForm, setErrorWithAutoClear]);

  // Open edit form
  const openEditForm = useCallback((job: any) => {
    setForm(jobToForm(job));
    setEditingJobId(job.id);
    setShowForm(true);
    setFieldErrors({});
  }, []);

  // Duplicate job
  const duplicateJob = useCallback((job: any) => {
    const f = jobToForm(job);
    f.name = f.name + ' (copy)';
    setForm(f);
    setEditingJobId(null);
    setShowForm(true);
    setFieldErrors({});
  }, []);

  // Load runs with pagination
  const loadRuns = useCallback(async (jobId: string, offset = 0, append = false) => {
    setRunsLoading(true);
    try {
      const res = await gwApi.cronRuns(jobId, 20, {
        offset,
        status: runsStatusFilter !== 'all' ? runsStatusFilter : undefined,
        sortDir: 'desc',
      }) as any;
      const rawEntries = Array.isArray(res?.entries)
        ? res.entries
        : Array.isArray(res?.runs)
          ? res.runs
          : [];
      const entries = rawEntries.map(normalizeCronRunEntry);
      setRunsJobId(jobId);
      setRuns(prev => append ? [...prev, ...entries] : entries);
      setRunsTotal(res?.total ?? entries.length);
      setRunsHasMore(Boolean(res?.hasMore) && entries.length > 0);
      setRunsOffset(offset + entries.length);
    } catch { /* ignore */ }
    setRunsLoading(false);
  }, [runsStatusFilter]);

  const loadMoreRuns = useCallback(() => {
    if (runsJobId && !runsLoading) loadRuns(runsJobId, runsOffset, true);
  }, [runsJobId, runsLoading, runsOffset, loadRuns]);

  const toggleJob = useCallback(async (job: any) => {
    if (busyJobs.has(job.id)) return;
    setBusyJobs(prev => new Set(prev).add(job.id));
    try {
      const isPaused = job.state === 'paused';
      const isEnabled = job.enabled !== false;
      if (isPaused || !isEnabled) {
        await gwApi.cronResume(job.id);
      } else {
        await gwApi.cronPause(job.id);
      }
      await loadAll();
      toast('success', sRef.current.jobToggled);
    } catch (e: any) {
      const msg = toErrorText(e);
      setErrorWithAutoClear(msg);
      toast('error', msg);
    }
    setBusyJobs(prev => { const n = new Set(prev); n.delete(job.id); return n; });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busyJobs, loadAll, toast, toErrorText, setErrorWithAutoClear]);

  const runJob = useCallback(async (job: any) => {
    if (busyJobs.has(job.id)) return;
    setBusyJobs(prev => new Set(prev).add(job.id));
    try {
      await gwApi.cronRun(job.id);
      await loadRuns(job.id);
      toast('success', sRef.current.jobRunning);
    } catch (e: any) {
      const msg = toErrorText(e);
      setErrorWithAutoClear(msg);
      toast('error', msg);
    }
    setBusyJobs(prev => { const n = new Set(prev); n.delete(job.id); return n; });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busyJobs, loadRuns, toast, toErrorText, setErrorWithAutoClear]);

  const removeJob = useCallback(async (job: any) => {
    if (busyJobs.has(job.id)) return;
    const ok = await confirm({
      title: sRef.current.confirmRemoveTitle,
      message: (sRef.current.confirmRemoveMsg || '').replace('{name}', job.name || job.id),
      confirmText: sRef.current.remove,
      danger: true,
    });
    if (!ok) return;
    setBusyJobs(prev => new Set(prev).add(job.id));
    try {
      await gwApi.cronRemove(job.id);
      if (runsJobId === job.id) { setRunsJobId(null); setRuns([]); }
      await loadAll();
      toast('success', sRef.current.jobRemoved);
    } catch (e: any) {
      const msg = toErrorText(e);
      setErrorWithAutoClear(msg);
      toast('error', msg);
    }
    setBusyJobs(prev => { const n = new Set(prev); n.delete(job.id); return n; });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busyJobs, runsJobId, loadAll, toast, toErrorText, confirm, setErrorWithAutoClear]);

  // Auto-refresh runs every 10s when viewing
  useEffect(() => {
    if (!runsJobId || !gwReady) return;
    const timer = setInterval(() => loadRuns(runsJobId), 10000);
    return () => clearInterval(timer);
  }, [runsJobId, gwReady, loadRuns]);

  const selectedJobName = runsJobId ? (jobs.find(j => j.id === runsJobId)?.name || runsJobId) : null;

  const inputCls = 'w-full mt-0.5 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] text-[11px] text-slate-700 dark:text-white/70 focus:outline-none focus:ring-1 focus:ring-primary/30';
  const inputErrCls = 'w-full mt-0.5 px-2.5 py-1.5 rounded-lg bg-mac-red/5 border border-mac-red/30 text-[11px] text-slate-700 dark:text-white/70 focus:outline-none focus:ring-1 focus:ring-mac-red/30';
  const labelCls = 'text-[11px] font-bold text-slate-400 dark:text-white/40 uppercase';
  const selectCls = 'w-full mt-0.5 px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] text-[11px] text-slate-700 dark:text-white/70';
  const errHintCls = 'text-[9px] text-mac-red mt-0.5';

  // Gateway not ready screen
  if (gwChecked && !gwReady) {
    return (
      <main className="flex-1 overflow-y-auto p-4 md:p-5 custom-scrollbar neon-scrollbar bg-slate-50/50 dark:bg-transparent">
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-white/30">
          <span className="material-symbols-outlined text-[48px] mb-4 text-mac-yellow">cloud_off</span>
          <p className="text-sm font-bold mb-1">{s.gwNotReady}</p>
          <p className="text-[11px] text-center mb-4">{s.gwNotReadyDesc}</p>
          <button onClick={gwRefresh} className="px-4 py-1.5 rounded-lg bg-primary text-white text-[11px] font-bold">{s.retry}</button>
        </div>
      </main>
    );
  }

  // Skeleton loading
  if (!gwChecked || (loading && jobs.length === 0 && !status)) {
    return (
      <main className="flex-1 overflow-y-auto p-4 md:p-5 custom-scrollbar neon-scrollbar bg-slate-50/50 dark:bg-transparent">
        <div className="space-y-4 max-w-6xl animate-pulse">
          <div className="h-8 bg-slate-200/50 dark:bg-white/5 rounded-lg w-48" />
          <div className="grid grid-cols-3 gap-3">{[0, 1, 2].map(i => <div key={i} className="h-20 bg-slate-200/30 dark:bg-white/[0.03] rounded-xl" />)}</div>
          <div className="space-y-2">{[0, 1, 2].map(i => <div key={i} className="h-16 bg-slate-200/30 dark:bg-white/[0.03] rounded-xl" />)}</div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-5 custom-scrollbar neon-scrollbar bg-slate-50/50 dark:bg-transparent">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold dark:text-white text-slate-800">{s.title}</h1>
          <p className="text-[10px] text-slate-400 dark:text-white/35 mt-0.5">{s.schedulerHelp || s.desc}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => { if (showForm && editingJobId) { setEditingJobId(null); setForm({ ...DEFAULT_FORM }); } setShowForm(!showForm); setFieldErrors({}); }}
            className="h-8 flex items-center gap-1.5 px-3 rounded-lg bg-primary text-white text-[11px] font-bold hover:bg-blue-600 transition-all">
            <span className="material-symbols-outlined text-[14px]">{showForm ? 'close' : 'add'}</span>
            <span className="hidden sm:inline">{showForm ? s.cancel : s.newJob}</span>
          </button>
          <button onClick={loadAll} disabled={loading} className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-all disabled:opacity-40" title={s.refresh}>
            <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
          </button>
        </div>
      </div>

      {error && <div className="mb-3 px-3 py-2 rounded-xl bg-mac-red/10 border border-mac-red/20 text-[10px] text-mac-red animate-fade-in">{error}</div>}

      <div className="space-y-4 max-w-6xl">
        {/* Status Card - full width when no form */}
        <div className={`grid grid-cols-1 ${showForm ? 'lg:grid-cols-2' : ''} gap-4`}>
          <div className="rounded-2xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4 sci-card">
            <h3 className="text-[11px] font-bold theme-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px] text-primary">schedule</span>
              {s.scheduler}
            </h3>
            <div className={`grid ${showForm ? 'grid-cols-3' : 'grid-cols-4'} gap-3`}>
              <div className="rounded-xl theme-panel p-3 text-center">
                <p className="text-[11px] font-bold theme-text-muted uppercase">{s.status}</p>
                <p className={`text-sm font-bold mt-0.5 ${schedulerState.tone}`}>{schedulerState.label}</p>
              </div>
              <div className="rounded-xl theme-panel p-3 text-center">
                <p className="text-[11px] font-bold theme-text-muted uppercase">{s.jobs}</p>
                <p className="text-sm font-bold text-slate-700 dark:text-white/70 mt-0.5">{jobsTotal || status?.jobs || na}</p>
              </div>
              <div className="rounded-xl theme-panel p-3 text-center">
                <p className="text-[11px] font-bold theme-text-muted uppercase">{s.nextWake}</p>
                <p className="text-[10px] font-bold text-primary mt-0.5">{fmtRelativeFuture(status?.nextWakeAtMs, s)}</p>
              </div>
              {!showForm && (
                <div className="rounded-xl theme-panel p-3 text-center">
                  <p className="text-[11px] font-bold theme-text-muted uppercase">{s.active || 'Active'}</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-white/70 mt-0.5">{status?.activeJobs ?? jobs.filter(j => j.enabled !== false && j.state !== 'paused' && j.state !== 'completed').length}</p>
                </div>
              )}
            </div>
          </div>

          {/* Task Audit Health */}
          {taskAudit && taskAudit.total > 0 && (() => {
            const auditLabels: Record<string, string> = {
              stale_queued: s.taskAuditStaleQueued || 'Stale queued',
              stale_running: s.taskAuditStaleRunning || 'Stale running',
              lost: s.taskAuditLost || 'Lost tasks',
              delivery_failed: s.taskAuditDeliveryFailed || 'Delivery failed',
              missing_cleanup: s.taskAuditMissingCleanup || 'Missing cleanup',
              inconsistent_timestamps: s.taskAuditInconsistent || 'Inconsistent',
            };
            const errorCodes = ['stale_running', 'lost'];
            return (
              <div className={`rounded-2xl border p-4 sci-card ${taskAudit.errors > 0 ? 'border-red-200/60 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/[0.04]' : 'border-amber-200/60 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/[0.04]'}`}>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className={`material-symbols-outlined text-[16px] ${taskAudit.errors > 0 ? 'text-red-500' : 'text-amber-500'}`}>health_and_safety</span>
                  <h3 className="text-[11px] font-bold text-slate-600 dark:text-white/60 uppercase">{s.taskAuditTitle || 'Task Health'}</h3>
                  <span className={`text-[10px] font-bold ${taskAudit.errors > 0 ? 'text-red-500' : 'text-amber-500'}`}>
                    {(s.taskAuditFindings || '{{total}} finding(s)').replace('{{total}}', String(taskAudit.total))}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(taskAudit.byCode as Record<string, number>)
                    .filter(([, v]) => v > 0)
                    .map(([code, count]) => (
                      <span key={code} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold ${errorCodes.includes(code) ? 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                        {auditLabels[code] || code} <b>{count as number}</b>
                      </span>
                    ))}
                </div>
              </div>
            );
          })()}

          {/* Form Modal (add / edit) */}
          {showForm && (
            <div className="rounded-2xl border border-primary/20 bg-white dark:bg-white/[0.02] p-4 max-h-[70vh] overflow-y-auto custom-scrollbar neon-scrollbar sci-card">
              <h3 className="text-[11px] font-bold theme-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px] text-primary">{editingJobId ? 'edit' : 'add_task'}</span>
                {editingJobId ? s.editJob : s.newJob}
              </h3>
              <div className="space-y-2.5">
                {/* Name */}
                <label className="block">
                  <span className={labelCls}>{s.name}</span>
                  <input value={form.name} onChange={e => patchForm({ name: e.target.value })} className={fieldErrors.name ? inputErrCls : inputCls} />
                  {fieldErrors.name && <p className={errHintCls}>{fieldErrors.name}</p>}
                </label>
                {/* Prompt */}
                <label className="block">
                  <span className={labelCls}>{s.prompt || 'Prompt'}</span>
                  <textarea value={form.prompt} onChange={e => patchForm({ prompt: e.target.value })} rows={3}
                    placeholder={s.promptPlaceholder || 'What should the agent do?'}
                    className={`${fieldErrors.prompt ? inputErrCls : inputCls} resize-none`} />
                  {fieldErrors.prompt && <p className={errHintCls}>{fieldErrors.prompt}</p>}
                </label>
                {/* Schedule */}
                <div className="grid grid-cols-3 gap-2">
                  <label className="block">
                    <span className={labelCls}>{s.schedule}</span>
                    <CustomSelect value={form.scheduleKind} onChange={v => patchForm({ scheduleKind: v as ScheduleKind })}
                      options={[{ value: 'interval', label: s.every || 'Interval' }, { value: 'once', label: s.once || 'Once' }, { value: 'cron', label: s.cron || 'Cron' }]} className={selectCls} />
                  </label>
                  {form.scheduleKind === 'interval' && <>
                    <label className="block">
                      <span className={labelCls}>{s.every || 'Every'}</span>
                      <input value={form.everyAmount} onChange={e => patchForm({ everyAmount: e.target.value })} className={fieldErrors.everyAmount ? inputErrCls : inputCls} />
                      {fieldErrors.everyAmount && <p className={errHintCls}>{fieldErrors.everyAmount}</p>}
                    </label>
                    <label className="block">
                      <span className={labelCls}>&nbsp;</span>
                      <CustomSelect value={form.everyUnit} onChange={v => patchForm({ everyUnit: v as any })}
                        options={[{ value: 'minutes', label: s.minutes }, { value: 'hours', label: s.hours }, { value: 'days', label: s.days }]} className={selectCls} />
                    </label>
                  </>}
                  {form.scheduleKind === 'once' && (
                    <label className="block col-span-2">
                      <span className={labelCls}>{s.runAt || 'Run at'}</span>
                      <input type="datetime-local" value={form.scheduleAt} onChange={e => patchForm({ scheduleAt: e.target.value })} className={fieldErrors.scheduleAt ? inputErrCls : inputCls} />
                      {fieldErrors.scheduleAt && <p className={errHintCls}>{fieldErrors.scheduleAt}</p>}
                    </label>
                  )}
                  {form.scheduleKind === 'cron' && (
                    <div className="col-span-2">
                      <span className={labelCls}>{s.cronExpr}</span>
                      <CronBuilder
                        value={form.cronExpr}
                        onChange={v => patchForm({ cronExpr: v })}
                        labels={s}
                        error={fieldErrors.cronExpr}
                        preview={form.cronExpr && !fieldErrors.cronExpr ? cronToHuman(form.cronExpr, s) : undefined}
                      />
                    </div>
                  )}
                </div>
                {/* Model + Provider + Deliver */}
                <div className="grid grid-cols-3 gap-2">
                  <label className="block">
                    <span className={labelCls}>{s.model || 'Model'}</span>
                    <input value={form.model} onChange={e => patchForm({ model: e.target.value })} placeholder={s.modelPlaceholder || 'default'} className={inputCls} />
                  </label>
                  <label className="block">
                    <span className={labelCls}>{s.provider || 'Provider'}</span>
                    <input value={form.provider} onChange={e => patchForm({ provider: e.target.value })} placeholder={s.providerPlaceholder || 'default'} className={inputCls} />
                  </label>
                  <label className="block">
                    <span className={labelCls}>{s.deliver || 'Deliver'}</span>
                    <CustomSelect value={form.deliver} onChange={v => patchForm({ deliver: v })}
                      options={[
                        { value: 'local', label: s.deliverLocal || 'Local' },
                        { value: 'origin', label: s.deliverOrigin || 'Origin' },
                        { value: 'telegram', label: 'Telegram' },
                        { value: 'discord', label: 'Discord' },
                      ]} className={selectCls} />
                  </label>
                </div>
                {/* Skills + Script */}
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className={labelCls}>{s.skills || 'Skills'}</span>
                    <input value={form.skills} onChange={e => patchForm({ skills: e.target.value })} placeholder={s.skillsPlaceholder || 'skill1, skill2'} className={inputCls} />
                  </label>
                  <label className="block">
                    <span className={labelCls}>{s.script || 'Script'}</span>
                    <input value={form.script} onChange={e => patchForm({ script: e.target.value })} placeholder={s.scriptPlaceholder || '/path/to/script.py'} className={inputCls} />
                  </label>
                </div>
                {/* Repeat + Enabled */}
                <div className="flex flex-wrap items-end gap-x-4 gap-y-2 pt-1">
                  <label className="block w-24">
                    <span className={labelCls}>{s.repeat || 'Repeat'}</span>
                    <input value={form.repeatTimes} onChange={e => patchForm({ repeatTimes: e.target.value })} placeholder={s.repeatPlaceholder || '∞'} className={inputCls} />
                  </label>
                  <label className="flex items-center gap-1.5 pb-1.5">
                    <input type="checkbox" checked={form.enabled} onChange={e => patchForm({ enabled: e.target.checked })} className="accent-primary" />
                    <span className="text-[10px] theme-text-muted">{s.enabled}</span>
                  </label>
                </div>
                {/* Submit */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button onClick={() => { setShowForm(false); setEditingJobId(null); setForm({ ...DEFAULT_FORM }); setFieldErrors({}); }}
                    className="px-4 py-1.5 rounded-lg text-slate-500 text-[11px] font-bold hover:bg-slate-100 dark:hover:bg-white/5">{s.cancel}</button>
                  <button onClick={editingJobId ? updateJob : addJob} disabled={formBusy}
                    className="px-4 py-1.5 rounded-lg bg-primary text-white text-[11px] font-bold disabled:opacity-40">
                    {formBusy ? (editingJobId ? s.updating : s.saving) : (editingJobId ? s.updateJob : s.addJob)}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Jobs List */}
        <div className="rounded-2xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4">
          {/* Search / Filter / Sort bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <h3 className="text-[11px] font-bold theme-text-secondary uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px] text-primary">list_alt</span>
              {s.jobs} ({jobsTotal || jobs.length})
            </h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="material-symbols-outlined text-[14px] text-slate-400 absolute start-2 top-1/2 -translate-y-1/2">search</span>
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={s.searchJobs || s.search}
                  className="ps-7 pe-2 py-1 w-36 rounded-lg theme-field text-[10px] focus:outline-none focus:ring-1 focus:ring-primary/30 sci-input" />
              </div>
              <CustomSelect value={filterEnabled}
                onChange={v => setFilterEnabled(v as 'all' | 'enabled' | 'disabled')}
                options={[{ value: 'all', label: s.filterAll || s.all }, { value: 'enabled', label: s.enabled }, { value: 'disabled', label: s.disabled }]}
                className="px-2 py-1 rounded-lg theme-field text-[10px] theme-text-secondary" />
              <CustomSelect value={`${sortBy}-${sortDir}`}
                onChange={v => { const [b, d] = v.split('-'); setSortBy(b as any); setSortDir(d as any); }}
                options={[
                  { value: 'name-asc', label: `${s.sortName} ↑` }, { value: 'name-desc', label: `${s.sortName} ↓` },
                  { value: 'nextRunAtMs-asc', label: `${s.sortNextRun || s.sortNext} ↑` }, { value: 'nextRunAtMs-desc', label: `${s.sortNextRun || s.sortNext} ↓` },
                  { value: 'updatedAtMs-desc', label: `${s.sortUpdated} ↓` }, { value: 'updatedAtMs-asc', label: `${s.sortUpdated} ↑` },
                ]}
                className="px-2 py-1 rounded-lg theme-field text-[10px] theme-text-secondary" />
            </div>
          </div>

          {jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-white/30">
              <span className="material-symbols-outlined text-4xl mb-3">schedule</span>
              <p className="text-sm font-bold mb-1">{s.noJobs}</p>
              <p className="text-[11px] text-center">{s.noJobsHint || s.schedulerHelp || s.desc}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {jobs.map((job: any) => {
                const isSelected = runsJobId === job.id;
                const lastStatus = job.last_status;
                const jobState = job.state || '';
                const isPaused = jobState === 'paused';
                const isBusy = busyJobs.has(job.id);
                const nextRunAtMs = job.next_run_at ? new Date(job.next_run_at).getTime() : undefined;
                const lastRunAtMs = job.last_run_at ? new Date(job.last_run_at).getTime() : undefined;
                return (
                  <div key={job.id} onClick={() => loadRuns(job.id)}
                    className={`px-3.5 py-3 rounded-xl border cursor-pointer transition-all ${isBusy ? 'opacity-60 pointer-events-none' : ''} ${isSelected ? 'border-primary/30 bg-primary/[0.03]' : 'border-slate-200/60 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02] hover:border-primary/20'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[11px] font-bold text-slate-700 dark:text-white/70 truncate">{job.name}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${isPaused ? 'bg-mac-yellow/10 text-mac-yellow' : job.enabled !== false ? 'bg-mac-green/10 text-mac-green' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                            {isPaused ? (s.paused || 'Paused') : job.enabled !== false ? s.enabled : s.disabled}
                          </span>
                          {job.repeat?.times != null && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 font-bold shrink-0">{job.repeat.completed || 0}/{job.repeat.times}</span>}
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-white/35 mt-0.5 truncate">{fmtPrompt(job, s)}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[11px]">
                          <span className="text-slate-500 dark:text-white/40 font-mono">{fmtSchedule(job, s)}</span>
                          {job.model && <span className="text-slate-400 dark:text-white/35">{job.model}</span>}
                          {job.deliver && job.deliver !== 'local' && <span className="text-slate-400 dark:text-white/35">→ {job.deliver}</span>}
                        </div>
                        <div className="flex gap-2 mt-1.5">
                          {Array.isArray(job.skills) && job.skills.length > 0 && job.skills.map((sk: string) => (
                            <span key={sk} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/5 text-primary/70">{sk}</span>
                          ))}
                          {job.script && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/40 truncate max-w-[120px]">{job.script}</span>}
                        </div>
                      </div>
                      {/* State + Actions */}
                      <div className="shrink-0 text-end space-y-1">
                        <div className="text-[11px]">
                          <span className="text-slate-400 dark:text-white/35">{s.status}: </span>
                          <span className={`font-bold ${lastStatus === 'ok' ? 'text-mac-green' : lastStatus === 'error' ? 'text-mac-red' : 'text-slate-400'}`}>{lastStatus || s.na}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-white/35">{s.nextRun}: {fmtRelativeFuture(nextRunAtMs, s)}</div>
                        <div className="text-[11px] text-slate-400 dark:text-white/35">{s.last}: {fmtRelativeFuture(lastRunAtMs, s)}</div>
                        {job.last_error && <div className="text-[11px] text-mac-red truncate max-w-[200px]">{job.last_error}</div>}
                        <div className="flex gap-1 mt-1 justify-end flex-wrap">
                          <button onClick={e => { e.stopPropagation(); openEditForm(job); }} disabled={isBusy}
                            className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-primary disabled:opacity-30" title={s.editJob}>
                            <span className="material-symbols-outlined text-[12px]">edit</span>
                          </button>
                          <button onClick={e => { e.stopPropagation(); duplicateJob(job); }} disabled={isBusy}
                            className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-primary disabled:opacity-30" title={s.duplicate}>
                            <span className="material-symbols-outlined text-[12px]">content_copy</span>
                          </button>
                          <button onClick={e => { e.stopPropagation(); toggleJob(job); }} disabled={isBusy}
                            className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-primary disabled:opacity-30">
                            {isPaused ? (s.resume || 'Resume') : job.enabled !== false ? (s.pause || 'Pause') : (s.enable || 'Enable')}
                          </button>
                          <button onClick={e => { e.stopPropagation(); runJob(job); }} disabled={isBusy}
                            className="text-[11px] px-2 py-0.5 rounded bg-primary/10 text-primary font-bold disabled:opacity-30">{s.run}</button>
                          <button onClick={e => { e.stopPropagation(); removeJob(job); }} disabled={isBusy}
                            className="text-[11px] px-2 py-0.5 rounded bg-mac-red/10 text-mac-red disabled:opacity-30">{s.remove}</button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {/* Pagination */}
          {jobsTotal > jobs.length && (
            <div className="flex justify-center mt-3">
              <button onClick={loadAll} className="text-[10px] text-primary font-bold hover:underline">{s.loadMore}</button>
            </div>
          )}
        </div>

        {/* Run History */}
        <div className="rounded-2xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-bold text-slate-600 dark:text-white/60 uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px] text-indigo-500">history</span>
              {s.runHistory}
              {selectedJobName && <span className="text-[11px] font-normal text-slate-400 dark:text-white/35">— {selectedJobName}</span>}
            </h3>
            {runsJobId && (
              <div className="flex items-center gap-2">
                <CustomSelect value={runsStatusFilter}
                  onChange={v => { setRunsStatusFilter(v); setRuns([]); setRunsOffset(0); if (runsJobId) setTimeout(() => loadRuns(runsJobId!), 0); }}
                  options={[{ value: 'all', label: s.all }, { value: 'ok', label: s.ok }, { value: 'error', label: s.error }, { value: 'skipped', label: s.skipped }]}
                  className="px-2 py-0.5 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] text-[10px] text-slate-600 dark:text-white/60" />
                <button onClick={() => { if (runsJobId) loadRuns(runsJobId); }} className="text-slate-400 hover:text-primary">
                  <span className="material-symbols-outlined text-[14px]">refresh</span>
                </button>
              </div>
            )}
          </div>
          {!runsJobId ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-white/30">
              <span className="material-symbols-outlined text-3xl mb-2">touch_app</span>
              <p className="text-[11px] font-bold mb-1">{s.selectJob}</p>
              <p className="text-[10px] text-center">{s.selectJobHint}</p>
            </div>
          ) : runs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-white/30">
              <span className="material-symbols-outlined text-3xl mb-2">history</span>
              <p className="text-[11px] font-bold mb-1">{s.noRuns}</p>
              <p className="text-[10px] text-center">{s.noRunsHint || 'Hermes stores cron outputs per job. Run a task once to see its latest outputs here.'}</p>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                {runs.map((run: any, i: number) => (
                  <div key={`${run.ts}-${i}`} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${run.status === 'ok' ? 'bg-mac-green' : run.status === 'error' ? 'bg-mac-red' : 'bg-mac-yellow'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold ${run.status === 'ok' ? 'text-mac-green' : run.status === 'error' ? 'text-mac-red' : 'text-mac-yellow'}`}>
                          {run.status === 'ok' ? s.ok : run.status === 'error' ? s.error : s.skipped}
                        </span>
                        {run.durationMs != null && <span className="text-[11px] text-slate-400 dark:text-white/35">{run.durationMs}ms</span>}
                      </div>
                      {run.summary && <p className="text-[11px] text-slate-500 dark:text-white/40 truncate mt-0.5">{run.summary}</p>}
                      {run.error && <p className="text-[11px] text-mac-red truncate mt-0.5">{run.error}</p>}
                    </div>
                    <span className="text-[11px] text-slate-400 dark:text-white/20 shrink-0">{run.ts ? new Date(run.ts).toLocaleString() : na}</span>
                  </div>
                ))}
              </div>
              {runsHasMore && (
                <div className="flex justify-center mt-3">
                  <button onClick={loadMoreRuns} disabled={runsLoading}
                    className="text-[10px] text-primary font-bold hover:underline disabled:opacity-40">
                    {runsLoading ? (s.loading || 'Loading...') : s.loadMore}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
};

export default Scheduler;
