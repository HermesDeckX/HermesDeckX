// Result analyzers for Test Center commands.
// Each analyzer parses JSON stdout from a specific CLI command
// and returns a structured AnalyzedResult for display.

export interface AnalyzedMetric {
  label: string;
  value: string | number;
  status: 'ok' | 'warn' | 'error' | 'neutral' | 'info';
}

export interface AnalyzedFinding {
  status: 'ok' | 'warn' | 'error' | 'info';
  title: string;
  detail?: string;
  suggestion?: string;
  copyCommand?: string;
  checkId?: string;
}

export interface AnalyzedResult {
  status: 'ok' | 'warn' | 'error' | 'info';
  headline: string;
  metrics?: AnalyzedMetric[];
  findings?: AnalyzedFinding[];
}

type Analyzer = (stdout: string, dr: any) => AnalyzedResult | null;

function tryParseJson(raw: string): any | null {
  if (!raw) return null;
  try { return JSON.parse(raw); }
  catch {
    const idx = raw.indexOf('{');
    const idxArr = raw.indexOf('[');
    const start = idx >= 0 && (idxArr < 0 || idx < idxArr) ? idx : idxArr;
    if (start < 0) return null;
    try { return JSON.parse(raw.slice(start)); } catch { return null; }
  }
}

function safeStr(v: any): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try { return JSON.stringify(v); } catch { return String(v); }
}

function statusOf(ok: number, warn: number, err: number): 'ok' | 'warn' | 'error' {
  if (err > 0) return 'error';
  if (warn > 0) return 'warn';
  return 'ok';
}

// ---------- models-status ----------
const analyzeModelsStatus: Analyzer = (stdout, dr) => {
  const data = tryParseJson(stdout);
  if (!data) return null;
  const authRaw = data.auth || data.profiles;
  // auth can be an array of profiles, or an object { storePath, providers, oauth, ... }
  const auth: any[] = Array.isArray(authRaw) ? authRaw : [];

  // CLI output: auth is an object with nested providers/oauth arrays
  if (auth.length === 0 && (data.defaultModel || (authRaw && !Array.isArray(authRaw)))) {
    const findings: AnalyzedFinding[] = [];
    const defaultModel = data.resolvedDefault || data.defaultModel || '?';
    const fallbacks: string[] = data.fallbacks || [];
    const imageModel = data.imageModel;
    const aliases = data.aliases || {};
    const aliasCount = typeof aliases === 'object' ? Object.keys(aliases).length : 0;

    findings.push({ status: 'ok', title: `${dr?.raDefaultModel || 'Default Model'}: ${defaultModel}` });
    if (fallbacks.length > 0) {
      findings.push({ status: 'info', title: `${dr?.raFallbackModels || 'Fallbacks'}: ${fallbacks.join(', ')}` });
    }
    if (imageModel) {
      findings.push({ status: 'ok', title: `${dr?.raImageModel || 'Image Model'}: ${imageModel}` });
    }
    // Extract provider auth from auth.providers array
    const providers: any[] = authRaw?.providers || [];
    let provOk = 0, provWarn = 0;
    for (const prov of providers) {
      const provName = prov.provider || '?';
      const profileCount = prov.profiles?.count || 0;
      if (profileCount > 0 || prov.env || prov.modelsJson) {
        provOk++;
      }
    }
    // Extract oauth profile health
    const oauthProfiles: any[] = authRaw?.oauth?.profiles || [];
    for (const op of oauthProfiles) {
      const label = op.label || op.profileId || op.provider || '?';
      if (op.status === 'expiring') {
        provWarn++;
        const mins = op.remainingMs ? Math.round(op.remainingMs / 60000) : null;
        findings.push({ status: 'warn', title: `${label} ${dr?.raExpiring || 'expiring soon'}`, detail: mins ? `${dr?.raExpiresIn || 'Expires in'} ${mins} ${dr?.raMinutes || 'min'}` : undefined, suggestion: dr?.raRefreshSuggestion || 'Refresh credentials before expiry' });
      } else if (op.status === 'expired') {
        findings.push({ status: 'error', title: `${label} ${dr?.raExpired || 'expired'}`, suggestion: dr?.raReauthSuggestion || 'Re-authenticate this provider' });
      }
    }
    // Missing providers in use
    const missingProviders: string[] = authRaw?.missingProvidersInUse || [];
    for (const mp of missingProviders) {
      findings.push({ status: 'error', title: `${mp} ${dr?.raMissing || 'credentials missing'}`, suggestion: dr?.raConfigureSuggestion || 'Configure API key or credentials' });
    }
    return {
      status: missingProviders.length > 0 ? 'error' : provWarn > 0 ? 'warn' : 'ok',
      headline: defaultModel,
      metrics: [
        { label: dr?.raProviders || 'Providers', value: providers.length, status: providers.length > 0 ? 'ok' : 'neutral' },
        { label: dr?.raFallbacks || 'Fallbacks', value: fallbacks.length, status: 'neutral' },
        { label: dr?.raAliases || 'Aliases', value: aliasCount, status: 'neutral' },
        { label: dr?.raImageModel || 'Image', value: imageModel ? '✓' : '—', status: imageModel ? 'ok' : 'neutral' },
      ],
      findings,
    };
  }

  let ok = 0, expiring = 0, expired = 0, missing = 0;
  const findings: AnalyzedFinding[] = [];
  for (const p of auth) {
    const st = p.status || p.authStatus || '';
    const label = p.label || p.profileId || p.provider || '?';
    if (st === 'ok' || st === 'static') { ok++; }
    else if (st === 'expiring') {
      expiring++;
      const mins = p.remainingMs ? Math.round(p.remainingMs / 60000) : null;
      findings.push({
        status: 'warn',
        title: `${label} ${dr?.raExpiring || 'expiring soon'}`,
        detail: mins ? `${dr?.raExpiresIn || 'Expires in'} ${mins} ${dr?.raMinutes || 'min'}` : undefined,
        suggestion: dr?.raRefreshSuggestion || 'Refresh credentials before expiry',
      });
    } else if (st === 'expired') {
      expired++;
      findings.push({
        status: 'error',
        title: `${label} ${dr?.raExpired || 'expired'}`,
        suggestion: dr?.raReauthSuggestion || 'Re-authenticate this provider',
      });
    } else if (st === 'missing') {
      missing++;
      findings.push({
        status: 'error',
        title: `${label} ${dr?.raMissing || 'credentials missing'}`,
        suggestion: dr?.raConfigureSuggestion || 'Configure API key or credentials',
      });
    }
  }
  const models: any[] = data.models || [];
  const total = auth.length;
  return {
    status: statusOf(ok, expiring, expired + missing),
    headline: `${ok}/${total} ${dr?.raProvidersOk || 'providers authenticated'}`,
    metrics: [
      { label: dr?.raOk || 'OK', value: ok, status: 'ok' },
      { label: dr?.raExpiring2 || 'Expiring', value: expiring, status: expiring > 0 ? 'warn' : 'neutral' },
      { label: dr?.raExpired2 || 'Expired', value: expired, status: expired > 0 ? 'error' : 'neutral' },
      { label: dr?.raModels || 'Models', value: models.length, status: 'neutral' },
    ],
    findings: findings.length > 0 ? findings : [{ status: 'ok', title: dr?.raAllProvidersOk || 'All providers authenticated successfully' }],
  };
};

// ---------- models-probe ----------
const analyzeModelsProbe: Analyzer = (stdout, dr) => {
  const data = tryParseJson(stdout);
  if (!data) return null;
  // CLI output: probes are nested in auth.probes.results
  const results: any[] = data.probe || data.results || data.auth?.probes?.results || [];
  if (results.length === 0) return analyzeModelsStatus(stdout, dr);
  let ok = 0, fail = 0;
  let totalLatency = 0, maxLatency = 0;
  let slowest = '';
  const findings: AnalyzedFinding[] = [];
  for (const r of results) {
    const label = r.label || r.profileId || r.provider || '?';
    if (r.status === 'ok') {
      ok++;
      const lat = r.latencyMs || 0;
      totalLatency += lat;
      if (lat > maxLatency) { maxLatency = lat; slowest = label; }
      if (lat > 5000) {
        findings.push({ status: 'warn', title: `${label} ${dr?.raSlow || 'high latency'}: ${lat}ms`, suggestion: dr?.raSlowSuggestion || 'Check network or consider alternative provider' });
      }
    } else {
      fail++;
      findings.push({ status: 'error', title: `${label} ${dr?.raProbeFailed || 'probe failed'}`, detail: safeStr(r.error), suggestion: dr?.raCheckCredentials || 'Verify API key and network connectivity' });
    }
  }
  const avgLatency = ok > 0 ? Math.round(totalLatency / ok) : 0;
  return {
    status: statusOf(ok, 0, fail),
    headline: `${ok}/${results.length} ${dr?.raProbesOk || 'probes succeeded'}` + (avgLatency > 0 ? ` (${dr?.raAvgLatency || 'avg'} ${avgLatency}ms)` : ''),
    metrics: [
      { label: dr?.raSuccess || 'Success', value: ok, status: 'ok' },
      { label: dr?.raFailed || 'Failed', value: fail, status: fail > 0 ? 'error' : 'neutral' },
      { label: dr?.raAvgMs || 'Avg ms', value: avgLatency, status: avgLatency > 3000 ? 'warn' : 'neutral' },
      { label: dr?.raMaxMs || 'Max ms', value: maxLatency, status: maxLatency > 5000 ? 'warn' : 'neutral' },
    ],
    findings: findings.length > 0 ? findings : [{ status: 'ok', title: dr?.raAllProbesOk || 'All probes succeeded' }],
  };
};

// ---------- models-list ----------
const analyzeModelsList: Analyzer = (stdout, dr) => {
  const data = tryParseJson(stdout);
  if (!data) return null;
  const models: any[] = Array.isArray(data) ? data : data.models || [];
  const byProvider = new Map<string, number>();
  for (const m of models) {
    const p = m.provider || '?';
    byProvider.set(p, (byProvider.get(p) || 0) + 1);
  }
  const findings: AnalyzedFinding[] = Array.from(byProvider.entries()).map(([p, count]) => ({
    status: 'info' as const, title: `${p}: ${count} ${dr?.raModelsCount || 'models'}`,
  }));
  return {
    status: 'info',
    headline: `${models.length} ${dr?.raModelsAvailable || 'models available'}, ${byProvider.size} ${dr?.raProviders || 'providers'}`,
    metrics: [
      { label: dr?.raTotal || 'Total', value: models.length, status: 'neutral' },
      { label: dr?.raProviders || 'Providers', value: byProvider.size, status: 'neutral' },
    ],
    findings,
  };
};

// ---------- models-aliases ----------
const analyzeModelsAliases: Analyzer = (stdout, dr) => {
  const data = tryParseJson(stdout);
  if (!data) return null;
  // CLI output: { aliases: { alias1: "target1", alias2: "target2" } }
  const rawAliases = data.aliases || data;
  const entries: [string, string][] = Array.isArray(rawAliases)
    ? rawAliases.map((a: any) => [a.alias || a.name || '?', a.model || a.target || '?'])
    : (typeof rawAliases === 'object' ? Object.entries(rawAliases) : []);
  return {
    status: 'info',
    headline: `${entries.length} ${dr?.raAliasesConfigured || 'aliases configured'}`,
    metrics: [{ label: dr?.raAliases || 'Aliases', value: entries.length, status: 'neutral' }],
    findings: entries.length === 0
      ? [{ status: 'info', title: dr?.raNoAliases || 'No model aliases configured', suggestion: dr?.raAliasSuggestion || 'Aliases let you refer to models by short names' }]
      : entries.slice(0, 10).map(([alias, target]) => ({ status: 'info' as const, title: `${alias} → ${target}` })),
  };
};

// ---------- models-fallbacks ----------
const analyzeModelsFallbacks: Analyzer = (stdout, dr) => {
  const data = tryParseJson(stdout);
  if (!data) return null;
  const raw = Array.isArray(data) ? data : data.fallbacks || [];
  // CLI output: { fallbacks: ["model1", "model2", ...] } — a flat string array
  if (raw.length > 0 && typeof raw[0] === 'string') {
    return {
      status: raw.length >= 2 ? 'ok' : 'warn',
      headline: `${raw.length} ${dr?.raFallbackModels || 'fallback models'}`,
      metrics: [{ label: dr?.raFallbacks || 'Fallbacks', value: raw.length, status: 'neutral' }],
      findings: raw.length === 0
        ? [{ status: 'info', title: dr?.raNoFallbacks || 'No fallback chains configured' }]
        : [{ status: raw.length >= 2 ? 'ok' : 'warn', title: raw.join(' → ') }],
    };
  }
  // Legacy format: array of { chain, role } objects
  const chains: any[] = raw;
  const findings: AnalyzedFinding[] = chains.map((c: any) => {
    const chain = c.chain || [];
    return { status: (chain.length >= 2 ? 'ok' : 'warn') as 'ok' | 'warn', title: `${c.role || 'default'}: ${chain.length} ${dr?.raLevels || 'levels'}`, detail: chain.map((m: any) => m.provider || m.model || '?').join(' → ') };
  });
  return {
    status: chains.some((c: any) => (c.chain || []).length < 2) ? 'warn' : 'ok',
    headline: `${chains.length} ${dr?.raFallbackChains || 'fallback chains'}`,
    metrics: [{ label: dr?.raChains || 'Chains', value: chains.length, status: 'neutral' }],
    findings: findings.length > 0 ? findings : [{ status: 'info', title: dr?.raNoFallbacks || 'No fallback chains configured' }],
  };
};

// ---------- channels-status ----------
const analyzeChannelsStatus: Analyzer = (stdout, dr) => {
  const data = tryParseJson(stdout);
  if (!data) return null;

  // Gateway RPC output: { channelAccounts: { channelId: [account, ...] }, channelOrder, ... }
  const channelAccounts = data.channelAccounts;
  if (channelAccounts && typeof channelAccounts === 'object' && !Array.isArray(channelAccounts)) {
    let online = 0, offline = 0, errCount = 0, totalAccounts = 0;
    const findings: AnalyzedFinding[] = [];
    const channelIds = Array.isArray(data.channelOrder) && data.channelOrder.length > 0
      ? data.channelOrder : Object.keys(channelAccounts);
    for (const chId of channelIds) {
      const accounts: any[] = channelAccounts[chId] || [];
      for (const acct of accounts) {
        totalAccounts++;
        const acctId = acct.accountId || 'default';
        const label = `${chId}${acctId !== 'default' ? `/${acctId}` : ''}`;
        if (acct.connected || (acct.running && acct.configured)) {
          online++;
        } else if (acct.lastError) {
          errCount++;
          findings.push({ status: 'error', title: `${label} ${dr?.raChannelError || 'error'}`, detail: safeStr(acct.lastError), suggestion: dr?.raCheckChannelConfig || 'Check channel credentials and configuration' });
        } else if (acct.enabled === false) {
          offline++;
          findings.push({ status: 'info', title: `${label} ${dr?.raDisabled || 'disabled'}` });
        } else if (!acct.configured) {
          offline++;
          findings.push({ status: 'warn', title: `${label} ${dr?.raNotConfigured || 'not configured'}`, suggestion: dr?.raChannelOfflineSuggestion || 'Channel may need credentials or restart' });
        } else {
          offline++;
          findings.push({ status: 'warn', title: `${label}: ${dr?.raOffline || 'offline'}`, suggestion: dr?.raChannelOfflineSuggestion || 'Channel may need credentials or restart' });
        }
      }
    }
    if (totalAccounts === 0) {
      return {
        status: 'info',
        headline: dr?.raNoChannels || 'No channels configured',
        metrics: [{ label: dr?.raChannels || 'Channels', value: 0, status: 'neutral' }],
        findings: [{ status: 'info', title: dr?.raNoChannels || 'No channels configured', suggestion: dr?.raAddChannelSuggestion || 'Add a channel to start messaging' }],
      };
    }
    return {
      status: statusOf(online, offline, errCount),
      headline: `${online}/${totalAccounts} ${dr?.raChannelsOnline || 'channels online'}`,
      metrics: [
        { label: dr?.raOnline || 'Online', value: online, status: 'ok' },
        { label: dr?.raOffline2 || 'Offline', value: offline, status: offline > 0 ? 'warn' : 'neutral' },
        { label: dr?.raErrors || 'Errors', value: errCount, status: errCount > 0 ? 'error' : 'neutral' },
      ],
      findings: findings.length > 0 ? findings : [{ status: 'ok', title: dr?.raAllChannelsOk || 'All channels connected' }],
    };
  }

  // Fallback: legacy array format
  const channels: any[] = Array.isArray(data) ? data : (Array.isArray(data.channels) ? data.channels : []);
  let online = 0, offline = 0, errCount = 0;
  const findings: AnalyzedFinding[] = [];
  for (const ch of channels) {
    const st = (ch.status || ch.state || '').toLowerCase();
    const name = ch.channel || ch.name || ch.type || '?';
    if (st === 'connected' || st === 'online' || st === 'ok' || st === 'ready') {
      online++;
    } else if (st === 'error' || st === 'failed') {
      errCount++;
      findings.push({ status: 'error', title: `${name} ${dr?.raChannelError || 'error'}`, detail: safeStr(ch.error || ch.detail), suggestion: dr?.raCheckChannelConfig || 'Check channel credentials and configuration' });
    } else {
      offline++;
      findings.push({ status: 'warn', title: `${name}: ${st || dr?.raOffline || 'offline'}`, suggestion: dr?.raChannelOfflineSuggestion || 'Channel may need credentials or restart' });
    }
  }
  return {
    status: statusOf(online, offline, errCount),
    headline: `${online}/${channels.length} ${dr?.raChannelsOnline || 'channels online'}`,
    metrics: [
      { label: dr?.raOnline || 'Online', value: online, status: 'ok' },
      { label: dr?.raOffline2 || 'Offline', value: offline, status: offline > 0 ? 'warn' : 'neutral' },
      { label: dr?.raErrors || 'Errors', value: errCount, status: errCount > 0 ? 'error' : 'neutral' },
    ],
    findings: findings.length > 0 ? findings : [{ status: 'ok', title: dr?.raAllChannelsOk || 'All channels connected' }],
  };
};

// ---------- channels-probe ----------
const analyzeChannelsProbe: Analyzer = (stdout, dr) => {
  // Reuse channels-status analyzer — probe output has same shape with extra fields
  return analyzeChannelsStatus(stdout, dr);
};

// ---------- channels-capabilities ----------
const analyzeChannelsCaps: Analyzer = (stdout, dr) => {
  const data = tryParseJson(stdout);
  if (!data) return null;
  const channels: any[] = Array.isArray(data) ? data : data.channels || [];
  const findings: AnalyzedFinding[] = channels.map((ch: any) => {
    const name = ch.channel || ch.name || '?';
    const caps = ch.capabilities || ch.intents || ch.features || [];
    return { status: 'info' as const, title: `${name}: ${Array.isArray(caps) ? caps.length : 0} ${dr?.raCapabilities || 'capabilities'}` };
  });
  return {
    status: 'info',
    headline: `${channels.length} ${dr?.raChannelsScanned || 'channels scanned'}`,
    metrics: [{ label: dr?.raChannels || 'Channels', value: channels.length, status: 'neutral' }],
    findings,
  };
};

// ---------- channels-list ----------
const analyzeChannelsList: Analyzer = (stdout, dr) => {
  const data = tryParseJson(stdout);
  if (!data) return null;
  // CLI output: { chat: { channelId: [accountIds] }, auth: [...], usage?: {...} }
  const chat = data.chat || {};
  const channelsArr: any[] = Array.isArray(data) ? data : data.channels || [];
  // Build channel list from chat object or channels array
  const findings: AnalyzedFinding[] = [];
  if (typeof chat === 'object' && !Array.isArray(chat) && Object.keys(chat).length > 0) {
    const chatEntries = Object.entries(chat);
    for (const [chId, accounts] of chatEntries) {
      const accts = Array.isArray(accounts) ? accounts : [];
      findings.push({ status: 'info', title: `${chId}${accts.length > 0 ? ` (${accts.length} ${dr?.raAccounts || 'accounts'})` : ''}` });
    }
    return {
      status: 'info',
      headline: `${chatEntries.length} ${dr?.raChannelsConfigured || 'channels configured'}`,
      metrics: [{ label: dr?.raChannels || 'Channels', value: chatEntries.length, status: 'neutral' }],
      findings,
    };
  }
  // Fallback: array format
  return {
    status: 'info',
    headline: `${channelsArr.length} ${dr?.raChannelsConfigured || 'channels configured'}`,
    metrics: [{ label: dr?.raChannels || 'Channels', value: channelsArr.length, status: 'neutral' }],
    findings: channelsArr.slice(0, 10).map((ch: any) => ({
      status: 'info' as const, title: `${ch.channel || ch.name || ch.type || '?'}${ch.account ? ` (${ch.account})` : ''}`,
    })),
  };
};

// ---------- gateway-logs ----------
const analyzeGatewayLogs: Analyzer = (stdout, dr) => {
  const data = tryParseJson(stdout);
  if (!data) return null;
  const lines: any[] = Array.isArray(data) ? data : data.lines || data.entries || [];
  let err = 0, warn = 0, info = 0;
  for (const line of lines) {
    const level = typeof line === 'string' ? (line.match(/"level"\s*:\s*"(\w+)"/)?.[1] || '') : (line.level || '');
    if (level === 'error' || level === 'fatal') err++;
    else if (level === 'warn') warn++;
    else info++;
  }
  return {
    status: statusOf(info, warn, err),
    headline: `${lines.length} ${dr?.raLogEntries || 'log entries'}` + (err > 0 ? ` (${err} ${dr?.raErrors || 'errors'})` : ''),
    metrics: [
      { label: dr?.raErrors || 'Errors', value: err, status: err > 0 ? 'error' : 'neutral' },
      { label: dr?.raWarnings || 'Warnings', value: warn, status: warn > 0 ? 'warn' : 'neutral' },
      { label: dr?.raInfo || 'Info', value: info, status: 'neutral' },
    ],
    findings: err > 0 ? [{ status: 'warn', title: `${err} ${dr?.raErrorsInLogs || 'errors in recent logs'}`, suggestion: dr?.raCheckLogs || 'Review gateway logs for details' }] : [{ status: 'ok', title: dr?.raNoErrors || 'No errors in recent logs' }],
  };
};

// ---------- config-get ----------
const analyzeConfigGet: Analyzer = (stdout, dr) => {
  const data = tryParseJson(stdout);
  if (!data) return null;
  const findings: AnalyzedFinding[] = [];
  const gw = data.gateway || {};
  if (gw.bind === 'all' || gw.bind === '0.0.0.0') {
    findings.push({ status: 'warn', title: dr?.raBindAll || 'Gateway bound to all interfaces', suggestion: dr?.raBindLoopback || 'Consider binding to loopback for security', copyCommand: 'hermes-agent config set gateway.bind loopback' });
  }
  if (!gw.token && !gw.auth?.trustedProxy?.userHeader) {
    findings.push({ status: 'warn', title: dr?.raNoToken || 'No gateway token configured', suggestion: dr?.raSetToken || 'Set a gateway token for security', copyCommand: 'hermes doctor --generate-gateway-token' });
  }
  const tls = gw.tls || {};
  if (gw.bind !== 'loopback' && !tls.certPath) {
    findings.push({ status: 'info', title: dr?.raNoTls || 'TLS not configured', suggestion: dr?.raTlsSuggestion || 'Consider enabling TLS for encrypted connections' });
  }
  const keyCount = Object.keys(data).length;
  return {
    status: findings.some(f => f.status === 'warn') ? 'warn' : 'ok',
    headline: `${keyCount} ${dr?.raConfigSections || 'config sections loaded'}`,
    metrics: [{ label: dr?.raSections || 'Sections', value: keyCount, status: 'neutral' }],
    findings: findings.length > 0 ? findings : [{ status: 'ok', title: dr?.raConfigOk || 'Configuration looks good' }],
  };
};

// ---------- version ----------
const analyzeVersion: Analyzer = (stdout, dr) => {
  const ver = stdout.trim().replace(/^hermesagent\s+/i, '').split('\n')[0].trim();
  return {
    status: 'info',
    headline: `${dr?.raVersion || 'Version'}: ${ver}`,
    metrics: [{ label: dr?.raVersion || 'Version', value: ver, status: 'neutral' }],
  };
};

// ---------- skills-list ----------
const analyzeSkillsList: Analyzer = (stdout, dr) => {
  const data = tryParseJson(stdout);
  if (!data) return null;
  const skills: any[] = Array.isArray(data) ? data : data.skills || [];
  let ready = 0, disabled = 0, notReady = 0;
  const findings: AnalyzedFinding[] = [];
  for (const s of skills) {
    // CLI output: each skill has eligible, disabled, blockedByAllowlist, missing fields
    if (s.eligible) { ready++; }
    else if (s.disabled) {
      disabled++;
      if (disabled <= 3) {
        findings.push({ status: 'info', title: `${s.name || '?'} ${dr?.raDisabled || 'disabled'}` });
      }
    } else {
      notReady++;
      if (notReady <= 5) {
        const missingParts: string[] = [];
        if (s.missing) {
          if (s.missing.bins?.length) missingParts.push(`bins: ${s.missing.bins.join(', ')}`);
          if (s.missing.env?.length) missingParts.push(`env: ${s.missing.env.join(', ')}`);
        }
        const installHint = Array.isArray(s.install) ? s.install.map((i: any) => i.label || i.id || '').filter(Boolean).join(', ') : (typeof s.install === 'string' ? s.install : '');
        findings.push({ status: 'warn', title: `${s.name || '?'} ${dr?.raNotReady || 'not ready'}`, detail: missingParts.join('; ') || s.reason || '', suggestion: installHint || dr?.raInstallDeps || 'Install missing dependencies' });
      }
    }
  }
  return {
    status: notReady > 0 ? 'warn' : 'ok',
    headline: `${ready}/${skills.length} ${dr?.raSkillsReady || 'skills ready'}`,
    metrics: [
      { label: dr?.raReady || 'Ready', value: ready, status: 'ok' },
      { label: dr?.raNotReady2 || 'Not Ready', value: notReady, status: notReady > 0 ? 'warn' : 'neutral' },
      ...(disabled > 0 ? [{ label: dr?.raDisabled2 || 'Disabled', value: disabled, status: 'neutral' as const }] : []),
    ],
    findings: findings.length > 0 ? findings : [{ status: 'ok', title: dr?.raAllSkillsReady || 'All skills are ready' }],
  };
};

// ---------- skills-check ----------
const analyzeSkillsCheck: Analyzer = (stdout, dr) => {
  const data = tryParseJson(stdout);
  if (!data) return null;
  // CLI output: { summary: { total, eligible, disabled, blocked, missingRequirements }, eligible: [...], ... }
  if (data.summary) {
    const s = data.summary;
    const findings: AnalyzedFinding[] = [];
    const missingReqs: any[] = data.missingRequirements || [];
    for (const mr of missingReqs.slice(0, 5)) {
      const missingParts: string[] = [];
      if (mr.missing) {
        if (mr.missing.bins?.length) missingParts.push(`bins: ${mr.missing.bins.join(', ')}`);
        if (mr.missing.env?.length) missingParts.push(`env: ${mr.missing.env.join(', ')}`);
      }
      const installHint = Array.isArray(mr.install) ? mr.install.map((i: any) => i.label || i.id || '').filter(Boolean).join(', ') : (typeof mr.install === 'string' ? mr.install : '');
      findings.push({ status: 'warn', title: `${mr.name || '?'} ${dr?.raNotReady || 'not ready'}`, detail: missingParts.join('; ') || '', suggestion: installHint || dr?.raInstallDeps || 'Install missing dependencies' });
    }
    return {
      status: s.missingRequirements > 0 ? 'warn' : 'ok',
      headline: `${s.eligible}/${s.total} ${dr?.raSkillsReady || 'skills ready'}`,
      metrics: [
        { label: dr?.raReady || 'Ready', value: s.eligible, status: 'ok' },
        { label: dr?.raNotReady2 || 'Not Ready', value: s.missingRequirements, status: s.missingRequirements > 0 ? 'warn' : 'neutral' },
        ...(s.disabled > 0 ? [{ label: dr?.raDisabled2 || 'Disabled', value: s.disabled, status: 'neutral' as const }] : []),
        ...(s.blocked > 0 ? [{ label: dr?.raBlocked || 'Blocked', value: s.blocked, status: 'warn' as const }] : []),
      ],
      findings: findings.length > 0 ? findings : [{ status: 'ok', title: dr?.raAllSkillsReady || 'All skills are ready' }],
    };
  }
  // Fallback: try skills-list format
  return analyzeSkillsList(stdout, dr);
};

// ---------- plugins-list ----------
const analyzePluginsList: Analyzer = (stdout, dr) => {
  const data = tryParseJson(stdout);
  if (!data) return null;
  const plugins: any[] = Array.isArray(data) ? data : data.plugins || [];
  let loaded = 0, errCount = 0;
  const findings: AnalyzedFinding[] = [];
  for (const p of plugins) {
    if (p.status === 'error' || p.error) {
      errCount++;
      findings.push({ status: 'error', title: `${p.name || p.id || '?'} ${dr?.raLoadFailed || 'load failed'}`, detail: safeStr(p.error) });
    } else { loaded++; }
  }
  return {
    status: errCount > 0 ? 'error' : 'ok',
    headline: `${loaded}/${plugins.length} ${dr?.raPluginsLoaded || 'plugins loaded'}`,
    metrics: [
      { label: dr?.raLoaded || 'Loaded', value: loaded, status: 'ok' },
      { label: dr?.raErrors || 'Errors', value: errCount, status: errCount > 0 ? 'error' : 'neutral' },
    ],
    findings: findings.length > 0 ? findings : [{ status: 'ok', title: dr?.raAllPluginsOk || 'All plugins loaded' }],
  };
};

// ---------- hooks-list ----------
const analyzeHooksList: Analyzer = (stdout, dr) => {
  const data = tryParseJson(stdout);
  if (!data) return null;
  const hooks: any[] = Array.isArray(data) ? data : data.hooks || [];
  let eligible = 0, disabled = 0, ineligible = 0;
  const findings: AnalyzedFinding[] = [];
  for (const h of hooks) {
    // CLI output: each hook has eligible, disabled, missing fields
    if (h.eligible) { eligible++; }
    else if (h.disabled) {
      disabled++;
      if (disabled <= 3) findings.push({ status: 'info', title: `${h.name || '?'} ${dr?.raDisabled || 'disabled'}` });
    } else {
      ineligible++;
      if (ineligible <= 5) {
        const missingParts: string[] = [];
        if (h.missing) {
          if (h.missing.bins?.length) missingParts.push(`bins: ${h.missing.bins.join(', ')}`);
          if (h.missing.env?.length) missingParts.push(`env: ${h.missing.env.join(', ')}`);
        }
        findings.push({ status: 'warn', title: `${h.name || '?'} ${dr?.raNotReady || 'not ready'}`, detail: missingParts.join('; ') || '' });
      }
    }
  }
  return {
    status: ineligible > 0 ? 'warn' : 'ok',
    headline: `${eligible}/${hooks.length} ${dr?.raHooksFound || 'hooks'} ${dr?.raEligible || 'eligible'}`,
    metrics: [
      { label: dr?.raEligible || 'Eligible', value: eligible, status: 'ok' },
      { label: dr?.raIneligible || 'Ineligible', value: ineligible, status: ineligible > 0 ? 'warn' : 'neutral' },
      ...(disabled > 0 ? [{ label: dr?.raDisabled2 || 'Disabled', value: disabled, status: 'neutral' as const }] : []),
    ],
    findings: findings.length > 0 ? findings : undefined,
  };
};

// ---------- security-audit ----------
const analyzeSecurityAudit: Analyzer = (stdout, dr) => {
  const data = tryParseJson(stdout);
  if (!data) return null;
  // CLI output: { ts, summary, findings } or with --fix: { fix: {...}, report: { ts, summary, findings } }
  const report = data.report || data;
  const items: any[] = report.findings || report.items || report.results || (Array.isArray(data) ? data : []);
  // Use summary counts if available
  const summary = report.summary;
  let critical = 0, warn = 0, info = 0;
  const findings: AnalyzedFinding[] = [];
  for (const item of items) {
    const sev = (item.severity || item.level || '').toLowerCase();
    const name = item.title || item.name || item.id || '?';
    const cid = item.checkId || item.id || item.code || '';
    if (sev === 'error' || sev === 'critical') {
      critical++;
      findings.push({ status: 'error', title: name, detail: safeStr(item.detail || item.description), suggestion: safeStr(item.remediation || item.suggestion || item.fix), checkId: cid });
    } else if (sev === 'warn' || sev === 'warning') {
      warn++;
      findings.push({ status: 'warn', title: name, detail: safeStr(item.detail || item.description), suggestion: safeStr(item.remediation || item.suggestion || item.fix), checkId: cid });
    } else {
      info++;
    }
  }
  // Prefer summary counts when available
  if (summary) {
    critical = summary.critical ?? critical;
    warn = summary.warn ?? warn;
    info = summary.info ?? info;
  }
  return {
    status: statusOf(0, warn, critical),
    headline: critical > 0 ? `${critical} ${dr?.raCriticalIssues || 'critical issues'}` : warn > 0 ? `${warn} ${dr?.raWarnings || 'warnings'}` : dr?.raSecurityOk || 'All checks passed',
    metrics: [
      { label: dr?.raCritical || 'Critical', value: critical, status: critical > 0 ? 'error' : 'neutral' },
      { label: dr?.raWarnings || 'Warnings', value: warn, status: warn > 0 ? 'warn' : 'neutral' },
      { label: dr?.raPassed || 'Passed', value: info, status: 'ok' },
    ],
    findings: findings.length > 0 ? findings : [{ status: 'ok', title: dr?.raSecurityAllPassed || 'All security checks passed' }],
  };
};

// ---------- secrets-audit ----------
const analyzeSecretsAudit: Analyzer = (stdout, dr) => {
  const data = tryParseJson(stdout);
  if (!data) return null;
  const items: any[] = data.findings || data.items || data.secrets || (Array.isArray(data) ? data : []);
  // CLI output: { version, status, filesScanned, summary: { plaintextCount, unresolvedRefCount, ... }, findings: [{ code, severity, file, jsonPath, message }] }
  const summary = data.summary;
  let plaintext = 0, unresolved = 0, shadowed = 0;
  const findings: AnalyzedFinding[] = [];
  for (const item of items) {
    const code = (item.code || item.type || item.kind || '').toUpperCase();
    const label = item.jsonPath || item.key || item.name || '?';
    const msg = item.message || '';
    if (code === 'PLAINTEXT_FOUND' || code.includes('PLAINTEXT')) {
      plaintext++;
      if (plaintext <= 5) findings.push({ status: 'warn', title: `${label} ${dr?.raPlaintext || 'stored in plaintext'}`, detail: msg, suggestion: dr?.raUseSecretRef || 'Use secret references instead of plaintext values' });
    } else if (code === 'REF_UNRESOLVED' || code.includes('UNRESOLVED')) {
      unresolved++;
      if (unresolved <= 5) findings.push({ status: 'error', title: `${label} ${dr?.raUnresolved || 'unresolved'}`, detail: msg });
    } else if (code === 'REF_SHADOWED' || code.includes('SHADOW')) {
      shadowed++;
      if (shadowed <= 3) findings.push({ status: 'info', title: `${label} ${dr?.raShadowed || 'shadowed'}`, detail: msg });
    } else {
      if (findings.length < 8) findings.push({ status: 'info', title: `${label}: ${msg || code}` });
    }
  }
  // Prefer summary counts when available
  if (summary) {
    plaintext = summary.plaintextCount ?? plaintext;
    unresolved = summary.unresolvedRefCount ?? unresolved;
    shadowed = summary.shadowedRefCount ?? shadowed;
  }
  const status = data.status || '';
  return {
    status: unresolved > 0 ? 'error' : plaintext > 0 ? 'warn' : 'ok',
    headline: (status === 'clean' || items.length === 0) ? (dr?.raSecretsOk || 'No issues found') : `${items.length} ${dr?.raSecretFindings || 'findings'}`,
    metrics: [
      { label: dr?.raPlaintext2 || 'Plaintext', value: plaintext, status: plaintext > 0 ? 'warn' : 'neutral' },
      { label: dr?.raUnresolved2 || 'Unresolved', value: unresolved, status: unresolved > 0 ? 'error' : 'neutral' },
      ...(shadowed > 0 ? [{ label: dr?.raShadowed2 || 'Shadowed', value: shadowed, status: 'info' as const }] : []),
    ],
    findings: findings.length > 0 ? findings : [{ status: 'ok', title: dr?.raSecretsAllOk || 'All secrets properly configured' }],
  };
};

// ---------- update-status ----------
const analyzeUpdateStatus: Analyzer = (stdout, dr) => {
  const data = tryParseJson(stdout);
  if (!data) return null;
  const upd = data.update || {};
  const current = data.version || data.current || data.installed || upd.currentVersion || '?';
  const latest = data.latest || data.available || upd.registry?.latestVersion || '';
  const channelRaw = data.channel || data.updateChannel || '';
  const channel = typeof channelRaw === 'object' && channelRaw !== null ? (channelRaw.value || channelRaw.name || '') : channelRaw;
  const pkgMgr = upd.packageManager || '';
  const installKind = upd.installKind || '';
  const hasUpdate = latest && latest !== current && current !== '?';

  const findings: AnalyzedFinding[] = [];
  if (hasUpdate) {
    findings.push({ status: 'info', title: `${dr?.raNewVersion || 'New version'}: ${latest}`, suggestion: dr?.raRunUpdate || 'Run update to get the latest features', copyCommand: 'hermesagent update run' });
  }
  // Deps status warnings
  const deps = upd.deps;
  if (deps && deps.status === 'unknown' && deps.reason) {
    findings.push({ status: 'warn', title: `${dr?.raDepsStatus || 'Dependencies'}: ${deps.reason}` });
  }

  return {
    status: hasUpdate ? 'info' : 'ok',
    headline: hasUpdate
      ? `${dr?.raUpdateAvailable || 'Update available'}: ${latest}`
      : latest
        ? `${dr?.raUpToDate || 'Up to date'}: ${latest}`
        : current !== '?' ? `${dr?.raCurrent || 'Current'}: ${current}` : (dr?.raUpToDate || 'Up to date'),
    metrics: [
      ...(latest ? [{ label: dr?.raLatest || 'Latest', value: String(latest), status: (hasUpdate ? 'info' : 'ok') as 'info' | 'ok' }] : []),
      ...(channel ? [{ label: dr?.raChannel || 'Channel', value: String(channel), status: 'neutral' as const }] : []),
      ...(pkgMgr ? [{ label: dr?.raPkgMgr || 'Package Manager', value: String(pkgMgr), status: 'neutral' as const }] : []),
      ...(installKind ? [{ label: dr?.raInstallKind || 'Install', value: String(installKind), status: 'neutral' as const }] : []),
    ],
    findings: findings.length > 0 ? findings : undefined,
  };
};

// ---------- system-presence ----------
const analyzeSystemPresence: Analyzer = (stdout, dr) => {
  const data = tryParseJson(stdout);
  if (!data) return null;
  const entries: any[] = Array.isArray(data) ? data : data.entries || data.presence || [];
  return {
    status: 'info',
    headline: `${entries.length} ${dr?.raPresenceEntries || 'presence entries'}`,
    metrics: [{ label: dr?.raEntries || 'Entries', value: entries.length, status: 'neutral' }],
    findings: entries.slice(0, 8).map((e: any) => ({ status: 'info' as const, title: e.key || e.name || e.id || '?', detail: safeStr(e.value ?? e.status) })),
  };
};

// ---------- status (new) ----------
const analyzeStatus: Analyzer = (stdout, dr) => {
  const data = tryParseJson(stdout);
  if (!data) return null;
  const version = data.version || '';
  const channels = data.channels || {};
  const online = channels.online || channels.connected || 0;
  const total = channels.total || channels.configured || 0;
  const sessions = data.sessions || {};
  const activeS = sessions.active || sessions.count || 0;
  return {
    status: 'info',
    headline: `${dr?.raSystemStatus || 'System status'}: ${version}`,
    metrics: [
      { label: dr?.raVersion || 'Version', value: String(version), status: 'neutral' },
      { label: dr?.raChannelsOnline || 'Channels', value: `${online}/${total}`, status: online < total ? 'warn' : 'ok' },
      { label: dr?.raSessions || 'Sessions', value: activeS, status: 'neutral' },
    ],
  };
};

// ---------- health (new) ----------
const analyzeHealth: Analyzer = (stdout, dr) => {
  const data = tryParseJson(stdout);
  if (!data) return null;
  const st = (data.status || '').toLowerCase();
  const ok = st === 'ok' || st === 'healthy' || st === 'running';
  return {
    status: ok ? 'ok' : 'error',
    headline: ok ? (dr?.raGatewayHealthy || 'Gateway is healthy') : (dr?.raGatewayUnhealthy || 'Gateway health check failed'),
    metrics: [{ label: dr?.raStatus || 'Status', value: data.status || '?', status: ok ? 'ok' : 'error' }],
  };
};

// ---------- sessions (new) ----------
const analyzeSessions: Analyzer = (stdout, dr) => {
  const data = tryParseJson(stdout);
  if (!data) return null;
  const sessions: any[] = Array.isArray(data) ? data : data.sessions || [];
  let active = 0, idle = 0;
  for (const s of sessions) {
    if (s.active || s.status === 'active') active++;
    else idle++;
  }
  return {
    status: 'info',
    headline: `${sessions.length} ${dr?.raTotalSessions || 'sessions'}, ${active} ${dr?.raActive || 'active'}`,
    metrics: [
      { label: dr?.raActive || 'Active', value: active, status: 'ok' },
      { label: dr?.raIdle || 'Idle', value: idle, status: 'neutral' },
      { label: dr?.raTotal || 'Total', value: sessions.length, status: 'neutral' },
    ],
  };
};

// ---------- cron-list (new) ----------
const analyzeCronList: Analyzer = (stdout, dr) => {
  const data = tryParseJson(stdout);
  if (!data) return null;
  const jobs: any[] = Array.isArray(data) ? data : data.jobs || data.items || [];
  let enabled = 0, disabled = 0;
  for (const j of jobs) {
    if (j.enabled === false || j.disabled) disabled++;
    else enabled++;
  }
  return {
    status: 'info',
    headline: `${jobs.length} ${dr?.raCronJobs || 'cron jobs'}, ${enabled} ${dr?.raEnabled || 'enabled'}`,
    metrics: [
      { label: dr?.raEnabled || 'Enabled', value: enabled, status: 'ok' },
      { label: dr?.raDisabled || 'Disabled', value: disabled, status: 'neutral' },
    ],
  };
};

// ---------- nodes-list (new) ----------
const analyzeNodesList: Analyzer = (stdout, dr) => {
  const data = tryParseJson(stdout);
  if (!data) return null;
  const nodes: any[] = Array.isArray(data) ? data : data.nodes || [];
  let online = 0, offline = 0;
  for (const n of nodes) {
    const sec = n.lastInputSeconds;
    if (sec != null && sec < 300) online++;
    else offline++;
  }
  return {
    status: offline > 0 && online === 0 ? 'warn' : 'ok',
    headline: `${nodes.length} ${dr?.raNodes || 'nodes'}, ${online} ${dr?.raOnline || 'online'}`,
    metrics: [
      { label: dr?.raOnline || 'Online', value: online, status: 'ok' },
      { label: dr?.raOffline2 || 'Offline', value: offline, status: offline > 0 ? 'warn' : 'neutral' },
    ],
  };
};

// ---------- agents-list (new) ----------
const analyzeAgentsList: Analyzer = (stdout, dr) => {
  const data = tryParseJson(stdout);
  if (!data) return null;
  const agents: any[] = Array.isArray(data) ? data : data.agents || [];
  return {
    status: 'info',
    headline: `${agents.length} ${dr?.raAgents || 'agents configured'}`,
    metrics: [{ label: dr?.raAgents || 'Agents', value: agents.length, status: 'neutral' }],
    findings: agents.slice(0, 8).map((a: any) => ({ status: 'info' as const, title: a.name || a.id || '?', detail: a.model || '' })),
  };
};

// ---------- sandbox-status (new) ----------
const analyzeSandboxStatus: Analyzer = (stdout, dr) => {
  const data = tryParseJson(stdout);
  if (!data) return null;
  const available = data.available || data.enabled || data.docker?.available || false;
  return {
    status: available ? 'ok' : 'info',
    headline: available ? (dr?.raSandboxAvailable || 'Docker sandbox available') : (dr?.raSandboxUnavailable || 'Docker sandbox not available'),
    metrics: [{ label: dr?.raStatus || 'Status', value: available ? (dr?.raAvailable || 'Available') : (dr?.raUnavailable || 'Unavailable'), status: available ? 'ok' : 'warn' }],
  };
};

// ---------- sessions-cleanup (new) ----------
const analyzeSessionsCleanup: Analyzer = (stdout, dr) => {
  const data = tryParseJson(stdout);
  if (!data) return null;
  const actions: any[] = data.actions || data.items || [];
  const pruned = actions.filter((a: any) => a.action === 'prune' || a.type === 'prune').length;
  const rotated = actions.filter((a: any) => a.action === 'rotate' || a.type === 'rotate').length;
  return {
    status: actions.length > 0 ? 'info' : 'ok',
    headline: actions.length > 0 ? `${actions.length} ${dr?.raCleanupActions || 'cleanup actions pending'}` : (dr?.raNoCleanup || 'No cleanup needed'),
    metrics: [
      { label: dr?.raPrune || 'Prune', value: pruned, status: 'neutral' },
      { label: dr?.raRotate || 'Rotate', value: rotated, status: 'neutral' },
    ],
  };
};

// ---------- doctor (non-json) ----------
const analyzeDoctor: Analyzer = (stdout, dr) => {
  if (!stdout) return null;
  const lines = stdout.split('\n');
  let pass = 0, fail = 0, warn = 0;
  for (const line of lines) {
    if (line.includes('✓') || line.includes('[PASS]') || line.includes('✔')) pass++;
    if (line.includes('✗') || line.includes('[FAIL]') || line.includes('✘')) fail++;
    if (line.includes('⚠') || line.includes('[WARN]')) warn++;
  }
  if (pass === 0 && fail === 0 && warn === 0) return null;
  return {
    status: statusOf(pass, warn, fail),
    headline: `${pass} ${dr?.raPassed || 'passed'}, ${fail} ${dr?.raFailed || 'failed'}, ${warn} ${dr?.raWarnings || 'warnings'}`,
    metrics: [
      { label: dr?.raPassed || 'Passed', value: pass, status: 'ok' },
      { label: dr?.raFailed || 'Failed', value: fail, status: fail > 0 ? 'error' : 'neutral' },
      { label: dr?.raWarnings || 'Warnings', value: warn, status: warn > 0 ? 'warn' : 'neutral' },
    ],
  };
};

// ---------- registry ----------
const analyzerRegistry: Record<string, Analyzer> = {
  'models-status': analyzeModelsStatus,
  'models-probe': analyzeModelsProbe,
  'models-list': analyzeModelsList,
  'models-aliases': analyzeModelsAliases,
  'models-fallbacks': analyzeModelsFallbacks,
  'channels-status': analyzeChannelsStatus,
  'channels-probe': analyzeChannelsProbe,
  'channels-capabilities': analyzeChannelsCaps,
  'channels-list': analyzeChannelsList,
  'gateway-logs': analyzeGatewayLogs,
  'config-get': analyzeConfigGet,
  'version': analyzeVersion,
  'skills-list': analyzeSkillsList,
  'skills-check': analyzeSkillsCheck,
  'plugins-list': analyzePluginsList,
  'hooks-list': analyzeHooksList,
  'security-audit': analyzeSecurityAudit,
  'secrets-audit': analyzeSecretsAudit,
  'update-status': analyzeUpdateStatus,
  'system-presence': analyzeSystemPresence,
  'doctor': analyzeDoctor,
  // new commands
  'status': analyzeStatus,
  'health': analyzeHealth,
  'sessions': analyzeSessions,
  'cron-list': analyzeCronList,
  'nodes-list': analyzeNodesList,
  'agents-list': analyzeAgentsList,
  'sandbox-status': analyzeSandboxStatus,
  'sessions-cleanup': analyzeSessionsCleanup,
};

export function analyzeCommandResult(commandId: string, stdout: string, dr: any): AnalyzedResult | null {
  const analyzer = analyzerRegistry[commandId];
  if (!analyzer) return null;
  try {
    return analyzer(stdout, dr);
  } catch {
    return null;
  }
}

// Try to match a command ID from args for custom commands
export function guessCommandId(args: string[]): string | null {
  if (!args.length) return null;
  const joined = args.join(' ');
  if (joined.includes('--version')) return 'version';
  if (joined.startsWith('doctor')) return 'doctor';
  if (joined.startsWith('models status') || joined.startsWith('models status')) {
    return joined.includes('--probe') ? 'models-probe' : 'models-status';
  }
  if (joined.startsWith('models list')) return 'models-list';
  if (joined.startsWith('models aliases')) return 'models-aliases';
  if (joined.startsWith('models fallbacks')) return 'models-fallbacks';
  if (joined.startsWith('channels status')) {
    return joined.includes('--probe') ? 'channels-probe' : 'channels-status';
  }
  if (joined.startsWith('channels capabilities')) return 'channels-capabilities';
  if (joined.startsWith('channels list')) return 'channels-list';
  if (joined.startsWith('logs')) return 'gateway-logs';
  if (joined.startsWith('config get')) return 'config-get';
  if (joined.startsWith('skills list')) return 'skills-list';
  if (joined.startsWith('skills check')) return 'skills-check';
  if (joined.startsWith('plugins list')) return 'plugins-list';
  if (joined.startsWith('hooks list')) return 'hooks-list';
  if (joined.startsWith('security audit')) return 'security-audit';
  if (joined.startsWith('secrets audit')) return 'secrets-audit';
  if (joined.startsWith('update status')) return 'update-status';
  if (joined.startsWith('system presence')) return 'system-presence';
  if (joined === 'status') return 'status';
  if (joined === 'health') return 'health';
  if (joined.startsWith('sessions cleanup')) return 'sessions-cleanup';
  if (joined.startsWith('sessions')) return 'sessions';
  if (joined.startsWith('cron list')) return 'cron-list';
  if (joined.startsWith('nodes list') || joined.startsWith('node list')) return 'nodes-list';
  if (joined.startsWith('agents list')) return 'agents-list';
  if (joined.startsWith('sandbox status')) return 'sandbox-status';
  return null;
}
