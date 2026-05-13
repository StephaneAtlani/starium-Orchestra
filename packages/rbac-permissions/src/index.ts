/**
 * RFC-ACL-015 — vocabulaire OWN / SCOPE / ALL et règles de satisfaction RBAC **avant** RFC-ACL-016 / RFC-ACL-018.
 *
 * **Guards** : utiliser exclusivement `satisfiesPermission` (pas de `Set.has` direct sur les codes requis).
 * L’expansion guard est **volontairement restrictive** : `read_scope` / `read_own` ne valident **pas** un
 * legacy `*.read` tant qu’aucun filtrage périmètre n’est branché sur les routes concernées.
 *
 * **UI** : `expandForUi` / `uiPermissionHintsArray` servent au **front** (badges, futurs feature flags) ;
 * ils ne constituent **pas** une preuve d’autorisation backend.
 *
 * Équivalences explicites (pré-moteur organisationnel) :
 * - `*.read_all` satisfait legacy `*.read` pour les modules listés dans `SCOPED_READ_MODULES` (même périmètre « global client »).
 * - `*.manage_all` satisfait legacy `*.delete` uniquement pour `projects` et `contracts` (paires catalogue).
 * - `write_scope` ne satisfait **pas** `*.update` legacy ; `read_scope` / `read_own` ne satisfient **pas** `*.read` legacy.
 */

export const SCOPED_READ_MODULES = [
  'budgets',
  'projects',
  'contracts',
  'procurement',
  'strategic_vision',
] as const;

export type ScopedReadModule = (typeof SCOPED_READ_MODULES)[number];

/** `manage_all` implique le legacy `*.delete` pour ces modules uniquement (routes existantes). */
export const MANAGE_ALL_IMPLIES_DELETE_MODULES = [
  'projects',
  'contracts',
] as const;

const MODULE_LABEL_FR: Record<ScopedReadModule, string> = {
  budgets: 'Budgets',
  projects: 'Projets',
  contracts: 'Contrats',
  procurement: 'Procurement',
  strategic_vision: 'Vision stratégique',
};

export type ScopedPermissionSeedRow = {
  moduleCode: string;
  code: string;
  label: string;
};

/** Lignes à upserter (seed) : triplets lecture + écriture périmètre + gestion globale. */
export function getScopedPermissionSeedRows(): ScopedPermissionSeedRow[] {
  const rows: ScopedPermissionSeedRow[] = [];
  for (const m of SCOPED_READ_MODULES) {
    const L = MODULE_LABEL_FR[m];
    rows.push(
      {
        moduleCode: m,
        code: `${m}.read_own`,
        label: `${L} — lecture (périmètre personnel, RFC-ACL-015)`,
      },
      {
        moduleCode: m,
        code: `${m}.read_scope`,
        label: `${L} — lecture (périmètre organisationnel, RFC-ACL-015)`,
      },
      {
        moduleCode: m,
        code: `${m}.read_all`,
        label: `${L} — lecture (ensemble du client, RFC-ACL-015)`,
      },
      {
        moduleCode: m,
        code: `${m}.write_scope`,
        label: `${L} — écriture (périmètre organisationnel, RFC-ACL-015)`,
      },
      {
        moduleCode: m,
        code: `${m}.manage_all`,
        label: `${L} — gestion complète au périmètre client (RFC-ACL-015)`,
      },
    );
  }
  return rows;
}

/**
 * Vérifie si l’utilisateur possède le droit `requiredCode` à partir des codes **bruts** issus des rôles
 * (filtrage module activé appliqué en amont par l’appelant si nécessaire).
 */
export function satisfiesPermission(
  userCodes: ReadonlySet<string>,
  requiredCode: string,
  _context?: unknown,
): boolean {
  if (userCodes.has(requiredCode)) return true;

  for (const m of SCOPED_READ_MODULES) {
    if (requiredCode === `${m}.read` && userCodes.has(`${m}.read_all`)) {
      return true;
    }
  }

  for (const m of MANAGE_ALL_IMPLIES_DELETE_MODULES) {
    if (requiredCode === `${m}.delete` && userCodes.has(`${m}.manage_all`)) {
      return true;
    }
  }

  return false;
}

/** Au moins un des codes `candidates` est satisfait (RequireAnyPermissions). */
export function satisfiesAnyPermission(
  userCodes: ReadonlySet<string>,
  candidates: readonly string[],
): boolean {
  return candidates.some((c) => satisfiesPermission(userCodes, c));
}

/**
 * Codes **additionnels** dérivés pour les guards (pré RFC-016/018) : élargissement global → legacy read,
 * `manage_all` → `delete` documenté. Ne pas utiliser pour l’UI.
 */
export function expandForLegacyGuards(codes: ReadonlySet<string>): Set<string> {
  const out = new Set(codes);
  for (const m of SCOPED_READ_MODULES) {
    if (codes.has(`${m}.read_all`)) out.add(`${m}.read`);
  }
  for (const m of MANAGE_ALL_IMPLIES_DELETE_MODULES) {
    if (codes.has(`${m}.manage_all`)) out.add(`${m}.delete`);
  }
  return out;
}

/**
 * Implications **affichage** entre niveaux de lecture (OWN ⊂ SCOPE ⊂ ALL) — ne pas confondre avec les droits API.
 */
export function expandForUi(codes: ReadonlySet<string>): Set<string> {
  const out = new Set(codes);
  for (const m of SCOPED_READ_MODULES) {
    if (codes.has(`${m}.read_all`)) {
      out.add(`${m}.read_scope`);
      out.add(`${m}.read_own`);
    }
    if (codes.has(`${m}.read_scope`)) {
      out.add(`${m}.read_own`);
    }
  }
  return out;
}

/** Codes présents dans `expandForUi` mais absents des codes bruts (hints uniquement). */
export function uiPermissionHintsArray(rawCodes: readonly string[]): string[] {
  const raw = new Set(rawCodes);
  const expanded = expandForUi(raw);
  const hints: string[] = [];
  for (const c of expanded) {
    if (!raw.has(c)) hints.push(c);
  }
  hints.sort((a, b) => a.localeCompare(b, 'fr'));
  return hints;
}
