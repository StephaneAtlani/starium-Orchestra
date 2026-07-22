import { ConflictException, Injectable } from '@nestjs/common';
import { EmailAddressRegistryType, Prisma } from '@prisma/client';
import { acquireEmailAdvisoryLocks } from './email-advisory-lock.util';
import { normalizeEmail } from '../../modules/me/email-identity.util';

export const EMAIL_COLLISION_CODE = 'EMAIL_COLLISION';

export function isEmailRegistryEnforced(): boolean {
  return process.env.EMAIL_REGISTRY_ENFORCED === 'true';
}

@Injectable()
export class EmailReservationService {
  normalizeCandidates(candidates: string[]): string[] {
    const normalized = candidates
      .map((c) => normalizeEmail(c))
      .filter((c) => c.includes('@'));
    return [...new Set(normalized)].sort((a, b) => a.localeCompare(b));
  }

  async reserveEmailsForUser(
    tx: Prisma.TransactionClient,
    userId: string,
    emailNormalizedCandidates: string[],
    options?: { excludeIdentityId?: string },
  ): Promise<void> {
    const sorted = this.normalizeCandidates(emailNormalizedCandidates);
    if (sorted.length === 0) return;
    await acquireEmailAdvisoryLocks(tx, sorted);
    for (const emailNormalized of sorted) {
      await this.assertEmailAvailableForUser(
        tx,
        userId,
        emailNormalized,
        options?.excludeIdentityId,
      );
    }
  }

  async reserveEmailsForNewUser(
    tx: Prisma.TransactionClient,
    emailNormalizedCandidates: string[],
  ): Promise<void> {
    const sorted = this.normalizeCandidates(emailNormalizedCandidates);
    if (sorted.length === 0) return;
    await acquireEmailAdvisoryLocks(tx, sorted);
    for (const emailNormalized of sorted) {
      await this.assertEmailAvailableForUser(tx, null, emailNormalized);
    }
  }

  async assertEmailAvailableForUser(
    tx: Prisma.TransactionClient,
    userId: string | null,
    emailNormalized: string,
    excludeIdentityId?: string,
  ): Promise<void> {
    const otherLogin = await tx.user.findFirst({
      where: {
        ...(userId ? { id: { not: userId } } : {}),
        email: { equals: emailNormalized, mode: 'insensitive' },
      },
      select: { id: true },
    });
    if (otherLogin) {
      throw new ConflictException({
        code: EMAIL_COLLISION_CODE,
        message: 'Cette adresse e-mail est déjà utilisée par un autre compte',
      });
    }

    const otherIdentity = await tx.userEmailIdentity.findFirst({
      where: {
        ...(userId ? { userId: { not: userId } } : {}),
        emailNormalized,
      },
    });
    if (otherIdentity) {
      throw new ConflictException({
        code: EMAIL_COLLISION_CODE,
        message: 'Cette adresse e-mail est déjà enregistrée sur un autre compte',
      });
    }

    if (userId && excludeIdentityId) {
      const dupSelf = await tx.userEmailIdentity.findFirst({
        where: {
          userId,
          emailNormalized,
          id: { not: excludeIdentityId },
        },
      });
      if (dupSelf) {
        throw new ConflictException({
          code: EMAIL_COLLISION_CODE,
          message: 'Vous avez déjà une identité avec cette adresse',
        });
      }
    }
  }

  async registerPrimaryEmail(
    tx: Prisma.TransactionClient,
    userId: string,
    email: string,
  ): Promise<void> {
    if (!isEmailRegistryEnforced()) return;
    const emailNormalized = normalizeEmail(email);
    await tx.emailAddressRegistry.upsert({
      where: { emailNormalized },
      create: {
        emailNormalized,
        userId,
        type: EmailAddressRegistryType.PRIMARY,
      },
      update: {
        userId,
        type: EmailAddressRegistryType.PRIMARY,
        userEmailIdentityId: null,
        status: 'ACTIVE',
      },
    });
  }

  async registerIdentityEmail(
    tx: Prisma.TransactionClient,
    userId: string,
    userEmailIdentityId: string,
    email: string,
    type: EmailAddressRegistryType = EmailAddressRegistryType.DIRECTORY,
  ): Promise<void> {
    if (!isEmailRegistryEnforced()) return;
    const emailNormalized = normalizeEmail(email);
    await tx.emailAddressRegistry.upsert({
      where: { emailNormalized },
      create: {
        emailNormalized,
        userId,
        userEmailIdentityId,
        type,
      },
      update: {
        userId,
        userEmailIdentityId,
        type,
        status: 'ACTIVE',
      },
    });
  }
}
