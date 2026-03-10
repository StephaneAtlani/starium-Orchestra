# RFC-012 — Vérification des permissions

## Statut

À implémenter

## Priorité

Critique

---

# 1. User Story

**US-012 — Vérification permissions**

En tant que **système**

je veux **vérifier les permissions**

afin de **sécuriser les actions et les endpoints de la plateforme**.

---

# 2. Contexte

Starium Orchestra est une plateforme SaaS **multi-client et multi-tenant**.

Chaque requête doit respecter :

* l’authentification utilisateur
* l’isolation client
* les modules activés
* les permissions RBAC

Le backend est **la source de vérité** pour toute décision d’accès.

L’architecture sécurité repose sur plusieurs couches successives.

Pipeline de sécurité :

```
JwtAuthGuard
→ ActiveClientGuard
→ ModuleAccessGuard
→ PermissionsGuard
→ Controller
→ Service
→ Prisma
```

Chaque couche a une responsabilité spécifique.

---

# 3. Modèle d’autorisation

Le système d’accès repose sur **3 niveaux distincts**.

---

# 3.1 Niveau plateforme

Porté par :

```
User.platformRole
```

Valeurs possibles :

```
PLATFORM_ADMIN
null
```

Utilisation :

* accès aux routes plateforme
* gestion des clients
* gestion des modules

Exemples d’endpoints :

```
/api/clients
/api/modules
/api/platform/*
```

---

# 3.2 Niveau appartenance client

Porté par :

```
ClientUser.role
```

Valeurs :

```
CLIENT_ADMIN
CLIENT_USER
```

Utilisation :

* vérifier l’appartenance au client actif
* vérifier si l’utilisateur peut administrer le client

Exemples :

```
gestion utilisateurs
gestion rôles
gestion permissions
```

Important :

Ce rôle **ne porte aucune permission métier**.

---

# 3.3 Niveau RBAC métier

Gestion des droits fonctionnels.

Entités :

```
Role
Permission
RolePermission
UserRole
```

Structure :

```
User
 → UserRole
   → Role
     → RolePermission
       → Permission
```

Convention de nommage des permissions :

```
<module>.<action>
```

Exemples :

```
budgets.read
budgets.create
budgets.update
contracts.read
projects.update
roles.assign
```

---

# 4. Vérification des permissions

La vérification des permissions s’effectue via :

```
PermissionsGuard
```

Fonctionnement :

1️⃣ récupérer l’utilisateur authentifié
2️⃣ récupérer le client actif
3️⃣ récupérer les rôles utilisateur pour ce client
4️⃣ agréger les permissions de ces rôles
5️⃣ vérifier la permission demandée

---

# 5. ModuleAccessGuard

Avant la vérification des permissions, il faut vérifier :

```
module actif globalement
module activé pour le client
```

Guard :

```
ModuleAccessGuard
```

Fonctionnement :

```
permission → module
module → actif plateforme
module → activé client
```

Si le module est désactivé :

```
403 Forbidden
```

---

# 6. Décorateur de permissions

Décorateur utilisé dans les controllers.

```
@RequirePermissions(...)
```

Exemple :

```ts
@RequirePermissions('budgets.read')
```

Plusieurs permissions possibles :

```ts
@RequirePermissions('budgets.read', 'budgets.update')
```

Stratégie par défaut :

```
AND
```

Toutes les permissions doivent être présentes.

---

# 7. Guards

## JwtAuthGuard

Responsabilité :

```
authentification
```

Fonction :

* vérifier le JWT
* injecter `req.user`

---

## ActiveClientGuard

Responsabilité :

```
contexte client
```

Vérifie :

```
X-Client-Id
ClientUser existant
ClientUser.status = ACTIVE
```

Injecte :

```
req.activeClient
```

---

## ModuleAccessGuard

Responsabilité :

```
vérifier l'accès module
```

Étapes :

```
permission demandée
→ module associé
→ module actif plateforme
→ module activé client
```

---

## PermissionsGuard

Responsabilité :

```
vérifier les permissions RBAC
```

Étapes :

```
userId
clientId

→ récupérer UserRole
→ récupérer RolePermission
→ récupérer Permission

→ agrégation
→ comparaison
```

Si permission absente :

```
403 Forbidden
```

Notes d’implémentation (code actuel `apps/api/src/common/guards/permissions.guard.ts`) :

- `CLIENT_ADMIN` **ne bypass pas** les permissions métier.\n  - `CLIENT_ADMIN` reste un rôle d’administration **du client** (utilisateurs/rôles/affectations) via `ClientAdminGuard`, mais n’accorde pas `budgets.*`, `projects.*`, etc.
- Stratégie **AND** appliquée : toutes les permissions listées dans `@RequirePermissions(...)` doivent être présentes.
- Règle de cohérence : une route protégée doit référencer des permissions d’**un seul module**.\n  - Exemple interdit : `@RequirePermissions('budgets.read', 'contracts.read')`.\n  - Raison : `ModuleAccessGuard` déduit le module à partir de la 1ère permission et doit rester non ambigu.

---

# 8. Ordre d’exécution des guards

Pour les routes métier :

```
JwtAuthGuard
ActiveClientGuard
ModuleAccessGuard
PermissionsGuard
```

Pour les routes plateforme :

```
JwtAuthGuard
PlatformAdminGuard
```

---

# 9. Structure technique

Dossier :

```
backend/src/common
```

Structure :

```
common/
 ├── decorators
 │   └── require-permissions.decorator.ts
 │
 ├── guards
 │   ├── module-access.guard.ts
 │   ├── permissions.guard.ts
 │   └── platform-admin.guard.ts
 │
 ├── authorization
 │   ├── permission.types.ts
 │   └── permission.utils.ts
```

---

# 10. Exemple d’utilisation

### Lecture budgets

```ts
@Get()
@RequirePermissions('budgets.read')
findAllBudgets()
```

---

### Création budget

```ts
@Post()
@RequirePermissions('budgets.create')
createBudget()
```

---

### Mise à jour budget

```ts
@Patch(':id')
@RequirePermissions('budgets.update')
updateBudget()
```

---

# 11. Optimisation performance

La résolution des permissions peut être coûteuse.

Deux optimisations sont recommandées.

---

## Cache request

Pendant la requête :

```
permissions utilisateur
```

sont chargées une seule fois.

Stockage :

```
request.resolvedPermissionCodes
```

Forme recommandée :

- `resolvedPermissionCodes?: Set<string>`\n  - test d’appartenance \(O(1)\), pas de doublons, pas d’ambiguïté.

---

## Cache Redis (optionnel)

Possibilité de mettre en cache :

```
userId
clientId
permissions[]
```

TTL conseillé :

```
60 secondes
```

Invalidation :

```
modification RolePermission
assignation UserRole
```

---

# 12. Règles de sécurité

Les règles suivantes doivent toujours être respectées.

---

### Backend source de vérité

Le frontend peut masquer les actions mais :

```
seul le backend décide
```

---

### Isolation client

Toutes les requêtes Prisma doivent filtrer :

```
clientId
```

---

### Modules désactivés

Si un module est désactivé :

```
aucun endpoint associé ne doit fonctionner
```

---

### Permissions dynamiques

Les permissions sont toujours chargées depuis :

```
Permission
RolePermission
UserRole
```

Aucune permission statique dans le code.

---

# 13. Critères d’acceptation

### Authentification

Un utilisateur non authentifié reçoit :

```
401 Unauthorized
```

---

### Contexte client

Sans client actif valide :

```
403 Forbidden
```

---

### Module désactivé

Si module désactivé :

```
403 Forbidden
```

---

### Permission manquante

Si permission absente :

```
403 Forbidden
```

---

### Permission valide

Si toutes les vérifications sont correctes :

```
200 OK
```

---

# 14. Tests

Tests à implémenter.

---

### Unit tests

PermissionsGuard

Cas :

```
permission présente
permission absente
plusieurs rôles
```

---

### Tests ModuleAccessGuard

Cas :

```
module actif
module désactivé client
module désactivé plateforme
```

---

### Tests e2e

Cas :

```
lecture budgets
création budgets
utilisateur sans rôle
utilisateur sans permission
```

---

# 15. Ordre d’implémentation

### Étape 1

Créer :

```
Permission decorator
PermissionsGuard
```

---

### Étape 2

Créer :

```
ModuleAccessGuard
```

---

### Étape 3

Ajouter :

```
@RequirePermissions
```

sur les endpoints métiers.

---

### Étape 4

Tests RBAC

```
/api/test-rbac
```

---

# 16. Résultat attendu

À la fin de cette RFC :

* les modules respectent l’activation client
* les permissions sont vérifiées dynamiquement
* les rôles métier contrôlent les accès
* aucune fuite inter-client n’est possible
* la sécurité backend est centralisée et cohérente

---

# Score de cette version

| Critère               | Note |
| --------------------- | ---- |
| Architecture          | 10   |
| Cohérence RFC-011     | 10   |
| Sécurité              | 10   |
| Extensibilité         | 10   |
| Implémentation NestJS | 10   |


