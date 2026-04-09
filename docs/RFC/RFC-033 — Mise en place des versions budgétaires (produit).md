# RFC-033 — Mise en place des versions budgétaires (produit)

## Statut

**Draft** — cadrage produit et alignement sur l’implémentation `BudgetSnapshot` existante. L’UI liste dédiée `/budgets/[budgetId]/snapshots` reste à finaliser (voir §6).

## Priorité

Moyenne à haute (gouvernance CODIR, traçabilité d’une base figée avant arbitrage, cohérence vocabulaire avec la comparaison budgétaire).

## Dépendances

* [RFC-019 — Budget Versioning](./RFC-019%20%E2%80%94%20Budget%20Versioning.md) — lignée de **révisions** (`Budget` dupliqués, brouillon / actif) ; **distinct** de la « version figée » définie ici.
* [RFC-031 — Budget Snapshots MVP](./RFC-031%20%E2%80%94%20Budget%20Snapshots%20MVP%20(fig%C3%A9,%20lecture%20seule).md) — périmètre technique MVP snapshot ; **convergence vocabulaire** : voir §2.3.
* [RFC-015-3 — Snapshots budgétaires](./RFC-015-3%20%E2%80%94%20Snapshots%20budg%C3%A9taires.md) — vision élargie historique.
* [RFC-030 — Budget Forecast & Comparaison](./RFC-030%20%E2%80%94%20Budget%20Forecast%20%26%20Comparaison%20Budg%C3%A9taire.md) — moteur de comparaison ; réutilisation des snapshots.
* [RFC-FE-BUD-030 — Forecast et Comparaison budgétaire UI](./RFC-FE-BUD-030%20%E2%80%94%20Forecast%20et%20Comparaison%20budg%C3%A9taire%20UI.md) — sélecteurs snapshot / version.
* [RFC-032 — Historisation décisions budgétaires](./RFC-032%20%E2%80%94%20Historisation%20d%C3%A9cisions%20budg%C3%A9taires.md) — journal décisionnel (ne remplace pas la photo figée).
* [docs/ARCHITECTURE.md](../ARCHITECTURE.md) — client actif, isolation multi-client.
* [docs/FRONTEND_UI-UX.md](../FRONTEND_UI-UX.md) — libellés métier, pas d’ID brut en UI.
* [docs/FRONTEND_ARCHITECTURE.md](../FRONTEND_ARCHITECTURE.md) — `platformRole` / `PLATFORM_ADMIN`, navigation plateforme.
* [RFC-012 — Vérification des permissions](./RFC-012%20%E2%80%94%20V%C3%A9rification%20des%20permissions.md) — pour l’attribution du pilotage référentiel côté client (permission dédiée).

**Évolution référentiel « type d’occasion »** : décrite en **§4.4** et **§13** (global plateforme + extensions client pilotées par rôle). Le MVP sans migration peut toujours s’appuyer sur `name` / `description` / `snapshotDate` seuls.

---

# 1. Analyse de l’existant

## 1.1 Définition produit retenue

Une **version (produit)** est une **copie figée en lecture seule** du budget **tel qu’il est au moment de la capture**, associée à une **occasion** métier (comité, clôture mensuelle, passage en arbitrage, demande CODIR, etc.).

* Elle ne se synchronise **pas** avec le budget vivant après création.
* Elle sert de **preuve** et de **point de comparaison** dans le temps.

## 1.2 Portage technique : `BudgetSnapshot`

Le dépôt implémente déjà ce concept sous le nom technique **snapshot** :

| Élément | Emplacement / détail |
| --- | --- |
| Modèle Prisma | `BudgetSnapshot`, `BudgetSnapshotLine` — [`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma) |
| Service | [`apps/api/src/modules/budget-snapshots/budget-snapshots.service.ts`](../../apps/api/src/modules/budget-snapshots/budget-snapshots.service.ts) |
| Contrôleur | [`apps/api/src/modules/budget-snapshots/budget-snapshots.controller.ts`](../../apps/api/src/modules/budget-snapshots/budget-snapshots.controller.ts) — préfixe `budget-snapshots` |
| DTO création | [`create-budget-snapshot.dto.ts`](../../apps/api/src/modules/budget-snapshots/dto/create-budget-snapshot.dto.ts) : `budgetId`, `name` ou `label` (au moins un requis côté service), `description?`, `snapshotDate?` |
| Agrégation lignes | Seules les lignes dont le statut est dans `PILOTAGE_INCLUDED_LINE_STATUSES` sont copiées (`ACTIVE`, `PENDING_VALIDATION`, `CLOSED`) — [`budget-aggregate-statuses.ts`](../../apps/api/src/modules/budget-management/constants/budget-aggregate-statuses.ts) |

### Champs persistés utiles « occasion » (déjà en base)

Sur `BudgetSnapshot` : `name`, `code` (unique client, généré serveur type `SNAP-YYYYMMDD-…`), `description`, `snapshotDate`, statut `ACTIVE` / `ARCHIVED`, méta budget figées (`budgetName`, `budgetCode`, `budgetCurrency`, `budgetStatus`), totaux agrégés, `createdByUserId`, `createdAt`.

Sur `BudgetSnapshotLine` : rattachement `budgetLineId`, libellés enveloppe / ligne, montants figés (`initial`, `revised`, `forecast`, `committed`, `consumed`, `remaining`), `lineStatus` au moment de la capture.

## 1.3 API actuelle (vérité code)

| Méthode | Route | Permission | Rôle |
| --- | --- | --- | --- |
| `POST` | `/api/budget-snapshots` | `budgets.create` | Créer une version figée à partir d’un `budgetId` du client actif |
| `GET` | `/api/budget-snapshots?budgetId=&limit=&offset=` | `budgets.read` | Liste paginée, filtre optionnel par budget |
| `GET` | `/api/budget-snapshots/:id` | `budgets.read` | Détail + lignes ; audit `budget_snapshot.viewed` |
| `GET` | `/api/budget-snapshots/compare?leftSnapshotId=&rightSnapshotId=` | `budgets.read` | Comparaison deux snapshots |

Guards : JWT, client actif, module, `PermissionsGuard` — aligné avec le reste du module budget.

## 1.4 Frontend

* Comparaison / sélection : hooks et API client autour des snapshots (voir [docs/modules/budget-frontend.md](../modules/budget-frontend.md), RFC-FE-BUD-030).
* Route `/budgets/[budgetId]/snapshots` : **squelette** — la RFC-033 cible la **finition** : liste, CTA « Enregistrer une version » (libellé métier), détail lecture seule.

## 1.5 Ce que RFC-019 couvre (et ne couvre pas)

* **Couvre** : `BudgetVersionSet`, révisions sous forme de **nouveaux** enregistrements `Budget` + enveloppes + lignes, statuts `DRAFT` / `ACTIVE`, comparaison de versions dans la lignée.
* **Ne couvre pas** : photo immuable à un instant T sans nouvel arbre éditable — c’est le rôle de la **version figée** = `BudgetSnapshot`.

---

# 2. Glossaire et convergence RFC-031

## 2.1 Termes

| Terme | Signification |
| --- | --- |
| **Version figée** (produit) | Synonyme métier de **snapshot** : copie lecture seule pour une occasion. |
| **Révision / version budgétaire (RFC-019)** | Instance `Budget` dans une lignée versionnée, **modifiable** selon statut. |
| **Snapshot** (technique) | Table `BudgetSnapshot` ; à exposer en UI avec libellés (`name`, `code`, date, auteur). |

**Ne pas confondre** dans les écrans et la doc utilisateur : « Version figée avant CODIR » (snapshot) vs « Révision V2 » (RFC-019).

## 2.2 Relation avec RFC-031

RFC-031 affirmait « Snapshot ≠ version » au sens **produit historique** (éviter la confusion avec RFC-019). **À partir de RFC-033**, le terme **« version »** en langage métier **désigne** une version **figée**, matérialisée techniquement par un **snapshot**. La révision RFC-019 doit être nommée explicitement **révision** ou **version de travail** dans l’UI si les deux concepts coexistent sur le même écran.

---

# 3. Hypothèses

1. **MVP minimal** : une « occasion » textuelle peut suffire (`name` + `description` + `snapshotDate`) tant que le référentiel §4.4 n’est pas livré.
2. **Avec référentiel** : le type d’occasion est **optionnel** sur le snapshot (`occasionTypeId` nullable) pour ne pas bloquer les flux existants ; `name` reste obligatoire pour un libellé humain même si un type est choisi.
3. La capture depuis le budget **sélectionné** (souvent le budget actif de l’exercice) reste le flux principal ; pas besoin d’une entité intermédiaire hors `budgetId`.
4. Archivage (`BudgetSnapshotStatus.ARCHIVED`) peut rester une évolution ultérieure côté API/UI si non encore exposé partout.
5. La permission exacte « pilotage référentiel client » est **une permission dédiée** (recommandé) plutôt que d’élargir indistinctement `CLIENT_ADMIN`, sauf décision produit contraire.

---

# 4. Comportement fonctionnel cible

## 4.1 Création

* **Entrée** : budget appartenant au **client actif** ; `name` ou `label` (affichage métier) obligatoire après trim côté serveur ; **`occasionTypeId` optionnel** une fois le référentiel §4.4 disponible (type global ou du même client, actif).
* **Effet** : insertion `BudgetSnapshot` + `BudgetSnapshotLine` pour chaque ligne incluse au pilotage ; code unique par client ; totaux cohérents avec la somme des lignes copiées.
* **Audit** : `budget_snapshot.created` (déjà émis).

## 4.2 Lecture seule

* Aucun `PATCH` / `DELETE` sur les lignes snapshot dans le périmètre MVP.
* Le budget source peut continuer à évoluer sans affecter les snapshots existants.

## 4.3 Permissions

* Création : alignée sur `budgets.create` (à affiner par rôle métier si besoin, sans affaiblir l’isolation client).
* Lecture / comparaison : `budgets.read`.
* Toutes les requêtes filtrent par `clientId` dérivé du contexte authentifié — jamais un `clientId` passé en aveugle par le client.

## 4.4 Référentiel « type d’occasion » (pourquoi cette version ?)

Besoin produit : structurer le **motif** de la version figée (CODIR, clôture mensuelle, arbitrage DG, audit, etc.) via un **référentiel pilotable**, sans afficher des IDs bruts en UI.

### 4.4.1 Deux niveaux de gouvernance

| Niveau | Qui pilote | Portée | Objectif |
| --- | --- | --- | --- |
| **Global plateforme** | Utilisateur **`PLATFORM_ADMIN`** (`platformRole`, guard type [`PlatformAdminGuard`](../../apps/api/src/common/guards/platform-admin.guard.ts)) | **Tous les clients** | Catalogue de types **par défaut** ou **obligatoires** (homogénéité multi-tenant, onboarding, norme Starium). |
| **Client** | Utilisateurs auxquels on a attribué un **rôle / permission** dédié(e) dans le **client actif** (RBAC client, ex. permission explicite `budgets.snapshot_occasion_types.manage` ou équivalent — **à figer dans la matrice permissions** lors de l’implémentation) | **Un seul `clientId`** | Compléter ou spécialiser le catalogue pour ce client (libellés métier, codes internes, désactivation locale d’une entrée globale si le modèle le permet). |

**Règles transverses**

* Le référentiel **global** ne doit **jamais** fuiter vers un autre client : en lecture, un utilisateur client ne voit que **(a)** les entrées globales applicables + **(b)** les entrées dont `clientId` = client actif.
* La création / modification / archivage des entrées **globales** passe par des routes **`/api/platform/...`** (ou équivalent existant plateforme), avec **`JwtAuthGuard` + `PlatformAdminGuard`** — **sans** `clientId` fourni par le body (non fiable).
* La création / modification / archivage des entrées **client** passe par des routes scopées **client actif** (même pattern que le reste du module budget), avec la **permission dédiée** ; pas d’accès aux entrées globales en écriture pour un simple admin client (sauf évolution produit explicite).

### 4.4.2 Modèle de données (proposition)

Table **`BudgetSnapshotOccasionType`** (nom indicatif) :

* `id`, `code` (stable, unique **par périmètre** — voir ci-dessous), `label`, `description?`, `sortOrder`, `isActive` (boolean), `createdAt` / `updatedAt`.
* **`clientId`** : `NULL` = entrée **globale** (plateforme) ; non null = entrée **propre au client**.
* Unicité recommandée : `@@unique([clientId, code])` avec convention Prisma pour `clientId` nullable (souvent deux index partiels ou `code` unique global pour les lignes `clientId IS NULL` selon choix d’implémentation — à valider en migration).

**Résolution à l’affichage** (liste pour formulaire « Enregistrer une version ») :

1. Charger les types **globaux** actifs.
2. Charger les types **du client actif** actifs.
3. Stratégie de **fusion** à documenter en implémentation : soit **empilement** (client **en plus** du global), soit **surcharge** si même `code` (le client remplace le libellé global pour ce code) — **recommandation** : empilement par défaut + codes distincts côté client pour éviter l’ambiguïté ; si surcharge, une seule ligne effective par `code` après merge côté API.

### 4.4.3 Liaison avec `BudgetSnapshot`

* Ajouter **`occasionTypeId`** (nullable FK vers `BudgetSnapshotOccasionType`) sur `BudgetSnapshot`.
* À la création d’une version figée : le DTO accepte `occasionTypeId?` ; le service vérifie que le type référencé est **lisible** pour le client (global actif ou `clientId` = client du budget).
* Les réponses API exposent **`occasionTypeCode`**, **`occasionTypeLabel`** (et éventuellement `occasionTypeScope`) pour respecter la règle **valeur affichée, pas ID** dans les tableaux et résumés.

### 4.4.4 Audit

* Création / mise à jour / désactivation d’un type (global ou client) : actions dédiées dans `AuditLog` (`resourceType` adapté, `clientId` renseigné pour le scope client, null ou sentinelle cohérente pour le scope global selon conventions RFC-013).

---

# 5. API (contrat stable / évolutions mineures)

L’existant satisfait le cœur du besoin. Évolutions possibles sans casser le contrat :

* Exposer explicitement dans les réponses liste/détail un champ **`displayLabel`** redondant avec `name` si l’UI unifie `name`/`label` côté formulaire.
* `GET` liste : conserver pagination ; options futures `status`, `fromDate` / `toDate` sur `snapshotDate`, **`occasionTypeId`** si référentiel §4.4 implémenté.
* Document OpenAPI / `API.md` : aligner les exemples sur le libellé « version figée » en description humaine.

Les réponses incluent déjà **`createdByLabel`** (construction à partir de `firstName` / `lastName` / `email`) — respect de la règle « valeur, pas ID » en UI.

**Référentiel type d’occasion (extension §4.4)** — contrat indicatif :

* **`GET /api/budget-snapshot-occasion-types`** (client actif, `budgets.read` ou permission lecture dédiée) : liste fusionnée **globale + client**, triée, avec `code`, `label`, `description?`, `scope` (`global` | `client`).
* **`POST|PATCH|DELETE /api/platform/budget-snapshot-occasion-types`** (ou sous-ressource cohérente avec les autres écrans plateforme) : **`PLATFORM_ADMIN` uniquement** ; corps sans `clientId` client arbitraire.
* **`POST|PATCH|DELETE /api/budget-snapshot-occasion-types`** (client actif) : CRUD entrées **`clientId` = client actif** ; permission **`budgets.snapshot_occasion_types.manage`** (nom exact à aligner sur la seed des permissions).

**`POST /api/budget-snapshots`** : champ optionnel **`occasionTypeId`** ; validation d’éligibilité du type pour le client du budget.

---

# 6. Frontend (périmètre à livrer pour « mise en place » produit)

| Livrable | Détail |
| --- | --- |
| Page `/budgets/[budgetId]/snapshots` | Liste des versions figées pour ce budget (colonnes : nom, code, date, auteur, totaux clés) ; états loading / error / empty |
| Action principale | « Enregistrer une version » → dialogue : nom (obligatoire), description optionnelle, date (défaut aujourd’hui), **type d’occasion** (select **libellé**, valeur technique `occasionTypeId`) → `POST /api/budget-snapshots` |
| Détail | Vue lecture seule des lignes et totaux (`GET :id`) ; liens vers comparaison si pertinent |
| Cohérence | Réutiliser patterns `features/budgets`, query keys tenant-aware, même style que RFC-FE-BUD-030 |
| **Admin référentiel** | **Plateforme** : écran(s) sous navigation `PLATFORM_ADMIN` pour CRUD types **globaux**. **Client** : écran paramètres budget (ou studio admin client) pour CRUD types **client**, visible seulement si l’utilisateur a la **permission** de pilotage (§4.4.1) |

---

# 7. Prisma / migrations

**Aucune migration obligatoire** pour le MVP **sans** type structuré : `name` / `description` / `snapshotDate` suffisent.

**Migration pour §4.4 (type d’occasion)** :

1. Créer **`BudgetSnapshotOccasionType`** avec `clientId` nullable, champs `code`, `label`, `description`, `sortOrder`, `isActive`, timestamps ; indexes / unicité selon §4.4.2.
2. Ajouter **`occasionTypeId`** (nullable FK) sur **`BudgetSnapshot`**.
3. Seed optionnel : quelques types **globaux** (`clientId` null) pour démo et nouveaux clients.

**Extensions ultérieures** : index sur `(clientId, isActive, sortOrder)` pour listes rapides ; pas de `JSON` obligatoire pour le MVP référentiel.

---

# 8. Tests (déjà en place / à maintenir)

* **Controller** : [`budget-snapshots.controller.spec.ts`](../../apps/api/src/modules/budget-snapshots/budget-snapshots.controller.spec.ts) — garder la couverture création / liste / détail / compare.
* **Service** : vérifier isolation `clientId`, refus si budget hors client, conflit code unique (retry), lignes exclues du pilotage non présentes dans le snapshot.
* **Non-régression** : `BudgetComparisonService` / forecast si les snapshots sont utilisés dans les flux de comparaison (RFC-030).
* **Référentiel §4.4** : service types — liste fusionnée ne contient pas d’entrée d’un autre client ; routes plateforme refusent `platformRole` non admin ; création snapshot avec `occasionTypeId` invalide / hors scope → erreur explicite.

---

# 9. Liste des fichiers (implémentation UI / doc — lors du développement)

| Fichier / zone | Action typique |
| --- | --- |
| `apps/web/src/app/(protected)/budgets/[budgetId]/snapshots/` | Remplacer squelette par liste + création |
| `apps/web/src/features/budgets/` (api, hooks, types) | Module `budget-snapshots` client si besoin d’extension |
| `docs/modules/budget-frontend.md` | Mettre à jour statut route snapshots |
| `docs/API.md` | Section `budget-snapshots` avec sémantique « version figée » |
| `apps/api/src/modules/...` (nouveau module ou extension) | `budget-snapshot-occasion-types` + contrôleur plateforme ; permissions seed |
| `apps/web` | Pages plateforme + paramètres client pour CRUD types ; select création snapshot |

---

# 10. Récapitulatif

* **Version (produit)** = **`BudgetSnapshot`** : copie figée, lecture seule, pour une occasion donnée.
* **Révision (RFC-019)** = autre concept (lignée éditable).
* **Type d’occasion** : référentiel **global** piloté par **`PLATFORM_ADMIN`** ; référentiel **client** piloté par un **rôle / permission** dédié dans le client actif ; fusion en lecture pour les formulaires (§4.4, §13).
* Backend déjà opérationnel pour le **cœur** snapshot ; types d’occasion + UI paramètres = **extension** documentée ici.

---

# 11. Points de vigilance

* **Vocabulaire** : former les utilisateurs et harmoniser les libellés (éviter « version » seul sans contexte).
* **Périmètre des lignes** : les lignes `DRAFT` / `DEFERRED` / etc. **ne sont pas** dans le snapshot — le message UI doit l’indiquer si on expose une création depuis un budget avec beaucoup de brouillons.
* **Unicité `code`** : géré par le serveur ; l’utilisateur ne saisit pas le code.
* **Sécurité** : ne jamais exposer des snapshots d’un autre client ; vérifier les tests d’isolation sur `GET` et `POST`.
* **Référentiel** : un **`PLATFORM_ADMIN`** ne doit pas pouvoir, via une route **client actif**, modifier les données d’un client sans passer par les garde-fous habituels ; inversement, un utilisateur **client** ne doit **jamais** créer de ligne globale (`clientId` null). Vérifier les tests **cross-client** sur `occasionTypeId` à la création de snapshot.
* **Fusion global / client** : documenter et tester la règle de merge (doublons de `code`, désactivation) pour éviter des listes incohérentes en UI.

---

# 12. Implémentation complète (checklist)

*(Pour l’agent / développeur qui implémente après validation RFC.)*

1. UI liste + création + détail snapshots sur `/budgets/[budgetId]/snapshots`.
2. Entrée menu / onglet depuis la fiche budget (cohérent avec [budget-frontend.md](../modules/budget-frontend.md)).
3. Vérifier permissions et messages d’erreur API.
4. Mettre à jour `budget-frontend.md` et extraits `API.md` si nécessaire.
5. Tests e2e ou tests composants sur le flux « enregistrer une version » (selon stratégie du repo).

---

# 13. Référentiel type d’occasion — récap implémentation

| Étape | Détail |
| --- | --- |
| Prisma | `BudgetSnapshotOccasionType` + `BudgetSnapshot.occasionTypeId` (§7) |
| Seed | Types globaux par défaut (`clientId` null) |
| API plateforme | CRUD global, `PlatformAdminGuard` |
| API client | `GET` fusionné ; CRUD client avec permission dédiée + `ActiveClientGuard` |
| Snapshots | DTO `occasionTypeId?` ; validation ; réponses enrichies `occasionTypeLabel` / `occasionTypeCode` |
| RBAC | Nouvelle permission client pour pilotage référentiel ; matrice rôles + seed |
| UI | Select libellé à la création de version ; écrans paramètres plateforme + client |
| Tests | Isolation client, interdit création type global pour user client, snapshot avec `occasionTypeId` d’un autre client → 400/404 |
