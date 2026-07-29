/**
 * Tons sémantiques partagés pour cartes / barres / tableaux portefeuille.
 * Tokens uniquement — jamais de hex en feature.
 */

export type StatusTone = 'ok' | 'warn' | 'danger' | 'info' | 'muted' | 'brand';

/** Accent latéral de carte (`.starium-portfolio-card__accent--*`). */
export function toneAccentClass(tone: StatusTone): string {
  return `starium-portfolio-card__accent starium-portfolio-card__accent--${tone}`;
}

/** Pastille icône (fond teinté + texte). */
export function toneIconClass(tone: StatusTone): string {
  switch (tone) {
    case 'ok':
      return 'bg-[color:var(--state-success)]/10 text-[color:var(--state-success)]';
    case 'warn':
      return 'bg-[color:var(--state-warning)]/12 text-[color:var(--state-warning)]';
    case 'danger':
      return 'bg-destructive/10 text-destructive';
    case 'info':
      return 'bg-[color:var(--state-info)]/12 text-[color:var(--state-info)]';
    case 'brand':
      return 'bg-[color:var(--brand-gold-050)] text-[color:var(--brand-gold-700)]';
    case 'muted':
    default:
      return 'bg-muted text-muted-foreground';
  }
}

/** Badge / pill de statut. */
export function toneBadgeClass(tone: StatusTone): string {
  switch (tone) {
    case 'ok':
      return 'border-0 bg-[color:var(--state-success)]/10 text-[color:var(--state-success)]';
    case 'warn':
      return 'border-0 bg-[color:var(--state-warning)]/12 text-[color:var(--state-warning)]';
    case 'danger':
      return 'border-0 bg-destructive/10 text-destructive';
    case 'info':
      return 'border-0 bg-[color:var(--state-info)]/12 text-[color:var(--state-info)]';
    case 'brand':
      return 'border-0 bg-[color:var(--brand-gold-050)] text-[color:var(--brand-gold-700)]';
    case 'muted':
    default:
      return 'border-0 bg-muted text-muted-foreground';
  }
}

/** Remplissage barre `.starium-progress-fill--*`. */
export function toneProgressFillClass(tone: StatusTone): string {
  switch (tone) {
    case 'ok':
      return 'starium-progress-fill starium-progress-fill--ok';
    case 'warn':
      return 'starium-progress-fill starium-progress-fill--warn';
    case 'danger':
      return 'starium-progress-fill starium-progress-fill--danger';
    case 'info':
      return 'starium-progress-fill starium-progress-fill--info';
    case 'brand':
      return 'starium-progress-fill starium-progress-fill--brand';
    case 'muted':
    default:
      return 'starium-progress-fill starium-progress-fill--muted';
  }
}

/** Texte / montant accentué. */
export function toneAmountClass(tone: StatusTone): string {
  switch (tone) {
    case 'ok':
      return 'text-[color:var(--state-success)]';
    case 'warn':
      return 'text-[color:var(--state-warning)]';
    case 'danger':
      return 'text-destructive';
    case 'info':
      return 'text-[color:var(--state-info)]';
    case 'brand':
      return 'text-[color:var(--brand-gold-700)]';
    case 'muted':
    default:
      return 'text-muted-foreground';
  }
}

/** Badge DS (`starium-ds-badge--*`). */
export function toneDsBadgeClass(tone: StatusTone): string {
  switch (tone) {
    case 'ok':
      return 'starium-ds-badge starium-ds-badge--success';
    case 'warn':
      return 'starium-ds-badge starium-ds-badge--warn';
    case 'danger':
      return 'starium-ds-badge starium-ds-badge--danger';
    case 'info':
      return 'starium-ds-badge starium-ds-badge--info';
    case 'brand':
      return 'starium-ds-badge starium-ds-badge--warn';
    case 'muted':
    default:
      return 'starium-ds-badge starium-ds-badge--neutral';
  }
}

/**
 * Tone d’exécution budgétaire / consommation.
 * rate = ratio 0–1+ (ex. consumptionRate).
 */
export function consumptionTone(rate: number | null | undefined): StatusTone {
  if (rate == null || !Number.isFinite(rate)) return 'muted';
  if (rate >= 1) return 'danger';
  if (rate >= 0.8) return 'warn';
  return 'info';
}
