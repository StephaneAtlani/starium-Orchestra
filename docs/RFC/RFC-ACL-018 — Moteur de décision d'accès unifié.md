# RFC-ACL-018 — Moteur de décision d’accès unifié

## Statut

**Implémentée** — socle moteur + pilote Projets (lecture/liste) ; extension **write/admin** et modules métier via [RFC-ACL-020](./RFC-ACL-020%20%E2%80%94%20Int%C3%A9gration%20modules%20m%C3%A9tier%20ownership%20et%20scope.md) (activation `ACCESS_DECISION_V2_*`, [RFC-ACL-022](./RFC-ACL-022%20%E2%80%94%20Migration%20backfill%20et%20feature%20flags.md)). Garde-fous licence / abonnement / module / RBAC / org / matrice **017** ; **`sharingFloorAllows = floorAllowed`** ; verdict **`AccessDecisionResult`** → [RFC-ACL-019](./RFC-ACL-019%20%E2%80%94%20Diagnostic%20enrichi%20organisation%20et%20acc%C3%A8s.md).

**Hors périmètre actuel** : adoption HTTP généralisée de **`ResourceAccessDecisionGuard`** sur les contrôleurs (les modules **020** passent par les **services** métier).

## Alignement plan

Référence : [_Plan de déploement Orgnisation et licences](./_Plan%20de%20déploement%20Orgnisation%20et%20licences.md).

| Élément | Valeur |
| --- | --- |
| **Priorité** | **P1** |
| **Ordre recommandé** | **6** |
| **Dépendances (plan)** | RFC-ACL-016, RFC-ACL-017 |
| **Livrables (plan)** | `AccessDecisionService`, `ResourceAccessDecisionGuard`, decorators, filtrage liste, contrôle détail/mutation |

Suite directe de **017** dans la chaîne **017 → 018 → 019**. L’activation progressive en production sur un module métier se fait en **tranche commune** avec [RFC-ACL-020](./RFC-ACL-020%20%E2%80%94%20Int%C3%A9gration%20modules%20m%C3%A9tier%20ownership%20et%20scope.md) + [RFC-ACL-022](./RFC-ACL-022%20%E2%80%94%20Migration%20backfill%20et%20feature%20flags.md) (voir RFC-020 et RFC-022).

## Objectif

Centraliser la décision **autorisé / refusé** pour une intention d’accès (`read`, `write`, `admin`, `list`, …) sur une ressource métier dans un **`AccessDecisionService`** consommé par :

- un **`ResourceAccessDecisionGuard`** Nest (ou extension des guards existants) ;
- des **decorators** (`@RequireAccess({ resourceParam: 'id', intent: 'read' })`) pour réduire la duplication ;
- le **filtrage de listes** (`WHERE` / `filterReadableResourceIds` évolution) ;
- les **mutations** (même verdict que le détail).

### Ordre d’évaluation recommandé (court-circuit)

1. **Authentification** + **client actif** valides.
2. **Licence / abonnement** utilisateur (RFC-ACL-001 / 002) — si bloquant, refus immédiat + `reasonCode`.
3. **Visibilité module** (RFC-ACL-004).
4. **RBAC** : permission requise pour l’intention, incluant suffixe `own|scope|all` (RFC-ACL-015) — si `read_all` accordé, enregistrer quand même si ACL/policy restreint (étape suivante).
5. **Périmètre organisationnel** (RFC-ACL-016) pour les intents `*_own` / `*_scope`.
6. **Politique d’accès ressource** + **ACL** (RFC-ACL-005 + RFC-ACL-017).

Chaque refus / autorisation partielle doit être **justifiable** par une liste ordonnée de `reasonCodes` pour RFC-ACL-019.

---

## 1. Analyse de l’existant

- `ModuleAccessGuard`, `ResourceAclGuard`, services licences, `filterReadableResourceIds` ([RFC-ACL-006](./RFC-ACL-006%20%E2%80%94%20Int%C3%A9gration%20ACL%20dans%20les%20modules%20m%C3%A9tier.md)) — logique **dispersée**.
- Risque de divergence liste vs détail si non unifié.

---

## 2. Hypothèses

- Le service est **stateless** ; pas de cache global cross-tenant.
- Pour **listes paginées**, deux modes : (a) filtre SQL préalable sur IDs autorisés ; (b) post-filtre interdit au-delà de petits jeux — documenter les limites.
- **PLATFORM_ADMIN** : règles existantes (Option A, `X-Client-Id`) inchangées ; le moteur accepte un contexte « impersonation » explicite.

---

## 3. Implémentation (code — V1)

| Élément | Emplacement |
| --- | --- |
| Module Nest | `apps/api/src/modules/access-decision/` (`access-decision.module.ts`) |
| Moteur | `access-decision.service.ts` — `decide`, `assertAllowed`, `filterResourceIdsByAccess` |
| Types verdict | `access-decision.types.ts` (`AccessIntent`, `AccessDecisionResult`) |
| Batch `ownerOrgUnitId` (+ hints OWN V1 vides) | `access-decision.registry.ts` — `loadAccessResources` |
| RBAC lecture scoped | `access-decision.read-intent.ts` — `evaluateReadRbacIntent` |
| Garde-fous licence / abonnement | `membership-access-gates.ts` |
| Matrice policy/ACL | Délégation à `AccessControlService` (`evaluateResourceAccess`, **`evaluateResourceAccessBatch`** avec plancher **par ressource**) ; `resolveAccessPolicies` exposée pour le batch |
| Guard + décorateur | `resource-access-decision.guard.ts`, `require-access.decorator.ts` |
| Pilote Projets | `ProjectsModule` importe `AccessDecisionModule` ; `ProjectsService` — `assertCanReadProject` → `assertAllowed` (intent `read`) ; liste enrichie → `filterResourceIdsByAccess` (intent `list`) |
| Tests | `access-decision.service.spec.ts`, `access-decision.read-intent.spec.ts` ; extension `access-control.service.spec.ts` (batch) |

Refactor progressif des autres contrôleurs / modules : [RFC-ACL-020](./RFC-ACL-020%20%E2%80%94%20Int%C3%A9gration%20modules%20m%C3%A9tier%20ownership%20et%20scope.md).

---

## 4. Hors périmètre

- UI diagnostic (RFC-ACL-019).
- Cockpit agrégé RFC-ACL-021.

---

## 5. Tests

- **Livré (V1)** : specs unitaires `access-decision.service.spec.ts`, `access-decision.read-intent.spec.ts` ; batch policy/ACL dans `access-control.service.spec.ts` (`evaluateResourceAccessBatch`).
- **Suite** : grilles supplémentaires licence × module × combinaisons policy ; tests d’intégration HTTP sur d’autres modules lors du portage [RFC-ACL-020](./RFC-ACL-020%20%E2%80%94%20Int%C3%A9gration%20modules%20m%C3%A9tier%20ownership%20et%20scope.md).

---

## 6. Récapitulatif

RFC-ACL-018 est le **point d’ancrage technique** pour éviter les failles « liste permissive / détail restrictif » et pour intégrer proprement **OWN / SCOPE / ALL**.

---

## 7. Points de vigilance

- **Latence** : éviter N appels au moteur dans une boucle ; utiliser **`filterResourceIdsByAccess`** (batch ressources + policies + ACL) ou étendre le batch côté métier.
- **Compatibilité** : feature flags ([RFC-ACL-022](./RFC-ACL-022%20%E2%80%94%20Migration%20backfill%20et%20feature%20flags.md)) pour activer le guard unifié sur les contrôleurs module par module.
