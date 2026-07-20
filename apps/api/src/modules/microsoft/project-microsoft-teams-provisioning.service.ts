import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  MicrosoftConnectionStatus,
  Prisma,
  ProjectMicrosoftTeamsProvisioningResolutionType,
  ProjectMicrosoftTeamsProvisioningStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { AuditContext } from '../budget-management/types/audit-context';
import { QueueService } from '../queue/queue.service';
import type { ProjectMicrosoftTeamsProvisioningJobPayload } from '../queue/queue.service';
import { MicrosoftGraphService } from './microsoft-graph.service';
import { MicrosoftGraphHttpError } from './microsoft-graph.types';
import { MicrosoftOAuthService } from './microsoft-oauth.service';
import { ResolveProjectMicrosoftTeamsProvisioningDto } from './dto/resolve-project-microsoft-teams-provisioning.dto';
import {
  AUDIT_ACTION_PROVISIONING_UNKNOWN_RESOLVED,
  BULLMQ_LIVE_JOB_STATES,
  buildProjectMicrosoftTeamsProvisioningJobId,
  ERROR_CODE_GRAPH_TRANSIENT_RETRIES_EXHAUSTED,
  ERROR_CODE_MICROSOFT_GRAPH_REAUTH_REQUIRED,
  ERROR_CODE_MICROSOFT_TEAM_CREATE_FORBIDDEN,
  ERROR_CODE_PROVISIONED_TEAM_PENDING_RECOVERY,
  ERROR_CODE_QUEUE_JOB_STATE_UNKNOWN,
  ERROR_CODE_QUEUE_RETRY_FAILED,
  ERROR_CODE_QUEUE_UNAVAILABLE,
  ERROR_CODE_TEAM_CREATION_CONFIRMED_NOT_CREATED,
  ERROR_CODE_TEAM_CREATION_OUTCOME_UNKNOWN,
  RETRYABLE_PROVISIONING_ERROR_CODES,
} from './project-microsoft-teams-provisioning.constants';
import { Job, UnrecoverableError } from 'bullmq';

const AUDIT_RESOURCE_TYPE = 'project';
const PROVISIONING_STARTED_AUDIT = 'provision.started';
const PROVISIONING_COMPLETED_AUDIT = 'provision.completed';
const PROVISIONING_PARTIAL_AUDIT = 'provision.partial';
const PROVISIONING_FAILED_AUDIT = 'provision.failed';

export type ProcessProvisioningJobOptions = {
  signal?: AbortSignal;
  onPollHeartbeat?: () => void | Promise<void>;
};

export class ProvisioningJobAbortedError extends Error {
  constructor(message = 'Timeout Graph après expiration du job provisioning') {
    super(message);
    this.name = 'ProvisioningJobAbortedError';
  }
}

type ProvisioningRunRecord = Prisma.ProjectMicrosoftTeamsProvisioningGetPayload<{
  include: {
    project: {
      select: {
        id: true;
        name: true;
        code: true;
        ownerFreeLabel: true;
        owner: { select: { firstName: true; lastName: true; email: true } };
      };
    };
    microsoftConnection: true;
  };
}>;

type ProvisioningStatusDto = {
  id: string;
  clientId: string;
  projectId: string;
  status: ProjectMicrosoftTeamsProvisioningStatus;
  teamDisplayName: string;
  teamDescription: string | null;
  microsoftTeamId: string | null;
  teamWebUrl: string | null;
  graphOperationUrl: string | null;
  graphContentLocation: string | null;
  graphCreateRequestedAt: string | null;
  retryCount: number;
  retryRequestedAt: string | null;
  currentJobId: string | null;
  lastHeartbeatAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  resolvedAt: string | null;
  resolutionType: ProjectMicrosoftTeamsProvisioningResolutionType | null;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class ProjectMicrosoftTeamsProvisioningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly queueService: QueueService,
    private readonly microsoftOAuth: MicrosoftOAuthService,
    private readonly graph: MicrosoftGraphService,
  ) {}

  async getLatestProvisioning(
    clientId: string,
    projectId: string,
  ): Promise<ProvisioningStatusDto> {
    await this.assertProjectExists(clientId, projectId);

    const run = await this.prisma.projectMicrosoftTeamsProvisioning.findFirst({
      where: { clientId, projectId },
      orderBy: [{ createdAt: 'desc' }],
    });
    if (!run) {
      throw new NotFoundException('Aucun provisioning Microsoft Teams pour ce projet');
    }
    return this.toStatusDto(run);
  }

  async startProvisioning(
    clientId: string,
    projectId: string,
    triggeredByUserId: string | undefined,
    context?: AuditContext,
  ): Promise<ProvisioningStatusDto> {
    const project = await this.loadProjectForProvisioning(clientId, projectId);
    const settings = await this.prisma.projectMicrosoftTeamsProvisioningSettings.findUnique({
      where: { clientId },
    });
    if (!settings?.isEnabled) {
      throw new UnprocessableEntityException(
        'Le provisioning Microsoft Teams est désactivé pour ce client.',
      );
    }

    const connection = await this.microsoftOAuth.getActiveConnection(clientId);
    if (!connection || connection.status !== MicrosoftConnectionStatus.ACTIVE) {
      throw new UnprocessableEntityException(
        'Connexion Microsoft active requise pour créer l’équipe Teams.',
      );
    }

    const link = await this.prisma.projectMicrosoftLink.findFirst({
      where: { clientId, projectId },
    });
    if (link?.teamId) {
      throw new ConflictException(
        'Une équipe Microsoft est déjà rattachée à ce projet.',
      );
    }

    const blockingRun = await this.findBlockingRun(clientId, projectId);
    if (blockingRun) {
      throw new ConflictException(
        blockingRun.errorCode === ERROR_CODE_PROVISIONED_TEAM_PENDING_RECOVERY
          ? 'Une équipe provisionnée partiellement doit être récupérée avant une nouvelle création.'
          : 'Un provisioning Microsoft Teams est déjà actif pour ce projet.',
      );
    }

    const teamDisplayName = this.resolveTeamName(
      settings.teamNameTemplate,
      project,
    );
    const teamDescription = settings.teamDescriptionTemplate?.trim() || null;

    let run;
    try {
      run = await this.prisma.projectMicrosoftTeamsProvisioning.create({
        data: {
          clientId,
          projectId,
          microsoftConnectionId: connection.id,
          triggeredByUserId: triggeredByUserId ?? null,
          status: ProjectMicrosoftTeamsProvisioningStatus.PENDING,
          teamDisplayName,
          teamDescription,
        },
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Un provisioning Microsoft Teams est déjà actif.');
      }
      throw error;
    }

    try {
      const job = await this.queueService.enqueueProjectMicrosoftTeamsProvisioning(
        { provisioningId: run.id },
        0,
      );
      const jobId = String(job.id);
      run = await this.prisma.projectMicrosoftTeamsProvisioning.update({
        where: { id: run.id },
        data: { currentJobId: jobId },
      });
    } catch {
      run = await this.prisma.projectMicrosoftTeamsProvisioning.update({
        where: { id: run.id },
        data: {
          status: ProjectMicrosoftTeamsProvisioningStatus.FAILED,
          errorCode: ERROR_CODE_QUEUE_UNAVAILABLE,
          errorMessage: 'La file BullMQ est indisponible pour le provisioning Teams.',
        },
      });
      await this.auditLogs.create({
        clientId,
        userId: triggeredByUserId,
        action: PROVISIONING_FAILED_AUDIT,
        resourceType: AUDIT_RESOURCE_TYPE,
        resourceId: projectId,
        newValue: this.toStatusDto(run),
        ipAddress: context?.meta?.ipAddress,
        userAgent: context?.meta?.userAgent,
        requestId: context?.meta?.requestId,
      });
      throw new ServiceUnavailableException(
        'Impossible de lancer la file de provisioning Microsoft Teams.',
      );
    }

    await this.auditLogs.create({
      clientId,
      userId: triggeredByUserId,
      action: PROVISIONING_STARTED_AUDIT,
      resourceType: AUDIT_RESOURCE_TYPE,
      resourceId: projectId,
      newValue: this.toStatusDto(run),
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return this.toStatusDto(run);
  }

  async startProvisioningAfterProjectCreate(
    clientId: string,
    projectId: string,
    triggeredByUserId: string | undefined,
    context?: AuditContext,
  ): Promise<void> {
    const settings = await this.prisma.projectMicrosoftTeamsProvisioningSettings.findUnique({
      where: { clientId },
    });
    const connection = await this.microsoftOAuth.getActiveConnection(clientId);
    if (!settings?.isEnabled || !settings.offerOnProjectCreate || !connection) {
      return;
    }
    await this.startProvisioning(clientId, projectId, triggeredByUserId, context);
  }

  async retryProvisioning(
    clientId: string,
    projectId: string,
    provisioningId: string,
    actorUserId: string | undefined,
    context?: AuditContext,
  ): Promise<ProvisioningStatusDto> {
    await this.assertProjectExists(clientId, projectId);
    const run = await this.prisma.projectMicrosoftTeamsProvisioning.findFirst({
      where: { id: provisioningId, clientId, projectId },
    });
    if (!run) {
      throw new NotFoundException('Run de provisioning introuvable');
    }

    if (
      run.errorCode === ERROR_CODE_TEAM_CREATION_OUTCOME_UNKNOWN &&
      !run.resolvedAt
    ) {
      throw new ConflictException(
        'Ce run doit être résolu manuellement avant tout retry.',
      );
    }
    if (
      run.resolutionType ===
        ProjectMicrosoftTeamsProvisioningResolutionType.CONFIRMED_NOT_CREATED ||
      run.errorCode === ERROR_CODE_TEAM_CREATION_CONFIRMED_NOT_CREATED
    ) {
      throw new ConflictException(
        'Ce run clos ne peut pas être relancé ; créez un nouveau provisioning.',
      );
    }
    if (
      run.status !== ProjectMicrosoftTeamsProvisioningStatus.FAILED &&
      run.status !== ProjectMicrosoftTeamsProvisioningStatus.PARTIAL
    ) {
      throw new ConflictException('Seuls les runs échoués ou partiels sont relançables.');
    }
    if (!run.errorCode || !RETRYABLE_PROVISIONING_ERROR_CODES.has(run.errorCode)) {
      throw new ConflictException(
        'Ce code d’erreur ne permet pas de relancer le provisioning.',
      );
    }

    const queue = this.queueService.getProjectMicrosoftTeamsProvisioningQueue();
    const readCurrentJobId = run.currentJobId;
    let existingJob = readCurrentJobId
      ? await queue.getJob(readCurrentJobId).catch(() => null)
      : null;

    if (existingJob) {
      let state: string;
      try {
        state = await existingJob.getState();
      } catch {
        await this.failRunIfNotTerminal(
          run.id,
          run.clientId,
          run.projectId,
          ERROR_CODE_QUEUE_JOB_STATE_UNKNOWN,
          'État BullMQ illisible lors du retry.',
        );
        throw new ConflictException(
          'État de la file BullMQ illisible ; relancez après vérification.',
        );
      }

      if (state === 'failed') {
        const reserved = await this.reserveRetryTransition(run.id, readCurrentJobId!);
        if (!reserved) {
          const latest = await this.prisma.projectMicrosoftTeamsProvisioning.findUnique({
            where: { id: run.id },
          });
          if (latest) return this.toStatusDto(latest);
          throw new ConflictException('Retry déjà en cours ou terminé.');
        }
        try {
          await existingJob.retry('failed');
        } catch {
          await this.compensateRetryEnqueueFailure(run.id, readCurrentJobId!);
          throw new ConflictException('Impossible de relancer le job BullMQ existant.');
        }
        const refreshed = await this.prisma.projectMicrosoftTeamsProvisioning.findUnique({
          where: { id: run.id },
        });
        if (!refreshed) {
          throw new NotFoundException('Run de provisioning introuvable');
        }
        await this.auditRetryStarted(refreshed, clientId, projectId, actorUserId, context);
        return this.toStatusDto(refreshed);
      }

      if (BULLMQ_LIVE_JOB_STATES.has(state)) {
        const targetStatus =
          state === 'active'
            ? ProjectMicrosoftTeamsProvisioningStatus.IN_PROGRESS
            : ProjectMicrosoftTeamsProvisioningStatus.PENDING;
        await this.prisma.projectMicrosoftTeamsProvisioning.updateMany({
          where: {
            id: run.id,
            status: {
              in: [
                ProjectMicrosoftTeamsProvisioningStatus.FAILED,
                ProjectMicrosoftTeamsProvisioningStatus.PARTIAL,
              ],
            },
          },
          data: {
            status: targetStatus,
            errorCode: null,
            errorMessage: null,
            lastHeartbeatAt: new Date(),
          },
        });
        const refreshed = await this.prisma.projectMicrosoftTeamsProvisioning.findUnique({
          where: { id: run.id },
        });
        if (!refreshed) {
          throw new NotFoundException('Run de provisioning introuvable');
        }
        return this.toStatusDto(refreshed);
      }

      if (state === 'completed') {
        existingJob = null;
      } else if (state === 'paused' || state === 'repeat') {
        await this.failRunIfNotTerminal(
          run.id,
          run.clientId,
          run.projectId,
          ERROR_CODE_QUEUE_JOB_STATE_UNKNOWN,
          `État BullMQ inattendu (${state}) lors du retry.`,
        );
        throw new ConflictException(
          'État de la file BullMQ inattendu ; action manuelle requise.',
        );
      }
    }

    const nextRetryCount = run.retryCount + 1;
    const newJobId = buildProjectMicrosoftTeamsProvisioningJobId(
      run.id,
      nextRetryCount,
    );

    const reserved = await this.prisma.projectMicrosoftTeamsProvisioning.updateMany({
      where: {
        id: run.id,
        status: {
          in: [
            ProjectMicrosoftTeamsProvisioningStatus.FAILED,
            ProjectMicrosoftTeamsProvisioningStatus.PARTIAL,
          ],
        },
        errorCode: { in: [...RETRYABLE_PROVISIONING_ERROR_CODES] },
        currentJobId: readCurrentJobId,
      },
      data: {
        status: ProjectMicrosoftTeamsProvisioningStatus.PENDING,
        currentJobId: newJobId,
        retryCount: nextRetryCount,
        retryRequestedAt: new Date(),
        errorCode: null,
        errorMessage: null,
        lastHeartbeatAt: new Date(),
        version: { increment: 1 },
      },
    });

    if (reserved.count === 0) {
      const latest = await this.prisma.projectMicrosoftTeamsProvisioning.findUnique({
        where: { id: run.id },
      });
      if (latest) return this.toStatusDto(latest);
      throw new ConflictException('Retry déjà en cours ou terminé.');
    }

    try {
      const collisionJob = await queue.getJob(newJobId);
      if (collisionJob) {
        const collisionState = await collisionJob.getState();
        if (BULLMQ_LIVE_JOB_STATES.has(collisionState)) {
          const refreshed = await this.prisma.projectMicrosoftTeamsProvisioning.findUnique({
            where: { id: run.id },
          });
          if (!refreshed) {
            throw new NotFoundException('Run de provisioning introuvable');
          }
          return this.toStatusDto(refreshed);
        }
        await this.compensateRetryEnqueueFailure(run.id, newJobId);
        throw new ConflictException('Collision BullMQ incompatible lors du retry.');
      }

      await this.queueService.enqueueProjectMicrosoftTeamsProvisioning(
        { provisioningId: run.id },
        nextRetryCount,
      );
    } catch {
      await this.compensateRetryEnqueueFailure(run.id, newJobId);
      throw new ConflictException('Impossible de distribuer le retry en file BullMQ.');
    }

    const refreshed = await this.prisma.projectMicrosoftTeamsProvisioning.findUnique({
      where: { id: run.id },
    });
    if (!refreshed) {
      throw new NotFoundException('Run de provisioning introuvable');
    }
    await this.auditRetryStarted(refreshed, clientId, projectId, actorUserId, context);
    return this.toStatusDto(refreshed);
  }

  private async reserveRetryTransition(
    runId: string,
    currentJobId: string,
  ): Promise<boolean> {
    const result = await this.prisma.projectMicrosoftTeamsProvisioning.updateMany({
      where: {
        id: runId,
        status: {
          in: [
            ProjectMicrosoftTeamsProvisioningStatus.FAILED,
            ProjectMicrosoftTeamsProvisioningStatus.PARTIAL,
          ],
        },
        errorCode: { in: [...RETRYABLE_PROVISIONING_ERROR_CODES] },
        currentJobId,
      },
      data: {
        status: ProjectMicrosoftTeamsProvisioningStatus.PENDING,
        retryCount: { increment: 1 },
        retryRequestedAt: new Date(),
        errorCode: null,
        errorMessage: null,
        lastHeartbeatAt: new Date(),
        version: { increment: 1 },
      },
    });
    return result.count > 0;
  }

  private async compensateRetryEnqueueFailure(
    runId: string,
    currentJobId: string,
  ): Promise<void> {
    await this.prisma.projectMicrosoftTeamsProvisioning.updateMany({
      where: {
        id: runId,
        status: ProjectMicrosoftTeamsProvisioningStatus.PENDING,
        currentJobId,
      },
      data: {
        status: ProjectMicrosoftTeamsProvisioningStatus.FAILED,
        errorCode: ERROR_CODE_QUEUE_RETRY_FAILED,
        errorMessage: 'Le retry n’a pas pu être distribué en file BullMQ.',
        lastHeartbeatAt: new Date(),
      },
    });
  }

  private async auditRetryStarted(
    run: { id: string; clientId: string; projectId: string },
    clientId: string,
    projectId: string,
    actorUserId: string | undefined,
    context?: AuditContext,
  ): Promise<void> {
    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: PROVISIONING_STARTED_AUDIT,
      resourceType: AUDIT_RESOURCE_TYPE,
      resourceId: projectId,
      newValue: this.toStatusDto(run as Parameters<typeof this.toStatusDto>[0]),
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
  }

  async resolveUnknown(
    clientId: string,
    projectId: string,
    provisioningId: string,
    dto: ResolveProjectMicrosoftTeamsProvisioningDto,
    actorUserId: string | undefined,
    context?: AuditContext,
  ): Promise<ProvisioningStatusDto> {
    const run = await this.loadProvisioningRun(clientId, projectId, provisioningId);
    if (
      run.errorCode !== ERROR_CODE_TEAM_CREATION_OUTCOME_UNKNOWN ||
      run.resolvedAt
    ) {
      throw new ConflictException(
        'Ce provisioning ne nécessite pas de résolution manuelle.',
      );
    }

    if (
      dto.resolutionType ===
      ProjectMicrosoftTeamsProvisioningResolutionType.CONFIRMED_NOT_CREATED
    ) {
      const updatedCount = await this.prisma.projectMicrosoftTeamsProvisioning.updateMany({
        where: {
          id: run.id,
          status: ProjectMicrosoftTeamsProvisioningStatus.FAILED,
          errorCode: ERROR_CODE_TEAM_CREATION_OUTCOME_UNKNOWN,
          resolvedAt: null,
        },
        data: {
          resolvedAt: new Date(),
          resolvedByUserId: actorUserId ?? null,
          resolutionType: dto.resolutionType,
          status: ProjectMicrosoftTeamsProvisioningStatus.FAILED,
          errorCode: ERROR_CODE_TEAM_CREATION_CONFIRMED_NOT_CREATED,
          errorMessage:
            'Création Microsoft confirmée absente ; un nouveau provisioning est autorisé.',
          version: { increment: 1 },
        },
      });
      if (updatedCount.count === 0) {
        throw new ConflictException(
          'Ce provisioning ne nécessite pas de résolution manuelle.',
        );
      }
      const updated = await this.prisma.projectMicrosoftTeamsProvisioning.findUnique({
        where: { id: run.id },
      });
      if (!updated) {
        throw new NotFoundException('Run de provisioning introuvable');
      }
      await this.auditLogs.create({
        clientId,
        userId: actorUserId,
        action: AUDIT_ACTION_PROVISIONING_UNKNOWN_RESOLVED,
        resourceType: AUDIT_RESOURCE_TYPE,
        resourceId: projectId,
        newValue: this.toStatusDto(updated),
        ipAddress: context?.meta?.ipAddress,
        userAgent: context?.meta?.userAgent,
        requestId: context?.meta?.requestId,
      });
      return this.toStatusDto(updated);
    }

    const teamId =
      dto.teamId?.trim() ||
      run.microsoftTeamId ||
      this.extractTeamIdFromContentLocation(run.graphContentLocation);
    if (!teamId) {
      throw new BadRequestException(
        'Aucun teamId Microsoft exploitable pour confirmer TEAM_FOUND.',
      );
    }

    const existingLink = await this.prisma.projectMicrosoftLink.findFirst({
      where: { clientId, projectId },
    });
    if (existingLink?.teamId && existingLink.teamId !== teamId) {
      throw new ConflictException(
        'Une autre équipe Microsoft est déjà rattachée à ce projet.',
      );
    }

    if (
      run.resolvedAt &&
      run.resolutionType ===
        ProjectMicrosoftTeamsProvisioningResolutionType.TEAM_FOUND &&
      run.microsoftTeamId === teamId
    ) {
      return this.toStatusDto(run);
    }

    const connection = await this.assertConnectionForRun(run);
    const team = await this.graph.getTeam(connection, teamId);

    let linkChannelId: string | null = null;
    let linkChannelName: string | null = null;
    let channelCreationFailed = false;

    try {
      const primaryChannel = await this.graph.getPrimaryTeamChannel(connection, teamId);
      linkChannelId = primaryChannel.id;
      linkChannelName = primaryChannel.displayName || 'Général';
    } catch {
      channelCreationFailed = true;
    }

    await this.upsertProjectMicrosoftLink(run, connection.id, {
      teamId,
      teamName: team.displayName || run.teamDisplayName,
      channelId: linkChannelId,
      channelName: linkChannelName,
      provisioningId: run.id,
      provisionedAt: new Date(),
    });

    const finalStatus = channelCreationFailed
      ? ProjectMicrosoftTeamsProvisioningStatus.PARTIAL
      : ProjectMicrosoftTeamsProvisioningStatus.COMPLETED;

    const updatedCount = await this.prisma.projectMicrosoftTeamsProvisioning.updateMany({
      where: {
        id: run.id,
        status: ProjectMicrosoftTeamsProvisioningStatus.FAILED,
        errorCode: ERROR_CODE_TEAM_CREATION_OUTCOME_UNKNOWN,
        resolvedAt: null,
      },
      data: {
        microsoftTeamId: teamId,
        teamWebUrl: team.webUrl || null,
        resolvedAt: new Date(),
        resolvedByUserId: actorUserId ?? null,
        resolutionType: dto.resolutionType,
        status: finalStatus,
        errorCode: channelCreationFailed
          ? ERROR_CODE_PROVISIONED_TEAM_PENDING_RECOVERY
          : null,
        errorMessage: channelCreationFailed
          ? 'La Team est rattachée ; certains canaux n’ont pas pu être provisionnés.'
          : null,
        version: { increment: 1 },
      },
    });

    if (updatedCount.count === 0) {
      throw new ConflictException(
        'Ce provisioning ne nécessite pas de résolution manuelle.',
      );
    }

    const updated = await this.prisma.projectMicrosoftTeamsProvisioning.findUnique({
      where: { id: run.id },
    });
    if (!updated) {
      throw new NotFoundException('Run de provisioning introuvable');
    }

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: AUDIT_ACTION_PROVISIONING_UNKNOWN_RESOLVED,
      resourceType: AUDIT_RESOURCE_TYPE,
      resourceId: projectId,
      newValue: this.toStatusDto(updated),
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return this.toStatusDto(updated);
  }

  async processProvisioningJob(
    provisioningId: string,
    options?: ProcessProvisioningJobOptions,
  ): Promise<void> {
    const run = await this.loadProvisioningRunById(provisioningId);
    const connection = await this.assertConnectionForRun(run);

    await this.touchHeartbeat(run.id, ProjectMicrosoftTeamsProvisioningStatus.IN_PROGRESS);

    try {
      let teamId = run.microsoftTeamId;
      let operationUrl = run.graphOperationUrl;
      let contentLocation = run.graphContentLocation;

      if (
        run.graphCreateRequestedAt &&
        !operationUrl &&
        !teamId
      ) {
        await this.failRunIfNotTerminal(
          run.id,
          run.clientId,
          run.projectId,
          ERROR_CODE_TEAM_CREATION_OUTCOME_UNKNOWN,
          'Résultat de création Microsoft inconnu ; résolution manuelle requise.',
        );
        return;
      }

      if (!operationUrl && !teamId) {
        options?.signal?.throwIfAborted();
        await this.prisma.projectMicrosoftTeamsProvisioning.update({
          where: { id: run.id },
          data: { graphCreateRequestedAt: new Date(), lastHeartbeatAt: new Date() },
        });

        const createResult = await this.graph.createTeam(connection, {
          displayName: run.teamDisplayName,
          description: run.teamDescription,
          visibility: 'private',
        });

        operationUrl = createResult.location;
        contentLocation = createResult.contentLocation;
        teamId = this.extractTeamIdFromContentLocation(contentLocation);

        await this.prisma.projectMicrosoftTeamsProvisioning.update({
          where: { id: run.id },
          data: {
            graphOperationUrl: operationUrl,
            graphContentLocation: contentLocation,
            microsoftTeamId: teamId,
            lastHeartbeatAt: new Date(),
          },
        });
      }

      // Toujours attendre la fin de l’opération async Graph avant canaux —
      // Content-Location peut arriver avant que la Team soit administrable.
      if (operationUrl) {
        options?.signal?.throwIfAborted();
        const pollResult = await this.graph.pollAsyncOperation(
          connection,
          operationUrl,
          {
            signal: options?.signal,
            onHeartbeat: options?.onPollHeartbeat,
          },
        );
        teamId =
          teamId ??
          this.extractTeamIdFromOperationPayload(pollResult) ??
          this.extractTeamIdFromContentLocation(contentLocation);
        if (teamId && !run.microsoftTeamId) {
          await this.prisma.projectMicrosoftTeamsProvisioning.update({
            where: { id: run.id },
            data: { microsoftTeamId: teamId, lastHeartbeatAt: new Date() },
          });
        }
      }

      if (!teamId) {
        teamId = this.extractTeamIdFromContentLocation(contentLocation);
      }

      if (!teamId) {
        await this.failRunIfNotTerminal(
          run.id,
          run.clientId,
          run.projectId,
          ERROR_CODE_TEAM_CREATION_OUTCOME_UNKNOWN,
          'Impossible de confirmer l’identifiant de la Team Microsoft créée.',
        );
        return;
      }

      const team = await this.graph.getTeam(connection, teamId);
      await this.touchHeartbeat(run.id);

      // Rattachement immédiat dès que la Team est confirmée (avant canaux).
      await this.upsertProjectMicrosoftLink(run, connection.id, {
        teamId,
        teamName: team.displayName || run.teamDisplayName,
        channelId: null,
        channelName: null,
        provisioningId: run.id,
        provisionedAt: new Date(),
      });

      const templates = await this.prisma.projectMicrosoftTeamsChannelTemplate.findMany({
        where: { clientId: run.clientId },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      });

      const existingChannels = await this.graph.listTeamChannels(connection, teamId);
      const channelsByName = new Map(
        existingChannels.map((channel) => [
          channel.displayName.trim().toLowerCase(),
          channel,
        ]),
      );

      let linkChannelId: string | null = null;
      let linkChannelName: string | null = null;
      let channelCreationFailed = false;

      const primaryTemplate = templates.find((template) => template.isPrimary);
      if (primaryTemplate) {
        const key = primaryTemplate.displayName.trim().toLowerCase();
        let channel = channelsByName.get(key) ?? null;
        if (!channel) {
          try {
            channel = await this.graph.createTeamChannel(connection, teamId, {
              displayName: primaryTemplate.displayName,
              description: primaryTemplate.description,
              membershipType: 'standard',
            });
            channelsByName.set(key, channel);
          } catch {
            channelCreationFailed = true;
          }
        }
        linkChannelId = channel?.id ?? null;
        linkChannelName = channel?.displayName ?? primaryTemplate.displayName;
      }

      for (const template of templates.filter((item) => !item.isPrimary)) {
        const key = template.displayName.trim().toLowerCase();
        if (channelsByName.has(key)) continue;
        try {
          const channel = await this.graph.createTeamChannel(connection, teamId, {
            displayName: template.displayName,
            description: template.description,
            membershipType: 'standard',
          });
          channelsByName.set(key, channel);
        } catch {
          channelCreationFailed = true;
        }
        await this.touchHeartbeat(run.id);
      }

      // Canal de lien : template primary, sinon canal Général Graph.
      if (!linkChannelId) {
        try {
          const primaryChannel = await this.graph.getPrimaryTeamChannel(
            connection,
            teamId,
          );
          linkChannelId = primaryChannel.id;
          linkChannelName = primaryChannel.displayName || 'Général';
        } catch {
          channelCreationFailed = true;
        }
      }

      if (!linkChannelId) {
        channelCreationFailed = true;
      }

      await this.upsertProjectMicrosoftLink(run, connection.id, {
        teamId,
        teamName: team.displayName || run.teamDisplayName,
        channelId: linkChannelId,
        channelName: linkChannelName,
        provisioningId: run.id,
        provisionedAt: new Date(),
      });

      const status = channelCreationFailed
        ? ProjectMicrosoftTeamsProvisioningStatus.PARTIAL
        : ProjectMicrosoftTeamsProvisioningStatus.COMPLETED;
      const updated = await this.prisma.projectMicrosoftTeamsProvisioning.update({
        where: { id: run.id },
        data: {
          status,
          microsoftTeamId: teamId,
          teamWebUrl: team.webUrl || null,
          errorCode: channelCreationFailed
            ? ERROR_CODE_PROVISIONED_TEAM_PENDING_RECOVERY
            : null,
          errorMessage: channelCreationFailed
            ? 'La Team est rattachée ; certains canaux n’ont pas pu être provisionnés.'
            : null,
          lastHeartbeatAt: new Date(),
        },
      });

      await this.auditLogs.create({
        clientId: run.clientId,
        userId: run.triggeredByUserId ?? undefined,
        action:
          status === ProjectMicrosoftTeamsProvisioningStatus.COMPLETED
            ? PROVISIONING_COMPLETED_AUDIT
            : PROVISIONING_PARTIAL_AUDIT,
        resourceType: AUDIT_RESOURCE_TYPE,
        resourceId: run.projectId,
        newValue: this.toStatusDto(updated),
      });
    } catch (error) {
      throw error;
    }
  }

  async touchHeartbeatOnly(provisioningId: string): Promise<void> {
    await this.prisma.projectMicrosoftTeamsProvisioning.updateMany({
      where: {
        id: provisioningId,
        status: ProjectMicrosoftTeamsProvisioningStatus.IN_PROGRESS,
      },
      data: { lastHeartbeatAt: new Date() },
    });
  }

  async handleProvisioningJobError(
    job: Job<ProjectMicrosoftTeamsProvisioningJobPayload>,
    error: unknown,
  ): Promise<never> {
    const provisioningId = job.data.provisioningId;
    const maxAttempts = Number(job.opts.attempts ?? 1);
    const hasRetryRemaining = job.attemptsMade + 1 < maxAttempts;

    const run = await this.prisma.projectMicrosoftTeamsProvisioning.findUnique({
      where: { id: provisioningId },
      select: {
        id: true,
        clientId: true,
        projectId: true,
        status: true,
        errorCode: true,
        graphCreateRequestedAt: true,
        graphOperationUrl: true,
        microsoftTeamId: true,
        triggeredByUserId: true,
      },
    });

    if (!run) {
      throw error;
    }

    if (
      run.status === ProjectMicrosoftTeamsProvisioningStatus.COMPLETED ||
      run.status === ProjectMicrosoftTeamsProvisioningStatus.PARTIAL
    ) {
      throw error;
    }
    if (
      run.status === ProjectMicrosoftTeamsProvisioningStatus.FAILED &&
      run.errorCode
    ) {
      throw error;
    }

    const nonRetentable = this.isNonRetentableProcessorError(error, run);
    if (nonRetentable) {
      await this.failRunIfNotTerminal(
        run.id,
        run.clientId,
        run.projectId,
        nonRetentable.code,
        nonRetentable.message,
        run.triggeredByUserId ?? undefined,
      );
      throw new UnrecoverableError(nonRetentable.message);
    }

    if (hasRetryRemaining) {
      throw error;
    }

    const classified = this.classifyGraphError(error);
    await this.failRunIfNotTerminal(
      run.id,
      run.clientId,
      run.projectId,
      ERROR_CODE_GRAPH_TRANSIENT_RETRIES_EXHAUSTED,
      classified.message,
      run.triggeredByUserId ?? undefined,
    );
    throw error;
  }

  private isNonRetentableProcessorError(
    error: unknown,
    run: {
      graphCreateRequestedAt: Date | null;
      graphOperationUrl: string | null;
      microsoftTeamId: string | null;
    },
  ): { code: string; message: string } | null {
    if (
      run.graphCreateRequestedAt &&
      !run.graphOperationUrl &&
      !run.microsoftTeamId &&
      this.isAmbiguousTeamCreateFailure(error)
    ) {
      return {
        code: ERROR_CODE_TEAM_CREATION_OUTCOME_UNKNOWN,
        message:
          'Résultat de création Microsoft inconnu ; résolution manuelle requise.',
      };
    }

    if (error instanceof MicrosoftGraphHttpError) {
      if (error.statusCode === 401) {
        return {
          code: ERROR_CODE_MICROSOFT_GRAPH_REAUTH_REQUIRED,
          message:
            'La connexion Microsoft doit être renouvelée avant de créer ou administrer la Team.',
        };
      }
      if (error.statusCode === 403) {
        return {
          code: ERROR_CODE_MICROSOFT_TEAM_CREATE_FORBIDDEN,
          message:
            'Le compte Microsoft délégué actif ne peut pas créer ou administrer cette Team. Reconnectez Microsoft 365 ou relancez le consentement.',
        };
      }
      if (error.graphCode === 'GRAPH_ASYNC_FAILED') {
        return {
          code: error.graphCode,
          message: error.graphMessage || error.message,
        };
      }
    }

    if (error instanceof ProvisioningJobAbortedError) {
      if (
        run.graphCreateRequestedAt &&
        !run.graphOperationUrl &&
        !run.microsoftTeamId
      ) {
        return {
          code: ERROR_CODE_TEAM_CREATION_OUTCOME_UNKNOWN,
          message:
            'Résultat de création Microsoft inconnu ; résolution manuelle requise.',
        };
      }
    }

    return null;
  }

  async assertManualLinkAllowed(
    clientId: string,
    projectId: string,
    requestedTeamId?: string | null,
  ): Promise<void> {
    const activeRun = await this.prisma.projectMicrosoftTeamsProvisioning.findFirst({
      where: {
        clientId,
        projectId,
        status: {
          in: [
            ProjectMicrosoftTeamsProvisioningStatus.PENDING,
            ProjectMicrosoftTeamsProvisioningStatus.IN_PROGRESS,
          ],
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
    if (activeRun) {
      throw new ConflictException(
        'Un provisioning Microsoft Teams est en cours pour ce projet.',
      );
    }

    const partialRun = await this.prisma.projectMicrosoftTeamsProvisioning.findFirst({
      where: {
        clientId,
        projectId,
        status: ProjectMicrosoftTeamsProvisioningStatus.PARTIAL,
        microsoftTeamId: { not: null },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
    if (
      partialRun &&
      requestedTeamId &&
      requestedTeamId.trim() === partialRun.microsoftTeamId
    ) {
      return;
    }
    if (partialRun) {
      throw new ConflictException(
        'Une Team provisionnée partiellement doit être récupérée avant de rattacher une autre équipe.',
      );
    }
  }

  private async loadProjectForProvisioning(clientId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, clientId },
      select: {
        id: true,
        name: true,
        code: true,
        ownerFreeLabel: true,
        owner: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });
    if (!project) {
      throw new NotFoundException('Projet introuvable');
    }
    return project;
  }

  private async assertProjectExists(clientId: string, projectId: string): Promise<void> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, clientId },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException('Projet introuvable');
    }
  }

  private async loadProvisioningRun(
    clientId: string,
    projectId: string,
    provisioningId: string,
  ) {
    const run = await this.prisma.projectMicrosoftTeamsProvisioning.findFirst({
      where: { id: provisioningId, clientId, projectId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
            ownerFreeLabel: true,
            owner: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        },
        microsoftConnection: true,
      },
    });
    if (!run) {
      throw new NotFoundException('Run de provisioning introuvable');
    }
    return run;
  }

  private async loadProvisioningRunById(provisioningId: string): Promise<ProvisioningRunRecord> {
    const run = await this.prisma.projectMicrosoftTeamsProvisioning.findUnique({
      where: { id: provisioningId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
            ownerFreeLabel: true,
            owner: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        },
        microsoftConnection: true,
      },
    });
    if (!run) {
      throw new NotFoundException('Run de provisioning introuvable');
    }
    return run as ProvisioningRunRecord;
  }

  private async assertConnectionForRun(run: ProvisioningRunRecord) {
    const connection =
      run.microsoftConnection ??
      (run.microsoftConnectionId
        ? await this.prisma.microsoftConnection.findFirst({
            where: { id: run.microsoftConnectionId, clientId: run.clientId },
          })
        : null);

    if (!connection || connection.status !== MicrosoftConnectionStatus.ACTIVE) {
      throw new UnprocessableEntityException(
        'Connexion Microsoft active requise pour administrer la Team.',
      );
    }

    return { clientId: run.clientId, id: connection.id };
  }

  private async findBlockingRun(clientId: string, projectId: string) {
    return this.prisma.projectMicrosoftTeamsProvisioning.findFirst({
      where: {
        clientId,
        projectId,
        OR: [
          {
            status: {
              in: [
                ProjectMicrosoftTeamsProvisioningStatus.PENDING,
                ProjectMicrosoftTeamsProvisioningStatus.IN_PROGRESS,
              ],
            },
          },
          {
            status: ProjectMicrosoftTeamsProvisioningStatus.PARTIAL,
            microsoftTeamId: { not: null },
          },
          {
            status: ProjectMicrosoftTeamsProvisioningStatus.FAILED,
            errorCode: ERROR_CODE_TEAM_CREATION_OUTCOME_UNKNOWN,
            resolvedAt: null,
          },
        ],
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  private resolveTeamName(
    template: string,
    project: {
      name: string;
      code: string;
      ownerFreeLabel: string | null;
      owner: { firstName: string | null; lastName: string | null; email: string | null } | null;
    },
  ): string {
    const ownerName = project.ownerFreeLabel?.trim()
      ? project.ownerFreeLabel.trim()
      : [project.owner?.firstName, project.owner?.lastName]
          .filter(Boolean)
          .join(' ')
          .trim() || project.owner?.email?.trim() || '';

    const resolved = template
      .replaceAll('{{code}}', project.code.trim())
      .replaceAll('{{name}}', project.name.trim())
      .replaceAll('{{ownerName}}', ownerName)
      .trim();

    return resolved.slice(0, 50) || `${project.code.trim()} - ${project.name.trim()}`.slice(0, 50);
  }

  private extractTeamIdFromContentLocation(contentLocation?: string | null): string | null {
    if (!contentLocation) return null;
    // Graph renvoie souvent `/teams('guid')` / `/groups('guid')` (OData key).
    const odataKey = contentLocation.match(
      /\/(?:teams|groups)\('([^']+)'\)/i,
    );
    if (odataKey?.[1]) return odataKey[1];
    // Variante path `/teams/guid` ou `/groups/guid`.
    const pathKey = contentLocation.match(/\/(?:groups|teams)\/([^/?')]+)/i);
    return pathKey?.[1] ?? null;
  }

  private extractTeamIdFromOperationPayload(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object') return null;
    const candidate =
      (payload as { targetResourceId?: unknown }).targetResourceId ??
      (payload as { resourceLocation?: unknown }).resourceLocation ??
      (payload as { targetResourceLocation?: unknown }).targetResourceLocation;
    if (typeof candidate !== 'string') return null;
    return this.extractTeamIdFromContentLocation(candidate) ?? candidate;
  }

  private async upsertProjectMicrosoftLink(
    run: ProvisioningRunRecord,
    microsoftConnectionId: string,
    payload: {
      teamId: string;
      teamName: string;
      channelId: string | null;
      channelName: string | null;
      provisioningId: string;
      provisionedAt: Date;
    },
  ): Promise<void> {
    const existing = await this.prisma.projectMicrosoftLink.findFirst({
      where: { clientId: run.clientId, projectId: run.projectId },
    });
    const data = {
      clientId: run.clientId,
      projectId: run.projectId,
      microsoftConnectionId,
      isEnabled: true,
      teamId: payload.teamId,
      teamName: payload.teamName,
      channelId: payload.channelId,
      channelName: payload.channelName,
      plannerPlanId: existing?.plannerPlanId ?? null,
      plannerPlanTitle: existing?.plannerPlanTitle ?? null,
      filesDriveId: existing?.filesDriveId ?? null,
      filesFolderId: existing?.filesFolderId ?? null,
      syncTasksEnabled: false,
      syncDocumentsEnabled: false,
      useMicrosoftPlannerBuckets: existing?.useMicrosoftPlannerBuckets ?? false,
      useMicrosoftPlannerLabels: existing?.useMicrosoftPlannerLabels ?? false,
      provisionedAt: payload.provisionedAt,
      provisioningId: payload.provisioningId,
    };

    if (existing) {
      await this.prisma.projectMicrosoftLink.update({
        where: { id: existing.id },
        data,
      });
      return;
    }

    await this.prisma.projectMicrosoftLink.create({ data });
  }

  private classifyGraphError(error: unknown): { code: string; message: string } {
    if (error instanceof MicrosoftGraphHttpError) {
      if (error.statusCode === 401) {
        return {
          code: ERROR_CODE_MICROSOFT_GRAPH_REAUTH_REQUIRED,
          message:
            'La connexion Microsoft doit être renouvelée avant de créer ou administrer la Team.',
        };
      }
      if (error.statusCode === 403) {
        return {
          code: ERROR_CODE_MICROSOFT_TEAM_CREATE_FORBIDDEN,
          message:
            'Le compte Microsoft délégué actif ne peut pas créer ou administrer cette Team. Reconnectez Microsoft 365 ou relancez le consentement.',
        };
      }
      return {
        code: error.graphCode || 'MICROSOFT_GRAPH_ERROR',
        message: error.graphMessage || error.message,
      };
    }
    if (error instanceof Error) {
      return {
        code: 'MICROSOFT_GRAPH_ERROR',
        message: error.message,
      };
    }
    return {
      code: 'MICROSOFT_GRAPH_ERROR',
      message: 'Erreur Microsoft Graph inattendue',
    };
  }

  /** Échec après POST /teams sans réponse exploitable → risque de Team orpheline. */
  private isAmbiguousTeamCreateFailure(error: unknown): boolean {
    if (!(error instanceof MicrosoftGraphHttpError)) {
      return true;
    }
    if (error.statusCode === 0) {
      return true;
    }
    if (error.statusCode >= 500) {
      return true;
    }
    return /timeout|abort/i.test(error.message);
  }

  private async failRunIfNotTerminal(
    runId: string,
    clientId: string,
    projectId: string,
    errorCode: string,
    errorMessage: string,
    userId?: string,
  ): Promise<boolean> {
    const updated = await this.prisma.projectMicrosoftTeamsProvisioning.updateMany({
      where: {
        id: runId,
        status: {
          in: [
            ProjectMicrosoftTeamsProvisioningStatus.PENDING,
            ProjectMicrosoftTeamsProvisioningStatus.IN_PROGRESS,
          ],
        },
      },
      data: {
        status: ProjectMicrosoftTeamsProvisioningStatus.FAILED,
        errorCode,
        errorMessage,
        lastHeartbeatAt: new Date(),
      },
    });

    if (updated.count === 0) {
      return false;
    }

    const run = await this.prisma.projectMicrosoftTeamsProvisioning.findUnique({
      where: { id: runId },
    });
    if (run) {
      await this.auditLogs.create({
        clientId,
        userId,
        action: PROVISIONING_FAILED_AUDIT,
        resourceType: AUDIT_RESOURCE_TYPE,
        resourceId: projectId,
        newValue: this.toStatusDto(run),
      });
    }
    return true;
  }

  /** @deprecated use failRunIfNotTerminal */
  private async failRun(
    runId: string,
    clientId: string,
    projectId: string,
    errorCode: string,
    errorMessage: string,
    userId?: string,
  ): Promise<void> {
    await this.failRunIfNotTerminal(
      runId,
      clientId,
      projectId,
      errorCode,
      errorMessage,
      userId,
    );
  }

  private async touchHeartbeat(
    runId: string,
    status?: ProjectMicrosoftTeamsProvisioningStatus,
  ): Promise<void> {
    await this.prisma.projectMicrosoftTeamsProvisioning.update({
      where: { id: runId },
      data: {
        ...(status ? { status } : {}),
        lastHeartbeatAt: new Date(),
      },
    });
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private toStatusDto(
    run: {
      id: string;
      clientId: string;
      projectId: string;
      status: ProjectMicrosoftTeamsProvisioningStatus;
      teamDisplayName: string;
      teamDescription: string | null;
      microsoftTeamId: string | null;
      teamWebUrl: string | null;
      graphOperationUrl: string | null;
      graphContentLocation: string | null;
      graphCreateRequestedAt: Date | null;
      retryCount: number;
      retryRequestedAt: Date | null;
      currentJobId: string | null;
      lastHeartbeatAt: Date | null;
      errorCode: string | null;
      errorMessage: string | null;
      resolvedAt: Date | null;
      resolutionType: ProjectMicrosoftTeamsProvisioningResolutionType | null;
      createdAt: Date;
      updatedAt: Date;
    },
  ): ProvisioningStatusDto {
    return {
      id: run.id,
      clientId: run.clientId,
      projectId: run.projectId,
      status: run.status,
      teamDisplayName: run.teamDisplayName,
      teamDescription: run.teamDescription,
      microsoftTeamId: run.microsoftTeamId,
      teamWebUrl: run.teamWebUrl,
      graphOperationUrl: run.graphOperationUrl,
      graphContentLocation: run.graphContentLocation,
      graphCreateRequestedAt: run.graphCreateRequestedAt?.toISOString() ?? null,
      retryCount: run.retryCount,
      retryRequestedAt: run.retryRequestedAt?.toISOString() ?? null,
      currentJobId: run.currentJobId,
      lastHeartbeatAt: run.lastHeartbeatAt?.toISOString() ?? null,
      errorCode: run.errorCode,
      errorMessage: run.errorMessage,
      resolvedAt: run.resolvedAt?.toISOString() ?? null,
      resolutionType: run.resolutionType,
      createdAt: run.createdAt.toISOString(),
      updatedAt: run.updatedAt.toISOString(),
    };
  }
}
