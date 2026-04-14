/**
 * Look up a translated security audit title/remediation by checkId.
 * For dynamic checkIds like "channels.telegram.dm.open", tries exact match first,
 * then strips the provider segment to match generic keys like "sa.channels.dm.open".
 * Returns the original fallback text if no translation is found.
 *
 * @param translations - The dr.json translation object for the current language
 * @param checkId - The security audit item id (e.g. "security.fs.state_dir.perms_readable")
 * @param prefix - 'sa' for title translations, 'saRem' for remediation translations
 * @param fallback - The original English text to use if no translation is found
 */
export function saTranslate(translations: Record<string, string>, checkId: string, prefix: 'sa' | 'saRem', fallback: string): string {
  // The item id from backend is "security.{checkId}", strip that prefix
  const rawId = checkId.startsWith('security.') ? checkId.slice(9) : checkId;

  // 1) Exact match: sa.{rawId}
  const exactKey = `${prefix}.${rawId}`;
  if (translations[exactKey]) return translations[exactKey];

  // 2) For dynamic channel checkIds like "channels.telegram.dm.open"
  //    → try "sa.channels.dm.open" (strip provider segment)
  const channelMatch = rawId.match(/^channels\.([^.]+)\.(.+)$/);
  if (channelMatch) {
    const rest = channelMatch[2];
    const genericKey = `${prefix}.channels.${rest}`;
    if (translations[genericKey]) return translations[genericKey];
  }

  // 3) For dynamic tool checkIds like "tools.elevated.allowFrom.openai.wildcard"
  //    → try "sa.tools.elevated.allowFrom.wildcard"
  const toolMatch = rawId.match(/^(tools\.elevated\.allowFrom)\.[^.]+\.(.+)$/);
  if (toolMatch) {
    const genericKey = `${prefix}.${toolMatch[1]}.${toolMatch[2]}`;
    if (translations[genericKey]) return translations[genericKey];
  }

  return fallback;
}

/**
 * Translate a dashboard security alert title by its alert ID.
 * Dashboard alert IDs for security audit items have the format "sec:{checkId}".
 */
export function saTranslateAlertTitle(translations: Record<string, string>, alertId: string, fallbackTitle: string): string {
  if (!alertId.startsWith('sec:')) return fallbackTitle;
  const checkId = alertId.slice(4); // strip "sec:"
  return saTranslate(translations, checkId, 'sa', fallbackTitle);
}
