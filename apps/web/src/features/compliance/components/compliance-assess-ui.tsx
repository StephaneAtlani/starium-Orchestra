'use client';

import { useId, useState } from 'react';
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
  'COMPLIANT' | 'PARTIALLY_COMPLIANT' | 'NON_COMPLIANT' | 'NOT_APPLICABLE'
> {
  return (
    status === 'COMPLIANT' ||
    status === 'PARTIALLY_COMPLIANT' ||
    status === 'NON_COMPLIANT' ||
    status === 'NOT_APPLICABLE'
  );
}

const SHORT_TITLE_MAX = 96;

function truncateHeading(text: string, max = SHORT_TITLE_MAX): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

/**
 * h2 = texte métier tronqué (description, sinon title) — jamais le code si un texte existe.
 * (i) = texte intégral dès qu’il y a troncature, ou description distincte du title court.
 */
export function assessHeadingAndTooltip(
  title: string,
  description: string | null | undefined,
  code?: string | null,
): {
  heading: string | null;
  tooltipDescription: string | null;
} {
  const t = title.trim() || null;
  const d = description?.trim() || null;
  const c = code?.trim() || null;
  if (!t && !d) {
    return { heading: c, tooltipDescription: null };
  }

  // Title court distinct de la description → h2 = title, (i) = description
  if (t && d && t !== d && t.length <= SHORT_TITLE_MAX) {
    return { heading: t, tooltipDescription: d };
  }

  const source = d || t!;
  const heading = truncateHeading(source);
  const tooltipDescription = heading.endsWith('…') ? source : null;

  return { heading, tooltipDescription };
}

function ComplianceInfoTip({
  description,
  ariaLabel,
}: {
  description: string;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const tipId = useId();

  return (
    <div
      className="relative shrink-0"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--control-radius,999px)] text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:size-9"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={open ? tipId : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
      >
        <Info className="size-4" aria-hidden />
      </button>
      {open ? (
        <div
          id={tipId}
          role="tooltip"
          className="absolute right-0 top-[calc(100%+6px)] z-30 w-[min(calc(100vw-3rem),22rem)] max-h-[min(50dvh,20rem)] overflow-y-auto rounded-[var(--radius-md)] border border-border bg-card p-3 text-left text-xs font-medium leading-relaxed text-foreground shadow-[var(--shadow-3)]"
        >
          {description}
        </div>
      ) : null}
    </div>
  );
}

/** Badges + titre court en h2 ; (i) = description au hover ; sélecteur de langue optionnel. */
export function ComplianceAssessHeader({
  frameworkName,
  code,
  title,
  description,
  availableLocales,
  contentLocale,
  onContentLocaleChange,
  localePending,
}: {
  frameworkName: string;
  code: string;
  title: string;
  description: string | null | undefined;
  availableLocales?: string[];
  contentLocale?: string;
  onContentLocaleChange?: (locale: string) => void;
  localePending?: boolean;
}) {
  const { heading, tooltipDescription } = assessHeadingAndTooltip(
    title,
    description,
    code,
  );

  const locales =
    availableLocales && availableLocales.length > 0
      ? availableLocales
      : ['fr'];
  const activeLocale = contentLocale?.trim().toLowerCase() || 'fr';
  const showLocaleSelect = Boolean(onContentLocaleChange) && locales.length > 1;

  return (
    <header className="relative z-10 shrink-0 overflow-visible border-b border-border/70 bg-background px-5 pr-14 pb-4 pt-5 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex max-w-full truncate rounded-md bg-muted px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">
          {frameworkName}
        </span>
        <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-[11px] font-extrabold tabular-nums text-muted-foreground">
          {code}
        </span>
        {showLocaleSelect ? (
          <label className="ml-auto flex min-h-11 items-center gap-2 sm:min-h-9">
            <span className="sr-only">Langue du texte de l’exigence</span>
            <select
              className="h-11 min-w-[7.5rem] rounded-[var(--control-radius,999px)] border border-input bg-background px-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:h-9"
              value={locales.includes(activeLocale) ? activeLocale : locales[0]}
              disabled={localePending}
              aria-label="Langue du texte de l’exigence"
              onChange={(e) => onContentLocaleChange?.(e.target.value)}
            >
              {locales.map((loc) => (
                <option key={loc} value={loc}>
                  {localeOptionLabel(loc)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <div className="mt-2.5 flex min-w-0 items-start gap-2">
        {heading ? (
          <h2 className="min-w-0 flex-1 line-clamp-2 text-lg font-extrabold leading-snug tracking-tight text-foreground sm:text-xl">
            {heading}
          </h2>
        ) : (
          <h2 className="sr-only">{code}</h2>
        )}
        {tooltipDescription ? (
          <ComplianceInfoTip
            description={tooltipDescription}
            ariaLabel="Voir la description de l’exigence"
          />
        ) : null}
      </div>
    </header>
  );
}

function localeOptionLabel(locale: string): string {
  switch (locale.toLowerCase()) {
    case 'fr':
      return 'Français';
    case 'en':
      return 'English';
    case 'de':
      return 'Deutsch';
    case 'es':
      return 'Español';
    case 'it':
      return 'Italiano';
    case 'nl':
      return 'Nederlands';
    default:
      return locale.toUpperCase();
  }
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
