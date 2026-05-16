# Runbook — Migration périmètre organisationnel et accès V2

Référence : [RFC-ACL-022](../RFC/RFC-ACL-022%20%E2%80%94%20Migration%20backfill%20et%20feature%20flags.md), [RFC-ACL-023](../RFC/RFC-ACL-023%20%E2%80%94%20Backfill%20ClientUser%20Resource%20HUMAN.md) (prérequis HUMAN), [RFC-ACL-020](../RFC/RFC-ACL-020%20%E2%80%94%20Int%C3%A9gration%20modules%20m%C3%A9tier%20ownership%20et%20scope.md), [_Plan de déploiement Org & licences](../RFC/_Plan%20de%20d%C3%A9ploement%20Orgnisation%20et%20licences.md).

## Principe

**Ne jamais activer** un flag `ACCESS_DECISION_V2_*` sur un client **avant** :

1. backfill `ClientUser.resourceId` recommandé si des membres ont des permissions `*_own` / `*_scope` ([RFC-ACL-023](../RFC/RFC-ACL-023%20%E2%80%94%20Backfill%20ClientUser%20Resource%20HUMAN.md)) — KPI cockpit `missing_human` ≈ 0 ;
2. backfill `ownerOrgUnitId` terminé (ou écarts documentés) pour **ce module** ;
3. revue du CSV + validation métier ;
4. fenêtre de communication utilisateurs (profils scopés).

Couplage **020 ↔ 022** : un module = backfill + flag + branchement moteur dans la **même** fenêtre de déploiement.

---

## Prérequis

- Migration Prisma `ClientFeatureFlag` appliquée (`20260513140000_rfc_acl_022_client_feature_flag`).
- Arbre `OrgUnit` du client **actif** avec au moins une unité racine (ou `--default-org-unit-id` explicite).
- Sauvegarde DB / snapshot avant batch production.

---

## 0. Backfill `ClientUser` ↔ `Resource` HUMAN (RFC-ACL-023)

CLI : `apps/api/scripts/backfill-client-user-human-resource.ts`

**Mode obligatoire (exclusif)** : fournir exactement `--dry-run` (simulation) **ou** `--apply` (écriture). Sans l’un des deux, ou avec les deux ensemble, le script quitte en erreur sans écrire en base.

```bash
# 1. Simulation (obligatoire en premier)
pnpm --filter @starium-orchestra/api exec ts-node --transpile-only \
  scripts/backfill-client-user-human-resource.ts \
  --client-id <CLIENT_ID> \
  --dry-run \
  [--strategy email-default|email-identity|name-strict|all] \
  [--enable-name-strict] \
  [--limit N]

# 2. Application après revue CSV
pnpm --filter @starium-orchestra/api exec ts-node --transpile-only \
  scripts/backfill-client-user-human-resource.ts \
  --client-id <CLIENT_ID> \
  --apply \
  [--strategy ...] [--enable-name-strict] [--limit N]

# 3. Nouveau dry-run après apply → 0 ligne action=LINKED attendu (mode=dry-run)
```

**Règles**

- Membres traités : `ClientUser` **ACTIVE** avec `resourceId` null uniquement (pas de remplacement de lien existant en V1).
- Rapport : `tmp/backfill-human-link-<clientId>-<timestamp>.csv` — une ligne par membre chargé ; colonnes incluant `mode` (`dry-run` | `apply`), `action` (`LINKED`, `SKIP`, `AMBIGUOUS`, `NO_CANDIDATE`, `ERROR`), `matchedBy`, `candidateCount`, `reason`.
- `--dry-run` : CSV complet, **0** update, **0** audit.
- `--apply` : écrit les lignes `LINKED` + audit batch `client_user.human_resource.backfill.linked`.
- Corriger les `AMBIGUOUS` via UI membres avant apply.
- Vérifier `GET /api/access-model/health` → KPI `missingHuman` acceptable avant rollout scope.

**Code** : matcher `apps/api/src/common/backfill/client-user-human-resource.matcher.ts`, runner `client-user-human-resource.backfill.ts`.

---

## 1. Backfill `ownerOrgUnitId`

CLI : `apps/api/scripts/backfill-owner-org-unit.ts`

```bash
# Dry-run (obligatoire en premier)
pnpm --filter @starium-orchestra/api exec tsx scripts/backfill-owner-org-unit.ts \
  --client-id <CLIENT_ID> \
  --module all \
  --dry-run

# Application
pnpm --filter @starium-orchestra/api exec tsx scripts/backfill-owner-org-unit.ts \
  --client-id <CLIENT_ID> \
  --module <module> \
  [--default-org-unit-id <ORG_UNIT_ID>]
```

| `--module` | Ressources | Flag associé |
| --- | --- | --- |
| `budgets` | `Budget` puis `BudgetLine` (ordre forcé) | `ACCESS_DECISION_V2_BUDGETS` |
| `projects` | `Project` | `ACCESS_DECISION_V2_PROJECTS` |
| `contracts` | `SupplierContract` | `ACCESS_DECISION_V2_CONTRACTS` |
| `suppliers` | `Supplier` | `ACCESS_DECISION_V2_PROCUREMENT` |
| `strategic_vision` | `StrategicObjective` | `ACCESS_DECISION_V2_STRATEGIC_VISION` |
| `all` | séquence complète ci-dessus | tous les flags (un par un en prod) |

**Règles métier**

- Filtre statuts actifs uniquement (voir en-tête du script).
- **BudgetLine** : pas d’override auto — héritage budget préservé ; lignes `UNRESOLVED_PARENT_WITHOUT_OWNER` si budget parent sans owner.
- Idempotent : ressources déjà owned → `SKIP`.
- Rapport : `tmp/backfill-org-scope-<clientId>-<timestamp>.csv`.
- Audit : `org_scope_backfill.applied` par batch.

**Critères « done » backfill**

- CSV relu : 0 ligne `UPDATED` bloquante non traitée OU écarts acceptés et tracés.
- Taux `ownerOrgUnitId` null sur ressources **actives** du module acceptable pour le CODIR (sinon compléter via UI ou re-run ciblé).

---

## 2. Activation des feature flags

Table `ClientFeatureFlag` (`clientId`, `flagKey`, `enabled`).

Clés (`apps/api/src/modules/feature-flags/flag-keys.ts`) :

| Flag | Module service |
| --- | --- |
| `ACCESS_DECISION_V2_PROJECTS` | Projets |
| `ACCESS_DECISION_V2_BUDGETS` | Budgets + lignes |
| `ACCESS_DECISION_V2_CONTRACTS` | Contrats |
| `ACCESS_DECISION_V2_PROCUREMENT` | Fournisseurs |
| `ACCESS_DECISION_V2_STRATEGIC_VISION` | Objectifs stratégiques |

**Ordre recommandé par client** : Projets → Budgets → Fournisseurs → Contrats → Vision stratégique (ajuster selon volumétrie).

Insertion exemple (SQL indicatif) :

```sql
INSERT INTO client_feature_flags (id, client_id, flag_key, enabled, created_at, updated_at)
VALUES (gen_random_uuid(), '<CLIENT_ID>', 'ACCESS_DECISION_V2_PROJECTS', true, NOW(), NOW())
ON CONFLICT (client_id, flag_key) DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = NOW();
```

Variable d’environnement globale (fallback dev) : `ACCESS_DECISION_V2_<MODULE>=true` — **ne pas** s’y fier en prod multi-tenant.

Diagnostic enrichi (lecture seule, transversal) : `ACCESS_DIAGNOSTICS_ENRICHED=true` — indépendant des flags V2 module.

---

## 3. Vérifications post-activation

Par module et profil test (utilisateur **SCOPE** sur une direction) :

- Liste : ne voit pas les ressources d’une autre direction (même client).
- Détail : `404` / masquage cohérent avec la liste (anti-fuite).
- Mutation write/admin : refus si hors périmètre.
- Diagnostic : `GET /api/access-diagnostics/...` avec `evaluationMode` moteur si enrichi activé.

Tests automatisés : `access-decision.modules.integration.spec.ts` (52 scénarios paramétrés).

---

## 4. Rollback

1. Désactiver le flag module (`enabled = false`) → retour comportement legacy **immédiat** (services branchés `isAccessV2Enabled`).
2. **Ne pas** supprimer les `ownerOrgUnitId` backfillés sans décision métier (données utiles pour RFC-ACL-021).
3. En cas d’incident migration Prisma : rollback migration selon procédure infra habituelle.

---

## 5. UI ownership (Lot B)

Composants : `OwnerOrgUnitSelect`, `OwnerOrgUnitNullWarning` (message fixe, **non** conditionné au flag).

Modules FE avec saisie / lecture direction propriétaire : Projets, Budgets/Lignes, Fournisseurs, Contrats, Objectifs stratégiques.

---

## 6. Migration profils scope-ready (RFC-ACL-024)

**Ne pas** retirer les codes legacy `*.read` / `*.update` en production avant validation métier par module et par client.

| Profil cible | Recommandation |
| --- | --- |
| Lecture périmètre (manager direction) | Conserver ou ajouter `*.read_scope` ; retirer `*.read` legacy **après** flag V2 + routes migrées |
| CODIR / admin client | Conserver `*.read_all` ou `*.manage_all` explicites |
| Création ressources | `*.create` ou `*.manage_all` — `write_scope` **ne** couvre **pas** `create` en V1 |

Checklist route (avant ouverture scoped au guard) :

1. `@RequireAccessIntent` (ou handler dans `SERVICE_ENFORCED_REGISTRY`)
2. Service : `AccessDecisionService` / `filterResourceIdsByAccess`
3. Tests guard + service
4. Activer le flag `ACCESS_DECISION_V2_*` pour le client pilote

Clés registre : `ControllerName.methodName` (ex. `ProjectsController.list`) — jamais d’URL HTTP.

---

## 7. Obligation ownership et transfert (RFC-ORG-004)

Après backfill `ownerOrgUnitId` (§2) :

1. **Politique** : `PATCH /api/organization/ownership-policy` `{ "mode": "ADVISORY" | "REQUIRED_ON_CREATE" | "REQUIRED_ON_ACTIVATE" }` — défaut `ADVISORY`.
2. **Flag ops** : activer `ORG_OWNERSHIP_REQUIRED` sur le client (`ClientFeatureFlag`) pour que `enforcementEnabled` soit vrai ; sinon seuls les avertissements UI s’affichent.
3. **Transfert massif** : toujours `dryRun: true` puis `dryRun: false` + `confirmApply: true` ; >10k lignes → fenêtre maintenance.
4. **BudgetLine** : le transfert ne déplace que les lignes avec override explicite ; les lignes héritant du budget parent ne bougent pas.

## 8. Checklist déploiement client (une ligne par module)

- [ ] Dry-run backfill + CSV archivé
- [ ] Backfill appliqué ou écarts signés
- [ ] Profils test SCOPE / ALL validés
- [ ] Flag `ACCESS_DECISION_V2_*` activé
- [ ] Smoke liste + détail + PATCH ownership
- [ ] Support informé (message ressources sans direction)
