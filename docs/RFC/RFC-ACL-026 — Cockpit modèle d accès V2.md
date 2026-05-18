# RFC-ACL-026 — Cockpit modèle d’accès V2 (exports et pilotage rollout)

## Statut

**✅ Implémentée (V2.0)** — 2026-05. Suite de [RFC-ACL-021](./RFC-ACL-021%20%E2%80%94%20Cockpit%20mod%C3%A8le%20d%27acc%C3%A8s%20admin%20client.md) (V1 livrée). S’appuie sur les rollouts [RFC-ACL-020](./RFC-ACL-020%20%E2%80%94%20Int%C3%A9gration%20modules%20m%C3%A9tier%20ownership%20et%20scope.md) + [RFC-ACL-022](./RFC-ACL-022%20%E2%80%94%20Migration%20backfill%20et%20feature%20flags.md) et le backfill HUMAN [RFC-ACL-023](./RFC-ACL-023%20%E2%80%94%20Backfill%20ClientUser%20Resource%20HUMAN.md).

## Alignement plan

Référence : [_Plan de déploement Orgnisation et licences](./_Plan%20de%20d%C3%A9ploement%20Orgnisation%20et%20licences.md).

| Élément | Valeur |
| --- | --- |
| **Priorité** | **P2** |
| **Ordre recommandé** | **16** (après 021, 022, 023) |
| **Dépendances** | RFC-ACL-021, RFC-ACL-022, RFC-ACL-023 (recommandé) |
| **Livrables** | Export CSV issues, checklist rollout UI, actions correctives guidées |

---

## 1. Implémentation (état code)

### Backend — extensions `apps/api/src/modules/access-model/`

| Fichier | Rôle |
| --- | --- |
| `dto/access-model-issues-export.query.dto.ts` | `category`, `module`, `search`, `delimiter` (`,` \| `;`), `format=csv` — **sans** `page` / `limit` |
| `access-model-export.ts` | `issuesToCsv`, `sanitizeAccessModelExportFilenamePart`, `buildAccessModelExportFilename` |
| `access-model.service.ts` | `resolveFilteredIssues` (modes `list` \| `export`), `exportIssuesCsv`, `buildRolloutChecklist` |
| `access-model.controller.ts` | `GET /api/access-model/issues/export` + `@Res({ passthrough: true })` pour headers dynamiques |
| `access-model.module.ts` | + `AuditLogsModule` |

**Constantes** (`access-model.constants.ts`) :

- `ACCESS_MODEL_MAX_EXPORT_ROWS = 5_000`
- `ACCESS_MODEL_EXPORT_PROBE_LIMIT = 5_001` (décision 413)
- `ACCESS_MODEL_SCAN_CAP = 10_000` (liste UI, inchangé V1)
- `ACCESS_MODEL_CHECKLIST_OWNER_WARNING_MAX = 50`

**Export** :

- Jamais de CSV partiel : probe 5 001 lignes filtrées → **413** si `> 5_000` ou si `scanTruncated` (collecteur catégorie ou cap export).
- Colonne CSV **`resourceId`** = champ explicite `AccessModelIssueItem.resourceId` uniquement — **jamais** `item.id` (`issuesToCsv` lève une erreur si `resourceId` vide).
- Builders : `toMissingOwnerIssue`, `missing_human`, `atypical_acl`, `policy_review` renseignent tous `resourceId` ; pour `atypical_acl` / `policy_review`, `id` reste une clé composite UI distincte de l’ID métier.
- Audit **après succès uniquement** : `access_model.issues.exported` (`newValue` : `category`, `module`, `search`, `rowCount`, `delimiter`).

**Checklist** (`GET /health` → `checklist[]`) :

- Calculée à la volée, **non persistée**, pas d’action « valider l’étape » en UI.
- Étapes : `org_tree`, `backfill_owner`, `backfill_human`, `flag_module`, `smoke`.

**Actions correctives V2** :

- `missing_owner` + `PROJECT` : lien `?focus=ownership`, libellé « Assigner Direction ».
- Autres types métier : liens V1 inchangés (pas de nouvel éditeur inline ownership).
- `policy_review` : liens fiche métier existants (pas de nouvelle UI politique en V2.0).

### Frontend — `apps/web/src/features/access-model/`

| Composant | Rôle |
| --- | --- |
| `access-model-rollout-checklist.tsx` | Affichage lecture seule des 5 étapes |
| `access-model-page.tsx` | Bouton **Exporter CSV**, intégration checklist |
| `api/access-model.api.ts` | `downloadAccessModelIssuesCsv`, types `checklist` / `resourceId` |
| `project-detail-view.tsx` | `?focus=ownership` → éditeur Direction inline |

### Tests

- API (27 specs `access-model`) :
  - `access-model-builders.resource-id.spec.ts` — `resourceId` sur les 4 catégories ; `id` ≠ `resourceId` pour ACL / policy.
  - `access-model-export.service.spec.ts` — **5000** lignes → CSV complet + audit ; **5001** → **413** sans audit ni lecture client ; **`scanTruncated: true`** → **413** même si ≤5000 items ; slug dangereux → filename sanitizé.
  - `access-model-export.spec.ts` — colonne CSV `resourceId` ≠ `id` composite ; filename `Acme-Labs-EU` sans `/`, espaces, guillemets.
  - `dto/access-model-issues-export.query.dto.spec.ts`, `access-model.controller.spec.ts`, specs V1 existantes.
- Web : `access-model.api.spec.ts` (URL export, pas de `page`/`limit`).

### Documentation

- `docs/API.md` §5.053, `docs/ACCESS-MODEL.md`, [runbook migration](../runbooks/migration-org-scope-access.md) § export post-backfill.

---

## 2. API (référence)

- **`GET /api/access-model/issues/export`** — voir [API.md](../API.md) §5.053.
- Permission : `access_model.read` ; isolation `X-Client-Id`.

---

## 3. Hors périmètre V2.0 (suites possibles)

- Export **asynchrone** BullMQ si >5k lignes fréquent en prod (V2.1).
- Catégories `flag_without_backfill`, `legacy_profile_risk` (RFC-ACL-024).
- `?focus=ownership` hors fiche **projet** (budget, contrat, etc.).
- Comparaison avant/après backfill automatisée.

---

## 4. Modifications Prisma

**Aucune** (lecture seule).

---

## 5. Points de vigilance

- Exports sensibles : audit obligatoire ; pas d’email en colonne CSV V2.0.
- **413** : pas de `StreamableFile`, pas d’audit de succès (y compris si `scanTruncated` alors que la liste filtrée tient en ≤5 000 lignes).
- **`resourceId`** : obligatoire sur chaque issue ; export CSV interdit d’utiliser `item.id` comme identifiant métier.
- **Filename** : `sanitizeAccessModelExportFilenamePart` avant `Content-Disposition` (fallback `clientId` si slug invalide).
- Ne pas confondre avec `/client/administration/access-cockpit` (RFC-ACL-010).
- Isolation **client actif** (`X-Client-Id`) sur export et checklist comme sur le reste du module.
