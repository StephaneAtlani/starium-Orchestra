# Changelog

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

- Aucun changement publié depuis `0.9.0`.
