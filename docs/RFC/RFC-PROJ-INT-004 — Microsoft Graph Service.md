# RFC-PROJ-INT-004 — Microsoft Graph Service

## Statut

Implémenté (backend `apps/api/src/modules/microsoft/` : `MicrosoftGraphService`, types, tests unitaires).

## Priorité

Haute

## Dépend de

* [RFC-PROJ-INT-003](./RFC-PROJ-INT-003%20—%20Auth%20Microsoft%20OAuth.md) (jetons valides)
* [RFC-PROJ-INT-001](./RFC-PROJ-INT-001%20—%20Intégration%20Microsoft%20365.md) (préférence API v1.0)

## Objectif

Définir un **service technique unique** d’accès à **Microsoft Graph** : exécution des requêtes HTTP authentifiées, gestion d’erreurs normalisée, et **séparation** entre transport Graph et logique métier (Teams, Planner, fichiers) implémentée dans des services ou adaptateurs au-dessus.

---

## 1. Analyse de l’existant

* **Réalisé :** client HTTP Graph isolé (`microsoft-graph.service.ts`), types (`microsoft-graph.types.ts`), constantes (`microsoft.constants.ts`), export module `MicrosoftModule`. Les appels passent par `https://graph.microsoft.com/v1.0` ; le jeton délégué est obtenu via `MicrosoftOAuthService.ensureFreshAccessToken` (ex. `requestForConnection`). Pas de logique métier dans ce service.

## 2. Responsabilités du service

* Construire les requêtes vers `https://graph.microsoft.com/v1.0/...` (chemin par défaut **v1.0**).
* Injecter le **Bearer token** obtenu via la couche auth Microsoft (refresh transparent côté appelant ou mécanisme documenté).
* Gérer timeouts, codes HTTP, corps d’erreur Graph de façon **prévisible** pour les couches métier (pas de logique métier dans ce service pur « client HTTP »).

## 3. Hors périmètre strict de ce service

* Mapping Starium ↔ Planner (métier) : [RFC-PROJ-INT-008](./RFC-PROJ-INT-008%20—%20Sync%20tâches%20vers%20Planner.md).
* Listing métier « équipes / canaux / plans » avec règles produit : [RFC-PROJ-INT-006](./RFC-PROJ-INT-006%20—%20Sélection%20ressources%20Microsoft.md).

## 4. Fichiers à créer / modifier (indicatif)

* `apps/api/src/modules/microsoft/microsoft-graph.service.ts` — transport HTTP (GET avec retries prudents, POST/PATCH/DELETE sans retry automatique ; parsing 204 / JSON / erreurs).
* `apps/api/src/modules/microsoft/microsoft-graph.types.ts` — `MicrosoftGraphHttpError`, `MicrosoftGraphErrorBody`, `MicrosoftGraphODataListResponse`, etc.
* `apps/api/src/modules/microsoft/microsoft-graph.service.spec.ts` — tests avec `fetch` mocké.
* Variable optionnelle `MICROSOFT_GRAPH_HTTP_TIMEOUT_MS` (voir `.env.example`).
* Pas de fuite de token dans les logs.

## 5. Principes

* **Préférer v1.0** ; éviter `/beta` en production sauf décision documentée exceptionnelle (aligné RFC-001).
* Retry : politique **prudente** (idempotence, backoff) — détail en implémentation, pas de boucle infinie.

## 6. Tests

* Tests unitaires avec **mock fetch/axios** des réponses Graph (succès 200, 401, 429, 5xx).

## 7. Récapitulatif

* Une couche **transport Graph** réutilisable ; la logique métier reste dans les services domaine.

## 8. Points de vigilance

* Les quotas et throttling Graph peuvent impacter l’UX sync manuelle — messages d’erreur exploitables côté [RFC-PROJ-INT-008](./RFC-PROJ-INT-008%20—%20Sync%20tâches%20vers%20Planner.md).
