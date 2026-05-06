# RFC-ACL-007 — Frontend administration ACL

## Statut

📝 Draft

## 1. Analyse de l’existant

Le besoin admin est multi-niveau (plateforme + client), mais les écrans de pilotage licences/abonnements/groupes/visibilité/ACL ne sont pas encore unifiés.

## 2. Hypothèses éventuelles

- Les écrans plateforme restent réservés `PLATFORM_ADMIN`.
- Les écrans client restent limités aux capacités `CLIENT_ADMIN`.
- La règle UI “valeur métier, jamais ID brut” est obligatoire.

## 3. Liste des fichiers à créer / modifier

- `apps/web/src/app/admin/clients/[clientId]/subscriptions/*`
- `apps/web/src/app/admin/clients/[clientId]/licenses/*`
- `apps/web/src/app/client/administration/licenses/*`
- `apps/web/src/app/client/administration/access-groups/*`
- `apps/web/src/app/client/administration/module-visibility/*`
- `apps/web/src/features/licenses/*`
- `apps/web/src/features/access-control/*`

## 4. Implémentation complète

- Créer pages plateforme :
  - `/admin/clients/[clientId]/subscriptions`
  - `/admin/clients/[clientId]/licenses`
- Créer pages client :
  - `/client/administration/licenses`
  - `/client/administration/access-groups`
  - `/client/administration/module-visibility`
- UI :
  - tableaux avec badges statut licence/abonnement ;
  - actions contextuelles selon permissions ;
  - formulaires avec validations explicites.
- Intégrer états `loading/error/empty/success`.
- Masquer les options de licence spéciale pour `CLIENT_ADMIN`.

## 5. Modifications Prisma si nécessaire

- Aucune directe (RFC orientée frontend).
- Dépend du contrat API livré par RFC-ACL-001 à 005.

## 6. Tests

- rendu conditionnel des actions selon rôle.
- aucun UUID affiché comme label principal.
- read-only masque/disable actions d’écriture.
- erreurs API affichées de manière actionnable.

## 7. Récapitulatif final

Cette RFC apporte le cockpit d’administration nécessaire pour opérer le modèle licences/ACL en production, côté plateforme et côté client.

## 8. Points de vigilance

- Ne pas coder de règles métier en dur dans l’UI.
- Mapper systématiquement `id -> label` sur toutes listes/sélecteurs.
- Assurer la cohérence entre navigation visible et droits effectifs backend.
