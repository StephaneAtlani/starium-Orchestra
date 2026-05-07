/**
 * Helpers cockpit licences — RFC-ACL-010.
 *
 * Source unique des libellés métier, statuts d'expiration et agrégations,
 * pour éviter la duplication entre cockpit client et cockpit plateforme.
 */

export type LicenseType = 'READ_ONLY' | 'READ_WRITE' | string;
export type LicenseBillingMode =
  | 'CLIENT_BILLABLE'
  | 'EXTERNAL_BILLABLE'
  | 'NON_BILLABLE'
  | 'PLATFORM_INTERNAL'
  | 'EVALUATION'
  | string;

export interface LicenseSubject {
  licenseType: LicenseType;
  licenseBillingMode: LicenseBillingMode;
  licenseStartsAt?: string | null;
  licenseEndsAt?: string | null;
  licenseAssignmentReason?: string | null;
}

export type ExpirationKind = 'none' | 'active' | 'soon' | 'expired';

export interface ExpirationStatus {
  kind: ExpirationKind;
  daysRemaining: number | null;
  /** Libellé court — ex. `expire dans 5 jours`, `expirée le 12/04/2026`. */
  humanLabel: string;
}

const SOON_THRESHOLD_DAYS = 14;

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function formatDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return DATE_FMT.format(date);
}

/**
 * Libellé métier complet pour un couple `(type, mode)`.
 * Source unique de vérité affichage.
 */
export function getLicenseDisplayLabel(
  type: LicenseType,
  mode: LicenseBillingMode,
): string {
  if (type === 'READ_ONLY') return 'Lecture seule (illimitée)';
  switch (mode) {
    case 'CLIENT_BILLABLE':
      return 'Lecture/Écriture (facturable)';
    case 'EXTERNAL_BILLABLE':
      return 'Externe (porté hors client)';
    case 'NON_BILLABLE':
      return 'Lecture/Écriture (geste commercial)';
    case 'PLATFORM_INTERNAL':
      return 'Support interne';
    case 'EVALUATION':
      return 'Évaluation 30 jours';
    default:
      return 'Licence Lecture/Écriture';
  }
}

/** Libellé court pour un mode (badge). */
export function getBillingModeShortLabel(mode: LicenseBillingMode): string {
  switch (mode) {
    case 'CLIENT_BILLABLE':
      return 'Facturable';
    case 'EXTERNAL_BILLABLE':
      return 'Externe';
    case 'NON_BILLABLE':
      return 'Non facturable';
    case 'PLATFORM_INTERNAL':
      return 'Support interne';
    case 'EVALUATION':
      return 'Évaluation';
    default:
      return 'Mode inconnu';
  }
}

/** True si le mode peut porter une date d'expiration métier. */
export function isModeWithExpiration(mode: LicenseBillingMode): boolean {
  return mode === 'EVALUATION' || mode === 'PLATFORM_INTERNAL';
}

/**
 * Statut d'expiration calculé à partir de `licenseEndsAt`.
 * Pour les modes sans date significative, retourne `kind: 'none'`.
 */
export function getLicenseExpirationStatus(
  licenseEndsAt: string | null | undefined,
  mode: LicenseBillingMode,
  now: Date = new Date(),
): ExpirationStatus {
  if (!licenseEndsAt) {
    return {
      kind: isModeWithExpiration(mode) ? 'none' : 'none',
      daysRemaining: null,
      humanLabel: 'Sans date de fin',
    };
  }
  const end = new Date(licenseEndsAt).getTime();
  if (Number.isNaN(end)) {
    return { kind: 'none', daysRemaining: null, humanLabel: 'Date invalide' };
  }
  const diffMs = end - now.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (days < 0) {
    return {
      kind: 'expired',
      daysRemaining: days,
      humanLabel: `expirée le ${formatDate(licenseEndsAt)}`,
    };
  }
  if (days <= SOON_THRESHOLD_DAYS) {
    return {
      kind: 'soon',
      daysRemaining: days,
      humanLabel:
        days === 0
          ? "expire aujourd'hui"
          : days === 1
            ? 'expire demain'
            : `expire dans ${days} jours`,
    };
  }
  return {
    kind: 'active',
    daysRemaining: days,
    humanLabel: `expire le ${formatDate(licenseEndsAt)}`,
  };
}

/**
 * Badge métier complet d'un membre — combine libellé licence + expiration.
 * Ex. `Évaluation 30 jours — expire dans 5 jours`.
 */
export function formatLicenseBadge(member: LicenseSubject): string {
  const base = getLicenseDisplayLabel(
    member.licenseType,
    member.licenseBillingMode,
  );
  if (!isModeWithExpiration(member.licenseBillingMode)) return base;
  const status = getLicenseExpirationStatus(
    member.licenseEndsAt,
    member.licenseBillingMode,
  );
  if (status.kind === 'none') return base;
  return `${base} — ${status.humanLabel}`;
}

export interface BillingDistribution {
  readOnly: number;
  clientBillable: number;
  externalBillable: number;
  nonBillable: number;
  platformInternal: number;
  evaluation: number;
}

/** Distribution par couple type / mode (read-only et chacun des modes RW). */
export function aggregateBillingDistribution(
  members: LicenseSubject[],
): BillingDistribution {
  const dist: BillingDistribution = {
    readOnly: 0,
    clientBillable: 0,
    externalBillable: 0,
    nonBillable: 0,
    platformInternal: 0,
    evaluation: 0,
  };
  for (const m of members) {
    if (m.licenseType === 'READ_ONLY') {
      dist.readOnly += 1;
      continue;
    }
    switch (m.licenseBillingMode) {
      case 'CLIENT_BILLABLE':
        dist.clientBillable += 1;
        break;
      case 'EXTERNAL_BILLABLE':
        dist.externalBillable += 1;
        break;
      case 'NON_BILLABLE':
        dist.nonBillable += 1;
        break;
      case 'PLATFORM_INTERNAL':
        dist.platformInternal += 1;
        break;
      case 'EVALUATION':
        dist.evaluation += 1;
        break;
    }
  }
  return dist;
}

/** Compte les expirations à venir et déjà expirées sur l'ensemble des membres. */
export function countExpirations(
  members: LicenseSubject[],
  now: Date = new Date(),
): { soon: number; expired: number } {
  let soon = 0;
  let expired = 0;
  for (const m of members) {
    if (!isModeWithExpiration(m.licenseBillingMode)) continue;
    const s = getLicenseExpirationStatus(
      m.licenseEndsAt,
      m.licenseBillingMode,
      now,
    );
    if (s.kind === 'soon') soon += 1;
    if (s.kind === 'expired') expired += 1;
  }
  return { soon, expired };
}
