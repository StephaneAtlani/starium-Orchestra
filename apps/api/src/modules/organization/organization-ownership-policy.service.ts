import { Injectable } from '@nestjs/common';
import { OrgOwnershipPolicyMode } from '@prisma/client';
import type { RequestWithClient } from '../../common/types/request-with-client';
import { PrismaService } from '../../prisma/prisma.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import {
  assertOwnerOrgUnitIfRequired,
  type OwnershipObligationPhase,
  resolveBudgetLineEffectiveOwnerForObligation,
} from './organization-ownership-obligation.helpers';
import {
  ORG_OWNERSHIP_POLICY_FLAG_KEY,
  type OrganizationOwnershipPolicyView,
} from './organization-ownership-policy.types';

@Injectable()
export class OrganizationOwnershipPolicyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featureFlags: FeatureFlagsService,
  ) {}

  async getPolicyView(
    clientId: string,
    request?: RequestWithClient,
  ): Promise<OrganizationOwnershipPolicyView> {
    const mode = await this.getMode(clientId);
    const enforcementEnabled = await this.isEnforcementEnabled(clientId, mode, request);
    return {
      mode,
      enforcementEnabled,
      flagKey: ORG_OWNERSHIP_POLICY_FLAG_KEY,
    };
  }

  async getMode(clientId: string): Promise<OrgOwnershipPolicyMode> {
    const row = await this.prisma.clientOrgOwnershipPolicy.findUnique({
      where: { clientId },
      select: { mode: true },
    });
    return row?.mode ?? OrgOwnershipPolicyMode.ADVISORY;
  }

  async isEnforcementEnabled(
    clientId: string,
    mode?: OrgOwnershipPolicyMode,
    request?: RequestWithClient,
  ): Promise<boolean> {
    const resolvedMode = mode ?? (await this.getMode(clientId));
    if (
      resolvedMode !== OrgOwnershipPolicyMode.REQUIRED_ON_CREATE &&
      resolvedMode !== OrgOwnershipPolicyMode.REQUIRED_ON_ACTIVATE
    ) {
      return false;
    }
    return this.featureFlags.isEnabled(
      clientId,
      ORG_OWNERSHIP_POLICY_FLAG_KEY,
      request,
    );
  }

  async updateMode(
    clientId: string,
    mode: OrgOwnershipPolicyMode,
  ): Promise<OrganizationOwnershipPolicyView> {
    await this.prisma.clientOrgOwnershipPolicy.upsert({
      where: { clientId },
      create: { clientId, mode },
      update: { mode },
    });
    return this.getPolicyView(clientId);
  }

  async assertOwnerOrgUnitForClient(
    clientId: string,
    params: {
      phase: OwnershipObligationPhase;
      effectiveOwnerOrgUnitId: string | null | undefined;
      request?: RequestWithClient;
    },
  ): Promise<void> {
    const mode = await this.getMode(clientId);
    const enforcementEnabled = await this.isEnforcementEnabled(
      clientId,
      mode,
      params.request,
    );
    await assertOwnerOrgUnitIfRequired(this.prisma, {
      clientId,
      enforcementEnabled,
      phase: params.phase,
      mode,
      effectiveOwnerOrgUnitId: params.effectiveOwnerOrgUnitId,
    });
  }

  async assertBudgetLineOwnerForClient(
    clientId: string,
    params: {
      phase: OwnershipObligationPhase;
      lineOwnerOrgUnitId: string | null | undefined;
      budgetOwnerOrgUnitId: string | null | undefined;
      request?: RequestWithClient;
    },
  ): Promise<void> {
    const effective = resolveBudgetLineEffectiveOwnerForObligation(
      params.lineOwnerOrgUnitId,
      params.budgetOwnerOrgUnitId,
    );
    await this.assertOwnerOrgUnitForClient(clientId, {
      phase: params.phase,
      effectiveOwnerOrgUnitId: effective,
      request: params.request,
    });
  }
}
