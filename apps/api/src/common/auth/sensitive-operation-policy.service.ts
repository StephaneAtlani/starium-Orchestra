import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MfaService } from '../../modules/mfa/mfa.service';

export const MFA_REQUIRED_CODE = 'MFA_REQUIRED';
export const REAUTH_REQUIRED_CODE = 'REAUTH_REQUIRED';

const RECENT_AUTH_EVENTS = ['auth.login.success', 'auth.microsoft_sso.success'] as const;
const DEFAULT_REAUTH_MAX_AGE_MS = 10 * 60 * 1000;

@Injectable()
export class SensitiveOperationPolicyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mfa: MfaService,
  ) {}

  async assertMfaEnabled(userId: string): Promise<void> {
    const enabled = await this.mfa.isMfaTotpEnabled(userId);
    if (!enabled) {
      throw new ForbiddenException({
        code: MFA_REQUIRED_CODE,
        message:
          'L’authentification à deux facteurs (TOTP) doit être activée sur votre compte pour cette opération.',
      });
    }
  }

  async assertRecentAuthentication(
    userId: string,
    maxAgeMs: number = DEFAULT_REAUTH_MAX_AGE_MS,
  ): Promise<void> {
    const since = new Date(Date.now() - maxAgeMs);
    const recent = await this.prisma.securityLog.findFirst({
      where: {
        userId,
        success: true,
        event: { in: [...RECENT_AUTH_EVENTS] },
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (!recent) {
      throw new ForbiddenException({
        code: REAUTH_REQUIRED_CODE,
        message:
          'Une connexion récente (moins de 10 minutes) est requise. Reconnectez-vous puis réessayez.',
      });
    }
  }

  async assertSensitiveAdminOperation(userId: string): Promise<void> {
    await this.assertMfaEnabled(userId);
    await this.assertRecentAuthentication(userId);
  }
}
