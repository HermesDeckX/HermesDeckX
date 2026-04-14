// ---------------------------------------------------------------------------
// Typed localStorage cache utilities.
//
// Replaces 13+ scattered try/catch JSON.parse/stringify localStorage patterns.
// ---------------------------------------------------------------------------

/**
 * readStorage — safely read and parse a JSON value from localStorage.
 * Returns `null` if key is missing, corrupted, or parsing fails.
 */
export function readStorage<T = unknown>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}

/**
 * writeStorage — safely JSON-stringify and write a value to localStorage.
 * Silently ignores quota or serialization errors.
 */
export function writeStorage<T = unknown>(key: string, value: T): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

/**
 * removeStorage — safely remove a key from localStorage.
 */
export function removeStorage(key: string): void {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

/**
 * readSessionStorage — safely read from sessionStorage.
 */
export function readSessionStorage<T = unknown>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}

/**
 * writeSessionStorage — safely write to sessionStorage.
 */
export function writeSessionStorage<T = unknown>(key: string, value: T): void {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}
