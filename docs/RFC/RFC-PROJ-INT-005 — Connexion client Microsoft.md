# RFC-PROJ-INT-005 — Connexion client Microsoft

## Statut

Implémenté

## Priorité

Haute

## Dépend de

* [RFC-PROJ-INT-002](./RFC-PROJ-INT-002%20—%20Prisma%20Schema%20Microsoft.md)
* [RFC-PROJ-INT-003](./RFC-PROJ-INT-003%20—%20Auth%20Microsoft%20OAuth.md)

## Objectif

Définir le **comportement métier** et les **APIs** pour gérer la **connexion Microsoft au niveau client** Starium : consulter l’état, déclencher le flux OAuth (via URL retournée par le backend), traiter le callback, et **révoquer** la connexion côté Starium sans supprimer les projets.

---

## 1. Règles métier

* Pour les routes **authentifiées** (`GET /auth/url`, `GET|DELETE /connection`), le **`clientId`** Starium cible est celui du **contexte client actif** (guards + `X-Client-Id`), sans `clientId` dans le body.
* Pour **`GET /api/microsoft/auth/callback`**, pas de JWT : le **`clientId`** est celui porté par le **`state`** (JWT signé et validé côté serveur, avec `jti` anti-replay). La `MicrosoftConnection` est toujours rattachée à ce client après échange de code. Détail du flux : [RFC-PROJ-INT-003](./RFC-PROJ-INT-003%20—%20Auth%20Microsoft%20OAuth.md).
* **Unicité** logique `(clientId, tenantId)` : reconnecter le même tenant met à jour la ligne ; un autre tenant peut nécessiter une stratégie produit (une connexion active par client au MVP — aligné [RFC-PROJ-INT-001](./RFC-PROJ-INT-001%20—%20Intégration%20Microsoft%20365.md)).
* Révocation : marquer la connexion `REVOKED`, invalider les jetons côté base. `DELETE /api/microsoft/connection` est idempotent (aucune erreur si déjà révoqué ou absent).
* La propagation vers `ProjectMicrosoftLink` est hors scope (RFC-007).

## 2. API (indicatif — chemins à figer à l’implémentation)

| Méthode | Ressource | Rôle |
| ------- | --------- | ---- |
| GET | `/api/microsoft/auth/url` | Retourne l’URL de consentement Microsoft pour initier OAuth |
| GET | `/api/microsoft/auth/callback` | Callback OAuth (redirect Microsoft) |
| GET | `/api/microsoft/connection` | État de la connexion pour le client actif (sans secrets) |
| DELETE | `/api/microsoft/connection` | Révocation logique côté Starium |

Préfixe global `api` déjà défini par l’application.

## 3. Permissions

* À aligner sur le module Projets / paramètres client : au minimum **`projects.update`** ou permission dédiée future `projects.integrations.*` — décision produit ; le cadrage [RFC-PROJ-INT-001](./RFC-PROJ-INT-001%20—%20Intégration%20Microsoft%20365.md) propose `projects.read` / `projects.update` pour la carte projet.

## 4. Audit

Depuis les **services** uniquement. Liste alignée sur [RFC-PROJ-INT-003 — Auth Microsoft OAuth](./RFC-PROJ-INT-003%20—%20Auth%20Microsoft%20OAuth.md) (détail du flux OAuth et des événements) :

* `microsoft_connection.connected`
* `microsoft_connection.refreshed`
* `microsoft_connection.revoked`
* `microsoft_connection.error`

## 5. DTO

* Aucun DTO ne doit accepter `clientId` en entrée pour ces routes.

## 6. Tests

* Refus si utilisateur sans accès au client actif.
* Callback avec `state` invalide → erreur contrôlée.
* DELETE idempotent (aucune erreur si déjà révoqué ou absent).
* Couverture unitaire : `apps/api/src/modules/microsoft/microsoft-oauth.service.spec.ts` (happy path callback, isolation `clientId` depuis le `state`, audits, refresh, révocation).

## 7. Récapitulatif

* Connexion **par client** ; OAuth orchestré par le backend ; audit systématique.

## 8. Points de vigilance

* Multi-comptes Microsoft par utilisateur Starium : le flux OAuth associe le **tenant** au **client** ; documenter le cas « mauvais tenant choisi ».
