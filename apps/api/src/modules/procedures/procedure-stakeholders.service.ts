import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ClientUserRole,
  ClientUserStatus,
  PlatformRole,
  ProcedureStakeholderRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { UpdateProcedureStakeholdersDto } from './dto/update-procedure-stakeholders.dto';
import { personDisplayLabel } from './lib/procedure-display.util';

export type ProcedureStakeholderItem = {
  userId: string;
  label: string;
};

export type ProcedureStakeholdersResponse = {
  editors: ProcedureStakeholderItem[];
  reviewers: ProcedureStakeholderItem[];
  validators: ProcedureStakeholderItem[];
};

type AuditMeta = {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
};

@Injectable()
export class ProcedureStakeholdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async list(
    clientId: string,
    procedureId: string,
  ): Promise<ProcedureStakeholdersResponse> {
    await this.assertProcedure(clientId, procedureId);
    return this.loadLists(clientId, procedureId);
  }

  async replace(
    clientId: string,
    procedureId: string,
    dto: UpdateProcedureStakeholdersDto,
    actorUserId: string | undefined,
    meta?: AuditMeta,
  ): Promise<ProcedureStakeholdersResponse> {
    const procedure = await this.assertProcedure(clientId, procedureId);
    if (!actorUserId) {
      throw new ForbiddenException('Utilisateur requis');
    }
    await this.assertCanManageLists(
      clientId,
      procedureId,
      procedure.createdByUserId,
      actorUserId,
    );

    const editors = uniqueIds(dto.editors);
    const reviewers = uniqueIds(dto.reviewers);
    const validators = uniqueIds(dto.validators);
    const allIds = [...new Set([...editors, ...reviewers, ...validators])];
    if (allIds.length > 0) {
      await this.assertUsersInClient(clientId, allIds);
    }

    const desired: { userId: string; role: ProcedureStakeholderRole }[] = [
      ...editors.map((userId) => ({
        userId,
        role: ProcedureStakeholderRole.EDITOR,
      })),
      ...reviewers.map((userId) => ({
        userId,
        role: ProcedureStakeholderRole.REVIEWER,
      })),
      ...validators.map((userId) => ({
        userId,
        role: ProcedureStakeholderRole.VALIDATOR,
      })),
    ];

    await this.prisma.$transaction(async (tx) => {
      await tx.procedureStakeholder.deleteMany({
        where: { clientId, procedureId },
      });
      if (desired.length > 0) {
        await tx.procedureStakeholder.createMany({
          data: desired.map((d) => ({
            clientId,
            procedureId,
            userId: d.userId,
            role: d.role,
          })),
        });
      }
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'procedure.stakeholders.updated',
      resourceType: 'procedure',
      resourceId: procedureId,
      newValue: {
        editorsCount: editors.length,
        reviewersCount: reviewers.length,
        validatorsCount: validators.length,
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return this.loadLists(clientId, procedureId);
  }

  /** Créateur → rédacteur automatique (idempotent). */
  async ensureCreatorAsEditor(
    clientId: string,
    procedureId: string,
    creatorUserId: string,
  ): Promise<void> {
    await this.prisma.procedureStakeholder.upsert({
      where: {
        procedureId_userId_role: {
          procedureId,
          userId: creatorUserId,
          role: ProcedureStakeholderRole.EDITOR,
        },
      },
      create: {
        clientId,
        procedureId,
        userId: creatorUserId,
        role: ProcedureStakeholderRole.EDITOR,
      },
      update: {},
    });
  }

  async hasRole(
    clientId: string,
    procedureId: string,
    userId: string,
    role: ProcedureStakeholderRole,
  ): Promise<boolean> {
    const row = await this.prisma.procedureStakeholder.findFirst({
      where: { clientId, procedureId, userId, role },
      select: { id: true },
    });
    return Boolean(row);
  }

  async countByRole(
    clientId: string,
    procedureId: string,
  ): Promise<Record<ProcedureStakeholderRole, number>> {
    const rows = await this.prisma.procedureStakeholder.groupBy({
      by: ['role'],
      where: { clientId, procedureId },
      _count: { _all: true },
    });
    const out: Record<ProcedureStakeholderRole, number> = {
      EDITOR: 0,
      REVIEWER: 0,
      VALIDATOR: 0,
    };
    for (const r of rows) {
      out[r.role] = r._count._all;
    }
    return out;
  }

  async listUserIdsByRole(
    clientId: string,
    procedureId: string,
    role: ProcedureStakeholderRole,
  ): Promise<string[]> {
    const rows = await this.prisma.procedureStakeholder.findMany({
      where: { clientId, procedureId, role },
      select: { userId: true },
    });
    return rows.map((r) => r.userId);
  }

  async isAdminForcer(
    clientId: string,
    actorUserId: string,
  ): Promise<boolean> {
    const membership = await this.prisma.clientUser.findFirst({
      where: {
        clientId,
        userId: actorUserId,
        status: ClientUserStatus.ACTIVE,
      },
      select: { role: true },
    });
    if (membership?.role === ClientUserRole.CLIENT_ADMIN) return true;
    const user = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: { platformRole: true },
    });
    return user?.platformRole === PlatformRole.PLATFORM_ADMIN;
  }

  private async assertProcedure(clientId: string, procedureId: string) {
    const procedure = await this.prisma.procedure.findFirst({
      where: { id: procedureId, clientId },
      select: { id: true, createdByUserId: true },
    });
    if (!procedure) throw new NotFoundException('Procédure introuvable');
    return procedure;
  }

  private async assertCanManageLists(
    clientId: string,
    procedureId: string,
    createdByUserId: string | null,
    actorUserId: string,
  ): Promise<void> {
    if (createdByUserId === actorUserId) return;
    if (await this.isAdminForcer(clientId, actorUserId)) return;
    if (
      await this.hasRole(
        clientId,
        procedureId,
        actorUserId,
        ProcedureStakeholderRole.EDITOR,
      )
    ) {
      return;
    }
    throw new ForbiddenException(
      'Seuls le créateur, un rédacteur ou un administrateur peuvent gérer les listes',
    );
  }

  private async assertUsersInClient(clientId: string, userIds: string[]) {
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
        'Un ou plusieurs utilisateurs ne sont pas des membres actifs du client',
      );
    }
  }

  private async loadLists(
    clientId: string,
    procedureId: string,
  ): Promise<ProcedureStakeholdersResponse> {
    const rows = await this.prisma.procedureStakeholder.findMany({
      where: { clientId, procedureId },
      select: { userId: true, role: true },
    });
    const userIds = [...new Set(rows.map((r) => r.userId))];
    const users =
      userIds.length === 0
        ? []
        : await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          });
    const byId = new Map(users.map((u) => [u.id, u]));
    const toItem = (userId: string): ProcedureStakeholderItem => {
      const u = byId.get(userId);
      return {
        userId,
        label: u
          ? personDisplayLabel(u)
          : 'Membre retiré',
      };
    };
    return {
      editors: rows
        .filter((r) => r.role === ProcedureStakeholderRole.EDITOR)
        .map((r) => toItem(r.userId)),
      reviewers: rows
        .filter((r) => r.role === ProcedureStakeholderRole.REVIEWER)
        .map((r) => toItem(r.userId)),
      validators: rows
        .filter((r) => r.role === ProcedureStakeholderRole.VALIDATOR)
        .map((r) => toItem(r.userId)),
    };
  }
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}
