import { Injectable, Logger } from '@nestjs/common';
import {
  ProjectMicrosoftTeamsProvisioningStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import {
  BULLMQ_LIVE_JOB_STATES,
  BULLMQ_PENDING_RUN_STATES,
  ERROR_CODE_QUEUE_JOB_COMPLETED_WITHOUT_RUN_UPDATE,
  ERROR_CODE_QUEUE_JOB_FAILED_ORPHAN,
  ERROR_CODE_QUEUE_JOB_MISSING,
  ERROR_CODE_QUEUE_JOB_STATE_UNKNOWN,
  ERROR_CODE_QUEUE_RETRY_NOT_DISPATCHED,
  ERROR_CODE_RECOVERY_REQUIRED,
  ERROR_CODE_TEAM_CREATION_OUTCOME_UNKNOWN,
  PROVISIONING_STALE_BATCH_SIZE,
  PROVISIONING_STALE_THRESHOLD_MS,
} from './project-microsoft-teams-provisioning.constants';

export type StaleMaintenanceSummary = {
  examined: number;
  ignored: number;
  recovered: number;
  errored: number;
};

@Injectable()
export class ProjectMicrosoftTeamsProvisioningStaleMaintenanceService {
  private readonly logger = new Logger(
    ProjectMicrosoftTeamsProvisioningStaleMaintenanceService.name,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  async runStaleMaintenance(): Promise<StaleMaintenanceSummary> {
    const cutoff = new Date(Date.now() - PROVISIONING_STALE_THRESHOLD_MS);
    const summary: StaleMaintenanceSummary = {
      examined: 0,
      ignored: 0,
      recovered: 0,
      errored: 0,
    };

    const runs = await this.prisma.projectMicrosoftTeamsProvisioning.findMany({
      where: {
        status: {
          in: [
            ProjectMicrosoftTeamsProvisioningStatus.PENDING,
            ProjectMicrosoftTeamsProvisioningStatus.IN_PROGRESS,
          ],
        },
        OR: [
          { lastHeartbeatAt: { lt: cutoff } },
          {
            lastHeartbeatAt: null,
            updatedAt: { lt: cutoff },
          },
        ],
      },
      orderBy: [{ lastHeartbeatAt: 'asc' }, { updatedAt: 'asc' }],
      take: PROVISIONING_STALE_BATCH_SIZE,
    });

    for (const run of runs) {
      summary.examined += 1;
      try {
        const changed = await this.processStaleRun(run, cutoff);
        if (changed === 'ignored') {
          summary.ignored += 1;
        } else if (changed === 'recovered') {
          summary.recovered += 1;
        }
      } catch (error) {
        summary.errored += 1;
        this.logger.error(
          `Maintenance stale run ${run.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    this.logger.log(
      `[PROJECT_MS_TEAMS maintenance] examined=${summary.examined} ignored=${summary.ignored} recovered=${summary.recovered} errored=${summary.errored}`,
    );
    return summary;
  }

  private async processStaleRun(
    run: {
      id: string;
      clientId: string;
      projectId: string;
      status: ProjectMicrosoftTeamsProvisioningStatus;
      currentJobId: string | null;
      graphCreateRequestedAt: Date | null;
      graphOperationUrl: string | null;
      microsoftTeamId: string | null;
      lastHeartbeatAt: Date | null;
      updatedAt: Date;
    },
    cutoff: Date,
  ): Promise<'ignored' | 'recovered'> {
    if (run.status === ProjectMicrosoftTeamsProvisioningStatus.IN_PROGRESS) {
      return this.processStaleInProgress(run, cutoff);
    }
    return this.processStalePending(run, cutoff);
  }

  private async processStaleInProgress(
    run: {
      id: string;
      clientId: string;
      projectId: string;
      graphCreateRequestedAt: Date | null;
      graphOperationUrl: string | null;
      microsoftTeamId: string | null;
      lastHeartbeatAt: Date | null;
      updatedAt: Date;
    },
    cutoff: Date,
  ): Promise<'ignored' | 'recovered'> {
    let errorCode: string;
    let errorMessage: string;

    if (!run.graphCreateRequestedAt) {
      errorCode = ERROR_CODE_RECOVERY_REQUIRED;
      errorMessage =
        'Provisioning interrompu avant création Graph ; reprise manuelle possible.';
    } else if (!run.graphOperationUrl && !run.microsoftTeamId) {
      errorCode = ERROR_CODE_TEAM_CREATION_OUTCOME_UNKNOWN;
      errorMessage =
        'Résultat de création Microsoft inconnu ; résolution manuelle requise.';
    } else {
      errorCode = ERROR_CODE_RECOVERY_REQUIRED;
      errorMessage = run.microsoftTeamId
        ? 'Provisioning interrompu après création Team ; reprise liaison/canaux possible.'
        : 'Provisioning interrompu pendant le poll Graph ; reprise du poll possible.';
    }

    const result = await this.prisma.projectMicrosoftTeamsProvisioning.updateMany({
      where: {
        id: run.id,
        status: ProjectMicrosoftTeamsProvisioningStatus.IN_PROGRESS,
        OR: [
          { lastHeartbeatAt: { lt: cutoff } },
          { lastHeartbeatAt: null, updatedAt: { lt: cutoff } },
        ],
      },
      data: {
        status: ProjectMicrosoftTeamsProvisioningStatus.FAILED,
        errorCode,
        errorMessage,
        lastHeartbeatAt: new Date(),
      },
    });

    return result.count > 0 ? 'recovered' : 'ignored';
  }

  private async processStalePending(
    run: {
      id: string;
      currentJobId: string | null;
      lastHeartbeatAt: Date | null;
      updatedAt: Date;
    },
    cutoff: Date,
  ): Promise<'ignored' | 'recovered'> {
    if (!run.currentJobId) {
      return this.failPendingRunConditional(run.id, cutoff, {
        errorCode: ERROR_CODE_QUEUE_RETRY_NOT_DISPATCHED,
        errorMessage: 'Retry jamais distribué en file BullMQ.',
      });
    }

    const queue = this.queueService.getProjectMicrosoftTeamsProvisioningQueue();
    let job;
    try {
      job = await queue.getJob(run.currentJobId);
    } catch {
      return this.failPendingRunConditional(run.id, cutoff, {
        errorCode: ERROR_CODE_QUEUE_JOB_STATE_UNKNOWN,
        errorMessage: 'État BullMQ illisible pour ce provisioning.',
      });
    }

    if (!job) {
      return this.failPendingRunConditional(run.id, cutoff, {
        errorCode: ERROR_CODE_QUEUE_JOB_MISSING,
        errorMessage: 'Job BullMQ introuvable pour ce provisioning.',
      });
    }

    let state: string;
    try {
      state = await job.getState();
    } catch {
      return this.failPendingRunConditional(run.id, cutoff, {
        errorCode: ERROR_CODE_QUEUE_JOB_STATE_UNKNOWN,
        errorMessage: 'État BullMQ illisible pour ce provisioning.',
      });
    }

    if (BULLMQ_LIVE_JOB_STATES.has(state)) {
      return 'ignored';
    }

    if (state === 'completed') {
      return this.failPendingRunConditional(run.id, cutoff, {
        errorCode: ERROR_CODE_QUEUE_JOB_COMPLETED_WITHOUT_RUN_UPDATE,
        errorMessage:
          'Job BullMQ terminé sans mise à jour du run de provisioning.',
      });
    }

    if (state === 'failed') {
      return this.failPendingRunConditional(run.id, cutoff, {
        errorCode: ERROR_CODE_QUEUE_JOB_FAILED_ORPHAN,
        errorMessage: 'Job BullMQ en échec alors que le run reste en attente.',
      });
    }

    if (state === 'paused' || state === 'repeat' || !BULLMQ_PENDING_RUN_STATES.has(state)) {
      return this.failPendingRunConditional(run.id, cutoff, {
        errorCode: ERROR_CODE_QUEUE_JOB_STATE_UNKNOWN,
        errorMessage: `État BullMQ inattendu (${state}) pour un run PENDING stale.`,
      });
    }

    return 'ignored';
  }

  private async failPendingRunConditional(
    runId: string,
    cutoff: Date,
    payload: { errorCode: string; errorMessage: string },
  ): Promise<'ignored' | 'recovered'> {
    const result = await this.prisma.projectMicrosoftTeamsProvisioning.updateMany({
      where: {
        id: runId,
        status: ProjectMicrosoftTeamsProvisioningStatus.PENDING,
        OR: [
          { lastHeartbeatAt: { lt: cutoff } },
          { lastHeartbeatAt: null, updatedAt: { lt: cutoff } },
        ],
      },
      data: {
        status: ProjectMicrosoftTeamsProvisioningStatus.FAILED,
        errorCode: payload.errorCode,
        errorMessage: payload.errorMessage,
        lastHeartbeatAt: new Date(),
      },
    });
    return result.count > 0 ? 'recovered' : 'ignored';
  }
}
