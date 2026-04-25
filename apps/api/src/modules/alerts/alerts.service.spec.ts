import { AlertSeverity, AlertStatus, AlertType } from '@prisma/client';
import { AlertsService } from './alerts.service';

describe('AlertsService', () => {
  it('anti-doublon ACTIVE: met a jour au lieu de recreer', async () => {
    const existing = {
      id: 'a1',
      status: AlertStatus.ACTIVE,
      severity: AlertSeverity.CRITICAL,
      type: AlertType.SYSTEM,
    };
    const prisma = {
      alert: {
        findFirst: jest.fn().mockResolvedValue(existing),
        update: jest.fn().mockResolvedValue(existing),
        create: jest.fn(),
      },
      clientUser: { findMany: jest.fn().mockResolvedValue([]) },
      notification: { create: jest.fn() },
    } as any;
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
});
