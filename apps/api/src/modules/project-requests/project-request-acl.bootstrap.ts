import {
  Prisma,
  ProjectRequestAutoAclGrantRole,
  ResourceAccessPolicyMode,
  ResourceAclPermission,
  ResourceAclSubjectType,
} from '@prisma/client';
import { PROJECT_REQUEST_RESOURCE_TYPE } from './project-request.constants';

async function grantAutoWrite(
  tx: Prisma.TransactionClient,
  params: {
    clientId: string;
    projectRequestId: string;
    userId: string;
    grantRole: ProjectRequestAutoAclGrantRole;
  },
): Promise<void> {
  const acl = await tx.resourceAcl.create({
    data: {
      clientId: params.clientId,
      resourceType: PROJECT_REQUEST_RESOURCE_TYPE,
      resourceId: params.projectRequestId,
      subjectType: ResourceAclSubjectType.USER,
      subjectId: params.userId,
      permission: ResourceAclPermission.WRITE,
    },
  });
  await tx.projectRequestAutoAclGrant.create({
    data: {
      clientId: params.clientId,
      projectRequestId: params.projectRequestId,
      userId: params.userId,
      grantRole: params.grantRole,
      resourceAclId: acl.id,
    },
  });
}

export async function bootstrapProjectRequestAccess(
  tx: Prisma.TransactionClient,
  params: {
    clientId: string;
    projectRequestId: string;
    requesterUserId: string;
    validatorUserId?: string | null;
  },
): Promise<void> {
  await tx.resourceAccessPolicy.upsert({
    where: {
      clientId_resourceType_resourceId: {
        clientId: params.clientId,
        resourceType: PROJECT_REQUEST_RESOURCE_TYPE,
        resourceId: params.projectRequestId,
      },
    },
    create: {
      clientId: params.clientId,
      resourceType: PROJECT_REQUEST_RESOURCE_TYPE,
      resourceId: params.projectRequestId,
      mode: ResourceAccessPolicyMode.DEFAULT,
    },
    update: {},
  });

  await grantAutoWrite(tx, {
    clientId: params.clientId,
    projectRequestId: params.projectRequestId,
    userId: params.requesterUserId,
    grantRole: ProjectRequestAutoAclGrantRole.REQUESTER,
  });

  if (params.validatorUserId) {
    await grantAutoWrite(tx, {
      clientId: params.clientId,
      projectRequestId: params.projectRequestId,
      userId: params.validatorUserId,
      grantRole: ProjectRequestAutoAclGrantRole.VALIDATOR,
    });
  }
}

export async function syncValidatorAutoAcl(
  tx: Prisma.TransactionClient,
  params: {
    clientId: string;
    projectRequestId: string;
    oldValidatorUserId: string | null;
    newValidatorUserId: string | null;
  },
): Promise<void> {
  const { clientId, projectRequestId, oldValidatorUserId, newValidatorUserId } =
    params;

  if (
    oldValidatorUserId &&
    oldValidatorUserId !== newValidatorUserId
  ) {
    const grants = await tx.projectRequestAutoAclGrant.findMany({
      where: {
        projectRequestId,
        grantRole: ProjectRequestAutoAclGrantRole.VALIDATOR,
        userId: oldValidatorUserId,
      },
    });
    for (const grant of grants) {
      await tx.resourceAcl.delete({ where: { id: grant.resourceAclId } });
      await tx.projectRequestAutoAclGrant.delete({ where: { id: grant.id } });
    }
  }

  if (
    newValidatorUserId &&
    newValidatorUserId !== oldValidatorUserId
  ) {
    const existing = await tx.projectRequestAutoAclGrant.findFirst({
      where: {
        projectRequestId,
        grantRole: ProjectRequestAutoAclGrantRole.VALIDATOR,
        userId: newValidatorUserId,
      },
    });
    if (!existing) {
      await grantAutoWrite(tx, {
        clientId,
        projectRequestId,
        userId: newValidatorUserId,
        grantRole: ProjectRequestAutoAclGrantRole.VALIDATOR,
      });
    }
  }
}
