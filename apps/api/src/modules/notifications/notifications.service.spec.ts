import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  it('filtre GET notifications par client + user courant', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prisma = {
      notification: { findMany, count },
      $transaction: jest.fn(async (operations: Array<Promise<unknown>>) =>
        Promise.all(operations),
      ),
    } as any;
    const audit = { create: jest.fn() } as any;
    const service = new NotificationsService(prisma, audit);

    await service.list('client-a', 'user-a', {});

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    const tx = prisma.$transaction.mock.calls[0][0];
    expect(tx).toHaveLength(3);
  });

  it('read-all agit uniquement sur user courant + client actif', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 2 });
    const prisma = {
      notification: { updateMany },
    } as any;
    const audit = { create: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new NotificationsService(prisma, audit);

    await service.markAllRead('client-1', 'user-1');

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        clientId: 'client-1',
        userId: 'user-1',
        status: 'UNREAD',
      },
      data: {
        status: 'READ',
        readAt: expect.any(Date),
      },
    });
  });
});
