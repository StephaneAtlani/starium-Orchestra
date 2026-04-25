# RFC-STRAT-002 — Strategic Vision KPI and Alignment Engine

## 1) Contexte

Le module Strategic Vision doit permettre une lecture décisionnelle de l'alignement entre stratégie et exécution.  
Les indicateurs critiques ne peuvent pas être calculés côté UI : ils doivent être produits par le backend, client-scopés, fiables et exploitables dans le cockpit.

## 2) Objectif du moteur

Fournir un moteur d'alignement stratégique MVP qui calcule des KPI actionnables à partir des objectifs et des liens projet, avec une API dédiée et performante.

## 3) KPI MVP

- `projectAlignmentRate`
- `unalignedProjectsCount`
- `objectivesAtRiskCount`
- `objectivesOffTrackCount`
- `overdueObjectivesCount`

## 4) Règles de calcul

### 4.1 `projectAlignmentRate`

Définition :
- numérateur = nombre de projets actifs liés à au moins un objectif stratégique ;
- dénominateur = nombre total de projets actifs.

Formule :
- `projectAlignmentRate = alignedActiveProjects / totalActiveProjects`

Règles :
- un projet archivé ne compte pas dans le total ;
- en cas de total à 0, renvoyer `0` (et non `null`) pour un contrat API stable.

### 4.2 `unalignedProjectsCount`

- Nombre de projets actifs sans aucun lien vers `StrategicObjective`.
- Exclure les projets archivés.

### 4.3 `objectivesAtRiskCount`

- Nombre d'objectifs avec `status = AT_RISK`.

### 4.4 `objectivesOffTrackCount`

- Nombre d'objectifs avec `status = OFF_TRACK`.
- Tout objectif `OFF_TRACK` compte explicitement dans les dérives stratégiques.

### 4.5 `overdueObjectivesCount`

Un objectif est en retard si :
- `deadline < now()`
- et `status NOT IN (COMPLETED, ARCHIVED)`.

## 5) Endpoint cible

- `GET /api/strategic-vision/kpis`

Guards :
- `JwtAuthGuard`
- `ActiveClientGuard`
- `ModuleAccessGuard`
- `PermissionsGuard` avec permission `strategic_vision.read`

## 6) Réponse API proposée (avec types)

```ts
type StrategicVisionKpisResponse = {
  projectAlignmentRate: number; // 0..1
  unalignedProjectsCount: number;
  objectivesAtRiskCount: number;
  objectivesOffTrackCount: number;
  overdueObjectivesCount: number;
  generatedAt: string; // ISO date-time
};
```

Exemple :

```ts
{
  projectAlignmentRate: 0.72,
  unalignedProjectsCount: 5,
  objectivesAtRiskCount: 3,
  objectivesOffTrackCount: 1,
  overdueObjectivesCount: 2,
  generatedAt: "2026-04-25T09:00:00.000Z"
}
```

## 7) Règles de performance

- Calcul backend uniquement.
- Aucune logique KPI métier dans le frontend.
- Toutes les requêtes sont filtrées par `clientId`.
- Éviter les N+1 : privilégier agrégations SQL/Prisma groupées.

### Index recommandés

- Sur `StrategicObjective` : `(clientId, status)`, `(clientId, deadline)`.
- Sur `StrategicLink` : `(clientId, linkType)`, `(clientId, objectiveId)`, `(clientId, targetId)`.
- Sur `Project` (ou équivalent portefeuille) : `(clientId, status)` pour exclure rapidement les archivés.

## 8) Préparation V2

Indicateurs réservés V2 :
- `budgetAlignmentRate`
- `riskCoverageRate`
- `strategicDriftScore`

Principes :
- conserver le même endpoint avec extension additive du payload ;
- ne pas casser le contrat MVP ;
- aligner ces KPI sur des liens `BUDGET` et `RISK` activés ultérieurement.

## 9) Critères d'acceptation

- Le endpoint `GET /api/strategic-vision/kpis` est défini dans le contrat API.
- Les 5 KPI MVP sont calculés côté backend et uniquement côté backend.
- Les projets archivés sont exclus des KPI de couverture projet.
- Les objectifs en retard respectent la règle deadline + statut.
- `OFF_TRACK` est correctement compté comme dérive.
- Toutes les données sont strictement filtrées par `clientId` actif.
- Le contrat de réponse est stable, typé, et prêt pour extension V2 additive.
