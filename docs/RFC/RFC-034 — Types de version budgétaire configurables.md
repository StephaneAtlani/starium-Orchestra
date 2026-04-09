# RFC-034 — Types de version budgétaire configurables

## Statut

**Draft** — spécification ; non implémentée dans le dépôt au moment de la rédaction.

## Priorité

Moyenne à haute — clarifie la dimension **métier** des révisions (jalons cycle, scénarios, révisions libres) **sans** confondre avec `versionKind` / `versionStatus` ([RFC-019](./RFC-019%20%E2%80%94%20Budget%20Versioning.md)), permet aux clients de **définir leurs propres types** depuis les **options budget**, et introduit la notion produit **Budget Référence** : le budget **validé** qui porte en même temps la **version active** de la lignée (vérité officielle pilotage / reporting).

## Dépendances

* [RFC-019 — Budget Versioning](./RFC-019%20%E2%80%94%20Budget%20Versioning.md) — `BudgetVersionSet`, `versionKind`, `versionStatus`, duplication, comparaison
* [RFC-033 — Mise en place des versions budgétaires (produit)](./RFC-033%20%E2%80%94%20Mise%20en%20place%20des%20versions%20budg%C3%A9taires%20(produit).md) — UI versions, cycles T1/T2/clôture, `budgets.versioning_cycle.manage`
* [RFC-011 — Rôles & permissions](./RFC-011-roles-permissions-modules.md) — catalogue permissions
* [docs/ARCHITECTURE.md](../ARCHITECTURE.md) — multi-client, `X-Client-Id`
* [docs/FRONTEND_UI-UX.md](../FRONTEND_UI-UX.md) — **libellés métier** (affichage du type : `label` / `code`, pas UUID seul)

---

# 1. Analyse de l’existant

## 1.1 Modèle actuel (RFC-019)

| Champ / enum | Rôle |
| --- | --- |
| `BudgetVersionKind` (`BASELINE`, `REVISION`) | Nature **technique** dans la lignée : baseline initiale vs révision. |
| `BudgetVersionStatus` (`DRAFT`, `ACTIVE`, `SUPERSEDED`, `ARCHIVED`) | **Cycle de vie** de la version dans le jeu (brouillon, active, remplacée, archivée). |
| `versionLabel` (string) | Libellé libre ou normalisé (ex. préfixes cycle RFC-033). |
| Endpoints cycle | `POST …/versioning/cycle-revision` avec `phase: T1 \| T2` ; `close-cycle` pour YEAR_END — la phase est **codée en dur** côté API + libellé généré. |

## 1.2 Écart fonctionnel

1. **Pas de référentiel « type métier »** : T1/T2/clôture ne sont pas des entités configurables ; extension (T3, trimestres, codes internes client) impose évolutions code ou conventions sur `versionLabel`.
2. **Confusion possible** entre « type » (pourquoi cette version existe) et « statut » (où elle en est) — aujourd’hui seul le couple `versionKind` + `versionStatus` + libellé couvre partiellement le besoin.
3. **Alignement futur** avec **scénarios** budgétaires (budgets parallèles, moteur à leviers) : un **type** explicite (`SCENARIO_STRESS`, etc.) facilite filtres, rapports et RBAC fin.
4. **Pas de libellé produit unique « Référence »** aujourd’hui : l’utilisateur doit combiner mentalement **`versionStatus`** (ACTIVE / DRAFT / …), **`BudgetVersionSet.activeBudgetId`** et **`Budget.status`** (workflow DRAFT → VALIDATED → LOCKED …, voir matrice [docs/API.md](../API.md) §15) — d’où la formalisation **Budget Référence** en §4.5.

## 1.3 Ce que cette RFC n’est pas

* Elle ne remplace pas **RFC-019** : `versionKind` et `versionStatus` restent la vérité technique et lifecycle.
* Elle ne réalise pas à elle seule les **scénarios A/B/C** (prévisionnel ligne, budgets parallèles, drivers) — elle fournit une **étiquette métier normalisée** utilisable par ces évolutions.

---

# 2. Hypothèses

1. **Un type par budget versionné** (nullable pour rétrocompatibilité) : `Budget.versionTypeId` optionnel ; les budgets non versionnés ou historiques sans type restent valides.
2. **Référentiel par client** : table dédiée scoping `clientId` ; pas de types « globaux plateforme » au MVP (évolution possible ultérieure pour gabarits seed).
3. **Code stable + libellé administrable** : `code` unique par client (ex. `CYCLE_T1`, `STRESS_2026`), `label` modifiable en UI ; l’UI affiche **label** (et éventuellement code en secondaire), jamais l’UUID seul.
4. **Types système** : seed initial (T1, T2, YEAR_END, FREE_REVISION ou équivalent) avec `isSystem = true` — désactivables mais **non supprimés** en dur ; types utilisateur supprimables ou désactivés selon règle produit.
5. **Règles anti-doublon cycle** : option par type `maxPerVersionSet` ou `uniquePerExercise` (bool ou entier) pour remplacer / compléter la logique actuelle basée sur tags dans `versionLabel` (RFC-033 §2.2.4).
6. **Permissions** : CRUD référentiel sous permission dédiée (ex. `budgets.version_types.manage`) ou réutilisation de `budgets.update` + garde « admin budget » — à trancher ; lecture liste pour `budgets.read` si besoin en select création révision.
7. **Budget Référence** : notion **dérivée** (pas un champ utilisateur saisi librement) — calculée à partir de `versionStatus`, `activeBudgetId` et `Budget.status` ; les statuts budget **éligibles** « validé » peuvent être **paramétrables par client** (extension de `Client.budgetWorkflowConfig` ou liste dédiée `referenceEligibleBudgetStatuses`) avec défaut métier documenté (ex. `VALIDATED` ; inclure ou non `LOCKED` selon arbitrage CODIR / DAF).

---

# 3. Liste des fichiers à créer / modifier (cible implémentation)

| Zone | Fichiers (indicatif) |
| --- | --- |
| Prisma | `schema.prisma` — modèle `BudgetVersionType`, FK sur `Budget` ; migration |
| API | Module `budget-version-types` ou sous `budget-management` : service + controller + DTOs ; intégration `BudgetVersioningService` (create-revision, cycle-revision, close-cycle) |
| Seed | `seed.ts` / migration données — types système par client existant ou script idempotent |
| Permissions | `default-profiles.json`, seed permissions, doc RFC-011 |
| Web — options | `/budgets/workflow-settings` — bloc « Types de version » (liste, création, édition, actif/inactif) |
| Web — versions | Page `/budgets/[id]/versions` — select type à la création révision libre ; affichage badge colonne type |
| Web — fiche budget | Badge / ligne méta si `versionType` résolu ; **badge ou libellé « Référence »** si `isReference === true` (voir §4.5) |
| API — GET budget | Inclure `versionType: { id, code, label }` en embed optionnel sur détail budget / historique versions ; inclure **`isReference: boolean`** (calcul serveur) |
| API — GET version set | Optionnel : **`referenceBudgetId: string | null`** (redondant avec règle §4.5 mais pratique pour le cockpit) |
| Config client | Paramètres statuts éligibles « validé » pour la Référence (voir §4.5) — même esprit que `budget-workflow-settings` |
| Docs | [docs/API.md](../API.md), [docs/modules/budget-frontend.md](../modules/budget-frontend.md), [RFC-033](./RFC-033%20%E2%80%94%20Mise%20en%20place%20des%20versions%20budg%C3%A9taires%20(produit).md) (référence croisée) |

---

# 4. Spécification fonctionnelle et API

## 4.1 Modèle métier `BudgetVersionType`

| Champ | Type | Description |
| --- | --- | --- |
| `id` | UUID/cuid | Identifiant technique. |
| `clientId` | FK | Isolation client. |
| `code` | string | Unique par `clientId`, stable (regex alphanum + underscore recommandé). |
| `label` | string | Libellé affiché (FR par défaut ; i18n hors MVP). |
| `description` | string? | Aide contextuelle options. |
| `sortOrder` | int | Ordre dans les listes / selects. |
| `isActive` | bool | Faux ⇒ pas proposé aux **nouvelles** révisions ; budgets existants conservent la FK. |
| `isSystem` | bool | Types livrés en seed ; pas de suppression physique au MVP. |
| `allowMultiplePerVersionSet` | bool (défaut `true`) | Si `false`, une seule révision avec ce type par `BudgetVersionSet` (équivalent règle R2 RFC-033 pour un jalon donné). |

## 4.2 Lien sur `Budget`

* `versionTypeId` nullable FK → `BudgetVersionType`.
* À la création d’une révision (libre ou cycle), le service **résout** le type : soit depuis le body (`versionTypeId` ou `versionTypeCode`), soit depuis le mapping **phase → code** pour les endpoints cycle existants (T1 → type dont `code = CYCLE_T1` ou équivalent seed).

## 4.3 Endpoints REST (préfixe indicatif)

Tous sous **client actif** (`X-Client-Id`), guards JWT + module budget + permissions.

| Méthode | Route | Description |
| --- | --- | --- |
| `GET` | `/api/budget-version-types` | Liste filtrable (`isActive`, pagination) ; tri `sortOrder`, `label`. |
| `GET` | `/api/budget-version-types/:id` | Détail. |
| `POST` | `/api/budget-version-types` | Création (DTO : `code`, `label`, …). Permission `budgets.version_types.manage` (ou équivalent). |
| `PATCH` | `/api/budget-version-types/:id` | Mise à jour `label`, `description`, `sortOrder`, `isActive`, `allowMultiplePerVersionSet` ; **pas** de changement de `code` après création (recommandé) ou règle stricte documentée. |
| `DELETE` | `/api/budget-version-types/:id` | Refus si `isSystem` ou si budgets référencent encore ; sinon soft-delete (`isActive = false`) préféré. |

**Évolution** `POST /api/budgets/:id/create-revision` : body optionnel `versionTypeId` ou `versionTypeCode`.

**Évolution** `POST …/versioning/cycle-revision` : résolution du type par **code** aligné sur la phase (`T1` → type système correspondant) plutôt que libellé seul.

## 4.4 Réponses enrichies

* `GET /api/budgets/:id/version-history` : chaque item inclut `versionType: { id, code, label } | null`.
* `GET /api/budgets/:id` : idem pour le budget courant si versionné.

## 4.5 Budget « Référence » (notion produit)

### Définition

Un budget versionné est qualifié **Référence** lorsqu’il cumule **simultanément** :

1. **Dernière version en pilotage dans la lignée** — au sens versioning RFC-019 :
   * `budget.versionSetId` non nul ;
   * `budget.versionStatus === ACTIVE` ;
   * `budget.id === budgetVersionSet.activeBudgetId` (cohérent avec une version **active** : c’est la tête de ligne **utilisée** pour le pilotage courant du set).

2. **Budget validé au sens workflow** — au sens `Budget.status` :
   * `budget.status` appartient à l’ensemble **configurable** des statuts considérés comme *validés métier* pour le client actif (`referenceEligibleBudgetStatuses` ou équivalent dans la config budget client).
   * **Défaut recommandé (à confirmer produit)** : au minimum **`VALIDATED`** ; inclusion de **`LOCKED`** (référence figée en fin de cycle) **option** client — si exclue, un budget `LOCKED` + `ACTIVE` ne serait pas « Référence » pour le reporting standard (à documenter selon choix DAF).

### Sémantique métier

* La **Référence** est la **vérité officielle** pour : comparaisons « vs référence », KPI cockpit, exports, et tout écran qui doit répondre à « quel budget du jeu représente le **budget validé actuellement en vigueur** ? ».
* Ce n’est **pas** un `BudgetVersionType` obligatoire : un type métier peut s’appeler « Référence » ou « Central » pour d’autres usages (scénarios), mais le **badge Référence** décrit ici est une **qualification booléenne dérivée**, indépendante du référentiel des types §4.1.

### Cas limites (comportement attendu)

| Situation | Référence ? |
| --- | --- |
| Version **ACTIVE** mais `status` encore **DRAFT** / **REVISED** / **SUBMITTED** (pas dans la liste éligible) | **Non** — travail ou validation en cours ; pas la vérité « validée ». |
| `status` **VALIDATED** mais `versionStatus` **SUPERSEDED** ou **ARCHIVED** | **Non** — version **passée** ; la référence est portée par la nouvelle **ACTIVE** une fois validée. |
| Budget **non versionné** | Hors scope Référence versioning ; éventuelle règle parallèle « référence exercice » hors présente RFC. |
| Plusieurs sets sur le même exercice | **Une** Référence **par `BudgetVersionSet`** au plus (0 si aucun budget ne satisfait les deux conditions). |

### Exposition API / UI

* **`isReference: boolean`** sur `GET /api/budgets/:id` et, idéalement, sur chaque ligne de `GET …/version-history` (même calcul).
* Option : **`referenceBudgetId`** sur la réponse **`GET /api/budget-version-sets/:id`** pour éviter au front de re-parcourir l’historique.
* **UI** : badge distinct **« Référence »** (accessibilité : ne pas seulement la couleur) sur la fiche budget et sur la ligne correspondante de la page **Versions** ; lien depuis le cockpit / liste budgets vers ce budget lorsque l’utilisateur choisit « ouvrir la référence du jeu ».

### Implémentation recommandée

* **Calcul côté serveur** (service partagé) pour une seule source de vérité ; pas de logique métier dupliquée dans le front.
* **Pas de colonne Prisma obligatoire** au MVP : dérivation à la lecture ; **dénormalisation** (`BudgetVersionSet.referenceBudgetId` mis à jour par transaction lors des changements `status` / `activate-version`) **option** performance (lot 2).

---

# 5. Modifications Prisma (proposition)

```prisma
model BudgetVersionType {
  id                         String   @id @default(cuid())
  clientId                   String
  code                       String
  label                      String
  description                String?
  sortOrder                  Int      @default(0)
  isActive                   Boolean  @default(true)
  isSystem                   Boolean  @default(false)
  allowMultiplePerVersionSet Boolean  @default(true)
  createdAt                  DateTime @default(now())
  updatedAt                  DateTime @updatedAt

  client  Client  @relation(fields: [clientId], references: [id], onDelete: Cascade)
  budgets Budget[]

  @@unique([clientId, code])
  @@index([clientId, isActive])
}

// Sur model Budget — ajout :
// versionTypeId String?
// versionType   BudgetVersionType? @relation(fields: [versionTypeId], references: [id], onDelete: SetNull)
```

**Migration** : ajout nullable ; pas de backfill obligatoire ; seed types système pour chaque client ou hook post-migration.

---

# 6. UI — Options budget

* Emplacement : **`/budgets/workflow-settings`**, section dédiée **Types de version** (voisin du bloc cycle RFC-033).
* Table : colonnes libellé, code, actif, « unique par lignée », actions éditer / désactiver.
* Dialogue création : code (validé), libellé, description, option « autoriser plusieurs par lignée ».
* **Règle affichage** : partout ailleurs, **Select** avec `label` comme texte principal ; `code` en méta ou sous-titre si utile aux power users.

---

# 7. Tests (critères d’acceptation)

* **Isolation client** : impossible de lire ou muter les types d’un autre client.
* **Unicité** : `POST` avec `code` dupliqué ⇒ 409.
* **Révision** : création avec `versionTypeId` valide ⇒ budget persisté avec FK ; type inactif refusé pour **nouvelle** révision (400).
* **Anti-doublon** : si `allowMultiplePerVersionSet = false`, deuxième révision même type sur le même set ⇒ 400 (message métier clair).
* **Types système** : `DELETE` interdit ou no-op documenté.
* **Frontend** : pas d’UUID nu dans select / table ; snapshot ou test composant sur le bloc options.
* **Référence** : pour un jeu donné, **exactement un** budget avec `isReference === true` lorsqu’il existe une version **ACTIVE** **validée** ; sinon **zéro** budget Référence (état transitoire explicite en UI : « Aucune référence : validez le budget actif ou activez une version validée »).
* **Régression** : changement `PATCH` budget `status` ou `activate-version` recalcule la Référence ; tests sur transitions **VALIDATED** + **ACTIVE**.

---

# 8. Récapitulatif final

| Livrable | Description |
| --- | --- |
| Référentiel configurable | Types de version par client, CRUD API, UI options |
| Lien sur `Budget` | `versionTypeId` + embed dans historique / détail |
| Cohérence RFC-019 | `versionKind` / `versionStatus` inchangés ; **type métier** en plus |
| Migration RFC-033 | Cycles T1/T2/clôture mappés vers types système par `code` |
| Budget Référence | Règle produit : **validé (workflow) ∩ version ACTIVE du set** ; flag API `isReference`, badge UI, config statuts éligibles |

---

# 9. Points de vigilance

1. **Ne pas surcharger `BudgetVersionKind`** avec des dizaines de valeurs métiers — garder le type métier dans `BudgetVersionType`.
2. **Renommage de `label`** : l’historique affiché peut refléter le libellé **actuel** ; si besoin d’historique figé, envisager snapshot `versionTypeLabel` sur `Budget` au moment de la création (lot 2).
3. **Performance** : jointure légère sur listes ; index `(clientId, code)`.
4. **Permissions** : séparer gestionnaire de référentiel vs créateur de révision pour éviter que tout utilisateur `budgets.create` ne modifie les types.
5. **Alignement RFC-032** : les audits `budget_version.*` peuvent inclure `versionTypeCode` dans `newValue` pour lisibilité du journal décisionnel.
6. **Référence** : documenter clairement côté support / runbook la **fenêtre** où il n’y a pas de Référence (ex. version ACTIVE encore en **DRAFT** workflow) pour éviter les tickets « le cockpit ne trouve pas la référence ».
7. **Conflit nommage** : ne pas confondre le **badge Référence** (§4.5) avec un **code** `BudgetVersionType` éventuel `REFERENCE` ou avec **`BudgetVersionKind`** — trois concepts distincts.

---

*Fin du document — RFC-034.*
