import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ClientUserRole,
  ClientUserStatus,
  ResourceType,
  TimeEntryStatus,
  TimesheetMonthStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const YEAR_MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export type ResourceTimesheetMonthDto = {
  resourceId: string;
  yearMonth: string;
  status: TimesheetMonthStatus;
  submittedAt: string | null;
  submittedByUserId: string | null;
  unlockedAt: string | null;
  unlockedByUserId: string | null;
  /** Le connecté peut valider ce mois (sa propre ressource). */
  canSubmit: boolean;
  /** Le connecté peut déverrouiller (manager hiérarchique ou admin client). */
  canUnlock: boolean;
};

function assertYearMonth(ym: string): void {
  if (!YEAR_MONTH_RE.test(ym.trim())) {
    throw new BadRequestException({
      error: 'InvalidYearMonth',
      message: 'yearMonth must be YYYY-MM',
    });
  }
}

/** Bornes UTC [start, end] pour le mois YYYY-MM. */
export function utcMonthBounds(yearMonth: string): { start: Date; end: Date } {
  const [ys, ms] = yearMonth.split('-');
  const y = Number(ys);
  const m = Number(ms);
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
  return { start, end };
}

export function utcYearMonthFromDate(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

@Injectable()
export class ResourceTimesheetMonthsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Ressource catalogue Humaine alignée sur l’utilisateur (email membre client). */
  async getHumanResourceIdForUser(
    clientId: string,
    userId: string,
  ): Promise<string | null> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!u?.email?.trim()) return null;
    const r = await this.prisma.resource.findFirst({
      where: {
        clientId,
        type: ResourceType.HUMAN,
        email: { equals: u.email.trim(), mode: 'insensitive' },
      },
      select: { id: true },
    });
    return r?.id ?? null;
  }

  async isClientAdmin(clientId: string, userId: string): Promise<boolean> {
    const cu = await this.prisma.clientUser.findFirst({
      where: { clientId, userId, status: ClientUserStatus.ACTIVE },
      select: { role: true },
    });
    return cu?.role === ClientUserRole.CLIENT_ADMIN;
  }

  /**
   * Saisie / modification d’entrées de temps : soit sa propre ressource Humaine, soit admin client.
   */
  async assertActorMayManageEntriesForResource(
    clientId: string,
    actorUserId: string | undefined,
    resourceId: string,
  ): Promise<void> {
    if (!actorUserId) {
      throw new ForbiddenException({ error: 'Forbidden', message: 'User required' });
    }
    const mine = await this.getHumanResourceIdForUser(clientId, actorUserId);
    if (mine === resourceId) return;
    if (await this.isClientAdmin(clientId, actorUserId)) return;
    throw new ForbiddenException({
      error: 'Forbidden',
      message:
        'Vous ne pouvez saisir des temps que pour votre fiche Ressource Humaine (ou en tant qu’administrateur client).',
    });
  }

  /** Manager hiérarchique (Collaborator.manager) = même User que le collaborateur manager. */
  async isManagerUserForResource(
    clientId: string,
    managerUserId: string,
    subjectResourceId: string,
  ): Promise<boolean> {
    const subject = await this.prisma.resource.findFirst({
      where: { id: subjectResourceId, clientId, type: ResourceType.HUMAN },
      select: { email: true },
    });
    if (!subject?.email?.trim()) return false;
    const collab = await this.prisma.collaborator.findFirst({
      where: {
        clientId,
        email: { equals: subject.email.trim(), mode: 'insensitive' },
      },
      select: { managerId: true },
    });
    if (!collab?.managerId) return false;
    const mgr = await this.prisma.collaborator.findFirst({
      where: { id: collab.managerId, clientId },
      select: { userId: true },
    });
    return mgr?.userId === managerUserId;
  }

  async getMonth(
    clientId: string,
    resourceId: string,
    yearMonth: string,
    actorUserId?: string,
  ): Promise<ResourceTimesheetMonthDto> {
    assertYearMonth(yearMonth);
    const r = await this.prisma.resource.findFirst({
      where: { id: resourceId, clientId },
      select: { id: true },
    });
    if (!r) {
      throw new NotFoundException({ error: 'NotFound', message: 'Resource not found' });
    }
    const ym = yearMonth.trim();
    let canSubmit = false;
    let canUnlock = false;
    if (actorUserId) {
      const mine = await this.getHumanResourceIdForUser(clientId, actorUserId);
      canSubmit = mine === resourceId;
      const admin = await this.isClientAdmin(clientId, actorUserId);
      canUnlock =
        admin ||
        (await this.isManagerUserForResource(clientId, actorUserId, resourceId));
    }
    const row = await this.prisma.resourceTimesheetMonth.findUnique({
      where: {
        clientId_resourceId_yearMonth: {
          clientId,
          resourceId,
          yearMonth: ym,
        },
      },
    });
    if (!row) {
      return {
        resourceId,
        yearMonth: ym,
        status: TimesheetMonthStatus.OPEN,
        submittedAt: null,
        submittedByUserId: null,
        unlockedAt: null,
        unlockedByUserId: null,
        canSubmit,
        canUnlock,
      };
    }
    return {
      resourceId: row.resourceId,
      yearMonth: row.yearMonth,
      status: row.status,
      submittedAt: row.submittedAt?.toISOString() ?? null,
      submittedByUserId: row.submittedByUserId,
      unlockedAt: row.unlockedAt?.toISOString() ?? null,
      unlockedByUserId: row.unlockedByUserId,
      canSubmit,
      canUnlock,
    };
  }

  async assertMonthOpenForEntryMutation(
    clientId: string,
    resourceId: string,
    workDate: Date,
  ): Promise<void> {
    const ym = utcYearMonthFromDate(workDate);
    const row = await this.prisma.resourceTimesheetMonth.findUnique({
      where: {
        clientId_resourceId_yearMonth: {
          clientId,
          resourceId,
          yearMonth: ym,
        },
      },
    });
    if (row?.status === TimesheetMonthStatus.SUBMITTED) {
      throw new ForbiddenException({
        error: 'TimesheetMonthLocked',
        message:
          'Ce mois est validé. Demandez à votre manager de déverrouiller la fiche pour modifier les saisies.',
      });
    }
  }

  async submitMonth(
    clientId: string,
    resourceId: string,
    yearMonth: string,
    actorUserId: string,
  ): Promise<ResourceTimesheetMonthDto> {
    assertYearMonth(yearMonth);
    const ym = yearMonth.trim();
    const humanId = await this.getHumanResourceIdForUser(clientId, actorUserId);
    if (!humanId || humanId !== resourceId) {
      throw new ForbiddenException({
        error: 'Forbidden',
        message: 'Seul le collaborateur concerné peut valider sa fiche de temps.',
      });
    }
    const { start, end } = utcMonthBounds(ym);
    await this.prisma.$transaction([
      this.prisma.resourceTimesheetMonth.upsert({
        where: {
          clientId_resourceId_yearMonth: {
            clientId,
            resourceId,
            yearMonth: ym,
          },
        },
        create: {
          clientId,
          resourceId,
          yearMonth: ym,
          status: TimesheetMonthStatus.SUBMITTED,
          submittedAt: new Date(),
          submittedByUserId: actorUserId,
        },
        update: {
          status: TimesheetMonthStatus.SUBMITTED,
          submittedAt: new Date(),
          submittedByUserId: actorUserId,
          unlockedAt: null,
          unlockedByUserId: null,
        },
      }),
      this.prisma.resourceTimeEntry.updateMany({
        where: {
          clientId,
          resourceId,
          workDate: { gte: start, lte: end },
        },
        data: { status: TimeEntryStatus.SUBMITTED },
      }),
    ]);
    const dto = await this.getMonth(clientId, resourceId, ym, actorUserId);
    return dto;
  }

  async unlockMonth(
    clientId: string,
    resourceId: string,
    yearMonth: string,
    actorUserId: string,
  ): Promise<ResourceTimesheetMonthDto> {
    assertYearMonth(yearMonth);
    const ym = yearMonth.trim();
    const admin = await this.isClientAdmin(clientId, actorUserId);
    const isMgr =
      admin || (await this.isManagerUserForResource(clientId, actorUserId, resourceId));
    if (!isMgr) {
      throw new ForbiddenException({
        error: 'Forbidden',
        message: 'Seul le manager hiérarchique (ou un administrateur client) peut déverrouiller la fiche.',
      });
    }
    const { start, end } = utcMonthBounds(ym);
    await this.prisma.$transaction([
      this.prisma.resourceTimesheetMonth.upsert({
        where: {
          clientId_resourceId_yearMonth: {
            clientId,
            resourceId,
            yearMonth: ym,
          },
        },
        create: {
          clientId,
          resourceId,
          yearMonth: ym,
          status: TimesheetMonthStatus.OPEN,
          unlockedAt: new Date(),
          unlockedByUserId: actorUserId,
        },
        update: {
          status: TimesheetMonthStatus.OPEN,
          unlockedAt: new Date(),
          unlockedByUserId: actorUserId,
        },
      }),
      this.prisma.resourceTimeEntry.updateMany({
        where: {
          clientId,
          resourceId,
          workDate: { gte: start, lte: end },
        },
        data: { status: TimeEntryStatus.DRAFT },
      }),
    ]);
    const dto = await this.getMonth(clientId, resourceId, ym, actorUserId);
    return dto;
  }
}
