import { Test, TestingModule } from '@nestjs/testing';
import { SecurityLogsCleanupService } from './security-logs.cleanup.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SecurityLogsCleanupService', () => {
  let service: SecurityLogsCleanupService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityLogsCleanupService,
        {
          provide: PrismaService,
          useValue: {
            securityLog: {
              deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
            },
          },
        },
      ],
    }).compile();

    service = module.get<SecurityLogsCleanupService>(SecurityLogsCleanupService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should delete logs older than ~13 months', async () => {
    const baseNow = new Date('2026-03-10T10:00:00.000Z').getTime();
    const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(baseNow);

    await service.handleCron();

    expect(prisma.securityLog.deleteMany).toHaveBeenCalledTimes(1);
    const callArg = (prisma.securityLog.deleteMany as jest.Mock).mock.calls[0][0];
    const threshold: Date = callArg.where.createdAt.lt;

    const diffMs = baseNow - threshold.getTime();
    const thirteenMonthsMs = 13 * 30 * 24 * 60 * 60 * 1000;
    const toleranceMs = 5 * 24 * 60 * 60 * 1000; // ±5 jours

    expect(Math.abs(diffMs - thirteenMonthsMs)).toBeLessThanOrEqual(toleranceMs);

    dateNowSpy.mockRestore();
  });
}

