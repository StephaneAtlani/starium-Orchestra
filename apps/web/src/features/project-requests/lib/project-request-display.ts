import type { ComputedCircuitDto, ProjectRequestDto } from '../api/project-requests.api';
import {
  PROJECT_REQUEST_STATUS_LABELS,
  PROJECT_REQUEST_TYPE_LABELS,
} from '../constants/project-request-labels';
import { displayLabel } from '@/lib/display-label';

export const PROJECT_REQUEST_TYPE_META: Record<
  string,
  { label: string; description: string; iconBg: string; iconFg: string }
> = {
  TRANSFORMATION: {
    label: PROJECT_REQUEST_TYPE_LABELS.TRANSFORMATION,
    description: 'Refonte, digitalisation métier',
    iconBg: 'bg-[color:var(--brand-gold-050)]',
    iconFg: 'text-[color:var(--brand-gold-700)]',
  },
  INFRASTRUCTURE: {
    label: PROJECT_REQUEST_TYPE_LABELS.INFRASTRUCTURE,
    description: 'Cloud, réseau, résilience',
    iconBg: 'bg-[color:var(--state-info-bg)]',
    iconFg: 'text-[color:var(--state-info)]',
  },
  REGULATORY: {
    label: PROJECT_REQUEST_TYPE_LABELS.REGULATORY,
    description: 'RGPD, DORA, obligation légale',
    iconBg: 'bg-[color:var(--state-success-bg)]',
    iconFg: 'text-[color:var(--state-success)]',
  },
  PRODUCT: {
    label: PROJECT_REQUEST_TYPE_LABELS.PRODUCT,
    description: 'Nouvelle offre, expérimentation',
    iconBg: 'bg-[color:var(--purple-bg)]',
    iconFg: 'text-[color:var(--purple)]',
  },
  EVOLUTION: {
    label: PROJECT_REQUEST_TYPE_LABELS.EVOLUTION,
    description: "Amélioration d'un existant",
    iconBg: 'bg-[color:var(--teal-bg)]',
    iconFg: 'text-[color:var(--teal)]',
  },
};

export const PROJECT_REQUEST_TYPE_OPTIONS = Object.keys(
  PROJECT_REQUEST_TYPE_META,
) as Array<keyof typeof PROJECT_REQUEST_TYPE_META>;

export function formatBudgetKEuro(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return '—';
  return `${(amount / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} k€`;
}

export function formatBudgetEuro(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return '—';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatProjectRequestDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function typeLabel(type: string | null | undefined): string {
  if (!type) return 'Type non renseigné';
  return displayLabel(PROJECT_REQUEST_TYPE_LABELS[type] ?? PROJECT_REQUEST_TYPE_META[type]?.label, 'Type non renseigné');
}

/** Libellé Nature : catégorie portefeuille si présente, sinon type CDC. */
export function natureLabel(
  row: {
    type?: string | null;
    portfolioCategory?: {
      name: string;
      parentName?: string | null;
    } | null;
  } | null | undefined,
): string {
  const cat = row?.portfolioCategory;
  if (cat?.name?.trim()) {
    if (cat.parentName?.trim()) {
      return `${cat.parentName} / ${cat.name}`;
    }
    return cat.name;
  }
  return typeLabel(row?.type);
}

export function natureShortLabel(
  row: {
    type?: string | null;
    portfolioCategory?: {
      name: string;
      parentName?: string | null;
    } | null;
  } | null | undefined,
): string {
  const cat = row?.portfolioCategory;
  if (cat?.name?.trim()) return cat.name;
  return typeLabel(row?.type);
}

/** Infère le type CDC (circuit / exempt) depuis les libellés catégorie. */
export function inferRequestTypeFromCategoryNames(
  categoryName: string,
  parentName?: string | null,
): string {
  const haystack = `${parentName ?? ''} ${categoryName}`
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
  if (/(reglement|conform|rgpd|dora|legal|jurid)/.test(haystack)) return 'REGULATORY';
  if (/(infra|reseau|network|cloud|plateforme|ops)/.test(haystack)) {
    return 'INFRASTRUCTURE';
  }
  if (/(transform|metier|business)/.test(haystack)) return 'TRANSFORMATION';
  if (/(produit|innovation|offre|experiment)/.test(haystack)) return 'PRODUCT';
  return 'EVOLUTION';
}

export function statusLabel(status: string | null | undefined): string {
  if (!status) return 'Statut inconnu';
  return displayLabel(PROJECT_REQUEST_STATUS_LABELS[status], 'Statut inconnu');
}

/** Variante `starium-ds-badge--*` (pastille colorée CDC). */
export function statusBadgeClass(status: string | null | undefined): string {
  switch (status) {
    case 'SUBMITTED':
      return 'starium-ds-badge--info';
    case 'IN_REVIEW':
    case 'IN_CYCLE':
      return 'starium-ds-badge--gold';
    case 'APPROVED':
    case 'CONVERTED_TO_PROJECT':
      return 'starium-ds-badge--success';
    case 'POSTPONED':
    case 'NEEDS_MORE_INFO':
      return 'starium-ds-badge--warn';
    case 'REJECTED':
    case 'CANCELLED':
      return 'starium-ds-badge--danger';
    case 'DRAFT':
    default:
      return 'starium-ds-badge--neutral';
  }
}

/** Sélection or CDC (pills / cartes type / avis) — pas le chip encre. */
export function goldSelectClass(selected: boolean): string {
  return selected
    ? 'border-[color:var(--brand-gold)] bg-[color:var(--brand-gold-050)] text-[color:var(--brand-gold-700)] shadow-[0_0_0_3px_rgba(232,163,23,0.14)]'
    : 'border-border/70 bg-card text-foreground';
}

export function decisionPanelCopy(
  request: Pick<
    ProjectRequestDto,
    'status' | 'meetingLabel' | 'arbitrationInstance' | 'computedCircuit'
  >,
): { title: string; subtitle: string } {
  const instance =
    request.computedCircuit?.instance ??
    request.arbitrationInstance ??
    'COPIL';
  switch (request.status) {
    case 'DRAFT':
    case 'NEEDS_MORE_INFO':
      return {
        title: 'Brouillon',
        subtitle:
          'Complétez le dossier puis soumettez la demande pour engager le circuit.',
      };
    case 'SUBMITTED':
      return {
        title: 'En attente de validation N+1',
        subtitle:
          'Le responsable de direction doit valider ou refuser avant instruction PMO.',
      };
    case 'IN_REVIEW':
      return {
        title: 'En instruction PMO',
        subtitle:
          'Le PMO conclut l’instruction : avis, budget retenu et routage vers le cycle ou hors cycle.',
      };
    case 'IN_CYCLE':
      return {
        title: request.meetingLabel
          ? `Inscrite au ${instance}`
          : `À inscrire au ${instance}`,
        subtitle: request.meetingLabel
          ? `Séance d’arbitrage : ${request.meetingLabel}.`
          : `Inscrivez la demande à l’ordre du jour d’une séance ${instance}.`,
      };
    case 'APPROVED':
      return {
        title: 'Validée — prête à convertir',
        subtitle:
          'Créez le projet du portefeuille à partir de cette demande (statut Cadrage).',
      };
    case 'CONVERTED_TO_PROJECT':
      return {
        title: 'Projet créé',
        subtitle: 'La demande est close ; le suivi continue sur la fiche projet.',
      };
    case 'POSTPONED':
      return {
        title: 'Ajournée',
        subtitle:
          'Complétez le dossier puis rouvrez la demande pour reprendre le circuit.',
      };
    case 'REJECTED':
      return {
        title: 'Refusée',
        subtitle:
          'La demande est close. Vous pouvez la rouvrir pour un nouveau cycle si le besoin revient.',
      };
    default:
      return {
        title: statusLabel(request.status),
        subtitle:
          'Le circuit est recalculé à partir du type, du budget et de la configuration.',
      };
  }
}

export function circuitBadge(
  row: Pick<ProjectRequestDto, 'arbitrationInstance' | 'computedCircuit'>,
): { label: string; needsCycle: boolean } {
  const instance =
    row.computedCircuit?.instance ??
    (row.arbitrationInstance as 'COPIL' | 'CODIR' | null | undefined) ??
    null;
  const needsCycle = row.computedCircuit?.needsCycle ?? Boolean(instance);
  if (needsCycle && instance) {
    return { label: instance, needsCycle: true };
  }
  return { label: 'Hors cycle', needsCycle: false };
}

/** Clé d’étape courante pour le stepper (aligné CDC / prototype). */
export function reachedStepKey(
  status: string,
  circuit: ComputedCircuitDto | undefined,
  failedAtStep: string | null | undefined,
): string {
  if (status === 'REJECTED' || status === 'POSTPONED' || status === 'CANCELLED') {
    return failedAtStepToKey(failedAtStep) ?? 'arb';
  }
  if (status === 'DRAFT' || status === 'NEEDS_MORE_INFO') return 'sub';
  if (status === 'SUBMITTED') {
    if (circuit?.requireN1Validation !== false) return 'n1';
    if (circuit?.requirePmoInstruction !== false) return 'ins';
    return 'arb';
  }
  if (status === 'IN_REVIEW') return 'ins';
  if (status === 'IN_CYCLE') return 'arb';
  if (status === 'APPROVED') return 'prj';
  if (status === 'CONVERTED_TO_PROJECT') return 'end';
  return 'sub';
}

export type CircuitStepVisualState = 'done' | 'cur' | 'ko' | 'todo';

/** État visuel d’une étape du stepper (CDC dem-step.done|cur|ko). */
export function circuitStepVisualState(opts: {
  stepKey: string;
  stepIndex: number;
  steps: Array<{ key: string }>;
  status: string;
  circuit: ComputedCircuitDto | undefined;
  failedAtStep: string | null | undefined;
}): CircuitStepVisualState {
  const { stepKey, stepIndex, steps, status, circuit, failedAtStep } = opts;
  const isFailed =
    status === 'REJECTED' || status === 'POSTPONED' || status === 'CANCELLED';
  const reached = reachedStepKey(status, circuit, failedAtStep);

  if (isFailed) {
    if (stepKey === reached) return 'ko';
    const failIdx = steps.findIndex((s) => s.key === reached);
    if (failIdx >= 0 && stepIndex < failIdx) return 'done';
    return 'todo';
  }

  if (reached === 'end' || status === 'CONVERTED_TO_PROJECT') {
    return 'done';
  }

  let reachedIdx = steps.findIndex((s) => s.key === reached);
  if (reachedIdx < 0) {
    // Repli si clés API absentes / décalées
    const fallback: Record<string, number> = {
      sub: 0,
      n1: Math.max(
        0,
        steps.findIndex((s) => s.key === 'n1'),
      ),
      ins: Math.max(
        0,
        steps.findIndex((s) => s.key === 'ins'),
      ),
      arb: Math.max(
        0,
        steps.findIndex((s) => s.key === 'arb'),
      ),
      prj: Math.max(
        0,
        steps.findIndex((s) => s.key === 'prj'),
      ),
    };
    reachedIdx = fallback[reached] ?? 0;
  }

  if (stepIndex < reachedIdx) return 'done';
  if (stepIndex === reachedIdx) return 'cur';
  return 'todo';
}

export function failedAtStepToKey(
  failedAtStep: string | null | undefined,
): string | null {
  switch (failedAtStep) {
    case 'SUBMISSION':
      return 'sub';
    case 'N1':
      return 'n1';
    case 'INSTRUCTION':
      return 'ins';
    case 'ARBITRATION':
      return 'arb';
    case 'PROJECT_CREATION':
      return 'prj';
    default:
      return null;
  }
}

export function isCommitteeAuthor(authorLabel: string): boolean {
  const head = authorLabel.split(' — ')[0]?.trim() ?? '';
  return /^(COPIL|CODIR|COPROJ|Comité|Instance)/i.test(head);
}

export function personInitials(name: string): string {
  const parts = name.split(/[\s-]+/).filter(Boolean);
  return parts
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';
}
