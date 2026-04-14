import React, { useCallback, useMemo } from 'react';
import { WindowID, dispatchOpenWindow } from '../../types';
import CustomSelect from '../../components/CustomSelect';
import { parseEventTitle } from '../../utils/parseEventText';

export interface EventsPanelProps {
  gw: any;
  na: string;
  events: any[];
  eventsLoading: boolean;
  eventRisk: 'all' | 'low' | 'medium' | 'high' | 'critical';
  setEventRisk: (v: 'all' | 'low' | 'medium' | 'high' | 'critical') => void;
  eventKeyword: string;
  setEventKeyword: (v: string) => void;
  eventType: 'all' | 'activity' | 'alert';
  setEventType: (v: 'all' | 'activity' | 'alert') => void;
  eventSource: string;
  setEventSource: (v: string) => void;
  eventPage: number;
  setEventPage: (v: number) => void;
  eventTotal: number;
  expandedEvents: Set<number>;
  setExpandedEvents: React.Dispatch<React.SetStateAction<Set<number>>>;
  presetExceptionFilter: boolean;
  setPresetExceptionFilter: (v: boolean) => void;
  fetchEvents: (page?: number) => void;
  exportEvents: () => void;
}

const EventsPanel: React.FC<EventsPanelProps> = ({
  gw, na, events, eventsLoading,
  eventRisk, setEventRisk, eventKeyword, setEventKeyword,
  eventType, setEventType, eventSource, setEventSource,
  eventPage, setEventPage, eventTotal,
  expandedEvents, setExpandedEvents,
  presetExceptionFilter, setPresetExceptionFilter,
  fetchEvents, exportEvents,
}) => {
  const eventSources = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e: any) => {
      const s = String(e?.source || '').trim();
      if (s) set.add(s);
    });
    return ['all', ...Array.from(set).slice(0, 12)];
  }, [events]);

  const jumpToWindow = useCallback((id: string, extra?: Record<string, any>) => {
    dispatchOpenWindow({ id: id as WindowID, ...extra });
  }, []);

  const suggestJumpWindow = useCallback((ev: any): { id: string; extra?: Record<string, any> } => {
    const typ = String(ev?.type || '').toLowerCase();
    const cat = String(ev?.category || '').toLowerCase();
    const src = String(ev?.source || '').toLowerCase();
    if (typ === 'alert' || cat.includes('security')) return { id: 'gateway', extra: { tab: 'events' } };
    if (cat.includes('gateway') || src.includes('gateway')) return { id: 'editor', extra: { section: 'gateway' } };
    if (cat.includes('model')) return { id: 'editor', extra: { section: 'models' } };
    if (cat.includes('config')) return { id: 'editor' };
    if (cat.includes('doctor') || cat.includes('health')) return { id: 'maintenance' };
    return { id: 'activity' };
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar neon-scrollbar">
      {presetExceptionFilter && (
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-300 text-[10px] font-bold">
            <span className="material-symbols-outlined text-[12px]">filter_alt</span>
            {gw.presetFilterApplied || '已应用：异常事件筛选'}
          </span>
          <button onClick={() => { setEventRisk('all'); setEventType('all'); setEventSource('all'); setEventKeyword(''); setEventPage(1); setPresetExceptionFilter(false); }}
            className="text-[10px] px-2 py-1 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/50 hover:text-slate-700 dark:hover:text-white/80">
            {gw.clearFilter || '一键清除筛选'}
          </button>
        </div>
      )}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-[220px]">
          <span className="material-symbols-outlined absolute start-2 top-1/2 -translate-y-1/2 text-slate-300 dark:text-white/20 text-[12px]">search</span>
          <input value={eventKeyword} onChange={e => setEventKeyword(e.target.value)} placeholder={gw.search}
            className="w-full h-8 ps-7 pe-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded text-[11px] text-slate-700 dark:text-white/80 placeholder:text-slate-300 dark:placeholder:text-white/20 focus:ring-1 focus:ring-primary/50 outline-none" />
        </div>
        <div className="flex items-center gap-1">
          {(['all', 'low', 'medium', 'high', 'critical'] as const).map(risk => (
            <button key={risk} onClick={() => setEventRisk(risk)}
              className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${eventRisk === risk ? 'bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white/70'}`}>
              {gw[`risk${risk.charAt(0).toUpperCase()}${risk.slice(1)}` as keyof typeof gw] || risk}
            </button>
          ))}
        </div>
        <div className="w-px h-5 bg-slate-200 dark:bg-white/10 shrink-0" />
        <div className="flex items-center gap-1">
          {(['all', 'activity', 'alert'] as const).map(tp => (
            <button key={tp} onClick={() => setEventType(tp)}
              className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${eventType === tp ? 'bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white/70'}`}>
              {gw[`type${tp.charAt(0).toUpperCase()}${tp.slice(1)}` as keyof typeof gw] || tp}
            </button>
          ))}
        </div>
        <CustomSelect value={eventSource} onChange={(v) => setEventSource(v)}
          options={eventSources.map((s) => ({ value: s, label: s }))}
          className="h-8 px-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded text-[11px] text-slate-700 dark:text-white/80" />
        <button onClick={exportEvents} className="px-2 py-1 rounded text-[10px] font-bold bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/40 hover:text-slate-700 dark:hover:text-white disabled:opacity-40" title={gw.exportEvents || 'Export'}>
          <span className="material-symbols-outlined text-[12px] align-middle">download</span>
        </button>
        <button onClick={() => fetchEvents()} disabled={eventsLoading}
          className="ms-auto px-2 py-1 rounded text-[10px] font-bold bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/60 hover:text-slate-700 dark:hover:text-white disabled:opacity-40">
          <span className={`material-symbols-outlined text-[12px] align-middle me-1 ${eventsLoading ? 'animate-spin' : ''}`}>{eventsLoading ? 'progress_activity' : 'refresh'}</span>
          {gw.refresh}
        </button>
      </div>

      {eventsLoading && events.length === 0 ? (
        <div className="flex items-center justify-center py-10 text-slate-400 dark:text-white/30 text-[11px]">
          <span className="material-symbols-outlined text-[18px] animate-spin me-2">progress_activity</span>
          {gw.loading}
        </div>
      ) : events.length === 0 ? (
        <div className="flex items-center justify-center py-10 text-slate-300 dark:text-white/20 text-[11px]">{gw.noEvents}</div>
      ) : (
        <>
          <div className="space-y-2">
            {events.map((ev, idx) => {
              const risk = String(ev?.risk || 'low').toLowerCase();
              const jumpTarget = suggestJumpWindow(ev);
              const riskCls = risk === 'critical' || risk === 'high' ? 'text-red-400 bg-red-500/10' : risk === 'medium' ? 'text-amber-400 bg-amber-500/10' : 'text-emerald-400 bg-emerald-500/10';
              const ts = ev?.timestamp || ev?.created_at;
              const isExpanded = expandedEvents.has(idx);
              const isGwLog = ev?.source === 'gateway/log';
              const isSecAudit = ev?.source === 'security/audit';
              const evIcon = isSecAudit ? 'shield' : isGwLog ? 'dns' : (risk === 'high' || risk === 'critical') ? 'error' : risk === 'medium' ? 'warning' : 'info';
              const evIconColor = isSecAudit ? ((risk === 'high' || risk === 'critical') ? 'text-red-400' : 'text-amber-400') : isGwLog ? 'text-sky-400' : (risk === 'high' || risk === 'critical') ? 'text-red-400' : risk === 'medium' ? 'text-amber-400' : 'text-emerald-400';
              const detailLines = (isGwLog && ev?.detail) ? ev.detail.split('\n').filter((l: string) => l.trim()) : null;

              return (
                <div key={`${ev?.id || idx}`} className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <span className={`material-symbols-outlined text-[16px] mt-0.5 shrink-0 ${evIconColor}`}>{evIcon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-bold text-slate-800 dark:text-white/85 break-all">{parseEventTitle(ev?.title || ev?.summary) || na}</p>
                        {detailLines ? (
                          <div className={`mt-1 space-y-0.5 ${!isExpanded ? 'line-clamp-2' : ''}`}>
                            {detailLines.map((line: string, li: number) => {
                              const colonIdx = line.indexOf(': ');
                              if (colonIdx > 0) {
                                return <p key={li} className="text-[11px]"><span className="text-slate-400 dark:text-white/30 font-medium">{line.slice(0, colonIdx)}:</span> <span className="text-slate-500 dark:text-white/55">{line.slice(colonIdx + 2)}</span></p>;
                              }
                              return <p key={li} className="text-[11px] text-slate-500 dark:text-white/45">{line}</p>;
                            })}
                          </div>
                        ) : (
                          ev?.detail && <p className={`text-[11px] text-slate-500 dark:text-white/45 mt-1 break-all ${!isExpanded ? 'line-clamp-2' : ''}`}>{ev.detail}</p>
                        )}
                      </div>
                    </div>
                    <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${riskCls}`}>{risk}</span>
                  </div>
                  {isExpanded && ev?.payload && (
                    <pre className="mt-2 text-[10px] text-slate-400 dark:text-white/30 font-mono bg-slate-50 dark:bg-white/[0.02] rounded p-2 max-h-[200px] overflow-y-auto custom-scrollbar neon-scrollbar break-all whitespace-pre-wrap">{JSON.stringify(ev.payload, null, 2)}</pre>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-slate-400 dark:text-white/35">
                    <span>{gw.eventSource}: {ev?.source || na}</span>
                    <span>{gw.eventCategory}: {ev?.category || na}</span>
                    <span>{gw.eventRisk}: {risk}</span>
                    <span>{ev?.type || na}</span>
                    <span>{ts ? new Date(ts).toLocaleString() : na}</span>
                    {(ev?.detail || ev?.payload) && (
                      <button onClick={() => setExpandedEvents(prev => { const n = new Set(prev); if (n.has(idx)) n.delete(idx); else n.add(idx); return n; })}
                        className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white/70">
                        {isExpanded ? '\u25be' : '\u25b8'} {gw.details || 'Details'}
                      </button>
                    )}
                    <button onClick={() => jumpToWindow(jumpTarget.id, jumpTarget.extra)}
                      className="ms-auto px-1.5 py-0.5 rounded bg-primary/15 text-primary hover:bg-primary/25">
                      {gw.openRelated}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {eventTotal > 50 && (
            <div className="flex items-center justify-center gap-3 mt-3 text-[11px]">
              <button onClick={() => { const p = Math.max(1, eventPage - 1); setEventPage(p); fetchEvents(p); }} disabled={eventPage <= 1}
                className="px-2 py-1 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/50 hover:text-slate-700 dark:hover:text-white disabled:opacity-30">{'\u2190'} {gw.prev || 'Prev'}</button>
              <span className="text-slate-400 dark:text-white/40">{eventPage} / {Math.ceil(eventTotal / 50)}</span>
              <button onClick={() => { const p = eventPage + 1; setEventPage(p); fetchEvents(p); }} disabled={eventPage >= Math.ceil(eventTotal / 50)}
                className="px-2 py-1 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/50 hover:text-slate-700 dark:hover:text-white disabled:opacity-30">{gw.next || 'Next'} {'\u2192'}</button>
              <span className="text-slate-300 dark:text-white/25">{eventTotal} {gw.totalEvents || 'total'}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EventsPanel;
