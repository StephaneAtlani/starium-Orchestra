# RFC-STRAT-008 — Vision stratégique V1 — KPI et alertes de désalignement

## Statut

✅ Implémentée (backend V1)

## 1. Analyse de l’existant

Le module stratégique expose déjà une logique KPI/alertes, mais le plan V1 formalise un contrat cible précis pour la lecture CODIR et la détection de dérive.

## 2. Hypothèses éventuelles

- Les KPI restent calculés côté backend, jamais côté frontend.
- Les alertes V1 sont calculées à la demande (pas de persistance obligatoire dans une table transverse).
- Le périmètre est strictement client-scopé.

## 3. Fichiers à créer / modifier

- `apps/api/src/modules/strategic-vision/strategic-vision.controller.ts`
- `apps/api/src/modules/strategic-vision/strategic-vision.service.ts`
- `apps/api/src/modules/strategic-vision/dto/list-strategic-vision-query.dto.ts` (si filtres dédiés)
- `docs/API.md`

## 4. Implémentation complète

### 4.1 Endpoint KPI

- `GET /api/strategic-vision/kpis`

Contrat cible :

```ts
{
  projectAlignmentRate: number;
  unalignedProjectsCount: number;
  objectivesAtRiskCount: number;
  objectivesOffTrackCount: number;
  overdueObjectivesCount: number;
  generatedAt: string;
}
```

Règles :

- `projectAlignmentRate` = projets actifs liés à au moins un objectif / projets actifs totaux.
- `unalignedProjectsCount` = projets actifs sans lien stratégique.
- `objectivesAtRiskCount` = `healthStatus = AT_RISK`.
- `objectivesOffTrackCount` = `healthStatus = OFF_TRACK`.
- `overdueObjectivesCount` = objectifs non terminés avec date cible dépassée.

### 4.2 Endpoint alertes

- `GET /api/strategic-vision/alerts`

Contrat cible :

```ts
{
  items: Array<{
    id: string;
    type: "OBJECTIVE_OVERDUE" | "OBJECTIVE_OFF_TRACK" | "PROJECT_UNALIGNED";
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    targetType: "OBJECTIVE" | "PROJECT";
    targetLabel: string;
    message: string;
    createdAt: string;
  }>;
  total: number;
}
```

Règles :

- Objectif en retard => `OBJECTIVE_OVERDUE`.
- Objectif `OFF_TRACK` => `OBJECTIVE_OFF_TRACK`.
- Projet actif non aligné => `PROJECT_UNALIGNED`.
- `targetLabel` doit contenir une valeur métier lisible, pas un ID brut.
- Périmètre backend-only : pas de branchement V1 sur le socle transverse `Alert`/`Notification`.
- Définition des projets actifs (source unique) : `activePortfolioProjectsWhere(clientId)`.
  - Exclusions minimales explicites : `ARCHIVED`, `CANCELLED`, `COMPLETED`.
- Sévérité V1 :
  - `OBJECTIVE_OFF_TRACK` => `CRITICAL`
  - `OBJECTIVE_OVERDUE` => `HIGH`
  - `PROJECT_UNALIGNED` => `MEDIUM` (fixe en V1, sans calcul dynamique)
- ID d’alerte déterministe (pas de `uuid`, `cuid`, `Date.now()`) :
  - `strategic-objective-overdue:<objectiveId>`
  - `strategic-objective-off-track:<objectiveId>`
  - `strategic-project-unaligned:<projectId>`
- `createdAt` stable et explicable :
  - `OBJECTIVE_OVERDUE` : `targetDate` si présent, sinon `updatedAt`, sinon `createdAt` de l’objectif ;
  - `OBJECTIVE_OFF_TRACK` : `updatedAt`, sinon `createdAt` de l’objectif ;
  - `PROJECT_UNALIGNED` : `updatedAt`, sinon `createdAt` du projet.
- Tri de réponse stable :
  - sévérité (`CRITICAL` > `HIGH` > `MEDIUM` > `LOW`) ;
  - puis `createdAt` décroissant ;
  - puis `targetLabel` alphabétique.

### 4.3 Sécurité / RBAC

Guards :

- `JwtAuthGuard`
- `ActiveClientGuard`
- `ModuleAccessGuard`
- `PermissionsGuard`

Permission minimale :

- `strategic_vision.read`

## 5. Modifications Prisma si nécessaire

- Aucun nouveau modèle requis pour la V1 si calcul à la demande.
- Ajouter des index si besoin performance :
  - `StrategicObjective(clientId, healthStatus)`
  - `StrategicObjective(clientId, targetDate, status)`
  - `StrategicLink(clientId, targetType, targetId)`

## 6. Tests

- calcul KPI cohérent avec jeux de données multi-états ;
- exclusion des projets `ARCHIVED` / `CANCELLED` / `COMPLETED` du périmètre actif ;
- alertes générées correctement par type ;
- un projet actif sans `StrategicLinkType.PROJECT` génère `PROJECT_UNALIGNED` ;
- un projet actif avec `StrategicLinkType.PROJECT` ne génère pas `PROJECT_UNALIGNED` ;
- `PROJECT_UNALIGNED` est renvoyée avec `severity = MEDIUM` ;
- IDs d’alertes déterministes vérifiés pour les 3 types ;
- tri stable vérifié sur cohabitation `OBJECTIVE_OVERDUE` / `OBJECTIVE_OFF_TRACK` / `PROJECT_UNALIGNED` ;
- `targetLabel` projet vérifié en valeur métier lisible (pas UUID seul) ;
- compatibilité des filtres `directionId` et `unassigned` conservée ;
- conflit `directionId + unassigned` rejeté ;
- filtrage strict par `clientId` ;
- rejet d’accès sans permission `strategic_vision.read`.

## 7. Récapitulatif final

Cette RFC fixe le contrat de pilotage stratégique V1 : KPI standardisés et alertes de désalignement calculées côté backend, prêtes pour le cockpit CODIR.

## 8. Points de vigilance

- Vérifier la cohérence de définition des statuts (`status` vs `healthStatus`) sur les objectifs.
- Éviter les N+1 sur les calculs agrégés.
- Garder le payload stable pour extension V2 additive.
- Ne pas déduire de sévérité dynamique pour `PROJECT_UNALIGNED` en V1 (réserver à une RFC ultérieure).
