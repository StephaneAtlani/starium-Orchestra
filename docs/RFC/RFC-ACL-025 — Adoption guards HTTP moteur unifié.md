# RFC-ACL-025 — Adoption guards HTTP du moteur unifié

## Statut

**✅ Implémentée (V1)** — 2026-05. Suite de [RFC-ACL-018](./RFC-ACL-018%20%E2%80%94%20Moteur%20de%20d%C3%A9cision%20d'acc%C3%A8s%20unifi%C3%A9.md). Complément de [RFC-ACL-020](./RFC-ACL-020%20%E2%80%94%20Int%C3%A9gration%20modules%20m%C3%A9tier%20ownership%20et%20scope.md) (enforcement dans les **services** + garde-fou HTTP).

## Alignement plan

Référence : [_Plan de déploement Orgnisation et licences](./_Plan%20de%20d%C3%A9ploement%20Orgnisation%20et%20licences.md).

| Élément | Valeur |
| --- | --- |
| **Priorité** | **P2** |
| **Ordre recommandé** | **13** — après [RFC-ACL-024](./RFC-ACL-024%20%E2%80%94%20Enforcement%20permissions%20scoped.md) sur au moins un module |
| **Dépendances** | RFC-ACL-018, RFC-ACL-020, RFC-ACL-022 |
| **Livrables** | `@AccessDecision`, `ResourceAccessDecisionGuard` sur routes détail/mutation V1, tests unitaires, doc |

---

## 1. Analyse de l’existant (avant V1)

- `AccessDecisionService` + `assertAllowed` / `filterResourceIdsByAccess` dans les services métier (**020**).
- `ResourceAccessDecisionGuard` exporté par `AccessDecisionModule` mais non monté sur les controllers → risque IDOR si oubli service.

**État après V1 (dépôt)** :

- Décorateur [`@AccessDecision`](../../apps/api/src/common/decorators/access-decision.decorator.ts) (clé `REQUIRE_ACCESS_KEY`, alias `@RequireAccess`).
- Guard durci : `decide` (pas `assertAllowed`), flag `ACCESS_DECISION_V2_*`, cache `request.accessDecisionCache`, **403** `ACCESS_DECISION_DENIED`, **500** si metadata invalide.
- Controllers : projects, budgets, budget-lines, contracts, suppliers, strategic-vision (routes détail/mutation du plan).

---

## 2. Hypothèses

- Le guard **ne remplace pas** la logique liste (filtrage Prisma) : il **complète** pour `GET :id`, mutations sans passage service, routes annexes.
- Metadata : `@AccessDecision({ resourceType: 'PROJECT', intent: 'read', resourceIdParam: 'id' })`.
- Respect du flag `ACCESS_DECISION_V2_*` : si désactivé, guard no-op (pass-through) — même sémantique que 020.
- Ordre guards : `JwtAuthGuard` → `ActiveClientGuard` → `ModuleAccessGuard` → `PermissionsGuard` → **`ResourceAccessDecisionGuard`**.

---

## 3. Fichiers à créer / modifier

| Fichier | Action |
| --- | --- |
| `apps/api/src/modules/access-decision/resource-access-decision.guard.ts` | Durcir : flag V2, `decide`, cache requête, 403 structuré |
| `apps/api/src/modules/access-decision/resolve-v2-flag-key.ts` | Mapping `resourceType` → `ACCESS_DECISION_V2_*` |
| `apps/api/src/common/decorators/access-decision.decorator.ts` | **Créer** |
| `*.controller.ts` (projects, budgets, …) | Annoter routes read/write/delete |
| Tests | `resource-access-decision.guard.spec.ts`, `resolve-v2-flag-key.spec.ts`, DI guard |

---

## 4. Implémentation

### 4.1 Decorator

```typescript
@AccessDecision({
  resourceType: 'PROJECT',
  intent: 'read', // read | write | admin
  resourceIdParam: 'id',
})
@Get(':id')
findOne(...) {}
```

### 4.2 Guard

- Résoudre `clientId`, `userId`, `resourceId` depuis route/body.
- Appeler `accessDecisionService.decide(...)` avec intent.
- `ForbiddenException` + code stable `ACCESS_DECISION_DENIED` (aligné diagnostic 019).
- Logger debug si flag V2 off (skip).

### 4.3 Périmètre V1 adoption (livré)

| Module | Controller | Routes | `resourceType` |
| --- | --- | --- | --- |
| projects | `ProjectsController` | `GET/PATCH/DELETE :id` | `PROJECT` |
| budgets | `BudgetsController` | `GET/PATCH :id` | `BUDGET` |
| budgets | `BudgetLinesController` | `GET/PATCH :id` | `BUDGET_LINE` |
| contracts | `ContractsController` | `GET/PATCH/DELETE :id` | `CONTRACT` |
| procurement | `SuppliersController` | `GET/PATCH :id` | `SUPPLIER` |
| strategic_vision | `StrategicVisionController` | `GET/PATCH/DELETE …/objectives/:objectiveId`, `PATCH strategic-objectives/:id` | `STRATEGIC_OBJECTIVE` |

Mapping flag : `resolve-v2-flag-key.ts` → `RESOURCE_DIAGNOSTICS_REGISTRY.moduleCode` → `ACCESS_DECISION_V2_*` (ex. `BUDGET_LINE` → `ACCESS_DECISION_V2_BUDGETS`).

**Hors V1** : listes, `bulk-status`, uploads logo, routes satellites `projects/*`, webhooks.

### 4.4 Cohabitation service

- Services conservent `filterResourceIdsByAccess` pour listes.
- Guard sur détail : évite IDOR si service oublié.
- Tests : requête avec token `read_scope` + ressource hors périmètre → 403.

---

## 5. Modifications Prisma

**Aucune**.

---

## 6. Tests

- Guard unitaire : metadata absente → pass-through ; `resourceType` / flag introuvable → **500** ; refus métier → **403** `ACCESS_DECISION_DENIED`.
- Tests : `resource-access-decision.guard.spec.ts`, `resolve-v2-flag-key.spec.ts`, DI guard.
- Cache `request.accessDecisionCache` pour limiter le double appel guard + service (V1).

---

## 7. Récapitulatif

RFC-ACL-025 uniformise la **surface HTTP** avec le moteur 018, réduisant les oublis d’enforcement hors services métier.

---

## 8. Points de vigilance

- Double évaluation (service + guard) : cache `accessDecisionCache` sur la requête HTTP (V1).
- `assertAllowed` inchangé ; harmonisation 403 structuré côté service = chantier séparé.
- Config invalide (`resourceType` inconnu) : **500** fail-fast, jamais 403.
- Routes batch / import : exclure explicitement du guard ou intent `admin` dédié.
