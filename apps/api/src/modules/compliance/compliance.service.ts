import {
  BadRequestException,
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
import { CreateComplianceRequirementDto } from './dto/create-compliance-requirement.dto';
import { CreateComplianceEvidenceDto } from './dto/create-compliance-evidence.dto';
import { PatchComplianceStatusDto } from './dto/patch-compliance-status.dto';
import { ListComplianceRequirementsQueryDto } from './dto/list-compliance-requirements.query.dto';
import { ListComplianceStatusQueryDto } from './dto/list-compliance-status.query.dto';

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
      evidences,
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

  async createEvidence(
    clientId: string,
    dto: CreateComplianceEvidenceDto,
    actorUserId: string | undefined,
    context?: AuditContext,
  ) {
    const url = dto.url?.trim() ?? '';
    const fileId = dto.fileId?.trim() ?? '';
    if (!url && !fileId) {
      throw new BadRequestException('Au moins une URL ou une référence fichier est requise');
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
        description: dto.description?.trim() ?? null,
        url: url || null,
        fileId: fileId || null,
        createdByUserId: actorUserId ?? null,
      },
    });
    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: COMPLIANCE_AUDIT_ACTION.EVIDENCE_CREATED,
      resourceType: COMPLIANCE_AUDIT_RESOURCE_TYPE.COMPLIANCE_EVIDENCE,
      resourceId: row.id,
      newValue: { requirementId: row.requirementId, name: row.name },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
    return row;
  }

  async dashboard(clientId: string) {
    const activeFw = await this.prisma.complianceFramework.findMany({
      where: { clientId, isActive: true },
      select: { id: true },
    });
    const fwIds = activeFw.map((f) => f.id);
    if (fwIds.length === 0) {
      return {
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

    const compliancePercent =
      evaluatedDenominator > 0
        ? Math.round((100 * compliantCount) / evaluatedDenominator)
        : null;

    return {
      totalRequirementsActiveFrameworks: totalReqs,
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
}
