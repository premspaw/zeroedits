export interface ModelRetryOptions {
  /** Total attempts including the first try. Defaults to 2. */
  attempts?: number;
  /** Wait between attempts in ms. Defaults to 1500. */
  delayMs?: number;
  /** Called after each failed attempt (test seam for logging). */
  onAttemptError?: (err: unknown, attempt: number, maxAttempts: number) => void;
  /** Wait primitive (injectable so tests run instantly). */
  sleep?: (ms: number) => Promise<void>;
}

/**
 * Run an async model call with automatic retries for transient failures
 * (unfinished streams, dropped connections). Resolves with the first
 * success, or throws the LAST error after all attempts are exhausted.
 */
export async function withModelRetry<T>(
  fn: () => Promise<T>,
  options: ModelRetryOptions = {}
): Promise<T> {
  const maxAttempts = Math.max(1, Math.floor(options.attempts ?? 2));
  const delayMs = Math.max(0, options.delayMs ?? 1500);
  const sleep = options.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));

  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      options.onAttemptError?.(err, attempt, maxAttempts);
      if (attempt < maxAttempts && delayMs > 0) await sleep(delayMs);
    }
  }
  throw lastErr;
}
