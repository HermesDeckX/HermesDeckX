/**
 * Parse event title/summary that may contain embedded JSON fragments.
 *
 * Examples of raw input:
 *   `{"subsystem":"diagnostic"} — {"subsystem":"diagnostic"}: lane task error: lane=session:agent:main:main durationMs=51 error=...`
 *   `Gateway error [{"subsystem":"telegram/network"}]: fetch fallback: forcing autoSelectFamily=false`
 *   `Gateway warning [telegram/network]: something happened`
 *
 * Output: clean human-readable text with JSON objects replaced by their key values.
 */
export function parseEventTitle(raw: string | undefined | null): string {
  if (!raw) return '';

  let text = raw;

  // Replace JSON object literals like {"subsystem":"diagnostic"} with the extracted value
  text = text.replace(/\{[^{}]*\}/g, (match) => {
    try {
      const obj = JSON.parse(match);
      if (typeof obj === 'object' && obj !== null) {
        // Extract the most meaningful value from the object
        for (const key of ['subsystem', 'module', 'component', 'name', 'message', 'error', 'reason']) {
          if (typeof obj[key] === 'string' && obj[key]) return obj[key];
        }
        // Fallback: join all string values
        const vals = Object.values(obj).filter(v => typeof v === 'string' && v) as string[];
        return vals.length > 0 ? vals.join('/') : match;
      }
    } catch {
      // Not valid JSON, leave as-is
    }
    return match;
  });

  // Clean up "Gateway error [component]: msg" → "component — msg"
  text = text.replace(/^Gateway\s+(error|warning)\s+\[([^\]]+)\]\s*:\s*/i, '$2 — ');

  // Clean up duplicate component names separated by " — " (e.g. "diagnostic — diagnostic: ...")
  text = text.replace(/^([^—\n]+?)\s*—\s*\1\s*:\s*/, '$1 — ');
  text = text.replace(/^([^—\n]+?)\s*—\s*\1\s*—\s*/, '$1 — ');

  // Trim excessive whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}
