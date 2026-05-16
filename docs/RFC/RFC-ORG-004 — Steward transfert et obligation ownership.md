# RFC-ORG-004 — Steward, transfert d’ownership et obligation Direction

## Statut

**✅ Implémentée (V1)** — 2026-05. Tranche **V2** après [RFC-ORG-003](./RFC-ORG-003%20%E2%80%94%20Propri%C3%A9t%C3%A9%20organisationnelle%20des%20ressources.md). Activation obligation en prod : backfill owner ([RFC-ACL-022](./RFC-ACL-022%20%E2%80%94%20Migration%20backfill%20et%20feature%20flags.md)) + flag client `ORG_OWNERSHIP_REQUIRED` (cf. [runbook](../runbooks/migration-org-scope-access.md) §7).

**Hors V1 livré** : exposition API/UI `stewardSummary` et champ steward sur les fiches métier **hors Projet** (colonnes Prisma prêtes ; extension module par module).

## Alignement plan

Référence : [_Plan de déploement Orgnisation et licences](./_Plan%20de%20d%C3%A9ploement%20Orgnisation%20et%20licences.md).

| Élément | Valeur |
| --- | --- |
| **Priorité** | **P1** |
| **Ordre recommandé** | **12** — après backfill ownership (022) et rollout moteur (020) sur au moins un module pilote |
| **Dépendances** | RFC-ORG-003 V1, RFC-ORG-001, RFC-ACL-016 |
| **Livrables** | Prisma optionnel steward, permission transfer, API dédiée, UI, audits, règles d’obligation configurables |

---

## 1. Analyse de l’existant (V1)

- `ownerOrgUnitId` nullable ; PATCH module par `*.update`.
- Pas de `stewardResourceId` ; pas de `organization.ownership.transfer`.
- Archivage `OrgUnit` bloqué si ressources actives référencent l’unité.
- Transfert implicite = PATCH champ owner sur chaque entité (sans traçabilité dédiée « transfert »).

---

## 2. Hypothèses

- **Steward** = `Resource` HUMAN responsable métier **distinct** de la Direction propriétaire (ex. chef de projet sur budget d’une autre Direction) — optionnel, nullable.
- **Transfert** = opération atomique **multi-ressources** ou **unité → unité** avec audit unique `*.ownership.transferred` (en plus ou à la place des `*.ownership.changed` unitaires).
- **Obligation** : table `ClientOrgOwnershipPolicy` (pas de `Client.metadata`) — phases :
  - `ADVISORY` (défaut, = V1) : warnings UI + cockpit ;
  - `REQUIRED_ON_CREATE` : refus création sans `ownerOrgUnitId` ;
  - `REQUIRED_ON_ACTIVATE` : refus passage à statut « actif » métier sans owner.
- Pas de transfert cross-`clientId`.

---

## 3. Fichiers à créer / modifier

| Zone | Fichiers |
| --- | --- |
| Prisma | `schema.prisma` — `stewardResourceId` sur les 6 entités ORG-003 *(ou table latérale si refus explosion colonnes — décision implémentation)* |
| API | `apps/api/src/modules/organization/ownership-transfer.service.ts`, DTO `transfer-ownership.dto.ts`, routes `POST /api/organization/ownership-transfers` |
| RBAC | seed `organization.ownership.transfer`, `organization.steward.update` |
| Modules métier | garde-fous create/update selon policy client |
| Web | wizard transfert, champ steward sur fiches existantes (`OwnerOrgUnitSelect` cohabite) |
| Doc | [ACCESS-MODEL.md](../ACCESS-MODEL.md), runbook 022 § obligation post-backfill |

---

## 4. Implémentation livrée (dépôt)

Migration : `apps/api/prisma/migrations/20260516120000_rfc_org_004_steward_ownership_policy/`.

### 4.1 Steward

| Élément | Livré |
| --- | --- |
| Prisma | `stewardResourceId` sur les 6 entités ORG-003, FK `Resource` (`onDelete: SetNull`), index `(clientId, stewardResourceId)` |
| API **Projet** | DTO create/update `stewardResourceId` ; réponse `stewardSummary` ; audit `project.steward.changed` |
| API **Budget** | DTO create `stewardResourceId` (persistance) — pas encore `stewardSummary` en réponse liste/détail |
| API autres modules | Colonne Prisma uniquement (pas de DTO/réponse steward V1) |
| Permission | Pas de `organization.steward.update` — steward modifiable via `projects.update` (et futurs `*.update` par module) |

Helpers : `apps/api/src/modules/organization/steward-resource.helpers.ts`, `organization-steward.integration.ts`.

### 4.2 Transfert massif

**`POST /api/organization/ownership-transfers`** — permission `organization.ownership.transfer` + `organization.read`.

```json
{
  "fromOrgUnitId": "…",
  "toOrgUnitId": "…",
  "resourceTypes": ["PROJECT", "BUDGET"],
  "dryRun": true,
  "confirmApply": false,
  "page": 1,
  "limit": 50
}
```

| Règle | Comportement |
| --- | --- |
| `dryRun: true` | Compteurs + échantillon paginé ; **aucun** `updateMany` ; **aucun** audit |
| `dryRun: false` sans `confirmApply: true` | **400** |
| `dryRun: false` + `confirmApply: true` | Apply + audit `organization.ownership.batch_transferred` |

**`resourceTypes`** (SCREAMING_SNAKE, aligné diagnostics ACL) : `PROJECT`, `BUDGET`, `BUDGET_LINE`, `SUPPLIER`, `CONTRACT`, `STRATEGIC_OBJECTIVE` — pas les noms Prisma (`Project`, `SupplierContract`, …).

**`BudgetLine`** : uniquement lignes avec `ownerOrgUnitId` stocké = `fromOrgUnitId` (overrides) ; lignes héritant du budget parent **non** modifiées. `StrategicObjective.directionId` **jamais** touché.

Code : `ownership-transfer.service.ts`, `ownership-transfer-resource-types.ts`, `dto/transfer-ownership.dto.ts`.

### 4.3 Obligation ownership

**`GET|PATCH /api/organization/ownership-policy`** (client actif via `ActiveClientGuard`) — pas `/api/clients/active/…`.

Réponse GET :

```json
{
  "mode": "ADVISORY",
  "enforcementEnabled": false,
  "flagKey": "ORG_OWNERSHIP_REQUIRED"
}
```

- `enforcementEnabled` = `mode` ∈ `REQUIRED_ON_*` **et** flag `ORG_OWNERSHIP_REQUIRED` actif (`ClientFeatureFlag` ou env, cf. [RFC-ACL-022](./RFC-ACL-022%20%E2%80%94%20Migration%20backfill%20et%20feature%20flags.md)).
- PATCH : `{ "mode" }` seul ; permission `organization.update` ; audit `organization.ownership.policy.updated`.

**BudgetLine** — owner effectif pour l’obligation :

```
effectiveOwnerOrgUnitId = BudgetLine.ownerOrgUnitId ?? Budget.ownerOrgUnitId
```

Garde-fous create/activate branchés sur : Project, Budget, BudgetLine (create + activate si statut hors `DRAFT`), Supplier, SupplierContract, StrategicObjective.

### 4.4 Frontend

| Composant | Chemin |
| --- | --- |
| Policy | `OrganizationOwnershipPolicyCard` — page `/client/administration/organization` |
| Transfert | `OwnershipTransferWizard` (dry-run → confirmation → apply) |
| Obligation UI | `OwnerOrgUnitNullWarning` — `variant: 'advisory' \| 'blocking'` selon `enforcementEnabled` du GET policy |
| API client | `apps/web/src/features/organization/api/organization-ownership.api.ts` |

Pas d’endpoint global feature flags côté web : `enforcementEnabled` vient uniquement du GET policy.

---

## 5. Modifications Prisma

- `stewardResourceId` sur `Project`, `Budget`, `BudgetLine`, `Supplier`, `SupplierContract`, `StrategicObjective` *(aligné ORG-003)*.
- Option : `ClientOrgOwnershipPolicy` `{ clientId, mode, updatedAt }` si metadata insuffisante.

Index : `@@index([clientId, stewardResourceId])` où filtrage steward prévu.

---

## 6. Tests (dépôt)

| Fichier | Couverture |
| --- | --- |
| `ownership-transfer.service.spec.ts` | dry-run sans audit ; apply sans `confirmApply` → 400 ; apply confirmé ; `BudgetLine` WHERE override |
| `organization-ownership-policy.service.spec.ts` | défaut ADVISORY ; `enforcementEnabled` + flag |
| `steward-resource.helpers.spec.ts` | HUMAN même client ; refus type non-HUMAN |
| `organization-ownership-obligation.helpers.spec.ts` | résolution effectif BudgetLine |
| `organization-ownership.api.spec.ts` (web) | payload dry-run |

Exécution : `pnpm --filter @starium-orchestra/api exec jest src/modules/organization`.

---

## 7. Récapitulatif

RFC-ORG-004 complète la **gouvernance** de la propriété organisationnelle au-delà du stockage V1 : responsable métier, transferts massifs audités, durcissement progressif des données.

---

## 8. Points de vigilance

- Transfert massif : verrouiller en maintenance courte ou batch nocturne si >10k lignes.
- `BudgetLine` transfert : **overrides stockés uniquement** (décision V1 figée).
- Steward UI/API sur Budget, Fournisseur, Contrat, Objectif : extension post-V1.
- Ne pas confondre `StrategicObjective.directionId` (stratégique) et `ownerOrgUnitId` (organisationnel).
