Voici le bloc à ajouter dans le plan, idéalement après la section **Roadmap RFC — Organisation et droits par périmètre**.
Il reprend le format du plan ACL existant avec **RFC, objectif, priorité, état, dépendances et livrables**. 

---

## Tableau des RFC à développer — Organisation, Directions et droits OWN / SCOPE / ALL

| RFC             | Nom                                        | Objectif                                                     | Description                                                                                                     | Priorité | État            | Dépendances                           | Livrables principaux                                                                                                                                   |
| --------------- | ------------------------------------------ | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | -------- | --------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **RFC-ORG-001** | Socle organisation client                  | Créer le référentiel organisationnel client                  | Gérer les Directions, unités organisationnelles, groupes métier et rattachements `Resource HUMAN`               | P0       | ✅ Implémentée   | `Client`, `Resource`, RBAC existant   | `OrgUnit`, `OrgGroup`, memberships `Resource HUMAN`, API `/api/organization/*`, UI `/client/administration/organization`, permissions `organization.*` |
| **RFC-ORG-002** | Lien `ClientUser` ↔ `Resource HUMAN`       | Relier le compte applicatif à la personne métier             | Permettre au moteur d’accès de résoudre le `User` connecté vers sa `Resource HUMAN` dans le client actif        | P0       | 📝 À développer | RFC-ORG-001, `ClientUser`, `Resource` | Extension `ClientUser.resourceId`, service de liaison, endpoints, audit, UI d’administration                                                           |
| **RFC-ORG-003** | Propriété organisationnelle des ressources | Rattacher les ressources métier à une Direction propriétaire | Définir quelle Direction possède un budget, projet, contrat, fournisseur, objectif stratégique, etc.            | P0       | 📝 À développer | RFC-ORG-001                           | `ResourceOrgOwnership`, API ownership, responsable métier optionnel, validations `clientId`, audit                                                     |
| **RFC-ACL-015** | Permissions `OWN / SCOPE / ALL`            | Introduire les droits par périmètre                          | Ajouter les permissions `read_own`, `read_scope`, `read_all`, `write_scope`, `manage_all`, etc. par module      | P0       | 📝 À développer | RBAC existant                         | Permissions seedées, profils mis à jour, tests RBAC, documentation des mappings                                                                        |
| **RFC-ACL-016** | Résolution du scope organisationnel        | Calculer le périmètre d’un utilisateur sur une ressource     | Déterminer si l’utilisateur a un accès `OWN`, `SCOPE`, `ALL` ou aucun accès organisationnel                     | P0       | 📝 À développer | RFC-ORG-002, RFC-ORG-003, RFC-ACL-015 | `OrganizationScopeService`, résolution `User → Resource HUMAN → OrgUnit`, reasonCodes, tests unitaires                                                 |
| **RFC-ACL-017** | Politique d’accès ressource                | Gérer les modes `DEFAULT / RESTRICTIVE / SHARING`            | Sécuriser la transition entre ACL restrictive actuelle et ACL comme partage explicite                           | P1       | 📝 À développer | RFC-ACL-005, RFC-ACL-016              | `ResourceAccessPolicy`, API policy, compatibilité ACL existante, tests non-régression                                                                  |
| **RFC-ACL-018** | Moteur de décision cible                   | Combiner RBAC, scope organisationnel et ACL                  | Centraliser la décision d’accès : licence + module + visibilité + RBAC + `OWN/SCOPE/ALL/ACL`                    | P1       | 📝 À développer | RFC-ACL-016, RFC-ACL-017              | `AccessDecisionService`, `ResourceAccessDecisionGuard`, decorators, filtrage liste, contrôle détail/mutation                                           |
| **RFC-ACL-019** | Diagnostic enrichi organisation            | Expliquer pourquoi l’accès est autorisé ou refusé            | Ajouter les contrôles organisationnels dans la matrice des droits effectifs                                     | P1       | 📝 À développer | RFC-ACL-011, RFC-ACL-018              | `organizationScopeCheck`, `resourceOwnershipCheck`, `resourceAccessPolicyCheck`, UI diagnostic, `AccessExplainerPopover` enrichi                       |
| **RFC-ACL-020** | Intégration modules métier                 | Brancher la cible sur les modules réels                      | Appliquer progressivement le modèle aux Budgets, Projets, Contrats, Fournisseurs, Vision stratégique, Documents | P1       | 📝 À développer | RFC-ACL-018, RFC-ORG-003              | Ownership affiché, filtrage par scope, contrôle détail, contrôle mutation, tests anti-fuite                                                            |
| **RFC-ACL-021** | Cockpit droits cible                       | Donner une vue claire aux admins client                      | Afficher les ressources sans Direction, utilisateurs sans `Resource HUMAN`, partages ACL, conflits potentiels   | P2       | 📝 À développer | RFC-ACL-019, RFC-ACL-020              | UI `/client/administration/access-model`, KPI droits, alertes, filtres, actions correctives                                                            |
| **RFC-ACL-022** | Migration, backfill et feature flags       | Déployer sans casser l’existant                              | Préparer la reprise des données, les scripts de détection et l’activation progressive par module                | P1       | 📝 À développer | RFC-ORG-003, RFC-ACL-017              | Scripts de backfill, rapports d’écarts, feature flags, documentation de migration                                                                      |

---

## Vue synthétique par état

| État               | RFC concernées                                                  | Commentaire                                                  |
| ------------------ | --------------------------------------------------------------- | ------------------------------------------------------------ |
| ✅ Implémentée      | RFC-ORG-001                                                     | Socle organisationnel déjà disponible                        |
| 📝 À développer P0 | RFC-ORG-002, RFC-ORG-003, RFC-ACL-015, RFC-ACL-016              | Bloc indispensable pour calculer les droits organisationnels |
| 📝 À développer P1 | RFC-ACL-017, RFC-ACL-018, RFC-ACL-019, RFC-ACL-020, RFC-ACL-022 | Bloc moteur, diagnostic, intégration et migration            |
| 📝 À développer P2 | RFC-ACL-021                                                     | Cockpit d’administration et lisibilité avancée               |

---

## Ordre prioritaire recommandé

| Ordre | RFC             | Pourquoi                                                                                    |
| ----: | --------------- | ------------------------------------------------------------------------------------------- |
|     1 | **RFC-ORG-002** | Sans lien `User → Resource HUMAN`, impossible de calculer les droits `OWN` ou `SCOPE`       |
|     2 | **RFC-ORG-003** | Sans Direction propriétaire, impossible de savoir à quel périmètre appartient une ressource |
|     3 | **RFC-ACL-015** | Les permissions `OWN / SCOPE / ALL` doivent exister avant le moteur                         |
|     4 | **RFC-ACL-016** | Le service de résolution du scope est le cœur métier du modèle cible                        |
|     5 | **RFC-ACL-017** | Il faut sécuriser la transition entre ACL restrictive actuelle et ACL de partage            |
|     6 | **RFC-ACL-018** | Le moteur de décision cible peut ensuite être branché                                       |
|     7 | **RFC-ACL-019** | Le diagnostic doit expliquer les nouvelles décisions                                        |
|     8 | **RFC-ACL-020** | Intégration progressive module par module                                                   |
|     9 | **RFC-ACL-022** | Migration, backfill et feature flags pour déploiement contrôlé                              |
|    10 | **RFC-ACL-021** | Cockpit de pilotage une fois les données disponibles                                        |

---

## Spécifications détaillées (fichiers RFC)

Les RFC rédigées à partir de ce plan : [RFC-ORG-002](./RFC-ORG-002%20%E2%80%94%20Lien%20ClientUser%20%E2%86%94%20Resource%20HUMAN.md), [RFC-ORG-003](./RFC-ORG-003%20%E2%80%94%20Propri%C3%A9t%C3%A9%20organisationnelle%20des%20ressources.md), [RFC-ACL-015](./RFC-ACL-015%20%E2%80%94%20Permissions%20OWN%20SCOPE%20ALL.md) à [RFC-ACL-022](./RFC-ACL-022%20%E2%80%94%20Migration%20backfill%20et%20feature%20flags.md) ; socle déjà couvert par [RFC-ORG-001](./RFC-ORG-001%20%E2%80%94%20Socle%20Organisation%20Client.md). Index : [_RFC Liste.md](./_RFC%20Liste.md).
