import React, { useState } from 'react';
import { ConfigSection, TextField, PasswordField, SelectField, SwitchField, KeyValueField } from '../fields';

interface RequestOverridePanelProps {
  title: string;
  /** tooltip key prefix, e.g. "models.providers.*.request" or "tools.media.audio.request" */
  tipPrefix: string;
  tip: (key: string) => string | undefined;
  /** getter for a subpath under the request object */
  g: (path: string[]) => any;
  /** setter for a subpath under the request object */
  s: (path: string[], value: any) => void;
  es: Record<string, any>;
}

const AUTH_MODE_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'header', label: 'Custom Header' },
  { value: 'none', label: 'None' },
];

const PROXY_MODE_OPTIONS = [
  { value: '', label: 'Off' },
  { value: 'http', label: 'HTTP' },
  { value: 'https', label: 'HTTPS' },
  { value: 'socks5', label: 'SOCKS5' },
];

/**
 * Reusable collapsed panel for request overrides (auth, proxy, TLS).
 * Used by ModelsSection (per-provider) and AudioSection (tools.media.audio).
 */
export const RequestOverridePanel: React.FC<RequestOverridePanelProps> = ({ title, tipPrefix, tip, g, s, es }) => {
  const [showProxy, setShowProxy] = useState(!!g(['proxy', 'mode']));
  const [showTls, setShowTls] = useState(!!g(['tls', 'ca']) || !!g(['tls', 'cert']));

  return (
    <ConfigSection title={title} icon="tune" iconColor="text-slate-400" defaultOpen={false}>
      {/* Request Headers */}
      <KeyValueField
        label={es.reqHeaders || 'Request Headers'}
        tooltip={tip(`${tipPrefix}.headers`)}
        value={g(['headers']) || {}}
        onChange={v => s(['headers'], v)}
        keyPlaceholder="Header-Name"
        valuePlaceholder="value"
      />

      {/* Auth Override */}
      <SelectField
        label={es.reqAuthMode || 'Auth Mode'}
        tooltip={tip(`${tipPrefix}.auth.mode`)}
        value={g(['auth', 'mode']) || ''}
        onChange={v => s(['auth', 'mode'], v || undefined)}
        options={AUTH_MODE_OPTIONS}
      />
      {g(['auth', 'mode']) === 'bearer' && (
        <PasswordField
          label={es.reqAuthToken || 'Bearer Token'}
          tooltip={tip(`${tipPrefix}.auth.token`)}
          value={g(['auth', 'token']) || ''}
          onChange={v => s(['auth', 'token'], v)}
        />
      )}
      {g(['auth', 'mode']) === 'header' && (
        <>
          <TextField
            label={es.reqAuthHeaderName || 'Header Name'}
            tooltip={tip(`${tipPrefix}.auth.headerName`)}
            value={g(['auth', 'headerName']) || ''}
            onChange={v => s(['auth', 'headerName'], v)}
            placeholder="X-Custom-Auth"
          />
          <TextField
            label={es.reqAuthPrefix || 'Header Prefix'}
            tooltip={tip(`${tipPrefix}.auth.prefix`)}
            value={g(['auth', 'prefix']) || ''}
            onChange={v => s(['auth', 'prefix'], v)}
            placeholder="Bearer"
          />
          <PasswordField
            label={es.reqAuthValue || 'Header Value'}
            tooltip={tip(`${tipPrefix}.auth.value`)}
            value={g(['auth', 'value']) || ''}
            onChange={v => s(['auth', 'value'], v)}
          />
        </>
      )}

      {/* Proxy */}
      <div className="mt-1 pt-1 border-t border-slate-100 dark:border-white/[0.04]">
        <button
          onClick={() => setShowProxy(!showProxy)}
          className="flex items-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 hover:text-primary transition-colors w-full py-1"
        >
          <span className="material-symbols-outlined text-[12px]">{showProxy ? 'expand_less' : 'expand_more'}</span>
          {es.reqProxy || 'Proxy'}
        </button>
        {showProxy && (
          <div className="space-y-1.5 ps-3">
            <SelectField
              label={es.reqProxyMode || 'Proxy Mode'}
              tooltip={tip(`${tipPrefix}.proxy.mode`)}
              value={g(['proxy', 'mode']) || ''}
              onChange={v => s(['proxy', 'mode'], v || undefined)}
              options={PROXY_MODE_OPTIONS}
            />
            {g(['proxy', 'mode']) && (
              <TextField
                label={es.reqProxyUrl || 'Proxy URL'}
                tooltip={tip(`${tipPrefix}.proxy.url`)}
                value={g(['proxy', 'url']) || ''}
                onChange={v => s(['proxy', 'url'], v)}
                placeholder="http://proxy:8080"
              />
            )}
            {g(['proxy', 'mode']) && (
              <>
                <TextField label={es.reqTlsCa || 'TLS CA'} tooltip={tip(`${tipPrefix}.proxy.tls.ca`)} value={g(['proxy', 'tls', 'ca']) || ''} onChange={v => s(['proxy', 'tls', 'ca'], v)} placeholder="/path/to/ca.pem" />
                <TextField label={es.reqTlsCert || 'TLS Cert'} tooltip={tip(`${tipPrefix}.proxy.tls.cert`)} value={g(['proxy', 'tls', 'cert']) || ''} onChange={v => s(['proxy', 'tls', 'cert'], v)} placeholder="/path/to/cert.pem" />
                <PasswordField label={es.reqTlsKey || 'TLS Key'} tooltip={tip(`${tipPrefix}.proxy.tls.key`)} value={g(['proxy', 'tls', 'key']) || ''} onChange={v => s(['proxy', 'tls', 'key'], v)} />
                <TextField label={es.reqTlsServerName || 'TLS Server Name'} tooltip={tip(`${tipPrefix}.proxy.tls.serverName`)} value={g(['proxy', 'tls', 'serverName']) || ''} onChange={v => s(['proxy', 'tls', 'serverName'], v)} />
                <SwitchField label={es.reqTlsSkipVerify || 'Skip TLS Verify'} tooltip={tip(`${tipPrefix}.proxy.tls.insecureSkipVerify`)} value={g(['proxy', 'tls', 'insecureSkipVerify']) === true} onChange={v => s(['proxy', 'tls', 'insecureSkipVerify'], v)} />
              </>
            )}
          </div>
        )}
      </div>

      {/* Direct TLS */}
      <div className="mt-1 pt-1 border-t border-slate-100 dark:border-white/[0.04]">
        <button
          onClick={() => setShowTls(!showTls)}
          className="flex items-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 hover:text-primary transition-colors w-full py-1"
        >
          <span className="material-symbols-outlined text-[12px]">{showTls ? 'expand_less' : 'expand_more'}</span>
          {es.reqTls || 'TLS'}
        </button>
        {showTls && (
          <div className="space-y-1.5 ps-3">
            <TextField label={es.reqTlsCa || 'TLS CA'} tooltip={tip(`${tipPrefix}.tls.ca`)} value={g(['tls', 'ca']) || ''} onChange={v => s(['tls', 'ca'], v)} placeholder="/path/to/ca.pem" />
            <TextField label={es.reqTlsCert || 'TLS Cert'} tooltip={tip(`${tipPrefix}.tls.cert`)} value={g(['tls', 'cert']) || ''} onChange={v => s(['tls', 'cert'], v)} placeholder="/path/to/cert.pem" />
            <PasswordField label={es.reqTlsKey || 'TLS Key'} tooltip={tip(`${tipPrefix}.tls.key`)} value={g(['tls', 'key']) || ''} onChange={v => s(['tls', 'key'], v)} />
            <PasswordField label={es.reqTlsPassphrase || 'TLS Passphrase'} tooltip={tip(`${tipPrefix}.tls.passphrase`)} value={g(['tls', 'passphrase']) || ''} onChange={v => s(['tls', 'passphrase'], v)} />
            <TextField label={es.reqTlsServerName || 'TLS Server Name'} tooltip={tip(`${tipPrefix}.tls.serverName`)} value={g(['tls', 'serverName']) || ''} onChange={v => s(['tls', 'serverName'], v)} />
            <SwitchField label={es.reqTlsSkipVerify || 'Skip TLS Verify'} tooltip={tip(`${tipPrefix}.tls.insecureSkipVerify`)} value={g(['tls', 'insecureSkipVerify']) === true} onChange={v => s(['tls', 'insecureSkipVerify'], v)} />
          </div>
        )}
      </div>
    </ConfigSection>
  );
};
