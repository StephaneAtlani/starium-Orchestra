import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ComplianceRemindersService } from './compliance-reminders.service';

/**
 * COMP.V2 — rappels J-7 / échéance / hebdo retard (contributions, écarts, revues).
 * Cron dans le process API (ScheduleModule). Désactivable via COMPLIANCE_REMINDERS_ENABLED=false.
 */
@Injectable()
export class ComplianceRemindersSchedulerService {
  private readonly logger = new Logger(ComplianceRemindersSchedulerService.name);
  private running = false;

  constructor(private readonly reminders: ComplianceRemindersService) {}

  @Cron(process.env.COMPLIANCE_REMINDERS_CRON ?? '15 7 * * *', {
    timeZone: process.env.COMPLIANCE_REMINDERS_TZ ?? 'Europe/Paris',
  })
  async runDaily(): Promise<void> {
    if (
      process.env.COMPLIANCE_REMINDERS_ENABLED?.trim().toLowerCase() === 'false'
    ) {
      return;
    }
    if (this.running) {
      this.logger.warn('Rappels conformité déjà en cours — ignoré.');
      return;
    }
    this.running = true;
    const started = Date.now();
    try {
      const res = await this.reminders.processAllClients();
      this.logger.log(
        `Rappels conformité : ${res.clients} client(s) — sent=${res.sent} skipped=${res.skipped} en ${Date.now() - started}ms`,
      );
    } finally {
      this.running = false;
    }
  }
}
