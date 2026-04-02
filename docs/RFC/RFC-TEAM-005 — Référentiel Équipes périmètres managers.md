# RFC-TEAM-005 — Référentiel Équipes / périmètres managers

## Statut

Implémentée (backend MVP) — module NestJS `work-teams`, migration Prisma, seed `teams.*`, tests unitaires (contrôleurs, services équipes / membres, seed permissions, collaborateur `GET …/work-teams`).

## Priorité

Haute — Phase 3 du plan Équipes ; **bloquant** pour [RFC-FE-TEAM-004](./RFC-FE-TEAM-004%20%E2%80%94%20UI%20%C3%89quipes%20scopes%20managers.md), staffing (RFC-TEAM-008) et vue Manager (RFC-TEAM-013).

## Dépendances

- [RFC-TEAM-002](./RFC-TEAM-002%20%E2%80%94%20R%C3%A9f%C3%A9rentiel%20Collaborateurs%20m%C3%A9tier.md) — entité `Collaborator`, relation `managerId`, isolation client
- [RFC-TEAM-001](./RFC-TEAM-001%20%E2%80%94%20Synchronisation%20des%20collaborateurs%20depuis%20AD%20DS.md) — alimentation annuaire (sans changer la sémantique métier des équipes)
- `docs/ARCHITECTURE.md` — multi-client, `X-Client-Id`, API-first, guards
- RFC-013 — Audit logs (mutations référentiel et scopes)
- `.cursorrules` — réponses API avec libellés métier pour toute entité liée (`displayName`, `name`, chemins hiérarchiques lisibles)

## Implémentation livrée (référence code)

- **Prisma** : [`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma) — `WorkTeam`, `WorkTeamMembership`, `ManagerScopeConfig`, `ManagerScopeRootTeam` ; migration `20260403120000_add_work_teams_manager_scopes`.
- **API** : préfixe `/api` — `WorkTeamsController` (`/work-teams`), `ManagerScopesController` (`/manager-scopes`), `GET /collaborators/:id/work-teams` sur `CollaboratorsController`. Permissions : `teams.read`, `teams.update`, `teams.manage_scopes` ; guards JWT + client actif + module + permissions.
- **Liste paginée** : `{ items, total, limit, offset }` sauf `GET /work-teams/tree` → `{ nodes }` (exception documentée).
- **Seed** : [`ensureTeamsModuleAndPermissions` + `ensureClientAdminTeamsModuleRole`](../../apps/api/prisma/seed.ts) ; [`default-profiles.json`](../../apps/api/prisma/default-profiles.json) enrichi (Lecteur / Gestionnaire Équipes).
- **Tests** : `work-teams.controller.spec.ts`, `manager-scopes.controller.spec.ts`, `work-teams.service.spec.ts`, `work-team-memberships.service.spec.ts`, `tests/work-teams-seed-permissions.spec.ts` ; `collaborators.controller.spec.ts` (ordre route `work-teams` vs `:id`).

## Consommateurs prévus

- [RFC-FE-TEAM-004](./RFC-FE-TEAM-004%20%E2%80%94%20UI%20%C3%89quipes%20scopes%20managers.md) (UI structure, rattachements, scopes) — **backend prêt** ; implémentation UI toujours à faire.
- RFC-TEAM-013 / RFC-FE-TEAM-007 — cockpit manager (réutilisation **stricte** des mêmes règles de périmètre, pas de second calcul ad hoc côté UI)

---

# 1. Analyse de l’existant

**Constat**

- Le référentiel **Collaborateurs** expose déjà une hiérarchie **manager / reports** via `Collaborator.managerId` (annuaire / métier). C’est la base naturelle du périmètre **« directs »** (collaborateurs dont ce manager est le N+1 dans Starium).
- Il n’existe **pas** encore d’entité **équipe organisationnelle** (métier Starium) distincte des libellés texte (`department`, `jobTitle`) ni des intégrations **Microsoft Teams** (autres RFC). Le produit a besoin d’un **graphe d’équipes** par client : hiérarchie, rattachement des collaborateurs, et **configuration explicite du périmètre de pilotage** pour les usages manager (directs vs étendu).
- Les modules futurs (affectations, timesheet, vue manager) doivent s’appuyer sur **une seule définition** de « qui est dans le périmètre de ce manager » exposée par l’API.

**Objectif de cette RFC**

Définir le **modèle de données**, les **règles métier**, les **API REST**, le **RBAC** et l’**audit** pour :

1. **Équipes métier** (`WorkTeam` — libellé produit : équipe organisationnelle) : CRUD, hiérarchie parent/enfant, code métier optionnel, responsable d’équipe optionnel, statut actif / archivé.
2. **Rattachements** collaborateur ↔ équipe : relation many-to-many avec rôle d’appartenance simple (ex. membre, référent).
3. **Périmètres managers** : paramétrage, pour un **collaborateur manager** donné, du mode de calcul du périmètre **direct** (hiérarchie `managerId`) vs **étendu** (équipes et sous-équipes, éventuellement combiné aux directs), avec contraintes d’intégrité et réponses dérivées (effectifs, listes paginées) pour alimenter l’UI et RFC-TEAM-013.

**Terminologie**

- **Équipe métier / Work team** : entité Starium, **pas** Microsoft Teams.
- **Périmètre direct** : ensemble dérivé de la relation `managerId` (reports directs, et option selon règle : récurrence / profondeur — voir §4.2).
- **Périmètre étendu** : collaborateurs rattachés à des équipes incluses dans le scope (sous-arborescence depuis racines, ou liste explicite), selon le **mode** configuré.

---

# 2. Hypothèses éventuelles

- Une **équipe** appartient toujours à **un seul** `clientId` ; toute jointure avec `Collaborator` vérifie l’égalité des `clientId`.
- La hiérarchie d’équipes est un **arbre** (un parent, N enfants) ; **pas de cycle** ; profondeur maximale configurable côté API (ex. 20) pour éviter abus.
- Un collaborateur peut être membre de **plusieurs** équipes ; une équipe a **N** membres.
- Le **responsable d’équipe** (`leadCollaboratorId` optionnel) est un `Collaborator` du même client ; ce n’est **pas** automatiquement un « manager scope » — le scope manager est une **configuration** dédiée (peut référencer les mêmes personnes, mais modèle distinct).
- La hiérarchie **managerId** reste la **vérité annuaire** pour N+1 ; les **scopes managers** **complètent** ou **restreignent** la vue pilotage pour Starium sans réécrire l’annuaire. En cas de conflit produit, **documenter** le mode par défaut (voir §8).
- Les permissions sont **granulaires** : lecture structure vs écriture équipes vs configuration des scopes (peut être limitée aux rôles administration client).
- Les réponses listes / détails incluent systématiquement des **champs affichables** : noms d’équipes, `displayName` des collaborateurs, chemin hiérarchique humain (`pathLabel` ou segments), pas seulement des UUID.

---

# 3. Liste des fichiers à créer / modifier

## Prisma

- `apps/api/prisma/schema.prisma` — modèles `WorkTeam`, `WorkTeamMembership`, `ManagerScopeConfig` (ou nom équivalent), enums associés, indexes `clientId`, FKs
- Migration dédiée

## Backend (NestJS) — module proposé `work-teams` (ou `teams` sous-namespace interne)

- `apps/api/src/modules/work-teams/work-teams.module.ts`
- `apps/api/src/modules/work-teams/work-teams.controller.ts`
- `apps/api/src/modules/work-teams/work-teams.service.ts`
- `apps/api/src/modules/work-teams/work-team-memberships.controller.ts` (ou routes nestées dans le contrôleur principal selon convention repo)
- `apps/api/src/modules/work-teams/work-team-memberships.service.ts`
- `apps/api/src/modules/work-teams/manager-scopes.controller.ts`
- `apps/api/src/modules/work-teams/manager-scopes.service.ts`
- `apps/api/src/modules/work-teams/dto/*.ts` — create/update/list/query pour équipes, membres, scopes
- `apps/api/src/modules/work-teams/work-teams.service.spec.ts`
- `apps/api/src/modules/work-teams/work-teams.controller.spec.ts`
- `apps/api/src/modules/work-teams/manager-scopes.service.spec.ts`
- `apps/api/src/modules/work-teams/tests/work-teams.integration.spec.ts`

## Fichiers transverses

- `apps/api/src/app.module.ts` (ou module parent) — import `WorkTeamsModule`
- `apps/api/prisma/seed.ts` — module fonctionnel + permissions `teams.read`, `teams.update`, `teams.manage_scopes` (noms exacts à figer au seed)
- `apps/api/src/modules/collaborators/collaborators.service.ts` — optionnel : enrichissement `GET /api/collaborators/:id` avec résumé des équipes (si pris en charge dans cette RFC ou ticket suivant)

## Documentation

- Ce document
- `docs/RFC/_Plan de déploiement - Equipe.md` — statut RFC-TEAM-005 après implémentation
- `docs/RFC/_RFC Liste.md` — entrée index si maintenu dans le dépôt

---

# 4. Implémentation complète

## 4.1 Modèle conceptuel

### 4.1.1 `WorkTeam`

| Champ | Description |
| --- | --- |
| `id` | Identifiant |
| `clientId` | Portée obligatoire |
| `name` | Nom affiché |
| `code` | Code métier optionnel (unique par client si présent) |
| `parentId` | Parent dans la hiérarchie (`null` = racine) |
| `leadCollaboratorId` | Responsable d’équipe optionnel (`Collaborator`, même client) |
| `status` | `ACTIVE` \| `ARCHIVED` |
| `archivedAt` | Date d’archivage si archivé |
| `sortOrder` | Ordre d’affichage parmi les frères (optionnel) |

**Règles**

- `parentId` : même `clientId` ; pas d’auto-référence directe sur soi ; pas de cycle (validation service + contrainte applicative).
- Archivage : **soft** ; les équipes archivées ne sont pas candidates aux **nouveaux** rattachements (sauf override admin documenté) ; membres existants : politique explicite (conserver en lecture vs expulsion automatique — **MVP recommandé** : conserver les lignes `WorkTeamMembership` pour historique, mais **exclure** des sélections par défaut pour nouveaux usages).

### 4.1.2 `WorkTeamMembership`

| Champ | Description |
| --- | --- |
| `workTeamId` | Équipe |
| `collaboratorId` | Collaborateur |
| `role` | Enum : `MEMBER`, `LEAD`, `DEPUTY` (ajuster selon besoin produit minimal : `MEMBER` + `LEAD` suffisent au MVP) |
| `clientId` | Dénormalisé pour requêtes filtrées / contrainte |

**Unicité** : `@@unique([workTeamId, collaboratorId])`.

### 4.1.3 `ManagerScopeConfig` (un enregistrement par manager cible)

Portée : **un collaborateur** du client identifié comme « manager » pour la configuration (pas besoin d’un flag `isManager` au MVP : toute personne avec permission `teams.manage_scopes` peut configurer n’importe quel collaborateur du client, ou seulement soi-même selon politique RBAC — **à trancher** : au minimum, **client admin** ; option **manager** ne configure que son propre scope).

| Champ | Description |
| --- | --- |
| `managerCollaboratorId` | Collaborateur dont on définit le périmètre de pilotage |
| `mode` | Enum `ManagerScopeMode` — voir §4.2 |
| `includeDirectReports` | Si `true`, inclut toujours les reports directs (`managerId` = ce collaborateur) dans le périmètre calculé |
| `includeTeamSubtree` | Si `true`, étend aux membres des équipes données + descendants d’équipes |
| `rootTeamIds` | Liste de `WorkTeam` racines (JSON ou table de jointure `ManagerScopeRootTeam`) — utilisée si `includeTeamSubtree` |
| `explicitTeamIds` | Option : équipes explicitement incluses sans sous-arborescence (mode plus tardif / MVP+ ) |

**Représentation préférée** : table de jointure `ManagerScopeRootTeam` (`managerScopeConfigId`, `workTeamId`, `clientId`) plutôt qu’un JSON brut, pour intégrité référentielle et indexation.

## 4.2 Enum `ManagerScopeMode` (proposition MVP)

Valeurs minimales pour couvrir **direct / étendu** sans explosion de combinaisons :

| Valeur | Comportement |
| --- | --- |
| `DIRECT_REPORTS_ONLY` | Périmètre = collaborateurs avec `managerId = managerCollaboratorId` (statuts actifs selon filtre métier). Ignore les équipes. |
| `TEAM_SUBTREE` | Périmètre = membres des équipes listées dans `rootTeamIds` **et** de toutes les équipes descendantes dans l’arbre `WorkTeam`. Les **directs** peuvent être ajoutés si `includeDirectReports = true`. |
| `HYBRID` | `includeDirectReports` et/ou `includeTeamSubtree` selon flags ; permet **directs + étendu équipe** sans ambiguïté. |

**Calcul d’effectif** : endpoint dédié ou sous-ressource `.../preview` qui retourne `total` + échantillon paginé de collaborateurs (ids + `displayName` + email), **sans** exposer de données hors client.

**Relation avec `Collaborator.managerId`**

- `DIRECT_REPORTS_ONLY` **réutilise** la chaîne hiérarchique déjà stockée ; pas de duplication des liens N+1.
- Les modes équipe **n’imitent pas** l’annuaire : ils ajoutent des personnes **via appartenance équipe**, même si leur `managerId` pointe ailleurs.

## 4.3 Règles de sécurité et multi-tenant

- Toutes les requêtes Prisma filtrent par `clientId` issu du **contexte client authentifié** (jamais un `clientId` arbitraire du body).
- Toute écriture vérifie que `Collaborator`, `WorkTeam`, et lignes de jointure appartiennent au **même** `clientId`.
- Les endpoints de **prévisualisation** de périmètre sont soumis aux **mêmes** règles que la liste collaborateurs (permissions lecture).
- **Audit** : création / modification / archivage d’équipe ; ajout / retrait de membre ; modification de `ManagerScopeConfig` (ancien/nouveau mode, équipes racines).

## 4.4 API REST cible (v1)

Préfixe proposé : `/api/work-teams` (alignement possible avec le frontend : namespace unique « work » pour éviter collision avec intégrations Microsoft).

### Équipes

| Méthode | Chemin | Description |
| --- | --- | --- |
| `GET` | `/api/work-teams` | Liste paginée + filtres (`status`, `parentId`, `q` sur nom/code), tri |
| `POST` | `/api/work-teams` | Création |
| `GET` | `/api/work-teams/tree` | Arbre complet ou racines + lazy load par parent (query `parentId` optionnelle) |
| `GET` | `/api/work-teams/:id` | Détail + `parent` / `lead` avec libellés |
| `PATCH` | `/api/work-teams/:id` | Mise à jour |
| `POST` | `/api/work-teams/:id/archive` | Archivage |
| `POST` | `/api/work-teams/:id/restore` | Réactivation si applicable |

### Membres

| Méthode | Chemin | Description |
| --- | --- | --- |
| `GET` | `/api/work-teams/:id/members` | Liste paginée des membres avec `displayName`, `role`, … |
| `POST` | `/api/work-teams/:id/members` | Ajout (body : `collaboratorId`, `role`) |
| `PATCH` | `/api/work-teams/:id/members/:collaboratorId` | Changement de rôle |
| `DELETE` | `/api/work-teams/:id/members/:collaboratorId` | Retrait |

**Vue inverse (option d’implémentation)** : `GET /api/collaborators/:id/work-teams` — liste des équipes du collaborateur ; peut vivre sous le module collaborateurs (RFC-TEAM-002) pour cohérence REST.

### Scopes managers

| Méthode | Chemin | Description |
| --- | --- | --- |
| `GET` | `/api/work-teams/manager-scopes/:managerCollaboratorId` | Lit la config (création lazy si absent : défaut `DIRECT_REPORTS_ONLY` + `includeDirectReports=true`) |
| `PUT` | `/api/work-teams/manager-scopes/:managerCollaboratorId` | Remplace la config (DTO validé) |
| `GET` | `/api/work-teams/manager-scopes/:managerCollaboratorId/preview` | Query : pagination ; retourne collaborateurs couverts avec libellés |

**DTO**

- Tous les DTO d’entrée en **class-validator** ; pas de payload brut.
- Réponses : types explicites ; champs dérivés `pathLabel` ou `breadcrumbs[]` sur `WorkTeam` en liste/tree.

## 4.5 Permissions (seed)

| Permission | Usage |
| --- | --- |
| `teams.read` | Lecture équipes, membres, arborescence |
| `teams.update` | CRUD équipes + rattachements |
| `teams.manage_scopes` | Lecture/écriture `ManagerScopeConfig` + preview périmètre |

Rôles suggérés : **CLIENT_ADMIN** : les trois ; **rôle métier** : `teams.read` + parfois `teams.update` ; **manager** : `teams.read` sur son périmètre (optionnel, **V2**) — au MVP, lecture globale client si permission `teams.read` sans filtrage par sous-arbre (filtrage finesse = RFC-TEAM-013).

---

# 5. Modifications Prisma (schéma indicatif)

```prisma
enum WorkTeamStatus {
  ACTIVE
  ARCHIVED
}

enum WorkTeamMemberRole {
  MEMBER
  LEAD
  DEPUTY
}

enum ManagerScopeMode {
  DIRECT_REPORTS_ONLY
  TEAM_SUBTREE
  HYBRID
}

model WorkTeam {
  id                 String          @id @default(cuid())
  clientId           String
  name               String
  code               String?
  parentId           String?
  leadCollaboratorId String?
  status             WorkTeamStatus  @default(ACTIVE)
  archivedAt         DateTime?
  sortOrder          Int             @default(0)
  createdAt          DateTime        @default(now())
  updatedAt          DateTime        @updatedAt

  client          Client         @relation(...)
  parent          WorkTeam?      @relation("WorkTeamHierarchy", fields: [parentId], references: [id])
  children        WorkTeam[]     @relation("WorkTeamHierarchy")
  lead            Collaborator?  @relation(fields: [leadCollaboratorId], references: [id])
  memberships     WorkTeamMembership[]
  managerScopeRoots ManagerScopeRootTeam[]

  @@unique([clientId, code])
  @@index([clientId, parentId])
  @@index([clientId, status])
}

model WorkTeamMembership {
  id              String              @id @default(cuid())
  clientId        String
  workTeamId      String
  collaboratorId  String
  role            WorkTeamMemberRole  @default(MEMBER)
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  workTeam     WorkTeam     @relation(...)
  collaborator Collaborator @relation(...)

  @@unique([workTeamId, collaboratorId])
  @@index([clientId, collaboratorId])
}

model ManagerScopeConfig {
  id                      String             @id @default(cuid())
  clientId                String
  managerCollaboratorId   String             @unique
  mode                    ManagerScopeMode
  includeDirectReports    Boolean            @default(true)
  includeTeamSubtree      Boolean            @default(false)
  createdAt               DateTime           @default(now())
  updatedAt               DateTime           @updatedAt

  manager     Collaborator           @relation(...)
  rootTeams   ManagerScopeRootTeam[]
}

model ManagerScopeRootTeam {
  id                   String   @id @default(cuid())
  clientId             String
  managerScopeConfigId String
  workTeamId           String

  config   ManagerScopeConfig @relation(...)
  workTeam WorkTeam         @relation(...)

  @@unique([managerScopeConfigId, workTeamId])
  @@index([clientId, workTeamId])
}
```

Relations à ajouter sur `Collaborator` : `workTeamMemberships`, `ledTeams`, `managerScopeConfig` (optionnel selon cardinalité). Relations sur `Client` : `workTeams`, etc.

*Le schéma exact (noms de relations Prisma, `onDelete`) doit être aligné sur les conventions du fichier `schema.prisma` existant au moment de l’implémentation.*

---

# 6. Tests

## 6.1 Unitaires (services)

- Création / mise à jour d’équipe : rejet si `parentId` d’un autre client ; rejet cycle (parent chaîne) ; rejet profondeur excessive si implémentée.
- Membres : impossible d’attacher un collaborateur d’un autre client ; unicité membership.
- Scopes : `TEAM_SUBTREE` inclut bien les descendants ; `HYBRID` avec `includeDirectReports` union correcte avec directs.
- **Isolation** : `clientId` A ne voit jamais les équipes de `clientId` B.

## 6.2 Contrôleurs / intégration

- Guards JWT + permission ; header client obligatoire pour routes métier.
- Codes HTTP : 400 validation, 403 interdit, 404 équipe hors scope.

## 6.3 Cas critiques produit

- Manager sans config explicite : comportement par défaut documenté (directs uniquement).
- Équipe archivée : ajout membre refusé ; scope pointant sur racine archivée : erreur métier claire ou filtrage silencieux (à trancher — préférer **erreur explicite** à la sauvegarde du scope).

---

# 7. Récapitulatif final

**RFC-TEAM-005** pose le **référentiel des équipes métier** Starium (hiérarchie, archivage, responsable), les **rattachements** collaborateurs, et la **configuration des périmètres managers** (directs via annuaire, étendu via sous-arborescence d’équipes, mode hybride), avec **API client-scopées**, **permissions** dédiées et **audit**. Elle sert de **contrat backend** à RFC-FE-TEAM-004 et aux évolutions **vue Manager** ; les chemins exacts et DTO pourront être ajustés tant que la sémantique et l’isolation multi-tenant restent respectées.

---

# 8. Points de vigilance

- **Microsoft Teams vs équipes métier** : préfixer clairement API et libellés (`work-teams`) pour éviter la confusion avec RFC d’intégration Graph.
- **Double vérité** : `managerId` (annuaire) et scopes (pilotage) — communiquer clairement en UI le mode actif ; ne pas synchroniser automatiquement les deux sans règle produit.
- **Performance** : calcul de sous-arborescence et d’union de périmètres sur gros volumes → requêtes indexées, pagination sur `preview`, éventuellement matérialisation ou cache en **V2** si mesuré nécessaire.
- **RGPD / sensibilité** : les previews de périmètre restent soumises aux **permissions** ; pas d’endpoint « tout le client » déguisé.
- **Évolutions** : RFC-TEAM-013 pourra ajouter des indicateurs agrégés **sans** dupliquer la définition du périmètre — réutiliser les services `ManagerScopesService` ou équivalent.
