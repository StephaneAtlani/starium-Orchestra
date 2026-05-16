# RFC-ACL-024 — Généralisation enforcement permissions `OWN` / `SCOPE` / `ALL`

## Statut

**✅ Implémentée (V1)** — 2026-05. Suite de [RFC-ACL-015](./RFC-ACL-015%20%E2%80%94%20Permissions%20OWN%20SCOPE%20ALL.md) (socle vocabulaire livré). S’appuie sur [RFC-ACL-018](./RFC-ACL-018%20%E2%80%94%20Moteur%20de%20d%C3%A9cision%20d'acc%C3%A8s%20unifi%C3%A9.md) et [RFC-ACL-020](./RFC-ACL-020%20%E2%80%94%20Intégration%20modules%20m%C3%A9tier%20ownership%20et%20scope.md).

**Hors scope V1** (prévu ultérieurement) : extension catalogue `documents` / `orders` ; profils « scope-ready » dans `default-profiles.json` ; migration **vague 2** des contrôleurs satellites (`projects/*`, `budget-*`, etc.) ; [RFC-ACL-025](./RFC-ACL-025%20%E2%80%94%20Adoption%20guards%20HTTP%20moteur%20unifi%C3%A9.md) (guard HTTP par `resourceId`).

## Alignement plan

Référence : [_Plan de déploement Orgnisation et licences](./_Plan%20de%20d%C3%A9ploement%20Orgnisation%20et%20licences.md).

| Élément | Valeur |
| --- | --- |
| **Priorité** | **P1** |
| **Ordre recommandé** | **11** — après rollout **020+022** sur le module cible |
| **Dépendances** | RFC-ACL-015, RFC-ACL-016, RFC-ACL-018, RFC-ACL-020, RFC-ACL-022 |

---

## 1. Principe (guard ≤ service)

Le guard HTTP **ne doit jamais** être plus permissif que le service métier.

Un `read_scope` / `write_scope` passe `PermissionsGuard` **uniquement si** :

1. Flag client `ACCESS_DECISION_V2_<MODULE>` actif ;
2. Handler enregistré dans `SERVICE_ENFORCED_REGISTRY` (clé stable `ControllerName.methodName`) ;
3. Le service correspondant appelle déjà `AccessDecisionService` / `filterResourceIdsByAccess` pour l’intent.

Routes **non** enregistrées : legacy strict (`satisfiesPermission` ; `read_all` → `*.read` uniquement) — **même si** le flag V2 est actif.

`create` (V1) : `*.create` ou `*.manage_all` uniquement — **pas** `write_scope`.

---

## 2. Livrables V1 (dépôt)

| Zone | Fichiers / comportement |
| --- | --- |
| **Package** | `packages/rbac-permissions/` — `evaluateReadRbacIntent`, `evaluateWriteRbacIntent`, `evaluateAccessIntentForUi` (UI uniquement) |
| **Registre API** | `apps/api/src/modules/access-decision/access-intent.registry.ts`, `access-intent-enforced-handlers.ts` (`ACCESS_ENFORCED_HANDLERS`, `SERVICE_ENFORCED_REGISTRY`) |
| **Décorateur** | `apps/api/src/common/decorators/require-access-intent.decorator.ts` — `@RequireAccessIntent({ module, intent })` |
| **Guards** | `permissions.guard.ts` (intent + pont `@RequirePermissions` restreint), `module-access.guard.ts` (module visible sans exiger `*.read` sur intent) |
| **Flags** | `FeatureFlagsModule` `@Global()` ; résolution via `FeatureFlagsService` |
| **Contrôleurs vague 1** | `ProjectsController`, `BudgetsController`, `BudgetLinesController`, `ContractsController`, `SuppliersController`, `StrategicVisionController` (objectifs — routes listées dans le registre) |
| **API** | `GET /api/me/permissions` → `accessDecisionV2` (client actif uniquement, informatif UI) |
| **Diagnostics** | `seededNotEnforced` vs `seededButRouteNotMigrated` selon flag V2 et registre |
| **Frontend** | `usePermissions().hasIntent()` ; pilote page projets |
| **Doc** | [ACCESS-MODEL.md](../ACCESS-MODEL.md), [runbook](../runbooks/migration-org-scope-access.md) §6 |

---

## 3. Registre handlers migrés (V1)

Clés stables — **pas** d’URL HTTP. Source : `access-intent-enforced-handlers.ts`.

| Module | Handlers enregistrés (intent) |
| --- | --- |
| `projects` | `list`, `getById` (read) ; `update` (write) ; `remove` (admin) |
| `budgets` | `BudgetsController` + `BudgetLinesController` : `list`, `getById`, `update` |
| `contracts` | `list`, `getOne`, `update`, `remove` |
| `procurement` | `SuppliersController` : `list`, `getById`, `update` |
| `strategic_vision` | `listObjectives`, `listObjectivesByAxis`, `getObjectiveNested`, `updateObjective`, `updateObjectiveNested` |

Toute autre route du module (ex. `ProjectsController.portfolioSummary`) reste `@RequirePermissions` legacy : **pas** d’ouverture scoped au guard.

---

## 4. Matrice guard (résumé)

| Situation | Guard |
| --- | --- |
| `read_scope` + V2 on + handler registre | **OK** |
| `read_scope` + V2 on + route non registre | **Refus** |
| `read_scope` + V2 off | **Refus** |
| `read_all` | **OK** (via `satisfiesPermission`) |
| `write_scope` + V2 on + handler write registre | **OK** |
| `write_scope` sur `create` | **Refus** (legacy `*.create` / `manage_all` seulement) |

---

## 5. Migration profils et rollout

Documentée dans [runbook migration org-scope](../runbooks/migration-org-scope-access.md) §6 — **pas** de migration automatique des profils en prod.

1. Activer le flag module **après** backfill owner + HUMAN (023) sur le client pilote.
2. Valider liste / détail / mutation avec profils SCOPE et ALL.
3. Ajuster les rôles (`read_scope` vs legacy `read`) **après** validation métier.

---

## 6. Tests (dépôt)

- `packages/rbac-permissions` : `index.spec.ts`, `access-intent-ui.spec.ts`
- `access-intent.registry.spec.ts`, `permissions.guard.spec.ts`, `permissions-guard-di.spec.ts`
- `me.service.spec.ts` (`accessDecisionV2` multi-client)

Commande indicative : `pnpm --filter @starium-orchestra/api exec jest access-intent permissions.guard me.service`

---

## 7. Points de vigilance

- Ne pas activer V2 sans backfill (runbook 022 / 023).
- Satellites non migrés : legacy au guard même si flag on.
- `GET /api/access-model/health` reste la source détaillée des flags pour le cockpit admin ; `accessDecisionV2` sur `/me/permissions` est **informatif** pour l’UI métier.
- Suite : [RFC-ACL-025](./RFC-ACL-025%20%E2%80%94%20Adoption%20guards%20HTTP%20moteur%20unifi%C3%A9.md) (guard par `resourceId`).
