import { describe, expect, it } from 'vitest';
import {
  linkPlatformUserErrorGuidance,
  linkPlatformUserErrorTitle,
  parseLinkPlatformUserError,
} from './link-platform-user-errors';

describe('link-platform-user-errors', () => {
  it('lit le code MFA_REQUIRED', () => {
    const err = Object.assign(new Error('MFA requis'), {
      code: 'MFA_REQUIRED',
      status: 403,
    });
    expect(parseLinkPlatformUserError(err)).toEqual({
      code: 'MFA_REQUIRED',
      message: 'MFA requis',
      status: 403,
    });
    expect(linkPlatformUserErrorTitle('MFA_REQUIRED')).toMatch(/deux facteurs/i);
    expect(linkPlatformUserErrorGuidance('MFA_REQUIRED')).toMatch(/Mon compte/i);
  });

  it('détecte REAUTH via message', () => {
    const err = new Error('Une connexion récente est requise. Reconnectez-vous.');
    expect(parseLinkPlatformUserError(err).code).toBe('REAUTH_REQUIRED');
  });
});
