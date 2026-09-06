# RFC-STRAT-010 — Vision stratégique V1 — Plan de tests et trajectoire de delivery

## Statut

✅ Implémentée (V1)

## 1. Analyse de l’existant

Le plan de développement Vision stratégique détaille un séquencement par sprints, mais il n’est pas encore isolé dans une RFC de delivery/test exécutable et traçable.

## 2. Hypothèses éventuelles

- Les lots STRAT-007/008/009 sont la base fonctionnelle de la V1.
- La CI existante permet d’exécuter tests backend/frontend et lint.
- Les contrôles multi-client/RBAC sont bloquants en sortie de sprint.

## 3. Fichiers à créer / modifier

- `docs/RFC/RFC-STRAT-010 — Vision stratégique V1 — Plan de tests et trajectoire de delivery.md`
- `docs/RFC/_RFC Liste.md`
- `docs/API.md` (§5.5a liens objectifs)
- `docs/LIAISONS-MODULES.md` (`vision-project` / write V1)
- `docs/BACKLOG-RESTE-A-FAIRE.md` (B0.4)
- `docs/ROADMAP-V1-BETA.md` (Vague 0)

## 4. Implémentation complète

### 4.1 Séquencement recommandé

Sprint 1 :

- vérification modèles existants ;
- compléments Prisma/DTO/service/controller ;
- validation RBAC `strategic_vision`.

Sprint 2 :

- CRUD vision/axes/objectifs ;
- archivage logique ;
- audit logs ;
- tests d’isolation client.

Sprint 3 :

- endpoint `/kpis` ;
- endpoint `/alerts` ;
- tests de calculs.

Sprint 4 :

- route `/strategic-vision` ;
- cockpit overview ;
- KPI cards ;
- panel alertes.

Sprint 5 :

- formulaires vision/axes/objectifs ;
- filtres ;
- permissions UI.

Sprint 6 :

- matrice d’alignement ;
- gestion `StrategicLink`.

Sprint 7 :

- stabilisation UX ;
- vérification RBAC end-to-end ;
- documentation API/module.

### 4.2 Critères de sortie V1

- [x] API compile et tests backend passent.
- [x] UI compile et tests frontend passent.
- [x] Isolation inter-client vérifiée (create/list lien PROJECT ; refus projet/objectif hors client).
- [x] Permissions vérifiées sur routes et actions UI.
- [x] Aucun affichage d’ID brut dans l’interface (`pnpm audit:ui-ids`).
- [x] Documentation RFC/API à jour.
- [x] Layout cockpit `/strategic-vision` (zone haute visible).
- [x] StrategicLink **PROJECT** créable depuis panneau Liens (mode Projet | Manuel).
- [x] Parcours **Aligner** depuis projets non alignés (`StariumModal` + objectif).
- [x] Invalidations KPI / alertes / objectives après add/remove lien (+ create/update axe).
- [x] `pnpm audit:modals` vert (dialog non alignés en `StariumModal`).

## 5. Modifications Prisma si nécessaire

Sans objet spécifique dans cette RFC (dépend des RFC STRAT-007/008).

## 6. Tests

### 6.1 Backend (obligatoires)

- création vision avec client actif ;
- refus sans client actif ;
- refus sans permissions ;
- filtrage strict par `clientId` ;
- rejet accès cross-client ;
- création axe/objectifs sur bon périmètre ;
- calcul KPI correct ;
- génération alertes correcte ;
- archivage logique ;
- audit logs émis.

### 6.2 Frontend (obligatoires)

- états `loading/error/empty/success` ;
- rendu KPI/vision/axes/objectifs ;
- actions visibles selon permissions ;
- query keys avec `clientId` ;
- invalidation mutation ;
- aucun ID brut affiché.
- correction layout cockpit : zone haute visible (breadcrumb, titre, badge, sous-titre, onglets, actions) sans recouvrement par le header global ;
- gestion StrategicLink **PROJECT** depuis le panneau Liens (mode Projet | Manuel) + parcours **Aligner** (projets non alignés) ;
- invalidations KPI/alertes/objectives après mutation de lien.

## 7. Récapitulatif final / gate V1

Cette RFC transforme le plan stratégique en trajectoire de delivery testable, avec des gates qualité explicites et une sortie V1 mesurable.

**Gate 10/10 (clôturée)** :

- [x] Lien PROJECT créable depuis le panneau Liens.
- [x] Lien PROJECT créable depuis **Aligner** sur un projet non aligné.
- [x] KPI + alertes refresh après add/remove (invalidations prouvées par test).
- [x] Tests FE payload + labels ; tests API cross-client.
- [x] Dialog en `StariumModal` ; `audit:modals` + `audit:ui-ids` verts.
- [x] RFC-STRAT-010 + index + backlog B0.4 → Implémentée.

Le lot frontend V1 est validé : bug layout zone haute corrigé, liens stratégiques PROJECT + invalidations KPI/alertes opérationnels.

## 8. Points de vigilance

- Ne pas accepter de “done” sans tests multi-client et RBAC.
- Ne pas laisser dériver la doc RFC/API après implémentation.
- Contrôler les régressions UX sur la règle “valeur métier affichée”.
