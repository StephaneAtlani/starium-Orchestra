# Plan — `campaigns-v30-gaps`

**RFC** : RFC-COMP-002 / COMP-001 §9.2 · **Feature** : UI écarts + cycle efficacité  
**Commit cible** : `feat(compliance): wire gap list and efficiency cycle in requirement drawer`

## Objectif métier

Dans le tiroir d’exigence existant, lister les écarts du contrôle et permettre le cycle d’efficacité jusqu’à clôture (`TO_VERIFY` → `CLOSED` avec `verificationNote`), sans nouvelle page.

## Analyse existant

- **API OK** : `GET/POST/PATCH /api/compliance/gaps` ; clôture exige `verificationNote` ; annulation exige `cancelReason`.
- **Statuts Prisma** : `OPEN` → `IN_PROGRESS` → `TO_VERIFY` → `CLOSED` (+ `CANCELLED`).
- **UI** : création écart + plan remédiation dans `compliance-assess-drawer-body` / `compliance-requirement-detail-modal`.
- **Trous** : pas de `listComplianceGaps` côté web ; `patchComplianceGap` importé mais non branché ; `q.data.gaps` jamais rendu ; pas d’UI efficacité.

## 1. Fichiers exacts (7)

| Action | Fichier |
|---|---|
| Modifier | `apps/web/src/features/compliance/api/compliance.api.ts` — `listComplianceGaps` + type `ComplianceGapApi` (status, labels, `verificationNote`, `closedAt`) |
| Créer | `apps/web/src/features/compliance/lib/compliance-gap-status.ts` — libellés FR + transitions autorisées UI |
| Créer | `apps/web/src/features/compliance/components/compliance-gap-cycle-panel.tsx` — liste écarts + actions efficacité |
| Créer | `apps/web/src/features/compliance/components/compliance-gap-cycle-panel.spec.tsx` — libellés / transitions / CTA |
| Modifier | `apps/web/src/features/compliance/components/compliance-assess-drawer-body.tsx` — monter le panel sous le bloc « Plan d’action requis » |
| Modifier | `apps/web/src/features/compliance/components/compliance-requirement-detail-modal.tsx` — query `listGaps`, mutation `patchComplianceGap`, props panel |
| Modifier | `.claude/plans/campaigns-v30-gaps.md` — ce plan (référence pipeline) |

Pas de migration Prisma. Pas de changement API Nest (déjà livré).

## 2. UX minimale (tiroir existant)

Emplacement : section **Écarts** dans le side-panel `ComplianceRequirementDetailModal` → `ComplianceAssessDrawerBody` (après création / plan remédiation).

Pour chaque écart (données `listComplianceGaps?requirementId=`) :

| Statut | Affichage | Action |
|---|---|---|
| `OPEN` / `IN_PROGRESS` | titre, constat, badge statut, ownerLabel, échéance | CTA **Soumettre à vérification** → `PATCH { status: TO_VERIFY }` |
| `TO_VERIFY` | idem + champ **Note de vérification** (obligatoire pour clôturer) | **Clôturer** → `PATCH { status: CLOSED, verificationNote }` · **Non efficace** → `PATCH { status: IN_PROGRESS }` |
| `CLOSED` / `CANCELLED` | lecture seule (badge + note / motif si présents) | aucune |

- Loading / empty / error sur la liste (`LoadingState` / texte vide / `Alert`).
- Libellés métier uniquement (`ownerLabel`, titre, badge FR) — jamais d’ID.
- Cibles `min-h-11 sm:min-h-9` ; `Label` + `aria-invalid` sur la note.
- Clôture **ne** change **pas** le statut d’évaluation de l’exigence (règle COMP-001).

## 3. Critères d’acceptation (5)

1. Ouverture du tiroir exigence → `GET /api/compliance/gaps?requirementId=` ; liste affichée (ou empty explicite).
2. Écart `OPEN` ou `IN_PROGRESS` → CTA « Soumettre à vérification » → statut `TO_VERIFY` + refresh liste.
3. Écart `TO_VERIFY` + note ≥ 3 car. → « Clôturer » → `CLOSED` ; sans note → CTA désactivé / erreur API visible.
4. Écart `TO_VERIFY` → « Non efficace » → retour `IN_PROGRESS` ; écart toujours listé.
5. `pnpm --filter @starium-orchestra/web test` (spec panel) + `pnpm audit:ui-ids` + `pnpm audit:modals` verts.

## 4. Hors scope

- Page / liste globale des écarts · filtres campagne
- Annulation `CANCELLED` + `cancelReason` (API prête, UI plus tard)
- Passage forcé `OPEN` → `IN_PROGRESS` (implicite via remédiation / submit verify)
- Auto-passage exigence → `COMPLIANT` à la clôture
- Preuve justificative obligatoire à la clôture (COMP-001 « élément justificatif » — lot ultérieur)
- Modifs Nest / Prisma / rappels / remédiation plan

## 5. Décisions figées

1. **Source liste** = `listComplianceGaps(requirementId)` dédiée (pas seulement `detail.gaps`), queryKey `['compliance','gaps', clientId, requirementId]`.
2. **Transitions UI seules** : `(OPEN|IN_PROGRESS)→TO_VERIFY` · `TO_VERIFY→CLOSED` (+ note) · `TO_VERIFY→IN_PROGRESS` (rejet efficacité).
3. **Pas de nouvelle modale** : cycle inline dans le tiroir ; `StariumModal` remédiation inchangé.
4. **Permission** : actions patch si `compliance.update` ; lecture si `compliance.read` (aligné API).
5. **Pas d’option A/B** sur les libellés : Ouvert / En traitement / À vérifier / Clôturé / Annulé.

## By design

- **RGPD** : pas de nouveau DCP ; `verificationNote` métier ; pas de log email/note en clair côté UI.
- **RGAA** : labels, focus, `aria-live` via toasts existants, info statut = texte + badge (pas couleur seule).
- **DS** : tokens / `.starium-*` / feedback loading-empty-error ; pas de hex.
- **Sécurité** : client scope via `authFetch` + header client ; pas de `clientId` payload.
- **Mobile** : stack vertical, CTA ≥ 44px, liste scrollable dans le tiroir.

## Verdict

GO — 1 feature UI bornée, API déjà là, 7 fichiers max.
