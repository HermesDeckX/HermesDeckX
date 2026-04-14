import { useState, useEffect, useCallback, useRef } from 'react';
import { badgeApi } from '../services/api';
import { WindowID } from '../types';
import { subscribeManagerWS } from '../services/manager-ws';

export function useBadgeCounts(enabled = true): Record<WindowID, number> {
  const [badges, setBadges] = useState<Record<string, number>>({});
  const fetchRef = useRef<() => void>(() => {});

  const fetchBadges = useCallback(() => {
    if (!enabled) return;
    badgeApi.counts().then((data: any) => {
      if (data && typeof data === 'object') setBadges(data);
    }).catch(() => {});
  }, [enabled]);
  fetchRef.current = fetchBadges;

  // Initial fetch only (no polling — updates come via WS)
  useEffect(() => {
    if (!enabled) return;
    fetchBadges();
  }, [enabled, fetchBadges]);

  useEffect(() => {
    if (!enabled) return;
    const handler = () => fetchRef.current();
    window.addEventListener('hermesdeck:refresh-badges', handler);
    return () => window.removeEventListener('hermesdeck:refresh-badges', handler);
  }, [enabled]);

  // WS real-time updates: badge_update from server + alert/approval events
  useEffect(() => {
    if (!enabled) return;
    return subscribeManagerWS((msg: any) => {
      try {
        // After WS reconnect, refresh badges to catch updates missed while disconnected
        if (msg.type === '_reconnected') {
          fetchRef.current();
          return;
        }
        if (msg.type === 'badge_update' && msg.data && typeof msg.data === 'object') {
          setBadges(msg.data);
          return;
        }
        if (msg.type === 'alert') {
          setTimeout(() => fetchRef.current(), 2000);
        }
        if (msg.type === 'exec.approval.requested') {
          setBadges(prev => ({ ...prev, alerts: (prev.alerts || 0) + 1 }));
        }
        if (msg.type === 'exec.approval.resolved') {
          setBadges(prev => ({ ...prev, alerts: Math.max(0, (prev.alerts || 0) - 1) }));
        }
        if (msg.type === 'shutdown') {
          setTimeout(() => fetchRef.current(), 2000);
        }
      } catch { /* ignore */ }
    });
  }, [enabled]);

  // Fallback poll: refresh badges periodically in case WS updates are missed
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => fetchRef.current(), 30000);
    return () => clearInterval(timer);
  }, [enabled]);

  return badges as Record<WindowID, number>;
}
