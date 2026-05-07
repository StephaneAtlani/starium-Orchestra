import { describe, expect, it, vi } from 'vitest';
import {
  getClientEffectiveRights,
  getPlatformEffectiveRights,
  type AuthFetch,
} from './access-diagnostics';

function okResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('access-diagnostics api', () => {
  it('appelle la route client sans clientId libre', async () => {
    const authFetch = vi.fn<AuthFetch>().mockResolvedValue(
      okResponse({
        licenseCheck: { status: 'pass', reasonCode: null, message: 'ok' },
        subscriptionCheck: { status: 'pass', reasonCode: null, message: 'ok' },
        moduleActivationCheck: { status: 'pass', reasonCode: null, message: 'ok' },
        moduleVisibilityCheck: { status: 'pass', reasonCode: null, message: 'ok' },
        rbacCheck: { status: 'pass', reasonCode: null, message: 'ok' },
        aclCheck: { status: 'pass', reasonCode: null, message: 'ok' },
        finalDecision: 'allowed',
        denialReasons: [],
        computedAt: new Date().toISOString(),
      }),
    );

    await getClientEffectiveRights(authFetch, {
      userId: 'u1',
      resourceType: 'PROJECT',
      resourceId: 'p1',
      operation: 'read',
    });

    const calledWith = String(authFetch.mock.calls[0]?.[0] ?? '');
    expect(calledWith.startsWith('/api/access-diagnostics/effective-rights?')).toBe(
      true,
    );
    expect(calledWith.includes('clientId=')).toBe(false);
  });

  it('appelle la route plateforme avec clientId de route', async () => {
    const authFetch = vi.fn<AuthFetch>().mockResolvedValue(
      okResponse({
        licenseCheck: { status: 'pass', reasonCode: null, message: 'ok' },
        subscriptionCheck: { status: 'pass', reasonCode: null, message: 'ok' },
        moduleActivationCheck: { status: 'pass', reasonCode: null, message: 'ok' },
        moduleVisibilityCheck: { status: 'pass', reasonCode: null, message: 'ok' },
        rbacCheck: { status: 'pass', reasonCode: null, message: 'ok' },
        aclCheck: { status: 'pass', reasonCode: null, message: 'ok' },
        finalDecision: 'allowed',
        denialReasons: [],
        computedAt: new Date().toISOString(),
      }),
    );

    await getPlatformEffectiveRights(authFetch, 'cl-42', {
      userId: 'u1',
      resourceType: 'PROJECT',
      resourceId: 'p1',
      operation: 'read',
    });

    expect(String(authFetch.mock.calls[0]?.[0])).toContain(
      '/api/platform/clients/cl-42/access-diagnostics/effective-rights?',
    );
  });
});
