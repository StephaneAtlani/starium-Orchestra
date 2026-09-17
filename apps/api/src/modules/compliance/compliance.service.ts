import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ComplianceAssessmentStatus,
  ComplianceCampaignStatus,
  ComplianceContributionStatus,
  ComplianceNaRequestStatus,
  Prisma,
  ProjectRiskCriticality,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { AuditContext } from '../budget-management/types/audit-context';
import {
  COMPLIANCE_AUDIT_ACTION,
  COMPLIANCE_AUDIT_RESOURCE_TYPE,
} from './compliance-audit.constants';
import { CreateComplianceFrameworkDto } from './dto/create-compliance-framework.dto';
import { UpdateComplianceFrameworkDto } from './dto/update-compliance-framework.dto';
import { CreateComplianceRequirementDto } from './dto/create-compliance-requirement.dto';
import { CreateComplianceEvidenceDto, ComplianceEvidenceKindDto } from './dto/create-compliance-evidence.dto';
import { PatchComplianceStatusDto } from './dto/patch-compliance-status.dto';
import { ListComplianceRequirementsQueryDto } from './dto/list-compliance-requirements.query.dto';
import { ListComplianceStatusQueryDto } from './dto/list-compliance-status.query.dto';
import { CreateComplianceCampaignDto } from './dto/create-compliance-campaign.dto';
import { CloseComplianceCampaignDto } from './dto/close-compliance-campaign.dto';
import { CreateComplianceCampaignSnapshotDto } from './dto/create-compliance-campaign-snapshot.dto';
import {
  ConfirmCampaignEvaluationsImportDto,
  PreviewCampaignEvaluationsImportDto,
} from './dto/campaign-evaluations-import.dto';
import {
  RequestComplianceNaDto,
  ReviewComplianceNaDto,
} from './dto/compliance-na-request.dto';
import {
  CreateComplianceContributionDto,
  PatchComplianceContributionDto,
} from './dto/compliance-contribution.dto';
import { deriveComplianceFamilyLabel } from './compliance-family-label';
import {
  CAMPAIGN_EVAL_IMPORT_TEMPLATE,
  fingerprintImportRows,
  parseEvaluationsCsv,
} from './campaign-evaluations-import';
import { buildCampaignSnapshotZip } from './campaign-snapshot-zip';

type PlatformAuditMeta = {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
};

export type ComplianceEvidenceKind = 'URL' | 'OBSERVATION' | 'FILE';

/** Dérive le kind d’une preuve stockée (pas de colonne Prisma en V1). */
export function deriveComplianceEvidenceKind(row: {
  url: string | null;
  fileId: string | null;
  description: string | null;
}): ComplianceEvidenceKind {
  if (row.url?.trim()) return 'URL';
  if (row.fileId?.trim()) return 'FILE';
  return 'OBSERVATION';
}

/** Une preuve justifie un conforme si URL, fichier, ou observation (description). */
export function evidenceJustifiesCompliance(row: {
  url: string | null;
  fileId: string | null;
  description: string | null;
}): boolean {
  return Boolean(
    row.url?.trim() || row.fileId?.trim() || row.description?.trim(),
  );
}

/** Avancement d'un référentiel — `GET /compliance/frameworks/summary`. */
export interface ComplianceFrameworkSummary {
  id: string;
  name: string;
  version: string;
  isActive: boolean;
  nextAuditAt: Date | null;
  requirementCount: number;
  compliantCount: number;
  partiallyCompliantCount: number;
  nonCompliantCount: number;
  notApplicableCount: number;
  notAssessedCount: number;
  /** Exigences comptées au dénominateur du taux (hors N/A et non évaluées). */
  evaluatedCount: number;
  /** Conformes / évaluées, en % ; `null` si aucune évaluation. */
  compliancePercent: number | null;
}

export type ComplianceUiStatus =
  | ComplianceAssessmentStatus
  | 'NOT_ASSESSED';

export interface ComplianceFrameworkDomainSummary {
  key: string;
  label: string;
  requirementCount: number;
  compliantCount: number;
  partiallyCompliantCount: number;
  nonCompliantCount: number;
  notApplicableCount: number;
  notAssessedCount: number;
  applicableCount: number;
  compliancePercent: number | null;
}

export interface ComplianceFrameworkOverviewRequirement {
  id: string;
  code: string;
  title: string;
  category: string | null;
  status: ComplianceUiStatus;
  evidenceCount: number;
  linkedRiskCount: number;
}

export interface ComplianceFrameworkOverview {
  framework: {
    id: string;
    name: string;
    version: string;
    isActive: boolean;
    nextAuditAt: Date | null;
  };
  requirementCount: number;
  compliantCount: number;
  partiallyCompliantCount: number;
  nonCompliantCount: number;
  notApplicableCount: number;
  notAssessedCount: number;
  applicableCount: number;
  compliancePercent: number | null;
  domains: ComplianceFrameworkDomainSummary[];
  requirements: ComplianceFrameworkOverviewRequirement[];
  remediation: ComplianceFrameworkOverviewRequirement[];
}

function emptyStatusBucket() {
  return {
    compliantCount: 0,
    partiallyCompliantCount: 0,
    nonCompliantCount: 0,
    notApplicableCount: 0,
    notAssessedCount: 0,
  };
}

function bumpStatusBucket(
  bucket: ReturnType<typeof emptyStatusBucket>,
  status: ComplianceAssessmentStatus | undefined,
) {
  if (!status) {
    bucket.notAssessedCount += 1;
    return;
  }
  switch (status) {
    case ComplianceAssessmentStatus.COMPLIANT:
      bucket.compliantCount += 1;
      break;
    case ComplianceAssessmentStatus.PARTIALLY_COMPLIANT:
      bucket.partiallyCompliantCount += 1;
      break;
    case ComplianceAssessmentStatus.NON_COMPLIANT:
      bucket.nonCompliantCount += 1;
      break;
    case ComplianceAssessmentStatus.NOT_APPLICABLE:
      bucket.notApplicableCount += 1;
      break;
  }
}

function countsToApplicable(bucket: ReturnType<typeof emptyStatusBucket>) {
  const n =
    bucket.compliantCount +
    bucket.partiallyCompliantCount +
    bucket.nonCompliantCount +
    bucket.notApplicableCount +
    bucket.notAssessedCount;
  const applicableCount = n - bucket.notApplicableCount - bucket.notAssessedCount;
  return {
    requirementCount: n,
    applicableCount,
    compliancePercent:
      applicableCount > 0
        ? Math.round((100 * bucket.compliantCount) / applicableCount)
        : null,
  };
}

const UNCATEGORIZED_DOMAIN_KEY = '__uncategorized__';
const UNCATEGORIZED_DOMAIN_LABEL = 'Sans domaine';

@Injectable()
export class ComplianceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async listFrameworks(clientId: string) {
    const rows = await this.prisma.complianceFramework.findMany({
      where: { clientId },
      include: { _count: { select: { requirements: true } } },
      orderBy: [{ name: 'asc' }, { version: 'asc' }],
    });
    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.id);
    const categoryPairs = await this.prisma.complianceRequirement.groupBy({
      by: ['frameworkId', 'category'],
      where: {
        frameworkId: { in: ids },
        AND: [{ category: { not: null } }, { category: { not: '' } }],
      },
    });
    const domainCountByFw = new Map<string, number>();
    for (const pair of categoryPairs) {
      if (!pair.category?.trim()) continue;
      domainCountByFw.set(
        pair.frameworkId,
        (domainCountByFw.get(pair.frameworkId) ?? 0) + 1,
      );
    }

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      version: r.version,
      description: r.description,
      provider: r.provider,
      isActive: r.isActive,
      nextAuditAt: r.nextAuditAt,
      requirementCount: r._count.requirements,
      domainCount: domainCountByFw.get(r.id) ?? 0,
      familyLabel: deriveComplianceFamilyLabel({
        name: r.name,
        provider: r.provider,
        sourceLibraryPath: r.sourceLibraryPath,
      }),
    }));
  }

  /**
   * Avancement par référentiel — cartes « Référentiels réglementaires » de `/compliance`.
   *
   * `compliancePercent` suit la même convention que `dashboard()` : conformes / évalués
   * (hors NOT_APPLICABLE), `null` si aucune exigence n'a encore été évaluée.
   */
  async frameworksSummary(clientId: string): Promise<ComplianceFrameworkSummary[]> {
    const frameworks = await this.prisma.complianceFramework.findMany({
      where: { clientId, isActive: true },
      orderBy: [{ name: 'asc' }, { version: 'asc' }],
      select: {
        id: true,
        name: true,
        version: true,
        isActive: true,
        nextAuditAt: true,
      },
    });
    if (frameworks.length === 0) return [];

    const requirements = await this.prisma.complianceRequirement.findMany({
      where: { frameworkId: { in: frameworks.map((f) => f.id) } },
      select: { id: true, frameworkId: true },
    });

    const statuses = await this.prisma.complianceStatus.findMany({
      where: { clientId, requirementId: { in: requirements.map((r) => r.id) } },
      select: { requirementId: true, status: true },
    });
    const statusByRequirement = new Map(statuses.map((s) => [s.requirementId, s.status]));

    const requirementsByFramework = new Map<string, string[]>();
    for (const requirement of requirements) {
      const bucket = requirementsByFramework.get(requirement.frameworkId);
      if (bucket) bucket.push(requirement.id);
      else requirementsByFramework.set(requirement.frameworkId, [requirement.id]);
    }

    return frameworks.map((framework) => {
      const requirementIds = requirementsByFramework.get(framework.id) ?? [];
      let compliantCount = 0;
      let partiallyCompliantCount = 0;
      let nonCompliantCount = 0;
      let notApplicableCount = 0;
      let notAssessedCount = 0;

      for (const requirementId of requirementIds) {
        const status = statusByRequirement.get(requirementId);
        if (!status) {
          notAssessedCount += 1;
          continue;
        }
        switch (status) {
          case ComplianceAssessmentStatus.COMPLIANT:
            compliantCount += 1;
            break;
          case ComplianceAssessmentStatus.PARTIALLY_COMPLIANT:
            partiallyCompliantCount += 1;
            break;
          case ComplianceAssessmentStatus.NON_COMPLIANT:
            nonCompliantCount += 1;
            break;
          case ComplianceAssessmentStatus.NOT_APPLICABLE:
            notApplicableCount += 1;
            break;
        }
      }

      const evaluatedCount = compliantCount + partiallyCompliantCount + nonCompliantCount;

      return {
        id: framework.id,
        name: framework.name,
        version: framework.version,
        isActive: framework.isActive,
        nextAuditAt: framework.nextAuditAt,
        requirementCount: requirementIds.length,
        compliantCount,
        partiallyCompliantCount,
        nonCompliantCount,
        notApplicableCount,
        notAssessedCount,
        evaluatedCount,
        compliancePercent:
          evaluatedCount > 0 ? Math.round((100 * compliantCount) / evaluatedCount) : null,
      } satisfies ComplianceFrameworkSummary;
    });
  }

  /**
   * Fiche détail référentiel (COMP.UX.1–3) : counts, domaines (category),
   * exigences + sous-ensemble remédiation (Partiel / Écart).
   */
  async getFrameworkOverview(
    clientId: string,
    frameworkId: string,
  ): Promise<ComplianceFrameworkOverview> {
    const framework = await this.prisma.complianceFramework.findFirst({
      where: { id: frameworkId, clientId },
      select: {
        id: true,
        name: true,
        version: true,
        isActive: true,
        nextAuditAt: true,
      },
    });
    if (!framework) throw new NotFoundException('Référentiel introuvable');

    const requirements = await this.prisma.complianceRequirement.findMany({
      where: { frameworkId },
      select: {
        id: true,
        code: true,
        title: true,
        category: true,
        sortOrder: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });

    const requirementIds = requirements.map((r) => r.id);
    const [statuses, evidenceGroups, riskGroups] = await Promise.all([
      requirementIds.length === 0
        ? Promise.resolve([])
        : this.prisma.complianceStatus.findMany({
            where: { clientId, requirementId: { in: requirementIds } },
            select: { requirementId: true, status: true },
          }),
      requirementIds.length === 0
        ? Promise.resolve([])
        : this.prisma.complianceEvidence.groupBy({
            by: ['requirementId'],
            where: { clientId, requirementId: { in: requirementIds } },
            _count: { _all: true },
          }),
      requirementIds.length === 0
        ? Promise.resolve([])
        : this.prisma.projectRisk.groupBy({
            by: ['complianceRequirementId'],
            where: {
              clientId,
              complianceRequirementId: { in: requirementIds },
            },
            _count: { _all: true },
          }),
    ]);

    const statusByRequirement = new Map(
      statuses.map((s) => [s.requirementId, s.status]),
    );
    const evidenceCountByRequirement = new Map(
      evidenceGroups.map((g) => [g.requirementId, g._count._all]),
    );
    const riskCountByRequirement = new Map(
      riskGroups
        .filter((g) => g.complianceRequirementId != null)
        .map((g) => [g.complianceRequirementId as string, g._count._all]),
    );

    const global = emptyStatusBucket();
    const domainBuckets = new Map<
      string,
      { label: string; bucket: ReturnType<typeof emptyStatusBucket> }
    >();

    const overviewRequirements: ComplianceFrameworkOverviewRequirement[] =
      requirements.map((req) => {
        const st = statusByRequirement.get(req.id);
        bumpStatusBucket(global, st);

        const cat = req.category?.trim() ?? '';
        const domainKey = cat || UNCATEGORIZED_DOMAIN_KEY;
        const domainLabel = cat || UNCATEGORIZED_DOMAIN_LABEL;
        let domain = domainBuckets.get(domainKey);
        if (!domain) {
          domain = { label: domainLabel, bucket: emptyStatusBucket() };
          domainBuckets.set(domainKey, domain);
        }
        bumpStatusBucket(domain.bucket, st);

        const uiStatus: ComplianceUiStatus = st ?? 'NOT_ASSESSED';
        return {
          id: req.id,
          code: req.code,
          title: req.title,
          category: req.category,
          status: uiStatus,
          evidenceCount: evidenceCountByRequirement.get(req.id) ?? 0,
          linkedRiskCount: riskCountByRequirement.get(req.id) ?? 0,
        };
      });

    const domains: ComplianceFrameworkDomainSummary[] = Array.from(
      domainBuckets.entries(),
    )
      .map(([key, { label, bucket }]) => {
        const derived = countsToApplicable(bucket);
        return {
          key,
          label,
          ...bucket,
          ...derived,
        };
      })
      .sort((a, b) => {
        if (a.key === UNCATEGORIZED_DOMAIN_KEY) return 1;
        if (b.key === UNCATEGORIZED_DOMAIN_KEY) return -1;
        return a.label.localeCompare(b.label, 'fr');
      });

    const derivedGlobal = countsToApplicable(global);
    const remediation = overviewRequirements.filter(
      (r) =>
        r.status === ComplianceAssessmentStatus.PARTIALLY_COMPLIANT ||
        r.status === ComplianceAssessmentStatus.NON_COMPLIANT,
    );

    return {
      framework,
      ...global,
      ...derivedGlobal,
      domains,
      requirements: overviewRequirements,
      remediation,
    };
  }

  async createFramework(
    clientId: string,
    dto: CreateComplianceFrameworkDto,
    context?: AuditContext,
  ) {
    const row = await this.prisma.complianceFramework.create({
      data: {
        clientId,
        name: dto.name.trim(),
        version: dto.version.trim(),
        isActive: dto.isActive ?? true,
        nextAuditAt: dto.nextAuditAt ? new Date(dto.nextAuditAt) : null,
      },
    });
    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: COMPLIANCE_AUDIT_ACTION.FRAMEWORK_CREATED,
      resourceType: COMPLIANCE_AUDIT_RESOURCE_TYPE.COMPLIANCE_FRAMEWORK,
      resourceId: row.id,
      newValue: { name: row.name, version: row.version, isActive: row.isActive },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
    return row;
  }

  private async assertFrameworkScope(
    clientId: string,
    frameworkId: string,
  ): Promise<void> {
    const fw = await this.prisma.complianceFramework.findFirst({
      where: { id: frameworkId, clientId },
      select: { id: true },
    });
    if (!fw) {
      throw new NotFoundException('Référentiel introuvable');
    }
  }

  async listRequirements(
    clientId: string,
    query: ListComplianceRequirementsQueryDto,
  ) {
    const where: Prisma.ComplianceRequirementWhereInput = {
      framework: { clientId },
      ...(query.frameworkId
        ? { frameworkId: query.frameworkId }
        : {}),
    };
    if (query.frameworkId) {
      await this.assertFrameworkScope(clientId, query.frameworkId);
    }
    return this.prisma.complianceRequirement.findMany({
      where,
      include: {
        framework: { select: { id: true, name: true, version: true, isActive: true } },
        statuses: {
          where: { clientId },
          take: 1,
        },
        evidences: {
          where: { clientId },
          select: { id: true },
        },
      },
      orderBy: [{ frameworkId: 'asc' }, { sortOrder: 'asc' }, { code: 'asc' }],
    });
  }

  async getRequirementDetail(clientId: string, requirementId: string) {
    const req = await this.prisma.complianceRequirement.findFirst({
      where: { id: requirementId, framework: { clientId } },
      include: {
        framework: true,
      },
    });
    if (!req) throw new NotFoundException('Exigence introuvable');

    const [status, evidences, linkedRisks, naRequest, contributions] =
      await Promise.all([
      this.prisma.complianceStatus.findUnique({
        where: {
          clientId_requirementId: { clientId, requirementId },
        },
      }),
      this.prisma.complianceEvidence.findMany({
        where: { clientId, requirementId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.projectRisk.findMany({
        where: { clientId, complianceRequirementId: requirementId },
        select: {
          id: true,
          projectId: true,
          code: true,
          title: true,
          criticalityLevel: true,
          status: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 100,
      }),
      this.prisma.complianceNaRequest.findUnique({
        where: {
          clientId_requirementId: { clientId, requirementId },
        },
      }),
      this.prisma.complianceContribution.findMany({
        where: { clientId, requirementId },
        orderBy: { createdAt: 'desc' },
        include: {
          assignee: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        take: 50,
      }),
    ]);

    return {
      requirement: req,
      status: status ?? null,
      naRequest: naRequest ?? null,
      contributions: contributions.map((c) => this.mapContribution(c)),
      evidences: evidences.map((e) => ({
        ...e,
        kind: deriveComplianceEvidenceKind(e),
      })),
      linkedRisks,
      linkedRiskCount: linkedRisks.length,
    };
  }

  async createRequirement(
    clientId: string,
    dto: CreateComplianceRequirementDto,
    context?: AuditContext,
  ) {
    await this.assertFrameworkScope(clientId, dto.frameworkId);
    const dup = await this.prisma.complianceRequirement.findFirst({
      where: { frameworkId: dto.frameworkId, code: dto.code.trim() },
      select: { id: true },
    });
    if (dup) {
      throw new BadRequestException('Code exigence déjà utilisé dans ce référentiel');
    }
    const row = await this.prisma.complianceRequirement.create({
      data: {
        frameworkId: dto.frameworkId,
        code: dto.code.trim(),
        title: dto.title.trim(),
        description: dto.description?.trim() ?? null,
        category: dto.category?.trim() ?? null,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: COMPLIANCE_AUDIT_ACTION.REQUIREMENT_CREATED,
      resourceType: COMPLIANCE_AUDIT_RESOURCE_TYPE.COMPLIANCE_REQUIREMENT,
      resourceId: row.id,
      newValue: { frameworkId: row.frameworkId, code: row.code, title: row.title },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
    return row;
  }

  async listStatuses(clientId: string, query: ListComplianceStatusQueryDto) {
    const where: Prisma.ComplianceStatusWhereInput = {
      clientId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.frameworkId
        ? {
            requirement: {
              frameworkId: query.frameworkId,
              framework: { clientId },
            },
          }
        : {
            requirement: { framework: { clientId } },
          }),
    };
    if (query.frameworkId) {
      await this.assertFrameworkScope(clientId, query.frameworkId);
    }
    return this.prisma.complianceStatus.findMany({
      where,
      include: {
        requirement: {
          include: { framework: { select: { id: true, name: true, version: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    });
  }

  async patchStatus(
    clientId: string,
    statusId: string,
    dto: PatchComplianceStatusDto,
    context?: AuditContext,
  ) {
    const existing = await this.prisma.complianceStatus.findFirst({
      where: { id: statusId, clientId },
    });
    if (!existing) throw new NotFoundException('Statut introuvable');

    await this.assertEvaluationTransition(clientId, existing.requirementId, dto);

    const updated = await this.prisma.complianceStatus.update({
      where: { id: statusId },
      data: {
        status: dto.status,
        ...(dto.lastAssessmentDate !== undefined && {
          lastAssessmentDate: dto.lastAssessmentDate
            ? new Date(dto.lastAssessmentDate)
            : null,
        }),
        ...(dto.comment !== undefined && {
          comment: dto.comment === null ? null : dto.comment.trim(),
        }),
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: COMPLIANCE_AUDIT_ACTION.STATUS_UPDATED,
      resourceType: COMPLIANCE_AUDIT_RESOURCE_TYPE.COMPLIANCE_STATUS,
      resourceId: statusId,
      oldValue: {
        status: existing.status,
        comment: existing.comment,
        lastAssessmentDate: existing.lastAssessmentDate?.toISOString() ?? null,
      },
      newValue: {
        status: updated.status,
        comment: updated.comment,
        lastAssessmentDate: updated.lastAssessmentDate?.toISOString() ?? null,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
    return updated;
  }

  /** Upsert statut pour une exigence (création si absent). */
  async upsertStatusForRequirement(
    clientId: string,
    requirementId: string,
    dto: PatchComplianceStatusDto,
    context?: AuditContext,
  ) {
    const req = await this.prisma.complianceRequirement.findFirst({
      where: { id: requirementId, framework: { clientId } },
      select: { id: true },
    });
    if (!req) throw new NotFoundException('Exigence introuvable');

    const existing = await this.prisma.complianceStatus.findUnique({
      where: {
        clientId_requirementId: { clientId, requirementId },
      },
    });
    if (existing) {
      return this.patchStatus(clientId, existing.id, dto, context);
    }

    await this.assertEvaluationTransition(clientId, requirementId, dto);

    const created = await this.prisma.complianceStatus.create({
      data: {
        clientId,
        requirementId,
        status: dto.status,
        lastAssessmentDate: dto.lastAssessmentDate
          ? new Date(dto.lastAssessmentDate)
          : null,
        comment: dto.comment?.trim() ?? null,
      },
    });
    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: COMPLIANCE_AUDIT_ACTION.STATUS_UPDATED,
      resourceType: COMPLIANCE_AUDIT_RESOURCE_TYPE.COMPLIANCE_STATUS,
      resourceId: created.id,
      newValue: {
        status: created.status,
        requirementId,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
    return created;
  }

  /**
   * Règles COMP-001-A : commentaire obligatoire ; conforme ⇒ ≥1 preuve/observation.
   * Appelé avant create/update de statut.
   */
  async assertEvaluationTransition(
    clientId: string,
    requirementId: string,
    dto: PatchComplianceStatusDto,
  ): Promise<void> {
    if (dto.status === ComplianceAssessmentStatus.NOT_APPLICABLE) {
      throw new BadRequestException(
        'La non-applicabilité passe par le circuit de demande / approbation (pas d’évaluation directe)',
      );
    }

    const comment = dto.comment?.trim() ?? '';
    if (!comment) {
      throw new BadRequestException(
        'Un commentaire d’analyse est obligatoire pour enregistrer une évaluation',
      );
    }

    if (dto.status === ComplianceAssessmentStatus.COMPLIANT) {
      const evidences = await this.prisma.complianceEvidence.findMany({
        where: { clientId, requirementId },
        select: { url: true, fileId: true, description: true },
      });
      const hasJustifying = evidences.some(evidenceJustifiesCompliance);
      if (!hasJustifying) {
        throw new BadRequestException(
          'Un statut conforme exige au moins une preuve (URL, fichier ou observation) liée à l’exigence',
        );
      }
    }
  }

  async requestNotApplicable(
    clientId: string,
    requirementId: string,
    dto: RequestComplianceNaDto,
    context?: AuditContext,
  ) {
    const req = await this.prisma.complianceRequirement.findFirst({
      where: { id: requirementId, framework: { clientId } },
      select: { id: true },
    });
    if (!req) throw new NotFoundException('Exigence introuvable');

    const existingStatus = await this.prisma.complianceStatus.findUnique({
      where: { clientId_requirementId: { clientId, requirementId } },
    });
    if (existingStatus?.status === ComplianceAssessmentStatus.NOT_APPLICABLE) {
      throw new BadRequestException('Exigence déjà non applicable');
    }

    const existing = await this.prisma.complianceNaRequest.findUnique({
      where: { clientId_requirementId: { clientId, requirementId } },
    });
    if (existing?.status === ComplianceNaRequestStatus.PENDING) {
      throw new BadRequestException(
        'Une demande de non-applicabilité est déjà en attente',
      );
    }

    const justification = dto.justification.trim();
    const row = existing
      ? await this.prisma.complianceNaRequest.update({
          where: { id: existing.id },
          data: {
            status: ComplianceNaRequestStatus.PENDING,
            justification,
            requestedByUserId: context?.actorUserId ?? null,
            requestedAt: new Date(),
            reviewedByUserId: null,
            reviewedAt: null,
            reviewNote: null,
          },
        })
      : await this.prisma.complianceNaRequest.create({
          data: {
            clientId,
            requirementId,
            status: ComplianceNaRequestStatus.PENDING,
            justification,
            requestedByUserId: context?.actorUserId ?? null,
          },
        });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: COMPLIANCE_AUDIT_ACTION.NA_REQUESTED,
      resourceType: COMPLIANCE_AUDIT_RESOURCE_TYPE.COMPLIANCE_NA_REQUEST,
      resourceId: row.id,
      newValue: { requirementId, justification },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return row;
  }

  async approveNotApplicable(
    clientId: string,
    requirementId: string,
    dto: ReviewComplianceNaDto,
    context?: AuditContext,
  ) {
    const na = await this.requirePendingNa(clientId, requirementId);
    const reviewNote = dto.reviewNote?.trim() || null;

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedNa = await tx.complianceNaRequest.update({
        where: { id: na.id },
        data: {
          status: ComplianceNaRequestStatus.APPROVED,
          reviewedByUserId: context?.actorUserId ?? null,
          reviewedAt: new Date(),
          reviewNote,
        },
      });

      const existing = await tx.complianceStatus.findUnique({
        where: { clientId_requirementId: { clientId, requirementId } },
      });
      const statusRow = existing
        ? await tx.complianceStatus.update({
            where: { id: existing.id },
            data: {
              status: ComplianceAssessmentStatus.NOT_APPLICABLE,
              comment: na.justification,
              lastAssessmentDate: new Date(),
            },
          })
        : await tx.complianceStatus.create({
            data: {
              clientId,
              requirementId,
              status: ComplianceAssessmentStatus.NOT_APPLICABLE,
              comment: na.justification,
              lastAssessmentDate: new Date(),
            },
          });

      return { updatedNa, statusRow };
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: COMPLIANCE_AUDIT_ACTION.NA_APPROVED,
      resourceType: COMPLIANCE_AUDIT_RESOURCE_TYPE.COMPLIANCE_NA_REQUEST,
      resourceId: result.updatedNa.id,
      oldValue: { status: na.status },
      newValue: {
        status: result.updatedNa.status,
        reviewNote,
        assessmentStatus: result.statusRow.status,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return result.updatedNa;
  }

  async rejectNotApplicable(
    clientId: string,
    requirementId: string,
    dto: ReviewComplianceNaDto,
    context?: AuditContext,
  ) {
    const na = await this.requirePendingNa(clientId, requirementId);
    const reviewNote = dto.reviewNote?.trim();
    if (!reviewNote) {
      throw new BadRequestException(
        'Un motif de refus est obligatoire',
      );
    }

    const updated = await this.prisma.complianceNaRequest.update({
      where: { id: na.id },
      data: {
        status: ComplianceNaRequestStatus.REJECTED,
        reviewedByUserId: context?.actorUserId ?? null,
        reviewedAt: new Date(),
        reviewNote,
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: COMPLIANCE_AUDIT_ACTION.NA_REJECTED,
      resourceType: COMPLIANCE_AUDIT_RESOURCE_TYPE.COMPLIANCE_NA_REQUEST,
      resourceId: updated.id,
      oldValue: { status: na.status },
      newValue: { status: updated.status, reviewNote },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return updated;
  }

  async cancelNotApplicableRequest(
    clientId: string,
    requirementId: string,
    context?: AuditContext,
  ) {
    const na = await this.requirePendingNa(clientId, requirementId);
    const updated = await this.prisma.complianceNaRequest.update({
      where: { id: na.id },
      data: {
        status: ComplianceNaRequestStatus.CANCELLED,
        reviewedByUserId: context?.actorUserId ?? null,
        reviewedAt: new Date(),
        reviewNote: 'Annulée par le demandeur',
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: COMPLIANCE_AUDIT_ACTION.NA_CANCELLED,
      resourceType: COMPLIANCE_AUDIT_RESOURCE_TYPE.COMPLIANCE_NA_REQUEST,
      resourceId: updated.id,
      oldValue: { status: na.status },
      newValue: { status: updated.status },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return updated;
  }

  private mapContribution(c: {
    id: string;
    requirementId: string;
    assigneeUserId: string;
    instruction: string;
    dueAt: Date | null;
    status: ComplianceContributionStatus;
    response: string | null;
    createdByUserId: string | null;
    createdAt: Date;
    updatedAt: Date;
    assignee?: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string;
    } | null;
  }) {
    const name = [c.assignee?.firstName, c.assignee?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    return {
      id: c.id,
      requirementId: c.requirementId,
      assigneeUserId: c.assigneeUserId,
      assigneeLabel: name || c.assignee?.email || 'Membre retiré',
      instruction: c.instruction,
      dueAt: c.dueAt,
      status: c.status,
      response: c.response,
      createdByUserId: c.createdByUserId,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  private async assertAssigneeOnClient(clientId: string, userId: string) {
    const cu = await this.prisma.clientUser.findFirst({
      where: { clientId, userId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!cu) {
      throw new BadRequestException(
        'Le destinataire doit être un membre actif du client',
      );
    }
  }

  async listContributions(
    clientId: string,
    opts?: { requirementId?: string; mineForUserId?: string },
  ) {
    const rows = await this.prisma.complianceContribution.findMany({
      where: {
        clientId,
        ...(opts?.requirementId ? { requirementId: opts.requirementId } : {}),
        ...(opts?.mineForUserId
          ? { assigneeUserId: opts.mineForUserId }
          : {}),
      },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
      include: {
        assignee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        requirement: {
          select: {
            id: true,
            code: true,
            title: true,
            framework: { select: { name: true, version: true } },
          },
        },
      },
      take: 200,
    });
    return rows.map((c) => ({
      ...this.mapContribution(c),
      requirementCode: c.requirement.code,
      requirementTitle: c.requirement.title,
      frameworkName: c.requirement.framework.name,
      frameworkVersion: c.requirement.framework.version,
    }));
  }

  async createContribution(
    clientId: string,
    dto: CreateComplianceContributionDto,
    context?: AuditContext,
  ) {
    const req = await this.prisma.complianceRequirement.findFirst({
      where: { id: dto.requirementId, framework: { clientId } },
      select: { id: true },
    });
    if (!req) throw new NotFoundException('Exigence introuvable');
    await this.assertAssigneeOnClient(clientId, dto.assigneeUserId);

    const row = await this.prisma.complianceContribution.create({
      data: {
        clientId,
        requirementId: dto.requirementId,
        assigneeUserId: dto.assigneeUserId,
        instruction: dto.instruction.trim(),
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        createdByUserId: context?.actorUserId ?? null,
      },
      include: {
        assignee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: COMPLIANCE_AUDIT_ACTION.CONTRIBUTION_CREATED,
      resourceType: COMPLIANCE_AUDIT_RESOURCE_TYPE.COMPLIANCE_CONTRIBUTION,
      resourceId: row.id,
      newValue: {
        requirementId: row.requirementId,
        assigneeUserId: row.assigneeUserId,
        status: row.status,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return this.mapContribution(row);
  }

  async patchContribution(
    clientId: string,
    id: string,
    dto: PatchComplianceContributionDto,
    context?: AuditContext,
  ) {
    const existing = await this.prisma.complianceContribution.findFirst({
      where: { id, clientId },
    });
    if (!existing) throw new NotFoundException('Contribution introuvable');

    if (dto.assigneeUserId) {
      await this.assertAssigneeOnClient(clientId, dto.assigneeUserId);
    }

    const actorId = context?.actorUserId;
    const isAssignee = actorId && actorId === existing.assigneeUserId;
    if (
      dto.status === ComplianceContributionStatus.SUBMITTED ||
      dto.response !== undefined
    ) {
      if (!isAssignee) {
        // pilote peut aussi saisir une réponse pour le compte — autorisé si update
      }
    }

    const updated = await this.prisma.complianceContribution.update({
      where: { id },
      data: {
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.response !== undefined && {
          response: dto.response === null ? null : dto.response.trim(),
        }),
        ...(dto.instruction !== undefined && {
          instruction: dto.instruction.trim(),
        }),
        ...(dto.dueAt !== undefined && {
          dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        }),
        ...(dto.assigneeUserId !== undefined && {
          assigneeUserId: dto.assigneeUserId,
        }),
      },
      include: {
        assignee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: COMPLIANCE_AUDIT_ACTION.CONTRIBUTION_UPDATED,
      resourceType: COMPLIANCE_AUDIT_RESOURCE_TYPE.COMPLIANCE_CONTRIBUTION,
      resourceId: updated.id,
      oldValue: {
        status: existing.status,
        assigneeUserId: existing.assigneeUserId,
      },
      newValue: {
        status: updated.status,
        assigneeUserId: updated.assigneeUserId,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return this.mapContribution(updated);
  }

  private async requirePendingNa(clientId: string, requirementId: string) {
    const req = await this.prisma.complianceRequirement.findFirst({
      where: { id: requirementId, framework: { clientId } },
      select: { id: true },
    });
    if (!req) throw new NotFoundException('Exigence introuvable');

    const na = await this.prisma.complianceNaRequest.findUnique({
      where: { clientId_requirementId: { clientId, requirementId } },
    });
    if (!na || na.status !== ComplianceNaRequestStatus.PENDING) {
      throw new BadRequestException(
        'Aucune demande de non-applicabilité en attente',
      );
    }
    return na;
  }

  async createEvidence(
    clientId: string,
    dto: CreateComplianceEvidenceDto,
    actorUserId: string | undefined,
    context?: AuditContext,
  ) {
    const url = dto.url?.trim() ?? '';
    const fileId = dto.fileId?.trim() ?? '';
    const description = dto.description?.trim() ?? '';
    const kind =
      dto.kind ??
      (url
        ? ComplianceEvidenceKindDto.URL
        : fileId
          ? ComplianceEvidenceKindDto.FILE
          : ComplianceEvidenceKindDto.OBSERVATION);

    if (kind === ComplianceEvidenceKindDto.URL && !url) {
      throw new BadRequestException('Une URL est requise pour une preuve de type URL');
    }
    if (kind === ComplianceEvidenceKindDto.FILE && !fileId) {
      throw new BadRequestException(
        'Une référence fichier est requise pour une preuve de type fichier',
      );
    }
    if (kind === ComplianceEvidenceKindDto.OBSERVATION && !description) {
      throw new BadRequestException(
        'Une observation (description) est requise pour une preuve de type observation',
      );
    }
    if (!url && !fileId && !description) {
      throw new BadRequestException(
        'Au moins une URL, une référence fichier ou une observation est requise',
      );
    }

    const req = await this.prisma.complianceRequirement.findFirst({
      where: { id: dto.requirementId, framework: { clientId } },
      select: { id: true },
    });
    if (!req) throw new NotFoundException('Exigence introuvable');

    const row = await this.prisma.complianceEvidence.create({
      data: {
        clientId,
        requirementId: dto.requirementId,
        name: dto.name.trim(),
        description: description || null,
        url: kind === ComplianceEvidenceKindDto.URL ? url : url || null,
        fileId: kind === ComplianceEvidenceKindDto.FILE ? fileId : fileId || null,
        createdByUserId: actorUserId ?? null,
      },
    });
    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: COMPLIANCE_AUDIT_ACTION.EVIDENCE_CREATED,
      resourceType: COMPLIANCE_AUDIT_RESOURCE_TYPE.COMPLIANCE_EVIDENCE,
      resourceId: row.id,
      newValue: {
        requirementId: row.requirementId,
        name: row.name,
        kind: deriveComplianceEvidenceKind(row),
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
    return { ...row, kind: deriveComplianceEvidenceKind(row) };
  }

  async dashboard(clientId: string) {
    const activeFw = await this.prisma.complianceFramework.findMany({
      where: { clientId, isActive: true },
      select: { id: true },
    });
    const fwIds = activeFw.map((f) => f.id);
    if (fwIds.length === 0) {
      return {
        totalRequirementsActiveFrameworks: 0,
        applicableCount: 0,
        compliancePercent: null as number | null,
        evaluatedCount: 0,
        compliantCount: 0,
        partiallyCompliantCount: 0,
        nonCompliantCount: 0,
        notAssessedRequirementCount: 0,
        notApplicableCount: 0,
        requirementsWithoutEvidence: 0,
        criticalRisksLinked: 0,
      };
    }

    const reqs = await this.prisma.complianceRequirement.findMany({
      where: { frameworkId: { in: fwIds } },
      select: { id: true },
    });
    const reqIds = reqs.map((r) => r.id);
    const totalReqs = reqIds.length;

    const statuses = await this.prisma.complianceStatus.findMany({
      where: { clientId, requirementId: { in: reqIds } },
    });
    const byReq = new Map(statuses.map((s) => [s.requirementId, s]));

    let compliantCount = 0;
    let partiallyCompliantCount = 0;
    let nonCompliantCount = 0;
    let notApplicableCount = 0;
    let evaluatedDenominator = 0;

    for (const rid of reqIds) {
      const s = byReq.get(rid);
      if (!s) continue;
      if (s.status === ComplianceAssessmentStatus.NOT_APPLICABLE) {
        notApplicableCount++;
        continue;
      }
      if (s.status === ComplianceAssessmentStatus.COMPLIANT) {
        evaluatedDenominator++;
        compliantCount++;
      } else if (s.status === ComplianceAssessmentStatus.PARTIALLY_COMPLIANT) {
        evaluatedDenominator++;
        partiallyCompliantCount++;
      } else if (s.status === ComplianceAssessmentStatus.NON_COMPLIANT) {
        evaluatedDenominator++;
        nonCompliantCount++;
      }
    }

    const notAssessedRequirementCount = reqIds.filter((id) => !byReq.has(id)).length;
    /** A = N - NA - U (applicables) — COMP-001-A. */
    const applicableCount = totalReqs - notApplicableCount - notAssessedRequirementCount;

    const evidenceCounts = await this.prisma.complianceEvidence.groupBy({
      by: ['requirementId'],
      where: { clientId, requirementId: { in: reqIds } },
      _count: { id: true },
    });
    const withEv = new Set(evidenceCounts.map((e) => e.requirementId));
    const requirementsWithoutEvidence = reqIds.filter((id) => !withEv.has(id)).length;

    const criticalRisksLinked = await this.prisma.projectRisk.count({
      where: {
        clientId,
        complianceRequirementId: { not: null },
        criticalityLevel: ProjectRiskCriticality.CRITICAL,
      },
    });

    /** C / A — null si A = 0 (jamais 100 % fictif). */
    const compliancePercent =
      applicableCount > 0
        ? Math.round((100 * compliantCount) / applicableCount)
        : null;

    return {
      totalRequirementsActiveFrameworks: totalReqs,
      applicableCount,
      compliancePercent,
      evaluatedCount: evaluatedDenominator,
      compliantCount,
      partiallyCompliantCount,
      nonCompliantCount,
      notAssessedRequirementCount,
      notApplicableCount,
      requirementsWithoutEvidence,
      criticalRisksLinked,
    };
  }

  // --- Catalogue plateforme (clientId null) ---

  async listPlatformFrameworks(includeArchived = false) {
    const rows = await this.prisma.complianceFramework.findMany({
      where: {
        clientId: null,
        ...(includeArchived ? {} : { archivedAt: null }),
      },
      include: {
        _count: { select: { requirements: true } },
      },
      orderBy: [{ name: 'asc' }, { version: 'asc' }],
    });
    return rows.map((r) => ({
      ...r,
      familyLabel: deriveComplianceFamilyLabel({
        name: r.name,
        provider: r.provider,
        sourceLibraryPath: r.sourceLibraryPath,
      }),
    }));
  }

  async getPlatformFramework(id: string) {
    const fw = await this.prisma.complianceFramework.findFirst({
      where: { id, clientId: null },
      include: {
        requirements: { orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }] },
      },
    });
    if (!fw) throw new NotFoundException('Référentiel plateforme introuvable');
    return fw;
  }

  async createPlatformFramework(
    dto: CreateComplianceFrameworkDto,
    actorUserId?: string,
    meta?: PlatformAuditMeta,
  ) {
    const name = dto.name.trim();
    const version = dto.version.trim();
    const existing = await this.prisma.complianceFramework.findFirst({
      where: { clientId: null, name, version },
    });
    if (existing) {
      throw new ConflictException(
        `Le référentiel « ${name} » (${version}) existe déjà dans le catalogue plateforme`,
      );
    }
    const row = await this.prisma.complianceFramework.create({
      data: {
        clientId: null,
        name,
        version,
        isActive: dto.isActive ?? true,
        nextAuditAt: dto.nextAuditAt ? new Date(dto.nextAuditAt) : null,
      },
    });
    await this.auditLogs.createPlatform({
      userId: actorUserId,
      action: COMPLIANCE_AUDIT_ACTION.FRAMEWORK_CREATED,
      resourceType: COMPLIANCE_AUDIT_RESOURCE_TYPE.COMPLIANCE_FRAMEWORK,
      resourceId: row.id,
      newValue: { name: row.name, version: row.version, scope: 'platform' },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });
    return row;
  }

  async updatePlatformFramework(
    id: string,
    dto: UpdateComplianceFrameworkDto,
    actorUserId?: string,
    meta?: PlatformAuditMeta,
  ) {
    const current = await this.prisma.complianceFramework.findFirst({
      where: { id, clientId: null },
    });
    if (!current) throw new NotFoundException('Référentiel plateforme introuvable');

    if (dto.name !== undefined || dto.version !== undefined) {
      const name = (dto.name ?? current.name).trim();
      const version = (dto.version ?? current.version).trim();
      const clash = await this.prisma.complianceFramework.findFirst({
        where: {
          clientId: null,
          name,
          version,
          NOT: { id },
        },
      });
      if (clash) {
        throw new ConflictException(
          `Le référentiel « ${name} » (${version}) existe déjà dans le catalogue`,
        );
      }
    }

    const updated = await this.prisma.complianceFramework.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.version !== undefined ? { version: dto.version.trim() } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.nextAuditAt !== undefined
          ? {
              nextAuditAt: dto.nextAuditAt ? new Date(dto.nextAuditAt) : null,
            }
          : {}),
      },
    });

    await this.auditLogs.createPlatform({
      userId: actorUserId,
      action: COMPLIANCE_AUDIT_ACTION.FRAMEWORK_UPDATED,
      resourceType: COMPLIANCE_AUDIT_RESOURCE_TYPE.COMPLIANCE_FRAMEWORK,
      resourceId: updated.id,
      oldValue: { name: current.name, version: current.version },
      newValue: { name: updated.name, version: updated.version },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });
    return updated;
  }

  async archivePlatformFramework(
    id: string,
    actorUserId?: string,
    meta?: PlatformAuditMeta,
  ) {
    const current = await this.prisma.complianceFramework.findFirst({
      where: { id, clientId: null },
    });
    if (!current) throw new NotFoundException('Référentiel plateforme introuvable');
    if (current.archivedAt) return current;

    const now = new Date();
    const updated = await this.prisma.complianceFramework.update({
      where: { id },
      data: { isActive: false, archivedAt: now },
    });
    await this.auditLogs.createPlatform({
      userId: actorUserId,
      action: COMPLIANCE_AUDIT_ACTION.FRAMEWORK_ARCHIVED,
      resourceType: COMPLIANCE_AUDIT_RESOURCE_TYPE.COMPLIANCE_FRAMEWORK,
      resourceId: id,
      oldValue: { name: current.name, version: current.version },
      newValue: { archivedAt: now.toISOString() },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });
    return updated;
  }

  async restorePlatformFramework(
    id: string,
    actorUserId?: string,
    meta?: PlatformAuditMeta,
  ) {
    const current = await this.prisma.complianceFramework.findFirst({
      where: { id, clientId: null },
    });
    if (!current) throw new NotFoundException('Référentiel plateforme introuvable');
    if (!current.archivedAt) return current;

    const updated = await this.prisma.complianceFramework.update({
      where: { id },
      data: { isActive: true, archivedAt: null },
    });
    await this.auditLogs.createPlatform({
      userId: actorUserId,
      action: COMPLIANCE_AUDIT_ACTION.FRAMEWORK_RESTORED,
      resourceType: COMPLIANCE_AUDIT_RESOURCE_TYPE.COMPLIANCE_FRAMEWORK,
      resourceId: id,
      newValue: { name: updated.name, version: updated.version },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });
    return updated;
  }

  async createPlatformRequirement(
    frameworkId: string,
    dto: CreateComplianceRequirementDto,
    actorUserId?: string,
    meta?: PlatformAuditMeta,
  ) {
    const fw = await this.prisma.complianceFramework.findFirst({
      where: { id: frameworkId, clientId: null },
    });
    if (!fw) throw new NotFoundException('Référentiel plateforme introuvable');
    if (fw.archivedAt) {
      throw new ConflictException(
        'Impossible d’ajouter une exigence à un référentiel archivé',
      );
    }

    const code = dto.code.trim();
    const dup = await this.prisma.complianceRequirement.findFirst({
      where: { frameworkId, code },
    });
    if (dup) {
      throw new ConflictException('Code exigence déjà utilisé dans ce référentiel');
    }

    const row = await this.prisma.complianceRequirement.create({
      data: {
        frameworkId,
        code,
        title: dto.title.trim(),
        description: dto.description?.trim() ?? null,
        category: dto.category?.trim() ?? null,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    await this.auditLogs.createPlatform({
      userId: actorUserId,
      action: COMPLIANCE_AUDIT_ACTION.REQUIREMENT_CREATED,
      resourceType: COMPLIANCE_AUDIT_RESOURCE_TYPE.COMPLIANCE_REQUIREMENT,
      resourceId: row.id,
      newValue: {
        frameworkId,
        code: row.code,
        title: row.title,
        scope: 'platform',
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });
    return row;
  }

  /**
   * Active / désactive une instance client (conserve historiques & évaluations).
   * Les KPI / cartes dashboard ne comptent que les référentiels `isActive`.
   */
  async setClientFrameworkActive(
    clientId: string,
    frameworkId: string,
    isActive: boolean,
    context?: AuditContext,
  ) {
    const current = await this.prisma.complianceFramework.findFirst({
      where: { id: frameworkId, clientId },
    });
    if (!current) {
      throw new NotFoundException('Référentiel introuvable');
    }
    if (current.isActive === isActive) {
      return current;
    }

    const updated = await this.prisma.complianceFramework.update({
      where: { id: current.id },
      data: { isActive },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: COMPLIANCE_AUDIT_ACTION.FRAMEWORK_UPDATED,
      resourceType: COMPLIANCE_AUDIT_RESOURCE_TYPE.COMPLIANCE_FRAMEWORK,
      resourceId: updated.id,
      oldValue: { isActive: current.isActive, name: current.name, version: current.version },
      newValue: { isActive: updated.isActive, name: updated.name, version: updated.version },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return updated;
  }

  /**
   * Active un référentiel catalogue plateforme pour le client :
   * copie framework + exigences (instance client isolée pour les évaluations).
   * Si une instance inactive existe déjà (même name+version), la réactive sans recopier.
   */
  async activatePlatformFrameworkForClient(
    clientId: string,
    platformFrameworkId: string,
    context?: AuditContext,
  ) {
    const source = await this.prisma.complianceFramework.findFirst({
      where: {
        id: platformFrameworkId,
        clientId: null,
        archivedAt: null,
        isActive: true,
      },
      include: { requirements: true },
    });
    if (!source) {
      throw new NotFoundException('Référentiel catalogue introuvable ou archivé');
    }

    const existing = await this.prisma.complianceFramework.findFirst({
      where: {
        clientId,
        name: source.name,
        version: source.version,
      },
    });
    if (existing) {
      if (existing.isActive) {
        throw new ConflictException(
          `« ${source.name} » (${source.version}) est déjà activé pour ce client`,
        );
      }
      return this.setClientFrameworkActive(clientId, existing.id, true, context);
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const fw = await tx.complianceFramework.create({
        data: {
          clientId,
          name: source.name,
          version: source.version,
          description: source.description,
          provider: source.provider,
          isActive: true,
        },
      });
      if (source.requirements.length > 0) {
        await tx.complianceRequirement.createMany({
          data: source.requirements.map((r) => ({
            frameworkId: fw.id,
            code: r.code,
            title: r.title,
            description: r.description,
            category: r.category,
            sortOrder: r.sortOrder,
          })),
        });
      }
      return fw;
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: COMPLIANCE_AUDIT_ACTION.FRAMEWORK_ACTIVATED,
      resourceType: COMPLIANCE_AUDIT_RESOURCE_TYPE.COMPLIANCE_FRAMEWORK,
      resourceId: created.id,
      newValue: {
        name: created.name,
        version: created.version,
        fromPlatformFrameworkId: source.id,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return created;
  }

  /** Catalogue proposé (actifs non archivés) — lecture client. */
  async listProposedPlatformFrameworks() {
    const rows = await this.prisma.complianceFramework.findMany({
      where: { clientId: null, archivedAt: null, isActive: true },
      include: { _count: { select: { requirements: true } } },
      orderBy: [{ name: 'asc' }, { version: 'asc' }],
    });
    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.id);
    const categoryPairs = await this.prisma.complianceRequirement.groupBy({
      by: ['frameworkId', 'category'],
      where: {
        frameworkId: { in: ids },
        AND: [{ category: { not: null } }, { category: { not: '' } }],
      },
    });
    const domainCountByFw = new Map<string, number>();
    for (const pair of categoryPairs) {
      if (!pair.category?.trim()) continue;
      domainCountByFw.set(
        pair.frameworkId,
        (domainCountByFw.get(pair.frameworkId) ?? 0) + 1,
      );
    }

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      version: r.version,
      description: r.description,
      provider: r.provider,
      requirementCount: r._count.requirements,
      domainCount: domainCountByFw.get(r.id) ?? 0,
      familyLabel: deriveComplianceFamilyLabel({
        name: r.name,
        provider: r.provider,
        sourceLibraryPath: r.sourceLibraryPath,
      }),
      scope: 'platform' as const,
    }));
  }

  // --- COMP.V2 Campagnes / instantanés ---

  async listCampaigns(clientId: string, frameworkId?: string) {
    return this.prisma.complianceCampaign.findMany({
      where: {
        clientId,
        ...(frameworkId ? { frameworkId } : {}),
      },
      orderBy: [{ createdAt: 'desc' }],
      include: {
        _count: { select: { snapshots: true } },
        framework: { select: { id: true, name: true, version: true } },
      },
    });
  }

  async getCampaign(clientId: string, id: string) {
    const campaign = await this.prisma.complianceCampaign.findFirst({
      where: { id, clientId },
      include: {
        _count: { select: { snapshots: true } },
        framework: { select: { id: true, name: true, version: true } },
        snapshots: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            label: true,
            createdAt: true,
            createdByUserId: true,
          },
        },
      },
    });
    if (!campaign) throw new NotFoundException('Campagne introuvable');
    return campaign;
  }

  async createCampaign(
    clientId: string,
    dto: CreateComplianceCampaignDto,
    context?: AuditContext,
  ) {
    const framework = await this.prisma.complianceFramework.findFirst({
      where: { id: dto.frameworkId, clientId },
    });
    if (!framework) {
      throw new NotFoundException('Référentiel client introuvable');
    }

    const openImmediately = dto.openImmediately === true;
    const name =
      dto.name?.trim() ||
      `Revue ${framework.name} ${new Date().toISOString().slice(0, 10)}`;
    const freq = dto.reviewFrequencyMonths ?? 12;

    const created = await this.prisma.complianceCampaign.create({
      data: {
        clientId,
        frameworkId: framework.id,
        name: name.slice(0, 200),
        status: openImmediately
          ? ComplianceCampaignStatus.OPEN
          : ComplianceCampaignStatus.DRAFT,
        frozenFrameworkName: framework.name,
        frozenFrameworkVersion: framework.version,
        reviewFrequencyMonths: freq,
        openedAt: openImmediately ? new Date() : null,
        createdByUserId: context?.actorUserId ?? null,
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: COMPLIANCE_AUDIT_ACTION.CAMPAIGN_CREATED,
      resourceType: COMPLIANCE_AUDIT_RESOURCE_TYPE.COMPLIANCE_CAMPAIGN,
      resourceId: created.id,
      newValue: {
        name: created.name,
        status: created.status,
        frameworkName: framework.name,
        frameworkVersion: framework.version,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    if (openImmediately) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: COMPLIANCE_AUDIT_ACTION.CAMPAIGN_OPENED,
        resourceType: COMPLIANCE_AUDIT_RESOURCE_TYPE.COMPLIANCE_CAMPAIGN,
        resourceId: created.id,
        newValue: { status: ComplianceCampaignStatus.OPEN },
        ipAddress: context?.meta?.ipAddress,
        userAgent: context?.meta?.userAgent,
        requestId: context?.meta?.requestId,
      });
    }

    if (dto.createSnapshot === true) {
      await this.createCampaignSnapshot(
        clientId,
        created.id,
        { label: 'Instantané initial' },
        context,
      );
    }

    return this.getCampaign(clientId, created.id);
  }

  async openCampaign(clientId: string, id: string, context?: AuditContext) {
    const campaign = await this.requireCampaign(clientId, id);
    if (campaign.status !== ComplianceCampaignStatus.DRAFT) {
      throw new BadRequestException(
        'Seule une campagne en brouillon peut être ouverte',
      );
    }
    const framework = await this.prisma.complianceFramework.findFirst({
      where: { id: campaign.frameworkId, clientId },
    });
    if (!framework) {
      throw new NotFoundException('Référentiel client introuvable');
    }

    const updated = await this.prisma.complianceCampaign.update({
      where: { id: campaign.id },
      data: {
        status: ComplianceCampaignStatus.OPEN,
        openedAt: new Date(),
        frozenFrameworkName: framework.name,
        frozenFrameworkVersion: framework.version,
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: COMPLIANCE_AUDIT_ACTION.CAMPAIGN_OPENED,
      resourceType: COMPLIANCE_AUDIT_RESOURCE_TYPE.COMPLIANCE_CAMPAIGN,
      resourceId: updated.id,
      oldValue: { status: campaign.status },
      newValue: {
        status: updated.status,
        frozenFrameworkName: updated.frozenFrameworkName,
        frozenFrameworkVersion: updated.frozenFrameworkVersion,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return this.getCampaign(clientId, updated.id);
  }

  async closeCampaign(
    clientId: string,
    id: string,
    dto: CloseComplianceCampaignDto,
    context?: AuditContext,
  ) {
    const campaign = await this.requireCampaign(clientId, id);
    if (campaign.status !== ComplianceCampaignStatus.OPEN) {
      throw new BadRequestException(
        'Seule une campagne ouverte peut être clôturée',
      );
    }

    const withSnapshot = dto.createSnapshot !== false;
    if (withSnapshot) {
      await this.createCampaignSnapshot(
        clientId,
        campaign.id,
        { label: 'Instantané de clôture' },
        context,
      );
    }

    const updated = await this.prisma.complianceCampaign.update({
      where: { id: campaign.id },
      data: {
        status: ComplianceCampaignStatus.CLOSED,
        closedAt: new Date(),
        closeNote: dto.closeNote?.trim() || null,
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: COMPLIANCE_AUDIT_ACTION.CAMPAIGN_CLOSED,
      resourceType: COMPLIANCE_AUDIT_RESOURCE_TYPE.COMPLIANCE_CAMPAIGN,
      resourceId: updated.id,
      oldValue: { status: campaign.status },
      newValue: {
        status: updated.status,
        closeNote: updated.closeNote,
        withSnapshot,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return this.getCampaign(clientId, updated.id);
  }

  async listCampaignSnapshots(clientId: string, campaignId: string) {
    await this.requireCampaign(clientId, campaignId);
    return this.prisma.complianceCampaignSnapshot.findMany({
      where: { clientId, campaignId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        label: true,
        createdAt: true,
        createdByUserId: true,
      },
    });
  }

  async getCampaignSnapshot(
    clientId: string,
    campaignId: string,
    snapshotId: string,
  ) {
    await this.requireCampaign(clientId, campaignId);
    const snap = await this.prisma.complianceCampaignSnapshot.findFirst({
      where: { id: snapshotId, campaignId, clientId },
    });
    if (!snap) throw new NotFoundException('Instantané introuvable');
    return snap;
  }

  /**
   * Dossier d’audit ZIP (HTML + CSV + JSON) à partir d’un instantané figé.
   * Les fichiers binaires de preuves ne sont pas inclus — manifeste métadonnées uniquement.
   */
  async exportCampaignSnapshotZip(
    clientId: string,
    campaignId: string,
    snapshotId: string,
    context?: AuditContext,
  ): Promise<{ filename: string; buffer: Buffer }> {
    const snap = await this.getCampaignSnapshot(
      clientId,
      campaignId,
      snapshotId,
    );
    const payload = (snap.payload ?? {}) as {
      requirements?: Array<{
        requirementId?: string;
        code?: string;
      }>;
      campaign?: { name?: string };
      capturedAt?: string;
      totals?: Record<string, unknown>;
    };

    const reqIds = (payload.requirements ?? [])
      .map((r) => r.requirementId)
      .filter((id): id is string => Boolean(id));

    const evidences =
      reqIds.length === 0
        ? []
        : await this.prisma.complianceEvidence.findMany({
            where: { clientId, requirementId: { in: reqIds } },
            select: {
              name: true,
              url: true,
              fileId: true,
              description: true,
              requirement: { select: { code: true } },
            },
          });

    const buffer = await buildCampaignSnapshotZip({
      label: snap.label,
      payload: payload as Parameters<typeof buildCampaignSnapshotZip>[0]['payload'],
      evidences: evidences.map((e) => ({
        code: e.requirement.code,
        name: e.name,
        kind:
          e.url || e.fileId
            ? 'DOCUMENT'
            : e.description?.trim()
              ? 'OBSERVATION'
              : 'AUTRE',
        hasUrl: Boolean(e.url?.trim()),
        hasFile: Boolean(e.fileId),
        isObservation: Boolean(e.description?.trim()) && !e.url && !e.fileId,
      })),
    });

    const safeName = (snap.label ?? 'instantane')
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
    const filename = `conformite-audit-${safeName || 'instantane'}-${snap.id.slice(0, 8)}.zip`;

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: COMPLIANCE_AUDIT_ACTION.CAMPAIGN_EXPORT,
      resourceType: COMPLIANCE_AUDIT_RESOURCE_TYPE.COMPLIANCE_CAMPAIGN_SNAPSHOT,
      resourceId: snap.id,
      newValue: {
        campaignId,
        filename,
        bytes: buffer.length,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return { filename, buffer };
  }

  async createCampaignSnapshot(
    clientId: string,
    campaignId: string,
    dto: CreateComplianceCampaignSnapshotDto,
    context?: AuditContext,
  ) {
    const campaign = await this.requireCampaign(clientId, campaignId);
    if (
      campaign.status !== ComplianceCampaignStatus.OPEN &&
      campaign.status !== ComplianceCampaignStatus.CLOSED
    ) {
      throw new BadRequestException(
        'Instantané autorisé uniquement sur campagne ouverte ou clôturée',
      );
    }

    const payload = await this.buildCampaignSnapshotPayload(
      clientId,
      campaign.frameworkId,
      campaign,
    );

    const snap = await this.prisma.complianceCampaignSnapshot.create({
      data: {
        clientId,
        campaignId: campaign.id,
        label: dto.label?.trim() || null,
        payload: payload as Prisma.InputJsonValue,
        createdByUserId: context?.actorUserId ?? null,
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: COMPLIANCE_AUDIT_ACTION.CAMPAIGN_SNAPSHOT,
      resourceType: COMPLIANCE_AUDIT_RESOURCE_TYPE.COMPLIANCE_CAMPAIGN_SNAPSHOT,
      resourceId: snap.id,
      newValue: {
        campaignId: campaign.id,
        label: snap.label,
        requirementCount: payload.totals.requirementCount,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return snap;
  }

  private async requireCampaign(clientId: string, id: string) {
    const campaign = await this.prisma.complianceCampaign.findFirst({
      where: { id, clientId },
    });
    if (!campaign) throw new NotFoundException('Campagne introuvable');
    return campaign;
  }

  private async buildCampaignSnapshotPayload(
    clientId: string,
    frameworkId: string,
    campaign: {
      id: string;
      name: string;
      frozenFrameworkName: string;
      frozenFrameworkVersion: string;
      status: ComplianceCampaignStatus;
    },
  ) {
    const requirements = await this.prisma.complianceRequirement.findMany({
      where: { frameworkId },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
      select: {
        id: true,
        code: true,
        title: true,
        category: true,
        statuses: {
          where: { clientId },
          take: 1,
          select: {
            status: true,
            lastAssessmentDate: true,
            comment: true,
          },
        },
        evidences: {
          where: { clientId },
          select: { id: true },
        },
      },
    });

    let compliant = 0;
    let partial = 0;
    let nonCompliant = 0;
    let notApplicable = 0;
    let notAssessed = 0;

    const items = requirements.map((r) => {
      const st = r.statuses[0]?.status ?? null;
      if (!st) notAssessed += 1;
      else if (st === ComplianceAssessmentStatus.COMPLIANT) compliant += 1;
      else if (st === ComplianceAssessmentStatus.PARTIALLY_COMPLIANT)
        partial += 1;
      else if (st === ComplianceAssessmentStatus.NON_COMPLIANT)
        nonCompliant += 1;
      else if (st === ComplianceAssessmentStatus.NOT_APPLICABLE)
        notApplicable += 1;

      return {
        requirementId: r.id,
        code: r.code,
        title: r.title,
        category: r.category,
        status: st,
        lastAssessmentDate: r.statuses[0]?.lastAssessmentDate ?? null,
        comment: r.statuses[0]?.comment ?? null,
        evidenceCount: r.evidences.length,
      };
    });

    const N = requirements.length;
    const A = N - notApplicable - notAssessed;
    const compliancePercent =
      A > 0 ? Math.round((compliant / A) * 1000) / 10 : null;

    return {
      capturedAt: new Date().toISOString(),
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        frozenFrameworkName: campaign.frozenFrameworkName,
        frozenFrameworkVersion: campaign.frozenFrameworkVersion,
      },
      totals: {
        requirementCount: N,
        compliantCount: compliant,
        partiallyCompliantCount: partial,
        nonCompliantCount: nonCompliant,
        notApplicableCount: notApplicable,
        notAssessedCount: notAssessed,
        applicableCount: A,
        compliancePercent,
      },
      requirements: items,
    };
  }

  getCampaignEvaluationsImportTemplate(): string {
    return CAMPAIGN_EVAL_IMPORT_TEMPLATE;
  }

  async previewCampaignEvaluationsImport(
    clientId: string,
    campaignId: string,
    dto: PreviewCampaignEvaluationsImportDto,
  ) {
    const campaign = await this.requireCampaign(clientId, campaignId);
    if (campaign.status !== ComplianceCampaignStatus.OPEN) {
      throw new BadRequestException(
        'Import réservé aux campagnes ouvertes',
      );
    }

    let parsed;
    try {
      parsed = parseEvaluationsCsv(dto.csvContent);
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'CSV invalide',
      );
    }

    const requirements = await this.prisma.complianceRequirement.findMany({
      where: { frameworkId: campaign.frameworkId },
      select: { id: true, code: true },
    });
    const byCode = new Map(
      requirements.map((r) => [r.code.trim().toLowerCase(), r]),
    );

    const rows = parsed.rows.map((row) => {
      let error = row.error;
      const req = byCode.get(row.code.trim().toLowerCase());
      if (!error && !req) {
        error = `Code inconnu dans le référentiel figé « ${row.code} »`;
      }
      if (
        !error &&
        row.status === ComplianceAssessmentStatus.NOT_APPLICABLE &&
        !row.comment.trim()
      ) {
        error =
          'Justification obligatoire pour une demande de non-applicabilité (colonne comment)';
      }
      if (
        !error &&
        row.status === ComplianceAssessmentStatus.COMPLIANT &&
        !row.evidenceNote?.trim()
      ) {
        // Preuve observation auto depuis commentaire à la confirmation
      }
      return {
        line: row.line,
        code: row.code,
        requirementId: req?.id ?? null,
        status: row.status,
        comment: row.comment,
        lastAssessmentDate: row.lastAssessmentDate,
        evidenceNote: row.evidenceNote,
        error,
        ok: !error && Boolean(req) && Boolean(row.status),
      };
    });

    const validRows = rows.filter((r) => r.ok);
    const fingerprint = fingerprintImportRows(
      validRows.map((r) => ({
        code: r.code,
        status: r.status,
        comment: r.comment,
        lastAssessmentDate: r.lastAssessmentDate,
        evidenceNote: r.evidenceNote,
      })),
    );

    return {
      campaignId: campaign.id,
      fingerprint,
      delimiter: parsed.delimiter,
      totalRows: rows.length,
      validCount: validRows.length,
      errorCount: rows.length - validRows.length,
      rows,
    };
  }

  async confirmCampaignEvaluationsImport(
    clientId: string,
    campaignId: string,
    dto: ConfirmCampaignEvaluationsImportDto,
    context?: AuditContext,
  ) {
    const preview = await this.previewCampaignEvaluationsImport(clientId, campaignId, {
      csvContent: dto.csvContent,
    });
    if (preview.fingerprint !== dto.fingerprint) {
      throw new BadRequestException(
        'Empreinte d’aperçu obsolète — relancez l’aperçu',
      );
    }
    if (preview.errorCount > 0 || preview.validCount === 0) {
      throw new BadRequestException(
        'Corrigez toutes les erreurs avant confirmation (import atomique)',
      );
    }

    const valid = preview.rows.filter((r) => r.ok);
    await this.prisma.$transaction(async (tx) => {
      for (const row of valid) {
        const requirementId = row.requirementId!;
        const status = row.status!;

        if (status === ComplianceAssessmentStatus.NOT_APPLICABLE) {
          const justification = row.comment.trim();
          const existingNa = await tx.complianceNaRequest.findUnique({
            where: { clientId_requirementId: { clientId, requirementId } },
          });
          if (existingNa) {
            await tx.complianceNaRequest.update({
              where: { id: existingNa.id },
              data: {
                status: ComplianceNaRequestStatus.PENDING,
                justification,
                requestedByUserId: context?.actorUserId ?? null,
                requestedAt: new Date(),
                reviewedByUserId: null,
                reviewedAt: null,
                reviewNote: null,
              },
            });
          } else {
            await tx.complianceNaRequest.create({
              data: {
                clientId,
                requirementId,
                status: ComplianceNaRequestStatus.PENDING,
                justification,
                requestedByUserId: context?.actorUserId ?? null,
              },
            });
          }
          continue;
        }

        if (status === ComplianceAssessmentStatus.COMPLIANT) {
          const evidences = await tx.complianceEvidence.findMany({
            where: { clientId, requirementId },
            select: { url: true, fileId: true, description: true },
          });
          const has = evidences.some(evidenceJustifiesCompliance);
          if (!has) {
            const note =
              row.evidenceNote?.trim() ||
              row.comment.trim() ||
              'Observation créée à l’import CSV';
            await tx.complianceEvidence.create({
              data: {
                clientId,
                requirementId,
                name: 'Observation import CSV',
                description: note.slice(0, 2000),
                createdByUserId: context?.actorUserId ?? null,
              },
            });
          }
        }

        const existing = await tx.complianceStatus.findUnique({
          where: {
            clientId_requirementId: { clientId, requirementId },
          },
        });
        const dateVal = row.lastAssessmentDate
          ? new Date(row.lastAssessmentDate)
          : null;
        const safeDate =
          dateVal && !Number.isNaN(dateVal.getTime()) ? dateVal : null;

        if (existing) {
          await tx.complianceStatus.update({
            where: { id: existing.id },
            data: {
              status,
              comment: row.comment.trim(),
              lastAssessmentDate: safeDate,
            },
          });
        } else {
          await tx.complianceStatus.create({
            data: {
              clientId,
              requirementId,
              status,
              comment: row.comment.trim(),
              lastAssessmentDate: safeDate,
            },
          });
        }
      }
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: COMPLIANCE_AUDIT_ACTION.CAMPAIGN_IMPORT,
      resourceType: COMPLIANCE_AUDIT_RESOURCE_TYPE.COMPLIANCE_CAMPAIGN,
      resourceId: campaignId,
      newValue: {
        fingerprint: dto.fingerprint,
        imported: valid.length,
        idempotencyKey: dto.idempotencyKey ?? null,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return {
      imported: valid.length,
      fingerprint: dto.fingerprint,
    };
  }
}
