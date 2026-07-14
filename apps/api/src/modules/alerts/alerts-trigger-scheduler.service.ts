import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { AlertsTriggerService } from './alerts-trigger.service';

/**
 * RFC-038 — génération périodique des alertes métier (budget, projet, contrats).
 * Exécuté dans le process API (ScheduleModule.forRoot dans AppModule).
 * `upsertAlert` étant idempotent, une exécution multi-instances reste sûre.
 */
@Injectable()
export class AlertsTriggerSchedulerService {
  private readonly logger = new Logger(AlertsTriggerSchedulerService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly triggers: AlertsTriggerService,
  ) {}

  @Cron(process.env.ALERTS_TRIGGER_CRON_EXPRESSION ?? '0 * * * *', {
    timeZone: process.env.ALERTS_TRIGGER_CRON_TZ ?? 'UTC',
  })
  async evaluateAllClients(): Promise<void> {
    if (process.env.ALERTS_TRIGGER_ENABLED?.trim().toLowerCase() === 'false') {
      return;
    }
    if (this.running) {
      this.logger.warn('Évaluation alertes déjà en cours — exécution ignorée.');
      return;
    }
    this.running = true;
    const startedAt = Date.now();

    try {
      const clients = await this.prisma.client.findMany({
        select: { id: true },
      });
      let totalBudget = 0;
      let totalProject = 0;
      let totalContract = 0;

      for (const client of clients) {
        try {
          const res = await this.triggers.evaluateAllForClient(client.id);
          totalBudget += res.budget;
          totalProject += res.project;
          totalContract += res.contract;
        } catch (error) {
          this.logger.error(
            `Évaluation alertes échouée pour clientId=${client.id}`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      }

      this.logger.log(
        `Alertes évaluées : ${clients.length} client(s) — budget=${totalBudget} projet=${totalProject} contrat=${totalContract} en ${Date.now() - startedAt}ms`,
      );
    } finally {
      this.running = false;
    }
  }
}
