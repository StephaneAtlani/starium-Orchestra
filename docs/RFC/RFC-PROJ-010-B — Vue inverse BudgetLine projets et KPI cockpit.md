# RFC-PROJ-010-B — Vue inverse BudgetLine → projets et KPI cockpit budget×projet

## Statut

📝 **Draft** — à implémenter.

Suite de [RFC-PROJ-010](./RFC-PROJ-010%20%E2%80%94%20Project%20%E2%86%94%20Budget%20Integration.md) (§8.2 et §8.3), jusqu’ici hors périmètre livré. Le sens **Projet → BudgetLine** (CRUD `ProjectBudgetLink` + UI `/projects/:id/budget`) est **live**. Cette RFC couvre le sens inverse et les KPI consolidés.

| Lot | Contenu | Priorité |
| --- | --- | --- |
| **A** | API + UI « projets liés » sur une `BudgetLine` (+ impact financier) | P0 |
| **B** | KPI cockpit consolidés (coût / consommé / dérive par projet) | P0 |

**Hors scope :** génération de `FinancialEvent` depuis tâches / jalons / timesheet (→ suite PROJ-011 / RES-002). Aucun nouveau mouvement d’argent. Aucune modification du modèle `ProjectBudgetLink`.

---

## À quoi ça sert

Aujourd’hui un DSI / CODIR qui ouvre une **ligne budgétaire** voit engagé, consommé, commandes, factures — mais **pas quels projets** tirent sur cette ligne. Le lien existe en base (`ProjectBudgetLink`) et se gère uniquement depuis la fiche projet.

Sans cette RFC :

* pas de navigation **ligne → portefeuille projets** ;
* pas de lecture CODIR « cette enveloppe finance quels projets, pour quel impact » ;
* le cockpit budget reste **aveugle à la dimension projet** (alors que le chemin argent réel = PO/facture sur la ligne, et le rattachement projet = jonction).

Avec cette RFC :

* depuis le drawer / fiche ligne : liste des projets liés, mode d’allocation, part / montant projet, lecture d’impact (cible projet, engagé/consommé de la **ligne**, dérive locale) ;
* sur le cockpit budget (fiche et/ou dashboard) : KPI **par projet** (coût cible, consommé imputable, dérive) pour arbitrage portefeuille.

---

# 1. Analyse de l’existant

## 1.1 Backend

| Élément | État |
| --- | --- |
| Prisma `ProjectBudgetLink` | Live — `@@unique([projectId, budgetLineId])`, relation inverse `BudgetLine.projectBudgetLinks` |
| Module | `apps/api/src/modules/project-budget/` |
| `GET /api/projects/:projectId/budget-links` | Live — pagination, sérialise la **ligne** |
| `POST/PATCH/DELETE` liens | Live — `projects.update`, audit `project.budget_link.*` |
| Liste par `budgetLineId` | **Absent** |
| Agrégat cockpit « par projet » | **Absent** (dashboard budget = exercice/lignes/enveloppes) |
| `ProjectsService.consumedBudgetAmountsByProjectId` | Partiel — somme `consumedAmount` des lignes en mode **FIXED** seulement, pour liste projets |

## 1.2 Frontend

| Élément | État |
| --- | --- |
| `/projects/:id/budget` + `ProjectBudgetKpiStrip` / `ProjectBudgetSynthesis` | Live (KPI **fiche projet**) |
| Drawer ligne `BudgetLineIntelligenceDrawer` (FE-ADD-006) | Live — onglets overview, prévisionnel, engagements, factures, allocations, timeline, DSI, accès — **pas d’onglet projets** |
| Fiche `/budgets/[budgetId]` (FE-BUD-032) | Live — bande KPI budget, pas de dimension projet |
| Widgets `budget-dashboard` | Live — sans axe projet |

## 1.3 RFC / catalogue liaisons

| Réf. | Relation |
| --- | --- |
| RFC-PROJ-010 §8.2 / §8.3 | Stubs (« liste projets » / « KPI cockpit ») |
| Graphe / `LIAISONS-MODULES` id `ui-line-projects` | `status: gap`, horizon `next` |
| `_RFC Liste` ligne 13 | 🟡 Partiel — « cockpit consolidé §8.3 hors scope » |

## 1.4 Hypothèses

1. **Lecture seule** côté BudgetLine pour le lot A (pas de création/édition de lien depuis le drawer ligne en V1 — le CRUD reste sur la fiche projet).
2. Permissions lecture : `budgets.read` **et** capacité à voir le projet (`projects.read` ou verdict ACL ressource projet). Un utilisateur `budgets.read` sans `projects.read` voit les montants ligne mais des libellés projet masqués / empty explicite — **jamais l’UUID**.
3. Impact financier V1 = **dérivé des données déjà sur le lien + montants de la ligne** (même logique que `project-budget-display.ts` côté projet). Pas de nouveau `FinancialEvent`. Mode FIXED : montant fixe ; PERCENTAGE / BUDGET_PERCENTAGE / FULL : part calculée sur `initialAmount` / total budget selon règles PROJ-010.
4. Lot B s’appuie sur les mêmes agrégats qu’un endpoint de synthèse (pas de recalcul métier dans l’UI).
5. Graphiques : uniquement séries API réelles (≥ 2 points) sinon empty/skeleton — règle charts-dynamic-only.

---

# 2. Objectif produit

| Acteur | Intention |
| --- | --- |
| DSI / chef de projet | Voir si « sa » ligne est partagée avec d’autres projets |
| Contrôleur / DAF support | Mesurer l’impact portefeuille d’une enveloppe |
| CODIR | Lire coût / conso / dérive **par projet** sur un budget |

Critères d’acceptation (lots A+B) :

* [ ] `GET` inverse paginé, scopé `clientId`, libellés projet (`code`, `name`, statut métier)
* [ ] Onglet / section drawer ligne : loading / empty / error ; jamais d’ID brut
* [ ] Impact : mode, part/montant alloué, engagé/consommé de la ligne (lecture), dérive vs part projet si calculable
* [ ] Endpoint synthèses KPI par projet pour un `budgetId` (et optionnellement une `budgetLineId`)
* [ ] Surface UI cockpit (fiche budget et/ou `/budgets/dashboard`) avec 3 KPI : coût cible projet, consommé, dérive
* [ ] Tests isolation inter-clients + permissions
* [ ] Mobile ≥ 320px, cibles ≥ 44px, tableau en cartes ou scroll contrôlé

---

# 3. Fichiers à créer / modifier

## Backend

| Fichier | Action |
| --- | --- |
| `apps/api/src/modules/project-budget/project-budget-links.service.ts` | `listByBudgetLine`, serialize projet + impact |
| `apps/api/src/modules/project-budget/dto/list-budget-line-project-links.query.dto.ts` | Créer |
| Contrôleur nesté budget-line **ou** extension controller existant | `GET …/budget-lines/:budgetLineId/project-links` |
| Service synthèse (même module ou `budget-reporting`) | `GET …/budgets/:budgetId/project-budget-kpis` |
| Specs service + controller | Isolation client, 404 hors scope, pagination |

## Frontend

| Fichier | Action |
| --- | --- |
| `features/budgets/api/…` + hooks query keys `clientId` | Client API inverse + KPI |
| `budget-line-drawer/` | Onglet **Projets** + tableau / empty |
| `budget-detail/` ou `budgets/dashboard/` | Bande / cartes KPI projet (lot B) |
| Tests vitest helpers agrégat si logique pure FE | Aligné backend |

## Doc

| Fichier | Action |
| --- | --- |
| `docs/API.md` | Routes nouvelles |
| `docs/LIAISONS-MODULES.md` | `ui-line-projects` → `partial` puis `live` |
| `docs/liaisons/graphe-fonctionnel-modules.canvas.tsx` | Idem statut |
| `_RFC Liste.md` | Index + statut |
| RFC-PROJ-010 en-tête | Pointeur vers 010-B |

**Prisma :** aucune migration (relation déjà là).

---

# 4. Conception API

## 4.1 Lot A — liste inverse

```
GET /api/budget-lines/:budgetLineId/project-links?limit&offset
```

* Guards : auth + client actif + `budgets.read`
* Résolution ligne : `findFirst({ id, clientId })` — 404 sinon
* Réponse :

```ts
{
  items: Array<{
    id: string;                    // id du ProjectBudgetLink
    allocationType: 'FULL' | 'PERCENTAGE' | 'BUDGET_PERCENTAGE' | 'FIXED';
    percentage: number | null;
    amount: number | null;
    projectAllocatedAmount: number; // part calculée (HT) selon règles PROJ-010
    project: {
      id: string;
      code: string | null;
      name: string;
      status: string;              // libellé / enum métier exposé pour badge
    };
    // lecture ligne (contexte impact — pas un double event)
    lineCommittedAmount: number;
    lineConsumedAmount: number;
  }>;
  total: number;
  limit: number;
  offset: number;
}
```

* UI : `displayLabel(project.name, 'Projet')` / `firstDisplayLabel([code, name], 'Projet')` — **jamais** repli sur `id`.
* Lien navigation : `/projects/:projectId/budget` (si `projects.read`).

## 4.2 Lot B — KPI cockpit

```
GET /api/budgets/:budgetId/project-budget-kpis
```

* Guards : `budgets.read` + scope client
* Agrège tous les `ProjectBudgetLink` des lignes du budget
* Par projet (group by `projectId`) :

| Champ | Définition V1 |
| --- | --- |
| `targetAmount` | Somme des parts allouées (`projectAllocatedAmount`) |
| `consumedAmount` | Pour FIXED : min(part, `line.consumedAmount`) agrégé avec règle documentée ; sinon proportion `percentage` × `line.consumedAmount` (même heuristique que liste projets FIXED actuelle — **documenter** et tester) |
| `committedAmount` | Idem sur `committedAmount` |
| `driftAmount` | `consumedAmount - targetAmount` (signe : >0 = dérive défavorable) |
| `linkCount` | Nombre de liens |

* Réponse : `{ items: [...], totals: { targetAmount, consumedAmount, committedAmount, driftAmount } }`
* Pas de sparkline inventée. Si `items.length === 0` → empty UI.

Alternative acceptée : étendre `GET /api/budget-reporting/budgets/:id/summary` d’un bloc `byProject` — à trancher à l’implémentation (préférer endpoint dédié pour ne pas gonfler le summary).

---

# 5. Conception UI

## 5.1 Lot A — drawer ligne

* Nouvel onglet **Projets** dans `BudgetLineIntelligenceDrawer` (après overview ou avant commitments).
* `StariumTableWrap` : colonnes Projet · Statut · Mode · Part / montant · Consommé ligne (contexte) · Lien « Voir budget projet ».
* Mobile : cartes empilées, actions ≥ 44px.
* États : `LoadingState` / `EmptyState` (« Aucun projet lié à cette ligne ») / `ErrorState` + retry.
* Pas de CRUD dans le drawer V1 (CTA secondaire optionnel : « Gérer depuis le projet » si un seul projet et droit update).

## 5.2 Lot B — cockpit

* Sur `/budgets/[budgetId]` : section `.starium-module` **Projets financés** (pas de Card autour d’une grille de KPI) + N × `KpiCard` dense ou tableau top projets.
* KPI affichés (libellés uniques, alignés glossaire FE-BUD-032) :
  * **Budget projet (cible)** ← `targetAmount`
  * **Consommé projet** ← `consumedAmount`
  * **Dérive** ← `driftAmount` (texte + signe, pas couleur seule)
* Option : widget sur `/budgets/dashboard` filtré exercice — même API, pas de série fake.

---

# 6. Permissions, isolation, audit

| Opération | Permission | Isolation |
| --- | --- | --- |
| Liste inverse | `budgets.read` | `budgetLine.clientId === activeClient` |
| KPI budget | `budgets.read` | `budget.clientId === activeClient` |
| Affichage nom projet | `projects.read` (soft) | Si refus : libellé « Projet non accessible » |
| Mutations liens | inchangé (`projects.update`) | — |

* Pas d’audit sur les GET.
* Logs : pas de DCP ; pas d’email collaborateur dans les payloads de debug.

---

# 7. Implémentation (plan)

1. Service `listByBudgetLine` + DTO + controller + tests isolation.
2. FE API + onglet drawer + empty/loading/error.
3. Service KPI + endpoint + tests (FIXED / PERCENTAGE / multi-liens).
4. FE section fiche budget + (option) dashboard.
5. Doc API + LIAISONS `ui-line-projects` → live + canvas graphe.
6. `pnpm typecheck` + tests api/web + `pnpm audit:ui-ids`.

---

# 8. Tests

| Couche | Cas |
| --- | --- |
| Service | Liste vide ; 2 projets ; pagination ; ligne autre client → 404 |
| Service KPI | Budget sans lien ; mix FIXED/PERCENTAGE ; totaux |
| Controller | 401 / 403 sans `budgets.read` |
| FE | Empty drawer ; libellés sans ID ; dérive annoncée (texte) |

---

# 9. Conformité by design

## RGPD

* Aucune DCP nouvelle. Libellés projet = données métier client-scopées.
* Pas de log d’identifiants personnels. Rétention = celle des entités Project / BudgetLine existantes.

## RGAA

* Onglet drawer : focus visible, `aria-selected` / tabs pattern existant.
* Tableau avec en-têtes ; empty/error en `aria-live` polite.
* Dérive : texte « au-dessus / en dessous de la cible », pas couleur seule.

## Design System

* Réutiliser drawer FE-ADD-006, `KpiCard`, `EmptyState` / `LoadingState` / `ErrorState`, tokens — aucune couleur/espacement en dur.
* Libellés métier (`displayLabel`) ; `pnpm audit:ui-ids` vert.

## Sécurité

* `clientId` depuis le scope, jamais du body.
* Pas de sur-exposition (whitelist champs réponse).
* Mutations hors scope de cette RFC.

## Mobile

* Drawer / section responsive dès 320px ; tableau → cartes ; touch targets ≥ 44px.

---

# 10. Points de vigilance

1. **Heuristique conso par projet** : tant qu’il n’y a pas de `FinancialEvent` PROJECT, le « consommé projet » est une **imputation proportionnelle / FIXED**, pas une vérité analytique PO. L’UI doit le dire (sous-titre / tooltip) pour ne pas mentir au CODIR.
2. Ne pas dupliquer le CRUD liens dans le drawer ligne (source de vérité UX = fiche projet).
3. Ne pas fusionner avec FinancialEvent PROJECT (autre RFC).
4. ACL projet : éviter de fuiter un nom de projet hors droit — libellé neutre.
5. Perf : index déjà sur `clientId` ; pour KPI budget, requête par `budgetLineId IN (…)` du budget, éviter N+1 (include project).

---

# 11. Récapitulatif

| | |
| --- | --- |
| **Pourquoi** | Fermer la boucle lecture budget → projets ; KPI CODIR budget×projet |
| **Dépend de** | RFC-PROJ-010 MVP (live) |
| **Débloque** | Navigation DAF/DSI depuis la ligne ; cockpit portefeuille ; base pour alertes futures |
| **Ne fait pas** | Mouvement d’argent, Licences SI, costing timesheet |
| **Statut** | Draft — ready to implement lots A puis B |
