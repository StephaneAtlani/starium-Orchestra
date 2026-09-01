/**
 * Graphe fonctionnel Starium Orchestra — versionné dans git.
 * Référence des ponts : docs/LIAISONS-MODULES.md
 * Cursor rend ce fichier s'il est aussi copié dans le dossier canvases de l'IDE
 * (voir docs/liaisons/README.md). Import cursor/canvas : hors build Next/Nest.
 */
import {
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  Code,
  Divider,
  Grid,
  H1,
  H2,
  H3,
  Pill,
  Row,
  Stack,
  Stat,
  Swatch,
  Table,
  Text,
  useCanvasAction,
  useCanvasState,
  useHostTheme,
} from "cursor/canvas";
import type { Color } from "cursor/canvas";

type LayerId = "cockpit" | "gouvernance" | "domaines" | "noyaux";
type FlowId = "all" | "argent" | "projet" | "gouvernance" | "org" | "capa" | "futur" | "atlas";
type AtlasKind = "org" | "functional" | "technical";
type Pattern = "jonction" | "fk" | "polymorphe" | "overlay" | "noyau";
type LinkStatus = "live" | "partial" | "gap" | "future";
type Horizon = "now" | "next" | "later" | "distant";

type NodeDef = {
  id: string;
  label: string;
  layer: LayerId;
  x: number;
  y: number;
  w: number;
  h: number;
  future?: boolean;
};

type LinkDef = {
  id: string;
  from: string;
  to: string;
  label: string;
  table: string;
  pattern: Pattern;
  status: LinkStatus;
  horizon: Horizon;
  rfc: string;
  flows: Exclude<FlowId, "all">[];
  note: string;
};

const VIEW_W = 1560;
const VIEW_H = 780;
const LAYER_X = 112;
const LAYER_W = 1424;

const LAYERS: { id: LayerId; label: string; y: number; h: number; color: Color }[] = [
  { id: "cockpit", label: "Cockpit", y: 16, h: 88, color: "gray" },
  { id: "gouvernance", label: "Gouvernance", y: 124, h: 88, color: "purple" },
  { id: "domaines", label: "Domaines", y: 232, h: 360, color: "blue" },
  { id: "noyaux", label: "Noyaux", y: 616, h: 88, color: "green" },
];

const NODES: NodeDef[] = [
  { id: "dashboard", label: "Dashboard", layer: "cockpit", x: 136, y: 32, w: 188, h: 56 },
  { id: "alerts", label: "Alertes / Notifs", layer: "cockpit", x: 384, y: 32, w: 212, h: 56 },
  { id: "meetings", label: "Réunions", layer: "cockpit", x: 656, y: 32, w: 188, h: 56 },
  { id: "search", label: "Recherche", layer: "cockpit", x: 916, y: 32, w: 188, h: 56 },
  { id: "atlas", label: "Atlas", layer: "cockpit", x: 1176, y: 32, w: 220, h: 56, future: true },

  { id: "vision", label: "Vision", layer: "gouvernance", x: 168, y: 142, w: 220, h: 56 },
  { id: "cycles", label: "Cycles", layer: "gouvernance", x: 500, y: 142, w: 220, h: 56 },
  { id: "intake", label: "Demandes", layer: "gouvernance", x: 832, y: 142, w: 220, h: 56 },
  { id: "compliance", label: "Conformité", layer: "gouvernance", x: 1164, y: 142, w: 220, h: 56 },

  { id: "budgets", label: "Budgets", layer: "domaines", x: 168, y: 252, w: 220, h: 56 },
  { id: "projects", label: "Projets", layer: "domaines", x: 500, y: 252, w: 220, h: 56 },
  { id: "procurement", label: "Achats", layer: "domaines", x: 832, y: 252, w: 220, h: 56 },
  { id: "contracts", label: "Contrats", layer: "domaines", x: 1164, y: 252, w: 220, h: 56 },
  { id: "teams", label: "Équipes", layer: "domaines", x: 168, y: 364, w: 220, h: 56 },
  { id: "capacity", label: "Capacité", layer: "domaines", x: 500, y: 364, w: 220, h: 56 },
  { id: "action-plans", label: "Plans d'action", layer: "domaines", x: 832, y: 364, w: 220, h: 56 },
  { id: "risks", label: "Risques", layer: "domaines", x: 1164, y: 364, w: 220, h: 56 },
  { id: "licenses", label: "Licences SI", layer: "domaines", x: 332, y: 476, w: 220, h: 56, future: true },
  { id: "cmdb", label: "CMDB / SI", layer: "domaines", x: 664, y: 476, w: 220, h: 56, future: true },
  { id: "ged", label: "GED transverse", layer: "domaines", x: 996, y: 476, w: 220, h: 56, future: true },

  { id: "financial", label: "Financial Core", layer: "noyaux", x: 136, y: 632, w: 200, h: 56 },
  { id: "resource", label: "RH / Collaborateurs", layer: "noyaux", x: 372, y: 632, w: 228, h: 56 },
  { id: "org", label: "Organisation", layer: "noyaux", x: 644, y: 632, w: 200, h: 56 },
  { id: "acl", label: "ACL / Audit", layer: "noyaux", x: 904, y: 632, w: 188, h: 56 },
  { id: "microsoft", label: "Microsoft 365", layer: "noyaux", x: 1152, y: 632, w: 220, h: 56 },
];

const NODE_BY_ID = Object.fromEntries(NODES.map((n) => [n.id, n])) as Record<string, NodeDef>;

function alertLink(
  to: string,
  entity: string,
  status: LinkStatus,
  flows: Exclude<FlowId, "all">[],
  note: string,
  horizon: Horizon = "now",
): LinkDef {
  return {
    id: `alert-${to}`,
    from: "alerts",
    to,
    label: "Alerte / notification",
    table: `Alert.entityType · Notification.entityType (${entity})`,
    pattern: "polymorphe",
    status,
    horizon,
    rfc: "RFC-038",
    flows,
    note,
  };
}

const ALERT_LINKS: LinkDef[] = [
  alertLink("dashboard", "panel /dashboard", "live", ["gouvernance"], "Cloche + panel critiques. Bell = /api/notifications, pas la liste Alert."),
  alertLink("meetings", "project_review", "live", ["gouvernance", "projet"], "Invitations revue → Notification (alertId optionnel)."),
  alertLink("search", "—", "partial", ["gouvernance"], "Pas de trigger.search. Socle entityType prêt."),
  alertLink("atlas", "—", "future", ["gouvernance", "futur", "atlas"], "Atlas n'émet pas encore. Overlay prévu comme Meetings."),
  alertLink("vision", "strategic_direction_strategy", "live", ["gouvernance"], "AlertType.STRATEGIC_VISION + notif stratégie direction."),
  alertLink("cycles", "governance_cycle", "partial", ["gouvernance"], "capacityScore / décision cycle : pas de règle Alert dédiée."),
  alertLink("intake", "project_request", "live", ["gouvernance", "projet"], "Notification workflow demande (soumission / décision)."),
  alertLink("compliance", "compliance_requirement", "partial", ["gouvernance"], "Socle prêt. Pas de trigger exigence / preuve."),
  alertLink("budgets", "budget_line", "live", ["argent", "gouvernance"], "Triggers overrun + near_limit. POST /api/alerts/evaluate."),
  alertLink("projects", "project · project_milestone", "live", ["projet", "gouvernance"], "Triggers overdue + jalon. Evaluate cron."),
  alertLink("procurement", "purchase_order · invoice", "partial", ["argent", "gouvernance"], "PO/facture bougent l'argent ; pas de règle Alert dédiée."),
  alertLink("contracts", "supplier_contract", "live", ["argent", "gouvernance"], "Triggers expiring / expired (AlertType.SYSTEM)."),
  alertLink("teams", "work_team · resource_time_entry", "partial", ["capa", "org", "gouvernance"], "Socle prêt. Pas de surcharge équipe en alerte."),
  alertLink("capacity", "capacity_allocation", "partial", ["capa", "gouvernance"], "Socle prêt. Pas de trigger surcharge J/H."),
  alertLink("action-plans", "action_plan", "partial", ["projet", "gouvernance"], "Socle prêt. Pas de trigger plan en retard."),
  alertLink("risks", "project_risk", "live", ["projet", "gouvernance"], "Trigger risque (AlertType.PROJECT)."),
  alertLink("licenses", "license_expiration_job", "partial", ["argent", "futur"], "Job expire ClientSubscription / sièges — pas le module Licences SI RFC-037."),
  alertLink("cmdb", "application · asset", "future", ["futur"], "Enum financier APPLICATION|ASSET. Pas de CMDB donc pas d'alerte."),
  alertLink("ged", "document", "future", ["futur"], "Silos docs. Pas de notif GED transverse."),
  alertLink("financial", "financial_event", "partial", ["argent", "gouvernance"], "Events recalculent la ligne ; l'alerte budget part de BudgetLine, pas de l'event."),
  alertLink("resource", "resource", "partial", ["org", "gouvernance"], "Pas de trigger collab / contrat HUMAN. Fan-out notif = userId, pas resourceId."),
  alertLink("org", "org_unit", "partial", ["org", "gouvernance"], "Pas de trigger ownership / steward."),
  alertLink("acl", "resource_acl", "partial", ["org", "gouvernance"], "AuditLog ≠ Alert. Pas de notif ACL."),
  alertLink("microsoft", "project_microsoft_link", "partial", ["projet", "gouvernance"], "Sync Graph. Pas d'alerte provisioning."),
];

const LINKS: LinkDef[] = [
  {
    id: "intake-project",
    from: "intake",
    to: "projects",
    label: "Conversion demande → projet DRAFT",
    table: "ProjectRequest.convertedProjectId",
    pattern: "fk",
    status: "live",
    horizon: "now",
    rfc: "RFC-PROJ-INTAKE-001",
    flows: ["projet", "gouvernance"],
    note: "Workflow submit / decision / route. Routage cycle si PILOTING_CYCLE.",
  },
  {
    id: "vision-project",
    from: "vision",
    to: "projects",
    label: "Objectif ↔ projet",
    table: "StrategicLink (PROJECT)",
    pattern: "polymorphe",
    status: "live",
    horizon: "now",
    rfc: "RFC-STRAT-001",
    flows: ["gouvernance", "projet"],
    note: "targetId + targetLabelSnapshot. Jamais l'UUID en UI.",
  },
  {
    id: "vision-budget",
    from: "vision",
    to: "budgets",
    label: "Objectif ↔ budget / ligne",
    table: "StrategicLink (BUDGET | BUDGET_LINE)",
    pattern: "polymorphe",
    status: "live",
    horizon: "now",
    rfc: "RFC-STRAT-001",
    flows: ["gouvernance", "argent"],
    note: "Alignement CODIR, score optionnel.",
  },
  {
    id: "vision-cycle",
    from: "vision",
    to: "cycles",
    label: "Objectif ↔ cycle",
    table: "StrategicLink (GOVERNANCE_CYCLE)",
    pattern: "polymorphe",
    status: "live",
    horizon: "now",
    rfc: "RFC-STRAT-001",
    flows: ["gouvernance"],
    note: "Candidature portefeuille depuis la stratégie.",
  },
  {
    id: "vision-risk",
    from: "vision",
    to: "risks",
    label: "Objectif ↔ risque",
    table: "StrategicLink (RISK)",
    pattern: "polymorphe",
    status: "live",
    horizon: "now",
    rfc: "RFC-STRAT-001",
    flows: ["gouvernance"],
    note: "Lien stratégique, pas une copie du registre risques.",
  },
  {
    id: "cycle-project",
    from: "cycles",
    to: "projects",
    label: "Item de cycle → projet",
    table: "GovernanceCycleItem.projectId",
    pattern: "fk",
    status: "live",
    horizon: "now",
    rfc: "RFC-PROJ-CYCLE-001",
    flows: ["gouvernance", "projet"],
    note: "Unicité (cycleId, projectId). Scoring priorityScore.",
  },
  {
    id: "cycle-budget",
    from: "cycles",
    to: "budgets",
    label: "Item / décision → budget",
    table: "GovernanceCycleItem + BudgetGovernanceDecision",
    pattern: "jonction",
    status: "live",
    horizon: "now",
    rfc: "RFC-PROJ-CYCLE-001",
    flows: ["gouvernance", "argent"],
    note: "Arbitrage figé à la clôture d'instance.",
  },
  {
    id: "cycle-risk",
    from: "cycles",
    to: "risks",
    label: "Item de cycle → risque",
    table: "GovernanceCycleItem.riskId",
    pattern: "fk",
    status: "live",
    horizon: "now",
    rfc: "RFC-PROJ-CYCLE-001",
    flows: ["gouvernance"],
    note: "sourceType=RISK. Risque peut être hors projet.",
  },
  {
    id: "cycle-objective",
    from: "cycles",
    to: "vision",
    label: "Item de cycle → objectif",
    table: "GovernanceCycleItem.strategicObjectiveId",
    pattern: "fk",
    status: "live",
    horizon: "now",
    rfc: "RFC-PROJ-CYCLE-001",
    flows: ["gouvernance"],
    note: "Candidature portefeuille. Distinct du StrategicLink GOVERNANCE_CYCLE.",
  },
  {
    id: "meet-project",
    from: "meetings",
    to: "projects",
    label: "Réunion inscrite au projet",
    table: "MeetingProject (+ ProjectReview)",
    pattern: "overlay",
    status: "live",
    horizon: "now",
    rfc: "RFC-MEET-001",
    flows: ["gouvernance", "projet"],
    note: "Snapshot à la clôture. Trace projet = ProjectReview.",
  },
  {
    id: "meet-cycle",
    from: "meetings",
    to: "cycles",
    label: "Réunion ↔ instance de cycle",
    table: "Meeting.governanceCycleInstanceId",
    pattern: "overlay",
    status: "live",
    horizon: "now",
    rfc: "RFC-MEET-001",
    flows: ["gouvernance"],
    note: "Trace portefeuille = GovernanceCycleInstance.",
  },
  {
    id: "meet-risk",
    from: "meetings",
    to: "risks",
    label: "Point bloquant promu depuis un risque",
    table: "MeetingBlocker.riskId",
    pattern: "overlay",
    status: "live",
    horizon: "now",
    rfc: "RFC-MEET-001",
    flows: ["gouvernance"],
    note: "Lecture, pas de duplication du registre.",
  },
  {
    id: "meet-attendee",
    from: "meetings",
    to: "resource",
    label: "Convoqués = Resource HUMAN",
    table: "MeetingAttendee.resourceId",
    pattern: "fk",
    status: "live",
    horizon: "now",
    rfc: "RFC-MEET-001",
    flows: ["gouvernance", "org"],
    note: "Aussi userId / invité externe. DCP email externe jamais en UI ni logs.",
  },
  {
    id: "compliance-risk",
    from: "compliance",
    to: "risks",
    label: "Risque rattaché à une exigence",
    table: "ProjectRisk.complianceRequirementId",
    pattern: "fk",
    status: "live",
    horizon: "now",
    rfc: "RFC-PROJ-RISK-001",
    flows: ["gouvernance", "projet"],
    note: "Preuves ComplianceEvidence encore hors lien projet/document.",
  },
  {
    id: "project-budget",
    from: "projects",
    to: "budgets",
    label: "Projet ↔ ligne budgétaire",
    table: "ProjectBudgetLink",
    pattern: "jonction",
    status: "live",
    horizon: "now",
    rfc: "RFC-PROJ-010",
    flows: ["argent", "projet"],
    note: "FULL / PERCENTAGE / BUDGET_PERCENTAGE / FIXED. Aucun FinancialEvent.",
  },
  {
    id: "scenario-budget",
    from: "projects",
    to: "budgets",
    label: "Scénario financier → lien budget",
    table: "ProjectScenarioFinancialLine",
    pattern: "fk",
    status: "live",
    horizon: "now",
    rfc: "RFC-PROJ-SC-002",
    flows: ["projet", "argent"],
    note: "What-if. Ne mute pas le budget réel tant que non retenu.",
  },
  {
    id: "scenario-resource",
    from: "projects",
    to: "resource",
    label: "Scénario staffing → Resource",
    table: "ProjectScenarioResourcePlan",
    pattern: "fk",
    status: "live",
    horizon: "now",
    rfc: "RFC-PROJ-SC-003",
    flows: ["projet", "capa", "org"],
    note: "Plan de charge scénarisé, distinct du timesheet réel.",
  },
  {
    id: "scenario-capa",
    from: "projects",
    to: "capacity",
    label: "Snapshot capa d'un scénario",
    table: "ProjectScenarioCapacitySnapshot",
    pattern: "fk",
    status: "live",
    horizon: "now",
    rfc: "RFC-PROJ-SC-005",
    flows: ["projet", "capa"],
    note: "Photo planned vs available, pas une CapacityAllocation.",
  },
  {
    id: "po-line",
    from: "procurement",
    to: "budgets",
    label: "Commande / facture → ligne",
    table: "PurchaseOrder.budgetLineId · Invoice.budgetLineId",
    pattern: "fk",
    status: "live",
    horizon: "now",
    rfc: "RFC-025 / RFC-034",
    flows: ["argent"],
    note: "Le vrai mouvement d'argent. Facture dénoue l'engagement PO.",
  },
  {
    id: "po-event",
    from: "procurement",
    to: "financial",
    label: "PO → engagement, facture → conso",
    table: "FinancialEvent (PURCHASE_ORDER | INVOICE)",
    pattern: "polymorphe",
    status: "live",
    horizon: "now",
    rfc: "ARCHITECTURE §4.2",
    flows: ["argent"],
    note: "COMMITMENT_REGISTERED / CONSUMPTION_REGISTERED + recalcul BudgetLine.",
  },
  {
    id: "budget-event",
    from: "budgets",
    to: "financial",
    label: "Allocations, réallocations, landing",
    table: "FinancialAllocation · BudgetReallocation · landingAmount",
    pattern: "noyau",
    status: "live",
    horizon: "now",
    rfc: "RFC-017 / RFC-BUD-040",
    flows: ["argent"],
    note: "BudgetLine recalculée depuis les events, jamais l'inverse.",
  },
  {
    id: "budget-axes",
    from: "budgets",
    to: "org",
    label: "Axes analytiques / centres de coût",
    table: "BudgetLineCostCenterSplit · AnalyticalLedgerAccount",
    pattern: "jonction",
    status: "live",
    horizon: "now",
    rfc: "RFC-021",
    flows: ["argent", "org"],
    note: "Splits % sur la ligne. Pas encore d'axe sur PO/facture.",
  },
  {
    id: "contract-supplier",
    from: "contracts",
    to: "procurement",
    label: "Contrat ↔ fournisseur",
    table: "SupplierContract.supplierId",
    pattern: "fk",
    status: "live",
    horizon: "now",
    rfc: "RFC-036",
    flows: ["argent"],
    note: "Registre contractuel. Pas de projectId ni budgetLineId.",
  },
  {
    id: "project-risk",
    from: "projects",
    to: "risks",
    label: "Risque de projet (ou hors projet)",
    table: "ProjectRisk.projectId?",
    pattern: "fk",
    status: "live",
    horizon: "now",
    rfc: "RFC-PROJ-RISK-001",
    flows: ["projet", "gouvernance"],
    note: "projectId nullable. consumesCapacity possible.",
  },
  {
    id: "project-capa",
    from: "projects",
    to: "capacity",
    label: "Projet consomme de la capacité",
    table: "CapacityAllocation (PROJECT)",
    pattern: "polymorphe",
    status: "live",
    horizon: "now",
    rfc: "RFC-CAPA-001",
    flows: ["capa", "projet"],
    note: "Project.consumesCapacity. Allocations J/H sur WorkTeam et/ou Resource HUMAN.",
  },
  {
    id: "risk-capa",
    from: "risks",
    to: "capacity",
    label: "Risque consomme de la capacité",
    table: "CapacityAllocation (PROJECT_RISK)",
    pattern: "polymorphe",
    status: "live",
    horizon: "now",
    rfc: "RFC-CAPA-001",
    flows: ["capa", "gouvernance"],
    note: "ProjectRisk.consumesCapacity. Risque peut être hors projet.",
  },
  {
    id: "task-assignee",
    from: "projects",
    to: "resource",
    label: "Tâche assignée / responsable HUMAN",
    table: "ProjectTaskAssignee.resourceId · ProjectTask.responsibleResourceId",
    pattern: "fk",
    status: "live",
    horizon: "now",
    rfc: "RFC-PROJ-011",
    flows: ["projet", "org", "capa"],
    note: "Exécution (N assignés) + responsable. Distinct du timesheet et des allocations capa.",
  },
  {
    id: "time-project",
    from: "teams",
    to: "projects",
    label: "Temps réalisé sur projet",
    table: "ResourceTimeEntry.projectId",
    pattern: "fk",
    status: "live",
    horizon: "now",
    rfc: "RFC-TEAM-009",
    flows: ["capa", "projet", "org"],
    note: "Timesheet. Ne crée pas de FinancialEvent.",
  },
  {
    id: "team-resource",
    from: "teams",
    to: "resource",
    label: "Membres = Resource HUMAN",
    table: "WorkTeamMembership.resourceId",
    pattern: "fk",
    status: "live",
    horizon: "now",
    rfc: "RFC-TEAM-020",
    flows: ["org", "capa"],
    note: "Memberships/capa = Resource HUMAN. Collaborator + CollaboratorSkill existent encore (TEAM-002/004). UI membres = /client/members.",
  },
  {
    id: "capa-resource",
    from: "capacity",
    to: "resource",
    label: "Capa d'un collaborateur (J/H)",
    table: "CapacityAllocation.resourceId · ResourceCapacityException",
    pattern: "fk",
    status: "live",
    horizon: "now",
    rfc: "RFC-CAPA-001",
    flows: ["capa", "org"],
    note: "Personnes = Resource HUMAN. Calendrier client + exceptions mois. SIRH (CapacitySource.SIRH) pas encore branché.",
  },
  {
    id: "capa-team",
    from: "capacity",
    to: "teams",
    label: "Centre de capacité = équipe",
    table: "CapacityAllocation.workTeamId · Resource.primaryCapacityWorkTeamId",
    pattern: "fk",
    status: "live",
    horizon: "now",
    rfc: "RFC-CAPA-001",
    flows: ["capa", "org"],
    note: "WorkTeam = centre. 1 équipe primaire par collab. Dashboards charge équipe + memberships HUMAN.",
  },
  {
    id: "team-vision",
    from: "teams",
    to: "vision",
    label: "Équipe rattachée à une direction",
    table: "WorkTeam.strategicDirectionId",
    pattern: "fk",
    status: "live",
    horizon: "now",
    rfc: "RFC-TEAM-005",
    flows: ["org", "gouvernance"],
    note: "Direction Vision, pas une OrgUnit. Champ Prisma live ; résumé API strategicDirectionName.",
  },
  {
    id: "plan-project",
    from: "action-plans",
    to: "projects",
    label: "Tâche de plan rattachée au projet",
    table: "ProjectTask.projectId + actionPlanId",
    pattern: "fk",
    status: "live",
    horizon: "now",
    rfc: "RFC-PROJ-011 / RFC-PLA-001",
    flows: ["projet"],
    note: "projectId optionnel : tâche hors projet possible.",
  },
  {
    id: "plan-capa",
    from: "action-plans",
    to: "capacity",
    label: "Plan consomme de la capacité",
    table: "CapacityAllocation (ACTION_PLAN)",
    pattern: "polymorphe",
    status: "live",
    horizon: "now",
    rfc: "RFC-CAPA-001",
    flows: ["capa"],
    note: "ActionPlan.consumesCapacity.",
  },
  {
    id: "task-line",
    from: "projects",
    to: "budgets",
    label: "Tâche / activité → ligne",
    table: "ProjectTask.budgetLineId · ProjectActivity.budgetLineId",
    pattern: "fk",
    status: "partial",
    horizon: "next",
    rfc: "RFC-PROJ-011",
    flows: ["projet", "argent", "futur"],
    note: "FK existe. Pas de FinancialEvent auto (suite financière PROJ-010 §6).",
  },
  {
    id: "ms-project",
    from: "microsoft",
    to: "projects",
    label: "Lien Teams / Planner / Drive",
    table: "ProjectMicrosoftLink + syncs",
    pattern: "overlay",
    status: "live",
    horizon: "now",
    rfc: "RFC-PROJ-INT-007→010",
    flows: ["projet"],
    note: "Tâches→Planner et docs→Drive live. Lot 5 provisioning modulaire encore ouvert.",
  },
  {
    id: "owner-org",
    from: "org",
    to: "projects",
    label: "Direction propriétaire + steward",
    table: "ownerOrgUnitId · stewardResourceId",
    pattern: "overlay",
    status: "live",
    horizon: "now",
    rfc: "RFC-ORG-003 / RFC-ORG-004",
    flows: ["org"],
    note: "Même overlay Budget, BudgetLine, Supplier, Contract, Objective.",
  },
  ...ALERT_LINKS,
  {
    id: "search-poly",
    from: "search",
    to: "projects",
    label: "Recherche full-text scopée client",
    table: "searchText dénormalisé (Project, …)",
    pattern: "overlay",
    status: "live",
    horizon: "now",
    rfc: "RFC-CORE-SEARCH-001",
    flows: ["projet", "argent", "gouvernance"],
    note: "Index par entité, pas un graphe de liaisons. Overlay lecture.",
  },
  {
    id: "acl-all",
    from: "acl",
    to: "projects",
    label: "ACL ressource + audit mutations",
    table: "ResourceAcl · AuditLog",
    pattern: "noyau",
    status: "live",
    horizon: "now",
    rfc: "RFC-ACL-013 / RFC-013-1",
    flows: ["projet", "argent", "gouvernance", "org"],
    note: "Guard pipeline. clientId jamais du payload.",
  },
  {
    id: "ui-line-projects",
    from: "budgets",
    to: "projects",
    label: "Liste des projets sur une BudgetLine",
    table: "ProjectBudgetLink (vue inverse)",
    pattern: "jonction",
    status: "gap",
    horizon: "next",
    rfc: "RFC-PROJ-010 §8.2",
    flows: ["argent", "projet", "futur"],
    note: "Table live, écran ligne budget pas encore. KPI cockpit projet §8.3 aussi ouvert.",
  },
  {
    id: "gap-project-event",
    from: "projects",
    to: "financial",
    label: "Tâche / jalon / coût projet → event",
    table: "FinancialSourceType.PROJECT (enum seul)",
    pattern: "polymorphe",
    status: "gap",
    horizon: "next",
    rfc: "RFC-PROJ-010 §6 · suite PROJ-011",
    flows: ["argent", "projet", "futur"],
    note: "Convention sourceType=PROJECT, sourceId=projectId. Types PROJECT_COST_*.",
  },
  {
    id: "gap-time-event",
    from: "teams",
    to: "financial",
    label: "Timesheet valorisé → budget",
    table: "Resource.dailyRate × ResourceTimeEntry",
    pattern: "polymorphe",
    status: "future",
    horizon: "next",
    rfc: "RFC-RES-002 (à écrire)",
    flows: ["argent", "capa", "futur"],
    note: "TEAM_ASSIGNMENT retiré (TEAM-007). Costing humain = prochain pont argent.",
  },
  {
    id: "gap-res-assign",
    from: "resource",
    to: "projects",
    label: "Affectation / costing ressource projet",
    table: "FinancialSourceType.TEAM_ASSIGNMENT",
    pattern: "jonction",
    status: "future",
    horizon: "next",
    rfc: "RFC-RES-002",
    flows: ["projet", "org", "futur"],
    note: "Staffing planifié TEAM-007/008 retiré. Catalogue HUMAN/MATERIAL/LICENSE existe.",
  },
  {
    id: "gap-contract-budget",
    from: "contracts",
    to: "budgets",
    label: "Contrat → ligne budgétaire",
    table: "FinancialSourceType.CONTRACT (enum seul)",
    pattern: "jonction",
    status: "gap",
    horizon: "next",
    rfc: "RFC-037 (voisin)",
    flows: ["argent", "futur"],
    note: "Enum prêt. Licence SI portera aussi budgetLineId.",
  },
  {
    id: "gap-contract-project",
    from: "contracts",
    to: "projects",
    label: "Contrat → projet",
    table: "—",
    pattern: "jonction",
    status: "gap",
    horizon: "next",
    rfc: "RFC-037 License.projectId",
    flows: ["projet", "argent", "futur"],
    note: "SupplierContract n'a pas de projectId. Pont prévu via Licence SI.",
  },
  {
    id: "fut-license-contract",
    from: "licenses",
    to: "contracts",
    label: "Licence SI 0..1 contrat",
    table: "License.contractId?",
    pattern: "fk",
    status: "future",
    horizon: "next",
    rfc: "RFC-037 (draft)",
    flows: ["argent", "futur"],
    note: "Contract 1→N Licenses. Module autonome Pilotage, pas ClientSubscription.",
  },
  {
    id: "fut-license-budget",
    from: "licenses",
    to: "budgets",
    label: "Licence SI → ligne",
    table: "License.budgetLineId? + sourceType LICENSE",
    pattern: "fk",
    status: "future",
    horizon: "next",
    rfc: "RFC-037",
    flows: ["argent", "futur"],
    note: "Échéance licence ≠ échéance contrat.",
  },
  {
    id: "fut-license-project",
    from: "licenses",
    to: "projects",
    label: "Licence SI → projet",
    table: "License.projectId?",
    pattern: "fk",
    status: "future",
    horizon: "next",
    rfc: "RFC-037",
    flows: ["projet", "futur"],
    note: "Aussi supplierId? et applicationId? sur la même entité.",
  },
  {
    id: "fut-license-cmdb",
    from: "licenses",
    to: "cmdb",
    label: "Licence SI → application",
    table: "License.applicationId?",
    pattern: "fk",
    status: "future",
    horizon: "later",
    rfc: "RFC-037 + CMDB",
    flows: ["futur"],
    note: "Dépend du référentiel applications (pas de modèle Prisma aujourd'hui).",
  },
  {
    id: "fut-license-resource",
    from: "licenses",
    to: "resource",
    label: "Licence catalogue vs licence SI",
    table: "ResourceType.LICENSE (référentiel simple)",
    pattern: "noyau",
    status: "partial",
    horizon: "later",
    rfc: "RFC-RES-001 vs RFC-037",
    flows: ["org", "futur"],
    note: "Resource LICENSE = info projet. RFC-037 = cycle de vie parc + contrats. À ne pas fusionner.",
  },
  {
    id: "fut-quotation",
    from: "procurement",
    to: "ged",
    label: "Devis fournisseur (phase 2 GED)",
    table: "SupplierQuotation",
    pattern: "fk",
    status: "future",
    horizon: "later",
    rfc: "RFC-034 Phase 2",
    flows: ["argent", "futur"],
    note: "Phase 1 live = pièces PO/facture. Devis pas encore d'entité.",
  },
  {
    id: "fut-ged-project",
    from: "ged",
    to: "projects",
    label: "GED unifiée (projet + achats + contrats)",
    table: "Document transverse",
    pattern: "noyau",
    status: "future",
    horizon: "later",
    rfc: "VISION · RFC-PROJ-DOC-001 / RFC-034",
    flows: ["projet", "futur"],
    note: "Aujourd'hui silos : ProjectDocument, ProcurementAttachment, ContractAttachment.",
  },
  {
    id: "fut-cmdb-budget",
    from: "cmdb",
    to: "budgets",
    label: "Application / actif → ligne",
    table: "FinancialSourceType.APPLICATION | ASSET",
    pattern: "polymorphe",
    status: "future",
    horizon: "later",
    rfc: "VISION_PRODUIT référentiel IT",
    flows: ["argent", "futur"],
    note: "Enum prêt. Pas de modèles Application, Database, Domain, Certificate, Telephony.",
  },
  {
    id: "fut-cmdb-project",
    from: "cmdb",
    to: "projects",
    label: "Actif SI porté par un projet",
    table: "—",
    pattern: "jonction",
    status: "future",
    horizon: "later",
    rfc: "VISION_PRODUIT",
    flows: ["projet", "futur"],
    note: "CMDB : applications, BDD, domaines, certificats, téléphonie.",
  },
  {
    id: "fut-cmdb-resource",
    from: "cmdb",
    to: "resource",
    label: "Actif matériel vs Resource MATERIAL",
    table: "ResourceType.MATERIAL",
    pattern: "noyau",
    status: "partial",
    horizon: "later",
    rfc: "RFC-RES-001",
    flows: ["org", "futur"],
    note: "MATERIAL = référentiel projet simple, pas un inventaire IT.",
  },
  {
    id: "fut-timeline",
    from: "dashboard",
    to: "financial",
    label: "Timeline unifiée multi-domaines",
    table: "AuditLog + FinancialEvent + ProjectActivity",
    pattern: "overlay",
    status: "future",
    horizon: "later",
    rfc: "RFC-032 hors scope",
    flows: ["gouvernance", "argent", "futur"],
    note: "Aujourd'hui timeline budget seule (decision-history) et timeline ligne (events).",
  },
  {
    id: "fut-proj-020",
    from: "projects",
    to: "dashboard",
    label: "Roll-up portefeuille (parent → enfants)",
    table: "Project.parentProjectId (agrégats)",
    pattern: "overlay",
    status: "future",
    horizon: "later",
    rfc: "RFC-PROJ-020",
    flows: ["projet", "argent", "futur"],
    note: "Hiérarchie live (RFC-PROJ-019). Agrégation budget / santé / risques à faire.",
  },
  {
    id: "fut-axes-po",
    from: "procurement",
    to: "org",
    label: "Axes analytiques sur PO / facture",
    table: "splits au-delà de BudgetLine",
    pattern: "jonction",
    status: "future",
    horizon: "later",
    rfc: "RFC-021 suite",
    flows: ["argent", "org", "futur"],
    note: "Splits existent sur la ligne seulement.",
  },
  {
    id: "fut-evidence-ged",
    from: "compliance",
    to: "ged",
    label: "Preuve conformité → document GED",
    table: "ComplianceEvidence.fileId (placeholder)",
    pattern: "fk",
    status: "future",
    horizon: "later",
    rfc: "module compliance",
    flows: ["gouvernance", "futur"],
    note: "Evidence a url/fileId libres, pas de FK ProjectDocument.",
  },
  {
    id: "fut-ms-lot5",
    from: "microsoft",
    to: "ged",
    label: "Provisioning Planner / dossier docs",
    table: "ProjectMicrosoftTeamsProvisioning lot 5",
    pattern: "overlay",
    status: "future",
    horizon: "later",
    rfc: "RFC-PROJ-INT-010 lot 5",
    flows: ["projet", "futur"],
    note: "MVP Team+canaux live. Cases Planner / dossier / sync auto encore planifiés.",
  },
  {
    id: "fut-finance",
    from: "financial",
    to: "budgets",
    label: "Orchestra Finance (DAF)",
    table: "noyau financier étendu (facturation, recette, clôture)",
    pattern: "noyau",
    status: "future",
    horizon: "distant",
    rfc: "VISION_PRODUIT",
    flows: ["argent", "futur"],
    note: "Le Financial Core actuel est IT/support. Pas un ERP DAF.",
  },
  {
    id: "fut-hr",
    from: "resource",
    to: "capacity",
    label: "Orchestra HR (SIRH) → calendrier capa",
    table: "CapacitySource.SIRH · ClientMonthlyCapacity",
    pattern: "noyau",
    status: "future",
    horizon: "distant",
    rfc: "VISION_PRODUIT · RFC-CAPA-001",
    flows: ["org", "capa", "futur"],
    note: "Enum SIRH déjà sur ClientMonthlyCapacity.source. Pas de connecteur. Congés / effectif viendront du DRH, pas saisis à la main.",
  },
  {
    id: "atlas-overlay",
    from: "atlas",
    to: "projects",
    label: "Cartographie — lit les ponts, ne duplique pas",
    table: "AtlasRelation (à créer) kind=ORG|FUNCTIONAL|TECHNICAL",
    pattern: "overlay",
    status: "future",
    horizon: "later",
    rfc: "Prototype Starium Atlas (hors repo RFC)",
    flows: ["gouvernance", "futur", "atlas"],
    note: "Surcouche comme Meetings. Calques prototype : processus, apps, flux métier/tech, données, infra, sites, fournisseurs, risques, SSI/RGPD.",
  },
  {
    id: "atlas-org",
    from: "atlas",
    to: "org",
    label: "Relations organisationnelles",
    table: "ownerOrgUnitId · stewardResourceId · OrgUnitMembership · WorkTeam",
    pattern: "overlay",
    status: "future",
    horizon: "later",
    rfc: "RFC-ORG-003/004 + Atlas",
    flows: ["org", "futur", "atlas"],
    note: "Propriétaire métier, steward, unités, équipes, sites. Déjà en colonnes ; Atlas les rend navigables.",
  },
  {
    id: "atlas-cmdb",
    from: "atlas",
    to: "cmdb",
    label: "Relations techniques (flux SI)",
    table: "flux technique / applicatif (prototype Atlas)",
    pattern: "overlay",
    status: "future",
    horizon: "later",
    rfc: "Starium Atlas + VISION CMDB",
    flows: ["futur", "atlas"],
    note: "LDAP, SQL, hébergement, API, SFTP — aujourd'hui seulement Microsoft 365 + silos documents.",
  },
  {
    id: "org-human",
    from: "org",
    to: "resource",
    label: "Compte client ↔ fiche HUMAN",
    table: "ClientUser.resourceId",
    pattern: "fk",
    status: "live",
    horizon: "now",
    rfc: "RFC-ORG-002",
    flows: ["org"],
    note: "Un ClientUser au plus pour une Resource HUMAN.",
  },
  {
    id: "parent-project",
    from: "projects",
    to: "dashboard",
    label: "Hiérarchie parent / sous-projets",
    table: "Project.parentProjectId",
    pattern: "fk",
    status: "live",
    horizon: "now",
    rfc: "RFC-PROJ-019",
    flows: ["projet", "org"],
    note: "Relation self. Roll-up portefeuille = RFC-PROJ-020 (futur).",
  },
  {
    id: "docs-project",
    from: "projects",
    to: "ged",
    label: "Documents projet (silo)",
    table: "ProjectDocument",
    pattern: "fk",
    status: "partial",
    horizon: "later",
    rfc: "RFC-PROJ-DOC-001",
    flows: ["projet", "futur"],
    note: "Live dans le projet. Pas encore fusionné avec pièces achats/contrats.",
  },
  {
    id: "directory-ad",
    from: "microsoft",
    to: "resource",
    label: "Sync annuaire → HUMAN",
    table: "DirectoryConnection",
    pattern: "overlay",
    status: "live",
    horizon: "now",
    rfc: "RFC-TEAM-001",
    flows: ["org"],
    note: "AD DS / Entra. Relation technique d'identité, pas un flux applicatif Atlas.",
  },
];

const ATLAS_ORG_IDS = new Set([
  "owner-org",
  "team-resource",
  "team-vision",
  "capa-resource",
  "capa-team",
  "meet-attendee",
  "budget-axes",
  "fut-hr",
  "gap-res-assign",
  "org-human",
  "parent-project",
  "atlas-org",
  "fut-license-resource",
  "directory-ad",
]);

const ATLAS_TECH_IDS = new Set([
  "ms-project",
  "fut-license-cmdb",
  "fut-ged-project",
  "fut-cmdb-budget",
  "fut-cmdb-project",
  "fut-cmdb-resource",
  "fut-evidence-ged",
  "fut-ms-lot5",
  "fut-quotation",
  "docs-project",
  "atlas-cmdb",
]);

function atlasKindOf(link: LinkDef): AtlasKind {
  if (ATLAS_ORG_IDS.has(link.id)) return "org";
  if (ATLAS_TECH_IDS.has(link.id)) return "technical";
  return "functional";
}

const ATLAS_KIND_LABEL: Record<AtlasKind, string> = {
  org: "Organisationnel",
  functional: "Fonctionnel",
  technical: "Technique",
};

const FLOWS: { id: FlowId; label: string }[] = [
  { id: "all", label: "Tout" },
  { id: "atlas", label: "Atlas" },
  { id: "argent", label: "Argent" },
  { id: "projet", label: "Pilotage projet" },
  { id: "gouvernance", label: "Gouvernance" },
  { id: "capa", label: "Capacité" },
  { id: "org", label: "Org / RH" },
  { id: "futur", label: "Futur" },
];

const PATTERN_LABEL: Record<Pattern, string> = {
  jonction: "Table N:N",
  fk: "FK consommateur",
  polymorphe: "sourceType + sourceId",
  overlay: "Lecture / snapshot",
  noyau: "Noyau partagé",
};

const STATUS_LABEL: Record<LinkStatus, string> = {
  live: "live",
  partial: "partiel",
  gap: "trou (enum/FK prêts)",
  future: "futur",
};

const HORIZON_LABEL: Record<Horizon, string> = {
  now: "Maintenant",
  next: "Prochain",
  later: "Ensuite",
  distant: "Distant",
};

function linkInFlow(link: LinkDef, flow: FlowId): boolean {
  if (flow === "all" || flow === "atlas") return true;
  if (flow === "futur") return link.status === "future" || link.status === "gap" || link.horizon !== "now";
  return link.flows.includes(flow);
}

function nodeInFlow(nodeId: string, flow: FlowId): boolean {
  if (flow === "all") return true;
  return LINKS.some(
    (l) => linkInFlow(l, flow) && (l.from === nodeId || l.to === nodeId),
  );
}

const ROUTE_PAD = 10;
const CORNER = 14;

type Pt = { x: number; y: number };

function inflate(n: NodeDef, p: number) {
  return { x: n.x - p, y: n.y - p, w: n.w + 2 * p, h: n.h + 2 * p };
}

function hHits(y: number, x1: number, x2: number, nodes: NodeDef[]): boolean {
  const lo = Math.min(x1, x2);
  const hi = Math.max(x1, x2);
  return nodes.some((n) => {
    const r = inflate(n, ROUTE_PAD);
    return y >= r.y && y <= r.y + r.h && hi >= r.x && lo <= r.x + r.w;
  });
}

function vHits(x: number, y1: number, y2: number, nodes: NodeDef[]): boolean {
  const lo = Math.min(y1, y2);
  const hi = Math.max(y1, y2);
  return nodes.some((n) => {
    const r = inflate(n, ROUTE_PAD);
    return x >= r.x && x <= r.x + r.w && hi >= r.y && lo <= r.y + r.h;
  });
}

function rowGutters(): number[] {
  const rows = [...new Set(NODES.map((n) => n.y))].sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let i = 0; i < rows.length - 1; i++) {
    const h = NODES.find((n) => n.y === rows[i])?.h ?? 56;
    gaps.push((rows[i] + h + rows[i + 1]) / 2);
  }
  return gaps;
}

function sideGutter(n: NodeDef, towardX: number): number {
  return towardX >= n.x + n.w / 2 ? n.x + n.w + 22 : n.x - 22;
}

function roundedPath(pts: Pt[]): string {
  if (pts.length < 2) return "";
  if (pts.length === 2) {
    return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
  }
  const r = CORNER;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const next = pts[i + 1];
    const inDx = curr.x - prev.x;
    const inDy = curr.y - prev.y;
    const outDx = next.x - curr.x;
    const outDy = next.y - curr.y;
    const inLen = Math.hypot(inDx, inDy) || 1;
    const outLen = Math.hypot(outDx, outDy) || 1;
    const rr = Math.min(r, inLen / 2.2, outLen / 2.2);
    d += ` L ${curr.x - (inDx / inLen) * rr} ${curr.y - (inDy / inLen) * rr}`;
    d += ` Q ${curr.x} ${curr.y} ${curr.x + (outDx / outLen) * rr} ${curr.y + (outDy / outLen) * rr}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

function edgePoints(from: NodeDef, to: NodeDef, lane = 0): Pt[] {
  const others = NODES.filter((n) => n.id !== from.id && n.id !== to.id);
  const fromC = { x: from.x + from.w / 2, y: from.y + from.h / 2 };
  const toC = { x: to.x + to.w / 2, y: to.y + to.h / 2 };
  const sameRow = Math.abs(from.y - to.y) < 8;
  const shift = ((lane % 7) - 3) * 6;

  if (sameRow) {
    const left = from.x < to.x;
    const sx = left ? from.x + from.w : from.x;
    const tx = left ? to.x : to.x + to.w;
    const y = fromC.y + shift * 0.25;
    if (!hHits(y, sx, tx, others)) {
      return [
        { x: sx, y },
        { x: tx, y: toC.y + shift * 0.25 },
      ];
    }
    const g =
      rowGutters().find((gy) => !hHits(gy + shift, sx, tx, others)) ??
      Math.max(from.y + from.h, to.y + to.h) + 18;
    return [
      { x: sx, y: fromC.y },
      { x: sx, y: g + shift },
      { x: tx, y: g + shift },
      { x: tx, y: toC.y },
    ];
  }

  const goingDown = toC.y >= fromC.y;
  const sameCol = Math.abs(fromC.x - toC.x) < 40;

  if (sameCol) {
    const gx = sideGutter(from, fromC.x + 1);
    const sy = goingDown ? from.y + from.h : from.y;
    const ty = goingDown ? to.y : to.y + to.h;
    return [
      { x: fromC.x, y: sy },
      { x: gx, y: sy },
      { x: gx, y: ty },
      { x: toC.x, y: ty },
    ];
  }

  const sx = fromC.x;
  const sy = goingDown ? from.y + from.h : from.y;
  const tx = toC.x;
  const ty = goingDown ? to.y : to.y + to.h;
  const gutters = rowGutters().map((y) => y + shift);
  const midY =
    gutters.find(
      (y) =>
        y > Math.min(sy, ty) &&
        y < Math.max(sy, ty) &&
        !hHits(y, sx, tx, others) &&
        !vHits(sx, sy, y, others) &&
        !vHits(tx, y, ty, others),
    ) ??
    (goingDown ? from.y + from.h + 18 + shift : from.y - 18 - shift);

  if (!vHits(sx, sy, midY, others) && !vHits(tx, midY, ty, others) && !hHits(midY, sx, tx, others)) {
    return [
      { x: sx, y: sy },
      { x: sx, y: midY },
      { x: tx, y: midY },
      { x: tx, y: ty },
    ];
  }

  const gx = sideGutter(from, toC.x);
  return [
    { x: sx, y: sy },
    { x: gx, y: sy },
    { x: gx, y: ty },
    { x: tx, y: ty },
  ];
}

function edgePath(from: NodeDef, to: NodeDef, lane = 0): string {
  return roundedPath(edgePoints(from, to, lane));
}

function FunctionalGraph({
  flow,
  selected,
  onSelect,
  atlasKind,
}: {
  flow: FlowId;
  selected: string;
  onSelect: (id: string) => void;
  atlasKind: "all" | AtlasKind;
}) {
  const theme = useHostTheme();
  const kindColor: Record<AtlasKind, string> = {
    org: theme.category.purple,
    functional: theme.category.blue,
    technical: theme.category.cyan,
  };
  const graphLinks = LINKS.filter((l) => {
    if (!linkInFlow(l, flow)) return false;
    if (atlasKind !== "all" && atlasKindOf(l) !== atlasKind) return false;
    return true;
  });

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      width="100%"
      role="img"
      aria-label="Graphe des relations Starium Orchestra, y compris Atlas"
      style={{ display: "block", minHeight: 560 }}
    >
      <defs>
        <marker id="arrow-gap" markerWidth="10" markerHeight="10" refX="9" refY="3.5" orient="auto">
          <path d="M0,0 L9,3.5 L0,7 Z" fill={theme.category.orange} />
        </marker>
        <marker id="arrow-org" markerWidth="10" markerHeight="10" refX="9" refY="3.5" orient="auto">
          <path d="M0,0 L9,3.5 L0,7 Z" fill={theme.category.purple} />
        </marker>
        <marker id="arrow-func" markerWidth="10" markerHeight="10" refX="9" refY="3.5" orient="auto">
          <path d="M0,0 L9,3.5 L0,7 Z" fill={theme.category.blue} />
        </marker>
        <marker id="arrow-tech" markerWidth="10" markerHeight="10" refX="9" refY="3.5" orient="auto">
          <path d="M0,0 L9,3.5 L0,7 Z" fill={theme.category.cyan} />
        </marker>
      </defs>

      {LAYERS.map((layer) => (
        <g key={layer.id}>
          <rect
            x={LAYER_X}
            y={layer.y}
            width={LAYER_W}
            height={layer.h}
            rx={8}
            fill={theme.fill.quaternary}
            stroke={theme.stroke.tertiary}
          />
          <text
            x={16}
            y={layer.y + layer.h / 2 + 4}
            fill={theme.text.tertiary}
            fontSize={12}
            fontWeight={590}
          >
            {layer.label}
          </text>
        </g>
      ))}

      <text x={348} y={546} fill={theme.text.quaternary} fontSize={11}>
        Rangée pointillée = pas encore de module
      </text>

      {graphLinks.map((link, i) => {
        const from = NODE_BY_ID[link.from];
        const to = NODE_BY_ID[link.to];
        if (!from || !to) return null;
        const kind = atlasKindOf(link);
        const touchesSelected = selected !== "" && (link.from === selected || link.to === selected);
        const focused = selected !== "";
        const dimmed = focused && !touchesSelected;
        const pending = link.status !== "live";
        const isHero = link.id === "project-budget";
        const stroke = pending ? theme.category.orange : kindColor[kind];
        const marker = pending
          ? "url(#arrow-gap)"
          : kind === "org"
            ? "url(#arrow-org)"
            : kind === "technical"
              ? "url(#arrow-tech)"
              : "url(#arrow-func)";
        const d = edgePath(from, to, i);
        const width = isHero || touchesSelected ? 2.8 : 2.2;
        const opacity = dimmed ? 0.22 : pending ? 0.9 : focused ? 1 : 0.88;
        return (
          <g key={link.id} pointerEvents="none">
            <path
              d={d}
              fill="none"
              stroke={theme.bg.editor}
              strokeWidth={width + 5}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={dimmed ? 0.5 : 0.95}
            />
            <path
              d={d}
              fill="none"
              stroke={stroke}
              strokeWidth={width}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={pending ? "7 5" : undefined}
              opacity={opacity}
              markerEnd={dimmed ? undefined : marker}
            />
          </g>
        );
      })}

      {NODES.map((node) => {
        const active =
          nodeInFlow(node.id, flow) &&
          (atlasKind === "all" ||
            LINKS.some(
              (l) =>
                (l.from === node.id || l.to === node.id) &&
                atlasKindOf(l) === atlasKind,
            ) ||
            node.id === "atlas");
        const isSelected = node.id === selected;
        const isHub = node.id === "projects" || node.id === "atlas" || node.id === "alerts";
        const connected =
          selected !== "" &&
          graphLinks.some(
            (l) =>
              (l.from === selected && l.to === node.id) ||
              (l.to === selected && l.from === node.id),
          );
        return (
          <g
            key={node.id}
            onClick={() => onSelect(isSelected ? "" : node.id)}
            style={{ cursor: "pointer" }}
            opacity={
              selected === ""
                ? active
                  ? 1
                  : 0.5
                : isSelected || connected
                  ? 1
                  : 0.32
            }
          >
            <rect
              x={node.x}
              y={node.y}
              width={node.w}
              height={node.h}
              rx={8}
              fill={isSelected ? theme.fill.primary : theme.bg.elevated}
              stroke={
                isSelected
                  ? theme.accent.primary
                  : node.future
                    ? theme.category.orange
                    : isHub
                      ? theme.stroke.primary
                      : theme.stroke.secondary
              }
              strokeWidth={isSelected ? 2 : node.future ? 1.4 : 1}
              strokeDasharray={node.future ? "4 3" : undefined}
            />
            <text
              x={node.x + node.w / 2}
              y={node.y + node.h / 2 + 4}
              textAnchor="middle"
              fill={theme.text.primary}
              fontSize={13}
              fontWeight={isHub || isSelected ? 590 : 400}
            >
              {node.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function SelectedDetail({ nodeId }: { nodeId: string }) {
  const node = NODE_BY_ID[nodeId];
  const dispatch = useCanvasAction();
  if (!node) return null;
  const related = LINKS.filter((l) => l.from === nodeId || l.to === nodeId);
  const live = related.filter((l) => l.status === "live").length;
  const pending = related.filter((l) => l.status !== "live").length;
  const layerLabel = LAYERS.find((l) => l.id === node.layer)?.label ?? node.layer;

  return (
    <Card>
      <CardHeader trailing={`${live} live · ${pending} ouvert${pending > 1 ? "s" : ""}`}>
        {node.label}
        {node.future ? " (futur)" : ""}
      </CardHeader>
      <CardBody>
        <Stack gap={12}>
          <Text size="small" tone="secondary">
            {layerLabel}. Reclique le même module pour tout réafficher.
          </Text>
          {related.map((link) => {
            const other = link.from === nodeId ? link.to : link.from;
            const dir = link.from === nodeId ? "vers" : "depuis";
            return (
              <div key={link.id}>
                <Stack gap={4}>
                  <Row gap={8} align="center" wrap>
                    <Pill size="sm" active={link.status === "live"}>
                      {STATUS_LABEL[link.status]}
                    </Pill>
                    <Pill size="sm">{ATLAS_KIND_LABEL[atlasKindOf(link)]}</Pill>
                    <Text size="small" weight="semibold">
                      {dir} {NODE_BY_ID[other]?.label ?? other}
                    </Text>
                  </Row>
                  <Text size="small" tone="secondary">
                    {link.label} — `{link.table}` · {PATTERN_LABEL[link.pattern]} · {link.rfc}
                  </Text>
                  <Text size="small" tone="tertiary">
                    {link.note}
                  </Text>
                </Stack>
              </div>
            );
          })}
          {nodeId === "projects" || nodeId === "budgets" ? (
            <Button
              variant="secondary"
              onClick={() =>
                dispatch({
                  type: "openFile",
                  path: "docs/RFC/RFC-PROJ-010 — Project ↔ Budget Integration.md",
                })
              }
            >
              Ouvrir RFC-PROJ-010
            </Button>
          ) : null}
        </Stack>
      </CardBody>
    </Card>
  );
}

export default function GrapheFonctionnelModules() {
  const [flow, setFlow] = useCanvasState<FlowId>("flow", "all");
  const [selected, setSelected] = useCanvasState("selectedNode", "");
  const [statusFilter, setStatusFilter] = useCanvasState<"all" | LinkStatus | Horizon>(
    "status",
    "all",
  );
  const [atlasKind, setAtlasKind] = useCanvasState<"all" | AtlasKind>("atlasKind", "all");

  const liveCount = LINKS.filter((l) => l.status === "live").length;
  const partialCount = LINKS.filter((l) => l.status === "partial").length;
  const gapCount = LINKS.filter((l) => l.status === "gap").length;
  const futureCount = LINKS.filter((l) => l.status === "future").length;
  const orgCount = LINKS.filter((l) => atlasKindOf(l) === "org").length;
  const funcCount = LINKS.filter((l) => atlasKindOf(l) === "functional").length;
  const techCount = LINKS.filter((l) => atlasKindOf(l) === "technical").length;

  const tableLinks = LINKS.filter((l) => {
    if (!linkInFlow(l, flow)) return false;
    if (atlasKind !== "all" && atlasKindOf(l) !== atlasKind) return false;
    if (statusFilter === "all") return true;
    if (statusFilter === "now" || statusFilter === "next" || statusFilter === "later" || statusFilter === "distant") {
      return l.horizon === statusFilter;
    }
    return l.status === statusFilter;
  });

  return (
    <Stack gap={24}>
      <Stack gap={8}>
        <H1>Graphe fonctionnel — Starium Orchestra</H1>
        <Text tone="secondary">
          Recoupé sur Prisma, RFC, VISION et le prototype Atlas. Toutes les liaisons
          du catalogue sont dessinées (live, trous, futur). Clique un module pour
          isoler ses ponts ; reclic pour tout réafficher. Atlas n'invente pas de
          montants : il rend les relations navigables.
        </Text>
      </Stack>

      <Row gap={20} wrap>
        <Stat value={String(NODES.filter((n) => !n.future).length)} label="Nœuds live" />
        <Stat value={String(orgCount)} label="Relations org" />
        <Stat value={String(funcCount)} label="Relations fonctionnelles" />
        <Stat value={String(techCount)} label="Relations techniques" />
        <Stat value={String(liveCount)} label="Liaisons live" tone="success" />
        <Stat value={String(futureCount + gapCount + partialCount)} label="Ouvertes / futures" tone="warning" />
      </Row>

      <Stack gap={10}>
        <H2>Carte des liaisons</H2>
        <Row gap={8} wrap>
          {FLOWS.map((f) => (
            <span key={f.id}>
              <Pill
                active={flow === f.id}
                onClick={() => setFlow(f.id)}
              >
                {f.label}
              </Pill>
            </span>
          ))}
        </Row>
        <Text size="small" tone="tertiary">
          {LINKS.length} arêtes — colorées par axe Atlas. Filtres flux / axe ci-dessus.
        </Text>
        <Row gap={8} wrap>
          {(
            [
              ["all", "Tous les axes"],
              ["org", "Organisationnel"],
              ["functional", "Fonctionnel"],
              ["technical", "Technique"],
            ] as const
          ).map(([id, label]) => (
            <span key={id}>
              <Pill active={atlasKind === id} onClick={() => setAtlasKind(id)}>
                {label}
              </Pill>
            </span>
          ))}
        </Row>
        <Row gap={16} align="center" wrap>
          <Row gap={6} align="center">
            <Swatch color="purple" />
            <Text size="small" tone="secondary">
              Organisationnel
            </Text>
          </Row>
          <Row gap={6} align="center">
            <Swatch color="blue" />
            <Text size="small" tone="secondary">
              Fonctionnel
            </Text>
          </Row>
          <Row gap={6} align="center">
            <Swatch color="cyan" />
            <Text size="small" tone="secondary">
              Technique
            </Text>
          </Row>
          <Row gap={6} align="center">
            <Swatch color="orange" />
            <Text size="small" tone="secondary">
              Pointillé = trou / futur
            </Text>
          </Row>
        </Row>
        <FunctionalGraph
          flow={flow}
          selected={selected}
          onSelect={setSelected}
          atlasKind={atlasKind}
        />
      </Stack>

      <Grid columns={selected ? 2 : 1} gap={16}>
        <SelectedDetail nodeId={selected} />
        {selected === "atlas" ? (
          <Stack gap={12}>
            <H3>Atlas — 3 axes de relation</H3>
            <Text>
              Module **futur** (prototype UI kits). Surcouche : aucune copie des
              montants, risques ou docs. Il indexe les relations déjà portées
              par les modules + les flux SI encore absents (CMDB).
            </Text>
            <Text size="small" tone="secondary">
              **Organisationnel** — OrgUnit, steward, équipes, sites, compte ↔
              HUMAN, hiérarchie projet.
            </Text>
            <Text size="small" tone="secondary">
              **Fonctionnel** — ProjectBudgetLink, StrategicLink, cycles, PO/
              facture, contrats, capacité, demandes.
            </Text>
            <Text size="small" tone="secondary">
              **Technique** — Microsoft 365, annuaire, documents, futurs flux
              app/infra (LDAP, SQL, API, hébergement).
            </Text>
            <Callout tone="info" title="Atlas lit, il ne duplique pas">
              Filtre Atlas ou axe org / fonctionnel / technique pour isoler un
              calque. Chaque pont déjà porté par un module devient une arête.
            </Callout>
          </Stack>
        ) : (
          <Stack gap={12}>
            <H3>Chemin argent — budget × projet</H3>
            <Text>
              Un projet n'a **pas** de `budgetId`. Il pointe des **lignes** via
              `ProjectBudgetLink`. L'argent ne bouge que si un PO / une facture
              tombe sur la même ligne.
            </Text>
            <Text size="small" tone="secondary">
              1. `/projects/:id/budget` crée le lien (FULL / % / FIXED).
            </Text>
            <Text size="small" tone="secondary">
              2. `PurchaseOrder.budgetLineId` → FinancialEvent COMMITMENT.
            </Text>
            <Text size="small" tone="secondary">
              3. Facture → CONSUMPTION + dénouement engagement.
            </Text>
            <Text size="small" tone="secondary">
              4. BudgetLine recalculée. Liste projets : consommé = somme FIXED.
            </Text>
            <Callout tone="warning" title="Pas encore">
              Tâche/jalon/timesheet ne poussent pas d'event. Vue inverse ligne →
              projets absente (RFC-PROJ-010 §8.2).
            </Callout>
          </Stack>
        )}
      </Grid>

      <Divider />

      <Stack gap={10}>
        <H2>Roadmap des ponts</H2>
        <Grid columns={2} gap={12}>
          <Card>
            <CardHeader trailing="RFC écrite / enum prêt">Prochain</CardHeader>
            <CardBody>
              <Stack gap={8}>
                <Text size="small">
                  FinancialEvent `PROJECT` (tâches/jalons) · vue inverse BudgetLine
                  · KPI cockpit projet · RFC-037 Licences SI (`contractId`,
                  `budgetLineId`, `projectId`) · RFC-RES-002 costing timesheet /
                  TJM · contrat → ligne.
                </Text>
              </Stack>
            </CardBody>
          </Card>
          <Card>
            <CardHeader trailing="VISION / RFC draft">Ensuite</CardHeader>
            <CardBody>
              <Text size="small">
                CMDB (applications, BDD, domaines, certificats, téléphonie) · GED
                unifiée · devis `SupplierQuotation` · timeline multi-domaines
                (RFC-032) · roll-up RFC-PROJ-020 · axes analytiques sur PO ·
                preuves conformité → documents · Microsoft lot 5.
              </Text>
            </CardBody>
          </Card>
          <Card>
            <CardHeader trailing="VISION long terme">Distant</CardHeader>
            <CardBody>
              <Text size="small">
                Orchestra Finance (DAF) · Orchestra HR (connecteur `CapacitySource.SIRH`)
                · IA d'analyse · connecteurs API externes hors Microsoft.
              </Text>
            </CardBody>
          </Card>
          <Card>
            <CardHeader trailing="prototype UI kits">Atlas</CardHeader>
            <CardBody>
              <Text size="small">
                Gestion des relations **organisationnelles, fonctionnelles,
                techniques**. Pas de RFC dans le repo. À brancher comme overlay
                (pattern Meetings) : table de relations typées + graphe, lecture
                des FK/jonctions existantes, pas de second Financial Core.
              </Text>
            </CardBody>
          </Card>
          <Card>
            <CardHeader trailing="ne pas confondre">Deux « licences »</CardHeader>
            <CardBody>
              <Text size="small">
                `ClientSubscription` = sièges plateforme (ACL-001, live).
                `ResourceType.LICENSE` = fiche catalogue projet (info, live).
                RFC-037 = **parc licences SI** lié aux contrats — n'existe pas
                encore. Pas de fusion.
              </Text>
            </CardBody>
          </Card>
        </Grid>
      </Stack>

      <Stack gap={10}>
        <H2>Catalogue des liaisons</H2>
        <Row gap={8} wrap>
          {(
            [
              ["all", "Tous"],
              ["live", "Live"],
              ["partial", "Partielles"],
              ["gap", "Trous"],
              ["future", "Futur"],
              ["next", "Horizon prochain"],
              ["later", "Horizon ensuite"],
              ["distant", "Horizon distant"],
            ] as const
          ).map(([id, label]) => (
            <span key={id}>
              <Pill
                active={statusFilter === id}
                onClick={() => setStatusFilter(id)}
              >
                {label}
              </Pill>
            </span>
          ))}
        </Row>
        <Table
          headers={["De", "Vers", "Liaison", "Axe Atlas", "Mécanisme", "Pattern", "État", "Horizon", "RFC"]}
          striped
          stickyHeader
          rowTone={tableLinks.map((l) =>
            l.status === "live"
              ? "success"
              : l.status === "partial" || l.status === "gap"
                ? "warning"
                : "info",
          )}
          rows={tableLinks.map((l) => [
            NODE_BY_ID[l.from]?.label ?? l.from,
            NODE_BY_ID[l.to]?.label ?? l.to,
            l.label,
            ATLAS_KIND_LABEL[atlasKindOf(l)],
            l.table,
            PATTERN_LABEL[l.pattern],
            STATUS_LABEL[l.status],
            HORIZON_LABEL[l.horizon],
            l.rfc,
          ])}
        />
        <Text size="small" tone="tertiary">
          {tableLinks.length} liaison{tableLinks.length > 1 ? "s" : ""} · flux «{" "}
          {FLOWS.find((f) => f.id === flow)?.label} »
        </Text>
      </Stack>

      <Callout tone="info" title="Règle pour un nouveau couple">
        Recopier `apps/api/src/modules/project-budget/` : jonction + DTO + isolation
        client + audit. Argent → FinancialEvent. Rituel → overlay + snapshot.
        Jamais `budgetId` sur Project. Ne pas inventer Application/License SI sans
        RFC : l'enum `FinancialSourceType` n'est pas une table.
      </Callout>
    </Stack>
  );
}
