# RFC-PROJ-INT-006 — Sélection ressources Microsoft

## Statut
🟡 Partiel (implémenté routes, tests service partiels)

## Priorité

Haute

## Dépend de

* [RFC-PROJ-INT-004](./RFC-PROJ-INT-004%20—%20Microsoft%20Graph%20Service.md)
* [RFC-PROJ-INT-005](./RFC-PROJ-INT-005%20—%20Connexion%20client%20Microsoft.md) (connexion active)

## Objectif

Permettre au frontend de **lister** les ressources Microsoft nécessaires pour configurer un projet : **équipes Teams**, **canaux**, et **plans Planner** exploitables — **sans garantir** un modèle unique « plan par canal » tant que la faisabilité Graph n’est pas validée.

---

## 1. Contrainte technique (non négociable dans le cadrage)

La capacité à **lister ou résoudre des plans Planner** en fonction d’une **équipe + canal** précis **n’est pas promise** comme acquis stable : certaines opérations historiquement exposées en **beta** ou dépendantes du modèle **groupe Office 365 / site SharePoint** imposent un **spike Microsoft Graph** avant figement des routes.

**Décision produit** : le MVP peut proposer une **sélection de plan** par un **autre chemin** (ex. liste de plans accessibles au groupe lié à l’équipe, saisie guidée) si « liste des plans du canal » n’est pas disponible en **v1.0** de façon fiable.

---

## 2. APIs attendues (indicatif)

| Méthode | Ressource | Description |
| ------- | --------- | ----------- |
| GET | `/api/microsoft/teams` | Équipes Teams accessibles avec le token délégué |
| GET | `/api/microsoft/teams/:teamId/channels` | Canaux de l’équipe |
| GET | `/api/microsoft/teams/:teamId/plans` *(provisoire)* | Plans Planner exploitables pour le contexte choisi. Contrat public neutre vis-à-vis du `channelId` (pas de promesse “plan par canal” tant que Graph n’est pas figé) |

Le dernier point ne doit pas être nommé définitivement `.../channels/:channelId/plans` tant que le spike n’a pas validé l’endpoint et la version d’API.

---

## 3. Comportement

* Toutes les routes appliquent **ActiveClientGuard** et vérifient une **MicrosoftConnection** valide pour le client actif.
* Réponses : identifiants Microsoft + **libellés** pour affichage UI (noms d’équipe, de canal, de plan) — aligné règle produit « afficher la valeur, pas l’ID ».

## 3.1 Neutralité `channelId` sur les plans

* Public API : `GET /api/microsoft/teams/:teamId/plans`.
* Côté FE, `channelId` sert uniquement de contexte UX pour déclencher le chargement en cascade.
* Côté backend, la route des plans ne promet aucun filtrage “plan par canal” : l’implémentation MVP dépend uniquement de `teamId`.

## 3.2 Endpoints Microsoft Graph v1.0 (fallback MVP)

* Teams : `me/joinedTeams?$select=id,displayName`
* Channels : `teams/:teamId/channels?$select=id,displayName`
* Plans (MVP interne) : `groups/:teamId/planner/plans?$select=id,title`

## 4. Fichiers / couches

* Contrôleur(s) sous namespace `microsoft` + services utilisant [RFC-PROJ-INT-004](./RFC-PROJ-INT-004%20—%20Microsoft%20Graph%20Service.md).
* Documentation du résultat du **spike** (endpoints Graph retenus, version) en annexe de cette RFC ou dans le runbook.

Fichiers implémentés :

* Backend :
  * `apps/api/src/modules/microsoft/microsoft-selection.controller.ts`
  * `apps/api/src/modules/microsoft/microsoft-selection.service.ts`
  * `apps/api/src/modules/microsoft/microsoft-selection.controller.spec.ts`
  * `apps/api/src/modules/microsoft/microsoft-selection.service.spec.ts`
* Frontend :
  * `apps/web/src/features/microsoft-365/api/microsoft-resources.api.ts`
  * `apps/web/src/features/microsoft-365/components/project-microsoft-resource-selectors-card.tsx`
  * `apps/web/src/features/projects/components/project-sheet-view.tsx`

## 5. Tests

* `microsoft-selection.service.spec.ts` :
  * `listTeams` : liste vide OK
  * `listTeams` : `403` Graph -> `ForbiddenException`
  * `listTeams` : isolation client (`clientId` passé à `oauth.getActiveConnection` puis `graph.requestForConnection`)
  * `listTeams` : pas de connexion active -> `NotFoundException`
* `microsoft-selection.controller.spec.ts` :
  * délégation correcte vers le service pour `listTeams`, `listChannels`, `listPlansForTeam`

## 6. Récapitulatif

* Sélection ressources = **facade** au-dessus de Graph.
* Contrat public : `GET /api/microsoft/teams/:teamId/plans` et neutralité vis-à-vis de `channelId` (jusqu’à validation Graph).

## 7. Points de vigilance

* Ne pas déployer en production une dépendance **beta** sans décision explicite (voir [RFC-PROJ-INT-001](./RFC-PROJ-INT-001%20—%20Intégration%20Microsoft%20365.md)).
