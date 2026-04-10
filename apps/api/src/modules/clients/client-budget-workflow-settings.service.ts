import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuditLogsService,
  CreateAuditLogInput,
} from '../audit-logs/audit-logs.service';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { UpdateClientBudgetWorkflowSettingsDto } from './dto/update-client-budget-workflow-settings.dto';
import {
  BudgetWorkflowConfig,
  mergeBudgetWorkflowConfig,
  mergeBudgetWorkflowPatch,
  parseStoredBudgetWorkflowConfig,
  ResolvedBudgetWorkflowConfig,
} from './budget-workflow-config.merge';

export type ClientBudgetWorkflowSettingsResponse = {
  stored: BudgetWorkflowConfig | null;
  resolved: ResolvedBudgetWorkflowConfig;
};

@Injectable()
export class ClientBudgetWorkflowSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async getResolvedForClient(
    clientId: string,
  ): Promise<ResolvedBudgetWorkflowConfig> {
    const row = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { budgetWorkflowConfig: true },
    });
    if (!row) {
      throw new NotFoundException('Client not found');
    }
    return mergeBudgetWorkflowConfig(row.budgetWorkflowConfig);
  }

  async getActive(
    clientId: string,
  ): Promise<ClientBudgetWorkflowSettingsResponse> {
    const row = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { budgetWorkflowConfig: true },
    });
    if (!row) {
      throw new NotFoundException('Client not found');
    }
    const stored = parseStoredBudgetWorkflowConfig(row.budgetWorkflowConfig);
    return {
      stored,
      resolved: mergeBudgetWorkflowConfig(row.budgetWorkflowConfig),
    };
  }

  async updateActive(
    clientId: string,
    dto: UpdateClientBudgetWorkflowSettingsDto,
    context?: { actorUserId?: string; meta?: RequestMeta },
  ): Promise<ClientBudgetWorkflowSettingsResponse> {
    const before = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { budgetWorkflowConfig: true },
    });

    if (!before) {
      throw new NotFoundException('Client not found');
    }

    const patch: BudgetWorkflowConfig = {};
    if (dto.requireEnvelopesNonDraftForBudgetValidated !== undefined) {
      patch.requireEnvelopesNonDraftForBudgetValidated =
        dto.requireEnvelopesNonDraftForBudgetValidated;
    }
    if (dto.snapshotIncludedBudgetLineStatuses !== undefined) {
      const uniq = [...new Set(dto.snapshotIncludedBudgetLineStatuses)];
      if (uniq.length === 0) {
        throw new BadRequestException(
          'snapshotIncludedBudgetLineStatuses must contain at least one status',
        );
      }
      patch.snapshotIncludedBudgetLineStatuses = uniq;
    }

    const nextJson = mergeBudgetWorkflowPatch(
      before.budgetWorkflowConfig,
      patch,
    );

    const updated = await this.prisma.client.update({
      where: { id: clientId },
      data: {
        budgetWorkflowConfig:
          nextJson === null ? Prisma.JsonNull : nextJson,
      },
      select: { budgetWorkflowConfig: true },
    });

    const stored = parseStoredBudgetWorkflowConfig(updated.budgetWorkflowConfig);
    const resolved = mergeBudgetWorkflowConfig(updated.budgetWorkflowConfig);

    const auditInput: CreateAuditLogInput = {
      clientId,
      userId: context?.actorUserId,
      action: 'client.budget-workflow-settings.updated',
      resourceType: 'client',
      resourceId: clientId,
      oldValue: {
        budgetWorkflowConfig: before.budgetWorkflowConfig,
      },
      newValue: {
        budgetWorkflowConfig: updated.budgetWorkflowConfig,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
    await this.auditLogs.create(auditInput);

    return { stored, resolved };
  }
}
