/**
 * Configuration des widgets de la page `/dashboard` — persistée par utilisateur et client actif.
 */

export const DASHBOARD_WIDGETS_VERSION = 5 as const;

/** Périmètre cockpit pour le widget — vide = résolution serveur (exercice / budget actifs). */
export interface DashboardBudgetWidgetScope {
  /** Budget ciblé (l’exercice est déduit côté API). */
  budgetId?: string;
  /** Exercice seul : budget actif de l’exercice (si `budgetId` absent). */
  exerciseId?: string;
}

/** KPIs disponibles pour le widget synthèse budget (aligné cockpit). */
export type DashboardBudgetKpiKey =
  | 'revised'
  | 'committed'
  | 'consumed'
  | 'remaining'
  | 'forecast'
  | 'forecastGap';

export const DASHBOARD_BUDGET_KPI_OPTIONS: {
  id: DashboardBudgetKpiKey;
  label: string;
}[] = [
  { id: 'revised', label: 'Budget' },
  { id: 'committed', label: 'Engagé' },
  { id: 'consumed', label: 'Consommé' },
  { id: 'remaining', label: 'Disponible' },
  { id: 'forecast', label: 'Forecast' },
  { id: 'forecastGap', label: 'Écart forecast' },
];

export const DEFAULT_DASHBOARD_BUDGET_KPIS: DashboardBudgetKpiKey[] = [
  'revised',
  'consumed',
  'remaining',
  'forecast',
];

export interface DashboardBudgetWidgetConfig {
  /** Afficher le bloc sur le dashboard */
  visible: boolean;
  /** KPIs affichés, dans l’ordre souhaité */
  kpis: DashboardBudgetKpiKey[];
  /** Budget / exercice affichés — absent = défaut serveur */
  scope?: DashboardBudgetWidgetScope;
  /** Animer les montants (compteur). Défaut : true. */
  animateKpiNumbers?: boolean;
}

/** KPIs portefeuille projets (alignés sur `ProjectsPortfolioSummary`). */
export type DashboardProjectKpiKey =
  | 'totalProjects'
  | 'inProgressProjects'
  | 'completedProjects'
  | 'lateProjects'
  | 'criticalProjects'
  | 'blockedProjects'
  | 'noRiskProjects'
  | 'noOwnerProjects'
  | 'noMilestoneProjects';

export const DASHBOARD_PROJECT_KPI_OPTIONS: {
  id: DashboardProjectKpiKey;
  label: string;
  /** Infobulle si le libellé est raccourci */
  title?: string;
}[] = [
  { id: 'totalProjects', label: 'Projets' },
  { id: 'inProgressProjects', label: 'En cours' },
  { id: 'completedProjects', label: 'Terminés' },
  { id: 'lateProjects', label: 'En retard' },
  { id: 'criticalProjects', label: 'Critiques' },
  { id: 'blockedProjects', label: 'Bloqués' },
  {
    id: 'noRiskProjects',
    label: 'Sans étude de risque',
    title: 'Aucune étude de risque enregistrée',
  },
  { id: 'noOwnerProjects', label: 'Sans responsable', title: 'Sans responsable' },
  { id: 'noMilestoneProjects', label: 'Sans jalons' },
];

export const DEFAULT_DASHBOARD_PROJECT_KPIS: DashboardProjectKpiKey[] = [
  'totalProjects',
  'inProgressProjects',
  'completedProjects',
  'lateProjects',
];

export interface DashboardProjectWidgetConfig {
  visible: boolean;
  kpis: DashboardProjectKpiKey[];
}

/** KPIs alignés sur `GET /api/suppliers/dashboard` (client actif). */
export type DashboardSupplierKpiKey =
  | 'suppliersListed'
  | 'suppliersArchived'
  | 'purchaseOrdersCount'
  | 'invoicesCount'
  | 'contactsActiveCount';

export const DASHBOARD_SUPPLIER_KPI_OPTIONS: {
  id: DashboardSupplierKpiKey;
  label: string;
}[] = [
  { id: 'suppliersListed', label: 'Fournisseurs catalogue' },
  { id: 'suppliersArchived', label: 'Archivés' },
  { id: 'purchaseOrdersCount', label: 'Bons de commande' },
  { id: 'invoicesCount', label: 'Factures' },
  { id: 'contactsActiveCount', label: 'Contacts actifs' },
];

export const DEFAULT_DASHBOARD_SUPPLIER_KPIS: DashboardSupplierKpiKey[] = [
  'suppliersListed',
  'purchaseOrdersCount',
  'invoicesCount',
];

export interface DashboardSupplierWidgetConfig {
  visible: boolean;
  kpis: DashboardSupplierKpiKey[];
}

export interface DashboardWidgetsConfig {
  version: typeof DASHBOARD_WIDGETS_VERSION;
  budgetKpis: DashboardBudgetWidgetConfig;
  projectKpis: DashboardProjectWidgetConfig;
  supplierKpis: DashboardSupplierWidgetConfig;
}

export function defaultDashboardWidgetsConfig(): DashboardWidgetsConfig {
  return {
    version: DASHBOARD_WIDGETS_VERSION,
    budgetKpis: {
      visible: true,
      kpis: [...DEFAULT_DASHBOARD_BUDGET_KPIS],
      scope: undefined,
      animateKpiNumbers: true,
    },
    projectKpis: {
      visible: true,
      kpis: [...DEFAULT_DASHBOARD_PROJECT_KPIS],
    },
    supplierKpis: {
      visible: true,
      kpis: [...DEFAULT_DASHBOARD_SUPPLIER_KPIS],
    },
  };
}

function mergeScope(
  raw: unknown,
): DashboardBudgetWidgetScope | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const s = raw as Record<string, unknown>;
  const budgetId =
    typeof s.budgetId === 'string' && s.budgetId.trim() ? s.budgetId.trim() : undefined;
  const exerciseId =
    typeof s.exerciseId === 'string' && s.exerciseId.trim()
      ? s.exerciseId.trim()
      : undefined;
  if (!budgetId && !exerciseId) return undefined;
  return { ...(budgetId ? { budgetId } : {}), ...(exerciseId ? { exerciseId } : {}) };
}

/** Valeur du Select « périmètre » dans le dialogue de personnalisation. */
export const DASHBOARD_BUDGET_SCOPE_AUTO = '__auto__' as const;
export const exerciseScopePrefix = '__exercise:' as const;

export function scopeToSelectValue(
  scope: DashboardBudgetWidgetScope | undefined,
): string {
  if (!scope) return DASHBOARD_BUDGET_SCOPE_AUTO;
  if (scope.budgetId) return scope.budgetId;
  if (scope.exerciseId) return `${exerciseScopePrefix}${scope.exerciseId}`;
  return DASHBOARD_BUDGET_SCOPE_AUTO;
}

export function selectValueToScope(
  value: string,
): DashboardBudgetWidgetScope | undefined {
  if (value === DASHBOARD_BUDGET_SCOPE_AUTO) return undefined;
  if (value.startsWith(exerciseScopePrefix)) {
    return { exerciseId: value.slice(exerciseScopePrefix.length) };
  }
  return { budgetId: value };
}

/** Total des compteurs d’alertes ligne (cockpit). */
export function totalBudgetAlerts(a: {
  negativeRemaining: number;
  overCommitted: number;
  overConsumed: number;
  forecastOverBudget: number;
}): number {
  return (
    a.negativeRemaining +
    a.overCommitted +
    a.overConsumed +
    a.forecastOverBudget
  );
}

export function mergeDashboardWidgetsConfig(
  raw: unknown,
): DashboardWidgetsConfig {
  const base = defaultDashboardWidgetsConfig();
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Record<string, unknown>;
  const v = o.version;
  if (v !== 1 && v !== 2 && v !== 3 && v !== 4 && v !== 5) return base;
  const bk = o.budgetKpis as Record<string, unknown> | undefined;
  if (!bk || typeof bk !== 'object') return base;

  const visible = bk.visible === false ? false : true;
  let kpis: DashboardBudgetKpiKey[] = [...DEFAULT_DASHBOARD_BUDGET_KPIS];
  if (Array.isArray(bk.kpis) && bk.kpis.length > 0) {
    const allowed = new Set(DASHBOARD_BUDGET_KPI_OPTIONS.map((x) => x.id));
    const filtered = bk.kpis.filter(
      (k): k is DashboardBudgetKpiKey =>
        typeof k === 'string' && allowed.has(k as DashboardBudgetKpiKey),
    );
    if (filtered.length > 0) kpis = filtered;
  }

  const scope = mergeScope(bk.scope);

  const animateKpiNumbers =
    typeof bk.animateKpiNumbers === 'boolean' ? bk.animateKpiNumbers : true;

  let projectKpis = base.projectKpis;
  const pk = o.projectKpis as Record<string, unknown> | undefined;
  if (pk && typeof pk === 'object') {
    const pv = pk.visible === false ? false : true;
    let pkp: DashboardProjectKpiKey[] = [...DEFAULT_DASHBOARD_PROJECT_KPIS];
    if (Array.isArray(pk.kpis) && pk.kpis.length > 0) {
      const allowedP = new Set(DASHBOARD_PROJECT_KPI_OPTIONS.map((x) => x.id));
      const filteredP = pk.kpis.filter(
        (k): k is DashboardProjectKpiKey =>
          typeof k === 'string' && allowedP.has(k as DashboardProjectKpiKey),
      );
      if (filteredP.length > 0) pkp = filteredP;
    }
    projectKpis = { visible: pv, kpis: pkp };
  }

  let supplierKpis = base.supplierKpis;
  const sk = o.supplierKpis as Record<string, unknown> | undefined;
  if (sk && typeof sk === 'object') {
    const sv = sk.visible === false ? false : true;
    let skp: DashboardSupplierKpiKey[] = [...DEFAULT_DASHBOARD_SUPPLIER_KPIS];
    if (Array.isArray(sk.kpis) && sk.kpis.length > 0) {
      const allowedS = new Set(DASHBOARD_SUPPLIER_KPI_OPTIONS.map((x) => x.id));
      const filteredS = sk.kpis.filter(
        (k): k is DashboardSupplierKpiKey =>
          typeof k === 'string' && allowedS.has(k as DashboardSupplierKpiKey),
      );
      if (filteredS.length > 0) skp = filteredS;
    }
    supplierKpis = { visible: sv, kpis: skp };
  }

  return {
    version: DASHBOARD_WIDGETS_VERSION,
    budgetKpis: { visible, kpis, scope, animateKpiNumbers },
    projectKpis,
    supplierKpis,
  };
}
