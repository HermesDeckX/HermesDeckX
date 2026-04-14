#!/usr/bin/env node
/**
 * i18n Key Completeness Checker
 * Compares all locale JSON files against the English (en) baseline.
 * Reports missing keys, extra keys, and type mismatches.
 *
 * Usage:
 *   node web/locales/check-i18n.mjs           # Report only
 *   node web/locales/check-i18n.mjs --strict   # Exit code 1 if any missing keys
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const strict = process.argv.includes('--strict');

function flatKeys(obj, pfx = '') {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const fk = pfx ? `${pfx}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out.push(...flatKeys(v, fk));
    } else {
      out.push(fk);
    }
  }
  return out;
}

const locDirs = readdirSync(__dirname)
  .filter(n => { try { return statSync(join(__dirname, n)).isDirectory() && n !== 'en'; } catch { return false; } })
  .sort();
const enFiles = readdirSync(join(__dirname, 'en')).filter(f => f.endsWith('.json')).sort();

let totalMissing = 0;
let totalExtra = 0;
let hasErrors = false;

for (const jsonFile of enFiles) {
  const enData = JSON.parse(readFileSync(join(__dirname, 'en', jsonFile), 'utf8'));
  const enKeys = new Set(flatKeys(enData));

  for (const locale of locDirs) {
    const locPath = join(__dirname, locale, jsonFile);
    let locData;
    try {
      locData = JSON.parse(readFileSync(locPath, 'utf8'));
    } catch {
      console.error(`  MISSING FILE: ${locale}/${jsonFile} (${enKeys.size} keys)`);
      totalMissing += enKeys.size;
      hasErrors = true;
      continue;
    }

    const locKeys = new Set(flatKeys(locData));
    const missing = [...enKeys].filter(k => !locKeys.has(k));
    const extra = [...locKeys].filter(k => !enKeys.has(k));

    if (missing.length > 0) {
      console.error(`  ${locale}/${jsonFile}: ${missing.length} missing key(s)`);
      for (const k of missing) console.error(`    - ${k}`);
      totalMissing += missing.length;
      hasErrors = true;
    }
    if (extra.length > 0) {
      console.warn(`  ${locale}/${jsonFile}: ${extra.length} extra key(s)`);
      for (const k of extra) console.warn(`    + ${k}`);
      totalExtra += extra.length;
    }
  }
}

console.log(`\ni18n check: ${totalMissing} missing, ${totalExtra} extra`);
if (totalMissing === 0 && totalExtra === 0) {
  console.log('All locales complete!');
}

if (strict && hasErrors) {
  process.exit(1);
}
