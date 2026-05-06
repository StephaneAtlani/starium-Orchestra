# RFC-STRAT-010 — Vision stratégique V1 — Plan de tests et trajectoire de delivery

## Statut

🟡 En cours d’implémentation

## 1. Analyse de l’existant

Le plan de développement Vision stratégique détaille un séquencement par sprints, mais il n’est pas encore isolé dans une RFC de delivery/test exécutable et traçable.

## 2. Hypothèses éventuelles

- Les lots STRAT-007/008/009 sont la base fonctionnelle de la V1.
- La CI existante permet d’exécuter tests backend/frontend et lint.
- Les contrôles multi-client/RBAC sont bloquants en sortie de sprint.

## 3. Fichiers à créer / modifier

- `docs/RFC/RFC-STRAT-010 — Vision stratégique V1 — Plan de tests et trajectoire de delivery.md`
- `docs/RFC/_RFC Liste.md`
- `docs/API.md` (au fil des livraisons)

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

- API compile et tests backend passent.
- UI compile et tests frontend passent.
- Isolation inter-client vérifiée.
- Permissions vérifiées sur routes et actions UI.
- Aucun affichage d’ID brut dans l’interface.
- Documentation RFC/API à jour.

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
- gestion StrategicLink depuis le flux objectifs + invalidations KPI/alertes après mutation.

## 7. Récapitulatif final

Cette RFC transforme le plan stratégique en trajectoire de delivery testable, avec des gates qualité explicites et une sortie V1 mesurable.
Le lot frontend V1 est validé uniquement si le bug layout de la zone haute est corrigé **et** si les liens stratégiques + invalidations KPI/alertes sont opérationnels.

## 8. Points de vigilance

- Ne pas accepter de “done” sans tests multi-client et RBAC.
- Ne pas laisser dériver la doc RFC/API après implémentation.
- Contrôler les régressions UX sur la règle “valeur métier affichée”.
