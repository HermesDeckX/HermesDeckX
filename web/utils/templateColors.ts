/**
 * Convert Tailwind color classes from template JSON to inline CSS styles.
 * Tailwind 4.x JIT cannot scan runtime-loaded JSON templates, so dynamic
 * color classes like "from-cyan-500 to-blue-500" or "bg-blue-500" are never
 * compiled into the CSS output. This utility resolves them to inline styles.
 */

const TW_COLORS: Record<string, string> = {
  // -400 variants
  'slate-400': '#94a3b8',
  'red-400': '#f87171',
  'orange-400': '#fb923c',
  'amber-400': '#fbbf24',
  'yellow-400': '#facc15',
  'lime-400': '#a3e635',
  'green-400': '#4ade80',
  'emerald-400': '#34d399',
  'teal-400': '#2dd4bf',
  'cyan-400': '#22d3ee',
  'sky-400': '#38bdf8',
  'blue-400': '#60a5fa',
  'indigo-400': '#818cf8',
  'violet-400': '#a78bfa',
  'purple-400': '#c084fc',
  'fuchsia-400': '#e879f9',
  'pink-400': '#f472b6',
  'rose-400': '#fb7185',
  // -500 variants (primary)
  'slate-500': '#64748b',
  'zinc-500': '#71717a',
  'zinc-600': '#52525b',
  'red-500': '#ef4444',
  'orange-500': '#f97316',
  'amber-500': '#f59e0b',
  'yellow-500': '#eab308',
  'lime-500': '#84cc16',
  'green-500': '#22c55e',
  'emerald-500': '#10b981',
  'teal-500': '#14b8a6',
  'cyan-500': '#06b6d4',
  'sky-500': '#0ea5e9',
  'blue-500': '#3b82f6',
  'indigo-500': '#6366f1',
  'violet-500': '#8b5cf6',
  'purple-500': '#a855f7',
  'fuchsia-500': '#d946ef',
  'pink-500': '#ec4899',
  'rose-500': '#f43f5e',
  // -600 variants
  'slate-600': '#475569',
  'red-600': '#dc2626',
  'orange-600': '#ea580c',
  'blue-600': '#2563eb',
  'indigo-600': '#4f46e5',
  'purple-600': '#9333ea',
  'pink-600': '#db2777',
};

const DEFAULT_GRADIENT = { from: '#a855f7', to: '#ec4899' }; // purple-500 → pink-500
const DEFAULT_SOLID = '#64748b'; // slate-500

/**
 * Parse a template color string into an inline CSS `background` value.
 *
 * Supported formats:
 *   "from-cyan-500 to-blue-500"   → linear-gradient
 *   "bg-blue-500"                 → solid color
 *   "bg-gradient-to-br from-..."  → linear-gradient (strip prefix)
 */
export function resolveTemplateColor(colorClass: string | undefined): React.CSSProperties {
  if (!colorClass) {
    return { background: `linear-gradient(135deg, ${DEFAULT_GRADIENT.from}, ${DEFAULT_GRADIENT.to})` };
  }

  const tokens = colorClass.trim().split(/\s+/);

  let from: string | null = null;
  let to: string | null = null;
  let solid: string | null = null;

  for (const t of tokens) {
    if (t.startsWith('from-')) {
      from = TW_COLORS[t.slice(5)] ?? null;
    } else if (t.startsWith('to-')) {
      to = TW_COLORS[t.slice(3)] ?? null;
    } else if (t.startsWith('bg-') && !t.startsWith('bg-gradient')) {
      solid = TW_COLORS[t.slice(3)] ?? null;
    }
  }

  if (from && to) {
    return { background: `linear-gradient(135deg, ${from}, ${to})` };
  }
  if (from) {
    return { background: from };
  }
  if (solid) {
    return { background: solid };
  }

  return { background: DEFAULT_SOLID };
}

/**
 * Resolve a template color string to a single hex color (for SVG fill etc.).
 * Returns the "from" color for gradients, or the solid color.
 */
export function resolveTemplateHex(colorClass: string | undefined): string {
  if (!colorClass) return DEFAULT_GRADIENT.from;

  const tokens = colorClass.trim().split(/\s+/);
  for (const t of tokens) {
    if (t.startsWith('from-')) {
      return TW_COLORS[t.slice(5)] ?? DEFAULT_GRADIENT.from;
    }
    if (t.startsWith('bg-') && !t.startsWith('bg-gradient')) {
      return TW_COLORS[t.slice(3)] ?? DEFAULT_SOLID;
    }
  }
  return DEFAULT_SOLID;
}
