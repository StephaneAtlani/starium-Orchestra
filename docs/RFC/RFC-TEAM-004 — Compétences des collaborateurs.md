# RFC-TEAM-004 — Compétences des collaborateurs

## Statut

À faire

## Priorité

Haute (Phase 2 — socle compétences)

## Dépendances

- RFC-TEAM-002 — Référentiel Collaborateurs métier (entité `Collaborator`)
- RFC-TEAM-003 — Référentiel Compétences (entités `Skill`, `SkillCategory`, enums `SkillStatus`, `SkillReferenceLevel`)
- `docs/ARCHITECTURE.md` — principes API-first, multi-client, guards, isolation
- `.cursorrules` — règles frontend "valeur métier visible, jamais ID brut"
- RFC-013 — Audit logs (traçabilité des mutations métier)

---

# 1. Analyse de l'existant

Le catalogue de compétences (RFC-TEAM-003) est implémenté : modèles Prisma `Skill` et `SkillCategory`, module NestJS `skills`, CRUD complet avec catégories, archivage logique, permissions `skills.*` et seed.

Le modèle `Collaborator` porte un champ `skills Json?` — placeholder provisoire non exploité par les DTOs ni le service. Aucune relation structurée `Collaborator ↔ Skill` n'existe.

Constats :

- pas de table `CollaboratorSkill` dans le schéma Prisma ;
- pas d'API pour associer une compétence à un collaborateur ;
- aucune notion de niveau réel du collaborateur (distinct du `referenceLevel` attendu sur `Skill`) ;
- aucune mécanique de revue périodique, de source de déclaration ni de validation manager ;
- les futurs besoins (RFC-TEAM-015 matrice de compétences, RFC-TEAM-016 alertes compétence manquante, RFC-FE-TEAM-003 UI compétences collaborateur) imposent un modèle relationnel requêtable.

**Objectif** : créer l'association structurée `Collaborator ↔ Skill` avec niveau réel, commentaire, date de revue, source de déclaration et validation manager.

---

# 2. Hypothèses éventuelles

- Un collaborateur peut avoir **plusieurs compétences** ; une compétence peut être portée par **plusieurs collaborateurs** (many-to-many via `CollaboratorSkill`).
- L'association est **client-scoped** : le collaborateur et la compétence doivent appartenir au même client.
- Le **niveau réel** (`level`) sur l'association est distinct du **niveau de référence** (`referenceLevel`) sur `Skill` — le premier reflète la maîtrise individuelle, le second le niveau attendu.
- L'enum de niveaux réels réutilise les mêmes paliers que `SkillReferenceLevel` (`BEGINNER`, `INTERMEDIATE`, `ADVANCED`, `EXPERT`) — pas besoin d'un second enum au MVP, c'est le même vocabulaire.
- La **source** (`source`) indique comment l'association a été créée : auto-déclaration, évaluation manager, import, etc.
- La **validation manager** est un flag simple (`validatedByUserId` + `validatedAt`) — pas de workflow approbation complet au MVP.
- La **date de revue** (`reviewedAt`) est la dernière date où le niveau a été réévalué (peut être différente de `updatedAt`).
- **Un collaborateur ne peut avoir qu'une seule entrée par compétence** (unicité `collaboratorId + skillId`).
- Les compétences archivées (`Skill.status = ARCHIVED`) restent visibles dans les associations existantes mais ne peuvent plus être ajoutées à de nouveaux collaborateurs.
- Le champ JSON `skills` existant sur `Collaborator` sera marqué comme **déprécié** ; aucune migration automatique du contenu JSON vers `CollaboratorSkill`.
- Les permissions restent dans le module `skills` existant : `skills.read` pour la lecture, `skills.update` pour l'écriture des associations.
- L'API est **nestée sous le collaborateur** (`/api/collaborators/:collaboratorId/skills`) pour cohérence REST.

---

# 3. Liste des fichiers à créer / modifier

## Prisma

- `apps/api/prisma/schema.prisma` — ajout enum `CollaboratorSkillSource`, modèle `CollaboratorSkill`, relations sur `Collaborator` et `Skill`

## Backend (NestJS)

### Nouveau sous-module (dans `skills/`)

- `apps/api/src/modules/skills/collaborator-skills.controller.ts`
- `apps/api/src/modules/skills/collaborator-skills.service.ts`
- `apps/api/src/modules/skills/dto/create-collaborator-skill.dto.ts`
- `apps/api/src/modules/skills/dto/update-collaborator-skill.dto.ts`
- `apps/api/src/modules/skills/dto/list-collaborator-skills.query.dto.ts`
- `apps/api/src/modules/skills/dto/validate-collaborator-skill.dto.ts`
- `apps/api/src/modules/skills/dto/bulk-create-collaborator-skills.dto.ts`

### Modifications existantes

- `apps/api/src/modules/skills/skills.module.ts` — ajout `CollaboratorSkillsController`, `CollaboratorSkillsService`

### Tests

- `apps/api/src/modules/skills/collaborator-skills.service.spec.ts`
- `apps/api/src/modules/skills/collaborator-skills.controller.spec.ts`
- `apps/api/src/modules/skills/tests/collaborator-skills.integration.spec.ts`

## Documentation

- `docs/RFC/RFC-TEAM-004 — Compétences des collaborateurs.md` (ce document)
- `docs/RFC/_Plan de déploiement - Equipe.md` (état + lien)
- `docs/RFC/_RFC Liste.md` (index RFC)

---

# 4. Implémentation complète

## 4.1 Périmètre fonctionnel

L'association `CollaboratorSkill` couvre :

- **Attachement** d'une compétence du catalogue à un collaborateur avec un niveau réel ;
- **Commentaire** optionnel pour qualifier la compétence (contexte, projets, certifications, etc.) ;
- **Source de déclaration** : auto-déclaration, évaluation manager, import, revue RH ;
- **Date de revue** : dernière réévaluation formelle du niveau ;
- **Validation manager** : flag de confirmation avec identité du valideur et horodatage ;
- **CRUD** sur les associations d'un collaborateur ;
- **Ajout en lot** (bulk) : attacher plusieurs compétences à un collaborateur en une seule opération ;
- **Vue inversée** : lister les collaborateurs porteurs d'une compétence donnée (préparation RFC-TEAM-015 matrice).

## 4.2 Modèle de données

### Enum

```prisma
enum CollaboratorSkillSource {
  SELF_DECLARED
  MANAGER_ASSESSED
  HR_REVIEW
  IMPORTED
  OTHER
}
```

### Modèle `CollaboratorSkill`

```prisma
model CollaboratorSkill {
  id               String                    @id @default(cuid())
  clientId         String
  collaboratorId   String
  skillId          String
  level            SkillReferenceLevel       @default(BEGINNER)
  source           CollaboratorSkillSource   @default(SELF_DECLARED)
  comment          String?
  reviewedAt       DateTime?
  validatedByUserId String?
  validatedAt      DateTime?
  createdAt        DateTime                  @default(now())
  updatedAt        DateTime                  @updatedAt

  client       Client       @relation(fields: [clientId], references: [id], onDelete: Cascade)
  collaborator Collaborator @relation(fields: [collaboratorId], references: [id], onDelete: Cascade)
  skill        Skill        @relation(fields: [skillId], references: [id], onDelete: Restrict)
  validatedBy  User?        @relation("CollaboratorSkillValidator", fields: [validatedByUserId], references: [id], onDelete: SetNull)

  @@unique([collaboratorId, skillId])
  @@index([clientId])
  @@index([clientId, collaboratorId])
  @@index([clientId, skillId])
  @@index([clientId, level])
  @@index([validatedByUserId])
}
```

### Relations à ajouter

Sur `Collaborator` :

```prisma
collaboratorSkills CollaboratorSkill[]
```

Sur `Skill` :

```prisma
collaboratorSkills CollaboratorSkill[]
```

Sur `Client` :

```prisma
collaboratorSkills CollaboratorSkill[]
```

Sur `User` :

```prisma
validatedCollaboratorSkills CollaboratorSkill[] @relation("CollaboratorSkillValidator")
```

**Choix de design** :

- `onDelete: Cascade` sur `collaboratorId` : si le collaborateur est supprimé, ses associations sont nettoyées.
- `onDelete: Restrict` sur `skillId` : impossible de supprimer une compétence du catalogue si elle est associée à des collaborateurs (cohérent avec le mécanisme d'archivage de RFC-TEAM-003). En pratique, la suppression physique de `Skill` n'est pas exposée au MVP — l'archivage suffit.
- `onDelete: SetNull` sur `validatedByUserId` : si l'utilisateur valideur est supprimé, l'information de validation persiste (`validatedAt` reste renseigné) mais le lien utilisateur est rompu.
- L'unicité `[collaboratorId, skillId]` interdit les doublons : un collaborateur ne peut avoir qu'une seule entrée par compétence.
- `clientId` est porté directement sur le modèle pour performance des requêtes agrégées (matrice, reporting) sans jointure systématique sur `Collaborator`.
- `level` réutilise `SkillReferenceLevel` (même vocabulaire BEGINNER/INTERMEDIATE/ADVANCED/EXPERT) — pas d'enum dédié pour limiter la complexité au MVP.

## 4.3 Règles métier

### Scope client strict

- Toute lecture/écriture filtrée par `clientId` actif autorisé.
- Le collaborateur et la compétence doivent appartenir au même client.
- Aucune fuite inter-client.

### Création

- Le collaborateur cible doit exister, appartenir au client actif, et ne pas être `ARCHIVED`.
- La compétence cible doit exister, appartenir au client actif, et ne pas être `ARCHIVED`.
- Si l'association existe déjà → erreur 409 (Conflict).
- Le `level` par défaut est `BEGINNER`.
- La `source` par défaut est `SELF_DECLARED`.
- `reviewedAt` est optionnel à la création (peut être renseigné ultérieurement lors d'une revue).
- `validatedByUserId` et `validatedAt` ne sont **pas** settables à la création via le DTO principal — la validation est une action distincte.

### Mise à jour

- Seuls `level`, `source`, `comment` et `reviewedAt` sont modifiables via `PATCH`.
- Le `skillId` n'est **pas** modifiable (supprimer + recréer si changement de compétence).
- La mise à jour du `level` ne réinitialise pas la validation manager (choix délibéré pour le MVP ; une RFC future peut imposer une revalidation).

### Validation manager

- Action distincte : `PATCH /api/collaborators/:collaboratorId/skills/:id/validate`.
- Positionne `validatedByUserId` (depuis le JWT) et `validatedAt = now()`.
- Idempotent : une seconde validation met à jour le timestamp et le valideur.
- Retrait de validation : `PATCH /api/collaborators/:collaboratorId/skills/:id/invalidate` → remet `validatedByUserId = null` et `validatedAt = null`.
- Permission requise : `skills.update` (le manager doit avoir cette permission sur le client actif).

### Suppression

- Suppression physique d'une association (`DELETE /api/collaborators/:collaboratorId/skills/:id`).
- L'association est supprimée définitivement (pas d'archivage sur le lien — l'archivage se fait sur la compétence elle-même).

### Ajout en lot

- `POST /api/collaborators/:collaboratorId/skills/bulk` accepte un tableau d'associations.
- Chaque entrée est validée individuellement.
- Les entrées en conflit (compétence déjà associée) sont ignorées (mode `skipDuplicates`) et retournées dans une liste `skipped`.
- Transaction : soit toutes les nouvelles entrées valides sont créées, soit rollback en cas d'erreur système.

### Vue inversée (collaborateurs par compétence)

- `GET /api/skills/:skillId/collaborators` retourne la liste des collaborateurs porteurs de cette compétence avec leur niveau et statut de validation.
- Paginé, filtrable par `level`, `validated` (booléen : a une validation active ou non).
- Préparation directe pour RFC-TEAM-015 (matrice de compétences).

## 4.4 API cible

### Routes nestées sous collaborateur

| Méthode | Route | Permission | Description |
|---------|-------|------------|-------------|
| `GET` | `/api/collaborators/:collaboratorId/skills` | `skills.read` | Liste des compétences d'un collaborateur |
| `POST` | `/api/collaborators/:collaboratorId/skills` | `skills.update` | Ajouter une compétence à un collaborateur |
| `POST` | `/api/collaborators/:collaboratorId/skills/bulk` | `skills.update` | Ajout en lot |
| `PATCH` | `/api/collaborators/:collaboratorId/skills/:id` | `skills.update` | Mise à jour (niveau, source, commentaire, revue) |
| `DELETE` | `/api/collaborators/:collaboratorId/skills/:id` | `skills.update` | Supprimer l'association |
| `PATCH` | `/api/collaborators/:collaboratorId/skills/:id/validate` | `skills.update` | Validation manager |
| `PATCH` | `/api/collaborators/:collaboratorId/skills/:id/invalidate` | `skills.update` | Retrait de validation |

### Route inversée sous compétence

| Méthode | Route | Permission | Description |
|---------|-------|------------|-------------|
| `GET` | `/api/skills/:skillId/collaborators` | `skills.read` | Collaborateurs porteurs de cette compétence |

### Filtres `GET /api/collaborators/:collaboratorId/skills`

| Paramètre | Type | Description |
|-----------|------|-------------|
| `search` | `string` | Recherche sur nom de la compétence |
| `categoryId` | `string` | Filtre par catégorie de compétence |
| `level[]` | `SkillReferenceLevel[]` | Filtre par niveau(x) réel(s) |
| `source[]` | `CollaboratorSkillSource[]` | Filtre par source(s) |
| `validated` | `boolean` | Uniquement les compétences validées (`true`) ou non validées (`false`) |
| `includeArchived` | `boolean` | Inclure les compétences archivées (défaut `false`) |
| `limit` | `number` | Pagination (défaut 20) |
| `offset` | `number` | Offset pagination |
| `sortBy` | `string` | Champ de tri (`skillName`, `level`, `reviewedAt`, `validatedAt`, `createdAt`) |
| `sortOrder` | `asc \| desc` | Direction du tri |

### Filtres `GET /api/skills/:skillId/collaborators`

| Paramètre | Type | Description |
|-----------|------|-------------|
| `search` | `string` | Recherche sur nom du collaborateur |
| `level[]` | `SkillReferenceLevel[]` | Filtre par niveau(x) |
| `validated` | `boolean` | Uniquement les validés ou non |
| `limit` | `number` | Pagination (défaut 20) |
| `offset` | `number` | Offset pagination |
| `sortBy` | `string` | Champ de tri (`collaboratorName`, `level`, `validatedAt`) |
| `sortOrder` | `asc \| desc` | Direction du tri |

## 4.5 Contrat API

### Payload liste compétences d'un collaborateur

```json
{
  "items": [
    {
      "id": "cs_abc",
      "collaboratorId": "collab_123",
      "skillId": "skill_xyz",
      "skillName": "Kubernetes",
      "skillCategoryId": "cat_456",
      "skillCategoryName": "Infrastructure & Cloud",
      "skillReferenceLevel": "ADVANCED",
      "level": "INTERMEDIATE",
      "source": "MANAGER_ASSESSED",
      "comment": "Formation suivie en 2025, pratique projet interne.",
      "reviewedAt": "2026-03-15T10:00:00Z",
      "validatedByUserId": "user_789",
      "validatedByName": "Marie Dupont",
      "validatedAt": "2026-03-20T14:30:00Z",
      "createdAt": "2026-01-10T09:00:00Z",
      "updatedAt": "2026-03-20T14:30:00Z"
    }
  ],
  "total": 12,
  "limit": 20,
  "offset": 0
}
```

### Payload collaborateurs porteurs d'une compétence

```json
{
  "items": [
    {
      "id": "cs_abc",
      "collaboratorId": "collab_123",
      "collaboratorDisplayName": "Jean Martin",
      "collaboratorJobTitle": "Ingénieur DevOps",
      "collaboratorStatus": "ACTIVE",
      "level": "INTERMEDIATE",
      "source": "SELF_DECLARED",
      "reviewedAt": null,
      "validatedAt": "2026-03-20T14:30:00Z",
      "validatedByName": "Marie Dupont"
    }
  ],
  "total": 8,
  "limit": 20,
  "offset": 0
}
```

### Payload ajout en lot (réponse)

```json
{
  "created": [
    {
      "id": "cs_new1",
      "skillId": "skill_a",
      "skillName": "Docker",
      "level": "INTERMEDIATE"
    },
    {
      "id": "cs_new2",
      "skillId": "skill_b",
      "skillName": "Terraform",
      "level": "BEGINNER"
    }
  ],
  "skipped": [
    {
      "skillId": "skill_c",
      "skillName": "Kubernetes",
      "reason": "already_associated"
    }
  ]
}
```

Règles de contrat :

- format liste : `{ items, total, limit, offset }` ;
- champs d'affichage inclus (`skillName`, `skillCategoryName`, `validatedByName`, `collaboratorDisplayName`) pour éviter des jointures frontend ;
- `skillReferenceLevel` inclus dans le payload collaborateur pour permettre la comparaison niveau réel vs attendu côté UI ;
- aucun libellé UX localisé dans l'API — mapping label côté frontend ;
- l'ajout en lot retourne la liste des créés et des ignorés avec la raison.

## 4.6 DTOs

### `CreateCollaboratorSkillDto`

| Champ | Type | Requis | Validation |
|-------|------|--------|------------|
| `skillId` | `string` | oui | `@IsString`, `@IsNotEmpty` |
| `level` | `SkillReferenceLevel` | non | `@IsOptional`, `@IsEnum(SkillReferenceLevel)`, défaut `BEGINNER` |
| `source` | `CollaboratorSkillSource` | non | `@IsOptional`, `@IsEnum(CollaboratorSkillSource)`, défaut `SELF_DECLARED` |
| `comment` | `string` | non | `@IsOptional`, `@IsString`, `@MaxLength(2000)` |
| `reviewedAt` | `ISO 8601` | non | `@IsOptional`, `@IsDateString` |

### `UpdateCollaboratorSkillDto`

| Champ | Type | Requis | Validation |
|-------|------|--------|------------|
| `level` | `SkillReferenceLevel` | non | `@IsOptional`, `@IsEnum(SkillReferenceLevel)` |
| `source` | `CollaboratorSkillSource` | non | `@IsOptional`, `@IsEnum(CollaboratorSkillSource)` |
| `comment` | `string` | non | `@IsOptional`, `@IsString`, `@MaxLength(2000)` |
| `reviewedAt` | `ISO 8601` | non | `@IsOptional`, `@IsDateString` |

`skillId` n'est **pas** dans le DTO update (immutable).

### `BulkCreateCollaboratorSkillsDto`

| Champ | Type | Requis | Validation |
|-------|------|--------|------------|
| `items` | `CreateCollaboratorSkillDto[]` | oui | `@IsArray`, `@ArrayMinSize(1)`, `@ArrayMaxSize(50)`, `@ValidateNested({ each: true })`, `@Type(() => CreateCollaboratorSkillDto)` |

### `ListCollaboratorSkillsQueryDto`

Reprend les filtres §4.4. Validation : `@IsOptional`, pagination `@Transform` + `@IsInt` + `@Min`.

### `ValidateCollaboratorSkillDto`

Aucun champ — l'action repose uniquement sur l'identité du JWT.

### `ListSkillCollaboratorsQueryDto`

Reprend les filtres §4.4 (vue inversée). Mêmes patterns de validation.

## 4.7 Organisation du module NestJS

Le contrôleur et le service sont ajoutés au module `skills` existant :

```
apps/api/src/modules/skills/
├── skills.module.ts                          # existant — ajout CollaboratorSkillsController + Service
├── skills.controller.ts                      # existant — inchangé
├── skill-categories.controller.ts            # existant — inchangé
├── skills.service.ts                         # existant — inchangé
├── collaborator-skills.controller.ts         # nouveau — @Controller('collaborators')
├── collaborator-skills.service.ts            # nouveau
├── dto/
│   ├── create-skill.dto.ts                   # existant
│   ├── update-skill.dto.ts                   # existant
│   ├── ...                                   # existants
│   ├── create-collaborator-skill.dto.ts      # nouveau
│   ├── update-collaborator-skill.dto.ts      # nouveau
│   ├── bulk-create-collaborator-skills.dto.ts # nouveau
│   ├── list-collaborator-skills.query.dto.ts # nouveau
│   ├── validate-collaborator-skill.dto.ts    # nouveau (vide ou absent si pas de champ)
│   └── list-skill-collaborators.query.dto.ts # nouveau
├── collaborator-skills.service.spec.ts       # nouveau
├── collaborator-skills.controller.spec.ts    # nouveau
└── tests/
    ├── skills.integration.spec.ts            # existant
    └── collaborator-skills.integration.spec.ts # nouveau
```

Le contrôleur `CollaboratorSkillsController` a un double préfixe :
- Routes nestées : `@Controller('collaborators')` pour `/api/collaborators/:collaboratorId/skills/*`
- La route inversée `/api/skills/:skillId/collaborators` est ajoutée sur le `SkillsController` existant (méthode supplémentaire).

## 4.8 Guards et décorateurs

Identique au pattern existant :

```typescript
@Controller('collaborators')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class CollaboratorSkillsController {
  // routes sous /:collaboratorId/skills/...
}
```

Le `ModuleAccessGuard` utilise le préfixe `skills` pour vérifier l'activation du module.

La route inversée sur `SkillsController` hérite des mêmes guards déjà en place.

## 4.9 Permissions et audit

### Permissions

Réutilisation des permissions existantes du module `skills` :

| Permission | Endpoints couverts |
|------------|-------------------|
| `skills.read` | `GET` compétences collaborateur + collaborateurs par compétence |
| `skills.update` | `POST` / `PATCH` / `DELETE` associations + validate / invalidate |

Pas de nouvelles permissions au seed — les permissions `skills.*` existantes couvrent le besoin.

### Actions d'audit

| Action | Déclencheur |
|--------|------------|
| `collaborator_skill.created` | Ajout d'une compétence à un collaborateur |
| `collaborator_skill.updated` | Mise à jour niveau/source/commentaire/revue |
| `collaborator_skill.deleted` | Suppression de l'association |
| `collaborator_skill.validated` | Validation manager |
| `collaborator_skill.invalidated` | Retrait de validation |
| `collaborator_skill.bulk_created` | Ajout en lot (une entrée d'audit par lot, détail dans `newValue`) |

---

# 5. Modifications Prisma

## 5.1 Ajouts au schéma

Ajouter dans `schema.prisma` :

1. Enum `CollaboratorSkillSource`
2. Modèle `CollaboratorSkill`
3. Relation `collaboratorSkills CollaboratorSkill[]` sur `Collaborator`
4. Relation `collaboratorSkills CollaboratorSkill[]` sur `Skill`
5. Relation `collaboratorSkills CollaboratorSkill[]` sur `Client`
6. Relation `validatedCollaboratorSkills CollaboratorSkill[] @relation("CollaboratorSkillValidator")` sur `User`

## 5.2 Migration

Fichier de migration dédié : `20260402120000_add_collaborator_skills`.

Contenu SQL attendu :

```sql
CREATE TYPE "CollaboratorSkillSource" AS ENUM (
  'SELF_DECLARED',
  'MANAGER_ASSESSED',
  'HR_REVIEW',
  'IMPORTED',
  'OTHER'
);

CREATE TABLE "CollaboratorSkill" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "collaboratorId" TEXT NOT NULL,
  "skillId" TEXT NOT NULL,
  "level" "SkillReferenceLevel" NOT NULL DEFAULT 'BEGINNER',
  "source" "CollaboratorSkillSource" NOT NULL DEFAULT 'SELF_DECLARED',
  "comment" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "validatedByUserId" TEXT,
  "validatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CollaboratorSkill_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CollaboratorSkill_collaboratorId_skillId_key"
  ON "CollaboratorSkill"("collaboratorId", "skillId");

CREATE INDEX "CollaboratorSkill_clientId_idx"
  ON "CollaboratorSkill"("clientId");

CREATE INDEX "CollaboratorSkill_clientId_collaboratorId_idx"
  ON "CollaboratorSkill"("clientId", "collaboratorId");

CREATE INDEX "CollaboratorSkill_clientId_skillId_idx"
  ON "CollaboratorSkill"("clientId", "skillId");

CREATE INDEX "CollaboratorSkill_clientId_level_idx"
  ON "CollaboratorSkill"("clientId", "level");

CREATE INDEX "CollaboratorSkill_validatedByUserId_idx"
  ON "CollaboratorSkill"("validatedByUserId");

ALTER TABLE "CollaboratorSkill"
  ADD CONSTRAINT "CollaboratorSkill_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CollaboratorSkill"
  ADD CONSTRAINT "CollaboratorSkill_collaboratorId_fkey"
  FOREIGN KEY ("collaboratorId") REFERENCES "Collaborator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CollaboratorSkill"
  ADD CONSTRAINT "CollaboratorSkill_skillId_fkey"
  FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CollaboratorSkill"
  ADD CONSTRAINT "CollaboratorSkill_validatedByUserId_fkey"
  FOREIGN KEY ("validatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

## 5.3 Seed

Pas de nouvelles permissions nécessaires — `skills.read` / `skills.update` existantes couvrent le besoin.

Seed de démo optionnel (si des collaborateurs et compétences de démo existent) :

- 5–10 associations `CollaboratorSkill` avec des niveaux variés ;
- 2–3 validations manager sur des associations existantes.

## 5.4 Impact sur `Collaborator`

- Le champ `skills Json?` est **conservé** mais **explicitement déprécié** dans la documentation.
- Le service `CollaboratorsService` continue de ne pas toucher à ce champ.
- Une migration future (hors scope de cette RFC) pourra nettoyer ce champ après avoir vérifié qu'aucune donnée significative n'y réside.

## 5.5 Impact sur `Skill`

- Ajout de la relation `collaboratorSkills` sur le modèle `Skill`.
- La suppression physique d'une `Skill` (non exposée au MVP) est désormais bloquée si des `CollaboratorSkill` existent (`onDelete: Restrict`). L'archivage reste le mécanisme recommandé.
- Le service `SkillsService` n'est pas modifié — seule la route inversée `GET /api/skills/:skillId/collaborators` est ajoutée sur le contrôleur existant.

---

# 6. Tests

## 6.1 Tests unitaires service (`collaborator-skills.service.spec.ts`)

### Création

- création valide → `level` par défaut `BEGINNER`, `source` par défaut `SELF_DECLARED` ;
- création avec niveau et source explicites ;
- création avec `reviewedAt` renseigné ;
- collaborateur inexistant → erreur 404 ;
- collaborateur d'un autre client → erreur 404 ;
- collaborateur `ARCHIVED` → erreur 400 ;
- compétence inexistante → erreur 404 ;
- compétence d'un autre client → erreur 404 ;
- compétence `ARCHIVED` → erreur 400 ;
- doublon `collaboratorId + skillId` → erreur 409 ;
- `validatedByUserId` / `validatedAt` **ne sont pas** settables via création ;

### Mise à jour

- mise à jour partielle (`level` seul, `comment` seul, `source` seule) ;
- mise à jour `reviewedAt` ;
- `skillId` ne peut pas être modifié → champ absent du DTO ;
- association inexistante → erreur 404 ;
- association d'un autre client → erreur 404 ;

### Validation manager

- validate → `validatedByUserId` et `validatedAt` renseignés ;
- re-validate (idempotent) → timestamp mis à jour ;
- invalidate → `validatedByUserId = null` et `validatedAt = null` ;
- invalidate sur une association non validée → idempotent ;

### Suppression

- suppression physique d'une association existante → OK ;
- suppression d'une association inexistante → erreur 404 ;

### Ajout en lot

- bulk avec 3 compétences valides → 3 créées, 0 skipped ;
- bulk avec 1 doublon + 2 nouvelles → 2 créées, 1 skipped ;
- bulk avec une compétence d'un autre client → erreur 400 ;
- bulk avec tableau vide → erreur 400 ;

### Listes

- liste des compétences d'un collaborateur filtrée par catégorie, niveau, source, validation ;
- liste exclut les compétences archivées par défaut ;
- liste avec `includeArchived = true` inclut archivées ;
- collaborateurs par compétence filtrés par niveau, validation ;
- pagination correcte.

## 6.2 Tests unitaires contrôleur (`collaborator-skills.controller.spec.ts`)

- validation DTO refusée si `skillId` manquant sur création ;
- `UpdateCollaboratorSkillDto` ne contient pas `skillId` ;
- `BulkCreateCollaboratorSkillsDto` refuse un tableau de plus de 50 éléments ;
- routing correct vers les méthodes service ;
- guards appliqués sur chaque route.

## 6.3 Tests d'intégration (`collaborator-skills.integration.spec.ts`)

- isolation client stricte (un utilisateur ne peut pas ajouter une compétence d'un autre client à un collaborateur) ;
- isolation client stricte (un utilisateur ne peut pas lire les associations d'un collaborateur d'un autre client) ;
- permissions RBAC par endpoint (`skills.read` → lecture OK, écriture refusée ; `skills.update` → écriture OK) ;
- scénario complet : créer → lister → mettre à jour niveau → valider → invalider → supprimer ;
- scénario bulk : ajouter 3 compétences, vérifier réponse `created` + `skipped` ;
- vue inversée : lister les collaborateurs porteurs d'une compétence ;
- audit log présent sur create / update / delete / validate / invalidate ;
- la suppression d'une compétence du catalogue (`Skill`) est bloquée si des associations existent.

## 6.4 Cas critiques

- un utilisateur multi-client ne voit que les associations du client actif ;
- une compétence archivée ne peut pas être ajoutée à un collaborateur ;
- une compétence archivée **déjà associée** reste visible dans la liste (avec indication) ;
- le champ `skillName` et `skillCategoryName` sont toujours renseignés dans les réponses (jamais d'IDs seuls comme labels) ;
- `validatedByName` est renseigné quand la validation existe (jointure User) ;
- le contrat API reste `{ items, total, limit, offset }` ;
- la pagination respecte les défauts (`limit 20` liste, `limit 50` options) ;
- le `collaboratorId` du path est vérifié comme appartenant au client actif avant toute opération.

---

# 7. Récapitulatif final

`RFC-TEAM-004` crée l'**association structurée entre collaborateurs et compétences**, complétant le catalogue de compétences (RFC-TEAM-003) pour répondre à la question « qui sait faire quoi, à quel niveau ? ».

Livrables :

- modèle Prisma `CollaboratorSkill` avec enum `CollaboratorSkillSource` ;
- contrôleur `CollaboratorSkillsController` (routes nestées sous `/api/collaborators/:collaboratorId/skills`) ;
- route inversée `GET /api/skills/:skillId/collaborators` sur `SkillsController` ;
- CRUD unitaire + ajout en lot + validation / invalidation manager ;
- isolation client stricte + RBAC `skills.*` + audit ;
- contrat API avec champs d'affichage (noms compétence, catégorie, valideur) ;
- tests unitaires + intégration couvrant isolation, validation, bulk et cohérence relationnelle.

Ce modèle est le **prérequis direct** de :

- **RFC-TEAM-015** : matrice de compétences (vue croisée collaborateurs × compétences × niveaux) ;
- **RFC-TEAM-016** : alertes compétence manquante (gap entre `level` réel et `referenceLevel` attendu) ;
- **RFC-FE-TEAM-003** : UI compétences collaborateur (affichage, édition, validation) ;
- **RFC-TEAM-014** : vue collaborateur (onglet « mes compétences »).

---

# 8. Points de vigilance

- **Ne pas confondre les niveaux** : `Skill.referenceLevel` = niveau attendu par le client pour cette compétence ; `CollaboratorSkill.level` = niveau réel du collaborateur. L'écart entre les deux est la base des alertes de gap (RFC-TEAM-016).
- **Compétences archivées** : ne peuvent plus être ajoutées mais les associations existantes restent intactes et visibles. L'UI devra signaler visuellement les compétences archivées dans la liste collaborateur.
- **Validation manager** : mécanisme simple au MVP (flag + identité). Un workflow d'approbation complet (demande → approbation → notification) est hors scope et peut être ajouté en v2 via le moteur workflow admin.
- **Performance** : les index `[clientId, collaboratorId]` et `[clientId, skillId]` sont cruciaux pour les requêtes de liste et la matrice future. La dénormalisation de `clientId` sur `CollaboratorSkill` évite une jointure systématique.
- **Pas de migration du champ JSON** : le champ `Collaborator.skills Json?` n'est pas migré automatiquement. Si des données utiles y résident chez certains clients, une migration manuelle peut être scriptée hors de cette RFC.
- **Suppression en cascade** : la suppression d'un collaborateur supprime ses associations. La suppression d'une compétence est bloquée. C'est le bon compromis pour préserver l'intégrité du référentiel.
- **Le contrôleur est dans le module `skills`** (pas dans `collaborators`) pour regrouper toute la logique compétences. Il importe `PrismaService` et `AuditLogsService` via les exports du module skills existant.
- **Les options API** (compétences à associer) réutilisent `GET /api/skills/options` existant — pas de nouvel endpoint dédié. Le frontend filtre les compétences déjà associées côté client pour simplifier l'UX d'ajout.
