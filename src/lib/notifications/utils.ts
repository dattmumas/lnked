

/**
 * Shared utilities for the notifications module.
 * ------------------------------------------------
 * Keep **all** generic helpers here so the main service file
 * stays focused on business logic and passes ESLint’s strict rules.
 */

/* ------------------------------------------------------------------ */
/*  Date / time                                                       */
/* ------------------------------------------------------------------ */

/** Current timestamp in ISO‑8601 format (UTC). */
export const nowIso = (): string => new Date().toISOString();

/* ------------------------------------------------------------------ */
/*  Type‑guards                                                       */
/* ------------------------------------------------------------------ */

/** v is a non‑empty, trimmed string. */
export const isNonEmptyString = (v: unknown): v is string =>
  typeof v === 'string' && v.trim() !== '';

/** v is neither null nor undefined. */
export const isDefined = <T>(v: T | null | undefined): v is T =>
  v !== null && v !== undefined;

/* ------------------------------------------------------------------ */
/*  Supabase helper                                                   */
/* ------------------------------------------------------------------ */

/**
 * Run a Supabase query and throw a descriptive Error on failure.
 *
 * @param promise  The Supabase query (resolves to `{ data, error }`).
 * @param ctx      Context string to prefix any thrown message.
 *
 * @example
 * const notifications = await run(
 *   supabase.from('notifications').select('*'),
 *   'fetch notifications'
 * );
 */
export async function run<T>(
  promise: Promise<{ data: T; error: unknown }>,
  ctx: string
): Promise<T> {
  const { data, error } = await promise;

  if (isDefined(error)) {
    const message =
      typeof (error as { message?: unknown }).message === 'string'
        ? (error as { message: string }).message
        : String(error);
    throw new Error(`${ctx}: ${message}`);
  }

  return data;
}