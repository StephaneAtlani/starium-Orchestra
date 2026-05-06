# RFC-ACL-011 — Matrice des droits effectifs

## Statut

📝 Draft

## 1. Analyse de l’existant

Quand un accès est refusé, l’admin ne sait pas rapidement quelle couche bloque (`licence`, `module`, `visibilité`, `RBAC`, `ACL`). Il faut une vue diagnostic explicite.

## 2. Hypothèses éventuelles

- Le backend expose un endpoint diagnostic consolidé.
- La matrice est disponible aux profils autorisés seulement (admin/supervision).
- Le diagnostic n’outrepasse jamais les règles de confidentialité.

## 3. Liste des fichiers à créer / modifier

- `apps/api/src/modules/access-diagnostics/*`
- `apps/api/src/modules/licenses/*`
- `apps/api/src/modules/module-visibility/*`
- `apps/api/src/modules/access-control/*`
- `apps/web/src/features/access-diagnostics/*`

## 4. Implémentation complète

- Endpoint diagnostic (exemple) :
  - `GET /api/access-diagnostics/effective-rights?userId=...&resourceType=...&resourceId=...`
- Réponse consolidée :
  - `licenseCheck`, `subscriptionCheck`, `moduleActivationCheck`, `moduleVisibilityCheck`, `rbacCheck`, `aclCheck`
  - `finalDecision` + `denialReasons[]`.
- UI matrice :
  - une ligne par couche ;
  - statut pass/fail ;
  - détail textuel exploitable.

## 5. Modifications Prisma si nécessaire

- Aucune structure obligatoire.
- Optionnel : persistance de snapshots diagnostic si besoin support avancé.

## 6. Tests

- renvoie `allowed` quand toutes couches valides.
- renvoie `denied` avec raison exacte quand une couche échoue.
- priorise la raison la plus bloquante (message stable).
- interdit cross-client sur diagnostic.

## 7. Récapitulatif final

Cette RFC crée une matrice de vérité des droits effectifs, utile pour support, admin et réduction des tickets “pourquoi 403”.

## 8. Points de vigilance

- Garder des messages de refus stables et traduisibles.
- Éviter d’exposer des détails sensibles à des profils non autorisés.
- Bien versionner le contrat de diagnostic (consommé par UI et support).
