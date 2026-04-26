# Changelog

## [0.97] - 2026-04-26

### Vision stratégique

- Module **Strategic Vision** côté API : axes, objectifs, liens, métriques KPI, alertes de pilotage et permissions dédiées.
- Enrichissement UI (création/mise à jour, terminologie, compteurs d’objectifs, prévisualisation d’icônes sur les axes, alertes).

### Chatbot Starium (plateforme)

- Intégration du module **chatbot** (conversations, entrées, catégories, matching) avec journalisation d’audit renforcée.
- Soumission de **feedback** utilisateur et fil de **réponses** côté support.

### Recherche transverse

- Recherche texte sur plusieurs modèles métier (parcours unifié côté produit).

### Alertes et notifications

- Socle **alerts / notifications** (RFC associée) : déclenchement, consultation et documentation alignée.

### Budgets et pilotage

- Correctif graphiques multi-séries : gestion des séries vides sans erreur de rendu.
- Ajustements **budget dashboard** : données de mock / tests (ex. `initialAmount` sur les lignes).

### UI / layout

- Sidebar et workspace : lisibilité et ergonomie (header workspace, présentation projets / CODIR).
- Fiabilisation du **bootstrap** du layout protégé (chargement contexte).

### Outiling et dépendances

- Remplacement de **`xlsx`** par **`exceljs`** pour les flux tableur.
- Mise à jour de la configuration **ESLint** (règles TypeScript).

### Documentation

- Consolidation de la doc API / références et extension des RFC (vision stratégique, alertes).

## [0.96] - 2026-04-20

### Scenarios projet (nouveau domaine)

- Ajout d'un module complet **Project Scenarios** côté API: scénario principal, lignes financières, plans de charge, tâches, risques et snapshots de capacité.
- Ajout des vues front associées: onglet scénarios, cockpit de comparaison, workspace d'édition, sélection/synchronisation du scénario actif.
- Intégration des endpoints, hooks React Query, types et invalidations de cache pour supporter un cycle d'analyse "what-if" complet.

### Procurement / documents

- Mise en place de la gestion des pièces jointes procurement (devis, commandes, factures) de bout en bout: upload, consultation, détail.
- Implémentation d'un stockage **dual backend** (local + S3/MinIO) avec résolution dynamique selon la configuration.
- Ajout de la configuration plateforme S3/STS et provisioning des emplacements documentaires client.

### Contrats fournisseurs

- Introduction d'un nouveau module **Contracts** (API + UI): CRUD, permissions, catalogues de types de contrat et pièces jointes.
- Nouvelles pages front de listing, création/édition et détail contrat.

### Budgets (workflow et pilotage)

- Renforcement du workflow de statuts budgets/enveloppes/lignes avec transitions explicites et propagation en cascade.
- Ajout de l'historique des décisions budgétaires avec commentaires de transition.
- Ajout des `snapshot occasion types` et des réglages workflow budgétaires par client.
- Enrichissement des écrans budgets (dashboard, drawers, badges, comparaison forecast, quick calculator, bulk update des statuts).

### Teams / RH / staffing

- Ajout des modules compétences collaborateurs, activity types, work teams, manager scopes et affectations.
- Ajout des time entries et du suivi mensuel timesheet, avec paramètres client dédiés.
- Amélioration de la synchronisation User/Collaborator et de l'intégration ressources humaines.

### Plateforme / sécurité / architecture

- Évolution importante du schéma Prisma et ajout d'une série de migrations couvrant budgets, procurement, contracts, teams, timesheet et scenarios projet.
- Ajustements des guards d'accès et ajout d'un décorateur `require-any-permissions`.
- Mise à jour des seeders pour refléter les nouveaux workflows et référentiels.

### UI/UX transverse

- Amélioration de la navigation conditionnelle (RBAC/contexte client) et des layouts protégés.
- Ajustements de nombreux formulaires/dialogs pour lisibilité, densité d'information et accessibilité.
- Respect renforcé de la règle produit: affichage de valeurs métier lisibles dans les inputs/référentiels, jamais d'ID technique brut.

### Infra & outillage

- Ajustements Docker dev (API/Web/compose/entrypoints).
- Patch dépendance `sonner` et mise à jour du lockfile.
- Correctifs du script de consolidation de documentation markdown.

### Documentation

- Mise à jour étendue de la documentation API/architecture.
- Ajout et mise à jour d'un lot conséquent de RFC (budgets, procurement, contracts, teams, scenarios projet).

### Correctifs notables

- Correction Prisma sur références `Client` dans le domaine projets.
- Correction migration no-op pour éviter une erreur Prisma `P3015`.
- Correctifs sur la sélection de client actif et la gestion de stockage associée.

## [0.9.0] - 2026-03-31

### Budget (core, cockpit, forecast, snapshots)

- **Planning budgétaire (RFC-023)** :
  - Champs canoniques consolidés sur `GET/PUT` et réponses de mutation : `planningDelta`, `landingVariance`, `remainingPlanning`, `landing`, `consumedAmount`, `committedAmount`, `monthColumnLabels`, `exerciseEndDate`.
  - Alias de transition conservés (`deltaVsRevised`, `variance`) pour compatibilité des intégrations en migration.
  - Audit planning normalisé avec actions canoniques et mapping legacy centralisé.
  - Route unifiée `POST /api/budget-lines/:id/planning/apply-mode`.
- **Import budgétaire** :
  - Nouveau workflow d’import avec analyse des feuilles, parsing robuste des montants, mapping dynamique et validation renforcée.
  - Intégration d’une modale de création d’enveloppe pendant l’import.
  - UX d’import structurée en blocs fonctionnels pour sécuriser la saisie.
- **Cockpit et dashboard budget** :
  - Widgets KPI enrichis (configuration, overrides utilisateur, animation, affichage agrégé).
  - Nouvelles options de configuration et meilleure intégration API pour les vues décisionnelles.
- **Forecast et comparaison budgétaire (RFC-030)** :
  - Module forecast intégré avec vues de comparaison, libellés métiers descriptifs et toggles de colonnes.
  - Table de comparaison optimisée pour la lisibilité et l’analyse CODIR.
- **Snapshots budgétaires** :
  - Création de snapshots depuis le détail budget et pages dédiées.
  - Amélioration de la récupération des snapshots et du contexte utilisateur.
  - Fonctions de versioning refactorisées pour améliorer exportabilité et maintenance.

### Bibliothèque partagée

- `@starium-orchestra/budget-exercise-calendar` :
  - Alignement des mois d’exercice sur `BudgetExercise.startDate` (UTC).
  - Calcul de prévision restante et génération des libellés de colonnes.
  - Intégration dans le build monorepo avec correctifs de packaging.

### Projets, risques et pilotage

- **Gantt portefeuille/projet** :
  - Implémentation du Gantt portefeuille avec zoom, tooltips et structure de lignes enrichie.
  - Données projet étendues (priorité, criticité, problème métier) avec intégration UI complète.
- **Risques projet (EBIOS) & plans d’actions** :
  - Taxonomie des risques intégrée avec amélioration de la gestion en contexte client.
  - Intégration des tâches de plans d’actions dans le module projet, tri et récupération API améliorés.
- **Revue projet / retour d’expérience** :
  - Structuration et enrichissement des revues post-projet (indicateurs, UX de saisie, terminologie harmonisée).
- **Jeux de données de démonstration** :
  - Seed projets/risques revu pour couvrir plusieurs clients et mieux refléter les cas métiers.

### UX/UI transverse

- Configuration avancée des badges plateforme/UI (palette, contrastes, cohérence d’affichage).
- Refontes ciblées des formulaires/dialogs pour améliorer densité, lisibilité et performance.
- App shell/sidebar optimisés pour mobile.
- Renforcement de la règle produit : affichage de valeurs métier lisibles dans les inputs/listes plutôt que des identifiants techniques.

### API, sécurité et contrôle d’accès

- Guard explicite pour empêcher les seed non voulus en environnement production.
- Ajout d’une page de test RBAC et ajustements de layout protégé autour du contexte client actif.
- Intégration des métriques d’usage plateforme et raccordement au dashboard.

### Infrastructure & build

- Docker API : fiabilisation du build (retry Prisma generate).
- Correctifs Docker/build autour de l’intégration `budget-exercise-calendar`.

### Documentation (RFC et plans)

- Ajout/mise à jour des RFC Budget (forecast, cockpit, import, déploiement).
- Mise à jour des guides UX/UI sur formulaires denses et standards d’affichage des référentiels.

## Non publié

- Aucun lot en attente au-delà de `0.97`.
