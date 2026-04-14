// ---------------------------------------------------------------------------
// Unified relative-time formatting utilities.
//
// Replaces 7+ duplicate fmtRelative / fmtRelativeTime / relativeTime / fmtAgo
// implementations scattered across window pages.
// ---------------------------------------------------------------------------

/** i18n labels passed by each page. All fields are optional with English fallbacks. */
export interface RelativeTimeLabels {
  justNow?: string;
  minutesAgo?: string;
  hoursAgo?: string;
  daysAgo?: string;
  inMinutes?: string;
  inHours?: string;
  na?: string;
  /** Short unit suffixes (used by compact variant) */
  unitSec?: string;
  unitMin?: string;
  unitHr?: string;
  unitDay?: string;
  /** Template-based (Doctor page): '{n}m ago' */
  timelineJustNow?: string;
  timelineMinAgo?: string;
  timelineHourAgo?: string;
}

// ---------------------------------------------------------------------------
// fmtRelativeTime — "past" relative time (e.g. "3 minutes ago")
//
// Accepts millisecond timestamp (number) or ISO string.
// Returns i18n-aware relative string, falls back to English.
// ---------------------------------------------------------------------------

export function fmtRelativeTime(
  ts: number | string | null | undefined,
  labels?: Partial<RelativeTimeLabels>,
): string {
  if (ts == null) return labels?.na || '-';
  const ms = typeof ts === 'string' ? new Date(ts).getTime() : ts;
  if (!Number.isFinite(ms)) return String(ts);
  const diff = Date.now() - ms;
  if (diff < 60_000) return labels?.justNow || 'just now';
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins} ${labels?.minutesAgo || 'min ago'}`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ${labels?.hoursAgo || 'hr ago'}`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} ${labels?.daysAgo || 'days ago'}`;
  return new Date(ms).toLocaleDateString();
}

// ---------------------------------------------------------------------------
// fmtRelativeFuture — "future or past" relative time (Scheduler)
//
// Shows "in X min" for future, "X min ago" for past.
// ---------------------------------------------------------------------------

export function fmtRelativeFuture(
  ms: number | null | undefined,
  labels?: Partial<RelativeTimeLabels>,
): string {
  if (!ms || !Number.isFinite(ms)) return labels?.na || '-';
  const diff = ms - Date.now();
  if (Math.abs(diff) < 60_000) return labels?.justNow || 'just now';
  const mins = Math.abs(Math.round(diff / 60_000));
  if (mins < 60) return diff > 0 ? `${mins} ${labels?.inMinutes || 'min'}` : `${mins} ${labels?.minutesAgo || 'min ago'}`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return diff > 0 ? `${hrs} ${labels?.inHours || 'hr'}` : `${hrs} ${labels?.hoursAgo || 'hr ago'}`;
  return new Date(ms).toLocaleString();
}

// ---------------------------------------------------------------------------
// fmtAgoCompact — compact "3s / 5m / 2h / 1d" format (ChannelsPanel, Agents heartbeat)
//
// Accepts millisecond timestamp or seconds (if `inputUnit` is 'seconds').
// ---------------------------------------------------------------------------

export function fmtAgoCompact(
  value: number | null | undefined,
  labels?: Partial<RelativeTimeLabels>,
  inputUnit: 'ms' | 'seconds' = 'ms',
): string | null {
  if (value == null) return null;
  const sec = inputUnit === 'seconds' ? value : Math.floor((Date.now() - value) / 1000);
  if (sec < 0) return labels?.na || '-';
  if (sec < 60) return `${sec}${labels?.unitSec || 's'}`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}${labels?.unitMin || 'm'}`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}${labels?.unitHr || 'h'}`;
  return `${Math.floor(hr / 24)}${labels?.unitDay || 'd'}`;
}

// ---------------------------------------------------------------------------
// fmtAgoTemplate — template-based relative time (Doctor page)
//
// Uses '{n}' placeholder in i18n templates.
// ---------------------------------------------------------------------------

export function fmtAgoTemplate(
  ts: string | number | null | undefined,
  labels?: Partial<RelativeTimeLabels>,
): string {
  if (ts == null) return '-';
  const ms = typeof ts === 'string' ? new Date(ts).getTime() : ts;
  if (!Number.isFinite(ms)) return String(ts);
  const diff = Date.now() - ms;
  if (diff < 60_000) return labels?.timelineJustNow || 'Just now';
  if (diff < 3_600_000) {
    const m = Math.floor(diff / 60_000);
    return (labels?.timelineMinAgo || '{n}m ago').replace('{n}', String(m));
  }
  const h = Math.floor(diff / 3_600_000);
  return (labels?.timelineHourAgo || '{n}h ago').replace('{n}', String(h));
}

// ---------------------------------------------------------------------------
// fmtUptimeSeconds — format uptime from seconds (Nodes page fmtRelativeTime)
// ---------------------------------------------------------------------------

export function fmtUptimeSeconds(
  seconds: number | null | undefined,
  labels?: Partial<RelativeTimeLabels>,
): string {
  if (seconds == null || seconds < 0) return '-';
  if (seconds < 60) return labels?.justNow || 'just now';
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    return `${mins} ${labels?.minutesAgo || 'min ago'}`;
  }
  if (seconds < 86400) {
    const hrs = Math.floor(seconds / 3600);
    return `${hrs} ${labels?.hoursAgo || 'hr ago'}`;
  }
  const days = Math.floor(seconds / 86400);
  return `${days} ${labels?.daysAgo || 'days ago'}`;
}
