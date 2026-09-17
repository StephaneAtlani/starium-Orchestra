# RFC-COMP-002 — Campagnes et dossier d’audit (V2)

Version : 0.1 — 17 septembre 2026  
**Statut** : 📝 Draft — **après** [RFC-COMP-001-A](./RFC-COMP-001-A%20—%20Évaluation%20opérationnelle%20(V1).md)  
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

## 3. Décisions ouvertes (à trancher en kickoff V2)

1. Introduire `ComplianceCriterion` / `ComplianceExpectation` ou garder exigence plate + champs JSON ?  
2. Périmètre = client seul vs sites/org units Starium ?  
3. Module actions correctives minimal vs uniquement projets/risques ?  
4. Stockage exports : TTL et bucket documents existant.

---

## 4. Backlog

Item `COMP.V2` dans [`docs/BACKLOG.md`](../BACKLOG.md) — **après** P0 `COMP.0`–`COMP.5`, horizon V1.1 / Fin 2026 selon charge.

---

## 5. Non-objectifs V2

IA d’évaluation, connecteurs SharePoint/EDR, notation officielle ISO/HAS, consolidation groupe multi-sites complexe (voir COMP-001 §4.2).
