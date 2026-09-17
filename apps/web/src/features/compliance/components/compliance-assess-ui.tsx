'use client';

import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  CirclePlus,
  Clock3,
  FileText,
  Info,
  Link2,
  Minus,
  Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ComplianceAssessmentStatusApi } from '../api/compliance.api';
import type { ComplianceUiStatus } from './compliance-status-display';

export const MATURITY_LEVELS = [
  { level: 1, label: 'Initial' },
  { level: 2, label: 'Géré' },
  { level: 3, label: 'Défini' },
  { level: 4, label: 'Maîtrisé' },
  { level: 5, label: 'Optimisé' },
] as const;

export const STATUS_CARD_OPTIONS: Array<{
  value: ComplianceUiStatus;
  label: string;
  colorClass: string;
  icon: typeof CheckCircle2;
}> = [
  {
    value: 'COMPLIANT',
    label: 'Conforme',
    colorClass: 'text-[color:var(--state-success)]',
    icon: CheckCircle2,
  },
  {
    value: 'PARTIALLY_COMPLIANT',
    label: 'Partiel',
    colorClass: 'text-[color:var(--brand-gold)]',
    icon: Clock3,
  },
  {
    value: 'NON_COMPLIANT',
    label: 'Écart',
    colorClass: 'text-[color:var(--state-danger)]',
    icon: AlertCircle,
  },
  {
    value: 'NOT_ASSESSED',
    label: 'À évaluer',
    colorClass: 'text-[color:var(--state-info)]',
    icon: CirclePlus,
  },
  {
    value: 'NOT_APPLICABLE',
    label: 'Non applicable',
    colorClass: 'text-muted-foreground',
    icon: Minus,
  },
];

export const EVIDENCE_ADD_OPTIONS: Array<{
  kind: 'FILE' | 'URL' | 'REFERENCE' | 'NOTE';
  label: string;
  icon: typeof FileText;
}> = [
  { kind: 'FILE', label: 'Fichier / document téléversé', icon: FileText },
  { kind: 'URL', label: 'Lien externe (URL)', icon: Link2 },
  { kind: 'REFERENCE', label: 'Référence (politique / procédure)', icon: BookOpen },
  { kind: 'NOTE', label: 'Note / constat manuel', icon: Pencil },
];

export function defaultMaturityForStatus(
  status: ComplianceUiStatus,
): number | null {
  switch (status) {
    case 'COMPLIANT':
      return 4;
    case 'PARTIALLY_COMPLIANT':
      return 3;
    case 'NON_COMPLIANT':
      return 1;
    default:
      return null;
  }
}

export function isSavableAssessmentStatus(
  status: ComplianceUiStatus,
): status is Extract<
  ComplianceAssessmentStatusApi,
  'COMPLIANT' | 'PARTIALLY_COMPLIANT' | 'NON_COMPLIANT'
> {
  return (
    status === 'COMPLIANT' ||
    status === 'PARTIALLY_COMPLIANT' ||
    status === 'NON_COMPLIANT'
  );
}

const SHORT_TITLE_MAX = 96;

/**
 * Intitulé court → toujours en h2.
 * Description (ou pavé long stocké à tort en `title`) → uniquement dans le (i) au hover.
 * Jamais de description en sous-titre / à la place du titre.
 */
export function assessHeadingAndTooltip(
  title: string,
  description: string | null | undefined,
  code?: string | null,
): {
  heading: string | null;
  tooltipTitle: string | null;
  tooltipDescription: string | null;
} {
  const t = title.trim() || null;
  const d = description?.trim() || null;
  const c = code?.trim() || null;
  if (!t && !d) {
    return { heading: c, tooltipTitle: null, tooltipDescription: null };
  }

  const same = Boolean(t && d && t === d);
  const distinctDesc = d && !same ? d : null;
  const longBlob = Boolean(t && t.length > SHORT_TITLE_MAX);

  // Pavé réglementaire en title (ex. NIS2) → code en h2, texte dans le (i)
  if (longBlob && !distinctDesc) {
    return {
      heading: c,
      tooltipTitle: null,
      tooltipDescription: t,
    };
  }

  return {
    heading: t,
    tooltipTitle: null,
    tooltipDescription: distinctDesc,
  };
}

function ComplianceInfoTip({
  title,
  description,
  ariaLabel,
}: {
  title: string | null;
  description: string | null;
  ariaLabel: string;
}) {
  if (!title && !description) return null;
  return (
    <TooltipProvider delay={200}>
      <Tooltip>
        <TooltipTrigger
          type="button"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--control-radius,999px)] text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:size-9"
          aria-label={ariaLabel}
        >
          <Info className="size-4" aria-hidden />
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          align="end"
          className="max-w-sm space-y-1.5 whitespace-normal text-left leading-relaxed"
        >
          {title ? <p className="font-bold">{title}</p> : null}
          {description ? (
            <p className={cn('font-medium', title && 'opacity-90')}>{description}</p>
          ) : null}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Badges + intitulé court en h2 ; (i) = description au hover. */
export function ComplianceAssessHeader({
  frameworkName,
  code,
  title,
  description,
}: {
  frameworkName: string;
  code: string;
  title: string;
  description: string | null | undefined;
}) {
  const { heading, tooltipDescription } = assessHeadingAndTooltip(
    title,
    description,
    code,
  );
  const hasTip = Boolean(tooltipDescription);

  return (
    <header className="shrink-0 border-b border-border/70 bg-background px-5 pr-14 pb-4 pt-5 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex max-w-full truncate rounded-md bg-muted px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">
          {frameworkName}
        </span>
        <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-[11px] font-extrabold tabular-nums text-muted-foreground">
          {code}
        </span>
      </div>
      {heading ? (
        <div className="mt-2.5 flex min-w-0 items-start gap-2">
          <h2 className="min-w-0 flex-1 text-lg font-extrabold leading-snug tracking-tight text-foreground sm:text-xl">
            {heading}
          </h2>
          {hasTip ? (
            <ComplianceInfoTip
              title={null}
              description={tooltipDescription}
              ariaLabel="Voir la description de l’exigence"
            />
          ) : null}
        </div>
      ) : (
        <div className="mt-2.5 flex min-w-0 items-center gap-2">
          <h2 className="sr-only">{code}</h2>
          {hasTip ? (
            <ComplianceInfoTip
              title={null}
              description={tooltipDescription}
              ariaLabel="Voir la description de l’exigence"
            />
          ) : null}
        </div>
      )}
    </header>
  );
}

export function ComplianceStatusCards({
  value,
  onChange,
  disabled,
}: {
  value: ComplianceUiStatus;
  onChange: (next: ComplianceUiStatus) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Statut de conformité"
      className="grid grid-cols-3 gap-2"
    >
      {STATUS_CARD_OPTIONS.map((opt) => {
        const selected = value === opt.value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex min-h-11 flex-col items-center justify-center gap-1.5 rounded-[var(--radius-md)] border-[1.5px] border-border bg-card px-2 py-3 text-center transition-[background,border-color,box-shadow] duration-150',
              'hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
              'disabled:pointer-events-none disabled:opacity-50',
              selected &&
                'border-current shadow-[0_0_0_3px_color-mix(in_srgb,currentColor_16%,transparent)]',
              opt.colorClass,
            )}
          >
            <Icon className="size-[19px] shrink-0" aria-hidden />
            <span className="text-[11.5px] font-bold text-foreground">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ComplianceMaturityPicker({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (level: number) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Niveau de maturité"
      className="flex flex-wrap gap-1.5 sm:flex-nowrap sm:gap-[7px]"
    >
      {MATURITY_LEVELS.map((m) => {
        const selected = value === m.level;
        return (
          <button
            key={m.level}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(m.level)}
            className={cn(
              'min-h-11 min-w-[4.5rem] flex-1 rounded-[var(--radius-md)] border-[1.5px] border-border bg-card px-1 py-2 text-center text-xs font-bold text-muted-foreground transition-[background,border-color,color] duration-150',
              'hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
              'disabled:pointer-events-none disabled:opacity-50',
              selected &&
                'border-[color:var(--brand-gold)] bg-[color:var(--brand-gold-050)] text-[color:var(--brand-gold-700)]',
            )}
          >
            <span
              className={cn(
                'mb-0.5 block text-base font-extrabold text-foreground',
                selected && 'text-[color:var(--brand-gold-700)]',
              )}
            >
              {m.level}
            </span>
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
