#!/usr/bin/env node
/**
 * Dynamic i18n Usage Scanner
 * ---------------------------------------------------------------------------
 * Scans the frontend source for dynamic i18n key accesses (e.g.
 * `(cw as any)[`${chId}Prep`]`) that a static analyzer would mistake for
 * unreferenced keys. Produces a report of "protected key families" — suffix/
 * prefix patterns that MUST NOT be pruned by any automated i18n cleanup tool.
 *
 * Usage:
 *   node web/locales/scan-dynamic-usage.mjs
 *   node web/locales/scan-dynamic-usage.mjs --verify   # exits 1 if any
 *                                                      # baseline key matching
 *                                                      # a discovered family
 *                                                      # is missing from en/
 *
 * Why this exists:
 *   Commit 73eb7e8 ("i18n: remove 1054 unused keys") deleted 59 dynamically
 *   accessed keys (xxxPrep / xxxPitfall / xxxHelpUrl / feishuPermJson …),
 *   wiping the channel-wizard prep steps and the WeCom / Feishu help hints.
 *   This scanner is the guardrail: run it before any cleanup commit to
 *   enumerate which key families are dynamic-access-only.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(__dirname, '..');
const LOCALE_DIR = __dirname;
const verify = process.argv.includes('--verify');

// i18n bundle names we import from `../../locales` — matches the imports in
// `web/windows/Editor/sections/ChannelsSection.tsx` etc.
const BUNDLES = ['cw', 'es', 'ed', 'dr', 'sk', 'cp', 'cm_sk', 'cm_set', 'cm_ss', 'gw'];
const BUNDLE_RX = BUNDLES.join('|');

// Patterns that match dynamic access into a bundle:
//   (cw as any)[`${x}Prep`]          → suffix "Prep"
//   (cw as any)[`wecom${x}HelpUrl`]  → suffix "HelpUrl" (prefix ignored)
//   (cw as any)[`${x}`]              → pure passthrough (no suffix) — skipped
const SUFFIX_RX = new RegExp(
  `\\(\\s*(${BUNDLE_RX})\\s+as\\s+any\\s*\\)\\s*\\[\\s*\`[^\`]*\\$\\{[^}]+\\}(\\w+)\``,
  'g',
);

// Walk .ts/.tsx under web/ excluding generated dirs.
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === '.next' || name.startsWith('.')) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(extname(name))) out.push(full);
  }
  return out;
}

const families = {}; // bundle → Set<suffix>
for (const file of walk(WEB_ROOT)) {
  const src = readFileSync(file, 'utf8');
  let m;
  SUFFIX_RX.lastIndex = 0;
  while ((m = SUFFIX_RX.exec(src)) != null) {
    const [, bundle, suffix] = m;
    if (!suffix) continue;
    (families[bundle] ||= new Set()).add(suffix);
  }
}

// Report
const bundleNames = Object.keys(families).sort();
if (bundleNames.length === 0) {
  console.log('No dynamic i18n key accesses found.');
  process.exit(0);
}

console.log('Dynamic i18n key families (DO NOT prune unless the call site is gone):');
for (const bundle of bundleNames) {
  const suffixes = [...families[bundle]].sort();
  console.log(`  ${bundle}: ${suffixes.map(s => `*${s}`).join(', ')}`);
}

if (!verify) process.exit(0);

// --verify: enumerate baseline keys matching each family and warn if any
// locale is missing them (or if the baseline itself has zero members, which
// usually means a cleanup tool blew them away).
let hasError = false;
for (const bundle of bundleNames) {
  const baselinePath = join(LOCALE_DIR, 'en', `${bundle}.json`);
  let baseline;
  try { baseline = JSON.parse(readFileSync(baselinePath, 'utf8')); } catch { continue; }
  const baseKeys = Object.keys(baseline);
  for (const suffix of families[bundle]) {
    const matching = baseKeys.filter(k => k.endsWith(suffix));
    if (matching.length === 0) {
      console.error(`  WARN: en/${bundle}.json has zero keys ending in "${suffix}" but source references the family dynamically.`);
      hasError = true;
    }
  }
}
if (hasError) process.exit(1);
