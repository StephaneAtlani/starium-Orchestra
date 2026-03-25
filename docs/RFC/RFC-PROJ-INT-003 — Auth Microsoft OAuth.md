# RFC-PROJ-INT-003 — Auth Microsoft OAuth

## Statut

Implémenté (backend `apps/api/src/modules/microsoft/` ; API documentée dans [docs/API.md](../API.md) § intégration Microsoft).

## Priorité

Haute

## Dépend de

* [RFC-PROJ-INT-001](./RFC-PROJ-INT-001%20—%20Intégration%20Microsoft%20365.md) (cadrage)
* [RFC-PROJ-INT-002](./RFC-PROJ-INT-002%20—%20Prisma%20Schema%20Microsoft.md) (`MicrosoftConnection`, champs tokens)

## Objectif

Spécifier le flux **OAuth 2.0 délégué** (utilisateur / tenant Microsoft) pour obtenir et rafraîchir des jetons Microsoft Graph, en les stockant **uniquement côté backend** et en les associant au **client Starium actif** lors du consentement.

---

## 1. Analyse de l’existant

* L’auth Starium repose sur JWT interne ; l’intégration Microsoft est un **second flux** (Microsoft Identity Platform).
* Les identifiants d’application Azure peuvent être portés par **variables d’environnement** et/ou, pour un déploiement **multi-client (BYO)**, par champs sur **`Client`** exposés via `GET|PUT /api/clients/active/microsoft-oauth` — jamais de secret en clair côté navigateur en dehors des formulaires serveur-validés.

## 2. Hypothèses

* Mode **délégué** : `MicrosoftAuthMode.DELEGATED` dans [RFC-PROJ-INT-002](./RFC-PROJ-INT-002%20—%20Prisma%20Schema%20Microsoft.md).
* Les **scopes Graph** exacts sont listés dans une annexe de cette RFC à l’implémentation, avec principe du **moindre privilège** (Teams, Planner, fichiers selon endpoints retenus dans RFC Graph / ressources).

## 3. Fichiers à créer / modifier (indicatif)

* Module Nest dédié intégration Microsoft (service auth).
* Configuration via `ConfigService` (pas de secrets en dur).
* Chiffrement au repos des chaînes `accessTokenEncrypted` / `refreshTokenEncrypted` — réutiliser un pattern aligné sur les autres secrets applicatifs (ex. MFA) ou clé dédiée documentée en runbook.

**Réalisé :** `apps/api/src/modules/microsoft/` (services OAuth, crypto, JWKS `id_token`, HTTP token, mutex refresh, rate limit callback, contrôleurs) ; variables d’environnement listées dans `.env.example` ; dépendance **`jose`** pour la validation JWT Microsoft.

## 4. Flux fonctionnel

1. **Init** : l’utilisateur authentifié Starium demande à connecter Microsoft ; le backend génère une **URL d’autorisation** Microsoft avec `state` anti-CSRF lié à la session / utilisateur / client actif.
2. **Redirect** : l’utilisateur consent chez Microsoft.
3. **Callback** : échange `authorization_code` contre tokens ; persistance sur `MicrosoftConnection` pour le `clientId` concerné ; mise à jour `tokenExpiresAt`, `status`, `connectedByUserId` si pertinent.
4. **Refresh** : avant appels Graph, si token expiré, utiliser `refresh_token` ; en échec persistant, passer la connexion en statut adapté (`EXPIRED` / `ERROR`) sans casser les données projet.

## 5. Sécurité

* **Jamais** renvoyer access/refresh token au frontend.
* Valider le `state` au callback.
* HTTPS obligatoire pour redirect URI en production.
* Journaliser les erreurs d’auth sans loguer les tokens.

## 6. Tests attendus

* **Livré :** tests unitaires (`*.spec.ts` sous `apps/api/src/modules/microsoft/`) : store `jti`, mutex refresh, client HTTP token (mocks `fetch`), crypto, `getAuthorizationUrl`.
* **Optionnel / renfort :** test d’intégration bout-en-bout du callback avec mock du endpoint token Microsoft (non bloquant pour la définition de done actuelle).

## 7. Récapitulatif

* OAuth délégué, tokens **backend only**, associés au **client** Starium via `MicrosoftConnection`.

## 8. Implémentation (référence code)

* Module Nest : `apps/api/src/modules/microsoft/` (OAuth, chiffrement jetons, validation `id_token` via JWKS Microsoft, mutex refresh, store `jti` mémoire).
* Schéma : `MicrosoftConnection` ([RFC-PROJ-INT-002](./RFC-PROJ-INT-002%20—%20Prisma%20Schema%20Microsoft.md)).
* Audit : `microsoft_connection.connected`, `microsoft_connection.refreshed`, `microsoft_connection.error`, `microsoft_connection.revoked` (sans jetons ; inclure `clientId` / `tenantId` / `userId` quand pertinent).
* **Accès API** : `MicrosoftIntegrationAccessGuard` — **client admin** (`CLIENT_ADMIN`) sur le client actif **ou** module Projets activé + `projects.update` (même métadonnée `@RequirePermissions` que précédemment).
* **UX (web)** : paramétrage par client dans **Administration client** → `/client/administration` → carte **Microsoft 365** → `/client/administration/microsoft-365` (`apps/web/src/features/microsoft-365/`). Configurer `MICROSOFT_OAUTH_SUCCESS_URL` / `MICROSOFT_OAUTH_ERROR_URL` (ou champs équivalents en **config plateforme** `GET|PATCH /api/platform/microsoft-settings`) vers cette route (ou équivalent **HTTPS** en production) pour revenir sur Starium après le callback Microsoft. La page **`/admin/microsoft-settings`** (config OAuth **plateforme** uniquement) est réservée aux **PLATFORM_ADMIN** ; tout autre utilisateur authentifié y accédant est **redirigé** vers `/client/administration/microsoft-365`. Préremplissage UI par défaut des URL succès/erreur (si vides) : chemin client ci-dessus sur l’hôte local de dev.

## 9. Lifecycle de la connexion Microsoft

1. **Init** (`GET /api/microsoft/auth/url`) : JWT `state` signé (claims `sub` = user Starium, `cid` = client actif, `jti` UUID) + enregistrement du `jti` en store TTL (~10 min, usage unique au callback).
2. **Consentement** : redirect utilisateur vers Microsoft.
3. **Callback** (`GET /api/microsoft/auth/callback`) : validation `state`, consommation `jti`, vérification que le client existe et que l’utilisateur a un `ClientUser` **ACTIVE** ; échange `code` → tokens ; validation **stricte** du `id_token` (signature JWKS, `iss`, `aud`, `exp`) puis extraction du `tid`.
4. **Persistance** : au plus **une** connexion `ACTIVE` par `clientId` : les autres connexions du même client passent en `REVOKED` lors d’un nouveau connect réussi.
5. **Refresh** : avant les appels Graph, `ensureFreshAccessToken` applique un **seuil d’anticipation** (ex. 5 min avant expiration), un **mutex** par `connectionId` (une seule requête refresh simultanée), timeout + retry limité sur le endpoint token.
6. **Révocation** : `DELETE /api/microsoft/connection` ou révocation de masse au reconnect ; overwrite des champs token avant mise à `null` / statut `REVOKED`.

## 10. Politique de refresh

* **Seuil** : `MICROSOFT_REFRESH_LEEWAY_SECONDS` (défaut 300 s) — refresh si `tokenExpiresAt` absent ou proche de l’expiration.
* **Concurrence** : mutex applicatif par `connectionId` ; les appels concurrents partagent la même promesse de refresh.
* **Multi-instance** : mutex et store `jti` mémoire sont **par instance** ; pour la production horizontale, prévoir Redis (ou équivalent) pour lock + `jti` (variables `MICROSOFT_OAUTH_STATE_STORE` / runbook déploiement).

## 11. Gestion des erreurs (endpoint token Microsoft)

| Erreur OAuth | Comportement côté Starium |
|--------------|---------------------------|
| `invalid_grant` | Connexion → `EXPIRED` ; audit `microsoft_connection.error` |
| `invalid_client` | `ERROR` (configuration app) ; audit sans fuite de secret |
| `interaction_required` | Statut `ERROR` ; code métier `NEED_RECONNECT` dans l’audit |
| Autres / réseau | `ERROR` ou retry selon cas ; pas de log des corps contenant des jetons |

## 12. Annexe — scopes Graph (délégués)

Défaut configurable via `MICROSOFT_GRAPH_SCOPES` (moindre privilège) : `offline_access`, `openid`, `profile`, `email`, `User.Read`. Étendre avec Teams / Planner / fichiers selon les RFC ressources, avec consentement admin selon le tenant.

## 13. Points de vigilance

* Consentement admin vs utilisateur selon scopes (ex. `Group.Read.All`) — à valider avec la conformité tenant client.
* Rotation des secrets app Azure AD documentée en opérations.
