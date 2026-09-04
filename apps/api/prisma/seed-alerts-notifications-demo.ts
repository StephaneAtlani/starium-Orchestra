import {
  AlertSeverity,
  AlertStatus,
  AlertType,
  NotificationStatus,
  NotificationType,
  PrismaClient,
} from "@prisma/client";

/**
 * Alertes + notifications in-app (RFC-038) — cohérentes avec budgets OVER,
 * projets en retard et contrats proches / expirés.
 */
export async function ensureDemoAlertsAndNotifications(
  prisma: PrismaClient,
  slug: string,
  clientId: string,
): Promise<void> {
  const users = await prisma.clientUser.findMany({
    where: { clientId, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    take: 3,
    select: { userId: true },
  });
  if (users.length === 0) {
    console.warn(`⚠️  [${slug}] alertes démo : aucun utilisateur — skip.`);
    return;
  }

  type AlertDef = {
    type: AlertType;
    severity: AlertSeverity;
    title: string;
    message: string;
    ruleCode: string;
    entityType: string;
    entityId: string;
    entityLabel: string;
    actionUrl: string;
  };

  const defs: AlertDef[] = [];

  // Ligne OVER (ex. NeoTech LLM) ou plus forte consommation
  const line =
    (await prisma.budgetLine.findFirst({
      where: { clientId, code: { contains: "LLM" } },
      select: { id: true, name: true, code: true },
    })) ??
    (await prisma.budgetLine.findFirst({
      where: { clientId, remainingAmount: { lt: 0 } },
      select: { id: true, name: true, code: true },
    })) ??
    (await prisma.budgetLine.findFirst({
      where: { clientId },
      orderBy: { consumedAmount: "desc" },
      select: { id: true, name: true, code: true },
    }));

  if (line) {
    defs.push({
      type: AlertType.BUDGET,
      severity: AlertSeverity.CRITICAL,
      title: `Dépassement budgétaire — ${line.name}`,
      message: `La ligne ${line.code} présente une consommation au-delà du budget validé.`,
      ruleCode: "budget.line.overrun",
      entityType: "BudgetLine",
      entityId: line.id,
      entityLabel: line.name,
      actionUrl: `/budgets`,
    });
  }

  const overdueProject = await prisma.project.findFirst({
    where: {
      clientId,
      code: { contains: "SEED" },
      status: { in: ["IN_PROGRESS", "ON_HOLD"] },
      targetEndDate: { lt: new Date() },
    },
    select: { id: true, name: true, code: true },
  });
  const project =
    overdueProject ??
    (await prisma.project.findFirst({
      where: { clientId, code: { contains: "SEED-07" } },
      select: { id: true, name: true, code: true },
    })) ??
    (await prisma.project.findFirst({
      where: { clientId, code: { contains: "SEED" } },
      orderBy: { code: "asc" },
      select: { id: true, name: true, code: true },
    }));

  if (project) {
    defs.push({
      type: AlertType.PROJECT,
      severity: AlertSeverity.WARNING,
      title: `Projet en tension — ${project.name}`,
      message: `Le projet ${project.code} nécessite un arbitrage (jalon / échéance).`,
      ruleCode: "project.overdue",
      entityType: "Project",
      entityId: project.id,
      entityLabel: project.name,
      actionUrl: `/projects/${project.id}`,
    });
  }

  const expiring = await prisma.supplierContract.findFirst({
    where: {
      clientId,
      status: { in: ["ACTIVE", "NOTICE"] },
      effectiveEnd: {
        gte: new Date(),
        lte: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      },
    },
    select: { id: true, title: true, reference: true },
  });
  if (expiring) {
    defs.push({
      type: AlertType.GENERIC,
      severity: AlertSeverity.WARNING,
      title: `Contrat bientôt échéance — ${expiring.title}`,
      message: `Le contrat ${expiring.reference} arrive à échéance sous 60 jours.`,
      ruleCode: "contract.expiring",
      entityType: "SupplierContract",
      entityId: expiring.id,
      entityLabel: expiring.title,
      actionUrl: `/contracts`,
    });
  }

  const expired = await prisma.supplierContract.findFirst({
    where: { clientId, status: "EXPIRED" },
    select: { id: true, title: true, reference: true },
  });
  if (expired) {
    defs.push({
      type: AlertType.GENERIC,
      severity: AlertSeverity.CRITICAL,
      title: `Contrat expiré — ${expired.title}`,
      message: `Le contrat ${expired.reference} est expiré : renégociation ou bascule requise.`,
      ruleCode: "contract.expired",
      entityType: "SupplierContract",
      entityId: expired.id,
      entityLabel: expired.title,
      actionUrl: `/contracts`,
    });
  }

  for (const def of defs) {
    // Dedup partiel ACTIVE : (clientId, type, severity, entityType, entityId, ruleCode)
    let alert =
      (await prisma.alert.findFirst({
        where: {
          clientId,
          type: def.type,
          severity: def.severity,
          entityType: def.entityType,
          entityId: def.entityId,
          ruleCode: def.ruleCode,
          status: AlertStatus.ACTIVE,
        },
        select: { id: true },
      })) ??
      (await prisma.alert.findFirst({
        where: {
          clientId,
          type: def.type,
          severity: def.severity,
          entityType: def.entityType,
          entityId: def.entityId,
          ruleCode: def.ruleCode,
        },
        select: { id: true },
      }));

    const payload = {
      title: def.title,
      message: def.message,
      entityLabel: def.entityLabel,
      actionUrl: def.actionUrl,
      status: AlertStatus.ACTIVE,
      resolvedAt: null,
      dismissedAt: null,
      metadata: { seed: true, slug },
    };

    if (alert) {
      await prisma.alert.update({
        where: { id: alert.id },
        data: payload,
      });
    } else {
      alert = await prisma.alert.create({
        data: {
          clientId,
          type: def.type,
          severity: def.severity,
          entityType: def.entityType,
          entityId: def.entityId,
          ruleCode: def.ruleCode,
          ...payload,
        },
        select: { id: true },
      });
    }

    for (const u of users) {
      const existingNotif = await prisma.notification.findFirst({
        where: {
          clientId,
          userId: u.userId,
          alertId: alert.id,
        },
        select: { id: true },
      });
      if (existingNotif) {
        await prisma.notification.update({
          where: { id: existingNotif.id },
          data: {
            title: def.title,
            message: def.message,
            entityType: def.entityType,
            entityId: def.entityId,
            entityLabel: def.entityLabel,
            actionUrl: def.actionUrl,
            alertSeverity: def.severity,
            type: NotificationType.ALERT,
          },
        });
      } else {
        await prisma.notification.create({
          data: {
            clientId,
            userId: u.userId,
            alertId: alert.id,
            type: NotificationType.ALERT,
            title: def.title,
            message: def.message,
            status: NotificationStatus.UNREAD,
            entityType: def.entityType,
            entityId: def.entityId,
            entityLabel: def.entityLabel,
            actionUrl: def.actionUrl,
            alertSeverity: def.severity,
          },
        });
      }
    }
  }
}
