# RFC-ACL-006 — Intégration ACL dans les modules métier

## Statut

✅ Implémentée (backend V1)

## 1. Analyse de l’existant

Le moteur ACL générique cible RFC-ACL-005 n’apporte de valeur métier qu’une fois branché dans les modules réels (projets, budgets, contrats, documents, etc.).

## 2. Décisions V1 implémentées

- Chaque module garde son RBAC existant, l’ACL venant en surcouche.
- Les listes filtrent les ressources restreintes non autorisées via helper batch.
- Aucun N+1 ACL (`canReadResource` item par item) sur les listes principales.
- Les sous-ressources n’ont pas d’ACL propre en V1 : elles héritent du parent métier.
- Pas d’UI ACL dans ce lot (hors scope RFC-ACL-007).

## 3. Liste des fichiers à créer / modifier

- `apps/api/src/modules/access-control/resource-acl.constants.ts`
- `apps/api/src/modules/access-control/access-control.service.ts`
- `apps/api/src/modules/access-control/access-control.service.spec.ts`
- `apps/api/src/modules/projects/*` (dont `projects.service.ts`, `project-documents.service.ts`, wiring module/controller)
- `apps/api/src/modules/budget-management/*` (budgets + budget-lines + module)
- `apps/api/src/modules/contracts/*` (contracts + contract-attachments + module)
- `apps/api/src/modules/procurement/suppliers/*` + `apps/api/src/modules/procurement/procurement.module.ts`
- `apps/api/src/modules/strategic-vision/*` (service/controller/module)
- tests unitaires module-scopés concernés

## 4. Implémentation complète

- Extension whitelist `resourceType` ACL : `CONTRACT`, `SUPPLIER` ajoutés.
- Mapping canonique V1 appliqué :
  - `projects` => `PROJECT` / `project.id`
  - `budgets` => `BUDGET` / `budget.id`
  - `contracts` => `CONTRACT` / `contract.id`
  - `suppliers` => `SUPPLIER` / `supplier.id`
  - `strategic objectives` => `STRATEGIC_OBJECTIVE` / `objective.id`
- Ajout d’un helper batch `filterReadableResourceIds(...)` dans `AccessControlService`.
- Intégration module par module :
  - **Projects** : list/read/update/delete protégés ACL.
  - **Budgets** : list/read/update protégés ACL, pagination/total cohérents sur ressources lisibles.
  - **Budget-lines** : ACL héritée du budget parent.
  - **Contracts** : list/read/update/terminate protégés ACL.
  - **Suppliers** : list/read/update/archive + logo read/write/delete protégés ACL.
  - **Project-documents** : ACL héritée du projet parent.
  - **Contract-attachments** : ACL héritée du contrat parent.
  - **Strategic vision** : ACL appliquée uniquement à `STRATEGIC_OBJECTIVE` (pas d’ACL globale vision/axes).
- Ordre de contrôle sous-ressource implémenté : charger parent client-scopé -> vérifier ACL parent -> accéder à la sous-ressource.

## 5. Modifications Prisma si nécessaire

- Aucune nouvelle table si RFC-ACL-005 en place.
- Eventuellement ajouter indexes métier pour accélérer filtres ACL + client.

## 6. Tests

- Helper batch ACL couvert (`access-control.service.spec.ts`) avec assertion anti N+1.
- Suites ciblées vertes après intégration :
  - `access-control.service.spec.ts`
  - `projects.service.spec.ts`
  - `budget-management/tests/budgets.service.spec.ts`
  - `budget-management/tests/budget-lines.service.spec.ts`
  - `contracts.service.spec.ts`
  - `procurement/suppliers/suppliers.service.spec.ts`
  - `strategic-vision.service.spec.ts`

## 7. Récapitulatif final

Cette RFC transforme le moteur ACL générique en capacité métier réellement utilisée sur les modules cœur backend, avec filtrage batch, héritage des sous-ressources et cohérence multi-client/RBAC conservée.

## 8. Points de vigilance

- Maintenir l’interdiction du N+1 ACL sur listes volumineuses.
- Conserver l’alignement strict du mapping `resourceType`.
- En V1, ne pas dériver vers une ACL propre aux sous-ressources documentaires sans RFC dédiée.
- Toute évolution UI ACL reste hors périmètre (RFC-ACL-007).
