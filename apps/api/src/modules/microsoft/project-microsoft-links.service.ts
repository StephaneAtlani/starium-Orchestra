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

const AUDIT_ACTION_ENABLED = 'project.microsoft_link.enabled';
const AUDIT_ACTION_UPDATED = 'project.microsoft_link.updated';
const AUDIT_ACTION_TASKS_SYNCED = 'project.microsoft_tasks.synced';
const AUDIT_ACTION_DOCUMENTS_SYNCED = 'project.microsoft_documents.synced';
const AUDIT_ACTION_TASK_SYNC_FAILED = 'project.microsoft_sync.failed';
const AUDIT_ACTION_DOC_SYNC_FAILED = 'project.microsoft_sync.failed';
const AUDIT_RESOURCE_TYPE = 'project';

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
      },
      newValue: {
        isEnabled: updated.isEnabled,
        teamId: updated.teamId ?? null,
        channelId: updated.channelId ?? null,
        plannerPlanId: updated.plannerPlanId ?? null,
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

    const resolveBucketId = (
      status: ProjectTaskStatus,
    ): string => {
      const exact = buckets.find((b) => b.name === status);
      if (exact) return exact.id;
      if (status === ProjectTaskStatus.TODO) return buckets[0].id;
      if (status === ProjectTaskStatus.DONE)
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
        plannedEndDate: true,
        actualEndDate: true,
        status: true,
        priority: true,
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

      const bucketId = resolveBucketId(task.status);
      const priority = mapPriority(task.priority);
      const dueDateTime = resolveDueDateTime(task);

      if (!mapping) {
        // Create Planner task first, then create mapping as PENDING, then sync full.
        let plannerTaskId: string | undefined;
        try {
          const created = await this.graph.postJson<{ id: string }>(
            accessToken,
            'planner/tasks',
            {
              planId: link.plannerPlanId,
              bucketId,
              title: task.name,
              ...(dueDateTime ? { dueDateTime } : {}),
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
              bucketId,
              ...(dueDateTime ? { dueDateTime } : {}),
              priority,
            },
            {
              headers: { 'If-Match': taskWithEtag.etag },
            },
          );

          // Details PATCH uses ETag of plannerTaskDetails
          const detailsWithEtag = await this.graph.getPlannerTaskDetailsWithEtag<
            unknown
          >(accessToken, plannerTaskId);
          if (!detailsWithEtag.etag) {
            throw new Error('ETag manquant pour plannerTaskDetails');
          }

          await this.graph.patchJson(
            accessToken,
            `planner/tasks/${plannerTaskId}/details`,
            {
              description: task.description ?? '',
            },
            {
              headers: { 'If-Match': detailsWithEtag.etag },
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
              bucketId,
              ...(dueDateTime ? { dueDateTime } : {}),
              priority,
            },
            { headers: { 'If-Match': taskWithEtag.etag } },
          );

          const detailsWithEtag =
            await this.graph.getPlannerTaskDetailsWithEtag<unknown>(
              accessToken,
              plannerTaskId,
            );
          if (!detailsWithEtag.etag) {
            throw new Error('ETag manquant pour plannerTaskDetails');
          }

          await this.graph.patchJson(
            accessToken,
            `planner/tasks/${plannerTaskId}/details`,
            {
              description: task.description ?? '',
            },
            { headers: { 'If-Match': detailsWithEtag.etag } },
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

