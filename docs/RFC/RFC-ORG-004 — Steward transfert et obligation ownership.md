# RFC-ORG-004 — Steward, transfert d’ownership et obligation Direction

## Statut

**📝 Draft** — 2026-05. Tranche **V2** après [RFC-ORG-003](./RFC-ORG-003%20%E2%80%94%20Propri%C3%A9t%C3%A9%20organisationnelle%20des%20ressources.md) (V1 : `ownerOrgUnitId` nullable). Dépend des données stabilisées par [RFC-ACL-022](./RFC-ACL-022%20%E2%80%94%20Migration%20backfill%20et%20feature%20flags.md).

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
- **Obligation** : activable par client via `Client.metadata` ou table `ClientOrgOwnershipPolicy` — phases :
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

## 4. Implémentation

### 4.1 Steward (optionnel V2a)

- Colonne `stewardResourceId String?` → `Resource` HUMAN, `onDelete: SetNull`.
- Réponse API `stewardSummary: { id, displayName, email? } | null`.
- Permission : `organization.steward.update` ou réutilisation `*.update` module — **à trancher** (recommandation : `projects.update` etc. pour steward sur la ressource, `organization.steward.update` pour changement sans droit module).

### 4.2 Transfert dédié (V2b)

**`POST /api/organization/ownership-transfers`**

```json
{
  "fromOrgUnitId": "…",
  "toOrgUnitId": "…",
  "resourceTypes": ["Project", "Budget"],
  "dryRun": true
}
```

- Permission : `organization.ownership.transfer` (+ `organization.read`).
- Dry-run : compteurs par type, liste tronquée (pagination).
- Apply : transaction par type ; audit `organization.ownership.batch_transferred` avec payload `{ from, to, counts }`.
- Refus si `toOrgUnit` ARCHIVED ou hors client.

### 4.3 Obligation ownership (V2c)

- Lecture policy : `GET /api/clients/active/organization-ownership-policy` → `{ mode: 'ADVISORY' | 'REQUIRED_ON_CREATE' | 'REQUIRED_ON_ACTIVATE' }`.
- Écriture : `PATCH` même route, `organization.update` ou permission dédiée `organization.policy.update`.
- Services create : `assertOwnerOrgUnitIfRequired(clientId, dto, lifecycle)`.
- Feature flag client optionnel `ORG_OWNERSHIP_REQUIRED` (022) pour bascule progressive.

### Frontend

- Libellés métier pour steward et transfert (jamais UUID seul).
- Wizard transfert : sélection **Directions** par nom/code, récapitulatif counts, confirmation.
- Bandeau obligation : réutiliser `OwnerOrgUnitNullWarning` en mode bloquant si policy ≠ ADVISORY.

---

## 5. Modifications Prisma

- `stewardResourceId` sur `Project`, `Budget`, `BudgetLine`, `Supplier`, `SupplierContract`, `StrategicObjective` *(aligné ORG-003)*.
- Option : `ClientOrgOwnershipPolicy` `{ clientId, mode, updatedAt }` si metadata insuffisante.

Index : `@@index([clientId, stewardResourceId])` où filtrage steward prévu.

---

## 6. Tests

- Transfert dry-run vs apply ; isolation client.
- Obligation `REQUIRED_ON_CREATE` : 400 sans owner ; OK avec owner ACTIVE.
- Archivage unité source après transfert partiel : cohérence blockers.
- Steward : FK HUMAN même client ; refus HUMAN archivé.

---

## 7. Récapitulatif

RFC-ORG-004 complète la **gouvernance** de la propriété organisationnelle au-delà du stockage V1 : responsable métier, transferts massifs audités, durcissement progressif des données.

---

## 8. Points de vigilance

- Transfert massif : verrouiller en maintenance courte ou batch nocturne si >10k lignes.
- `BudgetLine` : définir si le transfert d’unité déplace overrides ligne ou uniquement budgets.
- Ne pas confondre `StrategicObjective.directionId` (stratégique) et `ownerOrgUnitId` (organisationnel).
