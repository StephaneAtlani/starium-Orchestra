import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  ClientUserLicenseType,
  ClientUserStatus,
  ProjectRequestStatus,
} from '@prisma/client';
import { EffectivePermissionsService } from '../../common/services/effective-permissions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AccessControlService } from '../access-control/access-control.service';
import { ClientProjectRequestWorkflowSettingsService } from '../clients/client-project-request-workflow-settings.service';
import { ProjectRequestWorkflowService } from './project-request-workflow.service';
import { ProjectRequestToProjectConverter } from './project-request-to-project.converter';
import { ProjectRequestsService } from './project-requests.service';

describe('ProjectRequestsService', () => {
  const clientId = 'client-a';
  const actorUserId = 'user-1';
  const requestId = 'req-1';

  let prisma: {
    clientUser: { findUnique: jest.Mock };
    projectRequest: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    permission: { findFirst: jest.Mock };
    userRole: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let accessControl: {
    canReadResource: jest.Mock;
    canWriteResource: jest.Mock;
    filterReadableResourceIds: jest.Mock;
  };
  let effectivePermissions: { resolvePermissionCodesForRequest: jest.Mock };
  let workflowSettings: { getActive: jest.Mock };
  let auditLogs: { create: jest.Mock };

  let service: ProjectRequestsService;

  const activeMembership = {
    status: ClientUserStatus.ACTIVE,
    licenseType: ClientUserLicenseType.READ_WRITE,
    licenseEndsAt: null,
    licenseBillingMode: 'NON_BILLABLE',
    subscriptionId: null,
    subscription: null,
  };

  const baseRequest = {
    id: requestId,
    clientId,
    title: 'Titre',
    description: 'Description détaillée',
    requesterUserId: actorUserId,
    validatorUserId: 'validator-1',
    status: ProjectRequestStatus.SUBMITTED,
    urgency: null,
    estimatedBudget: null,
    expectedBenefits: null,
    businessContext: null,
    riskIfNotDone: null,
    routingTarget: null,
    routingStatus: 'NOT_ROUTED',
    decisionComment: null,
    decidedByUserId: null,
    decidedAt: null,
    needsMoreInfoComment: null,
    convertedProjectId: null,
    routedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    prisma = {
      clientUser: {
        findUnique: jest.fn().mockResolvedValue(activeMembership),
      },
      projectRequest: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      permission: {
        findFirst: jest.fn().mockResolvedValue({ id: 'perm-validate' }),
      },
      userRole: {
        findMany: jest.fn().mockResolvedValue([{ userId: 'validator-1' }]),
      },
      $transaction: jest.fn(),
    };
    accessControl = {
      canReadResource: jest.fn().mockResolvedValue(true),
      canWriteResource: jest.fn().mockResolvedValue(true),
      filterReadableResourceIds: jest.fn(async ({ resourceIds }) => resourceIds),
    };
    effectivePermissions = {
      resolvePermissionCodesForRequest: jest
        .fn()
        .mockResolvedValue(new Set(['project_requests.read', 'project_requests.create'])),
    };
    workflowSettings = {
      getActive: jest.fn().mockResolvedValue({
        stored: {},
        resolved: {
          allowRequesterToSelectValidator: true,
          authorizedValidatorUserIds: [],
          authorizedValidatorRoleIds: [],
        },
      }),
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };

    service = new ProjectRequestsService(
      prisma as unknown as PrismaService,
      auditLogs as unknown as AuditLogsService,
      accessControl as unknown as AccessControlService,
      effectivePermissions as unknown as EffectivePermissionsService,
      workflowSettings as unknown as ClientProjectRequestWorkflowSettingsService,
      {} as ProjectRequestWorkflowService,
      {} as ProjectRequestToProjectConverter,
    );
  });

  it('getById renvoie 404 si hors client', async () => {
    prisma.projectRequest.findFirst.mockResolvedValue(null);
    await expect(
      service.getById(clientId, actorUserId, requestId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('getById renvoie 404 si ACL lecture refuse', async () => {
    prisma.projectRequest.findFirst
      .mockResolvedValueOnce(baseRequest)
      .mockResolvedValueOnce({
        ...baseRequest,
        requester: { id: actorUserId, email: 'a@test.com', firstName: 'A', lastName: 'B' },
        validator: null,
        decidedBy: null,
        convertedProject: null,
      });
    accessControl.canReadResource.mockResolvedValue(false);
    await expect(
      service.getById(clientId, actorUserId, requestId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('submit exige titre, description et validateur', async () => {
    prisma.projectRequest.findFirst.mockResolvedValue({
      ...baseRequest,
      description: '',
      status: ProjectRequestStatus.DRAFT,
    });
    await expect(
      service.submit(clientId, actorUserId, requestId),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('submit passe en SUBMITTED si champs OK', async () => {
    prisma.projectRequest.findFirst.mockResolvedValue({
      ...baseRequest,
      status: ProjectRequestStatus.DRAFT,
    });
    prisma.projectRequest.findFirst.mockResolvedValue({
      ...baseRequest,
      status: ProjectRequestStatus.DRAFT,
    });
    jest.spyOn(service, 'getById').mockResolvedValue({
      ...baseRequest,
      status: ProjectRequestStatus.SUBMITTED,
    } as never);

    const result = await service.submit(clientId, actorUserId, requestId);
    expect(prisma.projectRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: ProjectRequestStatus.SUBMITTED },
      }),
    );
    expect(result.status).toBe(ProjectRequestStatus.SUBMITTED);
  });
});
