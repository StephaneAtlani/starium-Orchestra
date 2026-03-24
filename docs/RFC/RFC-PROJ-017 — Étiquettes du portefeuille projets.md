# RFC-PROJ-017 — Étiquettes du portefeuille projets

## Statut

Implémenté

## Objectif

Permettre à chaque client de définir un référentiel d’étiquettes projet dans `Projects / Options`, puis d’assigner ces étiquettes aux projets (N:N), avec isolation stricte par client actif.

---

## 1. Périmètre implémenté

- Référentiel client d’étiquettes (CRUD) via API `projects/options/tags`.
- Assignation d’étiquettes sur projet via API `projects/:id/tags` (remplacement complet).
- Affichage des étiquettes :
  - sur la fiche projet,
  - dans la liste portefeuille (colonne dédiée).
- Couleur par étiquette (palette + couleur personnalisée côté UI).

---

## 2. Modèle de données

### `ProjectTag`

- `id`, `clientId`, `name`, `color`, `createdAt`, `updatedAt`
- contrainte d’unicité : `@@unique([clientId, name])`
- index : `clientId`

### `ProjectTagAssignment`

- `id`, `clientId`, `projectId`, `tagId`, `createdAt`
- contrainte d’unicité : `@@unique([projectId, tagId])`
- index : `clientId`, `projectId`, `tagId`

Migration appliquée dans :
- `apps/api/prisma/migrations/20260324193000_add_project_tags_options_assignment/migration.sql`

---

## 3. API backend (implémentation)

Contrôleurs/guards existants conservés (`JwtAuthGuard`, `ActiveClientGuard`, `ModuleAccessGuard`, `PermissionsGuard`).

### Référentiel tags

- `GET /api/projects/options/tags` (`projects.read`)
- `POST /api/projects/options/tags` (`projects.update`)
- `PATCH /api/projects/options/tags/:tagId` (`projects.update`)
- `DELETE /api/projects/options/tags/:tagId` (`projects.update`)

### Assignation projet

- `GET /api/projects/:id/tags` (`projects.read`)
- `PUT /api/projects/:id/tags` (`projects.update`) — remplacement complet idempotent

### Règles métier/techniques

- Aucun `clientId` dans les DTO.
- Scope systématique sur `clientId` actif.
- Validation que `projectId` appartient au client actif.
- Validation que tous les `tagIds` appartiennent au client actif.
- `DELETE tag` supprime le tag et ses assignations dans une transaction Prisma.

---

## 4. Audit logs

Les audits sont écrits dans les services (jamais dans les controllers) :

- `project_tag.created`
- `project_tag.updated`
- `project_tag.deleted`
- `project_tag.assignment.updated`

---

## 5. Réponses projet enrichies

Ajout non-breaking de :

- `tags: Array<{ id, name, color }>`

sur :

- `ProjectListItemDto`
- `ProjectDetailDto`

---

## 6. Frontend

### Options portefeuille

- Route : `/projects/options`
- CRUD des étiquettes.
- Choix couleur : palette par défaut + personnalisée.
- Query keys tenant-aware (`clientId` inclus).
- Invalidations React Query après create/update/delete tag.

### Fiche projet

- Zone étiquettes dans le bloc Informations.
- Ajout via sélecteur (ouverture au clic `+`), retrait via badge.
- Invalidation après `PUT /projects/:id/tags`.

### Liste portefeuille

- Colonne dédiée `Étiquettes` avec badges colorés.

---

## 7. Tests et validation

Validé côté backend :

- tests service tags (CRUD, refus inter-client, idempotence assignation),
- test transactionnel suppression tag + cleanup assignations,
- typecheck API.

---

## 8. Multi-client / sécurité

- Isolation stricte des données par `clientId` actif.
- Aucune lecture/écriture cross-client autorisée sur les tags.
- Contrôle d’accès aligné RBAC existant (`projects.read` / `projects.update`).
