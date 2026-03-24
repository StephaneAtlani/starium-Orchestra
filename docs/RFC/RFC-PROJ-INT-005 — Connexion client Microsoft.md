# RFC-PROJ-INT-005 — Connexion client Microsoft

## Statut

Draft

## Priorité

Haute

## Dépend de

* [RFC-PROJ-INT-002](./RFC-PROJ-INT-002%20—%20Prisma%20Schema%20Microsoft.md)
* [RFC-PROJ-INT-003](./RFC-PROJ-INT-003%20—%20Auth%20Microsoft%20OAuth.md)

## Objectif

Définir le **comportement métier** et les **APIs** pour gérer la **connexion Microsoft au niveau client** Starium : consulter l’état, déclencher le flux OAuth (via URL retournée par le backend), traiter le callback, et **révoquer** la connexion côté Starium sans supprimer les projets.

---

## 1. Règles métier

* Une `MicrosoftConnection` est toujours rattachée à un **`clientId`** issu du contexte **client actif** (pas de `clientId` dans le body).
* **Unicité** logique `(clientId, tenantId)` : reconnecter le même tenant met à jour la ligne ; un autre tenant peut nécessiter une stratégie produit (une connexion active par client au MVP — aligné [RFC-PROJ-INT-001](./RFC-PROJ-INT-001%20—%20Intégration%20Microsoft%20365.md)).
* Révocation : marquer la connexion `REVOKED` (ou équivalent), invalider tokens côté base ; les `ProjectMicrosoftLink` peuvent passer en état nécessitant reconnexion (détail en service).

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

Depuis les **services** uniquement, événements du type :

* `microsoft_connection.created`
* `microsoft_connection.updated`
* `microsoft_connection.revoked`

(voir liste [RFC-PROJ-INT-001](./RFC-PROJ-INT-001%20—%20Intégration%20Microsoft%20365.md) § audit.)

## 5. DTO

* Aucun DTO ne doit accepter `clientId` en entrée pour ces routes.

## 6. Tests

* Refus si utilisateur sans accès au client actif.
* Callback avec `state` invalide → erreur contrôlée.
* DELETE idempotent ou erreur explicite selon convention API.

## 7. Récapitulatif

* Connexion **par client** ; OAuth orchestré par le backend ; audit systématique.

## 8. Points de vigilance

* Multi-comptes Microsoft par utilisateur Starium : le flux OAuth associe le **tenant** au **client** ; documenter le cas « mauvais tenant choisi ».
