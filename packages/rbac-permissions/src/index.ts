/**
 * RFC-ACL-015 — vocabulaire OWN / SCOPE / ALL et règles de satisfaction RBAC **avant** RFC-ACL-016 / RFC-ACL-018.
 *
 * **Guards** : utiliser exclusivement `satisfiesPermission` (pas de `Set.has` direct sur les codes requis).
 * L’expansion guard est **volontairement restrictive** : `read_scope` / `read_own` ne valident **pas** un
 * legacy `*.read` tant qu’aucun filtrage périmètre n’est branché sur les routes concernées.
 *
 * **UI** : `expandForUi` / `uiPermissionHintsArray` / `evaluateAccessIntentForUi` servent au **front** ;
 * ils ne constituent **pas** une preuve d’autorisation backend.
 */

export {
  SCOPED_READ_MODULES,
  MANAGE_ALL_IMPLIES_DELETE_MODULES,
  satisfiesPermission,
  type ScopedReadModule,
} from './catalog';

import {
  SCOPED_READ_MODULES,
  MANAGE_ALL_IMPLIES_DELETE_MODULES,
  satisfiesPermission,
  type ScopedReadModule,
} from './catalog';

export { evaluateReadRbacIntent, type ReadRbacIntentResult } from './read-intent';
export {
  evaluateWriteRbacIntent,
  type WriteIntent,
  type WriteRbacIntentResult,
} from './write-intent';
export {
  evaluateAccessIntentForUi,
  getIntentPermissionCandidates,
  type AccessIntentKindUi,
  type AccessIntentUiResult,
  type EvaluateAccessIntentForUiOptions,
} from './access-intent-ui';

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

const ACCESS_MODEL_SCOPED_SUFFIXES = ['.read_scope', '.read_own', '.write_scope'] as const;

export function isAccessModelScopedPermission(code: string): boolean {
  return ACCESS_MODEL_SCOPED_SUFFIXES.some((s) => code.endsWith(s));
}

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

export function satisfiesAnyPermission(
  userCodes: ReadonlySet<string>,
  candidates: readonly string[],
): boolean {
  return candidates.some((c) => satisfiesPermission(userCodes, c));
}

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
