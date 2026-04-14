import { useMemo } from 'react';
import type { OpenWindowDetail } from '../types';
import { useRuntimeSummary } from './useRuntimeSummary';
import { useGatewayStatus } from './useGatewayStatus';

// ---------------------------------------------------------------------------
// Attention item model
// ---------------------------------------------------------------------------

export type AttentionLevel = 'critical' | 'high' | 'medium' | 'info';

export interface AttentionItem {
  id: string;
  level: AttentionLevel;
  icon: string;
  title: string;
  detail?: string;
  /** Deep-link to the relevant window/panel */
  action: OpenWindowDetail;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useAttentionItems — derives a priority-sorted list of attention items
 * from the shared runtime summary and gateway status.
 *
 * Components can render this list as a notification feed, badge source,
 * or attention sidebar without making their own API calls.
 */
export function useAttentionItems(): { items: AttentionItem[]; loaded: boolean } {
  const gw = useGatewayStatus();
  const rt = useRuntimeSummary();

  const items = useMemo(() => {
    if (!rt.loaded) return [];

    const list: AttentionItem[] = [];

    // 1. Gateway offline
    if (gw.checked && !gw.ready) {
      list.push({
        id: 'gw-offline',
        level: 'critical',
        icon: 'cloud_off',
        title: 'Gateway is offline',
        action: { id: 'gateway', tab: 'service' },
      });
    }

    // 2. Health check failures
    if (rt.healthCheck.enabled && rt.healthCheck.failCount > 0) {
      const level: AttentionLevel = rt.healthCheck.failCount >= rt.healthCheck.maxFails ? 'critical' : 'high';
      list.push({
        id: 'health-fail',
        level,
        icon: 'heart_broken',
        title: `Health check: ${rt.healthCheck.failCount}/${rt.healthCheck.maxFails} failures`,
        action: { id: 'maintenance' },
      });
    }

    // 3. Critical/high exceptions in last 5 minutes
    if (rt.exceptionStats.critical5m > 0) {
      list.push({
        id: 'exc-critical-5m',
        level: 'critical',
        icon: 'error',
        title: `${rt.exceptionStats.critical5m} critical event(s) in 5 min`,
        action: { id: 'gateway', tab: 'events', eventRisk: 'critical' },
      });
    }
    if (rt.exceptionStats.high5m > 0) {
      list.push({
        id: 'exc-high-5m',
        level: 'high',
        icon: 'warning',
        title: `${rt.exceptionStats.high5m} high-risk event(s) in 5 min`,
        action: { id: 'gateway', tab: 'events', eventRisk: 'high' },
      });
    }

    // 4. Doctor score below threshold
    if (rt.score > 0 && rt.score < 60) {
      list.push({
        id: 'doctor-low',
        level: rt.score < 30 ? 'critical' : 'high',
        icon: 'health_and_safety',
        title: `Health score: ${rt.score}/100`,
        detail: rt.summary,
        action: { id: 'maintenance' },
      });
    } else if (rt.score >= 60 && rt.score < 80) {
      list.push({
        id: 'doctor-warn',
        level: 'medium',
        icon: 'health_and_safety',
        title: `Health score: ${rt.score}/100`,
        detail: rt.summary,
        action: { id: 'maintenance' },
      });
    }

    // 5. Recent issues from doctor (up to 3)
    for (const issue of rt.recentIssues.slice(0, 3)) {
      const level: AttentionLevel =
        issue.risk === 'critical' ? 'critical'
          : issue.risk === 'high' ? 'high'
            : 'medium';
      list.push({
        id: `issue-${issue.id}`,
        level,
        icon: 'report_problem',
        title: issue.title,
        detail: issue.detail,
        action: { id: 'maintenance' },
      });
    }

    // 6. Pending alerts
    if (rt.recentAlerts.length > 0) {
      const unread = rt.recentAlerts.filter((a: any) => a.unread).length;
      if (unread > 0) {
        list.push({
          id: 'pending-alerts',
          level: 'medium',
          icon: 'notifications_active',
          title: `${unread} unread alert(s)`,
          action: { id: 'gateway', tab: 'events' },
        });
      }
    }

    // Sort by severity: critical > high > medium > info
    const levelOrder: Record<AttentionLevel, number> = { critical: 0, high: 1, medium: 2, info: 3 };
    list.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);

    return list;
  }, [gw.checked, gw.ready, rt]);

  return { items, loaded: rt.loaded && gw.checked };
}
