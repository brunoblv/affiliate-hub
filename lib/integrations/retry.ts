export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  onRetry?: (attempt: number, error: unknown) => void;
}

/**
 * Executa `fn` com backoff exponencial, até `maxAttempts` tentativas.
 * Lança o último erro se todas as tentativas falharem (sem loop infinito).
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 500, onRetry } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) break;

      onRetry?.(attempt, error);
      const delay = baseDelayMs * 2 ** (attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
