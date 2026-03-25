import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { ProjectMicrosoftLink } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { AuditContext } from '../budget-management/types/audit-context';
import { MicrosoftOAuthService } from './microsoft-oauth.service';
import type { UpdateProjectMicrosoftLinkDto } from './dto/update-project-microsoft-link.dto';
import {
  MicrosoftConnectionStatus,
  ProjectDocumentStatus,
  ProjectDocumentStorageType,
  ProjectTaskPriority,
  ProjectTaskStatus,
  MicrosoftSyncStatus,
} from '@prisma/client';
import { MicrosoftGraphService } from './microsoft-graph.service';
import { ProjectDocumentContentService } from '../projects/project-document-content.service';
import {
  type MicrosoftGraphODataListResponse,
  MicrosoftGraphHttpError,
} from './microsoft-graph.types';
import { buildPlannerChecklistPatchBody } from './planner-task-checklist-graph';

const AUDIT_ACTION_ENABLED = 'project.microsoft_link.enabled';
const AUDIT_ACTION_UPDATED = 'project.microsoft_link.updated';
const AUDIT_ACTION_TASKS_SYNCED = 'project.microsoft_tasks.synced';
const AUDIT_ACTION_DOCUMENTS_SYNCED = 'project.microsoft_documents.synced';
const AUDIT_ACTION_TASK_SYNC_FAILED = 'project.microsoft_sync.failed';
const AUDIT_ACTION_DOC_SYNC_FAILED = 'project.microsoft_sync.failed';
const AUDIT_RESOURCE_TYPE = 'project';

type PlannerBucketLite = { id: string; name: string };

/**
 * Noms de colonnes Planner souvent en FR alors que Starium utilise l’enum Prisma (ex. BLOCKED ↔ « Bloqué »).
 */
const PLANNER_BUCKET_LABELS_BY_STATUS: Record<
  ProjectTaskStatus,
  readonly string[]
> = {
  DRAFT: ['DRAFT', 'Brouillon'],
  TODO: ['TODO', 'À faire', 'A faire', 'To do'],
  IN_PROGRESS: ['IN_PROGRESS', 'En cours'],
  BLOCKED: ['BLOCKED', 'Bloqué', 'Blocked'],
  DONE: ['DONE', 'Terminée', 'Terminé', 'Done'],
  CANCELLED: ['CANCELLED', 'Annulée', 'Annulé', 'Cancelled'],
};

const ALL_TASK_STATUSES: ProjectTaskStatus[] = [
  ProjectTaskStatus.DRAFT,
  ProjectTaskStatus.TODO,
  ProjectTaskStatus.IN_PROGRESS,
  ProjectTaskStatus.BLOCKED,
  ProjectTaskStatus.DONE,
  ProjectTaskStatus.CANCELLED,
];

function plannerBucketIdForTaskStatus(
  status: ProjectTaskStatus,
  buckets: PlannerBucketLite[],
): string | null {
  const labels = PLANNER_BUCKET_LABELS_BY_STATUS[status] ?? [];
  for (const label of labels) {
    const hit = buckets.find((b) => b.name === label);
    if (hit) return hit.id;
  }
  for (const b of buckets) {
    const bn = b.name.toLowerCase();
    for (const label of labels) {
      if (bn === label.toLowerCase()) return b.id;
    }
  }
  return null;
}

type StariumBucketForAlign = {
  id: string;
  name: string;
  plannerBucketId: string | null;
};

/**
 * Colonne Graph (ex. « À faire ») vs bucket Starium souvent nommé comme l’enum (`TODO`).
 */
function findStariumBucketForGraphColumn(
  graphBucket: PlannerBucketLite,
  stariumBuckets: ReadonlyArray<StariumBucketForAlign>,
): StariumBucketForAlign | null {
  if (stariumBuckets.length === 0) return null;

  const byPlanner = stariumBuckets.find(
    (b) => b.plannerBucketId === graphBucket.id,
  );
  if (byPlanner) return byPlanner;

  const glower = graphBucket.name.trim().toLowerCase();
  const byName = stariumBuckets.find(
    (b) => b.name.trim().toLowerCase() === glower,
  );
  if (byName) return byName;

  for (const status of ALL_TASK_STATUSES) {
    const labels = PLANNER_BUCKET_LABELS_BY_STATUS[status] ?? [];
    const matchesGraphLabel = labels.some((l) => l.toLowerCase() === glower);
    if (!matchesGraphLabel) continue;

    const byEnumName = stariumBuckets.find((b) => b.name === status);
    if (byEnumName) return byEnumName;

    for (const label of labels) {
      const hit = stariumBuckets.find(
        (b) =>
          b.name === label ||
          b.name.trim().toLowerCase() === label.toLowerCase(),
      );
      if (hit) return hit;
    }
  }

  return null;
}

export type ProjectMicrosoftLinkConfig = Pick<
  ProjectMicrosoftLink,
  | 'isEnabled'
  | 'teamId'
  | 'teamName'
  | 'channelId'
  | 'channelName'
  | 'plannerPlanId'
  | 'plannerPlanTitle'
  | 'syncTasksEnabled'
  | 'syncDocumentsEnabled'
  | 'useMicrosoftPlannerBuckets'
  | 'filesDriveId'
  | 'filesFolderId'
  | 'lastSyncAt'
  | 'createdAt'
  | 'updatedAt'
>;

export type SyncTasksResult = {
  total: number;
  synced: number;
  failed: number;
};

export type SyncDocumentsResult = {
  total: number;
  synced: number;
  failed: number;
  skipped: number;
};

@Injectable()
export class ProjectMicrosoftLinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly microsoftOAuth: MicrosoftOAuthService,
    private readonly graph: MicrosoftGraphService,
    private readonly projectDocumentContent: ProjectDocumentContentService,
  ) {}

  /**
   * Après un push Planner réussi : rattache la tâche au `ProjectTaskBucket` Starium qui correspond
   * à la colonne Graph (sinon l’UI affiche « Aucun » alors que Planner montre une colonne).
   */
  private async alignStariumTaskBucketAfterPlannerPush(
    clientId: string,
    projectId: string,
    taskId: string,
    plannerBucketId: string,
    graphBuckets: PlannerBucketLite[],
    stariumBuckets: ReadonlyArray<StariumBucketForAlign>,
  ): Promise<void> {
    const graphBucket = graphBuckets.find((b) => b.id === plannerBucketId);
    if (!graphBucket) return;

    const local = findStariumBucketForGraphColumn(
      graphBucket,
      stariumBuckets,
    );
    if (!local) return;

    await this.prisma.projectTask.updateMany({
      where: { id: taskId, clientId, projectId },
      data: { bucketId: local.id },
    });

    if (local.plannerBucketId == null) {
      await this.prisma.projectTaskBucket.updateMany({
        where: {
          id: local.id,
          clientId,
          projectId,
          plannerBucketId: null,
        },
        data: { plannerBucketId: graphBucket.id },
      });
    }
  }

  private async ensurePlannerChecklistKeysForTask(
    clientId: string,
    projectId: string,
    taskId: string,
  ): Promise<void> {
    const missing = await this.prisma.projectTaskChecklistItem.findMany({
      where: {
        clientId,
        projectId,
        projectTaskId: taskId,
        plannerChecklistItemKey: null,
      },
    });
    for (const item of missing) {
      await this.prisma.projectTaskChecklistItem.update({
        where: { id: item.id },
        data: { plannerChecklistItemKey: randomUUID() },
      });
    }
  }

  private async buildPlannerTaskDetailsPatchPayload(
    accessToken: string,
    plannerTaskId: string,
    clientId: string,
    projectId: string,
    taskId: string,
    description: string | null,
  ): Promise<{ body: Record<string, unknown>; etag: string }> {
    await this.ensurePlannerChecklistKeysForTask(clientId, projectId, taskId);

    const checklistRows = await this.prisma.projectTaskChecklistItem.findMany({
      where: { clientId, projectId, projectTaskId: taskId },
      orderBy: { sortOrder: 'asc' },
    });

    const detailsWithEtag = await this.graph.getPlannerTaskDetailsWithEtag<
      unknown
    >(accessToken, plannerTaskId);
    if (!detailsWithEtag.etag) {
      throw new Error('ETag manquant pour plannerTaskDetails');
    }

    const existingChecklist = (
      detailsWithEtag.json as Record<string, unknown> | undefined
    )?.checklist;
    const checklistPatch = buildPlannerChecklistPatchBody(
      checklistRows.map((r) => ({
        title: r.title,
        isChecked: r.isChecked,
        sortOrder: r.sortOrder,
        plannerChecklistItemKey: r.plannerChecklistItemKey,
      })),
      existingChecklist,
    );

    const body: Record<string, unknown> = {
      description: description ?? '',
    };
    if (Object.keys(checklistPatch).length > 0) {
      body.checklist = checklistPatch;
    }

    return { body, etag: detailsWithEtag.etag };
  }

  async getConfig(
    clientId: string,
    projectId: string,
  ): Promise<ProjectMicrosoftLinkConfig> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, clientId },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const link = await this.prisma.projectMicrosoftLink.findFirst({
      where: { projectId, clientId },
    });

    if (!link) {
      throw new NotFoundException('Microsoft link not configured');
    }

    return link;
  }

  async upsertConfig(
    clientId: string,
    projectId: string,
    dto: UpdateProjectMicrosoftLinkDto,
    context?: AuditContext,
  ): Promise<ProjectMicrosoftLinkConfig> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, clientId },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const existing = await this.prisma.projectMicrosoftLink.findFirst({
      where: { projectId, clientId },
    });

    const oldEnabled = existing?.isEnabled ?? false;
    const newEnabled = dto.isEnabled;

    // Multi-client: aucune résolution Graph/Teams/Channels/Plans bloquante ici.
    let activeConnectionId: string | null = existing?.microsoftConnectionId ?? null;
    if (newEnabled === true) {
      const connection = await this.microsoftOAuth.getActiveConnection(clientId);
      if (!connection || connection.status !== MicrosoftConnectionStatus.ACTIVE) {
        throw new UnprocessableEntityException(
          'Connexion Microsoft active requise pour activer le lien projet',
        );
      }
      activeConnectionId = connection.id;
    }

    const syncTasksEnabled =
      dto.syncTasksEnabled ?? existing?.syncTasksEnabled ?? true;
    const syncDocumentsEnabled =
      dto.syncDocumentsEnabled ?? existing?.syncDocumentsEnabled ?? true;

    const prevMsBuckets = existing?.useMicrosoftPlannerBuckets ?? false;
    const nextMsBuckets =
      dto.useMicrosoftPlannerBuckets !== undefined
        ? dto.useMicrosoftPlannerBuckets
        : prevMsBuckets;

    const updated: ProjectMicrosoftLinkConfig & { id: string } =
      existing
        ? await this.prisma.projectMicrosoftLink.update({
            where: { id: existing.id },
            data: {
              clientId,
              projectId,
              isEnabled: newEnabled,
              microsoftConnectionId: activeConnectionId,
              syncTasksEnabled,
              syncDocumentsEnabled,
              useMicrosoftPlannerBuckets: nextMsBuckets,

              // IDs / noms : "aucune purge" => on ne remet à null que si la ligne n'existe pas.
              ...(newEnabled === true
                ? {
                    teamId: dto.teamId,
                    channelId: dto.channelId,
                    plannerPlanId: dto.plannerPlanId,
                    ...(dto.teamName !== undefined && { teamName: dto.teamName }),
                    ...(dto.channelName !== undefined && {
                      channelName: dto.channelName,
                    }),
                    ...(dto.plannerPlanTitle !== undefined && {
                      plannerPlanTitle: dto.plannerPlanTitle,
                    }),
                    ...(dto.filesDriveId !== undefined && {
                      filesDriveId: dto.filesDriveId,
                    }),
                    ...(dto.filesFolderId !== undefined && {
                      filesFolderId: dto.filesFolderId,
                    }),
                  }
                : {
                    ...(dto.teamId !== undefined && { teamId: dto.teamId }),
                    ...(dto.channelId !== undefined && { channelId: dto.channelId }),
                    ...(dto.plannerPlanId !== undefined && {
                      plannerPlanId: dto.plannerPlanId,
                    }),
                    ...(dto.teamName !== undefined && { teamName: dto.teamName }),
                    ...(dto.channelName !== undefined && {
                      channelName: dto.channelName,
                    }),
                    ...(dto.plannerPlanTitle !== undefined && {
                      plannerPlanTitle: dto.plannerPlanTitle,
                    }),
                    ...(dto.filesDriveId !== undefined && {
                      filesDriveId: dto.filesDriveId,
                    }),
                    ...(dto.filesFolderId !== undefined && {
                      filesFolderId: dto.filesFolderId,
                    }),
                  }),
            },
          })
        : await this.prisma.projectMicrosoftLink.create({
            data: {
              clientId,
              projectId,
              isEnabled: newEnabled,
              microsoftConnectionId: newEnabled ? activeConnectionId : null,
              syncTasksEnabled,
              syncDocumentsEnabled,
              useMicrosoftPlannerBuckets: nextMsBuckets,
              ...(newEnabled === true
                ? {
                    teamId: dto.teamId,
                    channelId: dto.channelId,
                    plannerPlanId: dto.plannerPlanId,
                    ...(dto.teamName !== undefined && { teamName: dto.teamName }),
                    ...(dto.channelName !== undefined && {
                      channelName: dto.channelName,
                    }),
                    ...(dto.plannerPlanTitle !== undefined && {
                      plannerPlanTitle: dto.plannerPlanTitle,
                    }),
                    ...(dto.filesDriveId !== undefined && {
                      filesDriveId: dto.filesDriveId,
                    }),
                    ...(dto.filesFolderId !== undefined && {
                      filesFolderId: dto.filesFolderId,
                    }),
                  }
                : {
                    ...(dto.teamId !== undefined && { teamId: dto.teamId }),
                    ...(dto.channelId !== undefined && { channelId: dto.channelId }),
                    ...(dto.plannerPlanId !== undefined && {
                      plannerPlanId: dto.plannerPlanId,
                    }),
                    ...(dto.teamName !== undefined && { teamName: dto.teamName }),
                    ...(dto.channelName !== undefined && {
                      channelName: dto.channelName,
                    }),
                    ...(dto.plannerPlanTitle !== undefined && {
                      plannerPlanTitle: dto.plannerPlanTitle,
                    }),
                    ...(dto.filesDriveId !== undefined && {
                      filesDriveId: dto.filesDriveId,
                    }),
                    ...(dto.filesFolderId !== undefined && {
                      filesFolderId: dto.filesFolderId,
                    }),
                  }),
            },
          });

    if (nextMsBuckets === true && prevMsBuckets === false) {
      await this.replaceStariumBucketsWithPlanner(clientId, projectId);
    }
    if (nextMsBuckets === false && prevMsBuckets === true) {
      await this.demotePlannerBucketsToStarium(clientId, projectId);
    }

    const action =
      !oldEnabled && newEnabled === true ? AUDIT_ACTION_ENABLED : AUDIT_ACTION_UPDATED;

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action,
      resourceType: AUDIT_RESOURCE_TYPE,
      resourceId: projectId,
      oldValue: {
        isEnabled: oldEnabled,
        teamId: existing?.teamId ?? null,
        channelId: existing?.channelId ?? null,
        plannerPlanId: existing?.plannerPlanId ?? null,
        useMicrosoftPlannerBuckets: prevMsBuckets,
      },
      newValue: {
        isEnabled: updated.isEnabled,
        teamId: updated.teamId ?? null,
        channelId: updated.channelId ?? null,
        plannerPlanId: updated.plannerPlanId ?? null,
        useMicrosoftPlannerBuckets: nextMsBuckets,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    // Sanity: le PUT avec isEnabled=true ne doit jamais aboutir sans IDs
    // (la validation DTO le garantit mais on garde un filet de sécurité).
    if (newEnabled === true) {
      if (!dto.teamId || !dto.channelId || !dto.plannerPlanId) {
        throw new BadRequestException('teamId, channelId et plannerPlanId sont requis');
      }
    }

    return updated;
  }

  private async demotePlannerBucketsToStarium(
    clientId: string,
    projectId: string,
  ): Promise<void> {
    await this.prisma.projectTaskBucket.updateMany({
      where: { clientId, projectId, plannerBucketId: { not: null } },
      data: { plannerBucketId: null },
    });
  }

  private async replaceStariumBucketsWithPlanner(
    clientId: string,
    projectId: string,
  ): Promise<void> {
    const link = await this.prisma.projectMicrosoftLink.findFirst({
      where: { projectId, clientId },
    });
    if (!link?.plannerPlanId || !link.microsoftConnectionId) {
      throw new UnprocessableEntityException(
        'Plan Planner et connexion Microsoft requis pour importer les buckets',
      );
    }
    const accessToken = await this.microsoftOAuth.ensureFreshAccessToken(
      link.microsoftConnectionId,
      clientId,
    );
    type PlannerBucket = { id: string; name: string };
    const bucketsResp = await this.graph.getJson<
      MicrosoftGraphODataListResponse<PlannerBucket>
    >(accessToken, `planner/plans/${link.plannerPlanId}/buckets`, {
      expectJson: true,
    });
    const graphBuckets = bucketsResp?.value ?? [];
    if (graphBuckets.length === 0) {
      throw new UnprocessableEntityException(
        'Aucun bucket Planner trouvé pour le plan configuré',
      );
    }
    const graphIds = new Set(graphBuckets.map((g) => g.id));

    await this.prisma.$transaction(async (tx) => {
      const stariumOnly = await tx.projectTaskBucket.findMany({
        where: { projectId, clientId, plannerBucketId: null },
        select: { id: true },
      });
      const sid = stariumOnly.map((s) => s.id);
      if (sid.length > 0) {
        await tx.projectTask.updateMany({
          where: { clientId, projectId, bucketId: { in: sid } },
          data: { bucketId: null },
        });
        await tx.projectTaskBucket.deleteMany({
          where: { id: { in: sid } },
        });
      }

      for (let i = 0; i < graphBuckets.length; i++) {
        const gb = graphBuckets[i];
        await tx.projectTaskBucket.upsert({
          where: {
            projectId_plannerBucketId: {
              projectId,
              plannerBucketId: gb.id,
            },
          },
          create: {
            clientId,
            projectId,
            name: gb.name,
            sortOrder: i,
            plannerBucketId: gb.id,
          },
          update: {
            name: gb.name,
            sortOrder: i,
          },
        });
      }

      const mirrored = await tx.projectTaskBucket.findMany({
        where: { projectId, clientId, plannerBucketId: { not: null } },
      });
      for (const row of mirrored) {
        if (row.plannerBucketId && !graphIds.has(row.plannerBucketId)) {
          await tx.projectTask.updateMany({
            where: { clientId, projectId, bucketId: row.id },
            data: { bucketId: null },
          });
          await tx.projectTaskBucket.delete({
            where: { id: row.id },
          });
        }
      }
    });
  }

  async syncTasks(
    clientId: string,
    projectId: string,
    context?: AuditContext,
  ): Promise<SyncTasksResult> {
    // 1) Scope project
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, clientId },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // 2) Load project link + validation
    const link = await this.prisma.projectMicrosoftLink.findFirst({
      where: { projectId, clientId },
    });
    if (!link) {
      throw new NotFoundException('Microsoft link not configured');
    }
    if (link.isEnabled !== true || link.syncTasksEnabled !== true) {
      throw new UnprocessableEntityException(
        'Sync tâches Microsoft désactivée pour ce projet',
      );
    }
    if (!link.plannerPlanId || !link.microsoftConnectionId) {
      throw new UnprocessableEntityException(
        'Configuration Microsoft projet incomplète (plannerPlanId / connexion requise)',
      );
    }

    // 3) Access token
    const accessToken = await this.microsoftOAuth.ensureFreshAccessToken(
      link.microsoftConnectionId,
      clientId,
    );

    // 4) Planner buckets (for status -> bucket)
    type PlannerBucket = { id: string; name: string };
    const bucketsResp = await this.graph.getJson<
      MicrosoftGraphODataListResponse<PlannerBucket>
    >(accessToken, `planner/plans/${link.plannerPlanId}/buckets`, {
      expectJson: true,
    });
    const buckets = bucketsResp?.value ?? [];
    if (buckets.length === 0) {
      throw new UnprocessableEntityException(
        'Aucun bucket Planner trouvé pour le plan configuré',
      );
    }

    const mapPriority = (p: ProjectTaskPriority): number => {
      switch (p) {
        case ProjectTaskPriority.CRITICAL:
          return 1;
        case ProjectTaskPriority.HIGH:
          return 3;
        case ProjectTaskPriority.MEDIUM:
          return 5;
        case ProjectTaskPriority.LOW:
        default:
          return 9;
      }
    };

    const resolveDueDateTime = (t: {
      plannedEndDate: Date | null;
      actualEndDate: Date | null;
    }): string | undefined => {
      const dt = t.actualEndDate ?? t.plannedEndDate;
      return dt ? dt.toISOString() : undefined;
    };

    const resolveStartDateTime = (t: {
      plannedStartDate: Date | null;
      actualStartDate: Date | null;
    }): string | undefined => {
      const dt = t.actualStartDate ?? t.plannedStartDate;
      return dt ? dt.toISOString() : undefined;
    };

    const stariumBuckets = await this.prisma.projectTaskBucket.findMany({
      where: { clientId, projectId },
      select: { id: true, name: true, plannerBucketId: true },
    });
    const bucketById = new Map(stariumBuckets.map((b) => [b.id, b]));

    const resolvePlannerBucketId = (task: {
      status: ProjectTaskStatus;
      bucketId: string | null;
    }): string => {
      if (task.bucketId) {
        const b = bucketById.get(task.bucketId);
        if (b?.plannerBucketId) return b.plannerBucketId;
        if (b) {
          const byName = buckets.find((x) => x.name === b.name);
          if (byName) return byName.id;
          const byNameCi = buckets.find(
            (x) => x.name.toLowerCase() === b.name.toLowerCase(),
          );
          if (byNameCi) return byNameCi.id;
        }
      }
      const fromStatus = plannerBucketIdForTaskStatus(task.status, buckets);
      if (fromStatus) return fromStatus;
      const exact = buckets.find((b) => b.name === task.status);
      if (exact) return exact.id;
      if (task.status === ProjectTaskStatus.TODO) return buckets[0].id;
      if (task.status === ProjectTaskStatus.DONE)
        return buckets[buckets.length - 1].id;
      return buckets[0].id;
    };

    // 5) Load tasks in deterministic order
    const tasks = await this.prisma.projectTask.findMany({
      where: { clientId, projectId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        description: true,
        plannedStartDate: true,
        actualStartDate: true,
        plannedEndDate: true,
        actualEndDate: true,
        status: true,
        priority: true,
        bucketId: true,
        checklistItems: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            title: true,
            isChecked: true,
            sortOrder: true,
            plannerChecklistItemKey: true,
          },
        },
      },
    });

    const taskIds = tasks.map((t) => t.id);

    // 6) Load mappings with strict scope + deterministic order
    const existingSyncs = await this.prisma.projectTaskMicrosoftSync.findMany({
      where: {
        clientId,
        projectId,
        projectTaskId: { in: taskIds },
      },
      orderBy: [{ projectTaskId: 'asc' }],
      select: {
        id: true,
        projectTaskId: true,
        plannerTaskId: true,
      },
    });
    const syncByTaskId = new Map(
      existingSyncs.map((s) => [s.projectTaskId, s]),
    );

    let synced = 0;
    let failed = 0;
    let stopError: unknown = null;

    // 7) Process tasks (stop au 1er échec)
    for (const task of tasks) {
      const mapping = syncByTaskId.get(task.id);

      const resolvedPlannerBucketId = resolvePlannerBucketId(task);
      const priority = mapPriority(task.priority);
      const dueDateTime = resolveDueDateTime(task);
      const startDateTime = resolveStartDateTime(task);
      const plannerTaskDateFields = {
        ...(dueDateTime ? { dueDateTime } : {}),
        ...(startDateTime ? { startDateTime } : {}),
      };

      if (!mapping) {
        // Create Planner task first, then create mapping as PENDING, then sync full.
        let plannerTaskId: string | undefined;
        try {
          const created = await this.graph.postJson<{ id: string }>(
            accessToken,
            'planner/tasks',
            {
              planId: link.plannerPlanId,
              bucketId: resolvedPlannerBucketId,
              title: task.name,
              ...plannerTaskDateFields,
              priority,
            },
            { expectJson: true },
          );

          if (!created || !('id' in created) || !created.id) {
            // Creation succeeded but no plannerTaskId returned => no mapping.
            throw new Error('plannerTaskId manquant après création Planner');
          }
          plannerTaskId = created.id;

          await this.prisma.projectTaskMicrosoftSync.create({
            data: {
              clientId,
              projectId,
              projectTaskId: task.id,
              projectMicrosoftLinkId: link.id,
              plannerTaskId,
              syncStatus: MicrosoftSyncStatus.PENDING,
              lastError: null,
            },
          });

          // Task PATCH uses ETag of plannerTask
          const taskWithEtag = await this.graph.getPlannerTaskWithEtag<
            unknown
          >(accessToken, plannerTaskId);
          if (!taskWithEtag.etag) {
            throw new Error('ETag manquant pour plannerTask');
          }

          await this.graph.patchJson(
            accessToken,
            `planner/tasks/${plannerTaskId}`,
            {
              title: task.name,
              bucketId: resolvedPlannerBucketId,
              ...plannerTaskDateFields,
              priority,
            },
            {
              headers: { 'If-Match': taskWithEtag.etag },
            },
          );

          const detailsPatch = await this.buildPlannerTaskDetailsPatchPayload(
            accessToken,
            plannerTaskId,
            clientId,
            projectId,
            task.id,
            task.description ?? null,
          );

          await this.graph.patchJson(
            accessToken,
            `planner/tasks/${plannerTaskId}/details`,
            detailsPatch.body,
            {
              headers: { 'If-Match': detailsPatch.etag },
            },
          );

          await this.prisma.projectTaskMicrosoftSync.update({
            where: {
              clientId_projectTaskId: {
                clientId,
                projectTaskId: task.id,
              },
            },
            data: {
              syncStatus: MicrosoftSyncStatus.SYNCED,
              lastPushedAt: new Date(),
              lastError: null,
            },
          });

          await this.alignStariumTaskBucketAfterPlannerPush(
            clientId,
            projectId,
            task.id,
            resolvedPlannerBucketId,
            buckets,
            stariumBuckets,
          );

          synced++;
        } catch (e: unknown) {
          failed++;
          stopError = e;

          const lastError = this.normalizeSyncError(e);

          // Mapping must exist if plannerTaskId was returned; update to ERROR.
          if (plannerTaskId) {
            await this.prisma.projectTaskMicrosoftSync.update({
              where: {
                clientId_projectTaskId: {
                  clientId,
                  projectTaskId: task.id,
                },
              },
              data: {
                syncStatus: MicrosoftSyncStatus.ERROR,
                lastError,
              },
            });
          }

          await this.auditLogs.create({
            clientId,
            userId: context?.actorUserId,
            action: AUDIT_ACTION_TASK_SYNC_FAILED,
            resourceType: AUDIT_RESOURCE_TYPE,
            resourceId: task.id,
            newValue: { lastError },
            ipAddress: context?.meta?.ipAddress,
            userAgent: context?.meta?.userAgent,
            requestId: context?.meta?.requestId,
          });

          break;
        }
      } else {
        // Update Planner task using mapping.
        try {
          const plannerTaskId = mapping.plannerTaskId;

          // ETags: task and details are retrieved separately.
          const taskWithEtag = await this.graph.getPlannerTaskWithEtag<
            unknown
          >(accessToken, plannerTaskId);
          if (!taskWithEtag.etag) {
            throw new Error('ETag manquant pour plannerTask');
          }

          await this.graph.patchJson(
            accessToken,
            `planner/tasks/${plannerTaskId}`,
            {
              title: task.name,
              bucketId: resolvedPlannerBucketId,
              ...plannerTaskDateFields,
              priority,
            },
            { headers: { 'If-Match': taskWithEtag.etag } },
          );

          const detailsPatch = await this.buildPlannerTaskDetailsPatchPayload(
            accessToken,
            plannerTaskId,
            clientId,
            projectId,
            task.id,
            task.description ?? null,
          );

          await this.graph.patchJson(
            accessToken,
            `planner/tasks/${plannerTaskId}/details`,
            detailsPatch.body,
            { headers: { 'If-Match': detailsPatch.etag } },
          );

          await this.prisma.projectTaskMicrosoftSync.update({
            where: {
              clientId_projectTaskId: {
                clientId,
                projectTaskId: task.id,
              },
            },
            data: {
              syncStatus: MicrosoftSyncStatus.SYNCED,
              lastPushedAt: new Date(),
              lastError: null,
            },
          });

          await this.alignStariumTaskBucketAfterPlannerPush(
            clientId,
            projectId,
            task.id,
            resolvedPlannerBucketId,
            buckets,
            stariumBuckets,
          );

          synced++;
        } catch (e: unknown) {
          failed++;
          stopError = e;

          const lastError = this.normalizeSyncError(e);

          await this.prisma.projectTaskMicrosoftSync.update({
            where: {
              clientId_projectTaskId: {
                clientId,
                projectTaskId: task.id,
              },
            },
            data: {
              syncStatus: MicrosoftSyncStatus.ERROR,
              lastError,
            },
          });

          await this.auditLogs.create({
            clientId,
            userId: context?.actorUserId,
            action: AUDIT_ACTION_TASK_SYNC_FAILED,
            resourceType: AUDIT_RESOURCE_TYPE,
            resourceId: task.id,
            newValue: { lastError },
            ipAddress: context?.meta?.ipAddress,
            userAgent: context?.meta?.userAgent,
            requestId: context?.meta?.requestId,
          });

          break;
        }
      }
    }

    // 8) Audit + lastSyncAt seulement si succès complet
    if (stopError === null) {
      await this.prisma.projectMicrosoftLink.update({
        where: { id: link.id },
        data: { lastSyncAt: new Date() },
      });

      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: AUDIT_ACTION_TASKS_SYNCED,
        resourceType: AUDIT_RESOURCE_TYPE,
        resourceId: projectId,
        newValue: { total: tasks.length, synced },
        ipAddress: context?.meta?.ipAddress,
        userAgent: context?.meta?.userAgent,
        requestId: context?.meta?.requestId,
      });
    }

    return { total: tasks.length, synced, failed };
  }

  async syncDocuments(
    clientId: string,
    projectId: string,
    context?: AuditContext,
  ): Promise<SyncDocumentsResult> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, clientId },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const link = await this.prisma.projectMicrosoftLink.findFirst({
      where: { projectId, clientId },
    });
    if (!link) {
      throw new NotFoundException('Microsoft link not configured');
    }
    if (link.isEnabled !== true || link.syncDocumentsEnabled !== true) {
      throw new UnprocessableEntityException(
        'Sync documents Microsoft désactivée pour ce projet',
      );
    }
    if (!link.filesDriveId?.trim() || !link.microsoftConnectionId) {
      throw new UnprocessableEntityException(
        'Configuration Microsoft projet incomplète (filesDriveId / connexion requise)',
      );
    }

    const accessToken = await this.microsoftOAuth.ensureFreshAccessToken(
      link.microsoftConnectionId,
      clientId,
    );

    const folderName = this.stariumProjectFolderName(projectId);
    await this.graph.ensureFolderUnderDriveRoot(
      accessToken,
      link.filesDriveId,
      folderName,
    );

    const activeDocs = await this.prisma.projectDocument.findMany({
      where: {
        clientId,
        projectId,
        status: ProjectDocumentStatus.ACTIVE,
        deletedAt: null,
        archivedAt: null,
      },
      select: { id: true, storageType: true, storageKey: true },
    });

    const documents = await this.prisma.projectDocument.findMany({
      where: {
        clientId,
        projectId,
        status: ProjectDocumentStatus.ACTIVE,
        deletedAt: null,
        archivedAt: null,
        storageType: ProjectDocumentStorageType.STARIUM,
        storageKey: { not: null },
        NOT: { storageKey: '' },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    const skipped = activeDocs.length - documents.length;

    const docIds = documents.map((d) => d.id);
    const existingSyncs =
      docIds.length === 0
        ? []
        : await this.prisma.projectDocumentMicrosoftSync.findMany({
            where: {
              clientId,
              projectId,
              projectDocumentId: { in: docIds },
            },
            select: {
              id: true,
              projectDocumentId: true,
              driveItemId: true,
            },
          });
    const syncByDocId = new Map(
      existingSyncs.map((s) => [s.projectDocumentId, s]),
    );

    let synced = 0;
    let failed = 0;
    let stopError: unknown = null;

    for (const doc of documents) {
      const mapping = syncByDocId.get(doc.id);
      const safeName = this.buildDocumentDriveFilename(doc);
      const encodedPath = this.graph.encodeDrivePathSegments([
        folderName,
        safeName,
      ]);
      const contentType =
        doc.mimeType?.trim() || 'application/octet-stream';

      let buffer: Buffer;
      try {
        buffer = this.projectDocumentContent.readStariumBuffer(
          clientId,
          projectId,
          doc.storageKey!,
        );
      } catch (e: unknown) {
        failed++;
        stopError = e;
        const lastError = this.normalizeDocumentSyncError(e);
        if (mapping) {
          await this.prisma.projectDocumentMicrosoftSync.update({
            where: { projectDocumentId: doc.id },
            data: {
              syncStatus: MicrosoftSyncStatus.ERROR,
              lastError,
            },
          });
        }
        await this.auditLogs.create({
          clientId,
          userId: context?.actorUserId,
          action: AUDIT_ACTION_DOC_SYNC_FAILED,
          resourceType: AUDIT_RESOURCE_TYPE,
          resourceId: doc.id,
          newValue: { lastError },
          ipAddress: context?.meta?.ipAddress,
          userAgent: context?.meta?.userAgent,
          requestId: context?.meta?.requestId,
        });
        break;
      }

      if (!mapping) {
        try {
          const { id: newItemId } = await this.graph.uploadOrReplaceDriveFile(
            accessToken,
            link.filesDriveId,
            encodedPath,
            buffer,
            contentType,
            null,
          );

          await this.prisma.projectDocumentMicrosoftSync.create({
            data: {
              clientId,
              projectId,
              projectDocumentId: doc.id,
              projectMicrosoftLinkId: link.id,
              driveId: link.filesDriveId,
              driveItemId: newItemId,
              folderPath: folderName,
              syncStatus: MicrosoftSyncStatus.PENDING,
              lastError: null,
            },
          });

          await this.prisma.projectDocumentMicrosoftSync.update({
            where: { projectDocumentId: doc.id },
            data: {
              syncStatus: MicrosoftSyncStatus.SYNCED,
              lastPushedAt: new Date(),
              lastError: null,
            },
          });

          synced++;
        } catch (e: unknown) {
          failed++;
          stopError = e;
          const lastError = this.normalizeDocumentSyncError(e);
          const rowAfter =
            await this.prisma.projectDocumentMicrosoftSync.findFirst({
              where: { clientId, projectDocumentId: doc.id },
            });
          if (rowAfter) {
            await this.prisma.projectDocumentMicrosoftSync.update({
              where: { id: rowAfter.id },
              data: {
                syncStatus: MicrosoftSyncStatus.ERROR,
                lastError,
              },
            });
          }
          await this.auditLogs.create({
            clientId,
            userId: context?.actorUserId,
            action: AUDIT_ACTION_DOC_SYNC_FAILED,
            resourceType: AUDIT_RESOURCE_TYPE,
            resourceId: doc.id,
            newValue: { lastError },
            ipAddress: context?.meta?.ipAddress,
            userAgent: context?.meta?.userAgent,
            requestId: context?.meta?.requestId,
          });
          break;
        }
      } else {
        try {
          const { id } = await this.graph.uploadOrReplaceDriveFile(
            accessToken,
            link.filesDriveId,
            encodedPath,
            buffer,
            contentType,
            mapping.driveItemId,
          );

          await this.prisma.projectDocumentMicrosoftSync.update({
            where: { projectDocumentId: doc.id },
            data: {
              driveItemId: id,
              driveId: link.filesDriveId,
              folderPath: folderName,
              syncStatus: MicrosoftSyncStatus.SYNCED,
              lastPushedAt: new Date(),
              lastError: null,
            },
          });

          synced++;
        } catch (e: unknown) {
          failed++;
          stopError = e;
          const lastError = this.normalizeDocumentSyncError(e);
          await this.prisma.projectDocumentMicrosoftSync.update({
            where: { projectDocumentId: doc.id },
            data: {
              syncStatus: MicrosoftSyncStatus.ERROR,
              lastError,
            },
          });
          await this.auditLogs.create({
            clientId,
            userId: context?.actorUserId,
            action: AUDIT_ACTION_DOC_SYNC_FAILED,
            resourceType: AUDIT_RESOURCE_TYPE,
            resourceId: doc.id,
            newValue: { lastError },
            ipAddress: context?.meta?.ipAddress,
            userAgent: context?.meta?.userAgent,
            requestId: context?.meta?.requestId,
          });
          break;
        }
      }
    }

    if (stopError === null) {
      await this.prisma.projectMicrosoftLink.update({
        where: { id: link.id },
        data: { lastSyncAt: new Date() },
      });

      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: AUDIT_ACTION_DOCUMENTS_SYNCED,
        resourceType: AUDIT_RESOURCE_TYPE,
        resourceId: projectId,
        newValue: { total: documents.length, synced, skipped },
        ipAddress: context?.meta?.ipAddress,
        userAgent: context?.meta?.userAgent,
        requestId: context?.meta?.requestId,
      });
    }

    return {
      total: documents.length,
      synced,
      failed,
      skipped,
    };
  }

  private stariumProjectFolderName(projectId: string): string {
    return `starium-project-${projectId}`;
  }

  private buildDocumentDriveFilename(doc: {
    originalFilename?: string | null;
    name: string;
    extension?: string | null;
  }): string {
    const raw =
      doc.originalFilename?.trim() || doc.name.trim() || 'document';
    const ext = doc.extension?.trim();
    let name = raw.replace(/[\\/:*?"<>|]/g, '_').trim();
    if (
      ext &&
      !name.toLowerCase().endsWith(`.${ext.toLowerCase()}`)
    ) {
      name = `${name}.${ext.replace(/[\\/:*?"<>|]/g, '_')}`;
    }
    return name.length > 0 ? name : `document-${Date.now()}.bin`;
  }

  private normalizeDocumentSyncError(e: unknown): string {
    if (e instanceof MicrosoftGraphHttpError) {
      return e.graphMessage ?? e.graphCode ?? e.message;
    }
    if (e instanceof Error) return e.message;
    return 'Erreur inconnue de sync documents Microsoft';
  }

  private normalizeSyncError(e: unknown): string {
    if (e instanceof MicrosoftGraphHttpError) {
      return e.graphMessage ?? e.graphCode ?? e.message;
    }
    if (e instanceof Error) return e.message;
    return 'Erreur inconnue de sync Planner';
  }
}

