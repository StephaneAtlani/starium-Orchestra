import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loginApi } from './auth';

describe('loginApi', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: 'AUTHENTICATED',
              accessToken: 'a',
              refreshToken: 'r',
            }),
        }),
      ) as unknown as typeof fetch,
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns MFA_REQUIRED when API says so', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          status: 'MFA_REQUIRED',
          challengeId: 'ch-1',
          expiresAt: '2030-01-01T00:00:00.000Z',
        }),
    });
    const r = await loginApi('a@b.c', 'pw');
    expect(r).toEqual({
      status: 'MFA_REQUIRED',
      challengeId: 'ch-1',
      expiresAt: '2030-01-01T00:00:00.000Z',
    });
  });
});
