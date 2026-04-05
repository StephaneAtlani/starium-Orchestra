import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuditLogsService,
  CreateAuditLogInput,
} from '../audit-logs/audit-logs.service';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { UpdateClientResourceTimesheetSettingsDto } from './dto/update-client-resource-timesheet-settings.dto';

const DEFAULT_DAY_REFERENCE_HOURS = 7.5;

export type ClientResourceTimesheetSettings = {
  ignoreWeekendsDefault: boolean;
  allowFractionAboveOne: boolean;
  /** Toujours un nombre (défaut 7,5 si `timesheetDayReferenceHours` est null en base). */
  dayReferenceHours: number;
};

@Injectable()
export class ClientResourceTimesheetSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  resolveDayReferenceHours(
    row: { timesheetDayReferenceHours: Prisma.Decimal | null },
  ): number {
    if (row.timesheetDayReferenceHours == null) {
      return DEFAULT_DAY_REFERENCE_HOURS;
    }
    return Number(row.timesheetDayReferenceHours);
  }

  async getForActiveClient(clientId: string): Promise<ClientResourceTimesheetSettings> {
    const c = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: {
        timesheetIgnoreWeekendsDefault: true,
        timesheetAllowFractionAboveOne: true,
        timesheetDayReferenceHours: true,
      },
    });
    if (!c) {
      throw new NotFoundException({ error: 'NotFound', message: 'Client not found' });
    }
    return {
      ignoreWeekendsDefault: c.timesheetIgnoreWeekendsDefault,
      allowFractionAboveOne: c.timesheetAllowFractionAboveOne,
      dayReferenceHours: this.resolveDayReferenceHours(c),
    };
  }

  async updateForActiveClient(
    clientId: string,
    dto: UpdateClientResourceTimesheetSettingsDto,
    context?: { actorUserId?: string; meta?: RequestMeta },
  ): Promise<ClientResourceTimesheetSettings> {
    const before = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: {
        timesheetIgnoreWeekendsDefault: true,
        timesheetAllowFractionAboveOne: true,
        timesheetDayReferenceHours: true,
      },
    });
    if (!before) {
      throw new NotFoundException({ error: 'NotFound', message: 'Client not found' });
    }

    const data: Prisma.ClientUpdateInput = {};
    if (dto.timesheetIgnoreWeekendsDefault !== undefined) {
      data.timesheetIgnoreWeekendsDefault = dto.timesheetIgnoreWeekendsDefault;
    }
    if (dto.timesheetAllowFractionAboveOne !== undefined) {
      data.timesheetAllowFractionAboveOne = dto.timesheetAllowFractionAboveOne;
    }
    if (dto.timesheetDayReferenceHours !== undefined) {
      data.timesheetDayReferenceHours = new Prisma.Decimal(dto.timesheetDayReferenceHours);
    }

    const updated = await this.prisma.client.update({
      where: { id: clientId },
      data,
      select: {
        timesheetIgnoreWeekendsDefault: true,
        timesheetAllowFractionAboveOne: true,
        timesheetDayReferenceHours: true,
      },
    });

    const auditInput: CreateAuditLogInput = {
      clientId,
      userId: context?.actorUserId,
      action: 'client.resource-timesheet-settings.updated',
      resourceType: 'client',
      resourceId: clientId,
      oldValue: {
        timesheetIgnoreWeekendsDefault: before.timesheetIgnoreWeekendsDefault,
        timesheetAllowFractionAboveOne: before.timesheetAllowFractionAboveOne,
        timesheetDayReferenceHours: before.timesheetDayReferenceHours
          ? Number(before.timesheetDayReferenceHours)
          : null,
      },
      newValue: {
        timesheetIgnoreWeekendsDefault: updated.timesheetIgnoreWeekendsDefault,
        timesheetAllowFractionAboveOne: updated.timesheetAllowFractionAboveOne,
        timesheetDayReferenceHours: updated.timesheetDayReferenceHours
          ? Number(updated.timesheetDayReferenceHours)
          : null,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
    await this.auditLogs.create(auditInput);

    return {
      ignoreWeekendsDefault: updated.timesheetIgnoreWeekendsDefault,
      allowFractionAboveOne: updated.timesheetAllowFractionAboveOne,
      dayReferenceHours: this.resolveDayReferenceHours(updated),
    };
  }
}
