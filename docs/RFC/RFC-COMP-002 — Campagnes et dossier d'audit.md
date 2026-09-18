# RFC-COMP-002 — Campagnes et dossier d’audit (V2)

Version : 0.2 — 18 septembre 2026  
**Statut** : ✅ **V2.8** — campagnes, import/export, NA, contributions, preuves versionnées, écarts, rappels ; **Lancer une revue** (scope domaines, modalité, owner, échéance, snapshot filtré, write-scope) ; **remédiation ↔ plans d’actions** (`ProjectTask.complianceGapId`)  
**UX cible (mock)** : [RFC-COMP-003](./RFC-COMP-003%20—%20CDC%20Conformité%20(fidélité%20mock).md) — revue / remédiation / détail référentiel  
**Spécification détaillée** : sections 5–17 de [RFC-COMP-001](./RFC-COMP-001%20—%20Pilotage%20de%20la%20conformité.md) (campagnes, contributions, preuves versionnées, instantanés, imports évaluations, rappels)  
**API** : [docs/API.md](../API.md) § Campagnes / Écarts (dont `…/remediation-plan`)

---

## 1. Objectif

Couvrir le parcours GRC « photographie » :

référentiel versionné → **campagne** sur périmètre → évaluations / validations → écarts dédiés → **instantané** exportable → **plans d’actions** de remédiation.

Prérequis : V1 évaluation opérationnelle livrée et stable.

---

## 2. Entrées (depuis COMP-001)

- Campagnes + états + figement version/périmètre (§7.1)  
- Applicabilité avec demande / approbation (§7.2)  
- Révisions et validation (§7.4)  
- Preuves versionnées + appréciations (§8)  
- Contributions (§9.1)  
- Écarts + efficacité (§9.2)  
- Indicateurs complets `E/A`, `V/A`, `C/A` (§12)  
- Import CSV évaluations + ZIP audit (§14)  
- AC-01…AC-30 hors sous-ensemble V1 (§17)

---

## 3. Décisions V2.1 (figées 2026-09-17) — amendées 2026-09-18

1. **Exigence plate** — pas de `ComplianceCriterion` / `ComplianceExpectation` ; réutiliser `ComplianceRequirement` + `ComplianceStatus`.
2. **Périmètre** = client actif uniquement (pas de sites / org units dans ce lot). Domaines de revue = `scopeDomainKeys` (clés `category`) sur `ComplianceCampaign`.
3. **Actions correctives** — **pas** d’entité `RemediationPlan` : pont vers le module **Plans d’actions** via `ProjectTask.complianceGapId` + `actionPlanId` (miroir risque). Permissions écriture : `compliance.update` + `projects.update`.
4. **Exports / instantanés** — payload JSON en base (`ComplianceCampaignSnapshot`) ; snapshot **filtré** sur `scopeDomainKeys` si renseigné ; pas de bucket documents dans V2.1.
5. **Write-scope** — si au moins une campagne `OPEN` du même FW a un scope non null, `PUT …/status` et `POST …/gaps` refusés (**400**) pour une exigence hors du scope d’**au moins une** revue ouverte.

---

## 4. Livré (code) — rappel 2026-09-18

| Capacité | Où |
| --- | --- |
| Modale **Lancer une revue** | `/compliance/frameworks/[id]` → `ComplianceStartReviewModal` |
| Workspace campagne | `/compliance/campaigns/[id]` — bandeau modalité / owner / échéance / **libellés** domaines |
| API campagne | `POST /api/compliance/campaigns` (+ `scopeDomainKeys`, `modality`, `ownerUserId`, `dueAt`) |
| Remédiation → plan | `POST …/requirements/:id/remediation-plan` (ensure gap) · `POST …/gaps/:id/remediation-plan` · `GET …/gaps/:id/action-plan-tasks` |
| Pont Prisma | `ProjectTask.complianceGapId` → `ComplianceGap` |
| Liaison doc | `compliance-action-plan` dans [LIAISONS-MODULES.md](../LIAISONS-MODULES.md) |

---

## 5. Backlog restant

Item `COMP.V2` partiellement clos dans [`docs/BACKLOG.md`](../BACKLOG.md). Reste éventuel : score pondéré mock, preuve fichier GED (`fut-evidence-ged`), owner obligatoire à la création de campagne (hors scope actuel).

---

## 6. Non-objectifs V2

- Certification / attestation légale.
- Multi-sites / org units comme périmètre campagne.
- Entité `RemediationPlan` dédiée.
- Auto-création de plan à chaque évaluation PARTIEL (CTA manuel uniquement).
