import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { RequestOverridePanel } from '../windows/Editor/sections/RequestOverridePanel';
import { EditorFieldsI18nProvider } from '../windows/Editor/fields';

// ============================================================================
// Helper
// ============================================================================
function renderPanel(overrides: Partial<{
  data: Record<string, any>;
  es: Record<string, any>;
}> = {}) {
  const data: Record<string, any> = overrides.data || {};
  const setters: Array<{ path: string[]; value: any }> = [];

  const g = (p: string[]) => {
    let cur = data;
    for (const k of p) {
      if (cur && typeof cur === 'object') cur = cur[k];
      else return undefined;
    }
    return cur;
  };

  const s = (p: string[], v: any) => {
    setters.push({ path: p, value: v });
  };

  const tip = (key: string) => `tooltip:${key}`;

  const result = render(
    <EditorFieldsI18nProvider language="en">
      <RequestOverridePanel
        title="Request Overrides"
        tipPrefix="models.providers.*.request"
        tip={tip}
        g={g}
        s={s}
        es={overrides.es || {}}
      />
    </EditorFieldsI18nProvider>
  );

  return { ...result, setters, g, s };
}

// ============================================================================
// Tests
// ============================================================================
describe('RequestOverridePanel', () => {
  it('renders as a collapsed ConfigSection by default', () => {
    renderPanel();
    expect(screen.getByText('Request Overrides')).toBeInTheDocument();
    // Content should be hidden (defaultOpen=false)
    expect(screen.queryByText('Auth Mode')).not.toBeInTheDocument();
  });

  it('expands to show auth mode, proxy, and TLS sections on click', () => {
    renderPanel();
    // Click header to expand
    fireEvent.click(screen.getByRole('button', { name: 'Request Overrides' }));
    // Auth mode should be visible
    expect(screen.getByText('Auth Mode')).toBeInTheDocument();
    // Proxy and TLS toggle buttons should be visible
    expect(screen.getByText('Proxy')).toBeInTheDocument();
    expect(screen.getByText('TLS')).toBeInTheDocument();
  });

  it('shows bearer token field when auth mode is bearer', () => {
    renderPanel({ data: { auth: { mode: 'bearer' } } });
    fireEvent.click(screen.getByRole('button', { name: 'Request Overrides' }));
    // 'Bearer Token' appears as both select option label and password field label
    const matches = screen.getAllByText('Bearer Token');
    expect(matches.length).toBeGreaterThanOrEqual(2);
    // Verify there's a password input (the PasswordField for the token)
    const pwInputs = document.querySelectorAll('input[type="password"]');
    expect(pwInputs.length).toBeGreaterThanOrEqual(1);
  });

  it('shows header name/prefix/value fields when auth mode is header', () => {
    renderPanel({ data: { auth: { mode: 'header' } } });
    fireEvent.click(screen.getByRole('button', { name: 'Request Overrides' }));
    expect(screen.getByText('Header Name')).toBeInTheDocument();
    expect(screen.getByText('Header Prefix')).toBeInTheDocument();
    expect(screen.getByText('Header Value')).toBeInTheDocument();
  });

  it('does not show bearer or header fields when auth mode is none', () => {
    renderPanel({ data: { auth: { mode: 'none' } } });
    fireEvent.click(screen.getByRole('button', { name: 'Request Overrides' }));
    expect(screen.queryByText('Bearer Token')).not.toBeInTheDocument();
    expect(screen.queryByText('Header Name')).not.toBeInTheDocument();
  });

  it('proxy section expands to show proxy fields', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Request Overrides' }));

    // Click "Proxy" toggle
    fireEvent.click(screen.getByText('Proxy'));
    expect(screen.getByText('Proxy Mode')).toBeInTheDocument();
  });

  it('shows proxy URL when proxy mode is set', () => {
    renderPanel({ data: { proxy: { mode: 'http' } } });
    fireEvent.click(screen.getByRole('button', { name: 'Request Overrides' }));
    // Proxy section should auto-show because mode is set
    expect(screen.getByText('Proxy URL')).toBeInTheDocument();
  });

  it('TLS section expands to show TLS fields', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Request Overrides' }));

    // Click "TLS" toggle
    fireEvent.click(screen.getByText('TLS'));
    // Should show TLS fields (multiple "TLS CA" labels exist — one in proxy, one in direct TLS)
    const tlsCaLabels = screen.getAllByText('TLS CA');
    expect(tlsCaLabels.length).toBeGreaterThanOrEqual(1);
  });

  it('uses custom es labels when provided', () => {
    renderPanel({
      es: {
        reqOverrides: '请求覆盖',
        reqAuthMode: '认证模式',
        reqProxy: '代理',
        reqTls: 'TLS 设置',
      },
    });
    // Title comes from prop, not es
    expect(screen.getByText('Request Overrides')).toBeInTheDocument();
  });
});
