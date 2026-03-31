# RFC-PROJ-INT-007 — Lien projet Microsoft

## Statut

Implémenté

## Priorité

Haute

## Dépend de

* [RFC-PROJ-INT-002](./RFC-PROJ-INT-002%20—%20Prisma%20Schema%20Microsoft.md) (`ProjectMicrosoftLink`)
* [RFC-PROJ-INT-005](./RFC-PROJ-INT-005%20—%20Connexion%20client%20Microsoft.md)
* [RFC-PROJ-INT-006](./RFC-PROJ-INT-006%20—%20Sélection%20ressources%20Microsoft.md) (ids Team / Channel / Plan valides côté Microsoft)

## Objectif

Définir la **configuration Microsoft par projet** : lecture / écriture du lien `ProjectMicrosoftLink`, validation métier (connexion active, cohérence `clientId` / `projectId`), activation `isEnabled`, et **dénormalisation** des noms (`teamName`, `channelName`, `plannerPlanTitle`) pour l’UI.

---

## 1. Règles métier

* Le **projet** doit appartenir au **client actif** ; sinon **403/404** selon convention API.
* Si `isEnabled === true`, le backend exige une **MicrosoftConnection** active pour ce client et des identifiants **teamId**, **channelId**, **plannerPlanId** (sauf phase intermédiaire explicitement autorisée).
* Si `isEnabled === false`, le mode est permissif : aucune validation/consistance Microsoft n’est exigée et aucun appel Graph de résolution bloquant n’est requis.
* **Unicité** : un seul enregistrement `ProjectMicrosoftLink` par `projectId` (`@@unique`).
* Les champs `filesDriveId` / `filesFolderId` sont prévus pour la préparation de la sync documents (RFC-009) mais ne sont pas traités dans l’implémentation RFC-007 : le backend n’en garantit ni la résolution Graph ni la persistance lors du PUT (sauf conservation des valeurs déjà existantes sur une ligne préalablement créée).
* Les champs de dénormalisation `teamName` / `channelName` / `plannerPlanTitle` sont persistés si fournis par le frontend ; sinon ils sont conservés (ou restent `null`) sans validation distante bloquante.

## 2. API (indicatif)

| Méthode | Ressource | Description |
| ------- | --------- | ----------- |
| GET | `/api/projects/:id/microsoft-link` | Configuration courante (ou 404 si aucune ligne) |
| PUT | `/api/projects/:id/microsoft-link` | Création ou remplacement (DTO validé, **sans** `clientId`) |

### Corps PUT (exemple)

```json
{
  "isEnabled": true,
  "teamId": "…",
  "channelId": "…",
  "plannerPlanId": "…",
  "syncTasksEnabled": true,
  "syncDocumentsEnabled": true
}
```

`syncDocumentsEnabled` peut rester sans effet tant que [RFC-PROJ-INT-009](./RFC-PROJ-INT-009%20—%20Sync%20documents%20vers%20Teams.md) n’est pas prête.

## 3. Permissions

* **`projects.read`** pour GET ; **`projects.update`** pour PUT (aligné cadrage).

## 4. Audit

* `project.microsoft_link.enabled`
* `project.microsoft_link.updated`

## 5. Tests

* Projet d’un autre client → refus.
* PUT avec `isEnabled` true sans connexion Microsoft → erreur métier claire.
* `isEnabled=true` : le backend rattache `microsoftConnectionId` à la **MicrosoftConnection active du même** `clientId` (dérivé côté backend, pas fourni par le client).

## 6. Récapitulatif

* Point d’entrée **projet** pour l’intégration Microsoft ; pas de fuite inter-client.

## 7. Points de vigilance

* Ne pas écraser silencieusement une config si l’utilisateur change de tenant côté Microsoft — règles de réconciliation à documenter si plusieurs connexions futures.
