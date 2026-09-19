import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuditLogsService,
  type CreateAuditLogInput,
} from '../audit-logs/audit-logs.service';
import { UpdateProcedureSettingsDto } from './dto/update-procedure-settings.dto';

/** Réponse settings — cycle / validateurs globaux retirés (gouvernance par procédure). */
export type ProcedureSettingsResponse = {
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
    return { updatedAt: row.updatedAt.toISOString() };
  }

  async update(
    clientId: string,
    _dto: UpdateProcedureSettingsDto,
    actorUserId: string | undefined,
    meta?: AuditMeta,
  ): Promise<ProcedureSettingsResponse> {
    const current = await this.getOrCreate(clientId);
    // Champs cycle / validateurs globaux ignorés (dépréciés).
    const row = await this.prisma.procedureModuleSettings.upsert({
      where: { clientId },
      create: {
        clientId,
        usePilotageCycle: true,
        validatorUserIds: [],
      },
      update: { updatedAt: new Date() },
    });

    const audit: CreateAuditLogInput = {
      clientId,
      userId: actorUserId,
      action: 'procedure.settings.updated',
      resourceType: 'ProcedureModuleSettings',
      resourceId: row.id,
      oldValue: { updatedAt: current.updatedAt },
      newValue: { updatedAt: row.updatedAt.toISOString() },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    };
    await this.auditLogs.create(audit);

    return { updatedAt: row.updatedAt.toISOString() };
  }
}
