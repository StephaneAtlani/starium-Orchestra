# RFC-COMP-002 — Campagnes et dossier d’audit (V2)

Version : 0.1 — 17 septembre 2026  
**Statut** : 🚧 V2.2 — campagnes + instantanés + import CSV évaluations + UI revue / dashboard (après [RFC-COMP-001-A](./RFC-COMP-001-A%20—%20Évaluation%20opérationnelle%20(V1).md))
**UX cible (mock)** : [RFC-COMP-003](./RFC-COMP-003%20—%20CDC%20Conformité%20(fidélité%20mock).md) — revue / remédiation / détail référentiel  
**Spécification détaillée** : sections 5–17 de [RFC-COMP-001](./RFC-COMP-001%20—%20Pilotage%20de%20la%20conformité.md) (campagnes, contributions, preuves versionnées, instantanés, imports évaluations, rappels)

---

## 1. Objectif

Couvrir le parcours GRC « photographie » :

référentiel versionné → **campagne** sur périmètre → évaluations / validations → écarts dédiés → **instantané** exportable.

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

## 3. Décisions V2.1 (figées 2026-09-17)

1. **Exigence plate** — pas de `ComplianceCriterion` / `ComplianceExpectation` ; réutiliser `ComplianceRequirement` + `ComplianceStatus`.
2. **Périmètre** = client actif uniquement (pas de sites / org units dans ce lot).
3. **Actions correctives** — uniquement via projets / risques existants ; pas de module actions dédié.
4. **Exports / instantanés** — payload JSON en base (`ComplianceCampaignSnapshot`) ; pas de bucket documents dans V2.1.

---

## 4. Backlog

Item `COMP.V2` dans [`docs/BACKLOG.md`](../BACKLOG.md) — **après** P0 `COMP.0`–`COMP.5`, horizon V1.1 / Fin 2026 selon charge.

---

## 5. Non-objectifs V2

IA d’évaluation, connecteurs SharePoint/EDR, notation officielle ISO/HAS, consolidation groupe multi-sites complexe (voir COMP-001 §4.2).
