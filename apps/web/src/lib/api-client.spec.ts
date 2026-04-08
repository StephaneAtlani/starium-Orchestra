import { describe, it, expect } from 'vitest';
import { getXClientIdHeaderValue } from './api-client';

const clientId = 'client-abc';

describe('getXClientIdHeaderValue', () => {
  it('returns activeClientId for /api/roles with activeClientId', () => {
    expect(
      getXClientIdHeaderValue('/api/roles', { activeClientId: clientId }),
    ).toBe(clientId);
  });

  it('returns activeClientId for /api/roles?limit=20 with activeClientId', () => {
    expect(
      getXClientIdHeaderValue('/api/roles?limit=20', {
        activeClientId: clientId,
      }),
    ).toBe(clientId);
  });

  it('returns activeClientId for /api/users/123/roles with activeClientId', () => {
    expect(
      getXClientIdHeaderValue('/api/users/123/roles', {
        activeClientId: clientId,
      }),
    ).toBe(clientId);
  });

  it('returns null for /api/me', () => {
    expect(
      getXClientIdHeaderValue('/api/me', { activeClientId: clientId }),
    ).toBeNull();
  });

  it('returns null for /api/me/password (compte global)', () => {
    expect(
      getXClientIdHeaderValue('/api/me/password', {
        activeClientId: clientId,
      }),
    ).toBeNull();
  });

  it('returns null for /api/me/2fa/* (compte global)', () => {
    expect(
      getXClientIdHeaderValue('/api/me/2fa/enroll', {
        activeClientId: clientId,
      }),
    ).toBeNull();
  });

  it('returns null for /api/me/profile', () => {
    expect(
      getXClientIdHeaderValue('/api/me/profile', {
        activeClientId: clientId,
      }),
    ).toBeNull();
  });

  it('returns null for /api/me/avatar', () => {
    expect(
      getXClientIdHeaderValue('/api/me/avatar', {
        activeClientId: clientId,
      }),
    ).toBeNull();
  });

  it('returns null for /api/roles when activeClientId is absent', () => {
    expect(getXClientIdHeaderValue('/api/roles', {})).toBeNull();
    expect(
      getXClientIdHeaderValue('/api/roles', { activeClientId: null }),
    ).toBeNull();
    expect(
      getXClientIdHeaderValue('/api/roles', { activeClientId: '' }),
    ).toBeNull();
  });

  it('returns null for absolute URL to other origin when apiBaseUrl is set', () => {
    const base = 'https://api.example.com';
    expect(
      getXClientIdHeaderValue('https://evil.com/api/roles', {
        activeClientId: clientId,
        apiBaseUrl: base,
      }),
    ).toBeNull();
  });

  it('returns null for absolute URL when apiBaseUrl is absent', () => {
    expect(
      getXClientIdHeaderValue('https://api.example.com/api/roles', {
        activeClientId: clientId,
      }),
    ).toBeNull();
  });

  it('returns activeClientId for absolute URL matching apiBaseUrl', () => {
    const base = 'https://api.example.com';
    expect(
      getXClientIdHeaderValue(`${base}/api/roles`, {
        activeClientId: clientId,
        apiBaseUrl: base,
      }),
    ).toBe(clientId);
  });

  it('returns null for path not starting with /api/', () => {
    expect(
      getXClientIdHeaderValue('/other/path', { activeClientId: clientId }),
    ).toBeNull();
  });

  it('returns null for plateforme /api/clients (sans envoyer X-Client-Id)', () => {
    expect(
      getXClientIdHeaderValue('/api/clients', { activeClientId: clientId }),
    ).toBeNull();
  });

  it('returns null pour /api/clients/:id (admin plateforme)', () => {
    expect(
      getXClientIdHeaderValue('/api/clients/550e8400-e29b-41d4-a716-446655440000', {
        activeClientId: clientId,
      }),
    ).toBeNull();
  });

  it('returns activeClientId pour /api/clients/active/* (ActiveClientGuard)', () => {
    expect(
      getXClientIdHeaderValue('/api/clients/active/microsoft-oauth', {
        activeClientId: clientId,
      }),
    ).toBe(clientId);
    expect(
      getXClientIdHeaderValue('/api/clients/active/tax-settings', {
        activeClientId: clientId,
      }),
    ).toBe(clientId);
    expect(
      getXClientIdHeaderValue('/api/clients/active/budget-workflow-settings', {
        activeClientId: clientId,
      }),
    ).toBe(clientId);
  });
});
