'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CirclePlus,
  Clock3,
  FileText,
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
  kind: 'URL' | 'REFERENCE' | 'NOTE';
  label: string;
  icon: typeof FileText;
}> = [
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
 * `tooltipDescription` = texte intégral à déployer dans le corps (troncature ou description distincte).
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

  // Title court distinct de la description → h2 = title, corps = description
  if (t && d && t !== d && t.length <= SHORT_TITLE_MAX) {
    return { heading: t, tooltipDescription: d };
  }

  const source = d || t!;
  const heading = truncateHeading(source);
  const tooltipDescription = heading.endsWith('…') ? source : null;

  return { heading, tooltipDescription };
}

/** Badges + titre (dépliable avec description) ; sélecteur de langue optionnel. */
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
  const titleTrim = title.trim();
  const descTrim = description?.trim() || null;
  const { heading, tooltipDescription } = assessHeadingAndTooltip(
    title,
    description,
    code,
  );
  const canExpand = Boolean(tooltipDescription);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [code, titleTrim, descTrim]);

  const locales =
    availableLocales && availableLocales.length > 0
      ? availableLocales
      : ['fr'];
  const activeLocale = contentLocale?.trim().toLowerCase() || 'fr';
  const showLocaleSelect = Boolean(onContentLocaleChange) && locales.length > 1;

  const distinctDescription =
    expanded &&
    Boolean(titleTrim) &&
    Boolean(descTrim) &&
    titleTrim !== descTrim &&
    titleTrim.length <= SHORT_TITLE_MAX;

  const headingText = expanded
    ? distinctDescription
      ? titleTrim
      : (tooltipDescription ?? heading)
    : heading;

  return (
    <header className="relative z-10 shrink-0 overflow-visible border-b border-border/70 bg-background px-5 pr-14 pb-5 pt-5 sm:px-6">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-[color:var(--brand-gold)]"
        aria-hidden
      />
      <div className="flex items-start gap-3 sm:gap-3.5">
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-[color:var(--brand-gold-050)] text-[color:var(--brand-gold-700)] sm:size-10"
          aria-hidden
        >
          <BookOpen className="size-[18px]" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <span className="starium-overline max-w-full truncate text-muted-foreground">
              {frameworkName}
            </span>
            <span className="inline-flex max-w-full shrink-0 items-center rounded-[var(--radius-pill)] border border-border/70 bg-card px-2.5 py-0.5 text-[11px] font-extrabold tabular-nums tracking-wide text-foreground shadow-[var(--shadow-1)]">
              {code}
            </span>
            {showLocaleSelect ? (
              <label className="ml-auto flex min-h-11 items-center gap-2 sm:min-h-9">
                <span className="sr-only">Langue du texte de l’exigence</span>
                <select
                  className="h-11 min-w-[7.5rem] rounded-[var(--control-radius,999px)] border border-input bg-background px-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:h-9"
                  value={
                    locales.includes(activeLocale) ? activeLocale : locales[0]
                  }
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
          {headingText ? (
            <div className="mt-2.5 flex min-w-0 items-start gap-2">
              <div className="min-w-0 flex-1">
                {expanded && !distinctDescription ? (
                  <div className="max-h-[min(32dvh,14rem)] overflow-y-auto overscroll-contain [scrollbar-width:thin]">
                    <h2 className="text-balance text-sm font-normal leading-snug text-foreground">
                      {headingText}
                    </h2>
                  </div>
                ) : (
                  <h2 className="text-balance text-sm font-normal leading-snug text-foreground">
                    {headingText}
                  </h2>
                )}
                {distinctDescription && tooltipDescription ? (
                  <div className="mt-2 max-h-[min(28dvh,12rem)] overflow-y-auto overscroll-contain text-sm font-medium leading-relaxed text-muted-foreground [scrollbar-width:thin]">
                    {tooltipDescription}
                  </div>
                ) : null}
              </div>
              {canExpand ? (
                <button
                  type="button"
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--control-radius,999px)] text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:size-9"
                  aria-expanded={expanded}
                  aria-label={
                    expanded
                      ? 'Replier le titre et la description'
                      : 'Déplier le titre et la description'
                  }
                  onClick={() => setExpanded((o) => !o)}
                >
                  {expanded ? (
                    <ChevronUp className="size-4" aria-hidden />
                  ) : (
                    <ChevronDown className="size-4" aria-hidden />
                  )}
                </button>
              ) : null}
            </div>
          ) : (
            <h2 className="sr-only">{code}</h2>
          )}
        </div>
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
      className="grid grid-cols-5 gap-1.5"
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
              'flex min-h-11 min-w-0 flex-col items-center justify-center rounded-[var(--radius-md)] border-[1.5px] border-border bg-card px-0.5 py-2 text-center text-[10px] font-bold leading-tight text-muted-foreground transition-[background,border-color,color] duration-150 sm:text-[11px]',
              'hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
              'disabled:pointer-events-none disabled:opacity-50',
              selected &&
                'border-[color:var(--brand-gold)] bg-[color:var(--brand-gold-050)] text-[color:var(--brand-gold-700)]',
            )}
          >
            <span
              className={cn(
                'mb-0.5 block text-sm font-extrabold text-foreground sm:text-base',
                selected && 'text-[color:var(--brand-gold-700)]',
              )}
            >
              {m.level}
            </span>
            <span className="max-w-full truncate px-0.5">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
