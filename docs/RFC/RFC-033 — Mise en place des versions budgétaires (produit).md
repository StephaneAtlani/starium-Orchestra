# RFC-033 — Mise en place des versions budgétaires (produit)

## Statut

**Implémenté (MVP)** — page `/budgets/[id]/versions`, client API mutations, badge fiche budget, permission `budgets.versioning_cycle.manage` + seed, endpoints `POST …/versioning/cycle-revision` et `…/close-cycle`, bloc options `/budgets/workflow-settings` (voir code `apps/web`, `apps/api`).

## Priorité

Haute — conditionne une gouvernance budgétaire lisible (baseline / révisions / version active) et complète le pilotage déjà exposé en comparaison ([RFC-030](./RFC-030%20%E2%80%94%20Budget%20Forecast%20%26%20Comparaison%20Budg%C3%A9taire.md), [RFC-FE-BUD-030](./RFC-FE-BUD-030%20%E2%80%94%20Forecast%20et%20Comparaison%20budg%C3%A9taire%20UI.md)).

## Dépendances

* [RFC-019 — Budget Versioning](./RFC-019%20%E2%80%94%20Budget%20Versioning.md) — concepts, règles métier, API
* [RFC-019 — Plan implémentation](./RFC-019%20%E2%80%94%20Budget%20Versioning%20%E2%80%94%20Plan%20impl%C3%A9mentation.md) — conventions Prisma, codes `Budget` / `BudgetVersionSet`
* [RFC-031 — Budget Snapshots MVP](./RFC-031%20%E2%80%94%20Budget%20Snapshots%20MVP%20(fig%C3%A9,%20lecture%20seule).md) — distinction snapshot (photo T) vs version (lignée)
* [RFC-032 — Historisation décisions budgétaires](./RFC-032%20%E2%80%94%20Historisation%20d%C3%A9cisions%20budg%C3%A9taires.md) — traçabilité complémentaire
* [docs/FRONTEND_UI-UX.md](../FRONTEND_UI-UX.md) — états UI, **libellés métier** (pas d’UUID en libellé visible)
* [docs/ARCHITECTURE.md](../ARCHITECTURE.md) — multi-client, `X-Client-Id`, RBAC
* [RFC-011 — Rôles & permissions](./RFC-011-roles-permissions-modules.md) — catalogue permissions, assignation rôles client

---

# 1. Analyse de l’existant

## 1.1 Backend (déjà en place)

| Élément | Emplacement / détail |
| --- | --- |
| Modèle | `BudgetVersionSet`, champs version sur `Budget`, enums `BudgetVersionKind`, `BudgetVersionStatus` — `apps/api/prisma/schema.prisma` ; migration historique `20260315000000_add_budget_versioning_rfc019` |
| Service | `BudgetVersioningService` — baseline, révision, activation (idempotente), archivage, historique, compare par code |
| Routes budgets | `POST …/create-baseline`, `POST …/create-revision`, `POST …/activate-version`, `POST …/archive-version`, `GET …/version-history`, `GET …/compare?targetBudgetId=` — `BudgetVersioningController` (`@Controller('budgets')`) ; **cycles** : `POST …/versioning/cycle-revision` (body `phase`: T1 \| T2), `POST …/versioning/close-cycle` (snapshot optionnel + révision YEAR_END + LOCKED + activation) — permission **`budgets.versioning_cycle.manage`** |
| Routes ensembles | `GET /api/budget-version-sets`, `GET /api/budget-version-sets/:id` — `BudgetVersionSetsController` |
| Comparaison unifiée | `BudgetComparisonService` — mode `version` avec contrôle même `versionSetId` — `apps/api/src/modules/budget-forecast/` |
| Seed | `apps/api/prisma/seed-budget-snapshots-versions.ts` (jeux de test versionnés) |
| Audit | Actions `budget_version_set.*`, `budget_version.*` — aligné RFC-019 §10 |

## 1.2 Frontend (MVP livré)

| Élément | État |
| --- | --- |
| `GET …/version-history` | `getVersionHistory` + `useBudgetVersionHistory` — options **libellées** (comparaison [RFC-FE-BUD-030](./RFC-FE-BUD-030%20%E2%80%94%20Forecast%20et%20Comparaison%20budg%C3%A9taire%20UI.md)) |
| Page `/budgets/[budgetId]/versions` | Liste des versions + CTA baseline / révision / activer / archiver selon permissions ; états vides / erreurs — orchestration via composants `apps/web/src/features/budgets/components/budget-versions/` ; entrée `page.tsx` |
| API client | `budget-versioning.api.ts` : historique, mutations versioning, **`cycleRevision`** / **`closeCycle`** (invalidation cache alignée) |
| Fiche budget | Badge version discrète si métadonnées présentes ; lien vers `/versions` |
| Options workflow | Bloc **Versions de cycle** sur `/budgets/workflow-settings` (`budget-cycle-version-block.tsx`) — T1 / T2 / clôture si `budgets.versioning_cycle.manage` |

## 1.3 Écart fonctionnel

**MVP** : l’écart « pas d’UI versioning » est **levé** pour la page Versions, les mutations courantes et le parcours cycle (permission dédiée). Restent hors périmètre documenté ici : timeline dédiée avancée, pagination lourde sur `version-history`, perfectionnements UX liste globale budgets.

---

# 2. Hypothèses

1. **MVP produit** : livrer la **page Versions** sous la fiche budget + **actions** « révision / baseline / activer / archiver » (permissions `budgets.create` / `budgets.update` alignées backend) **et**, en parallèle ou en lot suivant, le parcours **options** réservé au rôle **`budgets.versioning_cycle.manage`** (§2.2) ; sans refonte de la liste globale des budgets dans un premier temps (badges optionnels phase 1.1).
2. **Budget non versionné** : l’action « Démarrer le versioning » = `create-baseline` depuis ce budget ; redirection ou focus sur le nouveau budget V1 du set (selon UX — voir §4).
3. **Libellés** : afficher `name`, `code`, `versionLabel` ou synthèse `V{n}` + statut ; **jamais** l’UUID seul comme titre de ligne ou option principale.
4. **Cohérence navigation** : après activation d’une version, `BudgetVersionSet.activeBudgetId` pointe vers le budget actif — les liens « Voir le budget » doivent cibler **l’id budget** de la version concernée (pas seulement l’URL courante si l’utilisateur était sur une autre version).
5. **Lecture seule** : versions `SUPERSEDED` / `ARCHIVED` — pas d’édition structurelle sauf règles budget existantes (déjà backend) ; l’UI désactive les CTA d’édition si le budget est non modifiable.

## 2.1 Déclencheurs métier (indicatif)

Le produit **ne force pas** automatiquement une nouvelle version sur un événement précis en MVP : `create-revision` / `create-baseline` restent des **actions explicites** (avec libellé / description optionnels côté révision). Les déclencheurs ci-dessous sont des **situations métier** où l’organisation a intérêt à **figer une lignée** ou à **publier une révision officielle**, distincte d’un simple **snapshot** (photo à un instant T, [RFC-031](./RFC-031%20%E2%80%94%20Budget%20Snapshots%20MVP%20(fig%C3%A9,%20lecture%20seule).md)).

| Déclencheur | Exemples | Pourquoi une version plutôt qu’un snapshot |
| --- | --- | --- |
| **Cycle budgétaire** | Passage T1 → T2, clôture semestrielle, budget annuel « gelé » puis repris | Nouvelle **révision** pilotable (V2, V3) avec statut actif / archivage ; le snapshot sert plutôt à la preuve à date. |
| **Gouvernance / décision** | Arbitrage CODIR, validation DAF, comité investissement | Besoin d’une **version officielle** comparable à la précédente et activable comme référence de pilotage. |
| **Périmètre** | Ajout / retrait de domaines, fusion d’enveloppes, restructuration des lignes | La structure budgétaire change de manière durable ; une révision matérialise le nouveau périmètre (codes lignes stables, [RFC-019](./RFC-019%20%E2%80%94%20Budget%20Versioning.md) §9). |
| **Chiffrage révisé** | Révision des montants révisés / prévisionnel après constat d’écart important | Distinguer « avant / après arbitrage » dans la **même lignée** (comparaison Vn vs Vn+1). |
| **Conformité / audit** | Exiger une trace d’une **révision approuvée** à l’instant de la décision | Version + audit ([RFC-019](./RFC-019%20%E2%80%94%20Budget%20Versioning.md) §10) ; l’[historique décisionnel](./RFC-032%20%E2%80%94%20Historisation%20d%C3%A9cisions%20budg%C3%A9taires.md) complète par le journal d’événements. |
| **Changement de référence active** | La direction veut que le « budget de travail » soit une nouvelle base | **Activation** d’une version existante ou **révision** puis activation — pas seulement une photo. |

**Nuances**

* **Snapshot** : utile pour conserver l’état exact **à une date** sans créer une nouvelle révision métier (contrôle, écart vs réel).
* **Version** : utile pour **enchaîner** des révisions dans une lignée, **comparer** Vn à Vn+k, **activer** la version de pilotage courante.

**Hors périmètre (automatisation pure)** : règles sans action humaine du type « si écart > seuil → créer une révision » — hors scope sauf évolution workflow moteur.

**Dans le périmètre** : parcours **gouverné** « cycle T1 / T2 / clôture » déclenché par un **rôle dédié** depuis les **options** — voir §2.2.

## 2.2 Rôle dédié, options budget et cycles (T1 / T2 / clôture)

### Objectif

Permettre à un profil **gouvernance budgétaire** (ex. DAF, contrôle de gestion, pas nécessairement tout utilisateur avec `budgets.create`) d’**initier une révision de cycle** depuis un écran d’**options / configuration** du module budget, avec **règles métier** alignées sur les jalons **T1**, **T2** (ou équivalent semestriel / trimestriel selon paramétrage client) et la **clôture** d’exercice.

### Permission

Introduire une permission **fine** (nom indicatif : `budgets.versioning_cycle.manage` — à valider dans le catalogue [RFC-011](./RFC-011-roles-permissions-modules.md)) :

| Sujet | Règle |
| --- | --- |
| Qui peut utiliser les boutons « cycle » | Utilisateur disposant de `budgets.versioning_cycle.manage` **sur le client actif** (et module budget accessible). |
| Qui peut créer une révision « libre » depuis la fiche budget | Conserver `budgets.create` sur les flux existants (RFC-019) — **distinct** du cycle gouverné si le produit veut réserver les cycles aux profils finance. |
| Lecture | `budgets.read` inchangé pour consulter l’historique des versions. |

Les rôles admin client peuvent attribuer `budgets.versioning_cycle.manage` à un sous-ensemble de rôles (ex. `daf`, `controller`).

### Emplacement UI (options)

| Zone | Comportement |
| --- | --- |
| **Configuration / options budget** | Bloc dédié **« Versions de cycle »** (ou intégré à la page existante `/budgets/workflow-settings` — alignement avec `Client.budgetWorkflowConfig` et [RFC-024](./RFC-024%20%E2%80%94%20Budget%20UI.md) si pertinent). |
| **Contexte** | Sélection de l’**exercice** et/ou du **budget versionné actif** du périmètre (libellés métier, pas ID seuls). |
| **Visibilité** | Les boutons ci-dessous ne s’affichent que si `budgets.versioning_cycle.manage` **et** préconditions métier (voir §2.2.4). |

### Actions proposées (libellés produit indicatifs)

| Action | Effet métier attendu | Appel technique (MVP cible) |
| --- | --- | --- |
| **Créer la révision T1** | Nouvelle version dans la lignée avec libellé / motif **prérempli** « cycle T1 » (année / exercice issus du contexte) ; conforme aux règles §2.2.4. | `POST /api/budgets/:id/create-revision` avec body généré **ou** endpoint dédié `POST .../create-cycle-revision` (recommandé si validation serveur riche — voir §5). |
| **Créer la révision T2** | Idem pour le second semestre / second jalon. | Idem. |
| **Clôture budgétaire (exercice)** | **Séquence ordonnée** : (1) optionnel : snapshot de preuve [RFC-031](./RFC-031%20%E2%80%94%20Budget%20Snapshots%20MVP%20(fig%C3%A9,%20lecture%20seule).md) ; (2) création d’une **révision de clôture** (libellé explicite) ; (3) transition de **statut** du budget / exercice selon règles `BudgetStatus` / workflow client (ex. passage vers `LOCKED` ou équivalent — aligné config workflow) ; (4) éventuelle **activation** de la version de clôture comme référence. | Transaction métier côté **backend** (un seul endpoint recommandé pour éviter les états incohérents) — voir §5. |

L’UI affiche pour chaque bouton un **résumé** des conséquences (duplication structure, nouvelle version, impact statut) avant confirmation.

### Règles métier (préconditions et ordre)

À **valider et implémenter côté backend** (source de vérité) ; l’UI ne fait qu’afficher les erreurs métier.

| Règle | Détail |
| --- | --- |
| **R1 — Versionnement actif** | Le budget concerné doit appartenir à un `BudgetVersionSet` et être la **version active** ou une version explicitement désignée pour le cycle (produit : préciser si seule l’active peut servir de source — défaut recommandé : **source = version active**). |
| **R2 — Pas de doublon de cycle** | Pour un même exercice et le même jalon (T1 / T2 / clôture), **interdire** une seconde révision « même type » si une révision déjà créée pour ce jalon existe (clé métier : `versionLabel` normalisé ou champ dédié `cyclePhase` **hors schéma MVP optionnel** — sinon convention sur préfixe libellé + contrôle service). |
| **R3 — Statuts compatibles** | Refuser si le budget est déjà `ARCHIVED` / non éligible au workflow de clôture (messages explicites). |
| **R4 — Clôture** | La clôture **ne supprime** pas l’historique ; elle **fige** le pilotage courant selon politique client (statuts + version active). En cas de conflit avec une règle locale, `Client.budgetWorkflowConfig` prime pour les transitions autorisées. |
| **R5 — Traçabilité** | Chaque action alimente l’audit versioning existant + complément utile dans l’[historique décisions](./RFC-032%20%E2%80%94%20Historisation%20d%C3%A9cisions%20budg%C3%A9taires.md) si une décision métier est enregistrée. |

### Synthèse

Les utilisateurs **sans** `budgets.versioning_cycle.manage` ne voient pas les boutons de cycle dans les options ; ils peuvent encore utiliser les flux « révision libre » sur la fiche budget si `budgets.create` leur est accordé. Les **profils gouvernance** utilisent les **options** pour des **versions nommées et contrôlées** (T1, T2, clôture) sans dépendre d’une saisie manuelle du libellé à chaque fois.

---

# 3. Liste des fichiers à créer / modifier

## 3.1 À créer (indicatif)

| Fichier | Rôle |
| --- | --- |
| `apps/web/src/features/budgets/api/budget-versioning.mutations.ts` (ou extension `budget-versioning.api.ts`) | `createBaseline`, `createRevision`, `activateVersion`, `archiveVersion` + parse erreurs |
| `apps/web/src/features/budgets/components/budget-versions/` | `budget-versions-page-content.tsx`, `budget-version-row.tsx`, `budget-version-actions.tsx`, `create-revision-dialog.tsx` |
| `apps/web/src/features/budgets/hooks/use-budget-version-set.ts` (optionnel) | Charger le détail `GET /budget-version-sets/:id` quand on a `versionSetId` depuis le budget |
| `apps/web/src/features/budgets/components/budget-versions/` (optionnel) | `budget-cycle-version-actions.tsx` — bloc boutons T1 / T2 / clôture (permission `budgets.versioning_cycle.manage`) |
| `apps/web/src/features/budgets/workflow-settings/` (ou équivalent) | Section « Versions de cycle » sur `/budgets/workflow-settings` |

## 3.2 À modifier

| Fichier | Modification |
| --- | --- |
| `apps/web/.../budgets/[budgetId]/versions/page.tsx` | Remplacer le squelette par le contenu réel (composition + TanStack Query) |
| `apps/web/src/features/budgets/lib/budget-query-keys.ts` | Clés invalidation après mutations (version set, budget, version-history) |
| `apps/web/src/app/(protected)/budgets/[budgetId]/page.tsx` (ou header budget) | Entrées contextuelles : « Versions », CTA créer révision / baseline si pertinent + garde permissions |
| `apps/web/.../budgets/workflow-settings/page.tsx` (ou page configuration budget) | Intégrer le bloc §2.2 (boutons cycle + préconditions) |
| `apps/api` — permissions seed / catalogue | Ajouter `budgets.versioning_cycle.manage` ; l’associer aux rôles cibles (RFC-011) |
| `apps/api` — `budget-versioning` / nouveau handler | Endpoint ou service **close-cycle** + garde `RequirePermissions('budgets.versioning_cycle.manage')` sur les routes cycle — voir §5 |
| `docs/modules/budget-frontend.md` | Section Versions + cycles — synchroniser après implémentation |

---

# 4. Implémentation (spécification)

## 4.1 Page `/budgets/[budgetId]/versions`

**Contenu minimal MVP**

1. **En-tête** : titre « Versions », sous-titre avec nom du budget courant et, si `versionSetId` présent, lien ou libellé du **code ensemble** (`BudgetVersionSet.code` / `name` via `GET /budget-version-sets/:id` ou champs dérivés sur le budget si exposés).
2. **Liste chronologique** : lignes issues de `GET /api/budgets/:id/version-history` (déjà utilisé côté comparaison). Colonnes suggérées : libellé version (`versionLabel` ou `V{versionNumber}`), kind (Baseline / Révision), statut (badge), dates `activatedAt` / `archivedAt` si utiles, lien **Ouvrir** → `/budgets/{versionBudgetId}`.
3. **État vide** : si le budget n’est **pas** versionné (`!isVersioned` ou équivalent côté API) — carte explicative + CTA unique **Créer une baseline** (confirm dialog expliquant la duplication — aligné RFC-019 §6.1).
4. **Actions** (selon statut et permission) :
   - **Créer une révision** : depuis une version source autorisée (non archivée) — dialog avec `label` / `description` optionnels → `POST …/create-revision` ; toast + invalidation + navigation optionnelle vers le nouveau budget.
   - **Activer** : `POST …/activate-version` sur la ligne ciblée ; idempotence backend déjà garantie.
   - **Archiver** : `POST …/archive-version` avec confirmation — respecter la règle « baseline seule » (erreur backend à afficher lisiblement).

**RBAC** : masquer les CTA si l’utilisateur n’a pas `budgets.create` / `budgets.update` ; lecture seule avec `budgets.read`. Les **boutons de cycle** (T1 / T2 / clôture) ne sont **pas** sur cette page par défaut — ils vivent dans les **options** (§2.2) et requièrent `budgets.versioning_cycle.manage`.

## 4.2 Options budget — cycles T1 / T2 / clôture

Implémentation alignée sur §2.2 : bloc dans `/budgets/workflow-settings` (ou équivalent), sélection exercice / budget actif, boutons avec confirmation et **erreurs métier** renvoyées par le backend (R1–R5). Préférer un **wizard** ou une **modale de confirmation** listant les effets (nouvelle révision, statuts, snapshot optionnel pour clôture).

## 4.3 Intégration fiche budget (`/budgets/[budgetId]`)

- Bandeau ou menu secondaire : lien « Versions » (déjà présent ou à harmoniser) vers la page dédiée.
- Si le budget est la **version active** du set, badge discret « Version active » / « V{n} » pour ancrage mental (texte métier, pas ID).

## 4.4 Cohérence avec la comparaison

- Après création de versions, `useBudgetVersionHistory` doit se **rafraîchir** (invalidation query) pour que l’onglet / page Comparaison propose les nouvelles options sans rechargement manuel.
- Les libellés des sélecteurs de comparaison restent alignés sur `BudgetVersionSummaryDto` (déjà typé côté web).

## 4.5 API client — contrats à respecter

Réutiliser les chemins documentés RFC-019 §8 ; typage des réponses aligné sur les DTO backend existants (`CreateBaseline` / révision renvoient `budgetId`, `versionNumber`, etc.). Gestion d’erreur : messages `BadRequestException` / `NotFoundException` exposés en toast + détail optionnel.

---

# 5. Modifications Prisma / backend

## 5.1 Schéma

**Aucune évolution obligatoire du schéma Prisma pour le socle versioning** — RFC-019 déjà migré.

**Optionnel (lot 2)** : champ `cyclePhase` (enum client ou string normalisée) sur `Budget` pour fiabiliser la règle **R2** (anti-doublon T1/T2) sans parser `versionLabel` — à décider en conception détaillée.

## 5.2 Permissions

1. Enregistrer **`budgets.versioning_cycle.manage`** dans le catalogue des permissions ([RFC-011](./RFC-011-roles-permissions-modules.md)) et les seeds de rôles (profils DAF / contrôle de gestion selon politique produit).
2. Nouvelles routes **ou** surcharge des routes existantes :
   - **Variante A** : conserver `POST …/create-revision` mais n’autoriser les appels « préremplis cycle » que si l’appelant a `budgets.versioning_cycle.manage` **et** que le service applique R1–R5.
   - **Variante B (recommandée pour clôture)** : `POST /api/budgets/:id/versioning/close-cycle` (nom indicatif) avec body `{ phase: 'T1' \| 'T2' \| 'YEAR_END' }` — transaction unique : révision + transitions statut + snapshot optionnel ; garde **`RequirePermissions('budgets.versioning_cycle.manage')`**.

Les routes versioning existantes (`create-revision`, etc.) restent sous `budgets.create` / `budgets.update` pour les flux non cycle.

## 5.3 Règles métier serveur

Implémenter **R1 à R5** (tableau « Règles métier » dans §2.2) dans `BudgetVersioningService` ou service dédié ; **interdiction** de ne coder ces règles que côté frontend.

## 5.4 Données d’affichage

Si le bloc options nécessite des agrégats (exercice courant, budget actif du set), exposer des champs ou un petit **GET** de contexte cycle **scopé client** pour éviter les allers-retiers et respecter le cloisonnement multi-tenant.

---

# 6. Tests

## 6.1 Frontend

- Tests unitaires des helpers de libellé (format `V{n}`, statuts FR si i18n partiel).
- Tests composants : états loading / error / empty de la page Versions ; désactivation des CTA sans permission (mock session / permissions).

## 6.2 Backend

- Tests unitaires pour **R1–R5** (refus doublon T1, refus si non actif, etc.).
- Tests **permissions** : utilisateur avec `budgets.create` mais **sans** `budgets.versioning_cycle.manage` ne peut pas appeler les routes cycle (403).
- Si endpoint **close-cycle** : test d’intégration transaction (révision + statut + snapshot optionnel).

## 6.3 Manuel (checklist)

- Parcours : baseline → révision → activation → comparaison entre deux versions dans l’UI reporting.
- Parcours **options** : profil avec `budgets.versioning_cycle.manage` → T1 → révision créée avec libellé cohérent → refus deuxième T1.
- Multi-client : utilisateur A ne voit pas les version sets du client B.
- **Pas d’ID brut** dans les titres de cartes ou options (revue visuelle).

---

# 7. Récapitulatif final

| Livrable | Description |
| --- | --- |
| Page Versions fonctionnelle | Liste + actions métier + états vides / erreurs |
| API client complète | Mutations versioning + invalidation cache |
| UX gouvernance | Utilisateur peut enchaîner création / activation sans passer par l’API brute |
| **Rôle cycle** | Permission `budgets.versioning_cycle.manage` + bloc **options** (T1 / T2 / clôture) avec règles **R1–R5** côté backend |
| Alignement RFC-019 | Duplication / versions inchangées ; extensions cycle documentées dans la présente RFC |

---

# 8. Points de vigilance

1. **Duplication baseline** : `create-baseline` crée un **nouveau** budget V1 — l’UI doit éviter la confusion avec le budget d’origine (copy claire, redirection explicite vers le budget versionné à piloter).
2. **Codes stables** : enveloppes / lignes — ne pas afficher de nouveaux codes générés à la volée en UI ; la comparaison repose sur les **codes** (RFC-019 §9.2).
3. **Snapshot vs version** : ne pas mélanger les libellés dans les écrans d’aide ; renvoi RFC-031 si nécessaire.
4. **Performance** : `version-history` sur budgets avec beaucoup de révisions — pagination **hors MVP** ; surveiller la taille des réponses.
5. **Audit** : les actions restent tracées côté backend — pas besoin de dupliquer un journal dans l’UI ; renvoi vers l’onglet Décisions ([RFC-032](./RFC-032%20%E2%80%94%20Historisation%20d%C3%A9cisions%20budg%C3%A9taires.md)) pour la lecture transverse si besoin.
6. **Clôture** : le service enchaîne snapshot optionnel → révision YEAR_END → `LOCKED` → activation ; les étapes ne sont **pas** toutes dans une unique `$transaction` Prisma — en cas d’erreur rare après une étape intermédiaire, vérifier la cohérence côté données / support.
7. **Séparation des rôles** : ne pas confondre « éditeur budget » et « pilote de cycle » — éviter d’attribuer `budgets.versioning_cycle.manage` à tous les contributeurs.

---

## Références code (ancrage dépôt)

| Zone | Chemin |
| --- | --- |
| Service versioning + cycles | `apps/api/src/modules/budget-versioning/budget-versioning.service.ts` |
| Contrôleurs | `budget-versioning.controller.ts` (budgets + routes cycle), `budget-version-sets.controller.ts` |
| Page Versions | `apps/web/src/app/(protected)/budgets/[budgetId]/versions/page.tsx` + `features/budgets/components/budget-versions/*` |
| Client API | `apps/web/src/features/budgets/api/budget-versioning.api.ts` |
| Bloc cycle (workflow settings) | `apps/web/src/features/budgets/components/workflow-settings/budget-cycle-version-block.tsx` |
| Permission seed | `apps/api/prisma/seed.ts` / `default-profiles.json` — `budgets.versioning_cycle.manage` |
| Historique comparaison | `apps/web/src/features/budgets/forecast/hooks/use-budget-version-history.ts` |

---

*Fin du document — RFC-033.*
