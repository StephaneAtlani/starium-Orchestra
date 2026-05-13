/**
 * RFC-ACL-016 — Résolution du scope organisationnel.
 *
 * Types publics consommés par `OrganizationScopeService` et par les futurs appelants
 * (`AccessDecisionService` RFC-ACL-018, `AccessExplainer` RFC-ACL-019).
 *
 * Le service ne dépend **pas** de `@starium-orchestra/rbac-permissions` :
 * la sémantique RBAC reste à la charge de l'appelant (cf. `hasAllOverride`).
 */

import type { RequestWithClient } from '../types/request-with-client';

/** Verdict de périmètre organisationnel — priorité absolue : `ALL` > `OWN` > `SCOPE` > `NONE`. */
export type OrgScopeLevel = 'NONE' | 'OWN' | 'SCOPE' | 'ALL';

/**
 * Codes stables de diagnostic. Cumulés dans `OrgScopeVerdict.reasonCodes` pour expliquer le verdict
 * (en particulier `NONE` qui agrège OWN + SCOPE). Toute évolution = changement de contrat documenté.
 */
export type OrgScopeReasonCode =
  | 'ALL_RBAC_OVERRIDE'
  | 'ALL_OVERRIDE'
  | 'OWN_SELF_MATCH'
  | 'OWN_NO_RESOURCE_LINK'
  | 'OWN_NO_HINT'
  | 'OWN_MISMATCH'
  | 'SCOPE_DESCENDANT_MATCH'
  | 'SCOPE_DIRECT_MATCH'
  | 'SCOPE_NO_MEMBERSHIPS'
  | 'SCOPE_NO_RESOURCE_LINK'
  | 'SCOPE_OUT_OF_SUBTREE'
  | 'SCOPE_OWNER_ORG_UNIT_INACTIVE'
  | 'MISSING_OWNER_ORG_UNIT';

/**
 * Sous-union dédiée au court-circuit ALL : empêche d'utiliser un code OWN/SCOPE comme `allReasonCode`
 * (vérification TypeScript via `tsc --noEmit`).
 * - `ALL_RBAC_OVERRIDE` : motivé par une permission `*.read_all` / `*.manage_all` (cas normal).
 * - `ALL_OVERRIDE` : libellé générique (mode debug, override admin plateforme).
 */
export type OrgScopeAllReasonCode = Extract<
  OrgScopeReasonCode,
  'ALL_RBAC_OVERRIDE' | 'ALL_OVERRIDE'
>;

export interface OrgScopeVerdict {
  level: OrgScopeLevel;
  reasonCodes: OrgScopeReasonCode[];
}

/** Contexte HUMAN de l'utilisateur, mémoïsé par requête (cf. `RequestWithClient.resolvedOrgScopeContext`). */
export interface OrgScopeUserContext {
  /** `ClientUser.resourceId` (HUMAN) pour `(userId, clientId)`. `null` si compte absent ou non lié. */
  resourceId: string | null;
  /** Ids `OrgUnit` correspondant aux memberships actives (période + unité ACTIVE) de la `Resource HUMAN`. */
  membershipOrgUnitIds: ReadonlySet<string>;
}

/** Arbre actif d'un client, mémoïsé par requête (cf. `RequestWithClient.resolvedOrgUnitTreeByClient`). */
export interface OrgScopeOrgUnitTree {
  /** parentId -> ids enfants (`null` = racines). Contient uniquement les unités actives. */
  childrenByParent: Map<string | null, string[]>;
  /** Ids des unités actives (status ACTIVE, archivedAt null). Sert au filtrage du BFS. */
  activeIds: ReadonlySet<string>;
}

export interface ResolveOrgScopeInput {
  clientId: string;
  userId: string;
  resource: {
    /** Direction propriétaire de la ressource (`null` si non rattachée). */
    ownerOrgUnitId: string | null;
    /**
     * Indices spécifiques au module pour évaluer `OWN`. V1 : seul `subjectResourceId` est exploité
     * (cas "la ressource pointe vers la même `Resource HUMAN` que l'utilisateur"). Les autres champs
     * sont ignorés silencieusement, mais conservés ouverts pour les futures stratégies module.
     */
    ownHints?: { subjectResourceId?: string | null };
  };
  /**
   * Court-circuit ALL pré-calculé par l'appelant (`AccessDecisionService` RFC-ACL-018) à partir
   * d'une permission RBAC `*.read_all` / `*.manage_all`. Le service ne lit aucune permission lui-même.
   */
  hasAllOverride?: boolean;
  /**
   * Typage strict V1 : sous-union dédiée aux codes ALL. Défaut : `ALL_RBAC_OVERRIDE`.
   */
  allReasonCode?: OrgScopeAllReasonCode;
  /**
   * Si fourni, active la mémoïsation par requête HTTP (caches `resolvedOrgScopeContext` et
   * `resolvedOrgUnitTreeByClient`). Sans `request`, chaque appel relit Prisma.
   */
  request?: RequestWithClient;
}
