import { Injectable } from '@nestjs/common';
import type { RequestWithClient } from '../../common/types/request-with-client';
import { PrismaService } from '../../prisma/prisma.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import {
  ACCESS_MODEL_DEFAULT_LIMIT,
  ACCESS_MODEL_DEFAULT_PAGE,
  ACCESS_MODEL_MAX_LIMIT,
  ACCESS_MODEL_SCAN_CAP,
  ROLLOUT_FLAG_ENTRIES,
} from './access-model.constants';
import {
  collectMissingHumanIssues,
  collectMissingOwnerCandidates,
  countMissingOwnerByModule,
  matchesSearch,
  normalizeLimit,
  normalizePage,
  paginate,
  toMissingOwnerIssue,
} from './access-model.helpers';
import {
  collectAtypicalAclIssues,
  collectPolicyReviewIssues,
  countAtypicalAcl,
  countPolicyReviewHints,
} from './access-model-heuristics';
import type {
  AccessModelHealthResponse,
  AccessModelIssueItem,
  AccessModelIssuesQuery,
  AccessModelIssuesResponse,
} from './access-model.types';

@Injectable()
export class AccessModelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featureFlags: FeatureFlagsService,
  ) {}

  async getHealth(
    clientId: string,
    httpRequest?: RequestWithClient,
  ): Promise<AccessModelHealthResponse> {
    const [ownerCounts, missingHuman, atypical, policyHints, rollout] =
      await Promise.all([
        countMissingOwnerByModule(this.prisma, clientId),
        collectMissingHumanIssues(this.prisma, clientId),
        countAtypicalAcl(this.prisma, clientId),
        countPolicyReviewHints(this.prisma, clientId),
        this.buildRollout(clientId, httpRequest),
      ]);

    return {
      generatedAt: new Date().toISOString(),
      rollout,
      kpis: {
        resourcesMissingOwner: ownerCounts,
        membersMissingHumanWithScopedPerms: {
          total: missingHuman.length,
        },
        atypicalAclShares: { total: atypical.total },
        policyReviewHints: { total: policyHints },
      },
    };
  }

  async listIssues(
    clientId: string,
    query: AccessModelIssuesQuery,
  ): Promise<AccessModelIssuesResponse> {
    const page = normalizePage(query.page ?? ACCESS_MODEL_DEFAULT_PAGE);
    const limit = normalizeLimit(
      query.limit ?? ACCESS_MODEL_DEFAULT_LIMIT,
      ACCESS_MODEL_MAX_LIMIT,
    );

    const categoryResult = await this.loadCategoryItems(clientId, query.category);
    let allItems = categoryResult.items;
    let truncated =
      categoryResult.scanTruncated || allItems.length > ACCESS_MODEL_SCAN_CAP;
    if (allItems.length > ACCESS_MODEL_SCAN_CAP) {
      allItems = allItems.slice(0, ACCESS_MODEL_SCAN_CAP);
    }

    if (query.module?.trim()) {
      const mod = query.module.trim().toLowerCase();
      allItems = allItems.filter((i) => i.module.toLowerCase() === mod);
    }
    if (query.search?.trim()) {
      allItems = allItems.filter((i) => matchesSearch(i.label, query.search));
    }

    const { slice, total } = paginate(allItems, page, limit);

    return {
      items: slice,
      page,
      limit,
      total,
      truncated,
    };
  }

  private async buildRollout(
    clientId: string,
    httpRequest?: RequestWithClient,
  ) {
    return Promise.all(
      ROLLOUT_FLAG_ENTRIES.map(async (entry) => ({
        module: entry.module,
        flagKey: entry.flagKey,
        enabled: await this.featureFlags.isEnabled(
          clientId,
          entry.flagKey,
          httpRequest,
        ),
      })),
    );
  }

  private async loadCategoryItems(
    clientId: string,
    category: AccessModelIssuesQuery['category'],
  ): Promise<{ items: AccessModelIssueItem[]; scanTruncated: boolean }> {
    switch (category) {
      case 'missing_owner': {
        const candidates = await collectMissingOwnerCandidates(
          this.prisma,
          clientId,
        );
        return {
          items: candidates.map(toMissingOwnerIssue),
          scanTruncated: false,
        };
      }
      case 'missing_human':
        return {
          items: await collectMissingHumanIssues(this.prisma, clientId),
          scanTruncated: false,
        };
      case 'atypical_acl': {
        const { items, truncated } = await collectAtypicalAclIssues(
          this.prisma,
          clientId,
        );
        return { items, scanTruncated: truncated };
      }
      case 'policy_review': {
        const { items } = await collectPolicyReviewIssues(
          this.prisma,
          clientId,
        );
        return { items, scanTruncated: false };
      }
      default:
        return { items: [], scanTruncated: false };
    }
  }
}
