import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const OPEN_CONTRIBUTION = new Set([
  'TODO',
  'IN_PROGRESS',
  'BLOCKED',
  'NEEDS_MORE',
]);
const OPEN_GAP = new Set(['OPEN', 'IN_PROGRESS', 'TO_VERIFY']);

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addUtcDays(d: Date, days: number): Date {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Clé hebdo ISO (année-semaine) pour les relances after-due. */
function isoWeekKey(d: Date): string {
  const tmp = startOfUtcDay(d);
  const day = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export type ComplianceReminderKind = 'j7' | 'due' | 'overdue';

@Injectable()
export class ComplianceRemindersService {
  private readonly logger = new Logger(ComplianceRemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Traite les rappels d’un client (idempotent via ComplianceReminderLog).
   * kinds : j7 (due dans 7 j), due (jour J), overdue (après échéance, 1×/semaine).
   */
  async processClient(
    clientId: string,
    now = new Date(),
  ): Promise<{ sent: number; skipped: number }> {
    const today = startOfUtcDay(now);
    const in7 = addUtcDays(today, 7);
    let sent = 0;
    let skipped = 0;

    const contribs = await this.prisma.complianceContribution.findMany({
      where: {
        clientId,
        dueAt: { not: null },
        status: { in: [...OPEN_CONTRIBUTION] as never[] },
      },
      include: {
        requirement: { select: { code: true, title: true } },
      },
      take: 500,
    });

    for (const c of contribs) {
      if (!c.dueAt || !c.assigneeUserId) continue;
      const due = startOfUtcDay(c.dueAt);
      const label = `${c.requirement.code} — ${c.requirement.title}`;
      const r = await this.maybeNotify({
        clientId,
        entityType: 'CONTRIBUTION',
        entityId: c.id,
        userId: c.assigneeUserId,
        due,
        today,
        in7,
        title: 'Rappel contribution conformité',
        message: `Contribution « ${label} » — échéance ${isoDay(due)}.`,
        actionUrl: '/compliance/contributions',
        entityLabel: label,
      });
      sent += r.sent;
      skipped += r.skipped;
    }

    const gaps = await this.prisma.complianceGap.findMany({
      where: {
        clientId,
        dueAt: { not: null },
        ownerUserId: { not: null },
        status: { in: [...OPEN_GAP] as never[] },
      },
      include: {
        requirement: { select: { code: true, title: true } },
      },
      take: 500,
    });

    for (const g of gaps) {
      if (!g.dueAt || !g.ownerUserId) continue;
      const due = startOfUtcDay(g.dueAt);
      const label = `${g.requirement.code} — ${g.title}`;
      const r = await this.maybeNotify({
        clientId,
        entityType: 'GAP',
        entityId: g.id,
        userId: g.ownerUserId,
        due,
        today,
        in7,
        title: 'Rappel écart conformité',
        message: `Écart « ${label} » — échéance ${isoDay(due)}.`,
        actionUrl: `/compliance/requirements/${g.requirementId}`,
        entityLabel: label,
      });
      sent += r.sent;
      skipped += r.skipped;
    }

    const campaigns = await this.prisma.complianceCampaign.findMany({
      where: { clientId, status: 'OPEN', openedAt: { not: null } },
      take: 100,
    });

    for (const camp of campaigns) {
      if (!camp.openedAt || !camp.createdByUserId) continue;
      const months = camp.reviewFrequencyMonths || 12;
      const due = startOfUtcDay(camp.openedAt);
      due.setUTCMonth(due.getUTCMonth() + months);
      const label = camp.name;
      const r = await this.maybeNotify({
        clientId,
        entityType: 'CAMPAIGN',
        entityId: camp.id,
        userId: camp.createdByUserId,
        due,
        today,
        in7,
        title: 'Rappel revue conformité',
        message: `Revue « ${label} » — prochaine échéance interne ${isoDay(due)}.`,
        actionUrl: `/compliance/frameworks/${camp.frameworkId}`,
        entityLabel: label,
      });
      sent += r.sent;
      skipped += r.skipped;
    }

    return { sent, skipped };
  }

  async processAllClients(now = new Date()) {
    const clients = await this.prisma.client.findMany({ select: { id: true } });
    let sent = 0;
    let skipped = 0;
    for (const c of clients) {
      try {
        const r = await this.processClient(c.id, now);
        sent += r.sent;
        skipped += r.skipped;
      } catch (e) {
        this.logger.error(
          `Rappels conformité échoués clientId=${c.id}`,
          e instanceof Error ? e.stack : String(e),
        );
      }
    }
    return { clients: clients.length, sent, skipped };
  }

  private async maybeNotify(opts: {
    clientId: string;
    entityType: string;
    entityId: string;
    userId: string;
    due: Date;
    today: Date;
    in7: Date;
    title: string;
    message: string;
    actionUrl: string;
    entityLabel: string;
  }): Promise<{ sent: number; skipped: number }> {
    const kinds: Array<{ kind: ComplianceReminderKind; match: boolean }> = [
      { kind: 'j7', match: isoDay(opts.due) === isoDay(opts.in7) },
      { kind: 'due', match: isoDay(opts.due) === isoDay(opts.today) },
      {
        kind: 'overdue',
        match: opts.due.getTime() < opts.today.getTime(),
      },
    ];

    let sent = 0;
    let skipped = 0;

    for (const { kind, match } of kinds) {
      if (!match) continue;
      const occurrenceKey =
        kind === 'overdue'
          ? `overdue:${isoWeekKey(opts.today)}`
          : `${kind}:${isoDay(opts.due)}`;

      const existing = await this.prisma.complianceReminderLog.findUnique({
        where: {
          clientId_entityType_entityId_userId_occurrenceKey: {
            clientId: opts.clientId,
            entityType: opts.entityType,
            entityId: opts.entityId,
            userId: opts.userId,
            occurrenceKey,
          },
        },
      });
      if (existing) {
        skipped += 1;
        continue;
      }

      const suffix =
        kind === 'j7'
          ? ' (J-7)'
          : kind === 'due'
            ? ' (échéance)'
            : ' (en retard)';

      await this.notifications.createForUser({
        clientId: opts.clientId,
        userId: opts.userId,
        type: NotificationType.ALERT,
        title: `${opts.title}${suffix}`,
        message: opts.message,
        entityType: opts.entityType.toLowerCase(),
        entityId: opts.entityId,
        entityLabel: opts.entityLabel,
        actionUrl: opts.actionUrl,
        metadata: { reminderKind: kind, occurrenceKey },
      });

      await this.prisma.complianceReminderLog.create({
        data: {
          clientId: opts.clientId,
          entityType: opts.entityType,
          entityId: opts.entityId,
          userId: opts.userId,
          occurrenceKey,
        },
      });
      sent += 1;
    }

    return { sent, skipped };
  }
}
