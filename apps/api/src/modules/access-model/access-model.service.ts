import {
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { OrgUnitStatus } from '@prisma/client';
import type { RequestWithClient } from '../../common/types/request-with-client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import {
  buildAccessModelExportFilename,
  issuesToCsv,
} from './access-model-export';
import {
  ACCESS_MODEL_CHECKLIST_OWNER_WARNING_MAX,
  ACCESS_MODEL_DEFAULT_LIMIT,
  ACCESS_MODEL_DEFAULT_PAGE,
  ACCESS_MODEL_EXPORT_PROBE_LIMIT,
  ACCESS_MODEL_MAX_EXPORT_ROWS,
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
  AccessModelChecklistStep,
  AccessModelExportCsvResult,
  AccessModelHealthResponse,
  AccessModelIssueCategory,
  AccessModelIssueItem,
  AccessModelIssuesExportQuery,
  AccessModelIssuesQuery,
  AccessModelIssuesResponse,
} from './access-model.types';

export type ResolveFilteredIssuesMode = 'list' | 'export';

export type ResolveFilteredIssuesOptions = {
  category: AccessModelIssueCategory;
  module?: string;
  search?: string;
  mode: ResolveFilteredIssuesMode;
};

export type ResolveFilteredIssuesResult = {
  items: AccessModelIssueItem[];
  total: number;
  scanTruncated: boolean;
};

@Injectable()
export class AccessModelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featureFlags: FeatureFlagsService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async getHealth(
    clientId: string,
    httpRequest?: RequestWithClient,
  ): Promise<AccessModelHealthResponse> {
    const [ownerCounts, missingHuman, atypical, policyHints, rollout, orgActiveCount] =
      await Promise.all([
        countMissingOwnerByModule(this.prisma, clientId),
        collectMissingHumanIssues(this.prisma, clientId),
        countAtypicalAcl(this.prisma, clientId),
        countPolicyReviewHints(this.prisma, clientId),
        this.buildRollout(clientId, httpRequest),
        this.prisma.orgUnit.count({
          where: { clientId, status: OrgUnitStatus.ACTIVE },
        }),
      ]);

    const kpis = {
      resourcesMissingOwner: ownerCounts,
      membersMissingHumanWithScopedPerms: {
        total: missingHuman.length,
      },
      atypicalAclShares: { total: atypical.total },
      policyReviewHints: { total: policyHints },
    };

    const checklist = this.buildRolloutChecklist(kpis, rollout, orgActiveCount);

    return {
      generatedAt: new Date().toISOString(),
      rollout,
      checklist,
      kpis,
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

    const resolved = await this.resolveFilteredIssues(clientId, {
      category: query.category,
      module: query.module,
      search: query.search,
      mode: 'list',
    });

    const truncated =
      resolved.scanTruncated || resolved.total > ACCESS_MODEL_SCAN_CAP;

    const { slice, total } = paginate(resolved.items, page, limit);

    return {
      items: slice,
      page,
      limit,
      total,
      truncated,
    };
  }

  async exportIssuesCsv(
    clientId: string,
    query: AccessModelIssuesExportQuery,
    httpRequest: RequestWithClient,
  ): Promise<AccessModelExportCsvResult> {
    const resolved = await this.resolveFilteredIssues(clientId, {
      category: query.category,
      module: query.module,
      search: query.search,
      mode: 'export',
    });

    if (
      resolved.scanTruncated ||
      resolved.items.length > ACCESS_MODEL_MAX_EXPORT_ROWS
    ) {
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
          message:
            'Trop de lignes à exporter (maximum 5 000). Affinez les filtres (module, recherche) ou traitez les écarts par priorité dans le cockpit.',
        },
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }

    const delimiter = query.delimiter ?? ',';
    const csv = issuesToCsv(resolved.items, delimiter);
    const buffer = Buffer.from(csv, 'utf-8');
    const rowCount = resolved.items.length;

    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { slug: true },
    });
    const filename = buildAccessModelExportFilename(
      client?.slug,
      clientId,
      new Date().toISOString(),
    );

    await this.auditLogs.create({
      clientId,
      userId: httpRequest.user?.userId,
      action: 'access_model.issues.exported',
      resourceType: 'access_model',
      resourceId: clientId,
      newValue: {
        category: query.category,
        module: query.module ?? null,
        search: query.search ?? null,
        rowCount,
        delimiter,
      },
      ipAddress: httpRequest.ip,
      userAgent: httpRequest.headers['user-agent'],
      requestId:
        typeof httpRequest.headers['x-request-id'] === 'string'
          ? httpRequest.headers['x-request-id']
          : undefined,
    });

    return { buffer, filename, rowCount };
  }

  async resolveFilteredIssues(
    clientId: string,
    options: ResolveFilteredIssuesOptions,
  ): Promise<ResolveFilteredIssuesResult> {
    const maxItems =
      options.mode === 'export'
        ? ACCESS_MODEL_EXPORT_PROBE_LIMIT
        : ACCESS_MODEL_SCAN_CAP;

    const categoryResult = await this.loadCategoryItems(
      clientId,
      options.category,
    );

    let items = categoryResult.items;
    let scanTruncated = categoryResult.scanTruncated;

    if (options.module?.trim()) {
      const mod = options.module.trim().toLowerCase();
      items = items.filter((i) => i.module.toLowerCase() === mod);
    }
    if (options.search?.trim()) {
      items = items.filter((i) => matchesSearch(i.label, options.search));
    }

    if (items.length > maxItems) {
      scanTruncated = true;
      items = items.slice(0, maxItems);
    }

    return {
      items,
      total: items.length,
      scanTruncated,
    };
  }

  private buildRolloutChecklist(
    kpis: AccessModelHealthResponse['kpis'],
    rollout: AccessModelHealthResponse['rollout'],
    orgActiveCount: number,
  ): AccessModelChecklistStep[] {
    const ownerTotal = kpis.resourcesMissingOwner.total;
    let backfillOwnerStatus: AccessModelChecklistStep['status'] = 'pending';
    let backfillOwnerDetail: string | undefined;
    if (ownerTotal === 0) {
      backfillOwnerStatus = 'ok';
    } else if (ownerTotal <= ACCESS_MODEL_CHECKLIST_OWNER_WARNING_MAX) {
      backfillOwnerStatus = 'warning';
      backfillOwnerDetail = `${ownerTotal} ressource(s) sans Direction`;
    } else {
      backfillOwnerDetail = `${ownerTotal} ressources sans Direction — prioriser le backfill`;
    }

    const humanTotal = kpis.membersMissingHumanWithScopedPerms.total;
    const flagEnabled = rollout.some((r) => r.enabled);

    return [
      {
        id: 'org_tree',
        label: 'Arbre organisationnel',
        status: orgActiveCount >= 1 ? 'ok' : 'pending',
        detail:
          orgActiveCount >= 1
            ? `${orgActiveCount} unité(s) active(s)`
            : 'Créer au moins une unité organisationnelle',
        href: '/client/administration/organization',
      },
      {
        id: 'backfill_owner',
        label: 'Backfill Direction (owner)',
        status: backfillOwnerStatus,
        detail: backfillOwnerDetail,
      },
      {
        id: 'backfill_human',
        label: 'Liens HUMAN membres scopés',
        status: humanTotal === 0 ? 'ok' : 'warning',
        detail:
          humanTotal === 0
            ? 'Aucun membre scopé sans ressource HUMAN'
            : `${humanTotal} membre(s) à lier`,
        href: '/client/members',
      },
      {
        id: 'flag_module',
        label: 'Flags moteur V2',
        status: flagEnabled ? 'ok' : 'pending',
        detail: flagEnabled
          ? 'Au moins un module en rollout V2'
          : 'Aucun flag ACCESS_DECISION_V2_* actif',
      },
      {
        id: 'smoke',
        label: 'Smoke tests rollout',
        status: 'pending',
        detail: 'Vérifier le runbook migration org/scope',
        href: '/client/help/access-model',
      },
    ];
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
    category: AccessModelIssueCategory,
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
