# RFC Liste complète — Module Équipes

Ce lot complète la vision produit Starium sur la **gestion des équipes** centrée sur **collaborateurs, compétences et affectations** , en s’appuyant sur le socle déjà existant de **synchronisation annuaire des collaborateurs** (`RFC-TEAM-001`) .

| Ordre | RFC             | Nom                                                | Description                                                                                                                             | État          | Commentaire                                      |
| ----: | --------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------ |
|     1 | RFC-TEAM-001    | Synchronisation des collaborateurs depuis annuaire | Synchronisation Microsoft Graph / AD DS, groupes cibles, preview, exécution, jobs, provisioning `Collaborator` + `User` + `ClientUser`. | ✅ Implémentée | Socle d’alimentation déjà en place.              |
|     2 | RFC-TEAM-002    | Référentiel Collaborateurs métier                  | CRUD métier des collaborateurs : identité, fonction, manager, statut, source, tags, notes, règles si collaborateur synchronisé.          | ✅ Implémentée (backend MVP) | Première brique métier réelle du module Équipes. |
|     3 | [RFC-TEAM-003](./RFC-TEAM-003%20—%20Référentiel%20Compétences.md)    | Référentiel Compétences                            | Catalogue client de compétences avec catégories, statuts, niveau de référence, archivage logique.                                       | ✅ Implémentée (backend MVP) | Base du “qui sait faire quoi”.                   |
|     4 | [RFC-TEAM-004](./RFC-TEAM-004%20—%20Compétences%20des%20collaborateurs.md) | Compétences des collaborateurs                     | Association `Collaborator ↔ Skill` avec niveau, commentaire, date de revue, source et validation manager.                               | ✅ Implémentée (backend MVP) | API + Prisma ; UI catalogue FE-TEAM-003 (MVP) ; UI fiche collaborateur à venir. |
|     5 | [RFC-TEAM-005](./RFC-TEAM-005%20%E2%80%94%20R%C3%A9f%C3%A9rentiel%20%C3%89quipes%20p%C3%A9rim%C3%A8tres%20managers.md)    | Référentiel Équipes / périmètres managers          | Définition des équipes, rattachement des collaborateurs, scopes managers, équipes directes / étendues.                                  | ✅ Implémentée (backend MVP) | API `/api/work-teams`, `/api/manager-scopes`, route inverse collaborateurs ; permissions `teams.*`. |
|     6 | RFC-TEAM-006    | Taxonomie des activités                            | Référentiel des types d’activité : PROJECT / RUN / SUPPORT / TRANSVERSE / OTHER, extensible par client.                                 | ❌ À faire     | Doit précéder affectations et temps.             |
|     7 | RFC-TEAM-007    | Affectations ressources                            | Affectation planifiée d’un collaborateur à un projet ou une activité avec période, rôle, taux de charge.                                | ❌ À faire     | Cœur du staffing.                                |
|     8 | RFC-TEAM-008    | Staffing projet par manager / responsable projet   | Depuis les projets, affecter la charge des équipes sur activités / projets.                                                             | ❌ À faire     | Répond directement à ton besoin fonctionnel.     |
|     9 | RFC-TEAM-009    | Saisie des temps                                   | Saisie du réalisé par les équipes : jour / semaine, projet ou activité, heures, commentaire, statut.                                    | ❌ À faire     | Timesheet légère orientée pilotage.              |
|    10 | RFC-TEAM-010    | Validation des temps                               | Workflow simple draft / submitted / validated / rejected, avec règles de correction.                                                    | ❌ À faire     | À garder simple au MVP.                          |
|    11 | RFC-TEAM-011    | Capacité, charge et disponibilité                  | Calculs consolidés : capacité théorique, charge planifiée, charge réelle, disponibilité, surcharge, sous-charge.                        | ❌ À faire     | Transforme les données en indicateurs utiles.    |
|    12 | RFC-TEAM-012    | Écarts planifié vs réel                            | Comparaison affectations vs temps saisis par collaborateur, activité, projet, période.                                                  | ❌ À faire     | Brique clé pour le pilotage projet.              |
|    13 | RFC-TEAM-013    | Vue Manager                                        | Cockpit manager : équipe, charge, disponibilité, tensions, affectations, alertes, drill-down.                                           | ❌ À faire     | Première vue de pilotage forte.                  |
|    14 | RFC-TEAM-014    | Vue Collaborateur                                  | Mon cockpit : mes affectations, mes temps, ma charge, ma disponibilité, mes compétences.                                                | ❌ À faire     | Vue self-service opérationnelle.                 |
|    15 | RFC-TEAM-015    | Matrice de compétences                             | Vue croisée collaborateurs / compétences / niveaux / couverture.                                                                        | ❌ À faire     | Très utile pour staffing et risques humains.     |
|    16 | RFC-TEAM-016    | Alertes de staffing                                | Alertes surcharge, sous-charge, projet sans ressource, compétence manquante, dépendance critique.                                       | ❌ À faire     | Couche cockpit / intelligence.                   |
|    17 | RFC-TEAM-017    | Vue Direction / DSI                                | Vue transverse capacité / staffing / tensions / dépendances à l’échelle du client.                                                      | ❌ À faire     | Lot gouvernance.                                 |
|    18 | RFC-TEAM-018    | Valorisation des temps et capacité budgétaire      | Projection des temps / charges en coûts futurs pour intégration budget.                                                                 | ❌ À faire     | À traiter après stabilisation du cœur équipe.    |
|    19 | RFC-FE-TEAM-001 | [Frontend Foundation — Équipes](./RFC-FE-TEAM-001%20%E2%80%94%20Frontend%20Foundation%20%E2%80%94%20%C3%89quipes.md) | Structure `features/teams`, routes, query keys, client API, composants communs, conventions d’état.                                     | ✅ Implémentée | Fondation FE + tests unitaires livrés.           |
|    20 | RFC-FE-TEAM-002 | [UI Collaborateurs](./RFC-FE-TEAM-002%20%E2%80%94%20UI%20Collaborateurs.md) | Liste, détail, édition, badges, filtres, relation manager, provenance annuaire (`source`).                                              | ✅ Implémentée (MVP FE) | UI livrée sur `/teams/collaborators` + détail ; sans `syncState` dédié. |
|    21 | [RFC-FE-TEAM-003](./RFC-FE-TEAM-003%20%E2%80%94%20UI%20Comp%C3%A9tences.md) | UI Compétences                                     | Catalogue `/teams/skills` + dialog porteurs + nav Équipes (MVP FE) ; fiche collaborateur en lot suivant.                                  | Implémentée (MVP catalogue FE) | Associations UI collaborateur : RFC FE à venir. |
|    22 | [RFC-FE-TEAM-004](./RFC-FE-TEAM-004%20%E2%80%94%20UI%20%C3%89quipes%20scopes%20managers.md) | UI Équipes / scopes managers                       | Équipes, rattachements, périmètres managers.                                                                                            | ❌ À faire (RFC rédigée) | Backend TEAM-005 livré ; UI à implémenter.       |
|    23 | RFC-FE-TEAM-005 | UI Affectations & staffing projet                  | Affectations depuis équipe et depuis projet.                                                                                            | ❌ À faire     | Dépend de TEAM-007 / 008.                        |
|    24 | RFC-FE-TEAM-006 | UI Saisie des temps                                | Saisie simple semaine / jour, ergonomie collaborateur, préremplissage depuis affectations.                                              | ❌ À faire     | UX critique.                                     |
|    25 | RFC-FE-TEAM-007 | UI Vue Manager                                     | Cockpit manager charge / capacité / alertes / drill-down.                                                                               | ❌ À faire     | Dépend de TEAM-011 / 013.                        |
|    26 | RFC-FE-TEAM-008 | UI Vue Collaborateur                               | Mon cockpit, mes affectations, mes temps, mes compétences, ma disponibilité.                                                            | ❌ À faire     | Dépend de TEAM-014.                              |
|    27 | RFC-FE-TEAM-009 | UI Matrice compétences & analytics                 | Matrice, couverture, tensions, comparatif prévu / réel, alertes staffing.                                                               | ❌ À faire     | Lot avancé cockpit.                              |

## Découpage recommandé par phases

| Phase   | RFCs                                                             | Objectif                         |
| ------- | ---------------------------------------------------------------- | -------------------------------- |
| Phase 1 | TEAM-001, TEAM-002, FE-TEAM-001, FE-TEAM-002                     | Socle collaborateurs             |
| Phase 2 | TEAM-003, TEAM-004, FE-TEAM-003                                  | Socle compétences                |
| Phase 3 | TEAM-005, TEAM-006, TEAM-007, TEAM-008, FE-TEAM-004, FE-TEAM-005 | Staffing et affectations         |
| Phase 4 | TEAM-009, TEAM-010, FE-TEAM-006                                  | Saisie et validation des temps   |
| Phase 5 | TEAM-011, TEAM-012, TEAM-013, TEAM-014, FE-TEAM-007, FE-TEAM-008 | Pilotage manager / collaborateur |
| Phase 6 | TEAM-015, TEAM-016, TEAM-017, TEAM-018, FE-TEAM-009              | Cockpit avancé et gouvernance    |

## Priorité produit conseillée

Si tu veux aller au plus utile, l’ordre le plus rentable est :

1. RFC-TEAM-002
2. RFC-TEAM-007
3. RFC-TEAM-008
4. RFC-TEAM-009
5. RFC-TEAM-011
6. RFC-TEAM-013
7. RFC-TEAM-014
8. RFC-TEAM-016

C’est ce chemin qui fait du module Équipes un vrai **cockpit de pilotage humain des projets et du SI**.
