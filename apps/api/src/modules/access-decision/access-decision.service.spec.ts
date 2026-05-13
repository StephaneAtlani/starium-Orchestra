import { BadRequestException } from '@nestjs/common';
import {
  ClientUserLicenseBillingMode,
  ClientUserLicenseType,
  ClientUserStatus,
} from '@prisma/client';
import { AccessDecisionService } from './access-decision.service';
import type { RequestWithClient } from '../../common/types/request-with-client';

const RID = 'caaaaaaaaaaaaaaaaaaaaaaaaa';

describe('AccessDecisionService', () => {
  const clientId = 'cclientclientclientclientc';
  const userId = 'cuseruseruseruseruseruseru';
  const request = {} as RequestWithClient;

  let service: AccessDecisionService;
  let prisma: any;
  let effectivePermissions: { resolvePermissionCodesForRequest: jest.Mock };
  let organizationScope: { resolveOrgScope: jest.Mock };
  let moduleVisibility: { isVisibleForUser: jest.Mock };
  let accessControl: {
    evaluateResourceAccess: jest.Mock;
    evaluateResourceAccessBatch: jest.Mock;
  };

  beforeEach(() => {
    effectivePermissions = {
      resolvePermissionCodesForRequest: jest
        .fn()
        .mockResolvedValue(new Set(['projects.read_scope'])),
    };
    organizationScope = {
      resolveOrgScope: jest.fn().mockResolvedValue({
        level: 'NONE',
        reasonCodes: ['SCOPE_OUT_OF_SUBTREE'],
      }),
    };
    moduleVisibility = {
      isVisibleForUser: jest.fn().mockResolvedValue(true),
    };
    accessControl = {
      evaluateResourceAccess: jest.fn().mockResolvedValue({
        allowed: true,
        reasonCode: 'POLICY_DEFAULT_NO_ACL_PUBLIC',
        effectiveAccessMode: 'PUBLIC_DEFAULT',
        aclRank: 0,
        mode: 'DEFAULT',
      }),
      evaluateResourceAccessBatch: jest.fn(),
    };

    prisma = {
      clientUser: {
        findFirst: jest.fn().mockResolvedValue({
          status: ClientUserStatus.ACTIVE,
          licenseType: ClientUserLicenseType.READ_WRITE,
          licenseEndsAt: null,
          licenseBillingMode: ClientUserLicenseBillingMode.NONE,
          subscriptionId: null,
          subscription: null,
        }),
      },
      module: {
        findFirst: jest.fn().mockResolvedValue({ id: 'mod-1' }),
      },
      project: {
        findMany: jest.fn().mockResolvedValue([{ id: RID, ownerOrgUnitId: 'ou-1' }]),
      },
    };

    service = new AccessDecisionService(
      prisma,
      effectivePermissions as any,
      organizationScope as any,
      moduleVisibility as any,
      accessControl as any,
    );
  });

  it('write intent → BadRequestException', async () => {
    await expect(
      service.decide({
        request,
        clientId,
        userId,
        resourceType: 'PROJECT',
        resourceId: RID,
        intent: 'write',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('read_scope + org NONE + DEFAULT public ACL : refuse après resserrement org', async () => {
    const d = await service.decide({
      request,
      clientId,
      userId,
      resourceType: 'PROJECT',
      resourceId: RID,
      intent: 'read',
    });

    expect(d.allowed).toBe(false);
    expect(d.reasonCodes).toEqual(
      expect.arrayContaining(['ACCESS_DENIED_ACL_POLICY', 'ACCESS_DENIED_ORG_SCOPE']),
    );
    expect(organizationScope.resolveOrgScope).toHaveBeenCalledWith(
      expect.not.objectContaining({ hasAllOverride: true }),
    );
    expect(accessControl.evaluateResourceAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        sharingFloorAllows: false,
      }),
    );
  });

  it('read_all : org court-circuit ALL, plancher true, ACL avec floor true', async () => {
    effectivePermissions.resolvePermissionCodesForRequest.mockResolvedValue(
      new Set(['projects.read_all']),
    );
    organizationScope.resolveOrgScope.mockResolvedValue({
      level: 'ALL',
      reasonCodes: ['ALL_RBAC_OVERRIDE'],
    });

    const d = await service.decide({
      request,
      clientId,
      userId,
      resourceType: 'PROJECT',
      resourceId: RID,
      intent: 'read',
    });

    expect(d.allowed).toBe(true);
    expect(organizationScope.resolveOrgScope).toHaveBeenCalledWith(
      expect.objectContaining({ hasAllOverride: true }),
    );
    expect(accessControl.evaluateResourceAccess).toHaveBeenCalledWith(
      expect.objectContaining({ sharingFloorAllows: true }),
    );
  });

  it('filterResourceIdsByAccess : un batch ACL + cohérence ids', async () => {
    effectivePermissions.resolvePermissionCodesForRequest.mockResolvedValue(
      new Set(['projects.read']),
    );
    organizationScope.resolveOrgScope.mockResolvedValue({
      level: 'ALL',
      reasonCodes: ['ALL_RBAC_OVERRIDE'],
    });

    prisma.project.findMany.mockResolvedValue([
      { id: RID, ownerOrgUnitId: null },
      { id: 'cbbbbbbbbbbbbbbbbbbbbbbbbb', ownerOrgUnitId: null },
    ]);

    accessControl.evaluateResourceAccessBatch.mockResolvedValue(
      new Map([
        [
          RID,
          {
            allowed: true,
            reasonCode: 'POLICY_DEFAULT_NO_ACL_PUBLIC',
            effectiveAccessMode: 'PUBLIC_DEFAULT',
            aclRank: 0,
            mode: 'DEFAULT',
          },
        ],
        [
          'cbbbbbbbbbbbbbbbbbbbbbbbbb',
          {
            allowed: false,
            reasonCode: 'POLICY_DEFAULT_ACL_NO_MATCH',
            effectiveAccessMode: 'ACL_RESTRICTED',
            aclRank: 0,
            mode: 'DEFAULT',
          },
        ],
      ]),
    );

    const out = await service.filterResourceIdsByAccess({
      request,
      clientId,
      userId,
      resourceType: 'PROJECT',
      resourceIds: [RID, 'cbbbbbbbbbbbbbbbbbbbbbbbbb', 'czzzzzzzzzzzzzzzzzzzzzzzzz'],
      intent: 'list',
    });

    expect(out).toEqual([RID]);
    expect(prisma.project.findMany).toHaveBeenCalledTimes(1);
    expect(accessControl.evaluateResourceAccessBatch).toHaveBeenCalledTimes(1);
  });

  it('SHARING + org NONE + ACL explicite : allow (post-check rescue)', async () => {
    effectivePermissions.resolvePermissionCodesForRequest.mockResolvedValue(
      new Set(['projects.read_scope']),
    );
    organizationScope.resolveOrgScope.mockResolvedValue({
      level: 'NONE',
      reasonCodes: ['SCOPE_OUT_OF_SUBTREE'],
    });
    accessControl.evaluateResourceAccess.mockResolvedValue({
      allowed: true,
      reasonCode: 'POLICY_SHARING_ACL_MATCH',
      effectiveAccessMode: 'SHARING_ACL_PLUS_FLOOR',
      aclRank: 1,
      mode: 'SHARING',
    });

    const d = await service.decide({
      request,
      clientId,
      userId,
      resourceType: 'PROJECT',
      resourceId: RID,
      intent: 'read',
    });

    expect(d.allowed).toBe(true);
    expect(d.reasonCodes).toContain('ACCESS_ALLOWED_BY_SHARING_ACL');
  });

  it('RESTRICTIVE + ACL match + org NONE : refus (pas de rescue SHARING)', async () => {
    accessControl.evaluateResourceAccess.mockResolvedValue({
      allowed: true,
      reasonCode: 'POLICY_RESTRICTIVE_ACL_MATCH',
      effectiveAccessMode: 'ACL_RESTRICTED',
      aclRank: 1,
      mode: 'RESTRICTIVE',
    });

    const d = await service.decide({
      request,
      clientId,
      userId,
      resourceType: 'PROJECT',
      resourceId: RID,
      intent: 'read',
    });

    expect(d.allowed).toBe(false);
  });

  it('projet absent du client → ACCESS_DENIED_RESOURCE_NOT_FOUND', async () => {
    prisma.project.findMany.mockResolvedValue([]);

    const d = await service.decide({
      request,
      clientId,
      userId,
      resourceType: 'PROJECT',
      resourceId: RID,
      intent: 'read',
    });

    expect(d.allowed).toBe(false);
    expect(d.reasonCodes).toContain('ACCESS_DENIED_RESOURCE_NOT_FOUND');
  });
});
