# RFC-STRAT-005 — Stratégie par direction et vision stratégique

## Statut

✅ **Implémentée (MVP)** — backend + frontend livrés (2026-05-05).

**Dépend de** : [RFC-STRAT-001](./RFC-STRAT-001%20%E2%80%94%20Strategic%20Vision%20Core%20Backend.md) (modèle vision / axes / objectifs / liens), [RFC-STRAT-002](./RFC-STRAT-002%20%E2%80%94%20Strategic%20Vision%20KPI%20and%20Alignment%20Engine.md) (KPI agrégés), [RFC-STRAT-003](./RFC-STRAT-003%20%E2%80%94%20Strategic%20Vision%20Frontend%20UI.md), [RFC-STRAT-004](./RFC-STRAT-004%20%E2%80%94%20Strategic%20Vision%20Alerts%20and%20CODIR%20Widgets.md) (alertes & widgets).

**Relié (hors périmètre direct MVP de cette RFC)** : portefeuille projet ([RFC-PROJ-014](./RFC-PROJ-014%20%E2%80%94%20Cat%C3%A9gories%20du%20portefeuille%20projets.md)), centres de coûts budgétaires (`CostCenter`, RFC-021) — distinction explicite ci-dessous.

---

## 1) Analyse de l’existant

### 1.1 Ce qui existe déjà (Strategic Vision)

- Hiérarchie **Vision → Axe → Objectif → Liens** (`StrategicVision`, `StrategicAxis`, `StrategicObjective`, `StrategicLink`) avec `clientId` partout ([RFC-STRAT-001](./RFC-STRAT-001%20%E2%80%94%20Strategic%20Vision%20Core%20Backend.md)).
- KPI globaux client : taux d’alignement projet, objectifs à risque / hors trajectoire / en retard, etc. ([RFC-STRAT-002](./RFC-STRAT-002%20%E2%80%94%20Strategic%20Vision%20KPI%20and%20Alignment%20Engine.md)).
- UI cockpit `/strategic-vision` et widgets CODIR consommant `/kpis` et `/alerts` ([RFC-STRAT-003](./RFC-STRAT-003%20%E2%80%94%20Strategic%20Vision%20Frontend%20UI.md), [RFC-STRAT-004](./RFC-STRAT-004%20%E2%80%94%20Strategic%20Vision%20Alerts%20and%20CODIR%20Widgets.md)).

### 1.2 Lacune produit

Les CODIR et DSI fractionnée ont besoin de **découper la lecture stratégique par direction métier** (ex. « Systèmes d’information », « RH », « Finance », « Cybersécurité », « Data ») tout en restant **ancrés sur la même vision stratégique** (horizon, statement, axes).

Aujourd’hui :

- Les **axes** structurent les priorités de la vision mais ne sont **pas** un référentiel directions / périmètres organisationnels normalisés.
- Aucun rattachement canonique **objectif ↔ direction** ne permet de filtrer les KPI ni les listes d’objectifs par direction sans ambiguïté.

### 1.3 Objets voisins (ne pas confondre)

| Concept | Rôle | Usage pour cette RFC |
| ------- | ---- | -------------------- |
| `StrategicAxis` | Priorité / thème sous la vision | Reste ; orthogonal aux « directions » |
| `CostCenter` | Répartition analytique budgétaire | Option d’**alignement secondaire** (V2) : lien optionnel direction → cost center, pas substitut |
| `Collaborator.department` | Texte annuaire / RH | Non source de vérité pour la stratégie ; pas utilisé comme FK |
| Catégories portefeuille projet | Structuration projets | Peut **corréler** en V2 avec des directions ; hors MVP de STRAT-005 |

---

## 2) Objectifs métier

1. Définir un **référentiel client-scopé de directions stratégiques** (libellés métier, code court, ordre, actif/inactif).
2. Permettre d’**affecter chaque objectif stratégique** (optionnellement) à **une direction porteuse** (« accountable ») pour le pilotage CODIR.
3. Exposer des **KPI et vues filtrables par direction** sans dupliquer la vision : une vision active, plusieurs « coupes » par direction.
4. Respecter **multi-client**, **permissions** existantes ou extension minimale, **audit**, et règle UI **valeur affichée, pas ID** ([FRONTEND_UI-UX](../FRONTEND_UI-UX.md), `.cursorrules`).

---

## 3) Hypothèses et arbitrages

### 3.1 Définition « direction »

**Direction stratégique** = entité métier **gouvernance / CODIR** : périmètre de responsabilité pour l’exécution des objectifs de la vision active. Ce n’est pas nécessairement l’organigramme HR complet ni le plan comptable.

### 3.2 Cardinalité objectif ↔ direction (MVP)

- **MVP** : au plus **une** direction porteuse par objectif : `StrategicObjective.directionId` (nullable).
- **V2 (optionnelle)** : objectifs transverses — table de jonction `StrategicObjectiveDirection` (plusieurs directions contributrices) + règles de comptage KPI (éviter double comptage : documenter règle « primaire vs contributive »).

### 3.3 Vision active et directions

- Les directions sont **au niveau client** (réutilisables d’une vision à l’autre), avec **cycle de vie** (archivage logique) pour ne pas casser l’historique des objectifs passés.
- Lors d’un changement de vision active, les directions **restent** ; les objectifs de l’ancienne vision peuvent garder leur `directionId` pour historique (lecture) ou être masqués selon règles UX (hors scope technique minimal : lecture filtrée par `visionId` déjà portée par l’axe).

**Suppression d’une direction (alignement code)** : en plus du **statut logique** recommandé via `isActive: false`, une suppression **physique** `DELETE` est exposée lorsqu’aucune stratégie de direction ne référence encore la ligne. Les stratégies de direction ([RFC-STRAT-006](./RFC-STRAT-006%20%E2%80%94%20Stratégie%20de%20direction%20et%20validation%20CODIR)) en dépendent par `directionId` en cascade métier protégée côté service.

### 3.4 Relation avec les axes

- Un objectif reste rattaché à un **axe** (`axisId`). La **direction** est une **deuxième dimension** : matrice « axe × direction » lisible en cockpit (pas fusion axe = direction sauf cadrage produit explicite côté client).

---

## 4) Modèle de données (Prisma) — cible

### 4.1 Nouveau modèle `StrategicDirection`

| Champ | Type | Notes |
| ----- | ---- | ----- |
| `id` | `String` @id cuid | |
| `clientId` | `String` | Obligatoire ; FK `Client` |
| `code` | `String` | Unique par `(clientId, code)` ; court, stable (exports) |
| `name` | `String` | Libellé métier principal UI |
| `description` | `String?` | |
| `sortOrder` | `Int` | Défaut 0 |
| `isActive` | `Boolean` | Défaut true ; false = archivé logique |
| `createdAt` / `updatedAt` | `DateTime` | |

Index : `@@index([clientId])`, `@@index([clientId, isActive])`, `@@unique([clientId, code])`.

### 4.2 Évolution `StrategicObjective`

- Ajouter `directionId String?` avec FK vers `StrategicDirection`, `onDelete: SetNull` (si direction archivée/supprimée selon politique — préférer **interdiction de suppression** s’il existe des objectifs actifs non archivés, ou **SetNull** + audit ; à trancher en implémentation : recommandation **soft-delete via `isActive`** plutôt que `DELETE`).

Index : `@@index([clientId, directionId])` pour agrégations KPI.

### 4.3 Hors scope MVP STRAT-005

- Lien `StrategicDirection` ↔ `CostCenter`.
- `directionId` sur `Project`.
- Permissions fines par direction (RBAC par périmètre direction).

---

## 5) API REST — cible

Guards sur **toutes** les routes : `JwtAuthGuard`, `ActiveClientGuard`, `ModuleAccessGuard`, `PermissionsGuard`. Aucun `clientId` dans les body ; scope = client actif.

### 5.1 Référentiel directions

| Méthode | Route | Permission | Description |
| ------- | ----- | ---------- | ----------- |
| `GET` | `/api/strategic-directions` | `strategic_vision.read` | Liste paginée ou complète ; filtres `isActive`, `search` sur code/name |
| `POST` | `/api/strategic-directions` | `strategic_vision.update` *ou* `strategic_vision.manage_directions` | Création |
| `PATCH` | `/api/strategic-directions/:id` | idem | Mise à jour (name, description, sortOrder, isActive, code) |
| `DELETE` | `/api/strategic-directions/:id` | idem | Suppression : réponse `204 No Content` ; **refus `400`** tant qu’il existe au moins une `StrategicDirectionStrategy` pour cette direction (éviter cascade destructive). Les `StrategicObjective` liés passent en `directionId` null si la suppression est effectuée (`onDelete: SetNull`). Audit `strategic_direction.deleted`. |

**DTO** : `CreateStrategicDirectionDto` / `UpdateStrategicDirectionDto` avec `class-validator` (`code`, `name`, …). Réponses : inclure `name`, `code`, jamais seul `id` comme seule « valeur » côté UI (l’ID reste clé technique).

### 5.2 Objectifs

- Étendre `PATCH /api/strategic-objectives/:id` (existant, RFC-STRAT-001) avec champ optionnel `directionId` (nullable). Valider que la direction appartient au **même** `clientId` que l’objectif.

### 5.3 KPI par direction

**Option A (recommandée, additive)** : nouvel endpoint pour ne pas casser le contrat STRAT-002.

- `GET /api/strategic-vision/kpis/by-direction`
- Réponse type :

```ts
type StrategicDirectionKpiRow = {
  directionId: string;
  directionCode: string;
  directionName: string;
  projectAlignmentRate: number;
  unalignedProjectsCount: number;
  objectivesAtRiskCount: number;
  objectivesOffTrackCount: number;
  overdueObjectivesCount: number;
  /** projets actifs liés à au moins un objectif de cette direction */
  alignedActiveProjectsCount: number;
  /** projets actifs dont au moins un lien stratégique passe par un objectif de cette direction — définition à figer = même base que STRAT-002 mais restreinte aux objectifs où directionId = row */
  totalActiveProjectsRelevantCount: number;
};

type StrategicVisionKpisByDirectionResponse = {
  rows: StrategicDirectionKpiRow[];
  /** KPI globaux : même contrat que `GET /api/strategic-vision/kpis` (RFC-STRAT-002) */
  global: {
    projectAlignmentRate: number;
    unalignedProjectsCount: number;
    objectivesAtRiskCount: number;
    objectivesOffTrackCount: number;
    overdueObjectivesCount: number;
    generatedAt: string;
  };
  generatedAt: string;
};
```

Les définitions numériques de chaque compteur **reprennent les mêmes règles** que [RFC-STRAT-002](./RFC-STRAT-002%20%E2%80%94%20Strategic%20Vision%20KPI%20and%20Alignment%20Engine.md) §4, restreintes aux objectifs dont `directionId` correspond à la ligne. Les objectifs **sans** direction peuvent :

- soit être exclus des lignes et regroupés dans un seul pseudo-row `directionId: null` libellé « Non affecté » (affichage métier) ;
- soit apparaître uniquement dans `global` — **à trancher produit** ; recommandation : **row « Non affecté »** pour visibilité CODIR.

### 5.4 Alertes (STRAT-004)

- Étendre `GET /api/strategic-vision/alerts` avec paramètre optionnel `directionId` **ou** inclure `directionId` / `directionName` sur chaque alerte concernant un objectif — spécification alignée sur l’implémentation actuelle des alertes (fichier service `strategic-vision`).

---

## 6) Implémentation complète (plan technique)

### 6.1 Backend NestJS

| Fichier / zone | Action |
| -------------- | ------ |
| `apps/api/prisma/schema.prisma` | Modèle `StrategicDirection` + `StrategicObjective.directionId` |
| `apps/api/prisma/migrations/*` | Migration idempotente |
| `apps/api/src/modules/strategic-vision/` | Service : CRUD directions, validation cross-entités, méthode `getKpisByDirection` |
| `apps/api/src/modules/strategic-vision/strategic-vision.controller.ts` (ou sous-contrôleur) | Routes §5 incl. `DELETE /api/strategic-directions/:id` |
| `apps/api/src/modules/strategic-vision/dto/` | DTOs create/update direction ; extension patch objectif |
| `apps/api/prisma/seed.ts` / `default-profiles.json` | Si nouvelle permission `strategic_vision.manage_directions` : seed rôles admin client |
| Audit | `strategic_direction.created` / `.updated` / `.deleted`, `strategic_objective.direction_changed` |

### 6.2 Frontend Next.js

| Fichier / zone | Action |
| -------------- | ------ |
| `apps/web/src/features/strategic-vision/` | Onglet **Directions** (`/strategic-vision` → navigation interne `?tab=directions`) : liste + création / édition / suppression (UI) ; invalidation cache croisée avec le module stratégie ; sélecteur **libellé** sur fiche objectif |
| `apps/web/src/config/navigation.ts` + `apps/web/src/components/shell/sidebar.tsx` | Entrée **Vision stratégique** en menu latéral déroulant : **Vision Entreprise** → `/strategic-vision?tab=enterprise`, **Stratégie** → `/strategic-direction-strategy` ; visibilité parent si **au moins une** des permissions `strategic_vision.read` ou `strategic_direction_strategy.read` |
| Query keys | Inclure `clientId` ; invalidation sur mutations |
| `/strategic-vision` | Filtre global par direction ; tableaux / KPI utilisant `/kpis/by-direction` |
| Widgets CODIR | Variante filtrée ou carte par direction ([RFC-STRAT-004](./RFC-STRAT-004%20%E2%80%94%20Strategic%20Vision%20Alerts%20and%20CODIR%20Widgets.md)) |

### 6.3 Documentation transverse

- [docs/API.md](../API.md) : nouvelles routes (après implémentation).
- [docs/ARCHITECTURE.md](../ARCHITECTURE.md) : une phrase module strategic-vision si besoin.

---

## 7) Tests obligatoires

### 7.1 Backend

- Création / mise à jour / suppression direction : scoping `clientId` ; impossible de lier une direction d’un autre client à un objectif.
- `DELETE` direction : **404** si hors client ; **400** si stratégies de direction dépendantes ; **204** si succès.
- `PATCH` objectif avec `directionId` invalide → `400` ou `404` cohérent avec le reste du module.
- `GET .../kpis/by-direction` : jeux de données avec objectifs avec/sans direction ; projets archivés exclus ; cohérence avec `GET .../kpis` global.
- Audit : au moins un test sur `direction_changed`.

### 7.2 Frontend

- Composant select direction : options affichent `name` (+ `code` si utile), pas UUID seul.
- Filtre direction : changement de filtre ne mélange pas les clients (test d’intégration ou e2e léger si infra disponible).

---

## 8) Critères d’acceptation (produit)

- [ ] Un administrateur métier peut définir la **liste des directions** du client avec libellés stables (via l’onglet **Directions** sous `/strategic-vision`).
- [ ] Un objectif peut être **rattaché** à une direction (ou laissé non affecté) depuis l’UI autorisée.
- [ ] Le cockpit expose une **lecture par direction** (KPI + liste objectifs / alertes filtrables) cohérente avec la vision active.
- [ ] Aucune fuite inter-client ; pas de `clientId` injecté depuis le client.
- [ ] Les exports et CODIR affichent des **noms de directions**, pas des IDs seuls.

---

## 9) Récapitulatif final

Cette RFC introduit une **dimension « direction »** orthogonal aux axes stratégiques, rattachée aux **objectifs** et portée par un **référentiel `StrategicDirection`**. Elle étend le **pilotage KPI** avec un endpoint **par direction** et prépare les **filtres CODIR** sans remplacer [RFC-STRAT-001](./RFC-STRAT-001%20%E2%80%94%20Strategic%20Vision%20Core%20Backend.md) à [RFC-STRAT-004](./RFC-STRAT-004%20%E2%80%94%20Strategic%20Vision%20Alerts%20and%20CODIR%20Widgets.md).

---

## 10) Points de vigilance

1. **Double vérité** : ne pas utiliser `StrategicAxis` comme substitut de direction sans migration de données ; si un client a déjà nommé des axes « comme des directions », prévoir **import / mapping** ponctuel (hors code automatique obligatoire).
2. **Double comptage** (V2 multi-directions) : si une future jonction M2M est ajoutée, les KPI globaux et par ligne doivent rester **documentés** et **testés** pour éviter de compter deux fois le même projet.
3. **Performance** : `kpis/by-direction` doit éviter N+1 (agrégations SQL / groupBy Prisma).
4. **Alignement budgétaire** : tout rapprochement `StrategicDirection` ↔ `CostCenter` reste **hors MVP** pour ne pas coupler gouvernance et finance prématurément.
5. **Permissions** : si les directions sont gérées par un profil différent des objectifs, introduire `strategic_vision.manage_directions` pour séparer **lecture cockpit** et **admin référentiel**.

---

## 11) Fichiers à créer / modifier (checklist implémentation)

**Créer**

- `docs/RFC/RFC-STRAT-005 — Stratégie par direction et vision stratégique.md` (ce fichier)
- Migration Prisma dédiée
- `strategic-direction*.dto.ts` (nommage aligné module)
- Tests `*.spec.ts` directions + KPI by-direction

**Modifier**

- `schema.prisma` (`StrategicDirection`, `StrategicObjective`)
- `strategic-vision.service.ts` (+ éventuellement fichier dédié `strategic-directions.service.ts` si module grossit)
- `strategic-vision.controller.ts`
- DTO `update-strategic-objective.dto.ts`
- `apps/web/src/features/strategic-vision/*` (types, hooks, UI)
- [docs/RFC/_RFC Liste.md](./_RFC%20Liste.md) (statut après livraison)
- [docs/API.md](../API.md) (après livraison)
