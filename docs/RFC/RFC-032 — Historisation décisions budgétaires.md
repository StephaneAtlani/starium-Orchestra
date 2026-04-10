# RFC-032 — Historisation des décisions budgétaires

## Statut

**Implémenté (MVP)** — lecture enrichie via `BudgetDecisionHistoryService` (Prisma `AuditLog`), route `GET /api/budgets/:budgetId/decision-history` sur `BudgetsController`, audits sémantiques §4.1.5 dans `budgets.service` / `budget-lines.service`, UI onglet « Décisions » sur `/budgets/[budgetId]`.

## Priorité

Haute (gouvernance CODIR, traçabilité des arbitrages et du prévisionnel)

## Dépendances

* [RFC-013 — Audit logs](./RFC-013%20%E2%80%94%20Audit%20logs.md) — modèle `AuditLog` et service `AuditLogsService`
* [RFC-015-2 — Budget Management Backend](./RFC-015-2%20%E2%80%94%20Budget%20Management%20Backend.md)
* [RFC-023 — Budget Prévisionnel (Planning & Atterrissage)](./RFC-023%20%E2%80%94%20Budget%20Pr%C3%A9visionnel%20(Planning%20%26%20Atterrissage).md)
* [RFC-030 — Budget Forecast & Comparaison](./RFC-030%20%E2%80%94%20Budget%20Forecast%20%26%20Comparaison%20Budg%C3%A9taire.md) (écarts prév. / rév.)
* [RFC-031 — Budget Snapshots MVP](./RFC-031%20%E2%80%94%20Budget%20Snapshots%20MVP%20(fig%C3%A9,%20lecture%20seule).md) — **ne remplace pas** l’historique décisionnel (photo figée vs journal d’événements)
* [RFC-019 — Budget Versioning](./RFC-019%20%E2%80%94%20Budget%20Versioning.md) — filiation des versions ; événements de versioning déjà partiellement audités
* Alignement pattern audit métier : [RFC-PROJ-009 — Audit Logs Projet](./RFC-PROJ-009%20%E2%80%94%20Audit%20Logs%20Projet.md)
* UI : [docs/FRONTEND_UI-UX.md](../FRONTEND_UI-UX.md) — états loading / error / empty ; affichage **libellés métier**, pas d’ID brut

## Périmètre MVP (verrouillé)

* **V1 = aucune nouvelle table** ; stockage **uniquement** via `AuditLog` existant.
* **Pas** de refonte transverse du module `audit-logs` (pas de nouveaux helpers génériques obligatoires, pas d’évolution de contrat `AuditLogsService` imposée par cette RFC).
* **Pas** de modèle `BudgetDecisionEvent` ni équivalent dédié.
* Index Prisma sur `AuditLog` : **hors MVP** — optimisation ultérieure si mesures de perf. l’exigent.

---

# 1. Analyse de l’existant

## 1.1 Modèle de données

* Table unique **`AuditLog`** (`clientId`, `userId`, `action`, `resourceType`, `resourceId`, `oldValue`, `newValue`, métadonnées requête, `createdAt`) — voir schéma Prisma `apps/api/prisma/schema.prisma`.
* Le MVP d’historisation décisionnelle **s’appuie exclusivement** sur ce journal ; pas d’autre persistance.

## 1.2 Ce qui est déjà tracé (backend)

Implémentations repérées dans `apps/api/src/modules/budget-management/` et apparentés :

| Domaine | Actions typiques | `resourceType` |
| --- | --- | --- |
| Budget | `budget.created`, `budget.updated` | `budget` |
| Enveloppe | `budget_envelope.created`, `budget_envelope.updated` | `budget_envelope` |
| Ligne | `budget_line.created`, `budget_line.updated` | `budget_line` |
| Prévisionnel (planning) | `budget_line.planning.updated`, `budget_line.planning.applied_mode`, `budget_line.planning.previewed` | `budget_line` |
| Exercice | `budget_exercise.created`, `budget_exercise.updated` | `budget_exercise` |
| Versioning budget | actions dans `budget-versioning.service.ts` | `budget` |
| Consultation forecast | `budget.forecast.viewed` | selon implémentation |

Les mises à jour « larges » (`*.updated`) portent souvent un **diff** ou un snapshot partiel dans `oldValue` / `newValue` selon le service.

## 1.3 Lacunes fonctionnelles

1. **Pas de vue « décisions »** dédiée côté produit : l’utilisateur métier ne parcourt pas `AuditLog` brut ; il lui faut une **chronologie lisible** (qui / quoi / quand / pourquoi implicite via libellés).
2. **Granularité des statuts (budget / ligne)** : transitions `BudgetStatus` et `BudgetLineStatus` — souvent noyées dans `budget.updated` / `budget_line.updated` sans action sémantique dédiée (`budget.status.changed`, `budget_line.status.changed`). **Enveloppes** : pas d’événement sémantique « statut enveloppe » au MVP (voir §4.1.2).
3. **Montants décisionnels** : révisé, prévisionnel, planning — besoin d’**actions ciblées** ou de **résumés** issus des payloads existants, sans journaliser les recalculs techniques automatiques (voir §4.1.3).
4. **Agrégation par périmètre** : historique au niveau **budget** (et filtres enveloppe / ligne) avec **enrichissement** (noms, codes) — l’API `GET /audit-logs` **ne** suffit **pas** pour l’usage métier **sans** dépendre de `audit_logs.read` ; d’où l’endpoint métier dédié (§4.3).
5. **Permissions** : lecture historique **alignée sur le module Budget** — `budgets.read` **uniquement** pour le MVP (pas de dépendance à `audit_logs.read`).

## 1.4 Distinction avec d’autres notions

| Mécanisme | Rôle |
| --- | --- |
| **Snapshot** (RFC-031) | État figé à une date — comparaison / preuve |
| **Versioning** (RFC-019) | Lignée de versions d’un même budget métier |
| **Financial Events / Timeline FE** ([RFC-FE-026](./RFC-FE-026%20%E2%80%94%20Financial%20Events%20Timeline.md)) | Flux financiers (engagements, factures, etc.) |
| **Historique décisions (cette RFC)** | Journal des **choix et arbitrages** (statuts, prévisionnel, montants clés, report d’exercice) ; les flux **bulk** / **import** ne sont reflétés que par les **lignes d’audit réellement émises** (voir §4.1.4). |

---

# 2. Hypothèses éventuelles

1. **H1** — Le MVP **ne crée aucune table** hors `AuditLog` ; une table d’événements dédiée ou un snapshot BI relève du **hors scope MVP** (voir §« Hors scope MVP »).
2. **H2** — Les actions suivent la convention `<ressource>.<événement>` (RFC-013 / RFC-PROJ-009) ; un fichier **`budget-audit.constants.ts`** centralise les chaînes **budgétaires** retenues pour filtres et `summary`.
3. **H3** — L’UI affiche **prénom/nom ou email** de l’acteur (jointure `User`), **jamais** `userId` seul en libellé principal.
4. **H4** — Aujourd’hui, le **bulk** statuts budgets appelle `update` en boucle : **N** entrées d’audit (`budget.updated` / futur `budget.status.changed`), **pas** d’entrée agrégée `budget.bulk_status.applied`. **Ne pas inventer** cette action au MVP **sauf** si une ligne d’audit agrégée cohérente est ajoutée **volontairement** dans le service bulk (hors périmètre minimal actuel). Même principe pour l’import : les actions existantes sont `budget_import.*` / `resourceType` import ; l’inclusion dans la timeline **par budget** est traitée au §4.1.4.

---

# 3. Liste des fichiers à créer / modifier

## 3.1 Backend

| Fichier | Action |
| --- | --- |
| `apps/api/src/modules/budget-management/budget-audit.constants.ts` | **Créé** — liste blanche MVP `BUDGET_DECISION_HISTORY_ACTIONS` + filtres `actions[]` |
| `apps/api/src/modules/budget-management/budget-decision-history.service.ts` | **Créé** — requête paginée `AuditLog` (OR budget / enveloppes / lignes du budget) + enrichissement acteur / contexte |
| `apps/api/src/modules/budget-management/budget-decision-history-summary.ts` | **Créé** — `buildDecisionHistorySummary` (libellés FR fixes) |
| `apps/api/src/modules/budget-management/budget-decision-history.dto.ts` | **Créé** — query (`envelopeId`, `budgetLineId`, `actions`, `from`/`to`, `limit`/`offset`) + réponse typée |
| `apps/api/src/modules/budget-management/budgets/budgets.controller.ts` | **Modifié** — `GET(':id/decision-history')` **avant** `GET(':id')` (pas de second `@Controller('budgets')`) |
| `apps/api/src/modules/budget-management/budget-management.module.ts` | **Modifié** — provider `BudgetDecisionHistoryService` |
| `apps/api/src/modules/budget-management/budgets/budgets.service.ts` | **Modifié** — `budget.status.changed` vs `budget.updated` (§4.1.5) |
| `apps/api/src/modules/budget-management/budget-envelopes/budget-envelopes.service.ts` | **Non modifié** au MVP (conforme §2.4 plan / §4.1.2) |
| `apps/api/src/modules/budget-management/budget-lines/budget-lines.service.ts` | **Modifié** — `budget_line.status.changed`, `budget_line.deferred`, `budget_line.amounts.updated`, `budget_line.updated` réduit (§4.1.3 / §4.1.5) |
| `apps/api/src/modules/budget-management/budget-lines/budget-line-planning.service.ts` | **Non modifié** — audits `budget_line.planning.*` déjà présents ; inclus dans la whitelist |
| `apps/api/src/modules/budget-management/tests/budget-decision-history.service.spec.ts` | **Créé** — tests unitaires service + summary |
| `apps/api/src/modules/budget-management/tests/budget-decision-history-routes.integration.spec.ts` | **Créé** — dispatch controller → service |
| `apps/api/src/modules/audit-logs/audit-logs.service.ts` | **Non modifié** — lecture `AuditLog` via `PrismaService` dans `BudgetDecisionHistoryService` uniquement |
| `apps/api/prisma/schema.prisma` | **Hors MVP** — index `AuditLog` post-MVP si besoin |

## 3.2 Frontend

| Fichier | Action |
| --- | --- |
| `apps/web/src/features/budgets/components/budget-decision-timeline.tsx` | **Créé** — liste verticale, loading / error / empty |
| `apps/web/src/features/budgets/hooks/use-budget-decision-history.ts` | **Créé** — TanStack Query, clés avec `clientId` |
| `apps/web/src/features/budgets/lib/budget-query-keys.ts` | **Modifié** — clé `budgetDecisionHistory` |
| `apps/web/src/features/budgets/api/budget-management.api.ts` | **Modifié** — `getBudgetDecisionHistory` (seul fichier API pour cet endpoint) |
| `apps/web/src/features/budgets/types/budget-management.types.ts` | **Modifié** — types réponse / query |
| `apps/web/src/features/budgets/types/budget-pilotage.types.ts` | **Modifié** — mode `'decisions'` |
| `apps/web/src/features/budgets/components/budget-view-tabs.tsx` | **Modifié** — onglet « Décisions » |
| `apps/web/src/app/(protected)/budgets/[budgetId]/page.tsx` | **Modifié** — rendu timeline si `pilotageMode === 'decisions'` (pas d’entrée drawer enveloppe/ligne dans ce lot) |

## 3.3 Documentation

| Fichier | Action |
| --- | --- |
| `docs/RFC/_RFC Liste.md` | **Mis à jour** — statut RFC-032 ✅ Implémenté (MVP) |
| `docs/API.md` | **Mis à jour** — ligne tableau guards §5 + référence RFC-032 en tête |
| `docs/ARCHITECTURE.md` | **Mis à jour** — §4.1 noyau budgétaire, lien RFC-032 |

---

# 4. Implémentation complète (spécification)

## 4.0 Implémentation backend (cible MVP)

* **Constantes** : `budget-audit.constants.ts` — liste blanche MVP pour filtres `actions[]` et cohérence avec les `summary` (versioning / import / `budget_line.planning.previewed` exclus du MVP).
* **Lecture** : `BudgetDecisionHistoryService` — requêtes Prisma sur `AuditLog` + enrichissement (acteur, budget, enveloppe, ligne) ; **aucune** dépendance à `AuditLogsService` / `GET /audit-logs` pour l’usage métier.
* **HTTP** : handler **`GET(':id/decision-history')`** sur `BudgetsController` (même module, mêmes guards que les autres routes budgets) ; DTO query `ListBudgetDecisionHistoryQueryDto`.
* **Écriture** : ajustements dans `budgets.service` et `budget-lines.service` pour les actions sémantiques §4.1 — **pas** de refactor global des audits historiques.

## 4.1 Catalogue d’événements « décision » (MVP)

### 4.1.1 Budget (`resourceType: budget`)

| Action | Statut MVP | Détail |
| --- | --- | --- |
| `budget.status.changed` | **Implémenté** | Émis lors d’une transition de statut validée (`assertBudgetStatusTransition`). Voir **§4.1.5** (pas de double audit avec `budget.updated`). |
| `budget.workflow_snapshot.failed` | **Implémenté** | Émis si la création automatique d’une version figée au passage **Soumis** / **Validé** échoue (le statut budget reste appliqué). Voir RFC-033 §1.3 API. |
| `budget.updated` | **Existant** | Conserver. Comportement vis-à-vis du statut : **§4.1.5**. |
| `budget.owner.changed` | **Non retenu** | Le `PATCH` budget accepte `ownerUserId`, mais l’audit `budget.updated` **ne** journalise **pas** aujourd’hui le pilote dans `oldValue`/`newValue`. **MVP** : pas d’action dédiée ; **hors liste** tant que le payload de `budget.updated` n’est pas étendu (évolution mineure possible hors nomenclature d’actions). |

### 4.1.2 Enveloppe (`resourceType: budget_envelope`)

**Alignement modèle actuel** : les enveloppes sont suivies par création / mise à jour globale. **Il n’y a pas** d’action séparée « statut enveloppe » au MVP (ne pas introduire `budget_envelope.status.changed` ; ne pas centrer la doc sur un enum de statut enveloppe).

| Action | Statut MVP | Détail |
| --- | --- | --- |
| `budget_envelope.created` | **Existant** | Conserver. |
| `budget_envelope.updated` | **Existant** | Conserver ; le payload peut refléter un changement de report (`deferredToExerciseId`) **ou** d’autres champs métier. |
| `budget_envelope.deferred` | **Optionnel** | **Uniquement** si le service émet explicitement une ligne d’audit dédiée lors d’un report vers un autre exercice ; **sinon** le report **reste** visible via `budget_envelope.updated` (résumé côté `decision-history`). |

### 4.1.3 Ligne (`resourceType: budget_line`)

| Action | Statut MVP | Détail |
| --- | --- | --- |
| `budget_line.status.changed` | **Implémenté** | Transition de statut ligne ; **§4.1.5** avec `budget_line.updated`. |
| `budget_line.deferred` | **Implémenté** | Report d’exercice (`deferredToExerciseId` / statut) — pas de duplication du delta dans `budget_line.updated` dans la même requête. |
| `budget_line.amounts.updated` | **Implémenté (ciblé)** | **Uniquement** si `dto.revisedAmount` est présent **et** changement effectif sur `revisedAmount` — **pas** pour recalculs serveur (`remainingAmount`, `consumedAmount`, etc.). |
| `budget_line.planning.updated` | **Existant** | Conserver. |
| `budget_line.planning.applied_mode` | **Existant** | Conserver. |
| `budget_line.updated` | **Existant** | Conserver pour les champs non couverts par les actions ci-dessus. Comportement vis-à-vis du statut : **§4.1.5**. |

### 4.1.4 Import, bulk, réallocation

| Sujet | MVP |
| --- | --- |
| **Réallocation** ([RFC-017](./RFC-017%20%E2%80%94%20Budget%20Reallocation.md)) | **Hors périmètre minimal** de la liste d’actions §4.1 **sauf** si déjà audité sous une action stable ; pas de nouvelle exigence MVP. |
| **`budget.bulk_status.applied`** | **Non** : le bulk budget appelle `update` par id → **plusieurs** audits, pas une entrée agrégée cohérente **sans** évolution dédiée du service. |
| **Import** | Aujourd’hui : `budget_import.executed` / `budget_import.failed`, `resourceType` `budget_import_job`, `resourceId` = id job ; le `budgetId` est porté par `BudgetImportJob` en base. **Inclusion dans la timeline par budget** : possible en joignant job sur `resourceId` **sans** renommer artificiellement en `budget_import.job.completed` ; **hors MVP** si l’effort de jointure / tests dépasse le lot minimal (à trancher en implémentation). |

### 4.1.5 Règle anti-double-audit (`*.status.changed` vs `*.updated`)

**Implémenté** dans `budgets.service` / `budget-lines.service` (commentaires au-dessus des blocs d’audit). S’applique à **budget** et **ligne budgétaire** uniquement (pas aux enveloppes au MVP, faute d’action `*.status.changed` enveloppe).

| Cas | Audits émis |
| --- | --- |
| **A** — La mutation ne modifie **que** le statut | **Une seule** ligne d’audit : `budget.status.changed` ou `budget_line.status.changed`. **Ne pas** émettre `budget.updated` / `budget_line.updated` pour cette même requête. |
| **B** — La mutation modifie le statut **et** d’autres champs | **Option (1)** retenue : une ligne `*.status.changed` **+** une ligne `*.updated` dont `oldValue`/`newValue` **excluent** le delta de statut déjà couvert par `status.changed`. |

**Interdit** : deux lignes d’audit qui **dupliquent** le même changement de statut (ex. `status.changed` **et** `updated` avec les mêmes `from` / `to` sur le statut).

### 4.1.6 Nommage query / DTO — filtre ligne

**Convention unique** : utiliser **`budgetLineId`** partout — query string, DTO de requête (`ListBudgetDecisionHistoryQueryDto` ou équivalent), signatures de service, contrat API consommé par le frontend.

**Ne pas** introduire `lineId` en parallèle (pas d’alias, pas de synonyme) : évite l’ambiguïté d’implémentation et les écarts front/back ; alignement naturel avec le vocabulaire Prisma / routes existantes autour de `BudgetLine`.

## 4.2 Contrat payload (`oldValue` / `newValue`)

Pour chaque événement à vocation « décision », normaliser :

```json
{
  "entity": { "id": "…", "code": "…", "name": "…" },
  "budget": { "id": "…", "name": "…", "code": "…" },
  "envelope": { "id": "…", "name": "…", "code": "…" },
  "transition": { "from": "DRAFT", "to": "SUBMITTED" },
  "amounts": { "revised": { "before": 1000, "after": 1200 }, "forecast": { "before": 900, "after": 950 } },
  "currency": "EUR",
  "correlationId": "optional-cuid-for-bulk"
}
```

Règles :

* Les montants sont des **nombres** ; la **devise** est rappelée au niveau budget/ligne.
* Les références à des entités (exercice, utilisateur) incluent des **champs libellé** en plus de l’ID pour l’UI (conformité règle *valeur, pas ID*) ; le **texte de `summary`** ne doit **pas** contenir d’UUID ni d’ID interne comme libellé principal.

## 4.3 API MVP (endpoint unique)

**Base** : préfixe cohérent avec le module budget. **Toutes** les sous-requêtes et filtres sont **strictement** limités au `budgetId` **et** au **client actif** (`clientId` issu du contexte requête) — pas de fuite inter-client.

### `GET /api/budgets/:budgetId/decision-history`

**Filtres optionnels** (query) :

* `envelopeId`
* `budgetLineId` — identifiant `BudgetLine.id` **dans le périmètre** du `:budgetId` (voir **§4.1.6** ; ne pas utiliser `lineId`)
* `actions[]` — sous-ensemble des actions connues (constantes §4.0)
* `from`, `to` — plage temporelle sur `createdAt`
* `limit`, `offset` — pagination **MVP** (pas de curseur ; `nextCursor` non utilisé côté API actuelle)

**Réponse** : liste enrichie ; chaque item inclut au minimum `summary` **calculé côté serveur** (libellés FR **en dur** au MVP — **pas** de couche i18n du `summary`, voir « Hors scope MVP »).

**Guards et permissions (pattern exact)** :

* `JwtAuthGuard`
* `ActiveClientGuard`
* `ModuleAccessGuard` — **module déduit** : **`budgets`** (cohérent avec le reste des routes budget)
* `PermissionsGuard` + `@RequirePermissions('budgets.read')`

**Ne pas** reposer sur `audit_logs.read` : l’endpoint est **métier** et **autonome** sur les données `AuditLog` filtrées côté service.

Exemple de forme de réponse :

```json
{
  "items": [
    {
      "id": "…",
      "createdAt": "2026-04-08T10:00:00.000Z",
      "action": "budget_line.status.changed",
      "summary": "Ligne « Licences » : brouillon → soumis",
      "actor": { "id": "…", "displayName": "Marie Dupont" },
      "resourceType": "budget_line",
      "resourceId": "…",
      "context": {
        "budget": { "id": "…", "name": "Budget IT 2026", "code": "BIT2026" },
        "envelope": { "id": "…", "name": "Run", "code": "RUN" },
        "line": { "id": "…", "name": "Licences", "code": "LIC" }
      },
      "details": { }
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

*(Réponse réelle : `items`, `total`, `limit`, `offset` — pas de `nextCursor` au MVP.)*

Les champs `context` servent au **filtrage** et à l’affichage : **libellés métier** ; les IDs peuvent être présents pour la navigation / clics internes mais **ne** remplacent **pas** les libellés dans `summary`.

## 4.4 Frontend

* **Emplacement (MVP livré)** : onglet **Décisions** sur la fiche `/budgets/[budgetId]` : `BudgetDecisionTimeline` + hook TanStack Query (`clientId` dans la clé).
* **API** : `getBudgetDecisionHistory` dans `budget-management.api.ts` ; filtres query `envelopeId` / `budgetLineId` **prêts côté API** — pas de liens « Voir l’historique enveloppe / ligne » ni filtres UI dédiés dans ce lot.
* **Composants** : liste verticale type timeline (états loading / error / empty — voir FRONTEND_UI-UX).
* **Libellés** : `summary` serveur + libellés contexte ; pas d’UUID dans le texte.

---

## Hors scope MVP

* Timeline unifiée **multi-domaines** (budget + projets + fournisseurs, etc.) sur un seul écran.
* Table ou entité dédiée **`BudgetDecisionEvent`** (ou équivalent).
* **BI / reporting** historique (exports analytiques, datamart).
* **Internationalisation** i18n des chaînes `summary` (le MVP suppose des libellés FR **fixes** côté API).
* Historisation **exhaustive** de **tous** les recalculs automatiques (consommation, reste, agrégats dérivés).
* **Index Prisma** sur `AuditLog` — réservé à une **optimisation ultérieure** après mesure.
* Entrée agrégée **`budget.bulk_status.applied`** ou **`budget_import.job.completed`** **tant que** le code source **n’émet pas** une telle ligne d’audit cohérente (le bulk actuel = N mises à jour ; l’import = actions `budget_import.*` existantes).

---

# 5. Modifications Prisma si nécessaire

**MVP** : **aucune** migration **obligatoire** ; **aucun** changement structurel **requis** pour livrer lecture enrichie + endpoint.

**Post-MVP (optionnel)** : index sur `AuditLog` **uniquement** si les requêtes de `BudgetDecisionHistoryService` le justifient (EXPLAIN / volumétrie).

---

# 6. Tests

## Backend

* **Unit** : `BudgetDecisionHistoryService` — filtrage client, rejet si `budgetId` hors scope, enrichissement acteur et entités.
* **Intégration** : créer budget → changer statut ligne → `GET decision-history` (filtre `budgetLineId` si besoin) retourne ordre chronologique et `summary` attendu ; vérifier **§4.1.5** (pas de doublon statut sur la même mutation).
* **Isolation multi-client** : utilisateur client A ne peut pas lire l’historique du budget client B.

## Frontend

* Tests composant : rendu avec liste mockée, empty state, erreur API.

---

# 7. Récapitulatif final (MVP strict)

| Élément | Choix |
| --- | --- |
| Stockage | **Uniquement** `AuditLog` — **aucune** nouvelle table |
| **Prisma** | **Aucun** changement structurel **obligatoire** au MVP |
| Lecture | **Service dédié** d’enrichissement + **DTO** ; requêtes strictement **scopées** `budgetId` + `clientId` actif |
| Écriture | **Ajustements minimaux** des services budget pour actions sémantiques listées §4.1 — **pas** de refonte globale des audits existants |
| API | **Un seul** endpoint `GET /api/budgets/:budgetId/decision-history` ; **guards** §4.3 ; permission **`budgets.read`** **uniquement** |
| UI | Onglet **Décisions** fiche budget ; filtres query `envelopeId` / `budgetLineId` côté API (**§4.1.6**) — pas d’UI filtrée enveloppe/ligne dans le lot MVP |
| Audit écriture | Règle **§4.1.5** appliquée (`budget.status.changed`, `budget_line.*` sémantiques) |
| Snapshots / versioning | Complémentaires (photo / lignée), **non** redondants avec ce journal |

---

# 8. Points de vigilance

1. **Rétention / RGPD** : alignement sur la politique d’archivage `AuditLog` / `AuditLogArchive` (RFC-013).
2. **Bruit** : le prévisionnel peut générer beaucoup d’événements — filtres par défaut côté UI / query (ex. exclure `budget_line.planning.previewed` si pertinent pour l’usage métier).
3. **Cohérence** : les **nouvelles** lignes d’audit sémantiques doivent respecter le **contrat** `oldValue`/`newValue` et les constantes `budget-audit.constants.ts` — **sans** imposer une migration rétroactive des logs passés.
4. **Bulk / import** : ne **pas** documenter d’actions agrégées **fictives** ; refléter le comportement **réel** du code (N updates, ou jointure job import si implémentée).
5. **Sécurité** : jamais d’exposition cross-client ; le `budgetId` sert de garde-fou pour toutes les sous-requêtes.
6. **Nommage filtre ligne** : **`budgetLineId`** unique (query, DTO, front) — **§4.1.6** ; pas de variante `lineId`.
7. **Anti-double-audit** : respect strict de **§4.1.5** à l’implémentation des mutations `PATCH` budget / ligne.

---

## Références code (état implémenté)

* `AuditLog` : `apps/api/prisma/schema.prisma`
* Décisionnel : `budget-decision-history.service.ts`, `budget-decision-history-summary.ts`, `budget-audit.constants.ts`, `budgets.controller.ts` (`GET :id/decision-history`)
* Audits sémantiques : `budgets.service.ts`, `budget-lines.service.ts`
* Audit planning (inchangé) : `budget-line-planning.service.ts` (`logPlanningAuditCanonical`)
* API audit générique (hors périmètre lecture métier) : `apps/api/src/modules/audit-logs/audit-logs.controller.ts` (`GET /audit-logs`)
* UI : `apps/web/src/features/budgets/components/budget-decision-timeline.tsx`, `apps/web/src/app/(protected)/budgets/[budgetId]/page.tsx`
