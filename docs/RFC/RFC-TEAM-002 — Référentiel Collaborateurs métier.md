# RFC-TEAM-002 — Référentiel Collaborateurs métier

## Statut

Draft (à implémenter)

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
- Les API retournent systématiquement les champs de libellé nécessaires à l’affichage UI (`displayName`, `jobTitle`, `statusLabel`, `managerDisplayName`, etc.).

---

# 3. Liste des fichiers à créer / modifier

## Backend (NestJS)

- `apps/api/src/modules/teams/collaborators/collaborators.module.ts`
- `apps/api/src/modules/teams/collaborators/collaborators.controller.ts`
- `apps/api/src/modules/teams/collaborators/collaborators.service.ts`
- `apps/api/src/modules/teams/collaborators/dto/create-collaborator.dto.ts`
- `apps/api/src/modules/teams/collaborators/dto/update-collaborator.dto.ts`
- `apps/api/src/modules/teams/collaborators/dto/list-collaborators.query.dto.ts`
- `apps/api/src/modules/teams/collaborators/dto/update-collaborator-status.dto.ts`
- `apps/api/src/modules/teams/collaborators/tests/collaborators.service.spec.ts`
- `apps/api/src/modules/teams/collaborators/tests/collaborators.controller.spec.ts`

## Prisma

- `apps/api/prisma/schema.prisma` (si extension modèle/enum/table nécessaire)
- `apps/api/prisma/migrations/*` (migration associée)

## Frontend (Next.js)

- `apps/web/src/features/teams/collaborators/api/*.ts`
- `apps/web/src/features/teams/collaborators/components/CollaboratorsTable.tsx`
- `apps/web/src/features/teams/collaborators/components/CollaboratorForm.tsx`
- `apps/web/src/features/teams/collaborators/components/CollaboratorStatusBadge.tsx`
- `apps/web/src/features/teams/collaborators/hooks/*.ts`
- `apps/web/src/app/(authenticated)/teams/collaborators/page.tsx`

## Documentation

- `docs/RFC/RFC-TEAM-002 — Référentiel Collaborateurs métier.md` (ce document)
- `docs/RFC/_RFC Liste.md` (index RFC)

---

# 4. Implémentation complète

## 4.1 Périmètre fonctionnel

CRUD métier de `Collaborator` :

- identité : prénom, nom, nom affiché, email, identifiant RH éventuel ;
- typologie : type collaborateur (interne, externe, prestataire) ;
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
  - `source=SYNCED` : champs d’identité verrouillables selon politique ;
  - `source=MANUAL` : édition complète autorisée.
- **Suppression** :
  - suppression logique recommandée (`archivedAt` ou statut) ;
  - pas de suppression physique par défaut si données liées.
- **Tags** :
  - stocker clé interne, exposer libellé métier ;
  - UI affiche toujours label.
- **Notes** :
  - éditables côté métier ;
  - historisées via audit pour actions sensibles.

## 4.3 API cible (v1)

- `GET /api/teams/collaborators`
- `POST /api/teams/collaborators`
- `GET /api/teams/collaborators/:id`
- `PATCH /api/teams/collaborators/:id`
- `PATCH /api/teams/collaborators/:id/status`
- `DELETE /api/teams/collaborators/:id` (soft delete)
- `GET /api/teams/collaborators/options/managers`
- `GET /api/teams/collaborators/options/tags`

Filtres principaux `GET /collaborators` :

- `search` (nom, email, code RH)
- `status[]`
- `type[]`
- `source[]`
- `managerId`
- `tag[]`
- pagination/tri

## 4.4 Contrat de réponse UI (valeur, pas ID)

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
      "type": "INTERNAL",
      "typeLabel": "Interne",
      "jobTitle": "Responsable Applications",
      "managerId": "col_456",
      "managerDisplayName": "Thomas Leroy",
      "status": "ACTIVE",
      "statusLabel": "Actif",
      "source": "SYNCED",
      "sourceLabel": "Synchronisé",
      "tags": [
        { "id": "tag_run", "label": "Run" },
        { "id": "tag_critical", "label": "Critique" }
      ],
      "notes": "Référent MCO ERP"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 1
}
```

Règle UI obligatoire :

- on stocke les IDs côté mutations ;
- on affiche toujours les labels côté composants (`Select`, `Combobox`, table, badges, recherche, placeholders).

## 4.5 Permissions et audit

Permissions minimales :

- `teams.collaborators.read`
- `teams.collaborators.create`
- `teams.collaborators.update`
- `teams.collaborators.delete`

Audit actions minimales :

- `collaborator.created`
- `collaborator.updated`
- `collaborator.status_updated`
- `collaborator.deleted`
- `collaborator.manager_changed`

---

# 5. Modifications Prisma si nécessaire

## 5.1 Modèle cible

Étendre ou confirmer `Collaborator` avec :

- `type` (enum `CollaboratorType`)
- `status` (enum `CollaboratorStatus`)
- `source` (enum `CollaboratorSource`)
- `managerId` nullable (self relation)
- `notes` nullable
- `isSynced` / ou dérivé de `source`
- `syncLockedFields` optionnel (JSON) si politique fine de verrouillage
- `archivedAt` nullable pour soft delete

## 5.2 Tags

Option recommandée :

- table `CollaboratorTag` (référentiel client-scopé) ;
- table de jointure `CollaboratorTagAssignment`.

Contraintes :

- index sur `(clientId, status)`, `(clientId, managerId)`, `(clientId, source)`.
- unicité métier éventuelle `(clientId, email)` si règle validée.

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

## 6.3 Tests frontend

- formulaire création/édition (states loading/error/success) ;
- affichage labels métier dans selects/table/badges ;
- absence d’ID brut visible dans UI ;
- filtre manager/tag avec label visible ;
- blocage champs verrouillés pour collaborateur synchronisé.

## 6.4 Scénarios critiques

- un utilisateur multi-client ne voit que les collaborateurs du client actif ;
- un manager d’un autre client est refusé ;
- un collaborateur synchronisé conserve ses tags/notes locaux ;
- aucune colonne UI n’affiche un UUID comme valeur utilisateur.

---

# 7. Récapitulatif final

`RFC-TEAM-002` définit le référentiel métier central des collaborateurs et transforme le socle de sync (`RFC-TEAM-001`) en base exploitable pour staffing, compétences et pilotage manager.

Livrables attendus :

- API CRUD collaborateur client-scopée ;
- règles métiers sync vs manuel ;
- tags/notes/statuts managés ;
- audit/RBAC systématiques ;
- UI conforme à la règle Starium : valeurs métier affichées, jamais IDs bruts.

---

# 8. Points de vigilance

- éviter les conflits de vérité entre annuaire et édition locale (règles de verrouillage explicites) ;
- ne jamais permettre une relation manager inter-client ;
- garantir la compatibilité avec les prochains lots TEAM-003 à TEAM-009 ;
- contrôler le coût des requêtes liste (pagination + index) ;
- maintenir des labels complets dans les DTOs pour éviter les régressions UI "ID visible".
