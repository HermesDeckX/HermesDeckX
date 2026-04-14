// ---------------------------------------------------------------------------
// settle — Promise error-swallowing helpers.
//
// Replaces 3+ duplicate settle() implementations in Dashboard, Gateway,
// and UsageWizard.
// ---------------------------------------------------------------------------

/** Result type for settleTyped — includes ok flag for type narrowing. */
export type SettleResult<T> =
  | { ok: true; data: T }
  | { ok: false; data: null };

/**
 * settleTyped — wraps a promise so it never rejects.
 * Returns `{ ok: true, data }` on success, `{ ok: false, data: null }` on error.
 */
export async function settleTyped<T>(p: Promise<T>): Promise<SettleResult<T>> {
  try { return { ok: true, data: await p }; }
  catch { return { ok: false, data: null }; }
}

/**
 * settle — simpler variant that returns `null` on error.
 * Matches the Gateway/Debug panel pattern.
 */
export async function settle<T>(p: Promise<T>): Promise<T | null> {
  try { return await p; }
  catch { return null; }
}
