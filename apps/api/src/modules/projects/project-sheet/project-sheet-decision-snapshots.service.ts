import { Injectable, NotFoundException } from '@nestjs/common';
import type { Project, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import type { AuditContext } from '../../budget-management/types/audit-context';
import {
  PROJECT_AUDIT_ACTION,
  PROJECT_AUDIT_RESOURCE_TYPE,
} from '../project-audit.constants';
import { projectSheetFieldsAuditSnapshot } from '../project-audit-serialize';
import { detectArbitrationTransitionsForSnapshot } from './project-sheet-decision-snapshots.logic';

const DEFAULT_LIST_LIMIT = 20;
const MAX_LIST_LIMIT = 100;

export type DecisionSnapshotListItemDto = {
  id: string;
  projectId: string;
  clientId: string;
  createdAt: string;
  createdByUserId: string | null;
  decisionLevel: string;
};

export type DecisionSnapshotDetailDto = DecisionSnapshotListItemDto & {
  sheetPayload: Prisma.JsonValue;
};

@Injectable()
export class ProjectSheetDecisionSnapshotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  /**
   * Après mise à jour réussie du projet : si demandé et passage à Validé ou Refusé, un snapshot par niveau concerné.
   */
  async createSnapshotsAfterSheetUpdateIfNeeded(
    existing: Project,
    updated: Project,
    recordDecisionSnapshot: boolean | undefined,
    context: AuditContext | undefined,
  ): Promise<void> {
    if (recordDecisionSnapshot !== true) {
      return;
    }
    const transitions = detectArbitrationTransitionsForSnapshot(existing, updated);
    if (transitions.length === 0) {
      return;
    }

    const sheetJson = projectSheetFieldsAuditSnapshot(
      updated,
    ) as unknown as Prisma.InputJsonValue;
    const meta = {
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };

    for (const decisionLevel of transitions) {
      const row = await this.prisma.projectSheetDecisionSnapshot.create({
        data: {
          clientId: updated.clientId,
          projectId: updated.id,
          createdByUserId: context?.actorUserId ?? null,
          decisionLevel,
          sheetPayload: sheetJson,
        },
      });

      await this.auditLogs.create({
        clientId: updated.clientId,
        userId: context?.actorUserId,
        action: PROJECT_AUDIT_ACTION.PROJECT_SHEET_DECISION_SNAPSHOT_CREATED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT,
        resourceId: updated.id,
        oldValue: null,
        newValue: {
          snapshotId: row.id,
          decisionLevel,
          projectId: updated.id,
        },
        ...meta,
      });
    }
  }

  async listSnapshots(
    clientId: string,
    projectId: string,
    limitRaw?: number,
    offsetRaw?: number,
  ): Promise<{
    items: DecisionSnapshotListItemDto[];
    total: number;
    limit: number;
    offset: number;
  }> {
    await this.ensureProjectInClient(clientId, projectId);

    const limit = Math.min(
      MAX_LIST_LIMIT,
      Math.max(1, limitRaw ?? DEFAULT_LIST_LIMIT),
    );
    const offset = Math.max(0, offsetRaw ?? 0);

    const where = { clientId, projectId };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.projectSheetDecisionSnapshot.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.projectSheetDecisionSnapshot.count({ where }),
    ]);

    const items: DecisionSnapshotListItemDto[] = rows.map((r) => ({
      id: r.id,
      projectId: r.projectId,
      clientId: r.clientId,
      createdAt: r.createdAt.toISOString(),
      createdByUserId: r.createdByUserId,
      decisionLevel: r.decisionLevel,
    }));

    return { items, total, limit, offset };
  }

  async getSnapshotById(
    clientId: string,
    projectId: string,
    snapshotId: string,
  ): Promise<DecisionSnapshotDetailDto> {
    const row = await this.prisma.projectSheetDecisionSnapshot.findFirst({
      where: { id: snapshotId, clientId, projectId },
    });
    if (!row) {
      throw new NotFoundException('Snapshot not found');
    }
    return {
      id: row.id,
      projectId: row.projectId,
      clientId: row.clientId,
      createdAt: row.createdAt.toISOString(),
      createdByUserId: row.createdByUserId,
      decisionLevel: row.decisionLevel,
      sheetPayload: row.sheetPayload,
    };
  }

  private async ensureProjectInClient(
    clientId: string,
    projectId: string,
  ): Promise<void> {
    const p = await this.prisma.project.findFirst({
      where: { id: projectId, clientId },
      select: { id: true },
    });
    if (!p) {
      throw new NotFoundException('Project not found');
    }
  }
}
