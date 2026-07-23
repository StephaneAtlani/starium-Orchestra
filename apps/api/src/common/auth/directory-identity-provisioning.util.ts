import {
  DirectoryIdentityProvenanceStatus,
  DirectoryProviderType,
  Prisma,
  ClientUserRole,
  ClientUserStatus,
} from '@prisma/client';
import { EmailReservationService } from './email-reservation.service';
import { normalizeEmail } from '../../modules/me/email-identity.util';

export type DirectoryIdentityCandidate = {
  email?: string | null;
  username?: string | null;
};

export function collectDirectoryEmailCandidates(
  input: DirectoryIdentityCandidate,
): string[] {
  const candidates: string[] = [];
  if (input.email?.trim()) candidates.push(normalizeEmail(input.email));
  if (input.username?.trim() && input.username.includes('@')) {
    candidates.push(normalizeEmail(input.username));
  }
  return [...new Set(candidates)];
}

export type DirectoryIdentityProvenance = {
  directoryConnectionId: string;
  externalDirectoryId: string;
  directorySourceType: DirectoryProviderType;
  directoryLastSyncedAt?: Date;
};

export async function upsertDirectoryEmailIdentityLink(
  tx: Prisma.TransactionClient,
  params: {
    userEmailIdentityId: string;
    emailNormalized: string;
    provenance: DirectoryIdentityProvenance;
  },
): Promise<void> {
  const { provenance, userEmailIdentityId, emailNormalized } = params;
  await tx.directoryEmailIdentityLink.upsert({
    where: {
      userEmailIdentityId_directoryConnectionId: {
        userEmailIdentityId,
        directoryConnectionId: provenance.directoryConnectionId,
      },
    },
    create: {
      userEmailIdentityId,
      directoryConnectionId: provenance.directoryConnectionId,
      externalDirectoryId: provenance.externalDirectoryId,
      directorySourceType: provenance.directorySourceType,
      directoryLastSyncedAt: provenance.directoryLastSyncedAt ?? new Date(),
      directoryManaged: true,
      provenanceStatus: DirectoryIdentityProvenanceStatus.ACTIVE,
      emailNormalized,
    },
    update: {
      externalDirectoryId: provenance.externalDirectoryId,
      directorySourceType: provenance.directorySourceType,
      directoryLastSyncedAt: provenance.directoryLastSyncedAt ?? new Date(),
      directoryManaged: true,
      provenanceStatus: DirectoryIdentityProvenanceStatus.ACTIVE,
      emailNormalized,
    },
  });
}

export async function upsertDirectoryManagedIdentity(
  tx: Prisma.TransactionClient,
  emailReservation: EmailReservationService,
  params: {
    userId: string;
    email: string;
    displayName?: string | null;
    provenance?: DirectoryIdentityProvenance;
  },
): Promise<{ id: string; emailNormalized: string }> {
  const emailNormalized = normalizeEmail(params.email);
  await emailReservation.reserveEmailsForUser(tx, params.userId, [emailNormalized]);

  const existing = await tx.userEmailIdentity.findUnique({
    where: {
      userId_emailNormalized: { userId: params.userId, emailNormalized },
    },
  });

  if (existing) {
    const updated = await tx.userEmailIdentity.update({
      where: { id: existing.id },
      data: {
        email: params.email.trim(),
        displayName: params.displayName ?? existing.displayName,
        directoryManaged: true,
        isVerified: true,
        isActive: true,
      },
    });
    await emailReservation.registerIdentityEmail(
      tx,
      params.userId,
      updated.id,
      params.email,
    );
    if (params.provenance) {
      await upsertDirectoryEmailIdentityLink(tx, {
        userEmailIdentityId: updated.id,
        emailNormalized: updated.emailNormalized,
        provenance: params.provenance,
      });
    }
    return { id: updated.id, emailNormalized: updated.emailNormalized };
  }

  const created = await tx.userEmailIdentity.create({
    data: {
      userId: params.userId,
      email: params.email.trim(),
      emailNormalized,
      displayName: params.displayName ?? null,
      directoryManaged: true,
      isVerified: true,
      isActive: true,
    },
  });
  await emailReservation.registerIdentityEmail(
    tx,
    params.userId,
    created.id,
    params.email,
  );
  if (params.provenance) {
    await upsertDirectoryEmailIdentityLink(tx, {
      userEmailIdentityId: created.id,
      emailNormalized: created.emailNormalized,
      provenance: params.provenance,
    });
  }
  return { id: created.id, emailNormalized: created.emailNormalized };
}

/**
 * Transfère les e-mails annuaire d’un User doublon (provisionné ADDS) vers le compte membre cible.
 * Cas métier : rattachement explicite admin ADDS → membre alors que l’email est encore sur le User sync.
 */
export async function reclaimDirectoryEmailsFromDuplicateUser(
  tx: Prisma.TransactionClient,
  emailReservation: EmailReservationService,
  params: {
    fromUserId: string;
    toUserId: string;
    emailCandidates: string[];
  },
): Promise<void> {
  const { fromUserId, toUserId, emailCandidates } = params;
  if (fromUserId === toUserId || emailCandidates.length === 0) return;

  const fromUser = await tx.user.findUnique({
    where: { id: fromUserId },
    select: { id: true, email: true },
  });
  if (!fromUser) return;

  const fromPrimary = normalizeEmail(fromUser.email);
  if (emailCandidates.includes(fromPrimary)) {
    const placeholder = `merged.${fromUserId}@invalid.starium.local`;
    await tx.user.update({
      where: { id: fromUserId },
      data: { email: placeholder, passwordLoginEnabled: false },
    });
    await emailReservation.registerPrimaryEmail(tx, fromUserId, placeholder);
  }

  for (const emailNormalized of emailCandidates) {
    const sourceIdentity = await tx.userEmailIdentity.findFirst({
      where: { userId: fromUserId, emailNormalized },
    });
    if (!sourceIdentity) continue;

    const targetIdentity = await tx.userEmailIdentity.findUnique({
      where: {
        userId_emailNormalized: { userId: toUserId, emailNormalized },
      },
    });

    if (targetIdentity) {
      await tx.directoryEmailIdentityLink.updateMany({
        where: { userEmailIdentityId: sourceIdentity.id },
        data: { userEmailIdentityId: targetIdentity.id },
      });
      await tx.clientUser.updateMany({
        where: { defaultEmailIdentityId: sourceIdentity.id },
        data: { defaultEmailIdentityId: targetIdentity.id },
      });
      await tx.emailAddressRegistry.updateMany({
        where: { userEmailIdentityId: sourceIdentity.id },
        data: {
          userEmailIdentityId: targetIdentity.id,
          userId: toUserId,
        },
      });
      await tx.userEmailIdentity.delete({ where: { id: sourceIdentity.id } });
    } else {
      await tx.userEmailIdentity.update({
        where: { id: sourceIdentity.id },
        data: { userId: toUserId, directoryManaged: true },
      });
      await tx.emailAddressRegistry.updateMany({
        where: { emailNormalized },
        data: { userId: toUserId },
      });
    }
  }
}

export async function applyDirectoryIdentityToPlatformUser(
  tx: Prisma.TransactionClient,
  emailReservation: EmailReservationService,
  params: {
    clientId: string;
    userId: string;
    directoryInput: {
      firstName?: string | null;
      lastName?: string | null;
      department?: string | null;
      jobTitle?: string | null;
      isActive?: boolean;
      email?: string | null;
      username?: string | null;
      displayName?: string;
    };
    directorySyncClientCount: number;
    provenance?: DirectoryIdentityProvenance;
  },
): Promise<void> {
  const { directoryInput, userId, clientId, directorySyncClientCount } = params;

  const userPatch: {
    firstName?: string | null;
    lastName?: string | null;
    department?: string | null;
    jobTitle?: string | null;
  } = {};

  if (directorySyncClientCount <= 1) {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, department: true, jobTitle: true },
    });
    if (user) {
      if ((user.firstName ?? null) !== (directoryInput.firstName ?? null)) {
        userPatch.firstName = directoryInput.firstName ?? null;
      }
      if ((user.lastName ?? null) !== (directoryInput.lastName ?? null)) {
        userPatch.lastName = directoryInput.lastName ?? null;
      }
      if ((user.department ?? null) !== (directoryInput.department ?? null)) {
        userPatch.department = directoryInput.department ?? null;
      }
      if ((user.jobTitle ?? null) !== (directoryInput.jobTitle ?? null)) {
        userPatch.jobTitle = directoryInput.jobTitle ?? null;
      }
      if (Object.keys(userPatch).length > 0) {
        await tx.user.update({ where: { id: userId }, data: userPatch });
      }
    }
  }

  const emailCandidates = collectDirectoryEmailCandidates(directoryInput);
  for (const email of emailCandidates) {
    await upsertDirectoryManagedIdentity(tx, emailReservation, {
      userId,
      email,
      displayName: directoryInput.displayName ?? null,
      provenance: params.provenance,
    });
  }

  const targetStatus =
    directoryInput.isActive === false
      ? ClientUserStatus.SUSPENDED
      : ClientUserStatus.ACTIVE;

  const existingMembership = await tx.clientUser.findUnique({
    where: { userId_clientId: { userId, clientId } },
    select: { id: true, status: true, defaultEmailIdentityId: true },
  });

  if (!existingMembership) {
    await tx.clientUser.create({
      data: {
        userId,
        clientId,
        role: ClientUserRole.CLIENT_USER,
        status: targetStatus,
      },
    });
    return;
  }

  if (existingMembership.status !== targetStatus) {
    await tx.clientUser.update({
      where: { id: existingMembership.id },
      data: { status: targetStatus },
    });
  }

  if (!existingMembership.defaultEmailIdentityId && emailCandidates.length > 0) {
    const identity = await tx.userEmailIdentity.findFirst({
      where: {
        userId,
        emailNormalized: emailCandidates[0],
        directoryManaged: true,
      },
      select: { id: true },
    });
    if (identity) {
      await tx.clientUser.update({
        where: { id: existingMembership.id },
        data: { defaultEmailIdentityId: identity.id },
      });
    }
  }
}
