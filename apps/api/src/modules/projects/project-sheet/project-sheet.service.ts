import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Project } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import type { AuditContext } from '../../budget-management/types/audit-context';
import {
  PROJECT_AUDIT_ACTION,
  PROJECT_AUDIT_RESOURCE_TYPE,
} from '../project-audit.constants';
import {
  diffAuditSnapshots,
  projectSheetFieldsAuditSnapshot,
} from '../project-audit-serialize';
import {
  computePriorityScore,
  computeRoi,
} from './calculators/project-sheet-calculators';
import { SetArbitrationDto } from './dto/set-arbitration.dto';
import { UpdateProjectSheetDto } from './dto/update-project-sheet.dto';

export type ProjectSheetResponseDto = {
  id: string;
  name: string;
  businessValueScore: number | null;
  strategicAlignment: number | null;
  urgencyScore: number | null;
  estimatedCost: number | null;
  estimatedGain: number | null;
  roi: number | null;
  riskLevel: string | null;
  priorityScore: number | null;
  arbitrationStatus: string | null;
};

function decimalToNumber(d: Prisma.Decimal | null | undefined): number | null {
  if (d == null) return null;
  return d.toNumber();
}

@Injectable()
export class ProjectSheetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  mapToSheetResponse(p: Project): ProjectSheetResponseDto {
    return {
      id: p.id,
      name: p.name,
      businessValueScore: p.businessValueScore ?? null,
      strategicAlignment: p.strategicAlignment ?? null,
      urgencyScore: p.urgencyScore ?? null,
      estimatedCost: decimalToNumber(p.estimatedCost),
      estimatedGain: decimalToNumber(p.estimatedGain),
      roi: decimalToNumber(p.roi),
      riskLevel: p.riskLevel ?? null,
      priorityScore: decimalToNumber(p.priorityScore),
      arbitrationStatus: p.arbitrationStatus ?? null,
    };
  }

  async getSheet(
    clientId: string,
    projectId: string,
  ): Promise<ProjectSheetResponseDto> {
    const p = await this.prisma.project.findFirst({
      where: { id: projectId, clientId },
    });
    if (!p) {
      throw new NotFoundException('Project not found');
    }
    return this.mapToSheetResponse(p);
  }

  async updateSheet(
    clientId: string,
    projectId: string,
    dto: UpdateProjectSheetDto,
    context?: AuditContext,
  ): Promise<ProjectSheetResponseDto> {
    const existing = await this.prisma.project.findFirst({
      where: { id: projectId, clientId },
    });
    if (!existing) {
      throw new NotFoundException('Project not found');
    }

    const merged = this.mergeSheetState(existing, dto);
    const roi = computeRoi(merged.estimatedCost, merged.estimatedGain);
    const priorityScore = computePriorityScore(
      merged.businessValueScore,
      merged.strategicAlignment,
      merged.urgencyScore,
      merged.riskLevel,
      roi,
    );

    const data: Prisma.ProjectUncheckedUpdateInput = {
      businessValueScore: merged.businessValueScore,
      strategicAlignment: merged.strategicAlignment,
      urgencyScore: merged.urgencyScore,
      estimatedCost: merged.estimatedCost,
      estimatedGain: merged.estimatedGain,
      roi,
      riskLevel: merged.riskLevel,
      priorityScore,
    };

    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data,
    });

    const oldSnap = projectSheetFieldsAuditSnapshot(existing);
    const newSnap = projectSheetFieldsAuditSnapshot(updated);
    const { oldValue, newValue } = diffAuditSnapshots(oldSnap, newSnap);

    const meta = {
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };

    if (Object.keys(oldValue).length > 0) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: PROJECT_AUDIT_ACTION.PROJECT_SHEET_UPDATED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT,
        resourceId: projectId,
        oldValue,
        newValue,
        ...meta,
      });
    }

    return this.mapToSheetResponse(updated);
  }

  async setArbitrationStatus(
    clientId: string,
    projectId: string,
    dto: SetArbitrationDto,
    context?: AuditContext,
  ): Promise<ProjectSheetResponseDto> {
    const existing = await this.prisma.project.findFirst({
      where: { id: projectId, clientId },
    });
    if (!existing) {
      throw new NotFoundException('Project not found');
    }

    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: { arbitrationStatus: dto.status },
    });

    const meta = {
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };

    let action: string;
    if (dto.status === 'VALIDATED') {
      action = PROJECT_AUDIT_ACTION.PROJECT_ARBITRATION_VALIDATED;
    } else if (dto.status === 'REJECTED') {
      action = PROJECT_AUDIT_ACTION.PROJECT_ARBITRATION_REJECTED;
    } else {
      action = PROJECT_AUDIT_ACTION.PROJECT_SHEET_UPDATED;
    }

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT,
      resourceId: projectId,
      oldValue: { arbitrationStatus: existing.arbitrationStatus ?? null },
      newValue: { arbitrationStatus: dto.status },
      ...meta,
    });

    return this.mapToSheetResponse(updated);
  }

  private mergeSheetState(
    project: Project,
    dto: UpdateProjectSheetDto,
  ): {
    businessValueScore: number | null;
    strategicAlignment: number | null;
    urgencyScore: number | null;
    estimatedCost: Prisma.Decimal | null;
    estimatedGain: Prisma.Decimal | null;
    riskLevel: Project['riskLevel'];
  } {
    const businessValueScore =
      dto.businessValueScore !== undefined
        ? dto.businessValueScore
        : project.businessValueScore;
    const strategicAlignment =
      dto.strategicAlignment !== undefined
        ? dto.strategicAlignment
        : project.strategicAlignment;
    const urgencyScore =
      dto.urgencyScore !== undefined ? dto.urgencyScore : project.urgencyScore;
    const estimatedCost =
      dto.estimatedCost !== undefined
        ? new Prisma.Decimal(dto.estimatedCost)
        : project.estimatedCost;
    const estimatedGain =
      dto.estimatedGain !== undefined
        ? new Prisma.Decimal(dto.estimatedGain)
        : project.estimatedGain;
    const riskLevel =
      dto.riskLevel !== undefined ? dto.riskLevel : project.riskLevel;

    return {
      businessValueScore,
      strategicAlignment,
      urgencyScore,
      estimatedCost,
      estimatedGain,
      riskLevel,
    };
  }
}
