import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { QueueService } from '../../queue/queue.service';

@Injectable()
export class LicenseExpirationSchedulerService {
  private readonly logger = new Logger(LicenseExpirationSchedulerService.name);

  constructor(private readonly queueService: QueueService) {}

  @Cron(process.env.LICENSE_EXPIRATION_CRON_EXPRESSION ?? '0 * * * *', {
    timeZone: process.env.LICENSE_EXPIRATION_CRON_TZ ?? 'UTC',
  })
  async enqueueScan(): Promise<void> {
    const now = new Date();
    const windowStart = new Date(now);
    windowStart.setUTCMinutes(0, 0, 0);
    const windowEnd = new Date(windowStart.getTime() + 60 * 60 * 1000);

    await this.queueService.enqueueLicenseExpirationScan({
      windowStartIso: windowStart.toISOString(),
      windowEndIso: windowEnd.toISOString(),
    });

    this.logger.log(
      `License expiration scan queued for window ${windowStart.toISOString()} -> ${windowEnd.toISOString()}`,
    );
  }
}
