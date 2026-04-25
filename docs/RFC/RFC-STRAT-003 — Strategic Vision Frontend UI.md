# RFC-STRAT-003 — Strategic Vision Frontend UI

## 1) Contexte UX

Le module Strategic Vision côté frontend doit offrir une lecture claire de l'alignement stratégique, orientée pilotage et arbitrage.  
L'interface doit traduire des données backend fiables en expérience cockpit lisible, sans porter de logique métier critique.

## 2) Positionnement

- Cockpit stratégique.
- Pas canvas libre.
- Pas moodboard.

Objectif UX : permettre à un DSI/CODIR de voir rapidement la vision active, ses axes, ses objectifs, les projets alignés et les dérives.

## 3) Route cible

- `/strategic-vision`

## 4) Structure UI

La page est structurée en sections lisibles et orientées décision :

- `PageHeader`
- KPI row
- Vision summary card
- Strategic axes section
- Objectives section
- Linked projects section
- Alerts / misalignment section

## 5) Composants proposés

- `StrategicVisionPage`
- `StrategicVisionSummaryCard`
- `StrategicAxisCard`
- `StrategicObjectiveCard`
- `StrategicKpiCards`
- `StrategicLinksPanel`
- `ObjectiveStatusBadge`

Responsabilités :
- composants de page/présentation découplés ;
- composants de carte centrés sur affichage métier ;
- aucun calcul critique encapsulé dans les composants UI.

## 6) Hooks proposés

- `useStrategicVisionQuery`
- `useStrategicObjectivesQuery`
- `useStrategicKpisQuery`
- `useCreateStrategicObjectiveMutation`
- `useUpdateStrategicObjectiveMutation`

## 7) Query keys tenant-aware

- `['strategic-vision', clientId]`
- `['strategic-vision', clientId, 'objectives', filters]`
- `['strategic-vision', clientId, 'kpis']`

Règles :
- jamais de query key sans `clientId` ;
- invalidation ciblée après mutation ;
- éviter les collisions inter-clients.

## 8) Règles UX

- Afficher des valeurs métier lisibles, jamais des ID bruts.
- États `loading` / `error` / `empty` obligatoires.
- Permissions gates sur toutes les actions (create/update/link).
- Aucune logique métier critique dans le frontend.

Exemples d'affichage attendu :
- `ownerLabel`, `axis.name`, `vision.title`, `project.name` ;
- jamais un UUID comme libellé utilisateur.

## 9) Design

- Respect strict du design system Starium.
- Stack UI : Tailwind + shadcn/ui.
- Cockpit clair et lisible (blanc/noir/or si applicable à la charte active).
- Densité d'information pilotable sans surcharge visuelle.

## 10) Contrat d'interaction frontend-backend

- Le frontend consomme les endpoints backend Strategic Vision et KPI.
- Toute règle de calcul (statut, dérive, retard, alignement) vient du backend.
- Le frontend orchestre l'affichage, les états de chargement et les actions utilisateur autorisées.

## 11) Critères d'acceptation frontend

- La route `/strategic-vision` est définie dans le plan d'architecture frontend.
- Les sections cockpit sont présentes avec états `loading/error/empty`.
- Les composants proposés couvrent vision, axes, objectifs, KPI, liens et alertes.
- Les hooks listés existent dans le design technique frontend.
- Les query keys sont tenant-aware avec `clientId`.
- Aucun ID brut n'est affiché comme valeur métier en UI.
- Les actions sont correctement gated par permissions.
- Aucune logique métier critique n'est implémentée côté frontend.
