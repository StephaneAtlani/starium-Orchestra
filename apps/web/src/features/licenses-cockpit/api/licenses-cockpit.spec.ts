import { describe, expect, it, vi } from 'vitest';
import { getPlatformClientUsers } from './licenses-cockpit';

describe('getPlatformClientUsers — RFC-ACL-010', () => {
  it('calls only the platform endpoint /api/platform/clients/:clientId/users', async () => {
    const authFetch = vi.fn(
      async () =>
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    await getPlatformClientUsers(authFetch, 'client-123');
    expect(authFetch).toHaveBeenCalledTimes(1);
    expect(authFetch).toHaveBeenCalledWith(
      '/api/platform/clients/client-123/users',
    );
  });

  it('encodes the clientId path component', async () => {
    const authFetch = vi.fn(
      async () =>
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    await getPlatformClientUsers(authFetch, 'with space');
    expect(authFetch).toHaveBeenCalledWith(
      '/api/platform/clients/with%20space/users',
    );
  });

  it('does not fall back to /api/users when platform endpoint fails', async () => {
    const authFetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ message: 'Forbidden' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    await expect(getPlatformClientUsers(authFetch, 'c1')).rejects.toThrow();
    expect(authFetch).toHaveBeenCalledTimes(1);
    expect(authFetch).toHaveBeenCalledWith('/api/platform/clients/c1/users');
  });
});
