# RFC-TEAM-003 — Référentiel Compétences

## Statut

Implémentée (backend MVP)

## Priorité

Haute (Phase 2 — socle compétences)

## Dépendances

- RFC-TEAM-002 — Référentiel Collaborateurs métier (entité pivot `Collaborator`)
- `docs/ARCHITECTURE.md` — principes API-first, multi-client, guards, isolation
- `.cursorrules` — règles frontend "valeur métier visible, jamais ID brut"
- RFC-013 — Audit logs (traçabilité des mutations métier)

---

# 1. Analyse de l'existant

Le modèle `Collaborator` possède aujourd'hui un champ `skills Json?` non structuré, non exposé dans les DTOs et explicitement verrouillé par les tests du contrôleur (`UpdateCollaboratorDto ne contient pas skills`).

Constats :

- pas de table dédiée `Skill` ni `SkillCategory` dans le schéma Prisma ;
- pas de module NestJS `skills` ;
- le champ JSON `skills` sur `Collaborator` est un placeholder provisoire, inutilisable pour filtrage, reporting ou matrice de compétences ;
- les futurs besoins (RFC-TEAM-004 association collaborateur ↔ compétence, RFC-TEAM-015 matrice de compétences, RFC-TEAM-016 alertes compétence manquante) nécessitent un référentiel structuré et requêtable ;
- aucun référentiel admin de compétences n'existe côté configuration client.

Objectif de cette RFC : créer un **catalogue client de compétences** structuré (catégories, niveaux de référence, statuts, archivage logique) comme socle du "qui sait faire quoi".

---

# 2. Hypothèses éventuelles

- Le catalogue de compétences est **client-scoped** : chaque client gère son propre référentiel.
- Une compétence appartient à exactement une catégorie.
- Les catégories sont à un seul niveau (pas d'arbre profond au MVP ; extensible si besoin).
- Les niveaux de référence (`referenceLevel`) sont définis globalement par enum au MVP ; un référentiel configurable par client est envisageable en v2.
- L'archivage logique (`archivedAt`) permet de retirer une compétence des sélections sans perdre les associations existantes (collaborateurs, matrice).
- Le champ JSON `skills` existant sur `Collaborator` n'est **pas migré automatiquement** : il sera déprécié et remplacé par la relation `CollaboratorSkill` (RFC-TEAM-004).
- Les permissions sont distinctes du module `collaborators` : nouveau module `skills`.
- L'API suit les mêmes conventions de contrat que les autres modules : `{ items, total, limit, offset }`.

---

# 3. Liste des fichiers à créer / modifier

## Prisma

- `apps/api/prisma/schema.prisma` — ajout enums + modèles `SkillCategory`, `Skill`
- `apps/api/prisma/seed.ts` — module `skills` + permissions `skills.*`

## Backend (NestJS)

- `apps/api/src/modules/skills/skills.module.ts`
- `apps/api/src/modules/skills/skills.controller.ts`
- `apps/api/src/modules/skills/skills.service.ts`
- `apps/api/src/modules/skills/dto/create-skill.dto.ts`
- `apps/api/src/modules/skills/dto/update-skill.dto.ts`
- `apps/api/src/modules/skills/dto/list-skills.query.dto.ts`
- `apps/api/src/modules/skills/dto/create-skill-category.dto.ts`
- `apps/api/src/modules/skills/dto/update-skill-category.dto.ts`
- `apps/api/src/modules/skills/dto/list-skill-categories.query.dto.ts`
- `apps/api/src/modules/skills/skills.service.spec.ts`
- `apps/api/src/modules/skills/skills.controller.spec.ts`
- `apps/api/src/modules/skills/tests/skills.integration.spec.ts`

## Intégration

- `apps/api/src/app.module.ts` — import `SkillsModule`

## Documentation

- `docs/RFC/RFC-TEAM-003 — Référentiel Compétences.md` (ce document)
- `docs/RFC/_Plan de déploiement - Equipe.md` (état + lien)
- `docs/RFC/_RFC Liste.md` (index RFC)

---

# 4. Implémentation complète

## 4.1 Périmètre fonctionnel

Le référentiel compétences couvre :

- **Catégories de compétences** : regroupement logique (Technique, Fonctionnel, Management, Transverse, etc.) ;
- **Compétences** : entrées du catalogue avec nom, description, catégorie, niveau de référence attendu, statut, archivage logique ;
- **CRUD complet** sur catégories et compétences ;
- **Options API** pour alimenter les select/combobox frontend (RFC-FE-TEAM-003).

## 4.2 Modèle de données

### Enums

```prisma
enum SkillStatus {
  ACTIVE
  DRAFT
  ARCHIVED
}

enum SkillReferenceLevel {
  BEGINNER
  INTERMEDIATE
  ADVANCED
  EXPERT
}
```

### Modèle `SkillCategory`

```prisma
model SkillCategory {
  id             String   @id @default(cuid())
  clientId       String
  name           String
  normalizedName String
  description    String?
  sortOrder      Int      @default(0)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  client Client @relation(fields: [clientId], references: [id], onDelete: Cascade)
  skills Skill[]

  @@unique([clientId, normalizedName])
  @@index([clientId])
  @@index([clientId, sortOrder])
}
```

### Modèle `Skill`

```prisma
model Skill {
  id              String              @id @default(cuid())
  clientId        String
  categoryId      String
  name            String
  normalizedName  String
  description     String?
  referenceLevel  SkillReferenceLevel @default(INTERMEDIATE)
  status          SkillStatus         @default(DRAFT)
  archivedAt      DateTime?
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  client   Client        @relation(fields: [clientId], references: [id], onDelete: Cascade)
  category SkillCategory @relation(fields: [categoryId], references: [id], onDelete: Restrict)

  @@unique([clientId, normalizedName])
  @@index([clientId])
  @@index([clientId, categoryId])
  @@index([clientId, status])
}
```

**Choix de design** :

- `onDelete: Restrict` sur `categoryId` : impossible de supprimer une catégorie qui contient des compétences (erreur explicite, pas de cascade silencieuse).
- unicité portée par `normalizedName` (`trim + lower`) pour éviter les doublons métier insensibles à la casse.
- `archivedAt` : timestamp de l'archivage logique ; `null` = actif. Le `status` passe à `ARCHIVED` en parallèle pour filtrage rapide.
- `referenceLevel` : niveau de maîtrise attendu pour cette compétence dans le contexte du client (le niveau réel du collaborateur sera sur `CollaboratorSkill` en RFC-TEAM-004).
- `color` / `metadata` sont hors MVP backend de cette implémentation.

## 4.3 Règles métier

### Scope client strict

- Toute lecture/écriture filtrée par `clientId` actif autorisé.
- Aucune fuite inter-client.

### Catégories

- Nom unique par client.
- Suppression physique autorisée **uniquement** si aucune compétence rattachée (sinon erreur 409).
- Tri par `sortOrder` puis `name`.

### Compétences

- Nom unique par client (pas par catégorie — un même nom dans deux catégories crée de la confusion).
- Création en statut `DRAFT` ou `ACTIVE` au choix.
- Archivage = `PATCH /api/skills/:id/archive` → `status = ARCHIVED`, `archivedAt = now()`.
- Restauration = `PATCH /api/skills/:id/restore` → `status = ACTIVE`, `archivedAt = null`.
- Les compétences archivées ne sont **pas retournées par défaut** dans les listes et options (filtre `status != ARCHIVED`).
- Suppression physique interdite si des `CollaboratorSkill` sont liées (RFC-TEAM-004). Au MVP (sans TEAM-004), la suppression physique reste possible en fallback, mais l'archivage est le mécanisme recommandé.

### Changement de catégorie

- Déplacer une compétence d'une catégorie à une autre = simple `PATCH` sur `categoryId`.
- La nouvelle catégorie doit appartenir au même client.

## 4.4 API cible

### Catégories

| Méthode | Route | Permission | Description |
|---------|-------|------------|-------------|
| `GET` | `/api/skill-categories` | `skills.read` | Liste paginée |
| `POST` | `/api/skill-categories` | `skills.create` | Création |
| `GET` | `/api/skill-categories/:id` | `skills.read` | Détail |
| `PATCH` | `/api/skill-categories/:id` | `skills.update` | Mise à jour |
| `DELETE` | `/api/skill-categories/:id` | `skills.delete` | Suppression (si vide) |
| `GET` | `/api/skill-categories/options` | `skills.read` | Options pour select |

### Compétences

| Méthode | Route | Permission | Description |
|---------|-------|------------|-------------|
| `GET` | `/api/skills` | `skills.read` | Liste paginée + filtres |
| `POST` | `/api/skills` | `skills.create` | Création |
| `GET` | `/api/skills/:id` | `skills.read` | Détail |
| `PATCH` | `/api/skills/:id` | `skills.update` | Mise à jour |
| `PATCH` | `/api/skills/:id/archive` | `skills.update` | Archivage logique |
| `PATCH` | `/api/skills/:id/restore` | `skills.update` | Restauration |
| `GET` | `/api/skills/options` | `skills.read` | Options pour select/combobox |

### Filtres `GET /api/skills`

| Paramètre | Type | Description |
|-----------|------|-------------|
| `search` | `string` | Recherche sur nom / description |
| `categoryId` | `string` | Filtre par catégorie |
| `status[]` | `SkillStatus[]` | Filtre par statut(s) |
| `referenceLevel[]` | `SkillReferenceLevel[]` | Filtre par niveau(x) |
| `includeArchived` | `boolean` | Inclure les archivées (défaut `false`) |
| `limit` | `number` | Pagination (défaut 20) |
| `offset` | `number` | Offset pagination |
| `sortBy` | `string` | Champ de tri (`name`, `createdAt`, `updatedAt`, `referenceLevel`) |
| `sortOrder` | `asc \| desc` | Direction du tri |

### Filtres `GET /api/skill-categories`

| Paramètre | Type | Description |
|-----------|------|-------------|
| `search` | `string` | Recherche sur nom |
| `limit` | `number` | Pagination (défaut 20) |
| `offset` | `number` | Offset pagination |

## 4.5 Contrat API

### Payload liste compétences

```json
{
  "items": [
    {
      "id": "skill_abc",
      "name": "Kubernetes",
      "description": "Orchestration de conteneurs et gestion de clusters K8s",
      "categoryId": "cat_123",
      "categoryName": "Infrastructure & Cloud",
      "referenceLevel": "ADVANCED",
      "status": "ACTIVE",
      "archivedAt": null,
      "createdAt": "2026-03-15T10:00:00Z",
      "updatedAt": "2026-03-20T14:30:00Z"
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

### Payload liste catégories

```json
{
  "items": [
    {
      "id": "cat_123",
      "name": "Infrastructure & Cloud",
      "description": "Compétences infrastructure, réseau, cloud, conteneurs",
      "sortOrder": 1,
      "skillCount": 12,
      "createdAt": "2026-03-01T09:00:00Z",
      "updatedAt": "2026-03-01T09:00:00Z"
    }
  ],
  "total": 5,
  "limit": 20,
  "offset": 0
}
```

### Payload options compétences

```json
{
  "items": [
    {
      "id": "skill_abc",
      "name": "Kubernetes",
      "categoryName": "Infrastructure & Cloud"
    }
  ],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```

### Payload options catégories

```json
{
  "items": [
    {
      "id": "cat_123",
      "name": "Infrastructure & Cloud"
    }
  ],
  "total": 5,
  "limit": 50,
  "offset": 0
}
```

Règles de contrat :

- format liste/options unique : `{ items, total, limit, offset }` ;
- champs d'affichage inclus (`categoryName`) pour éviter des jointures frontend ;
- aucun libellé UX localisé dans l'API ;
- valeurs canoniques uniquement pour `status` et `referenceLevel` (mapping label côté frontend).

## 4.6 DTOs

### `CreateSkillDto`

| Champ | Type | Requis | Validation |
|-------|------|--------|------------|
| `name` | `string` | oui | `@IsString`, `@MaxLength(200)`, `@IsNotEmpty` |
| `description` | `string` | non | `@IsOptional`, `@IsString` |
| `categoryId` | `string` | oui | `@IsString`, `@IsNotEmpty` |
| `referenceLevel` | `SkillReferenceLevel` | non | `@IsOptional`, `@IsEnum(SkillReferenceLevel)`, défaut `INTERMEDIATE` |
| `status` | `SkillStatus` | non | `@IsOptional`, `@IsEnum(SkillStatus)`, limité à `DRAFT` ou `ACTIVE` |

### `UpdateSkillDto`

Tous les champs de `CreateSkillDto` en `@IsOptional`. Le champ `status` n'est pas modifiable via ce DTO (utiliser archive/restore).

### `ListSkillsQueryDto`

Reprend les filtres §4.4. Validation : `@IsOptional`, pagination `@Transform` + `@IsInt` + `@Min`.

### `CreateSkillCategoryDto`

| Champ | Type | Requis | Validation |
|-------|------|--------|------------|
| `name` | `string` | oui | `@IsString`, `@MaxLength(200)`, `@IsNotEmpty` |
| `description` | `string` | non | `@IsOptional`, `@IsString` |
| `sortOrder` | `number` | non | `@IsOptional`, `@IsInt`, `@Min(0)` |

### `UpdateSkillCategoryDto`

Tous les champs de `CreateSkillCategoryDto` en `@IsOptional`.

## 4.7 Organisation du module NestJS

```
apps/api/src/modules/skills/
├── skills.module.ts
├── skills.controller.ts          # routes /api/skills
├── skill-categories.controller.ts # routes /api/skill-categories
├── skills.service.ts             # logique métier skills + catégories
├── dto/
│   ├── create-skill.dto.ts
│   ├── update-skill.dto.ts
│   ├── list-skills.query.dto.ts
│   ├── create-skill-category.dto.ts
│   ├── update-skill-category.dto.ts
│   └── list-skill-categories.query.dto.ts
├── skills.service.spec.ts
├── skills.controller.spec.ts
└── tests/
    └── skills.integration.spec.ts
```

Le contrôleur unique expose deux préfixes de routes via deux contrôleurs ou un contrôleur composite. Approche recommandée : **deux contrôleurs** dans le même module (`SkillsController` + `SkillCategoriesController`) pour clarté.

```
apps/api/src/modules/skills/
├── skills.module.ts
├── skills.controller.ts               # @Controller('skills')
├── skill-categories.controller.ts     # @Controller('skill-categories')
├── skills.service.ts
├── dto/...
```

## 4.8 Guards et décorateurs

Identique au pattern `CollaboratorsController` :

```typescript
@Controller('skills')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class SkillsController {
  // ...
}
```

Le `ModuleAccessGuard` utilise le préfixe `skills` pour vérifier l'activation du module.

## 4.9 Permissions et audit

### Permissions (module `skills`)

| Permission | Endpoints couverts |
|------------|-------------------|
| `skills.read` | `GET` compétences + catégories + options |
| `skills.create` | `POST` compétences + catégories |
| `skills.update` | `PATCH` compétences + catégories + archive/restore |
| `skills.delete` | `DELETE` catégories |

### Actions d'audit

| Action | Déclencheur |
|--------|------------|
| `skill.created` | Création d'une compétence |
| `skill.updated` | Mise à jour d'une compétence |
| `skill.archived` | Archivage d'une compétence |
| `skill.restored` | Restauration d'une compétence |
| `skill_category.created` | Création d'une catégorie |
| `skill_category.updated` | Mise à jour d'une catégorie |
| `skill_category.deleted` | Suppression d'une catégorie |

---

# 5. Modifications Prisma

## 5.1 Ajouts au schéma

Ajouter dans `schema.prisma` :

1. Enums `SkillStatus` et `SkillReferenceLevel`
2. Modèle `SkillCategory`
3. Modèle `Skill`
4. Relations sur `Client` : `skillCategories SkillCategory[]` et `skills Skill[]`

## 5.2 Migration

Fichier de migration dédié : `20260401120000_add_skill_catalog`.

## 5.3 Seed

Ajouter dans le seed :

- module `skills` dans `Module` (code `skills`)
- permissions `skills.read`, `skills.create`, `skills.update`, `skills.delete`
- attribution par défaut au rôle `CLIENT_ADMIN`

Seed de démo optionnel :

- 4–6 catégories types : "Infrastructure & Cloud", "Développement", "Gestion de projet", "Sécurité", "Data & Analytics", "Transverse"
- 10–20 compétences réparties dans ces catégories

## 5.4 Impact sur `Collaborator`

Le champ `skills Json?` existant sur `Collaborator` est **conservé** mais **déprécié**. Il sera remplacé par la relation `CollaboratorSkill` en RFC-TEAM-004. Aucune migration de données à ce stade.

---

# 6. Tests

## 6.1 Tests unitaires service

- création compétence valide → statut par défaut ;
- création compétence avec catégorie inexistante → erreur 404 ;
- création compétence avec catégorie d'un autre client → erreur 403/404 ;
- création doublon nom/client → erreur 409 ;
- update partiel compétence (nom, description, catégorie, referenceLevel) ;
- changement de catégorie vers catégorie même client → OK ;
- changement de catégorie vers catégorie autre client → erreur ;
- archivage → `status = ARCHIVED`, `archivedAt` renseigné ;
- restauration → `status = ACTIVE`, `archivedAt = null` ;
- archivage d'une compétence déjà archivée → idempotent ;
- liste filtrée par catégorie, statut, niveau, recherche ;
- liste exclut archivées par défaut ;
- liste avec `includeArchived = true` inclut archivées ;
- suppression catégorie vide → OK ;
- suppression catégorie avec compétences → erreur 409 ;
- options ne retournent que les compétences actives/draft.

## 6.2 Tests unitaires contrôleur

- validation DTO refusée si nom manquant ;
- `UpdateSkillDto` ne contient pas `status` ;
- routing correct vers les méthodes service ;
- guards appliqués sur chaque route.

## 6.3 Tests d'intégration

- isolation client stricte (read/write) ;
- permissions RBAC par endpoint ;
- scénario complet : créer catégorie → créer compétence → lister → archiver → restaurer → suppression catégorie ;
- tentative de lecture compétence d'un autre client → 404 ;
- suppression catégorie non vide → 409 ;
- audit log présent sur create/update/archive/restore + suppression catégorie.

## 6.4 Cas critiques

- un utilisateur multi-client ne voit que les compétences du client actif ;
- une catégorie d'un autre client ne peut être utilisée comme `categoryId` ;
- les options retournent des labels lisibles (nom compétence, nom catégorie), jamais d'IDs seuls ;
- le contrat API reste `{ items, total, limit, offset }` ;
- la pagination respecte les défauts (`limit 20` liste, `limit 50` options).

---

# 7. Récapitulatif final

`RFC-TEAM-003` crée le **référentiel structuré de compétences** par client, remplacement du champ JSON non exploitable existant.

Livrables :

- modèles Prisma `SkillCategory` + `Skill` avec enums `SkillStatus`, `SkillReferenceLevel` ;
- module NestJS `skills` avec deux contrôleurs (`skills`, `skill-categories`) ;
- CRUD catégories + compétences avec filtres avancés (suppression skill hors MVP) ;
- archivage / restauration logique des compétences ;
- endpoints options pour les sélecteurs UI ;
- isolation client stricte + RBAC `skills.*` + audit ;
- tests unitaires + intégration couvrant isolation, archivage et cohérence relationnelle.

Ce référentiel est le **prérequis direct** de :

- **RFC-TEAM-004** : association `Collaborator ↔ Skill` (niveau réel, revue, validation) ;
- **RFC-TEAM-015** : matrice de compétences ;
- **RFC-TEAM-016** : alertes compétence manquante ;
- **RFC-FE-TEAM-003** : UI catalogue compétences.

---

# 8. Points de vigilance

- ne pas confondre `referenceLevel` (niveau attendu, sur `Skill`) avec le futur niveau réel du collaborateur (sur `CollaboratorSkill` en TEAM-004) ;
- suppression skill non exposée en MVP (archive/restore uniquement) ;
- verrouiller l'unicité `normalizedName` en Prisma **et** en service (double sécurité) ;
- les options API doivent toujours retourner `name` + `categoryName`, jamais des IDs seuls comme labels ;
- ne pas migrer le champ JSON `skills` de `Collaborator` maintenant — ce sera le rôle de TEAM-004 ;
- garder `onDelete: Restrict` sur `category → skills` pour éviter la perte silencieuse de données.
