import { NotFoundException } from '@nestjs/common';
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

  it('clearAll supprime uniquement user + client actifs', async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 5 });
    const prisma = {
      notification: { deleteMany },
    } as any;
    const audit = { create: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new NotificationsService(prisma, audit);

    const result = await service.clearAll('client-1', 'user-1');

    expect(result).toEqual({ deleted: 5 });
    expect(deleteMany).toHaveBeenCalledWith({
      where: { clientId: 'client-1', userId: 'user-1' },
    });
    expect(audit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'notification.cleared',
        clientId: 'client-1',
        userId: 'user-1',
        newValue: { mode: 'clear_all', deleted: 5 },
      }),
    );
  });

  it('clearOne hors scope lève NotFoundException', async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 0 });
    const prisma = {
      notification: { deleteMany },
    } as any;
    const audit = { create: jest.fn() } as any;
    const service = new NotificationsService(prisma, audit);

    await expect(
      service.clearOne('client-1', 'user-1', 'notif-x'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(audit.create).not.toHaveBeenCalled();
  });

  it('clearOne scopé audit notification.deleted', async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = {
      notification: { deleteMany },
    } as any;
    const audit = { create: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new NotificationsService(prisma, audit);

    await service.clearOne('client-1', 'user-1', 'notif-1');

    expect(deleteMany).toHaveBeenCalledWith({
      where: { id: 'notif-1', clientId: 'client-1', userId: 'user-1' },
    });
    expect(audit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'notification.deleted',
        resourceId: 'notif-1',
      }),
    );
  });
});
