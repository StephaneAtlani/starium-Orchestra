# RFC-TEAM-002 — Référentiel Collaborateurs métier

## Statut

Implémentée (backend MVP)

## Priorité

Haute

## Dépendances

- RFC-TEAM-001 — Synchronisation des collaborateurs depuis AD DS (socle source annuaire déjà en place)
- `docs/ARCHITECTURE.md` — principes API-first, multi-client, guards, isolation
- `.cursorrules` — règles frontend "valeur métier visible, jamais ID brut"
- RFC-013 — Audit logs (traçabilité des mutations métier)

---

# 1. Analyse de l’existant

Le dépôt dispose déjà du socle de synchronisation annuaire (`RFC-TEAM-001`) avec provisioning vers `User` / `ClientUser` et alimentation de `Collaborator`.

Constat actuel :

- la brique "alimentation technique" existe ;
- la brique "référentiel métier collaborateur" est incomplète (CRUD métier dédié, attributs gouvernance RH/IT, contraintes de verrouillage sync) ;
- les usages manager, staffing, compétences et timesheet dépendent d’un référentiel collaborateur stable ;
- l’isolation client est déjà un invariant fort côté plateforme, à conserver strictement ;
- la future UI Teams devra afficher des libellés métiers (nom collaborateur, fonction, statut, manager), jamais des IDs.

Objectif de cette RFC : définir la première brique métier réelle du module Équipes, au-dessus du socle de synchronisation.

---

# 2. Hypothèses éventuelles

- `Collaborator` est l’entité métier pivot pour les modules Teams, Staffing et Timesheet.
- Un collaborateur est toujours rattaché à un `clientId`.
- Le référentiel accepte deux sources : manuel et synchronisé annuaire.
- Un collaborateur synchronisé peut avoir des champs verrouillés (identité/source) mais conserve des champs enrichissables localement (tags, notes, statut métier interne selon règle).
- La relation manager est interne au même client.
- Les tags métier sont des labels lisibles (pas d’ID exposé en UI).
- Les API retournent les valeurs canoniques et les champs d’affichage utiles (`displayName`, `jobTitle`, `managerDisplayName`) sans libellés UX localisés.

---

# 3. Liste des fichiers à créer / modifier

## Backend (NestJS) — lot MVP inclus

- `apps/api/src/modules/collaborators/collaborators.module.ts`
- `apps/api/src/modules/collaborators/collaborators.controller.ts`
- `apps/api/src/modules/collaborators/collaborators.service.ts`
- `apps/api/src/modules/collaborators/dto/create-collaborator.dto.ts`
- `apps/api/src/modules/collaborators/dto/update-collaborator.dto.ts`
- `apps/api/src/modules/collaborators/dto/list-collaborators.query.dto.ts`
- `apps/api/src/modules/collaborators/dto/update-collaborator-status.dto.ts`
- `apps/api/src/modules/collaborators/collaborators.service.spec.ts`
- `apps/api/src/modules/collaborators/collaborators.controller.spec.ts`
- `apps/api/src/modules/collaborators/tests/collaborators.integration.spec.ts`

## Prisma — lot MVP inclus

- `apps/api/prisma/schema.prisma` (vérification enum/statuts existants)
- `apps/api/prisma/seed.ts` (module + permissions `collaborators.*`)

## Hors scope du lot MVP (backend-only)

- frontend Teams (`apps/web/...`)
- refonte relationnelle des tags (`CollaboratorTag`, `CollaboratorTagAssignment`)
- ajout `CollaboratorType`
- ajout `archivedAt`
- réorganisation de module sous `apps/api/src/modules/teams/...`

## Documentation

- `docs/RFC/RFC-TEAM-002 — Référentiel Collaborateurs métier.md` (ce document)
- `docs/RFC/_RFC Liste.md` (index RFC)

---

# 4. Implémentation complète

## 4.1 Périmètre fonctionnel

CRUD métier de `Collaborator` :

- identité : prénom, nom, nom affiché, email, identifiant RH éventuel ;
- fonction : job title, département, équipe logique ;
- hiérarchie : manager (`managerId`) ;
- statut : actif, inactif, en sortie, suspendu (selon enum retenue) ;
- source : manuelle ou synchronisée ;
- tags métier ;
- notes internes.

## 4.2 Règles métier

- **Scope client strict** : toute lecture/écriture filtrée par `clientId` actif autorisé.
- **Aucune fuite inter-client** : un manager doit appartenir au même client.
- **Synchronisé vs manuel** :
  - `source=DIRECTORY_SYNC` : champs d’identité verrouillables selon politique ;
  - `source=MANUAL` : édition complète autorisée.
- **Suppression** :
  - suppression logique via `status` (`INACTIVE` pour manuel, `DISABLED_SYNC` pour synchronisé) ;
  - pas de suppression physique par défaut si données liées.
- **Tags** :
  - stocker clé interne, exposer libellé métier ;
  - UI affiche toujours label.
- **Notes** :
  - éditables côté métier ;
  - historisées via audit pour actions sensibles.

## 4.3 API cible (v1)

- `GET /api/collaborators`
- `POST /api/collaborators`
- `GET /api/collaborators/:id`
- `PATCH /api/collaborators/:id`
- `PATCH /api/collaborators/:id/status`
- `DELETE /api/collaborators/:id` (soft delete)
- `GET /api/collaborators/options/managers`
- `GET /api/collaborators/options/tags`

Filtres principaux `GET /collaborators` :

- `search` (nom, email, code RH)
- `status[]`
- `source[]`
- `managerId`
- `tag[]`
- pagination/tri

## 4.4 Contrat API backend (figé)

Exemple de payload liste :

```json
{
  "items": [
    {
      "id": "col_123",
      "displayName": "Nadia Martin",
      "firstName": "Nadia",
      "lastName": "Martin",
      "email": "nadia.martin@client.fr",
      "jobTitle": "Responsable Applications",
      "managerId": "col_456",
      "managerDisplayName": "Thomas Leroy",
      "status": "ACTIVE",
      "source": "DIRECTORY_SYNC",
      "internalTags": { "run": true, "critical": true },
      "internalNotes": "Référent MCO ERP"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

Règles de contrat backend :

- format liste/options unique : `{ items, total, limit, offset }` ;
- pagination : `limit`/`offset` ;
- defaults pagination : `GET /api/collaborators` = `limit 20`, `GET /api/collaborators/options/managers` = `limit 20`, `GET /api/collaborators/options/tags` = `limit 50` ;
- valeurs canoniques uniquement : `status`, `source` ;
- champs d’affichage utiles inclus (`displayName`, `managerDisplayName`) ;
- aucun libellé UX localisé dans l’API (`statusLabel`, `sourceLabel` interdits).
- changement de statut via endpoint dédié uniquement : `PATCH /api/collaborators/:id/status`.

## 4.5 Permissions et audit

Permissions minimales (module `collaborators`) :

- `collaborators.read`
- `collaborators.create`
- `collaborators.update`
- `collaborators.delete`

Ces permissions doivent rester cohérentes avec `ModuleAccessGuard` (préfixe module = `collaborators`).

Audit actions minimales :

- `collaborator.created`
- `collaborator.updated`
- `collaborator.status_updated`
- `collaborator.deleted`
- `collaborator.manager_changed`

---

# 5. Modifications Prisma si nécessaire

## 5.1 Modèle cible

Lot MVP backend : confirmer `Collaborator` sans extension de schéma :

- `status` (enum `CollaboratorStatus`)
- `source` (enum `CollaboratorSource`)
- `managerId` nullable (self relation)
- `internalNotes` nullable
- `internalTags` JSON
- suppression logique via `status` (`INACTIVE` / `DISABLED_SYNC`)

Hors lot MVP backend :

- `CollaboratorType`
- `archivedAt`
- tables relationnelles de tags

---

# 6. Tests

## 6.1 Unit tests backend

- création collaborateur manuel valide ;
- update partiel collaborateur manuel ;
- blocage update champ verrouillé sur collaborateur synchronisé ;
- validation manager même client ;
- filtrage tags/statut/source ;
- soft delete sans suppression physique.

## 6.2 Integration tests backend

- isolation client stricte (read/write) ;
- permissions RBAC par endpoint ;
- cohérence payload options managers/tags ;
- audit log présent sur create/update/delete/status.

## 6.3 Scénarios critiques backend

- un utilisateur multi-client ne voit que les collaborateurs du client actif ;
- un manager d’un autre client est refusé ;
- un collaborateur synchronisé conserve ses tags/notes locaux ;
- le contrat API reste `{ items, total, limit, offset }`.

---

# 7. Récapitulatif final

`RFC-TEAM-002` définit le référentiel métier central des collaborateurs et transforme le socle de sync (`RFC-TEAM-001`) en base exploitable pour staffing, compétences et pilotage manager.

Livrables attendus du lot RFC-TEAM-002 (backend-only) :

- API CRUD collaborateur client-scopée ;
- règles métiers sync vs manuel ;
- tags/notes/statuts managés ;
- audit/RBAC systématiques ;
- pas de divergence routes/RBAC/contrat API avec le plan backend.

---

# 8. Points de vigilance

- éviter les conflits de vérité entre annuaire et édition locale (règles de verrouillage explicites) ;
- ne jamais permettre une relation manager inter-client ;
- garantir la compatibilité avec les prochains lots TEAM-003 à TEAM-009 ;
- contrôler le coût des requêtes liste (pagination + index) ;
- maintenir des labels complets dans les DTOs pour éviter les régressions UI "ID visible".
