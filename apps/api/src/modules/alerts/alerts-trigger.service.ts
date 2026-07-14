import { Injectable, Logger } from '@nestjs/common';
import {
  AlertSeverity,
  AlertType,
  BudgetLineStatus,
  ProjectMilestoneStatus,
  ProjectRiskCriticality,
  ProjectRiskStatus,
  ProjectStatus,
  SupplierContractStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AlertsService } from './alerts.service';

type EvalResult = { clientId: string; evaluated: number };

/** Seuils configurables (env) avec valeurs par défaut raisonnables. */
function envInt(key: string, fallback: number): number {
  const raw = process.env[key]?.trim();
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function envNum(key: string, fallback: number): number {
  const raw = process.env[key]?.trim();
  const n = raw ? Number.parseFloat(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

@Injectable()
export class AlertsTriggerService {
  private readonly logger = new Logger(AlertsTriggerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
  ) {}

  /** Évalue toutes les familles d'alertes pour un client. */
  async evaluateAllForClient(clientId: string): Promise<{
    clientId: string;
    budget: number;
    project: number;
    contract: number;
  }> {
    const [budget, project, contract] = await Promise.all([
      this.evaluateBudgetAlerts(clientId).then((r) => r.evaluated),
      this.evaluateProjectAlerts(clientId).then((r) => r.evaluated),
      this.evaluateContractAlerts(clientId).then((r) => r.evaluated),
    ]);
    return { clientId, budget, project, contract };
  }

  // ─────────────────────────────────────────────────────────────
  // Budget : dépassement / proche du plafond sur lignes actives
  // ─────────────────────────────────────────────────────────────
  async evaluateBudgetAlerts(clientId: string): Promise<EvalResult> {
    const nearRatio = envNum('ALERT_BUDGET_NEAR_LIMIT_RATIO', 0.9);
    const RULE_OVERRUN = 'budget.line.overrun';
    const RULE_NEAR = 'budget.line.near_limit';

    const lines = await this.prisma.budgetLine.findMany({
      where: { clientId, status: BudgetLineStatus.ACTIVE },
      select: {
        id: true,
        name: true,
        code: true,
        forecastAmount: true,
        consumedAmount: true,
        committedAmount: true,
      },
    });

    let evaluated = 0;
    const activeOverrun: string[] = [];
    const activeNear: string[] = [];

    for (const line of lines) {
      const forecast = Number(line.forecastAmount ?? 0);
      const engaged =
        Number(line.consumedAmount ?? 0) + Number(line.committedAmount ?? 0);
      if (forecast <= 0) continue;
      const ratio = engaged / forecast;

      if (ratio >= 1) {
        activeOverrun.push(line.id);
        const pct = Math.round(ratio * 100);
        await this.alerts.upsertAlert({
          clientId,
          type: AlertType.BUDGET,
          severity: AlertSeverity.CRITICAL,
          title: `Dépassement budgétaire — ${line.name}`,
          message: `La ligne « ${line.name} » (${line.code}) est engagée à ${pct} % du prévisionnel.`,
          entityType: 'budget_line',
          entityId: line.id,
          entityLabel: line.name,
          actionUrl: `/budgets`,
          ruleCode: RULE_OVERRUN,
          metadata: { ratio, forecast, engaged },
        });
        evaluated += 1;
      } else if (ratio >= nearRatio) {
        activeNear.push(line.id);
        const pct = Math.round(ratio * 100);
        await this.alerts.upsertAlert({
          clientId,
          type: AlertType.BUDGET,
          severity: AlertSeverity.WARNING,
          title: `Budget proche du plafond — ${line.name}`,
          message: `La ligne « ${line.name} » (${line.code}) atteint ${pct} % du prévisionnel.`,
          entityType: 'budget_line',
          entityId: line.id,
          entityLabel: line.name,
          actionUrl: `/budgets`,
          ruleCode: RULE_NEAR,
          metadata: { ratio, forecast, engaged },
        });
        evaluated += 1;
      }
    }

    await this.alerts.resolveStaleByRule({
      clientId,
      type: AlertType.BUDGET,
      ruleCodes: [RULE_OVERRUN],
      activeEntityIds: activeOverrun,
    });
    await this.alerts.resolveStaleByRule({
      clientId,
      type: AlertType.BUDGET,
      ruleCodes: [RULE_NEAR],
      activeEntityIds: activeNear,
    });

    return { clientId, evaluated };
  }

  // ─────────────────────────────────────────────────────────────
  // Projet : retard échéance, jalons en dérive, risques critiques
  // ─────────────────────────────────────────────────────────────
  async evaluateProjectAlerts(clientId: string): Promise<EvalResult> {
    const now = new Date();
    const RULE_OVERDUE = 'project.overdue';
    const RULE_MILESTONE = 'project.milestone.delayed';
    const RULE_RISK = 'project.risk.critical';

    const activeStatuses: ProjectStatus[] = [
      ProjectStatus.PLANNED,
      ProjectStatus.IN_PROGRESS,
      ProjectStatus.ON_HOLD,
    ];

    const projects = await this.prisma.project.findMany({
      where: { clientId, status: { in: activeStatuses } },
      select: { id: true, name: true, code: true, targetEndDate: true },
    });

    let evaluated = 0;
    const activeOverdue: string[] = [];

    for (const p of projects) {
      if (p.targetEndDate && p.targetEndDate < now) {
        activeOverdue.push(p.id);
        const late = daysBetween(p.targetEndDate, now);
        await this.alerts.upsertAlert({
          clientId,
          type: AlertType.PROJECT,
          severity: AlertSeverity.WARNING,
          title: `Projet en retard — ${p.name}`,
          message: `Le projet « ${p.name} » (${p.code}) a dépassé sa date cible de ${late} jour(s).`,
          entityType: 'project',
          entityId: p.id,
          entityLabel: p.name,
          actionUrl: `/projects/${p.id}`,
          ruleCode: RULE_OVERDUE,
          metadata: { targetEndDate: p.targetEndDate, lateDays: late },
        });
        evaluated += 1;
      }
    }

    // Jalons en dérive (DELAYED ou PLANNED dont la date cible est passée)
    const milestones = await this.prisma.projectMilestone.findMany({
      where: {
        clientId,
        OR: [
          { status: ProjectMilestoneStatus.DELAYED },
          {
            status: ProjectMilestoneStatus.PLANNED,
            targetDate: { lt: now },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        targetDate: true,
        projectId: true,
        project: { select: { name: true } },
      },
    });

    const activeMilestone: string[] = [];
    for (const m of milestones) {
      activeMilestone.push(m.id);
      await this.alerts.upsertAlert({
        clientId,
        type: AlertType.PROJECT,
        severity: AlertSeverity.WARNING,
        title: `Jalon en dérive — ${m.name}`,
        message: `Le jalon « ${m.name} » du projet « ${m.project?.name ?? '—'} » est en retard (cible ${m.targetDate.toLocaleDateString('fr-FR')}).`,
        entityType: 'project_milestone',
        entityId: m.id,
        entityLabel: m.name,
        actionUrl: m.projectId ? `/projects/${m.projectId}` : '/projects',
        ruleCode: RULE_MILESTONE,
        metadata: { targetDate: m.targetDate },
      });
      evaluated += 1;
    }

    // Risques ouverts de criticité CRITICAL
    const risks = await this.prisma.projectRisk.findMany({
      where: {
        clientId,
        status: ProjectRiskStatus.OPEN,
        criticalityLevel: ProjectRiskCriticality.CRITICAL,
      },
      select: {
        id: true,
        title: true,
        code: true,
        projectId: true,
        mitigationPlan: true,
      },
    });

    const activeRisk: string[] = [];
    for (const r of risks) {
      activeRisk.push(r.id);
      const noPlan = !r.mitigationPlan?.trim();
      await this.alerts.upsertAlert({
        clientId,
        type: AlertType.PROJECT,
        severity: AlertSeverity.CRITICAL,
        title: `Risque critique ouvert — ${r.title}`,
        message: `Le risque « ${r.title} » (${r.code}) est ouvert et de criticité critique${noPlan ? ' ; aucun plan d’action renseigné.' : '.'}`,
        entityType: 'project_risk',
        entityId: r.id,
        entityLabel: r.title,
        actionUrl: r.projectId ? `/projects/${r.projectId}` : '/risks',
        ruleCode: RULE_RISK,
        metadata: { hasMitigationPlan: !noPlan },
      });
      evaluated += 1;
    }

    await this.alerts.resolveStaleByRule({
      clientId,
      type: AlertType.PROJECT,
      ruleCodes: [RULE_OVERDUE],
      activeEntityIds: activeOverdue,
    });
    await this.alerts.resolveStaleByRule({
      clientId,
      type: AlertType.PROJECT,
      ruleCodes: [RULE_MILESTONE],
      activeEntityIds: activeMilestone,
    });
    await this.alerts.resolveStaleByRule({
      clientId,
      type: AlertType.PROJECT,
      ruleCodes: [RULE_RISK],
      activeEntityIds: activeRisk,
    });

    return { clientId, evaluated };
  }

  // ─────────────────────────────────────────────────────────────
  // Contrats fournisseurs : expiration proche / dépassée
  // ─────────────────────────────────────────────────────────────
  async evaluateContractAlerts(clientId: string): Promise<EvalResult> {
    const now = new Date();
    const warnDays = envInt('ALERT_CONTRACT_EXPIRY_WARNING_DAYS', 60);
    const RULE_EXPIRING = 'contract.expiring';
    const RULE_EXPIRED = 'contract.expired';

    const horizon = new Date(now.getTime() + warnDays * 24 * 60 * 60 * 1000);

    const contracts = await this.prisma.supplierContract.findMany({
      where: {
        clientId,
        status: {
          in: [
            SupplierContractStatus.ACTIVE,
            SupplierContractStatus.NOTICE,
            SupplierContractStatus.SUSPENDED,
          ],
        },
        effectiveEnd: { not: null, lte: horizon },
      },
      select: {
        id: true,
        title: true,
        reference: true,
        effectiveEnd: true,
        noticePeriodDays: true,
      },
    });

    let evaluated = 0;
    const activeExpiring: string[] = [];
    const activeExpired: string[] = [];

    for (const c of contracts) {
      if (!c.effectiveEnd) continue;
      const remaining = daysBetween(now, c.effectiveEnd);

      if (c.effectiveEnd < now) {
        activeExpired.push(c.id);
        await this.alerts.upsertAlert({
          clientId,
          type: AlertType.SYSTEM,
          severity: AlertSeverity.CRITICAL,
          title: `Contrat expiré — ${c.title}`,
          message: `Le contrat « ${c.title} » (${c.reference}) a expiré le ${c.effectiveEnd.toLocaleDateString('fr-FR')}.`,
          entityType: 'supplier_contract',
          entityId: c.id,
          entityLabel: c.title,
          actionUrl: `/procurement/contracts`,
          ruleCode: RULE_EXPIRED,
          metadata: { effectiveEnd: c.effectiveEnd },
        });
        evaluated += 1;
      } else {
        activeExpiring.push(c.id);
        const noticeSoon =
          c.noticePeriodDays != null && remaining <= c.noticePeriodDays;
        await this.alerts.upsertAlert({
          clientId,
          type: AlertType.SYSTEM,
          severity: AlertSeverity.WARNING,
          title: `Contrat à échéance — ${c.title}`,
          message: `Le contrat « ${c.title} » (${c.reference}) expire dans ${remaining} jour(s) (${c.effectiveEnd.toLocaleDateString('fr-FR')})${noticeSoon ? ' — préavis de résiliation en cours.' : '.'}`,
          entityType: 'supplier_contract',
          entityId: c.id,
          entityLabel: c.title,
          actionUrl: `/procurement/contracts`,
          ruleCode: RULE_EXPIRING,
          metadata: { effectiveEnd: c.effectiveEnd, remainingDays: remaining, noticeSoon },
        });
        evaluated += 1;
      }
    }

    await this.alerts.resolveStaleByRule({
      clientId,
      type: AlertType.SYSTEM,
      ruleCodes: [RULE_EXPIRING],
      activeEntityIds: activeExpiring,
    });
    await this.alerts.resolveStaleByRule({
      clientId,
      type: AlertType.SYSTEM,
      ruleCodes: [RULE_EXPIRED],
      activeEntityIds: activeExpired,
    });

    return { clientId, evaluated };
  }

  /** Conservé pour compat (endpoint stratégie) — non implémenté ici. */
  async evaluateStrategicVisionAlerts(clientId: string): Promise<EvalResult> {
    return { clientId, evaluated: 0 };
  }
}
