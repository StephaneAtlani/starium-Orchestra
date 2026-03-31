# RFC-PROJ-GANTT-001 — Gantt projet frontend (component-first)

## Statut

Draft

## Priorité

Haute

## Dépendances

* RFC projets MVP existante (`Project`, `ProjectTask`, `ProjectMilestone`)
* Guards standards : `JwtAuthGuard` → `ActiveClientGuard` → `ModuleAccessGuard` → `PermissionsGuard`
* Règles frontend Starium : architecture feature-first, composants métiers isolés, aucune logique métier critique dans React.  

---

# 1. Objectif

Ajouter une **vue Gantt projet** dans l’écran existant :

```text
/projects/:projectId/planning?sub=gantt
```

Cette vue doit permettre de visualiser de manière claire :

* l’ensemble des tâches du projet
* les jalons
* les dépendances simples
* l’état d’avancement
* les retards
* la structure temporelle du projet

Le Gantt n’est pas un outil de planification technique avancé type MS Project.
C’est un **outil de pilotage opérationnel et de gouvernance projet**, cohérent avec le positionnement cockpit de Starium. 

---

# 2. Problème résolu

Aujourd’hui, les projets peuvent exister avec tâches et jalons, mais sans **lecture temporelle consolidée** il devient difficile de répondre rapidement à des questions comme :

* quelles tâches sont en retard
* quels jalons approchent
* quelles dépendances bloquent le projet
* quelle phase concentre le plus de charge
* où en est réellement le projet dans le temps

Une simple liste ou table ne suffit pas pour ce besoin de pilotage visuel.

Le Gantt doit donc fournir une **projection calendrier** des données projet existantes, sans introduire de logique métier divergente côté frontend. Cette contrainte est alignée avec l’architecture Starium : le backend reste la source de vérité et le frontend consomme l’API.  

---

# 3. Périmètre

## Inclus

* vue Gantt dans la page projet existante `planning?sub=gantt`
* rendu des `ProjectTask`
* rendu des `ProjectMilestone`
* regroupement visuel par phase si les phases existent déjà dans le modèle ou dans l’agrégation backend
* affichage de la progression
* affichage de l’état / retard
* affichage des dépendances simples
* filtres frontend légers
* lecture seule MVP

## Exclus du MVP

* drag & drop de barres
* édition inline dans le Gantt
* replanification par glisser-déposer
* dépendances multiples complexes
* vue portefeuille multi-projets
* vue multi-clients
* allocation de ressources dans le Gantt
* logique de recalcul métier côté frontend

---

# 4. Décision structurante

## 4.1 Le Gantt est une vue, pas un nouveau domaine métier

Le Gantt ne crée pas de nouvelle source de vérité.
Il consomme uniquement les objets projets existants :

* `Project`
* `ProjectTask`
* `ProjectMilestone`

Le frontend ne calcule pas les règles métier critiques.
Il ne fait qu’afficher une représentation temporelle des données fournies par l’API, conformément aux règles d’architecture frontend et backend du projet.  

## 4.2 Le frontend doit être component-first

La vue Gantt doit être implémentée sous forme de **composants métiers dédiés**, et non comme un unique fichier de page massif.

La page route ne fait que :

* lire `projectId`
* lire le sous-onglet `sub=gantt`
* charger les données via hook/query
* composer les composants métier

Cette règle est cohérente avec la structure feature-first recommandée dans l’architecture frontend. 

---

# 5. UX cible

## 5.1 Vue générale

La vue Gantt doit afficher :

* une colonne gauche figée avec les éléments projet
* une timeline horizontale
* des barres de tâches
* des losanges de jalons
* une lecture temporelle par semaine ou mois
* un code couleur simple et cohérent

## 5.2 Codes visuels MVP

### Tâche

* barre horizontale
* largeur = durée planifiée
* position = dates planifiées
* remplissage interne = progression

### Jalon

* losange
* positionné sur la date du jalon

### États visuels

* `DONE` → terminé
* `IN_PROGRESS` → en cours
* `BLOCKED` → bloqué
* `CANCELLED` → annulé
* retard → badge / contour critique / indicateur rouge

## 5.3 Interactions MVP

* hover sur une barre → tooltip synthétique
* clic sur une ligne/tâche/jalon → navigation ou ouverture du drawer/onglet détail existant
* scroll horizontal de timeline
* scroll vertical indépendant si nécessaire

---

# 6. Données nécessaires

## 6.1 Source de vérité

Toutes les données doivent provenir du backend.

## 6.2 Contrat cible minimal

Le frontend a besoin d’un objet agrégé du type :

```ts
type ProjectGanttResponse = {
  project: {
    id: string;
    name: string;
    status: string;
    plannedStartDate: string | null;
    plannedEndDate: string | null;
  };
  phases: Array<{
    id: string;
    name: string;
    sortOrder: number;
    plannedStartDate: string | null;
    plannedEndDate: string | null;
    progress: number | null;
  }>;
  tasks: Array<{
    id: string;
    name: string;
    phaseId: string | null;
    status: string;
    priority: string | null;
    progress: number | null;
    plannedStartDate: string | null;
    plannedEndDate: string | null;
    actualStartDate: string | null;
    actualEndDate: string | null;
    dependencyTaskId: string | null;
    isLate: boolean;
  }>;
  milestones: Array<{
    id: string;
    name: string;
    status: string;
    date: string | null;
    phaseId: string | null;
    isLate: boolean;
  }>;
};
```

## 6.3 Règle critique

Le booléen `isLate` doit être calculé côté backend, pas côté frontend.

Même logique pour :

* dates consolidées de phase
* progression consolidée d’une phase
* statut de retard global si ajouté plus tard

---

# 7. Backend

## 7.1 Endpoint recommandé

```http
GET /api/projects/:id/gantt
```

## 7.2 Guards

Routes protégées par :

```text
JwtAuthGuard
→ ActiveClientGuard
→ ModuleAccessGuard
→ PermissionsGuard
```

Permission requise :

```text
projects.read
```

Cette chaîne est cohérente avec le pipeline standard des routes métier Starium.  

## 7.3 Règles backend

* vérifier que le projet appartient au client actif
* retourner uniquement les tâches et jalons du client actif
* ordonner les tâches de manière stable
* calculer les flags utiles au rendu
* ne pas retourner de données inutiles au Gantt

## 7.4 Tri recommandé

Ordre de rendu backend :

1. phases par `sortOrder`
2. tâches d’une phase par `plannedStartDate ASC`, puis `createdAt ASC`
3. tâches sans phase à la fin, même règle
4. milestones par date

## 7.5 Cas de dates incomplètes

### Tâches sans dates

Si une tâche n’a pas de `plannedStartDate` ou `plannedEndDate`, elle n’est pas rendue comme barre sur la timeline.
Elle peut être :

* soit exclue de la vue Gantt
* soit affichée dans une section “non planifiée”

Décision MVP recommandée :

* ne pas la rendre sur la timeline
* l’afficher dans une zone latérale “Tâches non planifiées” optionnelle si besoin

### Jalons sans date

Même logique : non rendus dans la timeline.

---

# 8. Frontend — architecture component-first

## 8.1 Route

Fichier route existant ou cible :

```text
apps/web/src/app/(protected)/projects/[projectId]/planning/page.tsx
```

Le sous-onglet `sub=gantt` déclenche le rendu du Gantt.

## 8.2 Structure feature

```text
apps/web/src/features/projects/gantt/
├── api/
│   └── get-project-gantt.ts
├── hooks/
│   └── use-project-gantt-query.ts
├── components/
│   ├── project-gantt-view.tsx
│   ├── gantt-toolbar.tsx
│   ├── gantt-layout.tsx
│   ├── gantt-sidebar.tsx
│   ├── gantt-timeline-header.tsx
│   ├── gantt-grid.tsx
│   ├── gantt-phase-row.tsx
│   ├── gantt-task-row.tsx
│   ├── gantt-milestone-row.tsx
│   ├── gantt-bar.tsx
│   ├── gantt-milestone-marker.tsx
│   ├── gantt-dependency-lines.tsx
│   ├── gantt-tooltip.tsx
│   ├── gantt-empty-state.tsx
│   └── gantt-error-state.tsx
├── mappers/
│   └── project-gantt.mapper.ts
├── types/
│   └── project-gantt.types.ts
└── utils/
    ├── gantt-date-range.ts
    ├── gantt-pixels.ts
    └── gantt-groups.ts
```

Cette structure est alignée avec la convention frontend feature-first recommandée par le projet. 

---

# 9. Rôle exact des composants

## `project-gantt-view.tsx`

Composant orchestration principal.
Responsabilités :

* appeler le hook de données
* gérer loading / error / empty / success
* composer toolbar + layout + timeline

## `gantt-toolbar.tsx`

Responsabilités :

* zoom jour/semaine/mois
* toggle affichage milestones
* toggle affichage dépendances
* filtre statut
* filtre phase

Aucune logique métier.

## `gantt-layout.tsx`

Responsabilités :

* poser la structure en deux zones

  * sidebar gauche
  * timeline droite

## `gantt-sidebar.tsx`

Responsabilités :

* afficher noms des phases / tâches / jalons
* badges statut / progression si utile

## `gantt-timeline-header.tsx`

Responsabilités :

* afficher échelle temporelle
* jours / semaines / mois selon zoom

## `gantt-grid.tsx`

Responsabilités :

* dessiner la grille verticale/horizontale
* synchroniser hauteurs de lignes

## `gantt-phase-row.tsx`

Responsabilités :

* afficher une phase
* éventuellement barre consolidée de phase si fournie par le backend

## `gantt-task-row.tsx`

Responsabilités :

* afficher une tâche
* inclure `gantt-bar`

## `gantt-bar.tsx`

Responsabilités :

* rendu visuel de la barre
* calculs purement visuels déjà préparés via mapper/utilitaires
* progression interne
* état retard

## `gantt-milestone-row.tsx`

Responsabilités :

* ligne pour jalon si rendu séparé

## `gantt-milestone-marker.tsx`

Responsabilités :

* afficher le losange du jalon

## `gantt-dependency-lines.tsx`

Responsabilités :

* dessiner les liens visuels entre tâches
* lecture seule MVP

## `gantt-tooltip.tsx`

Responsabilités :

* infobulle synthétique
* nom
* dates
* progression
* statut

---

# 10. Mapping frontend

Le frontend ne doit pas travailler directement sur la réponse brute.
Il faut un mapper dédié :

```text
project-gantt.mapper.ts
```

Ce mapper transforme la réponse backend en modèle d’affichage :

```ts
type GanttRenderRow =
  | { kind: 'phase'; ... }
  | { kind: 'task'; ... }
  | { kind: 'milestone'; ... };
```

Il calcule uniquement :

* positions pixels
* largeur de barre
* regroupement d’affichage
* lignes visibles selon filtres

Il ne recalcule jamais :

* retard métier
* progression métier consolidée
* statut métier

---

# 11. API frontend

## 11.1 Fonction API

```ts
getProjectGantt(projectId: string): Promise<ProjectGanttResponse>
```

## 11.2 Hook query

```ts
useProjectGanttQuery(projectId: string)
```

## 11.3 Query key

La clé doit être tenant-aware :

```ts
['project-gantt', clientId, projectId]
```

Cette règle est cohérente avec l’architecture frontend Starium sur TanStack Query et l’isolation multi-client. 

---

# 12. États UI obligatoires

Comme pour toute page métier Starium, le Gantt doit gérer explicitement :

* loading
* error
* empty
* success

Aucun écran vide brut ne doit être affiché. Cette règle est explicitement posée par l’architecture frontend. 

---

# 13. Règles de rendu MVP

## 13.1 Zoom

Trois niveaux maximum :

* semaine
* mois
* trimestre

Décision MVP recommandée :

* défaut = mois

## 13.2 Période visible initiale

La timeline doit s’ouvrir sur la fenêtre minimale couvrant :

* la plus petite date planifiée du projet
* la plus grande date planifiée du projet

avec marge visuelle avant/après.

## 13.3 Couleurs

Respect de l’identité Starium :

* noir / blanc / or comme base UI
* rouge / orange réservés aux alertes métier
* pas d’explosion de couleurs par statut

L’identité frontend Starium reste centrée sur une hiérarchie visuelle forte et lisible. 

---

# 14. Performance

## MVP

Le backend retourne directement une charge adaptée au projet.
Pas de virtualisation obligatoire au MVP.

## Si projet volumineux

Prévoir ensuite :

* virtualisation des lignes
* canvas ou SVG optimisé pour dépendances
* pagination logique par phase si nécessaire

Mais hors MVP.

---

# 15. Audit et traçabilité

## MVP lecture seule

Aucun audit métier spécifique au simple affichage du Gantt n’est requis.

## Plus tard

Si la vue devient interactive avec édition :

* audit des changements de dates
* audit des dépendances modifiées
* audit des jalons déplacés

---

# 16. Tests attendus

## 16.1 Unit tests frontend

* mapper backend → rows Gantt
* calcul fenêtre de dates
* calcul largeur / position pixels
* filtres d’affichage
* exclusion tâches sans dates

## 16.2 Component tests

* affichage loading
* affichage empty
* affichage error
* rendu d’une tâche
* rendu d’un jalon
* rendu d’une phase
* masquage des dépendances si toggle off

## 16.3 Integration tests backend

* projet filtré par client actif
* refus si projet d’un autre client
* permission `projects.read` requise
* ordre de retour stable
* calcul `isLate` correct

---

# 17. Critères d’acceptation

La RFC est considérée implémentée lorsque :

* l’URL `/projects/:projectId/planning?sub=gantt` affiche une vraie vue Gantt
* les données proviennent d’un endpoint backend dédié
* le frontend est découpé en composants métier dédiés
* aucune logique métier critique n’est dupliquée côté React
* les tâches, jalons et phases sont lisibles
* les états loading / error / empty / success sont gérés
* la query est tenant-aware
* le rendu reste cohérent avec le cockpit Starium

---

# 18. Décisions MVP finales

## Décision 1

La cible de cette RFC est **le Gantt projet**, pas le portefeuille ni le multi-client.

## Décision 2

La route fonctionnelle reste :

```text
/projects/:projectId/planning?sub=gantt
```

## Décision 3

L’implémentation frontend est **obligatoirement component-first**.

## Décision 4

Le backend expose un endpoint dédié :

```text
GET /api/projects/:id/gantt
```

## Décision 5

Le MVP est **lecture seule**.

---

# 19. Suite naturelle après cette RFC

Les RFC suivantes possibles seront :

* RFC-PROJ-GANTT-002 — édition interactive du Gantt
* RFC-PROJ-GANTT-003 — Gantt portefeuille projets
* RFC-PROJ-GANTT-004 — Gantt global multi-clients
* RFC-PROJ-GANTT-005 — couplage Gantt + budget + risques

