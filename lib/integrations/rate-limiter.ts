/**
 * RateLimiter simples baseado em janela fixa, com uma instância por provider.
 * Cada integração (Shopee, TikTok, Meta, ...) deve ter seus próprios limites,
 * já que as APIs não compartilham a mesma política de requisições.
 */
export class RateLimiter {
  private timestamps: number[] = [];

  constructor(
    private readonly provider: string,
    private readonly maxRequests: number,
    private readonly windowMs: number,
  ) {}

  private prune(now: number) {
    const windowStart = now - this.windowMs;
    this.timestamps = this.timestamps.filter((t) => t > windowStart);
  }

  canProceed(): boolean {
    const now = Date.now();
    this.prune(now);
    return this.timestamps.length < this.maxRequests;
  }

  private msUntilNextSlot(now: number): number {
    if (this.timestamps.length === 0) return 0;
    const oldest = this.timestamps[0];
    return Math.max(0, oldest + this.windowMs - now);
  }

  async acquire(): Promise<void> {
    while (!this.canProceed()) {
      const wait = this.msUntilNextSlot(Date.now());
      await new Promise((resolve) => setTimeout(resolve, wait || 50));
    }
    this.timestamps.push(Date.now());
  }

  get name() {
    return this.provider;
  }
}

const registry = new Map<string, RateLimiter>();

/** Obtém (ou cria) o RateLimiter singleton de um provider. */
export function getRateLimiter(provider: string, maxRequests: number, windowMs: number): RateLimiter {
  const existing = registry.get(provider);
  if (existing) return existing;

  const limiter = new RateLimiter(provider, maxRequests, windowMs);
  registry.set(provider, limiter);
  return limiter;
}
