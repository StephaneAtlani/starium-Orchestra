# RFC-COMP-001 — Écarts MVP ↔ cible conformité

**Date** : 2026-09-17  
**Statut** : décision technique  
**RFC mère** : [RFC-COMP-001](./RFC-COMP-001%20—%20Pilotage%20de%20la%20conformité.md)  
**V1** : [RFC-COMP-001-A](./RFC-COMP-001-A%20—%20Évaluation%20opérationnelle%20(V1).md) · **V2** : [RFC-COMP-002](./RFC-COMP-002%20—%20Campagnes%20et%20dossier%20d'audit.md)

---

## 1. Décision

| Option | Choix |
| --- | --- |
| Rewrite schéma (Chapitre / Critère / Attendu / Campagne) dès V1 | ❌ Non |
| **Étendre le MVP** (`ComplianceFramework` / `Requirement` / `Status` / `Evidence`) | ✅ **Oui — COMP-001-A** |
| Campagnes, révisions, instantanés, contributions, import évaluations | ⏭ **COMP-002** (après V1 utilisable) |

**Raison** : le MVP client + catalogue plateforme (ADM-002) + UI liste/dashboard existent. Le trou critique est l’**évaluation** (API présente, UI lecture seule). Un rewrite bloquerait la valeur utilisateur.

---

## 2. Inventaire MVP (constaté)

| Élément | Chemin / contrat |
| --- | --- |
| Prisma | `ComplianceFramework`, `ComplianceRequirement`, `ComplianceStatus`, `ComplianceEvidence` — `apps/api/prisma/schema.prisma` |
| Statuts | `COMPLIANT` \| `PARTIALLY_COMPLIANT` \| `NON_COMPLIANT` \| `NOT_APPLICABLE` |
| API client | `GET/POST frameworks`, `activate`, `requirements`, `PATCH status/:id`, `POST evidence`, `dashboard`, `frameworks/summary` |
| Catalogue plateforme | RFC-ADM-002 — `clientId=null` + import CISO |
| UI | `/compliance/dashboard`, `/frameworks`, `/requirements` (+ modale détail **lecture seule**) |
| Pont | `ProjectRisk.complianceRequirementId` — LIAISONS `compliance-risk` |
| Preuves → GED | LIAISONS `fut-evidence-ged` (2027) — V1 : preuve URL / observation / fichier minimal existant |

---

## 3. Mapping glossaire

| UI / MVP actuel | COMP-001 (cible) | V1 (COMP-001-A) |
| --- | --- | --- |
| Référentiel | Référentiel + Version | Référentiel client (= instance activée) ; version = champ `version` |
| Exigence | Critère (+ Attendus) | **Exigence** = unité évaluable (1 statut) |
| — | Attendu | Hors V1 ( aplati dans l’exigence) |
| Statut courant | Révision d’évaluation | `ComplianceStatus` (1 ligne / exigence / client) |
| Preuve | Preuve + version + lien | `ComplianceEvidence` (pas de versionnage V1) |
| — | Campagne / périmètre | Hors V1 — contexte = **client actif** |
| — | Écart dédié | V1 : **écart = risque projet lié** (+ action existante si dispo) |
| Partiellement conforme | `PARTIEL` | Mapper `PARTIALLY_COMPLIANT` ↔ libellé « Partiellement conforme » |

---

## 4. Correspondance statuts

| COMP-001 | Prisma MVP | UI FR |
| --- | --- | --- |
| `NON_EVALUE` | absence de `ComplianceStatus` | Non évalué |
| `CONFORME` | `COMPLIANT` | Conforme |
| `PARTIEL` | `PARTIALLY_COMPLIANT` | Partiellement conforme |
| `NON_CONFORME` | `NON_COMPLIANT` | Écart |
| Non applicable (décision) | `NOT_APPLICABLE` | Non applicable |
| Demande N/A en attente | — | **V1 minimal** : pas de circuit demande/approbation séparé ; justification dans `comment` + statut N/A (permission `compliance.update`) |

---

## 5. Indicateurs

| MVP actuel | COMP-001 | Décision V1 |
| --- | --- | --- |
| `compliancePercent` = conformes / évaluées (hors N/A & non évalués) | `C/A`, `E/A`, `V/A` avec `A = N-NA-U` | Aligner le dashboard sur **dénominateur A** + effectifs ; pas de « validation » séparée en V1 (`V = E`) |

---

## 6. Permissions

| COMP-001 | MVP / à mapper V1 |
| --- | --- |
| Lecture | `compliance.read` |
| Évaluation / preuves / N/A | `compliance.update` |
| Gestion référentiels client | `compliance.update` (+ activation catalogue) |
| Validation distincte | Hors V1 (même permission ; historique acteur unique) |
| Export dossier audit | Hors V1 → COMP-002 |

---

## 7. Hors V1 (report COMP-002)

- Campagnes (`BROUILLON`…`ARCHIVEE`), duplication, figement périmètre  
- Chapitres / critères / attendus / recommandations séparés  
- Révisions `BROUILLON`→`VALIDEE`, contributeurs, demandes de complément  
- Versionnage preuves + appréciations par lien  
- Instantanés ZIP, import CSV évaluations, rappels J-7  
- Écarts métier dédiés + vérification d’efficacité (au-delà du pont risque)

---

## 8. Conformité by design (rappel V1)

- **RGPD** : preuves = docs potentiellement sensibles ; pas de DCP en logs ; rétention alignée documents ; scope `clientId`  
- **RGAA** : modale évaluation clavier, labels, `aria-live` après save  
- **DS** : `StariumModal`, libellés métier, loading/empty/error  
- **Sécurité** : jamais `clientId` payload ; DTO ; audit sur patch status / evidence  
- **Mobile** : modale centrée, cibles ≥ 44px, tableau exigences déjà borné viewport  

---

## 9. Backlog

Voir [`docs/BACKLOG.md`](../BACKLOG.md) section **Priorité immédiate — Conformité (P0)** : `COMP.0` … `COMP.5`.
