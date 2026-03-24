# RFC-023 — Client RBAC Administration

## Statut

Draft

## Titre

**Administration des rôles et droits par le Client Admin**

## Dépendances

* RFC-002 — Authentification
* RFC-003 — Multi-client / client actif
* RFC-011 — Modules et activation par client
* RFC-012 — Permissions backend
* RFC-013 — Audit logs
* API actuelle `/api/roles`, `/api/permissions`, `/api/users/:id/roles`

---

# 1. Objectif

Permettre à un **Client Admin** de :

* créer des **rôles métier** dans son client
* associer des **permissions** à ces rôles
* affecter ces rôles à lui-même et aux autres utilisateurs de son client
* administrer les droits **sans jamais sortir du périmètre de son client actif**

Cette RFC formalise le fonctionnement RBAC côté client pour éviter :

* l’attribution manuelle et incohérente des droits
* le mélange entre rôle administratif client et permissions métier
* les écarts entre backend, frontend et règles de sécurité.

---

# 2. Problème adressé

Aujourd’hui, l’architecture prévoit déjà :

* un **Client Admin** pour administrer les utilisateurs du client actif
* des **rôles métier** côté client
* des **permissions** exposées par module
* l’assignation de rôles aux utilisateurs.【turn1file0】【turn1file3】【turn1file6】

Mais il faut cadrer clairement la logique fonctionnelle suivante :

* quels droits le Client Admin possède par défaut
* comment il se donne des droits métier à lui-même
* comment il crée des profils de droits pour ses utilisateurs
* comment empêcher qu’un Client Admin d’un client touche aux droits d’un autre client
* comment faire en sorte que seuls les modules activés puissent fournir des permissions assignables.【turn1file3】【turn1file12】

---

# 3. Principes d’architecture

## 3.1 Séparation stricte entre admin client et droits métier

Le rôle `CLIENT_ADMIN` donne un **pouvoir d’administration du client actif**, mais **n’implique pas automatiquement toutes les permissions métier**.
L’administration passe par `ClientAdminGuard`, tandis que l’accès métier passe par `PermissionsGuard`.【turn1file0】【turn1file12】

Conséquence :

* un Client Admin peut gérer les rôles et leurs affectations
* mais s’il doit utiliser le module Budget, Contrats, Projets, etc., il doit aussi recevoir les rôles métier adéquats.

## 3.2 Scope client obligatoire

Toutes les opérations sont exécutées dans le **client actif** via `X-Client-Id`.
Un Client Admin ne peut gérer que :

* les rôles de son client actif
* les utilisateurs rattachés à son client actif
* les permissions issues des modules activés pour son client actif.【turn1file0】【turn1file4】

## 3.3 Backend source de vérité

Le frontend peut masquer ou afficher des options, mais seul le backend décide :

* si l’utilisateur est `CLIENT_ADMIN`
* si le rôle appartient au client actif
* si la permission est autorisée pour le client actif
* si l’utilisateur ciblé appartient bien au client actif.【turn1file3】【turn1file7】

---

# 4. Périmètre

## Inclus

* création, lecture, modification, suppression de rôles métier du client actif
* consultation des permissions disponibles pour le client actif
* association permissions ↔ rôles
* association rôles ↔ utilisateurs
* possibilité pour le Client Admin de s’assigner des rôles métier
* audit des changements de droits

## Exclus

* gestion des modules plateforme
* création de permissions dynamiques
* hiérarchie de rôles
* héritage automatique entre rôles
* administration inter-clients
* délégation partielle d’administration RBAC avancée

---

# 5. Concepts métier

## 5.1 Client user

Lien entre un utilisateur global et un client, avec un rôle de rattachement tel que `CLIENT_ADMIN` ou `CLIENT_USER`.
Ce rattachement détermine l’accès au client actif.【turn1file1】【turn1file4】

## 5.2 Rôle métier

Objet RBAC propre à un client, par exemple :

* Responsable budgets
* Lecteur projets
* Gestionnaire contrats
* Auditeur SI

Le rôle métier est une **enveloppe de permissions**.

## 5.3 Permission

Droit atomique de type :

```text
<module>.<action>
```

Exemples :

* `budgets.read`
* `budgets.create`
* `budgets.update`

Les permissions disponibles ne sont assignables que si le module correspondant est actif globalement et activé pour le client.【turn1file0】【turn1file3】

---

# 6. Règles métier

## 6.1 Le Client Admin peut administrer le RBAC de son client

Un utilisateur ayant `CLIENT_ADMIN` sur le client actif peut :

* lister les rôles
* créer un rôle
* modifier un rôle
* supprimer un rôle non système et non assigné
* consulter les permissions disponibles
* remplacer les permissions d’un rôle
* remplacer les rôles d’un utilisateur du client actif.【turn1file0】【turn1file3】【turn1file6】

## 6.2 Le Client Admin peut s’attribuer des rôles métier

Le Client Admin peut s’assigner à lui-même un ou plusieurs rôles métier du client actif.

But :

* ne pas confondre administration client et usage métier
* garder un système cohérent avec `PermissionsGuard`

Exemple :

* Stéphane est `CLIENT_ADMIN`
* il s’assigne aussi le rôle `Responsable budgets`
* il obtient alors les permissions `budgets.read`, `budgets.create`, `budgets.update`

## 6.3 Les permissions assignables dépendent des modules activés

`GET /api/permissions` ne retourne que les permissions :

* dont le module est actif globalement
* et activé pour le client actif.【turn1file3】

Conséquence :

* impossible de créer un rôle avec des permissions d’un module désactivé
* si un module est désactivé plus tard, ses permissions ne doivent plus être assignables

## 6.4 Un rôle ne peut appartenir qu’à un seul client

Un rôle métier est strictement scoped au client actif.
Un rôle d’un client A ne peut jamais être affecté à un utilisateur du client B.

## 6.5 Les rôles système sont protégés

Si `isSystem = true` :

* impossible de supprimer le rôle
* les restrictions de modification peuvent être renforcées selon implémentation.【turn1file6】

## 6.6 Suppression d’un rôle

Suppression interdite si :

* `isSystem = true`
* le rôle est encore assigné à au moins un utilisateur.【turn1file6】

## 6.7 Affectation de rôles utilisateur

`PUT /api/users/:id/roles` remplace l’ensemble des rôles de l’utilisateur dans le client actif.
Tous les rôles fournis doivent appartenir au client actif ; sinon erreur 400.
L’utilisateur ciblé doit appartenir au client actif avec un rattachement actif ; sinon 404.【turn1file3】

---

# 7. Cas d’usage

## 7.1 Le Client Admin se donne ses propres droits métier

Exemple :

1. Le client active le module `budgets`
2. Le Client Admin crée le rôle `Administrateur budgets`
3. Il associe les permissions :

   * `budgets.read`
   * `budgets.create`
   * `budgets.update`
4. Il s’assigne ce rôle à lui-même via `PUT /api/users/:id/roles`

## 7.2 Le Client Admin crée un profil lecture seule

Exemple :

Rôle : `Lecteur budgets`

Permissions :

* `budgets.read`

Puis affectation à un collaborateur qui ne doit pas modifier les données.

## 7.3 Le Client Admin crée un profil métier transversal

Exemple :

Rôle : `Pilotage IT`

Permissions :

* `budgets.read`
* `projects.read`
* `contracts.read`
* `licenses.read`

Ce rôle n’est possible que si les modules correspondants sont activés pour le client.

---

# 8. API concernée

## 8.1 Gestion des rôles

### GET /api/roles

Liste les rôles métier du client actif.【turn1file6】

### POST /api/roles

Crée un rôle métier dans le client actif.【turn1file6】

### GET /api/roles/:id

Retourne le détail d’un rôle du client actif.【turn1file6】

### PATCH /api/roles/:id

Met à jour nom / description d’un rôle.【turn1file6】

### DELETE /api/roles/:id

Supprime un rôle si non système et non assigné.【turn1file6】

---

## 8.2 Permissions disponibles

### GET /api/permissions

Retourne les permissions autorisées pour le client actif, filtrées par modules activés.【turn1file3】

---

## 8.3 Permissions d’un rôle

### PUT /api/roles/:id/permissions

Remplace toutes les permissions d’un rôle du client actif.【turn1file3】

Body :

```json
{
  "permissionIds": [
    "perm_budgets_read",
    "perm_budgets_update"
  ]
}
```

---

## 8.4 Rôles d’un utilisateur

### GET /api/users/:id/roles

Liste les rôles d’un utilisateur dans le client actif.【turn1file3】

### PUT /api/users/:id/roles

Remplace l’ensemble des rôles métier d’un utilisateur dans le client actif.【turn1file3】

Body :

```json
{
  "roleIds": [
    "role_budgets_manager",
    "role_projects_viewer"
  ]
}
```

---

# 9. Guards et sécurité

Toutes les routes d’administration RBAC client utilisent :

```text
JwtAuthGuard
→ ActiveClientGuard
→ ClientAdminGuard
```

avec :

* `Authorization: Bearer <accessToken>`
* `X-Client-Id: <clientId>`【turn1file0】

Les routes métier consommatrices des permissions utilisent quant à elles :

```text
JwtAuthGuard
→ ActiveClientGuard
→ ModuleAccessGuard
→ PermissionsGuard
```

avec `@RequirePermissions('<module>.<action>')`.【turn1file0】【turn1file12】

---

# 10. Audit logs

Les actions suivantes doivent être auditées :

* `role.created`
* `role.updated`
* `role.deleted`
* `role.permissions.updated`
* `user.roles.updated`

Cette logique est cohérente avec la convention d’audit `<resource>.<action>` déjà posée dans le projet, et `user.roles.updated` est explicitement prévu dans les audits utilisateurs.【turn1file44】

Payload minimal recommandé :

```json
{
  "roleId": "role_xxx",
  "userId": "usr_xxx",
  "permissionIds": ["perm_a", "perm_b"],
  "roleIds": ["role_a", "role_b"]
}
```

---

# 11. Règles frontend

## 11.1 Navigation

Le frontend doit afficher l’administration RBAC uniquement si :

* `activeClient.role === CLIENT_ADMIN`

La navigation déclarative prévoit déjà `clientAdminOnly` pour filtrer les entrées visibles côté UI.【turn1file7】

## 11.2 Écrans à prévoir

Routes recommandées :

```text
/users
/roles
/roles/[id]
```

Écrans :

* liste des rôles
* formulaire de création / édition de rôle
* écran d’édition des permissions d’un rôle
* écran d’assignation des rôles d’un utilisateur
* vue “Mes rôles” optionnelle pour auto-administration

## 11.3 Règle UX

Le frontend ne doit jamais supposer qu’un bouton caché suffit comme sécurité.
Toutes les erreurs `401`, `403`, `404`, `409` doivent être gérées proprement.【turn1file7】

---

# 12. Données et modèle logique

Modèle logique existant :

* `ClientUser` = rattachement utilisateur ↔ client, avec `role` et `status`
* `Role` = rôle métier client
* `Permission` = permission atomique
* `RolePermission` = association rôle ↔ permission
* `UserRole` = association utilisateur ↔ rôle dans un client

Règle clé :

* `CLIENT_ADMIN` reste dans le rattachement client
* les droits métier restent dans les rôles métier

---

# 13. Critères d’acceptation

## Backend

* un Client Admin peut créer un rôle dans son client actif
* un Client Admin peut voir uniquement les permissions autorisées par les modules activés
* un Client Admin peut affecter des permissions à un rôle
* un Client Admin peut affecter des rôles à lui-même et aux autres utilisateurs du client actif
* un utilisateur non `CLIENT_ADMIN` reçoit 403 sur `/api/roles`, `/api/permissions`, `/api/users/:id/roles`
* impossible d’affecter un rôle d’un autre client
* impossible d’affecter une permission d’un module non activé
* toute modification de RBAC est auditée

## Frontend

* les écrans RBAC ne sont visibles que pour les Client Admin
* les listes et formulaires sont scoppés au client actif
* changement de client actif = invalidation du cache tenant-aware
* les erreurs backend sont correctement affichées

---

# 14. Décision fonctionnelle

À la création d’un client, le backend initialise automatiquement les rôles système (`isSystem = true`) suivants :

* `Chef de projet`
* `Contributeur Budgets`
* `Directeur`
* `Gestionnaire Procurement`
* `Responsable Budgets`
* `Resource Manager`
* `Resource Viewer`

Objectif :

* garantir un socle RBAC immédiatement opérationnel
* éviter toute intervention manuelle post-création pour disposer des rôles standards
* garder un comportement homogène entre environnements et entre clients

Précondition d’implémentation : les permissions globales référencées par ces rôles doivent exister dans le référentiel plateforme. En cas d’absence, la création client doit échouer explicitement (pas de création silencieuse de rôles système sans permissions).

---

# 15. Résumé

Cette RFC pose clairement que :

* **Client Admin** = administration du client actif
* **Rôles métier** = paquet de permissions
* **Permissions** = droits atomiques par module
* **Modules activés** = bornes fonctionnelles de ce qui peut être assigné
* **Backend** = autorité finale
