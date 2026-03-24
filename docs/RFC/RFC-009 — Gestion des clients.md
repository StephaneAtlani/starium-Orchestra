```md
# RFC-009 — Gestion des clients

## Statut
Implémenté

## Référence
US-009

## Titre
Gestion des clients

---

# 1. User Story

En tant qu’administrateur plateforme  
je veux gérer les clients de la plateforme  
afin de créer et administrer les organisations utilisatrices.

---

# 2. Objectif

Mettre en place le module permettant de gérer les **clients (organisations)** de la plateforme.

Un client représente :

- une entreprise
- une organisation
- une entité utilisant Starium Orchestra

Ce module permet :

- de créer un client
- de modifier un client
- de consulter les clients
- de supprimer un client

La gestion des clients est **réservée aux administrateurs plateforme**.

---

# 3. Contexte architecture

Dans Starium Orchestra :

- un **client représente une organisation**
- un **utilisateur peut appartenir à plusieurs clients**
- la relation est portée par **ClientUser**

Structure :

```

User
Client
ClientUser

```

Relation :

```

User
↓
ClientUser
↓
Client

```

---

# 4. Périmètre

## Inclus

- création d’un client (sans gestion directe de l’administrateur du client ; le rattachement des utilisateurs est géré dans les RFC utilisateurs / rattachements)
- modification d’un client
- consultation des clients (liste complète, sans pagination)
- suppression physique d’un client (et des ClientUser liés, jamais des User)

## Exclus

- gestion des utilisateurs du client
- sélection du client actif
- gestion avancée des rôles
- gestion des permissions

Ces fonctionnalités sont traitées dans :

- RFC-008 Gestion des utilisateurs
- RFC-010 Sélection du client actif

---

# 5. Endpoints API

## Liste des clients

### GET /clients

Retourne **tous** les clients, **sans pagination**, **sans filtre**, triés par **`createdAt` desc**.

Réponse : tableau d’objets (ex. `id`, `name`, `slug`, `createdAt`).

```json
[
  {
    "id": "client_001",
    "name": "Client démo",
    "slug": "demo",
    "createdAt": "2026-03-08T10:00:00Z"
  }
]
```

---

## Création client

### POST /clients

Permet de créer un nouveau client.  
Cette route **ne gère plus** la création ou le rattachement de l’administrateur du client : elle se contente de créer l’entité `Client`.  
Le **Platform Admin** utilise ensuite les endpoints appropriés pour rattacher des utilisateurs (`/api/platform/users`, `/api/clients/:clientId/users`, `/api/users` côté client actif).

Payload :

```json
{
  "name": "Entreprise ABC",
  "slug": "entreprise-abc"
}
```

Règles :

- `slug` doit être **unique** (vérification explicite avant création ; en cas de collision → **409 Conflict** avec message métier clair).

Réponse **strictement** : `{ id, name, slug }` (201).

```json
{
  "id": "client_002",
  "name": "Entreprise ABC",
  "slug": "entreprise-abc"
}
```

### Règles métier (création)

Flux simplifié :

1. Vérifier explicitement l’unicité du `slug` (recherche par `Client.slug`).  
   - Si un client existe déjà avec ce `slug` → **ConflictException (409)**.
2. Créer le **Client** avec `{ name, slug }`.  
3. Ne pas créer de `User` ni de `ClientUser` ici : le rattachement des utilisateurs au client est géré par les flux dédiés (RFC-008 et endpoints `/api/platform/users`, `/api/clients/:clientId/users`, `/api/users`).
4. Initialiser automatiquement les rôles système du client :
   - `Chef de projet`
   - `Contributeur Budgets`
   - `Directeur`
   - `Gestionnaire Procurement`
   - `Responsable Budgets`
   - `Resource Manager`
   - `Resource Viewer`

---

## Modification client

### PATCH /clients/:id

Permet de modifier :

* name
* slug

Payload :

```json
{
  "name": "Entreprise ABC Groupe",
  "slug": "abc-groupe"
}
```

Réponse **strictement** : `{ id, name, slug }`. Si `slug` est fourni, vérifier l’unicité (autre client uniquement) ; 409 si le slug est déjà utilisé par un autre client.

```json
{
  "id": "client_002",
  "name": "Entreprise ABC Groupe",
  "slug": "abc-groupe"
}
```

---

## Suppression client

### DELETE /clients/:id

**Suppression physique** du client. Les **ClientUser** liés sont supprimés (cascade). Les **User** ne sont **jamais** supprimés. Pas de soft delete.

Réponse : **204 No Content**.

---

# 6. Règles métier

## Création client

- La création d’un client est **indépendante** de la gestion de ses administrateurs.  
- Aucun `User` ni `ClientUser` n’est créé dans `POST /clients`.  
- Le **Platform Admin** (auteur de la requête) **ne devient jamais** automatiquement CLIENT_ADMIN du client créé.  
- Conflit slug : vérification explicite avant création → **ConflictException (409)** avec message métier clair.
- Les rôles système ci-dessous sont créés automatiquement à chaque création client (`isSystem = true`) :
  - `Chef de projet`
  - `Contributeur Budgets`
  - `Directeur`
  - `Gestionnaire Procurement`
  - `Responsable Budgets`
  - `Resource Manager`
  - `Resource Viewer`

---

## Slug unique

Le slug doit être unique.

Exemple :

```
demo
entreprise-abc
client-bordeaux
```

Contrainte :

```
Client.slug UNIQUE
```

---

## Suppression client

- **Suppression physique** : supprimer le **Client** (Prisma supprime en cascade les **ClientUser** associés).
- **Ne jamais supprimer** les **User** globaux.
- Pas de soft delete.

---

# 7. Modèle de données

**Platform Admin** : le modèle `User` comporte `platformRole PlatformRole?`.  
Seule la valeur `platformRole = PLATFORM_ADMIN` donne accès aux routes plateforme (`/api/clients`, `/api/platform/users`, `/api/clients/:clientId/users*`). Les autres utilisateurs ont `platformRole = null`.

## Client

```text
Client
- id (cuid)
- name
- slug (unique)
- createdAt
- updatedAt
```

---

## ClientUser

```text
ClientUser
- id
- userId
- clientId
- role
- status
- createdAt
- updatedAt
```

Contraintes :

```
unique(userId, clientId)
index(clientId)
index(userId)
```

---

# 8. Sécurité

## Accès

Toutes les routes `/clients` sont protégées par :

- **JwtAuthGuard**
- **PlatformAdminGuard**

**Platform Admin** : défini explicitement par `User.platformRole === 'PLATFORM_ADMIN'` (champ nullable sur le modèle User). Aucun rôle client n’est mis dans le JWT.  
En dev, `platformRole = PLATFORM_ADMIN` est mis **uniquement** sur l’utilisateur seed pour tester les routes plateforme.

---

# 9. Structure backend

```
apps/api/src
  modules
    clients
      clients.module.ts
      clients.controller.ts
      clients.service.ts
      dto
        create-client.dto.ts
        update-client.dto.ts
```

---

# 10. DTO

## create-client.dto.ts

- `name: string`, `slug: string` — `@IsString()`, `@IsNotEmpty()`
- aucun champ lié à un utilisateur (`adminEmail`, `adminPassword`, etc.) : la gestion des utilisateurs / admins se fait dans les modules dédiés.

## update-client.dto.ts

- `name?: string`, `slug?: string` — `@IsString()`, `@IsOptional()`

---

# 11. Flux technique

Création client :

```
POST /clients
↓
JwtAuthGuard
↓
PlatformAdminGuard
↓
ClientsService.create(dto)
↓
  1. Vérifier l’unicité du slug
  2. Client.create (name, slug)
  3. Bootstrap rôles système (7 rôles)
↓
Retour { id, name, slug }
```

---

# 12. Checklist développement

Backend :

* [x] créer module clients (imports: AuthModule, PrismaModule)
* [x] créer DTO create-client (name, slug uniquement)
* [x] créer DTO update-client (name?, slug?)
* [x] implémenter GET /clients (tous, sans pagination, tri createdAt desc)
* [x] implémenter POST /clients (création simple du Client, réponse { id, name, slug })
* [x] implémenter PATCH /clients/:id (unicité slug autre client, réponse { id, name, slug })
* [x] implémenter DELETE /clients/:id (204, suppression physique Client + cascade ClientUser)

Sécurité :

* [x] JwtAuthGuard + PlatformAdminGuard sur toutes les routes
* [x] Platform Admin : `User.platformRole === 'PLATFORM_ADMIN'`

Données :

* [x] slug unique (vérification explicite avant création)
* [x] gestion des administrateurs / utilisateurs portée par les modules et RFC dédiés (RFC-008, endpoints `/api/platform/users`, `/api/clients/:clientId/users`, `/api/users`)

---

# 13. Tests

Tests à couvrir :

* création client simple (Client créé, sans création ni rattachement d’utilisateur)
* slug unique (ConflictException sur tentative de création avec slug déjà utilisé)
* modification client (409 si slug pris par un autre client)
* suppression client (Client + ClientUser supprimés, User jamais supprimés)
* refus utilisateur non Platform Admin

---

# 14. Critères d’acceptation

La fonctionnalité est validée lorsque :

* un Platform Admin peut créer un client (entité Client seule, sans logique d’admin implicite)
* la création du client initialise automatiquement les 7 rôles système (`Chef de projet`, `Contributeur Budgets`, `Directeur`, `Gestionnaire Procurement`, `Responsable Budgets`, `Resource Manager`, `Resource Viewer`)
* un client possède un slug unique
* POST et PATCH retournent strictement { id, name, slug }
* un Platform Admin peut modifier un client (409 si slug pris par un autre client)
* un Platform Admin peut supprimer un client (suppression physique ; ClientUser en cascade ; User jamais supprimés)

---

# 15. Priorité

Haute

La gestion des clients est nécessaire pour :

* permettre le multi-tenant
* créer les organisations
* rattacher les utilisateurs

---

# 16. Dépendances

RFC dépend de :

* RFC-002 — Authentification
* RFC-008 — Gestion des utilisateurs
* RFC-010 — Client actif

---

```

---

## Mon retour d’architecte SaaS (important)

Pour **Starium Orchestra**, la logique correcte est :

```

Platform Admin
│
▼
Client
│
▼
ClientUser
│
▼
Users

```
