# RFC-014 — Admin Studio

## Statut

Draft

## Référence

US-014

## Titre

Admin Studio

---

## 1. User Story

En tant que **super administrateur**
je veux **administrer la plateforme**
afin de **gérer les clients, voir les utilisateurs globaux et consulter les audit logs**.

---

## 2. Objectif

Mettre en place le **MVP d’Admin Studio** dans Starium Orchestra.

Admin Studio est la zone du produit permettant au **Platform Admin** de :

* consulter les clients de la plateforme
* créer un client
* consulter les utilisateurs globaux
* consulter les audit logs globaux

Cette RFC couvre :

* le **backend API plateforme**
* le **frontend Admin Studio**
* la séparation explicite entre **backend** et **frontend**

Admin Studio fait partie du **core plateforme** prévu par la vision produit. 

---

## 3. Contexte architecture

Starium Orchestra est une plateforme :

* **API-first**
* **multi-client**
* **multi-tenant**
* **modulaire**

Le produit impose les règles suivantes :

1. les **platform admins** peuvent créer et gérer les clients
2. le frontend ne doit jamais porter de logique métier critique
3. la logique métier critique doit rester dans le backend
4. les données doivent être auditables 

Admin Studio est donc une **zone plateforme**, distincte des routes métier client-scopées.

---

## 4. Périmètre

### Inclus

* page frontend Admin Studio
* liste des clients
* création d’un client
* liste des utilisateurs globaux
* consultation des audit logs globaux
* sécurisation des routes plateforme
* intégration dans le shell frontend existant

### Exclus

* modification client
* suppression client
* création d’utilisateur global dans le MVP UI
* rattachement user ↔ client dans le MVP UI
* consultation des security logs
* vue globale métier multi-clients
* dashboards plateforme avancés

### Remarque

Des endpoints existent déjà pour certains usages hors MVP, mais ils ne sont pas intégrés à cette RFC tant qu’ils ne sont pas demandés dans l’US. 

---

## 5. Différenciation backend / frontend

### 5.1 Backend

Le backend est responsable de :

* exposer les endpoints
* appliquer les guards
* valider les DTOs
* implémenter les règles métier
* lire/écrire en base via Prisma
* journaliser les actions métier si nécessaire

### 5.2 Frontend

Le frontend est responsable de :

* afficher les pages Admin Studio
* appeler l’API
* gérer les états `loading / error / empty / success`
* afficher les tables, formulaires et messages
* intégrer Admin Studio dans le cockpit

### 5.3 Règle de gouvernance

* **Backend = décide et garantit**
* **Frontend = affiche et orchestre l’interaction**

C’est cohérent avec l’architecture projet et le document frontend actuel.

---

## 6. Architecture UI

Admin Studio **réutilise le layout applicatif existant**.
Il ne possède pas de layout parallèle.

Le modèle UI doit rester celui du frontend Starium :

```text
┌───────────────┬────────────────────────────────────┐
│ Logo          │ Header Workspace                   │
│ Sidebar       │ client actif / recherche / profil │
│ Navigation    ├────────────────────────────────────┤
│               │                                    │
│               │            Workspace               │
│               │                                    │
│               │                                    │
└───────────────┴────────────────────────────────────┘
```

Admin Studio est donc une **zone fonctionnelle du cockpit**, rendue dans le **workspace**, avec :

* la **sidebar persistante**
* le **header workspace**
* le **même App Shell**
* les mêmes conventions UI que le reste du produit 

### Conséquence

Aucun “back-office” séparé.
Aucune seconde application admin.
Aucune sidebar spécifique hors shell principal.

---

## 7. Navigation frontend

Conformément au frontend actuel, Admin Studio vit dans le scope plateforme, sous `/admin/*`. 

### Routes frontend

```text
/admin
/admin/clients
/admin/users
/admin/audit
```

### Règles

* ces routes sont visibles uniquement pour `PLATFORM_ADMIN`
* elles ne dépendent pas du client actif
* elles utilisent le même layout protégé que le reste du cockpit

### Règle UX

`/admin` peut rediriger vers `/admin/clients` dans le MVP.

---

## 8. Endpoints backend concernés

### 8.1 Déjà existants

#### Clients

* `GET /api/clients`
* `POST /api/clients`

#### Audit global

* `GET /api/platform/audit-logs`

### 8.2 À ajouter pour US-014

#### Utilisateurs globaux

* `GET /api/platform/users`

Cette route est nécessaire pour la page `/admin/users`.
Elle n’est pas encore documentée dans `API.md`, alors que `POST /api/platform/users` existe déjà. 

---

## 9. Sécurité backend

Toutes les routes Admin Studio sont des routes **plateforme**.

### Guards

```ts
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
```

### Règles

* `401` si non authentifié
* `403` si non `PLATFORM_ADMIN`

### Interdictions

Admin Studio :

* n’utilise pas `ActiveClientGuard`
* n’utilise pas `ClientAdminGuard`
* n’exige jamais `X-Client-Id`

C’est cohérent avec RFC-010, qui interdit `ActiveClientGuard` sur `/api/platform/*`. 

---

## 10. Backend — périmètre détaillé

## 10.1 Clients

Réutiliser le module clients existant.

### Endpoints

#### GET /api/clients

Liste tous les clients, triés par `createdAt desc`.

#### POST /api/clients

Crée un client simple avec :

```json
{
  "name": "Entreprise ABC",
  "slug": "entreprise-abc"
}
```

### Règles métier

* `slug` unique
* ne crée aucun utilisateur
* ne crée aucun rattachement `ClientUser`

Ces règles sont déjà définies dans RFC-009. 

---

## 10.2 Utilisateurs globaux

Ajouter un endpoint de lecture plateforme.

### Endpoint à créer

#### GET /api/platform/users

Retourne la liste des utilisateurs globaux.

### Réponse attendue

```json
[
  {
    "id": "usr_001",
    "email": "user@example.com",
    "firstName": "Jean",
    "lastName": "Dupont",
    "createdAt": "2026-03-08T10:00:00.000Z",
    "updatedAt": "2026-03-08T10:00:00.000Z",
    "platformRole": null
  }
]
```

### Règles

* ne jamais exposer `passwordHash`
* tri `createdAt desc`
* route réservée au `PLATFORM_ADMIN`

### Hors périmètre

* création utilisateur global via UI
* modification utilisateur global
* rattachement user ↔ client via UI

Même si `POST /api/platform/users` existe déjà côté API, ce n’est pas dans le MVP de cette RFC. 

---

## 10.3 Audit logs globaux

Réutiliser la route existante.

### Endpoint

#### GET /api/platform/audit-logs

Consultation des logs métier multi-clients pour le `PLATFORM_ADMIN`.

### Filtres supportés

* `clientId`
* `resourceType`
* `action`
* `userId`
* `dateFrom`
* `dateTo`
* `offset`
* `limit`

### Réponse

Même format que `/api/audit-logs`, mais sur plusieurs clients. 

---

## 11. Structure backend

### Décision

Ne pas créer un énorme module backend `admin-studio`.

### Raison

Les responsabilités existent déjà dans les modules fonctionnels :

* `clients`
* `audit-logs`
* `platform-users` ou `users` selon ton implémentation

Cela respecte mieux l’architecture modulaire du backend. 

### Dossiers backend concernés

```text
apps/api/src/modules/
├── clients/
├── audit-logs/
└── platform-users/   // à créer si tu veux isoler le scope plateforme users
```

### Option acceptable

Si tu ne veux pas créer `platform-users/`, tu peux étendre le module `users` avec une controller plateforme dédiée.

---

## 12. Frontend — périmètre détaillé

## 12.1 Page `/admin/clients`

### Objectif

Permettre au Platform Admin de :

* voir les clients
* créer un client

### Composition UI

* `PageHeader`
* bouton `Créer un client`
* table clients
* dialog de création

### Colonnes

* `name`
* `slug`
* `createdAt`

### APIs utilisées

* `GET /api/clients`
* `POST /api/clients`

---

## 12.2 Page `/admin/users`

### Objectif

Permettre au Platform Admin de voir les utilisateurs globaux.

### Composition UI

* `PageHeader`
* table utilisateurs

### Colonnes

* `email`
* `firstName`
* `lastName`
* `platformRole`
* `createdAt`

### API utilisée

* `GET /api/platform/users`

---

## 12.3 Page `/admin/audit`

### Objectif

Permettre au Platform Admin de consulter les audit logs globaux.

### Composition UI

* `PageHeader`
* toolbar filtres
* table audit logs
* pagination

### Colonnes

* `createdAt`
* `clientId`
* `userId`
* `action`
* `resourceType`
* `resourceId`

### Filtres

* `clientId`
* `action`
* `resourceType`
* `userId`
* `dateFrom`
* `dateTo`

### API utilisée

* `GET /api/platform/audit-logs`

---

## 13. Structure frontend

Conforme au `FRONTEND_ARCHITECTURE.md`, Admin Studio doit vivre dans `features/admin-studio` et dans `app/(protected)/admin/*`. 

### Structure recommandée

```text
apps/web/src/
├── app/
│   └── (protected)/
│       └── admin/
│           ├── page.tsx
│           ├── clients/page.tsx
│           ├── users/page.tsx
│           └── audit/page.tsx
│
├── features/
│   └── admin-studio/
│       ├── api/
│       │   ├── get-clients.ts
│       │   ├── create-client.ts
│       │   ├── get-platform-users.ts
│       │   └── get-platform-audit-logs.ts
│       ├── components/
│       │   ├── clients-table.tsx
│       │   ├── create-client-dialog.tsx
│       │   ├── platform-users-table.tsx
│       │   └── platform-audit-logs-table.tsx
│       ├── hooks/
│       │   ├── use-clients-query.ts
│       │   ├── use-create-client-mutation.ts
│       │   ├── use-platform-users-query.ts
│       │   └── use-platform-audit-logs-query.ts
│       └── types/
```

---

## 14. États UI obligatoires

Chaque page Admin Studio doit gérer :

* `loading`
* `error`
* `empty`
* `success`

Aucun écran vide sans feedback.
C’est déjà une règle du frontend actuel. 

---

## 15. Stratégie de données frontend

Utiliser :

* `TanStack Query`
* `queryKey` stables
* mutation + invalidation après création client

### Exemples

```ts
["admin-clients"]
["platform-users"]
["platform-audit-logs", filters, page, limit]
```

### Règle importante

Ces pages étant en **scope plateforme**, leurs `queryKey` ne dépendent pas du `clientId`.

---

## 16. Critères d’acceptation

### AC1

Un `PLATFORM_ADMIN` peut consulter la liste des clients.

### AC2

Un `PLATFORM_ADMIN` peut créer un client.

### AC3

Un `PLATFORM_ADMIN` peut consulter la liste des utilisateurs globaux.

### AC4

Un `PLATFORM_ADMIN` peut consulter les audit logs globaux.

### AC5

Un utilisateur non `PLATFORM_ADMIN` ne peut pas accéder aux routes Admin Studio.

### AC6

Les écrans Admin Studio utilisent le même App Shell que le reste du cockpit.

### AC7

Les écrans Admin Studio ne dépendent jamais du client actif.

---

## 17. Tests backend

### À couvrir

* `GET /api/clients` autorisé pour `PLATFORM_ADMIN`
* `POST /api/clients` autorisé pour `PLATFORM_ADMIN`
* `POST /api/clients` retourne `409` si slug déjà pris
* `GET /api/platform/users` autorisé pour `PLATFORM_ADMIN`
* `GET /api/platform/audit-logs` autorisé pour `PLATFORM_ADMIN`
* refus `403` pour utilisateur non `PLATFORM_ADMIN`

---

## 18. Tests frontend

### À couvrir

* affichage table clients
* création client avec refresh liste
* affichage table utilisateurs globaux
* affichage audit logs globaux
* affichage états `loading / empty / error`
* absence d’entrée Admin Studio si non `PLATFORM_ADMIN`

---

## 19. Ordre de développement recommandé

### Étape 1 — backend

* valider `GET /api/clients`
* valider `POST /api/clients`
* ajouter `GET /api/platform/users`
* valider `GET /api/platform/audit-logs`

### Étape 2 — frontend

* page `/admin/clients`
* page `/admin/users`
* page `/admin/audit`

### Étape 3 — finition

* guards frontend UX
* navigation
* tests
* doc `API.md`

---

## 20. Résumé

RFC-014 doit rester **simple, propre et strictement alignée sur les besoins déjà définis** :

* **Backend**

  * `GET /api/clients`
  * `POST /api/clients`
  * `GET /api/platform/users` à ajouter
  * `GET /api/platform/audit-logs`

* **Frontend**

  * `/admin/clients`
  * `/admin/users`
  * `/admin/audit`

* **UI**

  * intégrée au **même App Shell**
  * pas de layout parallèle
  * pas de dépendance au client actif
