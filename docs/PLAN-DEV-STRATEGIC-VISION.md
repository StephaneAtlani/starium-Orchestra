# PLAN-DEV-STRATEGIC-VISION

## Phase 0 — Cadrage produit

### Objectif
Aligner la vision produit du module Strategic Vision comme cockpit de pilotage (et non canvas libre).

### Tâches
- Clarifier les personas cibles (DSI, CODIR, fonctions support).
- Fixer les outcomes MVP (alignement projets/objectifs).
- Valider les frontières du module avec projets/budgets/risques.
- Formaliser les KPIs et alertes prioritaires.

### Fichiers probables à modifier/créer
- `docs/RFC/RFC-STRAT-001 — Strategic Vision Core Backend.md`
- `docs/RFC/RFC-STRAT-002 — Strategic Vision KPI and Alignment Engine.md`
- `docs/RFC/RFC-STRAT-003 — Strategic Vision Frontend UI.md`
- `docs/RFC/RFC-STRAT-004 — Strategic Vision Alerts and CODIR Widgets.md`

### Dépendances
- Vision produit Starium.
- Contraintes architecture multi-client existantes.

### Critères de sortie
- Cadrage fonctionnel explicite et partagé.
- Non-ambiguïté sur "cockpit stratégique" vs "moodboard".

### Risques
- Dérive vers un outil de présentation visuelle sans pilotage.
- Flou sur la valeur métier attendue du MVP.

---

## Phase 1 — RFC validation

### Objectif
Valider les RFC STRAT pour verrouiller périmètre, architecture, API, KPI, UX.

### Tâches
- Revue croisée backend/frontend/produit.
- Validation des règles multi-tenant et permissions.
- Arbitrage final sur hors scope MVP.
- Validation des critères d'acceptation par RFC.

### Fichiers probables à modifier/créer
- `docs/RFC/RFC-STRAT-001 — Strategic Vision Core Backend.md`
- `docs/RFC/RFC-STRAT-002 — Strategic Vision KPI and Alignment Engine.md`
- `docs/RFC/RFC-STRAT-003 — Strategic Vision Frontend UI.md`
- `docs/RFC/RFC-STRAT-004 — Strategic Vision Alerts and CODIR Widgets.md`
- `docs/RFC/_RFC Liste.md`

### Dépendances
- Phase 0 terminée.

### Critères de sortie
- RFC validées avec statut explicite (draft/ready).
- API, modèles, KPI et UX cohérents entre eux.

### Risques
- Contradictions entre RFC backend et frontend.
- Validation incomplète des règles tenant/permissions.

---

## Phase 2 — Modèle de données Prisma

### Objectif
Concevoir le schéma cible des entités Strategic Vision.

### Tâches
- Définir les modèles `StrategicVision`, `StrategicAxis`, `StrategicObjective`, `StrategicLink`.
- Définir les enums `StrategicObjectiveStatus`, `StrategicLinkType`.
- Définir contraintes d'intégrité et index.
- Préparer l'extensibilité `BUDGET`/`RISK` sans activation MVP.

### Fichiers probables à modifier/créer
- `apps/api/prisma/schema.prisma` (phase d'implémentation)
- `docs/RFC/RFC-STRAT-001 — Strategic Vision Core Backend.md`

### Dépendances
- RFC-STRAT-001 validée.

### Critères de sortie
- Modèle Prisma cible validé.
- Contraintes multi-client et relationnelles documentées.

### Risques
- Mauvaise cardinalité entre vision/axes/objectifs.
- Risque de duplication métier via `StrategicLink`.

---

## Phase 3 — Backend core

### Objectif
Implémenter le socle API Strategic Vision (vision, axes, objectifs, liens).

### Tâches
- Créer module NestJS Strategic Vision.
- Implémenter endpoints CRUD MVP définis.
- Appliquer guards standards et RBAC.
- Garantir scoping `clientId` dérivé du client actif.
- Activer uniquement `StrategicLinkType.PROJECT`.

### Fichiers probables à modifier/créer
- `apps/api/src/modules/strategic-vision/strategic-vision.module.ts`
- `apps/api/src/modules/strategic-vision/strategic-vision.controller.ts`
- `apps/api/src/modules/strategic-vision/strategic-vision.service.ts`
- `apps/api/src/modules/strategic-vision/dto/*`
- `docs/RFC/RFC-STRAT-001 — Strategic Vision Core Backend.md`

### Dépendances
- Phase 2 validée.

### Critères de sortie
- Endpoints MVP opérationnels et sécurisés.
- Règles une vision active/client respectées.

### Risques
- Fuite inter-client par filtre incomplet.
- Acceptation erronée de `clientId` dans payload.

---

## Phase 4 — KPI alignment engine

### Objectif
Implémenter les KPI MVP d'alignement stratégique côté backend.

### Tâches
- Implémenter `GET /api/strategic-vision/kpis`.
- Implémenter règles de calcul et exclusions archivés.
- Documenter contrat de réponse typé.
- Optimiser les requêtes (agrégations/index).

### Fichiers probables à modifier/créer
- `apps/api/src/modules/strategic-vision/strategic-kpi.service.ts`
- `apps/api/src/modules/strategic-vision/strategic-kpi.controller.ts`
- `apps/api/src/modules/strategic-vision/dto/strategic-kpis-response.dto.ts`
- `docs/RFC/RFC-STRAT-002 — Strategic Vision KPI and Alignment Engine.md`

### Dépendances
- Phase 3 validée.

### Critères de sortie
- Les 5 KPI MVP sont disponibles et fiables.
- Calcul 100% backend, frontend consommateur simple.

### Risques
- Perf dégradée sans index adaptés.
- Désalignement entre règle métier RFC et implémentation.

---

## Phase 5 — Audit logs

### Objectif
Tracer toutes les mutations sensibles du module.

### Tâches
- Ajouter événements d'audit Strategic Vision.
- Journaliser création, mise à jour, changements de statut, gestion des liens.
- Harmoniser format avec audit log platform.

### Fichiers probables à modifier/créer
- `apps/api/src/modules/strategic-vision/*.service.ts`
- `apps/api/src/modules/audit/*` (ou service audit partagé)
- `docs/RFC/RFC-STRAT-001 — Strategic Vision Core Backend.md`

### Dépendances
- Phases 3 et 4.

### Critères de sortie
- Chaque mutation sensible émet un audit log.
- Payload d'audit contient `actorUserId`, `clientId`, cible, action.

### Risques
- Événements manquants sur certains flux.
- Sur-logging non pertinent ou incohérent.

---

## Phase 6 — Frontend UI

### Objectif
Livrer l'UI `/strategic-vision` orientée cockpit décisionnel.

### Tâches
- Implémenter structure de page et composants clés.
- Brancher hooks/query keys tenant-aware.
- Ajouter états loading/error/empty.
- Ajouter gates permissions sur actions.
- Afficher des valeurs métier (jamais ID brut).

### Fichiers probables à modifier/créer
- `apps/web/src/app/strategic-vision/page.tsx`
- `apps/web/src/features/strategic-vision/*`
- `apps/web/src/services/strategic-vision.ts`
- `apps/web/src/lib/query-keys/strategic-vision-query-keys.ts`
- `docs/RFC/RFC-STRAT-003 — Strategic Vision Frontend UI.md`

### Dépendances
- Phases 3 et 4.

### Critères de sortie
- Cockpit stratégique lisible et tenant-aware.
- Pas de logique métier critique dans le frontend.

### Risques
- Régression UX avec affichage d'IDs techniques.
- Invalidation cache incomplète entre clients.

---

## Phase 7 — Linking projets

### Objectif
Stabiliser et fiabiliser les liens `PROJECT` entre objectifs et exécution.

### Tâches
- Finaliser endpoints d'ajout/suppression de liens.
- Valider existence/propriété client des projets liés.
- Prévenir doublons de liens.
- Exposer restitutions lisibles (labels).

### Fichiers probables à modifier/créer
- `apps/api/src/modules/strategic-vision/strategic-links.service.ts`
- `apps/api/src/modules/strategic-vision/strategic-links.controller.ts`
- `apps/web/src/features/strategic-vision/StrategicLinksPanel.tsx`
- `docs/RFC/RFC-STRAT-001 — Strategic Vision Core Backend.md`

### Dépendances
- Phase 3.

### Critères de sortie
- Lien projet robuste, sans duplication métier.
- Règles clientId strictement respectées.

### Risques
- Liens orphelins si suppression côté projet non gérée.
- Rupture d'alignement si labels non cohérents.

---

## Phase 8 — Alertes/widgets CODIR

### Objectif
Intégrer les signaux stratégiques dans le cockpit CODIR global.

### Tâches
- Définir endpoints d'alertes stratégiques.
- Brancher widgets CODIR Strategic Vision.
- Garantir backend-driven metrics/alerts.
- Vérifier non-duplication avec autres modules cockpit.

### Fichiers probables à modifier/créer
- `apps/api/src/modules/strategic-vision/strategic-alerts.service.ts`
- `apps/api/src/modules/strategic-vision/strategic-alerts.controller.ts`
- `apps/web/src/features/cockpit/widgets/strategic-*`
- `docs/RFC/RFC-STRAT-004 — Strategic Vision Alerts and CODIR Widgets.md`

### Dépendances
- Phases 4 et 6.

### Critères de sortie
- Widgets Strategic Alignment / At Risk / Unaligned / Drift disponibles.
- Aucune logique de calcul côté frontend.

### Risques
- Incohérence entre KPI et widgets.
- Surcharge visuelle du cockpit CODIR.

---

## Phase 9 — Tests

### Objectif
Valider robustesse métier, sécurité et isolation multi-client.

### Tâches
- Tests unitaires services backend Strategic Vision.
- Tests intégration endpoints + guards + permissions.
- Tests isolation inter-client (lecture/écriture).
- Tests frontend flows principaux et états UI.
- Tests non-régression KPI.

### Fichiers probables à modifier/créer
- `apps/api/src/modules/strategic-vision/**/*.spec.ts`
- `apps/web/src/features/strategic-vision/**/*.test.tsx`
- `docs/RFC/RFC-STRAT-001 — Strategic Vision Core Backend.md`
- `docs/RFC/RFC-STRAT-002 — Strategic Vision KPI and Alignment Engine.md`

### Dépendances
- Phases 3 à 8.

### Critères de sortie
- Couverture des scénarios critiques validée.
- Aucun cas de fuite inter-client.

### Risques
- Faux positifs sur tests multi-tenant mal isolés.
- Couverture insuffisante des statuts objectifs.

---

## Phase 10 — Préparation V2

### Objectif
Préparer l'extension budget/risque et arbitrage CODIR avancé.

### Tâches
- Activer plan d'extension `StrategicLinkType.BUDGET` et `RISK`.
- Cadrer nouveaux KPI : `budgetAlignmentRate`, `riskCoverageRate`, `strategicDriftScore`.
- Cadrer règles d'arbitrage CODIR multi-axes.
- Préparer trajectoire de compatibilité API (extension additive).

### Fichiers probables à modifier/créer
- `docs/RFC/RFC-STRAT-001 — Strategic Vision Core Backend.md`
- `docs/RFC/RFC-STRAT-002 — Strategic Vision KPI and Alignment Engine.md`
- `docs/RFC/RFC-STRAT-004 — Strategic Vision Alerts and CODIR Widgets.md`
- `docs/PLAN-DEV-STRATEGIC-VISION.md`

### Dépendances
- MVP validé (phases 0 à 9).

### Critères de sortie
- Backlog V2 priorisé et séquencé.
- Contrats MVP compatibles avec extensions V2.

### Risques
- Dette de design si anticipations V2 insuffisantes.
- Couplage excessif entre modules stratégie/budget/risque.

---

## Contraintes MVP rappelées

- Le MVP implémente uniquement le lien `PROJECT` dans `StrategicLink`.
- `BUDGET` et `RISK` sont prévus/documentés mais non développés en MVP.
- Le backend reste source de vérité.
- Le frontend ne porte pas de logique métier critique.
