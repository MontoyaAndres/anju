export const sleep = (ms: number): Promise<void> =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

export const isRateLimitError = (err: unknown): boolean => {
  const msg = String((err as { message?: unknown })?.message ?? err);
  return /\b429\b|quota|RESOURCE_EXHAUSTED|rate.?limit/i.test(msg);
};

export interface RateLimitRetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export const withRateLimitRetry = async <T>(
  fn: () => Promise<T>,
  options: RateLimitRetryOptions = {}
): Promise<T> => {
  const { maxAttempts = 5, baseDelayMs = 500, maxDelayMs = 10_000 } = options;
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      if (attempt >= maxAttempts || !isRateLimitError(err)) throw err;
      const delay = Math.min(2 ** attempt * baseDelayMs, maxDelayMs);
      await sleep(delay);
    }
  }
};
