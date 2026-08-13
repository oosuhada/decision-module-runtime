import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRemoteProvider, deterministicProvider } from './provider';

describe('agent provider cancellation and timeout', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('cancels deterministic planning through AbortSignal', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(deterministicProvider.plan('cancel me', controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('aborts a remote provider that exceeds its timeout', async () => {
    vi.stubGlobal('fetch', vi.fn((_url: string, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
    })));
    const provider = createRemoteProvider({ endpoint: '/provider', timeoutMs: 5 });
    await expect(provider.plan('timeout')).rejects.toMatchObject({ name: 'TimeoutError' });
  });
});
