import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CapacitySource,
  Prisma,
  ResourceType,
  WorkTeamStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { workingDaysInMonth } from './lib/french-working-days';
import {
  decimalToString,
  parseOptionalPositiveDays,
} from './lib/parse-days';
import { PutMemberMonthlyDto } from './dto/put-member-monthly.dto';
import { PatchPrimaryWorkTeamDto } from './dto/patch-primary-work-team.dto';

type AuditMeta = {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
};

export type ResolvedMonthlyCapacity = {
  yearMonth: string;
  days: string;
  source: CapacitySource;
};

@Injectable()
export class CapacityResolveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  private async assertHumanResource(clientId: string, resourceId: string) {
    const resource = await this.prisma.resource.findFirst({
      where: { id: resourceId, clientId },
      select: {
        id: true,
        type: true,
        name: true,
        primaryCapacityWorkTeamId: true,
      },
    });
    if (!resource) {
      throw new NotFoundException('Ressource introuvable');
    }
    if (resource.type !== ResourceType.HUMAN) {
      throw new BadRequestException(
        'La capacité ne s’applique qu’aux ressources HUMAN',
      );
    }
    return resource;
  }

  /**
   * Priorité : exception membre (jours non null) → ClientMonthlyCapacity → calendrier.
   * SIRH : noop (non implémenté).
   */
  async resolveResourceMonthly(
    clientId: string,
    resourceId: string,
    yearMonth: string,
  ): Promise<ResolvedMonthlyCapacity> {
    await this.assertHumanResource(clientId, resourceId);

    const exception = await this.prisma.resourceCapacityException.findUnique({
      where: {
        clientId_resourceId_yearMonth: { clientId, resourceId, yearMonth },
      },
    });
    if (exception?.days != null) {
      return {
        yearMonth,
        days: decimalToString(exception.days),
        source: CapacitySource.MEMBER_EXCEPTION,
      };
    }

    const clientRow = await this.prisma.clientMonthlyCapacity.findUnique({
      where: { clientId_yearMonth: { clientId, yearMonth } },
    });
    if (clientRow) {
      return {
        yearMonth,
        days: decimalToString(clientRow.days),
        source: clientRow.source,
      };
    }

    const days = new Prisma.Decimal(workingDaysInMonth(yearMonth));
    return {
      yearMonth,
      days: decimalToString(days),
      source: CapacitySource.CALENDAR,
    };
  }

  async listMemberMonthly(clientId: string, resourceId: string, year?: number) {
    const resource = await this.assertHumanResource(clientId, resourceId);
    const withTeam = await this.prisma.resource.findFirst({
      where: { id: resourceId, clientId },
      select: {
        name: true,
        primaryCapacityWorkTeamId: true,
        primaryCapacityWorkTeam: { select: { id: true, name: true } },
      },
    });
    const exceptions = await this.prisma.resourceCapacityException.findMany({
      where: {
        clientId,
        resourceId,
        ...(year != null
          ? { yearMonth: { startsWith: `${year}-` } }
          : {}),
      },
      orderBy: { yearMonth: 'asc' },
    });

    const yearMonths =
      year != null
        ? Array.from({ length: 12 }, (_, i) =>
            `${year}-${String(i + 1).padStart(2, '0')}`,
          )
        : [...new Set(exceptions.map((e) => e.yearMonth))].sort();

    const items = [];
    for (const ym of yearMonths) {
      const resolved = await this.resolveResourceMonthly(
        clientId,
        resourceId,
        ym,
      );
      const ex = exceptions.find((e) => e.yearMonth === ym);
      const inherits = ex?.days == null;
      items.push({
        yearMonth: ym,
        days: inherits ? null : Number(decimalToString(ex!.days!)),
        resolvedDays: Number(resolved.days),
        source: resolved.source,
        inherits,
      });
    }
    return {
      resourceId: resource.id,
      resourceName: withTeam?.name ?? resource.name,
      primaryCapacityWorkTeamId: withTeam?.primaryCapacityWorkTeamId ?? null,
      primaryCapacityWorkTeamName:
        withTeam?.primaryCapacityWorkTeam?.name ?? null,
      items,
    };
  }

  async putMemberMonthly(
    clientId: string,
    resourceId: string,
    dto: PutMemberMonthlyDto,
    actorUserId: string | undefined,
    meta?: AuditMeta,
  ) {
    await this.assertHumanResource(clientId, resourceId);

    await this.prisma.$transaction(async (tx) => {
      for (const it of dto.items) {
        const days = parseOptionalPositiveDays(it.days);
        await tx.resourceCapacityException.upsert({
          where: {
            clientId_resourceId_yearMonth: {
              clientId,
              resourceId,
              yearMonth: it.yearMonth,
            },
          },
          create: {
            clientId,
            resourceId,
            yearMonth: it.yearMonth,
            days,
            source: CapacitySource.MEMBER_EXCEPTION,
          },
          update: {
            days,
            source: CapacitySource.MEMBER_EXCEPTION,
          },
        });
      }
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'capacity.member.monthly_updated',
      resourceType: 'resource_capacity_exception',
      resourceId,
      newValue: { items: dto.items },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return this.listMemberMonthly(clientId, resourceId);
  }

  async patchPrimaryWorkTeam(
    clientId: string,
    resourceId: string,
    dto: PatchPrimaryWorkTeamDto,
    actorUserId: string | undefined,
    meta?: AuditMeta,
  ) {
    const resource = await this.assertHumanResource(clientId, resourceId);
    const workTeamId = dto.primaryCapacityWorkTeamId ?? null;

    if (workTeamId != null) {
      const team = await this.prisma.workTeam.findFirst({
        where: { id: workTeamId, clientId },
        select: { id: true, status: true, name: true },
      });
      if (!team) {
        throw new NotFoundException('WorkTeam introuvable');
      }
      if (team.status !== WorkTeamStatus.ACTIVE) {
        throw new BadRequestException(
          'La WorkTeam principale doit être ACTIVE',
        );
      }
    }

    const updated = await this.prisma.resource.update({
      where: { id: resource.id },
      data: { primaryCapacityWorkTeamId: workTeamId },
      select: {
        id: true,
        name: true,
        primaryCapacityWorkTeamId: true,
        primaryCapacityWorkTeam: { select: { id: true, name: true, status: true } },
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'capacity.member.primary_work_team_updated',
      resourceType: 'resource',
      resourceId,
      oldValue: {
        primaryCapacityWorkTeamId: resource.primaryCapacityWorkTeamId,
      },
      newValue: {
        primaryCapacityWorkTeamId: updated.primaryCapacityWorkTeamId,
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return {
      resourceId: updated.id,
      primaryCapacityWorkTeamId: updated.primaryCapacityWorkTeamId,
      primaryCapacityWorkTeamName: updated.primaryCapacityWorkTeam?.name ?? null,
    };
  }

  /**
   * Capacité d'une WorkTeam ACTIVE = somme des capacités résolues des Resources
   * HUMAN dont `activePrimaryWorkTeam` = cette équipe.
   */
  async resolveWorkTeamMonthly(
    clientId: string,
    workTeamId: string,
    yearMonth: string,
  ): Promise<{ yearMonth: string; days: string; memberCount: number }> {
    const team = await this.prisma.workTeam.findFirst({
      where: { id: workTeamId, clientId },
      select: { id: true, status: true },
    });
    if (!team) {
      throw new NotFoundException('WorkTeam introuvable');
    }
    if (team.status !== WorkTeamStatus.ACTIVE) {
      throw new BadRequestException(
        'Capacité WorkTeam calculée uniquement pour ACTIVE',
      );
    }

    const members = await this.prisma.resource.findMany({
      where: {
        clientId,
        type: ResourceType.HUMAN,
        primaryCapacityWorkTeamId: workTeamId,
      },
      select: { id: true },
    });

    let sum = new Prisma.Decimal(0);
    for (const m of members) {
      const r = await this.resolveResourceMonthly(clientId, m.id, yearMonth);
      sum = sum.plus(r.days);
    }
    return {
      yearMonth,
      days: decimalToString(sum),
      memberCount: members.length,
    };
  }
}
