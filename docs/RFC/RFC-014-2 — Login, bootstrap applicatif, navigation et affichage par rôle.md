# RFC-014-2 — Login, bootstrap applicatif, navigation et affichage par rôle

## Statut

Draft

## Complète

* RFC-002 — Authentification utilisateur
* RFC-010 — Sélection du client actif
* RFC-014-1 — UX/UI & Design System
* FRONTEND_ARCHITECTURE.md

---

# 1. Objectif

Définir le fonctionnement complet de l’**entrée dans l’application après connexion**, afin que :

* tout utilisateur puisse se connecter quel que soit son rôle
* l’application charge automatiquement son **profil**, ses **clients accessibles** et son **contexte initial**
* la **sidebar**, les **menus**, les **routes visibles** et les **données chargées** s’adaptent au rôle et au scope
* le comportement soit cohérent pour :

  * un utilisateur mono-client
  * un utilisateur multi-clients
  * un `PLATFORM_ADMIN`

Cette RFC couvre :

* la page `/login`
* le bootstrap de session frontend
* la sélection initiale du client actif
* les règles de redirection après login
* l’adaptation de la navigation
* l’affichage des données selon le rôle et le scope

---

# 2. Contexte

Starium Orchestra est un **cockpit SaaS multi-client et multi-tenant**, avec :

* un frontend unique basé sur **App Shell**
* une séparation entre :

  * routes publiques
  * routes protégées plateforme
  * routes protégées métier client
* une logique métier et de sécurité portée par le backend

Le frontend actuel existe déjà.
Cette RFC ne vise donc pas à créer le cockpit, mais à **brancher correctement l’authentification et le contexte utilisateur sur ce cockpit existant**.

---

# 3. Périmètre

## Inclus

* page `/login`
* login frontend
* bootstrap post-login
* récupération de `GET /me`
* récupération de `GET /me/clients`
* détermination du client actif initial
* redirection vers la bonne zone
* adaptation de la sidebar et des menus
* comportement selon :

  * `PLATFORM_ADMIN`
  * `CLIENT_ADMIN`
  * `CLIENT_USER`

## Exclus

* SSO
* MFA
* mot de passe oublié
* invitation utilisateur
* vue globale multi-clients
* gestion fine des permissions métier écran par écran
* refonte visuelle du shell déjà couverte par RFC-014-1

---

# 4. État existant à conserver

Le frontend dispose déjà :

* d’un **App Shell**
* d’un **ProtectedLayout**
* d’un **ActiveClientProvider**
* d’un **QueryProvider**
* d’un `api-client`
* d’une structure pages/features cohérente avec `FRONTEND_ARCHITECTURE.md` 

Cette RFC doit donc :

* **réutiliser** ces briques
* les compléter si nécessaire
* ne pas recréer un second système parallèle

---

# 5. Principes d’architecture

## 5.1 Login public, cockpit protégé

Le routing frontend doit respecter :

* `/login`, `/logout` = public
* `/admin/*` = protégé plateforme
* `/dashboard`, `/budgets`, `/projects`, etc. = protégé client 

## 5.2 Shell unique

Une fois connecté, l’utilisateur entre dans le **même App Shell** :

* sidebar
* workspace header
* workspace content

Aucune variante de shell selon le rôle.

## 5.3 Client actif hors JWT

Le JWT porte l’identité.
Le client actif reste dynamique et transite via :

```text
X-Client-Id
```

Il n’est jamais stocké dans le JWT. 

## 5.4 Deux scopes frontend

Le frontend distingue :

* **scope plateforme** : `/admin/*`
* **scope client** : `/dashboard`, `/budgets`, `/projects`, etc. 

---

# 6. Contrats de données nécessaires

## 6.1 Endpoints utilisés

Le frontend s’appuie sur :

* `POST /api/auth/login`
* `POST /api/auth/refresh`
* `POST /api/auth/logout`
* `GET /api/me`
* `GET /api/me/clients`

## 6.2 Gap à corriger

Le frontend doit connaître `platformRole` pour afficher la navigation plateforme.

Or `GET /api/me` tel que documenté ne renvoie aujourd’hui que :

* `id`
* `email`
* `firstName`
* `lastName`

## 6.3 Décision RFC

Étendre `GET /api/me` pour renvoyer aussi :

```json
{
  "id": "usr_001",
  "email": "user@example.com",
  "firstName": "Jean",
  "lastName": "Dupont",
  "platformRole": "PLATFORM_ADMIN"
}
```

ou :

```json
"platformRole": null
```

Cette évolution est nécessaire pour piloter correctement :

* la sidebar
* les redirections
* l’accès visuel au scope plateforme

---

# 7. Flux de connexion

## 7.1 Route

```text
/login
```

Page publique, intégrée au design system applicatif.

## 7.2 Soumission

Le frontend appelle :

```text
POST /api/auth/login
```

avec :

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

Réponse attendue :

```json
{
  "accessToken": "...",
  "refreshToken": "..."
}
```



## 7.3 Bootstrap post-login

Après succès, le frontend exécute :

```text
1. GET /api/me
2. GET /api/me/clients
3. filtrer les clients ACTIVE
4. déterminer le client actif initial
5. hydrater AuthProvider + ActiveClientProvider
6. rediriger vers la bonne zone
```

---

# 8. Détermination du client actif initial

## 8.1 Règle générale

Le frontend ne considère comme clients valides que ceux avec :

```text
status = ACTIVE
```

`SUSPENDED` et `INVITED` ne sont pas sélectionnables. 

## 8.2 Cas 1 — un seul client actif

Si un seul client `ACTIVE` existe :

* il devient automatiquement le client actif
* il est stocké localement
* redirection vers `/dashboard`

## 8.3 Cas 2 — plusieurs clients actifs

Si plusieurs clients `ACTIVE` existent :

* le frontend tente de restaurer le dernier client actif stocké localement
* s’il est toujours valide, il est repris
* sinon, l’utilisateur doit choisir son client

## 8.4 Cas 3 — aucun client actif

Si aucun client `ACTIVE` n’existe :

* si `platformRole === PLATFORM_ADMIN` → redirection `/admin/clients`
* sinon → écran bloquant “Aucun client actif disponible”

---

# 9. Redirection après login

## 9.1 Utilisateur non plateforme

Si `platformRole === null` :

* un client actif valide trouvé → `/dashboard`
* aucun client actif valide → `/select-client` ou écran bloquant selon le cas

## 9.2 Platform Admin

Si `platformRole === PLATFORM_ADMIN` :

* client actif valide trouvé → `/dashboard`
* aucun client actif valide → `/admin/clients`

## 9.3 Décision RFC

Pour le MVP :

* `/dashboard` reste la destination par défaut si un client actif existe
* `/admin/clients` devient la destination par défaut du `PLATFORM_ADMIN` sans client actif

---

# 10. Écran de sélection de client

## Décision

Quand plusieurs clients `ACTIVE` existent et qu’aucun dernier client actif valide ne peut être restauré, le frontend affiche un écran dédié :

```text
/select-client
```

## Rôle

Cet écran permet de :

* lister les clients `ACTIVE`
* en choisir un
* l’enregistrer dans le contexte local
* rediriger vers `/dashboard`

## Règle

Cette route est protégée, mais ne dépend pas encore d’un client actif.

---

# 11. AuthProvider

Créer ou finaliser un `AuthProvider` global.

## Contrat minimal

```ts
type AuthUser = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  platformRole: "PLATFORM_ADMIN" | null;
};

type AuthContextState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
};
```

## Source de vérité

Le frontend lit uniquement :

* `GET /api/me`
* `GET /api/me/clients`

et ne déduit jamais les rôles à partir d’heuristiques UI.

---

# 12. ActiveClientProvider

Le frontend réutilise l’existant.

## Responsabilités

* stocker le client actif
* exposer les clients disponibles
* restaurer le dernier client actif
* effacer le client actif s’il n’est plus valide
* injecter le contexte côté frontend

## Règle

Le provider ne doit jamais rendre un client `SUSPENDED` ou absent de `GET /api/me/clients` comme actif.

---

# 13. Sidebar et navigation par rôle

## 13.1 Principe

La sidebar est **déclarative** et générée depuis une configuration de navigation, conformément à l’architecture frontend. 

Le composant `Sidebar` ne doit pas embarquer la logique métier de navigation.

## 13.2 Structure recommandée

```ts
type NavigationItem = {
  key: string;
  label: string;
  href: string;
  scope: "platform" | "client";
  platformOnly?: boolean;
  clientAdminOnly?: boolean;
};
```

## 13.3 Menus visibles

### `CLIENT_USER`

Voit :

* dashboard
* modules métier accessibles

Ne voit pas :

* admin plateforme
* administration client structurelle

### `CLIENT_ADMIN`

Voit :

* dashboard
* modules métier
* administration client :

  * users
  * roles
  * permissions

### `PLATFORM_ADMIN`

Voit en plus :

* Admin Studio
* clients
* utilisateurs globaux
* audit global

---

# 14. Données visibles selon le rôle

## 14.1 Scope plateforme

Dans `/admin/*` :

* aucune dépendance au client actif
* aucun `X-Client-Id`
* données globales plateforme

## 14.2 Scope client

Dans `/dashboard`, `/budgets`, `/projects`, etc. :

* toutes les données dépendent du `client actif`
* toutes les requêtes portent `X-Client-Id`
* aucune donnée d’un autre client ne doit apparaître

## 14.3 Règle absolue

Le frontend adapte l’affichage, mais le backend reste la source de vérité pour l’accès réel.

---

# 15. Protected Layout

Le layout protégé existant doit être enrichi, pas recréé.

## Responsabilités

* attendre le bootstrap minimal de session
* rendre l’App Shell
* injecter les providers globaux

## Ordre recommandé

```tsx
<AppProvider>
  <AuthProvider>
    <ActiveClientProvider>
      <QueryProvider>{children}</QueryProvider>
    </ActiveClientProvider>
  </AuthProvider>
</AppProvider>
```

Cette structure est cohérente avec l’architecture frontend cible. 

---

# 16. Logout et expiration

## Logout volontaire

Le frontend appelle :

```text
POST /api/auth/logout
```

puis :

* vide la session
* efface le client actif local
* redirige vers `/login`

## Expiration

Si l’access token expire :

* tentative de refresh via `POST /api/auth/refresh`
* si échec :

  * purge de session
  * redirection `/login`



---

# 17. Critères d’acceptation

### AC1

Un utilisateur peut se connecter depuis `/login`.

### AC2

Après login, le frontend charge `GET /api/me` puis `GET /api/me/clients`.

### AC3

Le frontend détermine correctement le client actif initial.

### AC4

Un utilisateur avec un seul client `ACTIVE` arrive directement sur `/dashboard`.

### AC5

Un utilisateur avec plusieurs clients `ACTIVE` est redirigé vers `/select-client` si aucun contexte local valide n’existe.

### AC6

Un `PLATFORM_ADMIN` voit les entrées Admin Studio dans la sidebar.

### AC7

Un utilisateur non plateforme ne voit pas les entrées Admin Studio.

### AC8

Les routes `/admin/*` ne dépendent jamais du client actif.

### AC9

Les routes métier utilisent toujours `X-Client-Id`.

### AC10

Au logout ou après expiration non récupérable, l’utilisateur revient sur `/login`.

### AC11

`GET /api/me` expose `platformRole`.

---

# 18. Ordre d’implémentation

## Backend

1. étendre `GET /api/me` pour inclure `platformRole`
2. ne pas modifier `GET /api/me/clients`
3. ne pas modifier la logique auth existante

## Frontend

1. créer / finaliser `/login`
2. créer / finaliser `AuthProvider`
3. brancher bootstrap `GET /api/me` + `GET /api/me/clients`
4. brancher la logique de client actif initial
5. créer `/select-client`
6. filtrer la navigation selon `platformRole` et le contexte client
7. sécuriser les redirections dans le layout protégé

---

# 19. Résumé

Cette RFC fixe une règle simple :

> **tout utilisateur peut se connecter, mais ce qu’il voit ensuite dépend de son rôle global, de ses rattachements clients actifs et du client actif sélectionné.**

Elle garantit :

* une entrée unique dans l’application
* un bootstrap propre
* une sidebar adaptée
* un cockpit cohérent
* une séparation claire entre scope plateforme et scope client

---

# Documentation mise à jour

Après implémentation : **ARCHITECTURE.md** (§4.4 frontend), **API.md** (GET /me + platformRole), **FRONTEND_ARCHITECTURE.md** (§11 routes, §13 auth, §14–15 client/API, §17 navigation, §26 providers).
