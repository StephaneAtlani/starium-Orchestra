# Profils par défaut (rôles)

Documentation des **rôles prédéfinis** appliqués automatiquement à chaque client.

---

## 1. Objectif

Chaque client dispose, sans action manuelle, d’un **catalogue de rôles métier** prêts à l’emploi, avec des jeux de permissions cohérents. Un CLIENT_ADMIN peut ensuite assigner ces rôles (ou des rôles personnalisés) aux utilisateurs du client.

Les profils par défaut sont :

- **appliqués à la création d’un nouveau client** (POST /api/clients)
- **appliqués à tous les clients existants** lors du seed (`pnpm prisma:seed`)

Référence RBAC : [RFC-011 — Rôles, permissions et modules](RFC/RFC-011-roles-permissions-modules.md).

---

## 2. Catalogue des profils

Le catalogue est défini dans **`apps/api/prisma/default-profiles.json`**. Chaque entrée décrit un rôle (nom, description, liste de codes de permissions).

| Profil | Description | Permissions principales |
|--------|-------------|--------------------------|
| **Directeur** | Visualisation budget et reporting (lecture seule) | `budgets.read` |
| **Responsable Budgets** | Pilotage complet des budgets | `budgets.read`, `budgets.create`, `budgets.update` + cost-centers, general-ledger-accounts, analytical-ledger-accounts (read/create/update) |
| **Contributeur Budgets** | Saisie et consultation | `budgets.read`, `budgets.create` + lecture des référentiels (cost-centers, general-ledger-accounts, analytical-ledger-accounts) |

Détail des permissions par profil :

- **Directeur** : dashboard budgets, listes exercices/budgets/enveloppes/lignes, reporting, historique versions (tout en GET). Aucune création ni modification.
- **Responsable Budgets** : tout ce qui précède + création/modification des budgets, lignes, enveloppes, réallocations, versions, imports, et gestion des centres de coûts, plans comptables et comptes analytiques.
- **Contributeur Budgets** : lecture complète + création de budgets/lignes/enveloppes ; pas de modification des référentiels ni de réallocations/versions.

---

## 3. Comportement technique

### 3.1 Quand sont-ils appliqués ?

1. **Création d’un client**  
   Après `Client` créé, le backend appelle `DefaultProfilesService.applyForClient(clientId)`. Les rôles sont créés immédiatement pour ce client.

2. **Seed**  
   Après `upsertModulesAndPermissions()`, le script `prisma/seed.js` lit `prisma/default-profiles.json`, récupère tous les clients, et pour chaque client applique le même catalogue (création ou mise à jour des rôles et de leurs permissions).

### 3.2 Idempotence

- Un rôle est identifié par `(clientId, name)`. S’il existe déjà, il n’est pas dupliqué ; ses **permissions sont mises à jour** selon le catalogue (suppression des anciennes RolePermission, création des nouvelles). On peut donc relancer le seed ou réappliquer le catalogue sans incohérence.
- Les rôles créés par ce mécanisme ont **`isSystem: true`** : ils ne peuvent pas être supprimés via l’API (DELETE /api/roles/:id → 409 si isSystem). Le nom et la description restent modifiables via PATCH si besoin.

### 3.3 Emplacement et format du catalogue

- **Fichier** : `apps/api/prisma/default-profiles.json`
- **Format** : tableau JSON d’objets `{ "name", "description", "permissionCodes" }`.
- Les **codes de permission** doivent exister dans la table `Permission` (créés par le seed des modules/permissions). Toute permission inconnue est ignorée (aucune RolePermission ne sera créée pour ce code).

Exemple d’entrée :

```json
{
  "name": "Directeur",
  "description": "Visualisation budget et reporting (lecture seule)",
  "permissionCodes": ["budgets.read"]
}
```

---

## 4. Modifier le catalogue

1. Éditer **`apps/api/prisma/default-profiles.json`** : ajouter/supprimer un profil ou modifier `name`, `description` ou `permissionCodes`.
2. **Nouveaux clients** : ils recevront automatiquement le catalogue à jour à la création.
3. **Clients existants** : relancer le seed depuis `apps/api` :
   ```bash
   pnpm prisma:seed
   ```
   Les rôles existants avec le même `name` auront leurs permissions mises à jour ; les nouveaux profils du catalogue seront créés pour tous les clients.

Les codes de permission possibles sont ceux du référentiel plateforme (ex. `budgets.read`, `budgets.create`, `budgets.update`, `budgets.cost-centers.read`, etc.). Voir le seed des modules/permissions et [docs/API.md](API.md) § Permissions.

---

## 5. Implémentation backend

- **Service** : `apps/api/src/modules/roles/default-profiles.service.ts`
  - `getProfilesDefinition()` : charge et parse le JSON.
  - `applyForClient(clientId)` : pour chaque profil du catalogue, trouve ou crée le `Role`, puis remplace ses `RolePermission` par celles correspondant aux `permissionCodes`.
- **Intégration** :
  - `ClientsService.create()` appelle `defaultProfiles.applyForClient(client.id)` après la création du client.
  - Le seed appelle une logique équivalente (en JS) dans `prisma/seed.js` après `upsertModulesAndPermissions()`.
- **Module** : `RolesModule` fournit et exporte `DefaultProfilesService` ; `ClientsModule` importe `RolesModule` pour l’injection.

---

## 6. Références

- [RFC-011 — Rôles, permissions et accès modules](RFC/RFC-011-roles-permissions-modules.md)
- [API.md — Rôles et permissions](API.md) (§ 9 et § 10)
- [ARCHITECTURE.md](ARCHITECTURE.md) — Seed et bootstrap
