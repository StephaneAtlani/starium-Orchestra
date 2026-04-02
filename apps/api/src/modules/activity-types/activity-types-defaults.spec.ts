import { PrismaClient } from '@prisma/client';
import { ensureDefaultActivityTypes } from './activity-types-defaults';

describe('ensureDefaultActivityTypes', () => {
  it('crée les 5 kinds si vide puis ne duplique pas (idempotent)', async () => {
    const creates: unknown[] = [];
    const prisma = {
      activityType: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn((args: { data: Record<string, unknown> }) => {
          creates.push(args.data);
          return Promise.resolve({ id: 'x', ...args.data });
        }),
      },
    } as unknown as PrismaClient;

    await ensureDefaultActivityTypes(prisma, 'c1');
    expect(prisma.activityType.count).toHaveBeenCalledTimes(5);
    expect(prisma.activityType.create).toHaveBeenCalledTimes(5);
    expect(creates).toHaveLength(5);

    jest.clearAllMocks();
    (prisma.activityType.count as jest.Mock).mockResolvedValue(1);
    await ensureDefaultActivityTypes(prisma, 'c1');
    expect(prisma.activityType.create).not.toHaveBeenCalled();
  });

  it('ne force pas isDefault sur un kind déjà peuplé', async () => {
    const prisma = {
      activityType: {
        count: jest
          .fn()
          .mockResolvedValueOnce(1)
          .mockResolvedValueOnce(0)
          .mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 'n' }),
      },
    } as unknown as PrismaClient;

    await ensureDefaultActivityTypes(prisma, 'c1');
    expect(prisma.activityType.create).toHaveBeenCalledTimes(4);
  });
});
