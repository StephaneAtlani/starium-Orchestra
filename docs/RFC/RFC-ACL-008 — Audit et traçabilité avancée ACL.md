# RFC-ACL-008 — Audit et traçabilité avancée ACL

## Statut

📝 Draft

## 1. Analyse de l’existant

Des audits existent déjà sur plusieurs modules, mais le périmètre licences/abonnements/ACL nécessite une nomenclature complète et homogène pour conformité et support.

## 2. Hypothèses éventuelles

- Le stockage audit existant est réutilisé (pas de nouveau moteur requis).
- Les événements sont normalisés par domaine (`client_subscription.*`, `resource_acl.*`, etc.).
- Les payloads audit doivent être exploitables pour diagnostic et reporting.

## 3. Liste des fichiers à créer / modifier

- `apps/api/src/modules/audit/*`
- modules `licenses`, `access-groups`, `module-visibility`, `access-control`
- `docs/API.md`
- `docs/runbooks/*` (si présent)

## 4. Implémentation complète

- Normaliser les actions audit listées dans le plan (création, update, activation, expiration, conversion, ACL entries...).
- Imposer payload minimum :
  - `clientId`, `actorUserId`, `targetUserId?`, `resourceType?`, `resourceId?`,
  - `oldValue`, `newValue`, `licenseType`, `licenseBillingMode`, `subscriptionId`,
  - `reason`, `requestId`, `ipAddress`, `userAgent`, `createdAt`.
- Ajouter filtres de consultation (client, action, date, cible).
- Journaliser explicitement les expirations automatiques et refus critiques.

## 5. Modifications Prisma si nécessaire

- Aucune si table `AuditLog` actuelle couvre le payload JSON.
- Sinon, ajouter index sur `(clientId, action, createdAt)` pour requêtes admin.

## 6. Tests

- chaque endpoint mutation licence/abonnement émet un audit.
- chaque mutation groupe/visibilité/ACL émet un audit.
- expiration automatique émet bien les événements `expired`.
- payload contient au minimum acteur, client, old/new.

## 7. Récapitulatif final

Cette RFC rend le système licences/ACL auditable de bout en bout, avec une base solide pour conformité, support et forensic.

## 8. Points de vigilance

- Ne jamais loguer de données sensibles inutiles.
- Conserver des actions stables dans le temps pour éviter la casse des dashboards.
- Garantir l’atomicité mutation + audit (transaction quand possible).
