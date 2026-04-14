import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { isKeyCovered, getUnmappedKeys } from '../windows/Editor/sectionRegistry';

// Load config snapshot to get all known config keys
const SNAPSHOT_DIR = path.resolve(__dirname, '../../docs/config-snapshots');

function getLatestSnapshot(): { version: string; labels: Record<string, string> } | null {
  if (!fs.existsSync(SNAPSHOT_DIR)) return null;
  const files = fs.readdirSync(SNAPSHOT_DIR).filter(f => f.startsWith('v') && f.endsWith('.json'));
  if (files.length === 0) return null;
  files.sort();
  const latest = files[files.length - 1];
  const data = JSON.parse(fs.readFileSync(path.join(SNAPSHOT_DIR, latest), 'utf8'));
  return { version: latest.replace('.json', ''), labels: data.labels || {} };
}

describe('sectionRegistry', () => {
  describe('isKeyCovered', () => {
    it('covers exact registered keys', () => {
      expect(isKeyCovered('gateway.port')).toBe(true);
      expect(isKeyCovered('gateway.mode')).toBe(true);
      expect(isKeyCovered('logging.level')).toBe(true);
    });

    it('covers wildcard subtrees', () => {
      expect(isKeyCovered('models.providers.openai')).toBe(true);
      expect(isKeyCovered('models.providers.openai.apiKey')).toBe(true);
      expect(isKeyCovered('models.providers.openai.request.auth.mode')).toBe(true);
      expect(isKeyCovered('agents.defaults.skills')).toBe(true);
      expect(isKeyCovered('tools.media.audio.request.proxy.url')).toBe(true);
      expect(isKeyCovered('channels.defaults.contextVisibility')).toBe(true);
    });

    it('reports uncovered keys', () => {
      expect(isKeyCovered('totallyFakeKey')).toBe(false);
      expect(isKeyCovered('nonexistent.deep.path')).toBe(false);
    });

    it('covers top-level wildcard roots', () => {
      expect(isKeyCovered('models')).toBe(true);
      expect(isKeyCovered('plugins')).toBe(true);
      expect(isKeyCovered('skills')).toBe(true);
      expect(isKeyCovered('hooks')).toBe(true);
    });
  });

  describe('config snapshot coverage', () => {
    const snapshot = getLatestSnapshot();

    it('latest config snapshot exists', () => {
      expect(snapshot).not.toBeNull();
    });

    if (snapshot) {
      it(`all keys in ${snapshot.version} are covered by sectionRegistry`, () => {
        const allKeys = Object.keys(snapshot.labels);
        const unmapped = getUnmappedKeys(allKeys);

        // Filter out known acceptable unmapped keys
        const acceptable = new Set([
          'requests',       // internal proxy shorthand, not a public config field
        ]);
        const reallyUnmapped = unmapped.filter(k => !acceptable.has(k));

        if (reallyUnmapped.length > 0) {
          console.warn(`\n⚠️  ${reallyUnmapped.length} unmapped config keys:\n  ${reallyUnmapped.join('\n  ')}\n`);
        }
        expect(reallyUnmapped, `Unmapped keys: ${reallyUnmapped.join(', ')}`).toEqual([]);
      });
    }
  });
});
