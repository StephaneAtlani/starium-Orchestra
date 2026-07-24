import { Injectable } from '@nestjs/common';
import { CapacitySource, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { workingDaysInMonth } from './lib/french-working-days';
import { decimalToString, parsePositiveDays } from './lib/parse-days';
import { PutMonthlySettingsDto } from './dto/put-monthly-settings.dto';
import { GenerateMonthlyDto } from './dto/generate-monthly.dto';

type AuditMeta = {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
};

@Injectable()
export class CapacityCalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async listMonthly(clientId: string, year?: number) {
    const where: Prisma.ClientMonthlyCapacityWhereInput = { clientId };
    if (year != null) {
      const prefix = `${year}-`;
      where.yearMonth = { startsWith: prefix };
    }
    const rows = await this.prisma.clientMonthlyCapacity.findMany({
      where,
      orderBy: { yearMonth: 'asc' },
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        yearMonth: r.yearMonth,
        days: decimalToString(r.days),
        source: r.source,
        updatedAt: r.updatedAt,
      })),
    };
  }

  /**
   * Génère 12 mois calendaires. N'écrase pas `CLIENT_PARAM` sauf `force`.
   */
  async generateYear(
    clientId: string,
    dto: GenerateMonthlyDto,
    actorUserId: string | undefined,
    meta?: AuditMeta,
  ) {
    const force = dto.force === true;
    const year = dto.year;
    const upserted: string[] = [];
    const skipped: string[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (let month = 1; month <= 12; month += 1) {
        const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
        const days = new Prisma.Decimal(workingDaysInMonth(yearMonth));
        const existing = await tx.clientMonthlyCapacity.findUnique({
          where: { clientId_yearMonth: { clientId, yearMonth } },
        });
        if (
          existing &&
          existing.source === CapacitySource.CLIENT_PARAM &&
          !force
        ) {
          skipped.push(yearMonth);
          continue;
        }
        await tx.clientMonthlyCapacity.upsert({
          where: { clientId_yearMonth: { clientId, yearMonth } },
          create: {
            clientId,
            yearMonth,
            days,
            source: CapacitySource.CALENDAR,
          },
          update: {
            days,
            source: CapacitySource.CALENDAR,
          },
        });
        upserted.push(yearMonth);
      }
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'capacity.monthly.generated',
      resourceType: 'client_monthly_capacity',
      newValue: { year, force, upserted, skipped },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return { year, force, upserted, skipped };
  }

  async putMonthlySettings(
    clientId: string,
    dto: PutMonthlySettingsDto,
    actorUserId: string | undefined,
    meta?: AuditMeta,
  ) {
    const items = dto.items.map((it) => ({
      yearMonth: it.yearMonth,
      days: parsePositiveDays(it.days),
    }));

    await this.prisma.$transaction(async (tx) => {
      for (const it of items) {
        await tx.clientMonthlyCapacity.upsert({
          where: {
            clientId_yearMonth: { clientId, yearMonth: it.yearMonth },
          },
          create: {
            clientId,
            yearMonth: it.yearMonth,
            days: it.days,
            source: CapacitySource.CLIENT_PARAM,
          },
          update: {
            days: it.days,
            source: CapacitySource.CLIENT_PARAM,
          },
        });
      }
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'capacity.monthly.settings_updated',
      resourceType: 'client_monthly_capacity',
      newValue: {
        items: items.map((i) => ({
          yearMonth: i.yearMonth,
          days: decimalToString(i.days),
        })),
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return this.listMonthly(clientId);
  }
}
