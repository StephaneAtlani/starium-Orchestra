import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SecurityLogsCleanupService {
  private readonly logger = new Logger(SecurityLogsCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 3 * * *', {
    timeZone: process.env.SECURITY_LOGS_CRON_TZ ?? 'UTC',
  })
  async handleCron(): Promise<void> {
    const now = Date.now();
    const thirteenMonthsMs = 13 * 30 * 24 * 60 * 60 * 1000; // approximation volontaire
    const threshold = new Date(now - thirteenMonthsMs);

    const result = await (this.prisma as any).securityLog.deleteMany({
      where: {
        createdAt: {
          lt: threshold,
        },
      },
    });

    this.logger.log(
      `SecurityLogsCleanupService: deleted ${result.count} security log(s) older than ${threshold.toISOString()}`,
    );
  }
}

