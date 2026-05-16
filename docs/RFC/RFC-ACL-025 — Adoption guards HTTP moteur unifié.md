# RFC-ACL-025 — Adoption guards HTTP du moteur unifié

## Statut

**📝 Draft** — 2026-05. Suite de [RFC-ACL-018](./RFC-ACL-018%20%E2%80%94%20Moteur%20de%20d%C3%A9cision%20d'acc%C3%A8s%20unifi%C3%A9.md). Complément de [RFC-ACL-020](./RFC-ACL-020%20%E2%80%94%20Int%C3%A9gration%20modules%20m%C3%A9tier%20ownership%20et%20scope.md) (enforcement aujourd’hui dans les **services**).

## Alignement plan

Référence : [_Plan de déploement Orgnisation et licences](./_Plan%20de%20d%C3%A9ploement%20Orgnisation%20et%20licences.md).

| Élément | Valeur |
| --- | --- |
| **Priorité** | **P2** |
| **Ordre recommandé** | **13** — après [RFC-ACL-024](./RFC-ACL-024%20%E2%80%94%20Enforcement%20permissions%20scoped.md) sur au moins un module |
| **Dépendances** | RFC-ACL-018, RFC-ACL-020, RFC-ACL-022 |
| **Livrables** | `ResourceAccessDecisionGuard` sur contrôleurs cibles, metadata param/route, tests e2e, doc adoption |

---

## 1. Analyse de l’existant

- `AccessDecisionService` + `assertAllowed` / `filterResourceIdsByAccess` dans services Projets, Budgets, etc.
- `ResourceAccessDecisionGuard` **exporté** mais **non généralisé** sur les controllers.
- Double risque : oubli d’appel service vs garde-fou HTTP central.

---

## 2. Hypothèses

- Le guard **ne remplace pas** la logique liste (filtrage Prisma) : il **complète** pour `GET :id`, mutations sans passage service, routes annexes.
- Metadata : `@AccessDecision({ resourceType: 'PROJECT', intent: 'read', param: 'id' })`.
- Respect du flag `ACCESS_DECISION_V2_*` : si désactivé, guard no-op (pass-through) — même sémantique que 020.
- Ordre guards : `JwtAuthGuard` → `ActiveClientGuard` → `ModuleAccessGuard` → `PermissionsGuard` → **`ResourceAccessDecisionGuard`**.

---

## 3. Fichiers à créer / modifier

| Fichier | Action |
| --- | --- |
| `apps/api/src/modules/access-decision/guards/resource-access-decision.guard.ts` | Durcir lecture metadata + registre |
| `apps/api/src/common/decorators/access-decision.decorator.ts` | **Créer** |
| `*.controller.ts` (projects, budgets, …) | Annoter routes read/write/delete |
| Tests | `access-decision.guard.spec.ts`, e2e par module |

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

### 4.3 Périmètre V1 adoption

| Module | Routes cibles |
| --- | --- |
| Projects | `GET :id`, `PATCH :id`, `DELETE :id` |
| Budgets | idem + lignes si route dédiée |
| Contracts, Suppliers, Strategic objectives | CRUD détail |

**Hors V1** : routes liste (déjà filtrées en service), uploads fichiers, webhooks.

### 4.4 Cohabitation service

- Services conservent `filterResourceIdsByAccess` pour listes.
- Guard sur détail : évite IDOR si service oublié.
- Tests : requête avec token `read_scope` + ressource hors périmètre → 403.

---

## 5. Modifications Prisma

**Aucune**.

---

## 6. Tests

- Guard unitaire : metadata manquante → 500 config (fail fast dev) ou skip documenté.
- E2E : flag V2 on/off.
- Pas de régression performance : `decide` déjà optimisé ; éviter double appel guard + service sur même requête (cache request-scoped optionnel).

---

## 7. Récapitulatif

RFC-ACL-025 uniformise la **surface HTTP** avec le moteur 018, réduisant les oublis d’enforcement hors services métier.

---

## 8. Points de vigilance

- Double évaluation (service + guard) : mesurer latence ; introduire cache `AsyncLocalStorage` par requête si besoin.
- Routes batch / import : exclure explicitement du guard ou intent `admin` dédié.
