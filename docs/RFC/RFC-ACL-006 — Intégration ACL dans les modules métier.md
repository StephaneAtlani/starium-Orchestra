# RFC-ACL-006 — Intégration ACL dans les modules métier

## Statut

📝 Draft

## 1. Analyse de l’existant

Le moteur ACL générique cible RFC-ACL-005 n’apporte de valeur métier qu’une fois branché dans les modules réels (projets, budgets, contrats, documents, etc.).

## 2. Hypothèses éventuelles

- L’intégration se fait module par module avec feature flags si besoin.
- Chaque module garde son RBAC existant, l’ACL venant en surcouche.
- Les listes doivent filtrer les ressources restreintes non autorisées.

## 3. Liste des fichiers à créer / modifier

- `apps/api/src/modules/projects/*`
- `apps/api/src/modules/budgets/*`
- `apps/api/src/modules/contracts/*`
- `apps/api/src/modules/suppliers/*`
- `apps/api/src/modules/documents/*`
- `apps/api/src/modules/strategic-vision/*`
- tests module-scopés correspondants

## 4. Implémentation complète

- Brancher `AccessControlService` dans les services métier :
  - contrôle sur `getById` ;
  - contrôle sur mutations ;
  - filtrage listing.
- Appliquer `ResourceAclGuard` sur routes sensibles.
- Ajouter onglet/point d’entrée “Accès” par ressource côté UI progressivement.
- Définir mapping `resourceType` canonique par module (ex: `PROJECT`, `BUDGET`, `CONTRACT`).

## 5. Modifications Prisma si nécessaire

- Aucune nouvelle table si RFC-ACL-005 en place.
- Eventuellement ajouter indexes métier pour accélérer filtres ACL + client.

## 6. Tests

- liste module n’expose pas ressources restreintes sans droit.
- détail ressource restreinte sans ACL valide => `403`.
- mutation ressource restreinte sans droit WRITE/ADMIN => `403`.
- module sans ACL configurée conserve comportement historique.

## 7. Récapitulatif final

Cette RFC transforme le moteur ACL en capacité produit réelle, avec une intégration progressive et maîtrisée sur les modules cœur.

## 8. Points de vigilance

- Éviter les N+1 ACL sur listings volumineux (préchargement/sous-requête).
- Aligner tous les modules sur un vocabulaire `resourceType` stable.
- Prioriser modules à fort enjeu de confidentialité en premier.
