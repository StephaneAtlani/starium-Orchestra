import { AlertSeverity, AlertType } from '@prisma/client';
import { AlertsTriggerService } from './alerts-trigger.service';

function buildAlertsMock() {
  return {
    upsertAlert: jest.fn().mockResolvedValue({ id: 'alert-x' }),
    resolveStaleByRule: jest.fn().mockResolvedValue(0),
  } as any;
}

describe('AlertsTriggerService', () => {
  describe('evaluateBudgetAlerts', () => {
    it('émet une alerte CRITICAL en cas de dépassement (engagé ≥ prévisionnel)', async () => {
      const prisma = {
        budgetLine: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'bl-1',
              name: 'Licences SaaS',
              code: 'BL-001',
              forecastAmount: 1000,
              consumedAmount: 900,
              committedAmount: 200,
            },
          ]),
        },
      } as any;
      const alerts = buildAlertsMock();
      const service = new AlertsTriggerService(prisma, alerts);

      const res = await service.evaluateBudgetAlerts('client-1');

      expect(res.evaluated).toBe(1);
      const call = alerts.upsertAlert.mock.calls[0][0] as Record<string, unknown>;
      expect(call.type).toBe(AlertType.BUDGET);
      expect(call.severity).toBe(AlertSeverity.CRITICAL);
      expect(call.ruleCode).toBe('budget.line.overrun');
      expect(call.entityId).toBe('bl-1');
    });

    it('émet une alerte WARNING proche du plafond (≥ 90 %)', async () => {
      const prisma = {
        budgetLine: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'bl-2',
              name: 'Prestations',
              code: 'BL-002',
              forecastAmount: 1000,
              consumedAmount: 950,
              committedAmount: 0,
            },
          ]),
        },
      } as any;
      const alerts = buildAlertsMock();
      const service = new AlertsTriggerService(prisma, alerts);

      const res = await service.evaluateBudgetAlerts('client-1');

      expect(res.evaluated).toBe(1);
      const call = alerts.upsertAlert.mock.calls[0][0] as Record<string, unknown>;
      expect(call.severity).toBe(AlertSeverity.WARNING);
      expect(call.ruleCode).toBe('budget.line.near_limit');
    });

    it('ignore les lignes sous le seuil et ne crée aucune alerte', async () => {
      const prisma = {
        budgetLine: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'bl-3',
              name: 'Divers',
              code: 'BL-003',
              forecastAmount: 1000,
              consumedAmount: 100,
              committedAmount: 0,
            },
          ]),
        },
      } as any;
      const alerts = buildAlertsMock();
      const service = new AlertsTriggerService(prisma, alerts);

      const res = await service.evaluateBudgetAlerts('client-1');

      expect(res.evaluated).toBe(0);
      expect(alerts.upsertAlert).not.toHaveBeenCalled();
      // auto-résolution toujours appelée pour purger les anciennes alertes
      expect(alerts.resolveStaleByRule).toHaveBeenCalled();
    });
  });

  describe('evaluateContractAlerts', () => {
    it('émet une alerte CRITICAL pour un contrat déjà expiré', async () => {
      const past = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const prisma = {
        supplierContract: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'ct-1',
              title: 'Contrat cloud',
              reference: 'CT-001',
              effectiveEnd: past,
              noticePeriodDays: 30,
            },
          ]),
        },
      } as any;
      const alerts = buildAlertsMock();
      const service = new AlertsTriggerService(prisma, alerts);

      const res = await service.evaluateContractAlerts('client-1');

      expect(res.evaluated).toBe(1);
      const call = alerts.upsertAlert.mock.calls[0][0] as Record<string, unknown>;
      expect(call.severity).toBe(AlertSeverity.CRITICAL);
      expect(call.ruleCode).toBe('contract.expired');
    });

    it('émet une alerte WARNING pour une échéance proche', async () => {
      const soon = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      const prisma = {
        supplierContract: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'ct-2',
              title: 'Maintenance',
              reference: 'CT-002',
              effectiveEnd: soon,
              noticePeriodDays: 30,
            },
          ]),
        },
      } as any;
      const alerts = buildAlertsMock();
      const service = new AlertsTriggerService(prisma, alerts);

      const res = await service.evaluateContractAlerts('client-1');

      expect(res.evaluated).toBe(1);
      const call = alerts.upsertAlert.mock.calls[0][0] as Record<string, unknown>;
      expect(call.severity).toBe(AlertSeverity.WARNING);
      expect(call.ruleCode).toBe('contract.expiring');
    });
  });

  describe('evaluateProjectAlerts', () => {
    it('émet une alerte pour un projet en retard et un risque critique', async () => {
      const past = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const prisma = {
        project: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'p-1', name: 'Refonte', code: 'PRJ-1', targetEndDate: past },
          ]),
        },
        projectMilestone: { findMany: jest.fn().mockResolvedValue([]) },
        projectRisk: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'r-1',
              title: 'Fuite de données',
              code: 'RSK-1',
              projectId: 'p-1',
              mitigationPlan: null,
            },
          ]),
        },
      } as any;
      const alerts = buildAlertsMock();
      const service = new AlertsTriggerService(prisma, alerts);

      const res = await service.evaluateProjectAlerts('client-1');

      expect(res.evaluated).toBe(2);
      const rules = alerts.upsertAlert.mock.calls.map(
        (c: unknown[]) => (c[0] as Record<string, unknown>).ruleCode,
      );
      expect(rules).toContain('project.overdue');
      expect(rules).toContain('project.risk.critical');
    });
  });
});
