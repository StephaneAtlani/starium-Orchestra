# RFC-ACL-026 — Cockpit modèle d’accès V2 (exports et pilotage rollout)

## Statut

**📝 Draft** — 2026-05. Suite de [RFC-ACL-021](./RFC-ACL-021%20%E2%80%94%20Cockpit%20mod%C3%A8le%20d%27acc%C3%A8s%20admin%20client.md) (V1 livrée). S’appuie sur les rollouts [RFC-ACL-020](./RFC-ACL-020%20%E2%80%94%20Int%C3%A9gration%20modules%20m%C3%A9tier%20ownership%20et%20scope.md) + [RFC-ACL-022](./RFC-ACL-022%20%E2%80%94%20Migration%20backfill%20et%20feature%20flags.md) et le backfill HUMAN [RFC-ACL-023](./RFC-ACL-023%20%E2%80%94%20Backfill%20ClientUser%20Resource%20HUMAN.md).

## Alignement plan

Référence : [_Plan de déploement Orgnisation et licences](./_Plan%20de%20d%C3%A9ploement%20Orgnisation%20et%20licences.md).

| Élément | Valeur |
| --- | --- |
| **Priorité** | **P2** |
| **Ordre recommandé** | **14** — après données 022/023 et KPI 021 stabilisés |
| **Dépendances** | RFC-ACL-021, RFC-ACL-022, RFC-ACL-023 (recommandé) |
| **Livrables** | Export CSV issues, checklist rollout UI, actions correctives guidées |

---

## 1. Analyse de l’existant (V1)

- `GET /api/access-model/health` — KPI + `rollout[]` flags V2.
- `GET /api/access-model/issues` — 4 catégories paginées, `truncated`.
- UI `/client/administration/access-model` — filtres, liens correctifs.
- **Hors V1** : export CSV, checklist opérateur, comparaison avant/après backfill.

---

## 2. Hypothèses

- Export **asynchrone** si >5k lignes (job BullMQ) ; sinon streaming CSV synchrone.
- Encodage CSV : UTF-8 BOM, séparateur `;` option FR.
- Colonnes = libellés métier + IDs en colonnes secondaires (pas l’inverse).
- Permission : `access_model.read` pour export ; pas d’export cross-client.

---

## 3. Fichiers à créer / modifier

| Fichier | Action |
| --- | --- |
| `access-model.controller.ts` | `GET /api/access-model/issues/export` |
| `access-model.service.ts` | Génération CSV, plafonds |
| `apps/web/.../access-model-issues-table.tsx` | Bouton « Exporter » |
| Runbook 022 | Lien export post-backfill |

---

## 4. Implémentation

### 4.1 API export

**`GET /api/access-model/issues/export?category=...&module=...&format=csv`**

- Reprend les filtres de `issues` sans pagination (avec plafond `MAX_EXPORT_ROWS`).
- Headers : `category`, `module`, `resourceLabel`, `resourceType`, `resourceId`, `detail`, `suggestedAction`, `deepLinkPath`.
- Réponse : `Content-Disposition: attachment; filename="access-model-issues-<client>-<date>.csv"`.

### 4.2 Checklist rollout (UI)

Composant `AccessModelRolloutChecklist` alimenté par `health.rollout[]` :

| Étape | Critère auto |
| --- | --- |
| Arbre org prêt | ≥1 `OrgUnit` ACTIVE |
| Backfill owner | KPI `missing_owner` sous seuil client |
| Backfill HUMAN | KPI `missing_human` = 0 pour admins scopés |
| Flag module | `enabled` dans `rollout[]` |
| Smoke | lien doc runbook § smoke |

### 4.3 Actions correctives V2

- `missing_owner` : bouton « Assigner Direction » → deep-link avec `?focus=ownership`.
- `missing_human` : lien fiche membre client.
- `policy_review` : ouverture éditeur politique RFC-017.

### 4.4 Catégories additionnelles (option)

- `flag_without_backfill` : module V2 actif avec KPI owner encore élevé (heuristique).
- `legacy_profile_risk` : utilisateurs avec `*.read` + `*.read_scope` simultanés (024).

---

## 5. Modifications Prisma

**Aucune** (lecture seule).

---

## 6. Tests

- Export CSV : colonnes, encodage, plafond `truncated` → 413 ou fichier partiel documenté.
- Permission `access_model.read` requise.
- E2E web : déclenchement export mock.

---

## 7. Récapitulatif

RFC-ACL-026 transforme le cockpit 021 en **outil d’exploitation** du rollout org/scope, pas seulement une vue KPI.

---

## 8. Points de vigilance

- Exports sensibles : audit `access_model.issues.exported` avec `rowCount`.
- Ne pas exposer emails personnels dans CSV si politique client restrictive (masquage option).
