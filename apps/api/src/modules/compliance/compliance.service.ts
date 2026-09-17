import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ComplianceAssessmentStatus,
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
    return this.prisma.complianceFramework.findMany({
      where: { clientId },
      orderBy: [{ name: 'asc' }, { version: 'asc' }],
    });
  }

  /**
   * Avancement par référentiel — cartes « Référentiels réglementaires » de `/compliance`.
   *
   * `compliancePercent` suit la même convention que `dashboard()` : conformes / évalués
   * (hors NOT_APPLICABLE), `null` si aucune exigence n'a encore été évaluée.
   */
  async frameworksSummary(clientId: string): Promise<ComplianceFrameworkSummary[]> {
    const frameworks = await this.prisma.complianceFramework.findMany({
      where: { clientId },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }, { version: 'asc' }],
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

    const [status, evidences, linkedRisks] = await Promise.all([
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
    ]);

    return {
      requirement: req,
      status: status ?? null,
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
    return this.prisma.complianceFramework.findMany({
      where: {
        clientId: null,
        ...(includeArchived ? {} : { archivedAt: null }),
      },
      include: {
        _count: { select: { requirements: true } },
      },
      orderBy: [{ name: 'asc' }, { version: 'asc' }],
    });
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
   * Active un référentiel catalogue plateforme pour le client :
   * copie framework + exigences (instance client isolée pour les évaluations).
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
      throw new ConflictException(
        `« ${source.name} » (${source.version}) est déjà activé pour ce client`,
      );
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const fw = await tx.complianceFramework.create({
        data: {
          clientId,
          name: source.name,
          version: source.version,
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
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      version: r.version,
      requirementCount: r._count.requirements,
      scope: 'platform' as const,
    }));
  }
}
