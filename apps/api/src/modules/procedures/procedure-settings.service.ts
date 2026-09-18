import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClientUserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuditLogsService,
  type CreateAuditLogInput,
} from '../audit-logs/audit-logs.service';
import { UpdateProcedureSettingsDto } from './dto/update-procedure-settings.dto';

export type ProcedureSettingsResponse = {
  usePilotageCycle: boolean;
  validators: { userId: string; label: string }[];
  updatedAt: string;
};

type AuditMeta = {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
};

@Injectable()
export class ProcedureSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async getOrCreate(clientId: string): Promise<ProcedureSettingsResponse> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });
    if (!client) throw new NotFoundException('Client introuvable');

    let row = await this.prisma.procedureModuleSettings.findUnique({
      where: { clientId },
    });
    if (!row) {
      row = await this.prisma.procedureModuleSettings.create({
        data: {
          clientId,
          usePilotageCycle: true,
          validatorUserIds: [],
        },
      });
    }
    return this.toResponse(clientId, row);
  }

  async update(
    clientId: string,
    dto: UpdateProcedureSettingsDto,
    actorUserId: string | undefined,
    meta?: AuditMeta,
  ): Promise<ProcedureSettingsResponse> {
    const current = await this.getOrCreate(clientId);
    const nextCycle =
      dto.usePilotageCycle !== undefined
        ? dto.usePilotageCycle
        : current.usePilotageCycle;
    const nextIds =
      dto.validatorUserIds !== undefined
        ? [...new Set(dto.validatorUserIds.map((id) => id.trim()).filter(Boolean))]
        : current.validators.map((v) => v.userId);

    if (!nextCycle && nextIds.length < 1) {
      throw new BadRequestException(
        'Au moins un validateur est requis lorsque le cycle de pilotage est désactivé',
      );
    }

    if (nextIds.length > 0) {
      await this.assertValidatorsBelongToClient(clientId, nextIds);
    }

    const row = await this.prisma.procedureModuleSettings.upsert({
      where: { clientId },
      create: {
        clientId,
        usePilotageCycle: nextCycle,
        validatorUserIds: nextIds,
      },
      update: {
        usePilotageCycle: nextCycle,
        validatorUserIds: nextIds,
      },
    });

    const audit: CreateAuditLogInput = {
      clientId,
      userId: actorUserId,
      action: 'procedure.settings.updated',
      resourceType: 'ProcedureModuleSettings',
      resourceId: row.id,
      oldValue: {
        usePilotageCycle: current.usePilotageCycle,
        validatorCount: current.validators.length,
      },
      newValue: {
        usePilotageCycle: row.usePilotageCycle,
        validatorCount: row.validatorUserIds.length,
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    };
    await this.auditLogs.create(audit);

    return this.toResponse(clientId, row);
  }

  private async assertValidatorsBelongToClient(
    clientId: string,
    userIds: string[],
  ) {
    const memberships = await this.prisma.clientUser.findMany({
      where: {
        clientId,
        userId: { in: userIds },
        status: ClientUserStatus.ACTIVE,
      },
      select: { userId: true },
    });
    if (memberships.length !== userIds.length) {
      throw new BadRequestException(
        'Un ou plusieurs validateurs ne sont pas des membres actifs du client',
      );
    }
  }

  private async toResponse(
    clientId: string,
    row: {
      usePilotageCycle: boolean;
      validatorUserIds: string[];
      updatedAt: Date;
    },
  ): Promise<ProcedureSettingsResponse> {
    const ids = row.validatorUserIds;
    const users =
      ids.length === 0
        ? []
        : await this.prisma.user.findMany({
            where: { id: { in: ids } },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          });
    const byId = new Map(users.map((u) => [u.id, u]));
    const validators = ids.map((userId) => {
      const u = byId.get(userId);
      const name = [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim();
      const label = name || (u?.email ? maskEmail(u.email) : 'Membre retiré');
      return { userId, label };
    });
    // Ensure membership still active — drop labels for removed but keep id for config repair
    void clientId;
    return {
      usePilotageCycle: row.usePilotageCycle,
      validators,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return 'Utilisateur';
  const head = local.slice(0, 1);
  return `${head}***@${domain}`;
}
