Document de **cadrage et ordre de livraison** pour le socle organisationnel client et la chaîne **OWN / SCOPE / ALL** (permissions, résolution de scope, moteur d’accès, diagnostic, migration). Les états **État** reflètent le dépôt au moment de la dernière mise à jour documentaire (**2026-05**) ; source de vérité détaillée : chaque RFC et le code sous `apps/api/` / `apps/web/`.

> **Licences SaaS (sièges)** : hors tableau ci-dessous — voir [_plan_developpement_licences_abonnements_acl_starium.md](./_plan_developpement_licences_abonnements_acl_starium.md) (ACL-001…012). **Licences IT métier** : [RFC-037](./RFC-037%20%E2%80%94%20Gestion%20des%20licences%20et%20liaison%20native%20aux%20contrats.md) (draft, module Pilotage).

---

## Tableau des RFC — Organisation, Directions et droits OWN / SCOPE / ALL

| RFC             | Nom                                        | Objectif                                                     | Description                                                                                                     | Priorité | État            | Dépendances                           | Livrables principaux                                                                                                                                   |
| --------------- | ------------------------------------------ | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | -------- | --------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **RFC-ORG-001** | Socle organisation client                  | Créer le référentiel organisationnel client                  | Gérer les Directions, unités organisationnelles, groupes métier et rattachements `Resource HUMAN`               | P0       | ✅ Implémentée   | `Client`, `Resource`, RBAC existant   | `OrgUnit`, `OrgGroup`, memberships `Resource HUMAN`, API `/api/organization/*`, UI `/client/administration/organization`, permissions `organization.*` |
| **RFC-ORG-002** | Lien `ClientUser` ↔ `Resource HUMAN`       | Relier le compte applicatif à la personne métier             | Permettre au moteur d’accès de résoudre le `User` connecté vers sa `Resource HUMAN` dans le client actif        | P0       | ✅ Implémentée (MVP) | RFC-ORG-001, `ClientUser`, `Resource` | Extension `ClientUser.resourceId`, API catalogue + PATCH client/plateforme, audit, UI membres + Admin Studio ; backfill données → **RFC-ACL-023**                                                           |
| **RFC-ORG-003** | Propriété organisationnelle des ressources | Rattacher les ressources métier à une Direction propriétaire | Définir quelle unité `OrgUnit` possède un budget, projet, contrat, fournisseur, objectif stratégique, etc. (V1 : colonnes `ownerOrgUnitId`, pas de table polymorphe) | P0       | ✅ V1 livrée (socle données + API + audits + UI minimale) | RFC-ORG-001                           | `ownerOrgUnitId` sur Project/Budget/BudgetLine/Supplier/SupplierContract/StrategicObjective ; `ownerOrgUnitSummary` ; ligne : effectif + `ownerOrgUnitSource` ; archivage `OrgUnit` ; audits ownership ; sélecteur FE ; **V2** → **RFC-ORG-004** |
| **RFC-ORG-004** | Steward, transfert et obligation ownership | Gouvernance avancée de la propriété organisationnelle        | Responsable métier (`steward`), transfert massif audité, politique d’obligation `ownerOrgUnitId` par client      | P1       | ✅ V1 livrée (steward API/UI hors Projet : extension) | RFC-ORG-003 V1, RFC-ACL-022           | `ClientOrgOwnershipPolicy`, `GET|PATCH …/ownership-policy`, `POST …/ownership-transfers`, `organization.ownership.transfer`, flag `ORG_OWNERSHIP_REQUIRED`, wizard admin ; steward `stewardSummary` **Projet** |
| **RFC-ACL-015** | Permissions `OWN / SCOPE / ALL`            | Introduire les droits par périmètre                          | Codes seedés + règles `satisfiesPermission` (guards restrictifs avant 016/018) ; `GET /me/permissions` + hints UI ; diagnostics `seededNotEnforced` ; seed modules budgets/projects/procurement      | P0       | 🟡 Socle livré (partiel) | RBAC existant                         | Package `packages/rbac-permissions`, Prisma seed, tests ; profils **conservent** les permissions legacy pour routes non filtrées — généralisation → **RFC-ACL-024**                                                                 |
| **RFC-ACL-016** | Résolution du scope organisationnel        | Calculer le périmètre d’un utilisateur sur une ressource     | Déterminer si l’utilisateur a un accès `OWN`, `SCOPE`, `ALL` ou aucun accès organisationnel                     | P0       | 🟡 Service livré — **consommé par 018/020** | RFC-ORG-002, RFC-ORG-003, RFC-ACL-015 | `OrganizationScopeService` ; actif sur modules **020** si flag `ACCESS_DECISION_V2_*` ; diagnostic **019** si enrichi                                                 |
| **RFC-ACL-017** | Politique d’accès ressource                | Gérer les modes `DEFAULT / RESTRICTIVE / SHARING`            | Sécuriser la transition entre ACL restrictive actuelle et ACL comme partage explicite                           | P1       | ✅ V1 livrée (Prisma + `AccessControlService` + API + UI éditeur) | RFC-ACL-005, RFC-ACL-016              | `ResourceAccessPolicy`, `PATCH …/access-policy`, champs liste `accessPolicy` / `effectiveAccessMode`, audit `resource_access_policy.changed`, tests ; **consommation moteur** : `evaluateResourceAccess` / **`evaluateResourceAccessBatch`** (plancher SHARING **par ressource**) via **RFC-ACL-018**                                                                  |
| **RFC-ACL-018** | Moteur de décision cible                   | Combiner RBAC, scope organisationnel et ACL                  | Centraliser la décision d’accès : licence + module + visibilité + RBAC + org (016) + matrice **017** + ACL                    | P1       | ✅ Implémentée | RFC-ACL-016, RFC-ACL-017              | Module `access-decision` ; extension modules + write/admin via **020** ; guard HTTP → **RFC-ACL-025**                                           |
| **RFC-ACL-019** | Diagnostic enrichi organisation            | Expliquer pourquoi l’accès est autorisé ou refusé            | Aligner la **lecture** (`operation=read`) sur `AccessDecisionService.decide` sous garde-fous ; six couches + `evaluationMode` ; blocs org / ownership / policy avec `enforcedForIntent` ; self `controls` étendus ; messages FR ; **sans** flag, contrat JSON inchangé                                     | P1       | ✅ **V1 livrée** (activation `ACCESS_DIAGNOSTICS_ENRICHED` = `true` \| `1` uniquement) | RFC-ACL-011, RFC-ACL-018              | Flag enrichi ; write/admin via moteur si enrichi + flag module **020** ; registre `BUDGET_LINE`                       |
| **RFC-ACL-020** | Intégration modules métier                 | Brancher la cible sur les modules réels                      | Généraliser **018** : write/admin sur le moteur, Budgets, Contrats, Fournisseurs, Vision stratégique, etc. (lecture Projets déjà en **018 V1**) | P1       | ✅ Code livré — **activation prod couplée 022** | RFC-ACL-018, RFC-ORG-003              | Moteur + flags par module ; UI ownership ; tests anti-fuite ; [runbook](../runbooks/migration-org-scope-access.md)                                                            |
| **RFC-ACL-021** | Cockpit droits cible                       | Donner une vue claire aux admins client                      | Afficher les ressources sans Direction, utilisateurs sans `Resource HUMAN`, partages ACL, conflits potentiels   | P2       | ✅ V1 livrée | RFC-ACL-019, RFC-ACL-020              | Module `access-model`, API health/issues, permission `access_model.read`, UI `/client/administration/access-model` ; **V2** → **RFC-ACL-026**                                                            |
| **RFC-ACL-022** | Migration, backfill et feature flags       | Déployer sans casser l’existant                              | Préparer la reprise des données, les scripts de détection et l’activation progressive par module                | P1       | ✅ Socle livré — **rollout client à planifier** | RFC-ORG-003, RFC-ACL-017              | `ClientFeatureFlag`, CLI `backfill-owner-org-unit`, runbook ; pas d’activation flag sans backfill module ; backfill HUMAN → **RFC-ACL-023**                                                                 |
| **RFC-ACL-023** | Backfill `ClientUser` ↔ HUMAN              | Rattacher en masse les comptes aux fiches collaborateurs       | CLI idempotent + CSV d’écarts ; prérequis rollout OWN/SCOPE                                                      | P0       | ✅ Implémentée   | RFC-ORG-002                           | `backfill-client-user-human-resource.ts`, matcher/runner, audit batch, runbook §0                                                                       |
| **RFC-ACL-024** | Enforcement permissions scoped             | Rendre effectifs les codes `*_own` / `*_scope` / `*_all`       | Registre intentions + guards scope-aware (V1) ; migration profils documentée ; extension catalogue / satellites hors V1 | P1       | ✅ V1 livrée     | RFC-ACL-015, 018, 020, 022            | `@RequireAccessIntent`, `SERVICE_ENFORCED_REGISTRY`, `FeatureFlagsModule` @Global, `/me/permissions` + `hasIntent` ; runbook §6 ; suite **025** (guard resourceId) |
| **RFC-ACL-025** | Guards HTTP moteur unifié                  | Sécuriser la couche HTTP avec `ResourceAccessDecisionGuard`    | Adoption progressive sur routes détail/mutations des modules 020                                                 | P2       | 📝 Draft         | RFC-ACL-018, 020, 022                 | `@AccessDecision` + guard sur controllers ; tests IDOR                                                                                                   |
| **RFC-ACL-026** | Cockpit modèle d’accès V2                  | Exporter et piloter le rollout                                 | Export CSV issues, checklist rollout, heuristiques post-backfill                                                 | P2       | 📝 Draft         | RFC-ACL-021, 022, 023                 | `GET …/issues/export`, UI checklist, audits export                                                                                                       |

---

## Vue synthétique par état

| État               | RFC concernées                                                  | Commentaire                                                  |
| ------------------ | --------------------------------------------------------------- | ------------------------------------------------------------ |
| ✅ Implémentée      | RFC-ORG-001, RFC-ORG-002, **RFC-ORG-003 (V1)**, **RFC-ORG-004 (V1)** | Socle organisationnel + lien membre ↔ fiche HUMAN ; **Direction propriétaire** ; transfert massif, policy obligation, steward (API complète **Projet**) |
| 📝 Draft (tranche 2) | **RFC-ACL-025**, **RFC-ACL-026** | Guards HTTP resourceId, cockpit exports V2 |
| ✅ V1 livrée P1 | **RFC-ACL-024** | Guards scope-aware, registre handlers, `accessDecisionV2` sur `/me/permissions` ; satellites hors V1 |
| 🟡 Service livré P0 | **RFC-ACL-016**                           | **`OrganizationScopeService`** livré + tests ; **appliqué** dans le pipeline **RFC-ACL-018** pour **lecture + liste Projets** ; verdict et raisons **visibles dans le diagnostic** lorsque **RFC-ACL-019** est activé (`ACCESS_DIAGNOSTICS_ENRICHED`) |
| 🟡 Socle P0 livré  | **RFC-ACL-015**                           | Vocabulaire permissions périmètre + satisfaction RBAC + `/me` + diagnostics — enforcement routes V1 livré par **RFC-ACL-024** |
| ✅ V1 livrée P1 (flag) | **RFC-ACL-019**                      | Diagnostic enrichi derrière **`ACCESS_DIAGNOSTICS_ENRICHED`** ; `finalDecision` **read** = moteur **018** si garde-fous OK ; blocs org / ownership / policy ; UI matrice + `AccessExplainerPopover` |
| ✅ Code livré P1 | RFC-ACL-020, RFC-ACL-022 | Rollout **par client** : backfill owner (**022**) → backfill HUMAN recommandé (**023**) → flag `ACCESS_DECISION_V2_*` → smoke (cf. runbook) |
| ✅ V1 livrée P1 | **RFC-ACL-017**, **RFC-ACL-018** (lecture pilote Projets) | **017** : politique + API + UI + batch policy/ACL. **018** : même pipeline que 016+017 (`sharingFloorAllows = floorAllowed`), `filterResourceIdsByAccess` sur les listes Projets, `assertAllowed` sur la lecture détail |
| ✅ V1 livrée P2 | **RFC-ACL-021** | Cockpit modèle d’accès admin (`/client/administration/access-model`) |

---

## Ordre de développement

Référence unique pour **coder**, **déployer** et **activer** le périmètre org / scope. Colonne **Type** : `Code` (implémentation dépôt), `Ops` (runbook / prod, sans nouveau code), `Code+Ops` (les deux).

### Légende statut dev

| Statut dev | Signification |
| --- | --- |
| ✅ Fait | Livré en dépôt (éventuellement rollout prod restant) |
| 🔄 Ops | Code prêt — enchaînement runbook par client / module |
| 📋 À faire | RFC draft ou complément non implémenté |

### Tranche 1 — Fondations (ordre historique, ✅ fait)

| # | RFC | Type | Statut dev | Dépend de | Livrable / critère « done » |
| --: | --- | --- | --- | --- | --- |
| 1 | **RFC-ORG-001** | Code | ✅ Fait | RBAC, `Client`, `Resource` | Arbre `OrgUnit` / groupes, API `/api/organization/*`, UI admin organisation |
| 2 | **RFC-ORG-002** | Code | ✅ Fait | ORG-001 | `ClientUser.resourceId`, API + UI liaison HUMAN (hors backfill masse → 023) |
| 3 | **RFC-ORG-003** | Code | ✅ Fait (V1) | ORG-001 | `ownerOrgUnitId` sur 6 entités, API, audits, `OwnerOrgUnitSelect` |
| 4 | **RFC-ACL-015** | Code | ✅ Fait (socle) | RBAC | Package `rbac-permissions`, seed scoped, `/me/permissions`, `satisfiesPermission` |
| 5 | **RFC-ACL-016** | Code | ✅ Fait | ORG-002, ORG-003, 015 | `OrganizationScopeService` + tests |
| 6 | **RFC-ACL-017** | Code | ✅ Fait (V1) | ACL-005, 016 | `ResourceAccessPolicy`, API/UI politique, batch policy |
| 7 | **RFC-ACL-018** | Code | ✅ Fait (V1) | 016, 017 | Module `access-decision`, pilote Projets lecture/liste |
| 8 | **RFC-ACL-019** | Code | ✅ Fait (V1) | 011, 018 | Diagnostic enrichi (`ACCESS_DIAGNOSTICS_ENRICHED`) |
| 9 | **RFC-ACL-020** | Code | ✅ Fait | 018, ORG-003 | Moteur sur 5 modules métier, derrière flags V2 |
| 10 | **RFC-ACL-022** | Code+Ops | ✅ Fait (code) / 🔄 Ops | ORG-003, 017 | `ClientFeatureFlag`, CLI `backfill-owner-org-unit`, [runbook](../runbooks/migration-org-scope-access.md) |
| 11 | **RFC-ACL-021** | Code | ✅ Fait (V1) | 019, 020 | Cockpit `/client/administration/access-model` |

### Tranche 2 — Prochain développement (ordre à respecter)

| # | RFC | Type | Statut dev | Dépend de | Livrable / critère « done » |
| --: | --- | --- | --- | --- | --- |
| 12 | **RFC-ACL-023** | Code+Ops | ✅ Livré (code) — rollout client à planifier | ORG-002 | CLI `--dry-run` / `--apply`, CSV écarts, runbook §0 ; KPI `missing_human` maîtrisé en prod |
| 13 | **RFC-ACL-024** | Code | ✅ Fait (V1) | 015, 018, 020, 022 | Registre + guards + vague 1 controllers ; runbook profils §6 ; satellites : checklist par route |
| 14 | **RFC-ORG-004** | Code | ✅ Fait (V1) | ORG-003 V1, 022 | Policy + transfert + obligation 6 entités ; steward API **Projet** ; UI admin policy/wizard ; rollout obligation : runbook §7 + flag |
| 15 | **RFC-ACL-025** | Code | 📋 À faire | 018, 020, 022 | `@AccessDecision` + `ResourceAccessDecisionGuard` sur routes détail/mutation |
| 16 | **RFC-ACL-026** | Code | 📋 À faire | 021, 022, 023 | Export CSV issues, checklist rollout UI |

> **#12 avant rollout V2** : sans **023**, les permissions `*_own` / `*_scope` sont indéterministes si la fiche HUMAN manque.

### Boucle rollout prod (par client, puis par module métier)

À enchaîner **après #12** (023 exécuté ou écarts acceptés). Code **020** et **022** déjà livrés — pas de nouveau numéro RFC, mais **obligatoire** avant de considérer un module « en prod V2 ».

| Étape | RFC | Type | Action |
| --: | --- | --- | --- |
| A | **RFC-ACL-023** | Ops | Dry-run → apply backfill HUMAN ; corriger `AMBIGUOUS` en UI |
| B | **RFC-ACL-022** | Ops | Dry-run → apply backfill `ownerOrgUnitId` pour le **module** (`projects`, `budgets`, …) |
| C | **RFC-ACL-022** | Ops | Activer `ACCESS_DECISION_V2_<MODULE>` dans `ClientFeatureFlag` |
| D | **RFC-ACL-020** | Ops | Smoke : listes filtrées, détail, write/admin, anti-fuite inter-client |
| E | **RFC-ACL-019** | Ops | (Optionnel) `ACCESS_DIAGNOSTICS_ENRICHED=true` pour support |
| F | **RFC-ACL-021** | Ops | Relire KPI cockpit ; traiter `missing_owner` / `missing_human` |

**Ordre modules recommandé** (runbook) : `projects` → `budgets` → `contracts` → `suppliers` (procurement) → `strategic_vision`.

**Couplage 020 ↔ 022** : ne pas activer l’étape **C** sans étape **B** réussie sur le **même** module.

### Synthèse visuelle

```text
Tranche 1 (fait)     ORG-001 → 002 → 003 → ACL-015 → 016 → 017 → 018 → 019 → 020 + 022 → 021

Tranche 2 (dev)      023 ──► 024 ──► ORG-004 ✅ ──► 025 ──► 026
                         │
Rollout (ops/module)     └──► [023] → [022 backfill owner] → [flag V2] → [smoke 020] → module suivant
```

### Règles de priorisation

1. **Données avant flags** : 023 (HUMAN) et backfill owner (022) avant `ACCESS_DECISION_V2_*`.
2. **Un module à la fois** en prod : boucle rollout complète sur Projets avant Budgets, etc.
3. **024 après au moins un module V2 actif** : valider l’enforcement scoped sur du concret.
4. **ORG-004 après données owner stables** : transfert massif et obligation inutiles sur données vides.
5. **025 / 026 en fin de tranche 2** : durcissement HTTP et exports cockpit une fois le rollout amorcé.

---

## Spécifications détaillées (fichiers RFC)

**Tranche 1 (livré ou socle livré)** : [RFC-ORG-001](./RFC-ORG-001%20%E2%80%94%20Socle%20Organisation%20Client.md), [RFC-ORG-002](./RFC-ORG-002%20%E2%80%94%20Lien%20ClientUser%20%E2%86%94%20Resource%20HUMAN.md), [RFC-ORG-003](./RFC-ORG-003%20%E2%80%94%20Propri%C3%A9t%C3%A9%20organisationnelle%20des%20ressources.md), [RFC-ACL-015](./RFC-ACL-015%20%E2%80%94%20Permissions%20OWN%20SCOPE%20ALL.md) à [RFC-ACL-022](./RFC-ACL-022%20%E2%80%94%20Migration%20backfill%20et%20feature%20flags.md), [RFC-ACL-024](./RFC-ACL-024%20%E2%80%94%20Enforcement%20permissions%20scoped.md) (**V1**).

**Tranche 2** : [RFC-ACL-023](./RFC-ACL-023%20%E2%80%94%20Backfill%20ClientUser%20Resource%20HUMAN.md) et [RFC-ORG-004](./RFC-ORG-004%20%E2%80%94%20Steward%20transfert%20et%20obligation%20ownership.md) (**V1 livrées**) ; **draft** : [RFC-ACL-025](./RFC-ACL-025%20%E2%80%94%20Adoption%20guards%20HTTP%20moteur%20unifi%C3%A9.md), [RFC-ACL-026](./RFC-ACL-026%20%E2%80%94%20Cockpit%20mod%C3%A8le%20d%20acc%C3%A8s%20V2.md).

Moteur unifié **V1** : [RFC-ACL-018](./RFC-ACL-018%20%E2%80%94%20Moteur%20de%20d%C3%A9cision%20d'acc%C3%A8s%20unifi%C3%A9.md). Index : [_RFC Liste.md](./_RFC%20Liste.md). Runbook : [migration-org-scope-access.md](../runbooks/migration-org-scope-access.md).
