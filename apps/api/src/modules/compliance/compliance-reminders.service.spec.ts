import { ComplianceRemindersService } from './compliance-reminders.service';

describe('ComplianceRemindersService', () => {
  let service: ComplianceRemindersService;
  let prisma: any;
  let notifications: any;

  beforeEach(() => {
    prisma = {
      complianceContribution: { findMany: jest.fn().mockResolvedValue([]) },
      complianceGap: { findMany: jest.fn().mockResolvedValue([]) },
      complianceCampaign: { findMany: jest.fn().mockResolvedValue([]) },
      complianceReminderLog: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      client: { findMany: jest.fn().mockResolvedValue([{ id: 'c1' }]) },
    };
    notifications = {
      createForUser: jest.fn().mockResolvedValue({ id: 'n1' }),
    };
    service = new ComplianceRemindersService(prisma, notifications);
  });

  it('envoie J-7 et déduplique au second passage', async () => {
    const due = new Date('2026-09-24T12:00:00.000Z');
    prisma.complianceContribution.findMany.mockResolvedValue([
      {
        id: 'co-1',
        assigneeUserId: 'u1',
        dueAt: due,
        requirementId: 'r1',
        requirement: { code: 'A.1', title: 'Ctrl' },
      },
    ]);

    const now = new Date('2026-09-17T10:00:00.000Z'); // J-7
    const first = await service.processClient('c1', now);
    expect(first.sent).toBe(1);
    expect(notifications.createForUser).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        title: expect.stringContaining('J-7'),
      }),
    );

    prisma.complianceReminderLog.findUnique.mockResolvedValue({ id: 'log1' });
    const second = await service.processClient('c1', now);
    expect(second.sent).toBe(0);
    expect(second.skipped).toBeGreaterThanOrEqual(1);
  });

  it('envoie un rappel due le jour J', async () => {
    const due = new Date('2026-09-17T08:00:00.000Z');
    prisma.complianceGap.findMany.mockResolvedValue([
      {
        id: 'g1',
        ownerUserId: 'u2',
        dueAt: due,
        requirementId: 'r1',
        title: 'Écart X',
        requirement: { code: 'B.2', title: 'Exig' },
      },
    ]);
    const now = new Date('2026-09-17T15:00:00.000Z');
    const res = await service.processClient('c1', now);
    expect(res.sent).toBe(1);
    expect(notifications.createForUser).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('échéance'),
      }),
    );
  });
});
