# RFC-M365-001 — Connexion d’un compte Microsoft 365

## Statut

Draft

## Priorité

Haute

## Dépendances

* Core plateforme : authentification, utilisateurs, clients, rôles/permissions, audit logs
* Architecture Starium Orchestra : API-first, multi-client, multi-tenant, backend source de vérité
* Intégration Microsoft 365 / Graph comme brique de connectivité externe

---

# 1. Objectif

Permettre à un utilisateur autorisé de **connecter un compte Microsoft 365** à Starium Orchestra afin d’autoriser, côté client actif, l’accès futur aux services Microsoft nécessaires à la plateforme, notamment :

* Microsoft Graph
* Teams
* Planner
* fichiers Microsoft 365 / SharePoint / OneDrive
* annuaire Entra / utilisateurs / groupes
* futures synchronisations liées aux projets, équipes, documents ou référentiels

Cette RFC couvre **la connexion du compte Microsoft 365** et la gestion de son état dans Starium.
Elle **ne couvre pas** encore les usages métier détaillés qui consommeront cette connexion.

---

# 2. Problème adressé

Plusieurs modules de Starium ont vocation à exploiter Microsoft 365 :

* synchronisation de collaborateurs
* projection de projets dans Teams / Planner
* connexion documentaire
* lecture de groupes ou d’utilisateurs
* rapprochement d’objets métier avec Microsoft

Sans couche de connexion standardisée :

* chaque module risque d’implémenter son propre flux OAuth ;
* la sécurité devient hétérogène ;
* la révocation et l’état de connexion ne sont pas centralisés ;
* le scope client peut devenir flou ;
* le frontend ne sait pas clairement si un client est connecté ou non.

Il faut donc un **socle de connexion Microsoft 365 mutualisé**, propre au core de Starium.

---

# 3. Positionnement produit

Starium Orchestra est une plateforme de **gouvernance opérationnelle**, API-first, multi-client, multi-tenant, avec contrôle systématique de l’authentification, des permissions et de l’isolation client. Toute logique métier critique doit rester dans le backend. La fonctionnalité de connexion Microsoft 365 doit donc s’intégrer comme un **module de connectivité externe** réutilisable par plusieurs domaines métier, sans casser les règles produit existantes.

Cette RFC ne transforme pas Starium en outil collaboratif Microsoft natif.
Starium reste le **cockpit de pilotage** ; Microsoft 365 est une **source ou cible connectée**.

---

# 4. Périmètre

## Inclus

* configuration du flux OAuth Microsoft 365
* génération d’URL de connexion
* callback OAuth sécurisé
* enregistrement d’une connexion Microsoft par client
* stockage chiffré des tokens
* consultation de l’état de connexion
* révocation logique / déconnexion
* renouvellement transparent du token d’accès via refresh token
* audit logs
* UI d’administration client pour connecter / déconnecter Microsoft 365

## Exclus du MVP

* synchronisation métier Teams / Planner / fichiers
* lecture massive de données Microsoft
* multi-connexion Microsoft par client
* consentement admin complexe multi-tenant avancé
* fédération avec plusieurs providers externes dans la même RFC
* SSO de login utilisateur Starium via Microsoft
* provisioning inverse Starium → Microsoft

---

# 5. Cas d’usage

## 5.1 Connexion initiale d’un client

Un `CLIENT_ADMIN` ouvre la page d’administration du client actif et clique sur **Connecter Microsoft 365**.

## 5.2 Consultation de l’état

Le client voit :

* connecté / non connecté
* date de dernière connexion
* tenant Microsoft lié
* compte connecté
* état actif / révoqué / en erreur

## 5.3 Déconnexion

Le client admin révoque la connexion Microsoft d’un client.

## 5.4 Réutilisation par d’autres modules

Un module futur, par exemple `projects`, `team-directory` ou `documents`, consomme la connexion active via un service partagé sans réimplémenter OAuth.

---

# 6. Principes métier

## 6.1 Une connexion est rattachée à un client

La connexion Microsoft 365 appartient à un **client Starium** et non à un utilisateur individuel.

Le `clientId` est le scope métier principal.

## 6.2 Un utilisateur initie la connexion pour un client actif

Le flux de connexion est initié par un utilisateur authentifié, dans le contexte d’un client actif autorisé.

## 6.3 La connexion Microsoft est mutualisée

Une fois établie, elle devient la **connexion Microsoft active du client** pour les usages métier futurs.

## 6.4 Le backend reste la source de vérité

Le frontend ne fait que :

* déclencher la connexion
* afficher l’état
* afficher les erreurs

Le backend décide :

* de la validité du callback
* du scope client
* du stockage token
* du refresh
* de la révocation
* de l’état final de la connexion

## 6.5 Aucun secret ne sort du backend

Les tokens Microsoft :

* ne sont jamais exposés au frontend ;
* ne sont jamais retournés dans les réponses API ;
* sont stockés chiffrés ;
* ne sont jamais loggés.

---

# 7. Décisions MVP recommandées

Pour un MVP robuste :

* **une seule connexion Microsoft active par client**
* **connexion initiée uniquement par `CLIENT_ADMIN`**
* **stockage sécurisé des tokens côté backend**
* **refresh transparent côté backend uniquement**
* **déconnexion logique + révocation locale**
* **pas de multi-compte Microsoft par client dans cette RFC**
* **pas d’authentification Starium via Microsoft dans cette RFC**

---

# 8. Modèle de données proposé

## 8.1 MicrosoftConnection

```prisma
model MicrosoftConnection {
  id                       String   @id @default(cuid())
  clientId                 String
  status                   MicrosoftConnectionStatus
  provider                 MicrosoftProviderType @default(M365)
  microsoftTenantId        String?
  microsoftTenantName      String?
  microsoftUserId          String?
  microsoftUserEmail       String?
  microsoftUserDisplayName String?
  accessTokenEncrypted     String?
  refreshTokenEncrypted    String?
  accessTokenExpiresAt     DateTime?
  grantedScopes            String[]
  connectedAt              DateTime?
  revokedAt                DateTime?
  lastTokenRefreshAt       DateTime?
  lastSuccessfulSyncAt     DateTime?
  lastErrorCode            String?
  lastErrorMessage         String?
  createdByUserId          String?
  updatedByUserId          String?
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt

  client Client @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@unique([clientId])
  @@index([clientId, status])
}
```

## 8.2 MicrosoftOAuthState

État technique court pour sécuriser le callback.

```prisma
model MicrosoftOAuthState {
  id             String   @id @default(cuid())
  stateTokenHash String   @unique
  userId         String
  clientId       String
  redirectUri    String
  expiresAt      DateTime
  consumedAt     DateTime?
  createdAt      DateTime @default(now())

  @@index([clientId, userId])
  @@index([expiresAt])
}
```

## 8.3 Enums

```prisma
enum MicrosoftConnectionStatus {
  ACTIVE
  REVOKED
  FAILED
  EXPIRED
}

enum MicrosoftProviderType {
  M365
}
```

---

# 9. Données stockées

## À stocker

* `clientId`
* `status`
* `microsoftTenantId`
* `microsoftTenantName` si disponible
* `microsoftUserId`
* `microsoftUserEmail`
* `microsoftUserDisplayName`
* `grantedScopes`
* `accessTokenEncrypted`
* `refreshTokenEncrypted`
* `accessTokenExpiresAt`
* métadonnées d’audit / dates

## À ne jamais exposer

* `accessToken`
* `refreshToken`
* secrets OAuth
* données cryptographiques internes

---

# 10. Workflow fonctionnel

## 10.1 Déclenchement

1. l’utilisateur est connecté à Starium ;
2. il sélectionne un client actif ;
3. il ouvre l’administration Microsoft 365 ;
4. il clique sur **Connecter Microsoft 365** ;
5. le backend génère un `state` signé ou hashé, lié à :

   * `userId`
   * `clientId`
   * expiration courte ;
6. le backend retourne l’URL Microsoft d’autorisation.

## 10.2 Consentement Microsoft

L’utilisateur est redirigé vers Microsoft.

## 10.3 Callback

1. Microsoft redirige vers l’API de callback ;
2. le backend valide :

   * le `state`
   * la non-expiration
   * le non-réemploi
   * le scope client ;
3. le backend échange le `code` contre des tokens ;
4. le backend récupère les métadonnées minimales du tenant / compte ;
5. le backend crée ou met à jour la `MicrosoftConnection` du client ;
6. le backend marque le `state` comme consommé ;
7. audit log.

## 10.4 Usage ultérieur

Les services métier appellent un service partagé, par exemple :

* `MicrosoftOAuthService.ensureFreshAccessToken(connectionId, clientId)`
* ou équivalent

Le backend refresh le token si nécessaire.

## 10.5 Déconnexion

1. le client admin clique sur **Déconnecter** ;
2. le backend invalide localement la connexion ;
3. les tokens stockés sont supprimés ou neutralisés ;
4. la connexion passe en `REVOKED` ;
5. audit log.

---

# 11. Endpoints API proposés

## 11.1 Générer l’URL d’autorisation

### GET `/api/microsoft/auth/url`

### Guards

* `JwtAuthGuard`
* `ActiveClientGuard`
* `ModuleAccessGuard`
* `PermissionsGuard`

### Permission recommandée

* `projects.update` si le module Microsoft reste porté initialement par la sphère projet
* ou mieux à terme : `integrations.update`

### Headers

* `Authorization: Bearer <accessToken>`
* `X-Client-Id: <clientId>`

### Réponse 200

```json
{
  "authorizationUrl": "https://login.microsoftonline.com/..."
}
```

Règles :

* l’URL contient un `state` technique sécurisé ;
* aucun token Microsoft n’est généré à ce stade ;
* le `clientId` Microsoft applicatif ne vient jamais du frontend.

---

## 11.2 Callback OAuth

### GET `/api/microsoft/auth/callback`

### Guards

Aucun JWT direct exigé sur le callback lui-même, car le retour Microsoft se fait via `state`.

### Query params

* `code`
* `state`
* `error`
* `error_description`

### Comportement

* si `error` → callback en échec
* sinon échange du `code`
* validation stricte du `state`
* enregistrement de la connexion

### Réponse

Deux options possibles :

#### Option A — redirection frontend recommandée

Rediriger vers une route frontend du type :

```text
/client/administration/microsoft-365?status=success
```

ou

```text
/client/administration/microsoft-365?status=error
```

#### Option B — JSON technique

Possible uniquement si la stratégie frontend le justifie.

MVP recommandé : **redirection frontend**.

---

## 11.3 Lire la connexion active

### GET `/api/microsoft/connection`

### Guards

* `JwtAuthGuard`
* `ActiveClientGuard`
* `ModuleAccessGuard`
* `PermissionsGuard`

### Permission recommandée

* `projects.read`
* ou mieux à terme : `integrations.read`

### Réponse 200

```json
{
  "status": "ACTIVE",
  "provider": "M365",
  "microsoftTenantId": "tenant-id",
  "microsoftTenantName": "Contoso",
  "microsoftUserEmail": "admin@contoso.com",
  "microsoftUserDisplayName": "Admin Contoso",
  "grantedScopes": [
    "offline_access",
    "User.Read"
  ],
  "connectedAt": "2026-03-27T10:00:00.000Z",
  "revokedAt": null,
  "lastTokenRefreshAt": "2026-03-27T10:15:00.000Z"
}
```

### Réponse 404

Aucune connexion active ou connue pour ce client.

---

## 11.4 Révoquer la connexion

### DELETE `/api/microsoft/connection`

### Guards

* `JwtAuthGuard`
* `ActiveClientGuard`
* `ModuleAccessGuard`
* `PermissionsGuard`

### Permission recommandée

* `projects.update`
* ou mieux à terme : `integrations.update`

### Réponse 204

Déconnexion idempotente :

* si aucune connexion active → 204 aussi possible ;
* sinon mise à jour de l’état en `REVOKED`.

---

# 12. Scopes Microsoft recommandés pour le MVP

Scopes minimaux pour une connexion futurement réutilisable :

* `offline_access`
* `openid`
* `profile`
* `email`
* `User.Read`

Si tu veux préparer directement les futurs usages projet / Teams / Planner, tu peux prévoir ensuite une RFC d’extension de scopes, mais **je déconseille de surcharger le MVP**.

MVP recommandé :

* commencer avec **scopes minimums**
* élargir par RFC ultérieure selon les cas d’usage réels

---

# 13. Sécurité

## 13.1 State OAuth

Le `state` doit être :

* aléatoire
* lié au `userId`
* lié au `clientId`
* expirant rapidement
* à usage unique

## 13.2 Chiffrement des tokens

* `accessTokenEncrypted`
* `refreshTokenEncrypted`

Le chiffrement doit réutiliser un service crypto backend déjà conforme à tes conventions.

## 13.3 Secrets applicatifs

* stockés en variables d’environnement
* jamais en base
* jamais exposés au frontend
* jamais loggés

## 13.4 Callback sécurisé

* validation stricte de l’origin logique via le `state`
* prévention relecture / replay
* expiration courte
* consommation unique

## 13.5 Isolation client

Une connexion Microsoft est toujours :

* créée pour un seul `clientId`
* lue uniquement dans ce `clientId`
* utilisée uniquement dans ce `clientId`

---

# 14. Guards et permissions

Cette RFC doit respecter le pipeline standard Starium pour les routes métier :

* `JwtAuthGuard`
* `ActiveClientGuard`
* `ModuleAccessGuard`
* `PermissionsGuard`

Le callback OAuth constitue l’exception, car il ne peut pas dépendre du JWT frontend au retour Microsoft.

## Permissions proposées

### Option simple MVP

Réutiliser les permissions existantes du domaine projet :

* `projects.read`
* `projects.update`

### Option propre recommandée

Créer un module / sous-domaine `integrations` avec :

* `integrations.read`
* `integrations.update`

MVP rapide : réutilisation projet
MVP propre : permissions dédiées `integrations.*`

---

# 15. Audit logs

Actions à tracer :

* `microsoft_connection.authorization_url.generated`
* `microsoft_connection.connected`
* `microsoft_connection.connection_failed`
* `microsoft_connection.revoked`
* `microsoft_connection.token_refreshed`

Champs minimum :

* `clientId`
* `userId`
* `resourceType = microsoft_connection`
* `resourceId`
* résumé des scopes
* tenant lié
* statut avant / après

Ne jamais stocker les tokens dans les `oldValue` / `newValue`.

---

# 16. Structure backend recommandée

```text
apps/api/src/modules/microsoft/
├── microsoft.module.ts
├── microsoft-auth.controller.ts
├── microsoft-oauth-callback.controller.ts
├── microsoft-connection.controller.ts
├── microsoft-oauth.service.ts
├── microsoft-graph.service.ts
├── microsoft-token-http.service.ts
├── dto/
├── guards/
└── tests/
```

---

# 17. Structure frontend recommandée

```text
apps/web/src/app/(protected)/client/administration/microsoft-365/page.tsx
apps/web/src/features/microsoft/
├── api/
│   ├── get-microsoft-connection.ts
│   ├── get-microsoft-auth-url.ts
│   └── delete-microsoft-connection.ts
├── hooks/
│   ├── use-microsoft-connection-query.ts
│   ├── use-microsoft-auth-url-query.ts
│   └── use-revoke-microsoft-connection-mutation.ts
├── components/
│   ├── microsoft-connection-card.tsx
│   ├── microsoft-connection-status-badge.tsx
│   └── revoke-microsoft-connection-dialog.tsx
└── types/
    └── microsoft.types.ts
```

---

# 18. UX frontend

## Écran d’administration Microsoft 365

Afficher :

* statut de connexion
* compte Microsoft connecté
* tenant lié
* scopes accordés
* date de connexion
* date de dernière actualisation token
* bouton **Connecter**
* bouton **Déconnecter**

## États UI

* non connecté
* connecté
* connexion en cours
* erreur de callback
* connexion révoquée

## Règles UX

* le frontend n’exécute aucun échange de token ;
* il redirige simplement l’utilisateur vers `authorizationUrl` ;
* après callback, il recharge l’état via `GET /api/microsoft/connection`.

---

# 19. Règles de robustesse

* déconnexion idempotente
* callback idempotent autant que possible
* si refresh token invalide → statut `FAILED` ou `EXPIRED`
* si la connexion est cassée, les modules consommateurs doivent recevoir une erreur métier claire
* un module métier ne doit jamais manipuler directement les tokens stockés

---

# 20. Tests attendus

## Unit tests

* génération / validation du `state`
* échange `code -> token`
* chiffrement / déchiffrement token
* lecture connexion active
* révocation logique
* refresh token

## Integration tests

* génération URL avec client actif valide
* refus sans client actif
* refus sans permission
* callback succès
* callback state invalide
* callback state expiré
* callback state déjà consommé
* lecture état connexion
* delete idempotent
* isolation stricte inter-client

## Tests sécurité

* aucun token dans les réponses API
* aucun token dans les logs
* impossibilité de connecter un client A puis d’utiliser la connexion dans le client B

---

# 21. Ce que la RFC ne fait pas

Cette RFC ne couvre pas :

* le login Starium avec Microsoft
* le SSO utilisateur final
* Teams / Planner / documents
* la synchronisation des collaborateurs
* le provisioning d’équipes / canaux
* la gestion avancée des permissions Microsoft par usage métier

---

# 22. Critères d’acceptation

La RFC est implémentée lorsque :

* un utilisateur autorisé peut lancer la connexion Microsoft 365 depuis un client actif ;
* le callback Microsoft crée ou met à jour une connexion liée au client ;
* l’état de connexion est consultable ;
* la déconnexion fonctionne ;
* les tokens sont stockés côté backend uniquement ;
* les guards et l’isolation client sont respectés ;
* les actions sont auditées ;
* les futurs modules peuvent consommer un service partagé de connexion Microsoft sans réimplémenter OAuth.

---

# 23. Évolutions naturelles ensuite

* RFC-M365-002 — Service Graph mutualisé
* RFC-M365-003 — Synchronisation collaborateurs / groupes
* RFC-M365-004 — Connexion projet ↔ Teams / Planner
* RFC-M365-005 — Documents Microsoft 365
* RFC-M365-006 — SSO Microsoft pour authentification Starium
