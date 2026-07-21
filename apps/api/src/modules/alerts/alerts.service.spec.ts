import { AlertSeverity, AlertStatus, AlertType } from '@prisma/client';
import { AlertsService } from './alerts.service';

function buildPrismaMock(overrides: Record<string, unknown> = {}) {
  return {
    alert: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    clientUser: { findMany: jest.fn().mockResolvedValue([]) },
    notification: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'n1' }),
    },
    emailDelivery: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    ...overrides,
  } as any;
}

describe('AlertsService', () => {
  it('anti-doublon ACTIVE: met a jour au lieu de recreer', async () => {
    const existing = {
      id: 'a1',
      status: AlertStatus.ACTIVE,
      severity: AlertSeverity.CRITICAL,
      type: AlertType.SYSTEM,
    };
    const prisma = buildPrismaMock({
      alert: {
        findFirst: jest.fn().mockResolvedValue(existing),
        update: jest.fn().mockResolvedValue(existing),
        create: jest.fn(),
      },
    });
    const audit = { create: jest.fn().mockResolvedValue(undefined) } as any;
    const email = { queueEmail: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new AlertsService(prisma, audit, email);

    await service.upsertAlert({
      clientId: 'client-1',
      type: AlertType.SYSTEM,
      severity: AlertSeverity.CRITICAL,
      title: 'Titre',
      message: 'Message',
      ruleCode: 'RULE_X',
    });

    expect(prisma.alert.create).not.toHaveBeenCalled();
    expect(prisma.alert.update).toHaveBeenCalledTimes(1);
  });

  it('re-évaluation Alert ACTIVE existante: ne recrée ni notif ni email', async () => {
    const existing = {
      id: 'a1',
      status: AlertStatus.ACTIVE,
      severity: AlertSeverity.CRITICAL,
      type: AlertType.SYSTEM,
    };
    const prisma = buildPrismaMock({
      alert: {
        findFirst: jest.fn().mockResolvedValue(existing),
        update: jest.fn().mockResolvedValue(existing),
        create: jest.fn(),
      },
      clientUser: {
        findMany: jest.fn().mockResolvedValue([
          { userId: 'u1', user: { email: 'admin@example.com' } },
        ]),
      },
      notification: {
        findFirst: jest.fn().mockResolvedValue({ id: 'n-existing' }),
        create: jest.fn(),
      },
      emailDelivery: {
        findFirst: jest.fn().mockResolvedValue({ id: 'e-existing' }),
      },
    });
    const audit = { create: jest.fn().mockResolvedValue(undefined) } as any;
    const email = { queueEmail: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new AlertsService(prisma, audit, email);

    await service.upsertAlert({
      clientId: 'client-1',
      type: AlertType.SYSTEM,
      severity: AlertSeverity.CRITICAL,
      title: 'Titre',
      message: 'Message',
      ruleCode: 'RULE_X',
    });

    expect(prisma.notification.create).not.toHaveBeenCalled();
    expect(email.queueEmail).not.toHaveBeenCalled();
  });

  it('nouvelle Alert CRITICAL: crée notif + enqueue email', async () => {
    const created = {
      id: 'a-new',
      status: AlertStatus.ACTIVE,
      severity: AlertSeverity.CRITICAL,
      type: AlertType.BUDGET,
    };
    const prisma = buildPrismaMock({
      alert: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
        create: jest.fn().mockResolvedValue(created),
      },
      clientUser: {
        findMany: jest.fn().mockResolvedValue([
          { userId: 'u1', user: { email: 'admin@example.com' } },
        ]),
      },
      notification: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'n1' }),
      },
      emailDelivery: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const audit = { create: jest.fn().mockResolvedValue(undefined) } as any;
    const email = { queueEmail: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new AlertsService(prisma, audit, email);

    await service.upsertAlert({
      clientId: 'client-1',
      type: AlertType.BUDGET,
      severity: AlertSeverity.CRITICAL,
      title: 'Dépassement',
      message: 'Ligne engagée',
      ruleCode: 'budget.line.overrun',
      entityType: 'budget_line',
      entityId: 'bl-1',
    });

    expect(prisma.alert.create).toHaveBeenCalledTimes(1);
    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
    expect(email.queueEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        templateKey: 'critical_alert',
        recipient: 'admin@example.com',
        alertId: 'a-new',
      }),
    );
  });

  it('WARNING: crée notif sans email', async () => {
    const created = {
      id: 'a-warn',
      status: AlertStatus.ACTIVE,
      severity: AlertSeverity.WARNING,
      type: AlertType.PROJECT,
    };
    const prisma = buildPrismaMock({
      alert: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
        create: jest.fn().mockResolvedValue(created),
      },
      clientUser: {
        findMany: jest.fn().mockResolvedValue([
          { userId: 'u1', user: { email: 'admin@example.com' } },
        ]),
      },
    });
    const audit = { create: jest.fn().mockResolvedValue(undefined) } as any;
    const email = { queueEmail: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new AlertsService(prisma, audit, email);

    await service.upsertAlert({
      clientId: 'client-1',
      type: AlertType.PROJECT,
      severity: AlertSeverity.WARNING,
      title: 'Retard',
      message: 'Jalon dépassé',
      ruleCode: 'project.overdue',
    });

    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
    expect(email.queueEmail).not.toHaveBeenCalled();
  });

  it('Alert ACTIVE + nouvel admin sans notif: crée notif pour lui seul, pas de re-mail', async () => {
    const existing = {
      id: 'a1',
      status: AlertStatus.ACTIVE,
      severity: AlertSeverity.CRITICAL,
      type: AlertType.SYSTEM,
    };
    const prisma = buildPrismaMock({
      alert: {
        findFirst: jest.fn().mockResolvedValue(existing),
        update: jest.fn().mockResolvedValue(existing),
        create: jest.fn(),
      },
      clientUser: {
        findMany: jest.fn().mockResolvedValue([
          { userId: 'u-old', user: { email: 'old@example.com' } },
          { userId: 'u-new', user: { email: 'new@example.com' } },
        ]),
      },
      notification: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id: 'n-old' })
          .mockResolvedValueOnce(null),
        create: jest.fn().mockResolvedValue({ id: 'n-new' }),
      },
      emailDelivery: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id: 'e-old' })
          .mockResolvedValueOnce({ id: 'e-new-already' }),
      },
    });
    const audit = { create: jest.fn().mockResolvedValue(undefined) } as any;
    const email = { queueEmail: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new AlertsService(prisma, audit, email);

    await service.upsertAlert({
      clientId: 'client-1',
      type: AlertType.SYSTEM,
      severity: AlertSeverity.CRITICAL,
      title: 'Titre',
      message: 'Message',
      ruleCode: 'RULE_X',
    });

    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'u-new', alertId: 'a1' }),
      }),
    );
    expect(email.queueEmail).not.toHaveBeenCalled();
  });
});
