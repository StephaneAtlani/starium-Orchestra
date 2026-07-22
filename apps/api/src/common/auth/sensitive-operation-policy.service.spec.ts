import { ForbiddenException } from '@nestjs/common';
import { SensitiveOperationPolicyService } from './sensitive-operation-policy.service';

describe('SensitiveOperationPolicyService', () => {
  const mfa = { isMfaTotpEnabled: jest.fn() };
  const prisma = { securityLog: { findFirst: jest.fn() } };
  const service = new SensitiveOperationPolicyService(prisma as any, mfa as any);

  beforeEach(() => jest.clearAllMocks());

  it('refuse si MFA non activé', async () => {
    mfa.isMfaTotpEnabled.mockResolvedValue(false);
    await expect(service.assertMfaEnabled('u1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('refuse si pas de connexion récente', async () => {
    mfa.isMfaTotpEnabled.mockResolvedValue(true);
    prisma.securityLog.findFirst.mockResolvedValue(null);
    await expect(service.assertSensitiveAdminOperation('u1')).rejects.toMatchObject({
      response: { code: 'REAUTH_REQUIRED' },
    });
  });

  it('autorise si MFA + connexion récente', async () => {
    mfa.isMfaTotpEnabled.mockResolvedValue(true);
    prisma.securityLog.findFirst.mockResolvedValue({ id: 'log-1' });
    await expect(service.assertSensitiveAdminOperation('u1')).resolves.toBeUndefined();
  });
});
