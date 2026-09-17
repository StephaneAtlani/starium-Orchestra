# RFC-COMP-001 — Écarts MVP ↔ cible conformité

**Date** : 2026-09-17  
**Statut** : décision technique  
**RFC mère** : [RFC-COMP-001](./RFC-COMP-001%20—%20Pilotage%20de%20la%20conformité.md)  
**V1** : [RFC-COMP-001-A](./RFC-COMP-001-A%20—%20Évaluation%20opérationnelle%20(V1).md) · **V2** : [RFC-COMP-002](./RFC-COMP-002%20—%20Campagnes%20et%20dossier%20d'audit.md) · **Mock** : [RFC-COMP-003](./RFC-COMP-003%20—%20CDC%20Conformité%20(fidélité%20mock).md)

---

## 1. Décision

| Option | Choix |
| --- | --- |
| Rewrite schéma (Chapitre / Critère / Attendu / Campagne) dès V1 | ❌ Non |
| **Étendre le MVP** (`ComplianceFramework` / `Requirement` / `Status` / `Evidence`) | ✅ **Oui — COMP-001-A** |
| Campagnes, révisions, instantanés, contributions, import évaluations | ⏭ **COMP-002** (après V1 utilisable) |

**Raison** : le MVP client + catalogue plateforme (ADM-002) + UI liste/dashboard existent. Le trou critique était l’**évaluation** — **comblé par COMP-001-A** (2026-09-17). Un rewrite campagnes bloquerait encore la valeur ; reporté à COMP-002.

---

## 2. Inventaire MVP (constaté → post COMP-001-A)

| Élément | Chemin / contrat |
| --- | --- |
| Prisma | `ComplianceFramework`, `ComplianceRequirement`, `ComplianceStatus`, `ComplianceEvidence` — `apps/api/prisma/schema.prisma` |
| Statuts | `COMPLIANT` \| `PARTIALLY_COMPLIANT` \| `NON_COMPLIANT` \| `NOT_APPLICABLE` |
| API client | `GET/POST frameworks`, `activate`, `requirements`, **`PUT requirements/:id/status`**, `PATCH status/:id`, `POST evidence` (`kind` dérivé), `dashboard` (`A`, `C/A`), `frameworks/summary` |
| Catalogue plateforme | RFC-ADM-002 — `clientId=null` + import CISO |
| UI | `/compliance/dashboard`, `/frameworks`, `/requirements` — modale **évaluer** + preuves + prev/next + CTA risque (COMP-001-A · COMP-003 UX.0) |
| Pont | `ProjectRisk.complianceRequirementId` — LIAISONS `compliance-risk` |
| Preuves → GED | LIAISONS `fut-evidence-ged` (2027) — V1 : preuve URL / observation / fichier minimal existant |

---

## 3. Mapping glossaire

| UI / MVP actuel | COMP-001 (cible) | V1 (COMP-001-A) |
| --- | --- | --- |
| Référentiel | Référentiel + Version | Référentiel client (= instance activée) ; version = champ `version` |
| Exigence | Critère (+ Attendus) | **Exigence** = unité évaluable (1 statut) |
| — | Attendu | Hors V1 (aplati dans l’exigence) |
| Statut courant | Révision d’évaluation | `ComplianceStatus` (1 ligne / exigence / client) |
| Preuve | Preuve + version + lien | `ComplianceEvidence` (pas de versionnage V1) |
| — | Campagne / périmètre | Hors V1 — contexte = **client actif** |
| — | Écart dédié | V1 : **écart = risque projet lié** (+ action existante si dispo) |
| Partiel (mock) | `PARTIEL` | `PARTIALLY_COMPLIANT` ↔ libellé **« Partiel »** (COMP-003) |
| À évaluer (mock) | `NON_EVALUE` | absence de statut ↔ **« À évaluer »** |

---

## 4. Correspondance statuts

| COMP-001 | Prisma MVP | UI FR (mock COMP-003) |
| --- | --- | --- |
| `NON_EVALUE` | absence de `ComplianceStatus` | À évaluer |
| `CONFORME` | `COMPLIANT` | Conforme |
| `PARTIEL` | `PARTIALLY_COMPLIANT` | Partiel |
| `NON_CONFORME` | `NON_COMPLIANT` | Écart |
| Non applicable (décision) | `NOT_APPLICABLE` | Non applicable |
| Demande N/A en attente | — | **V1 minimal** : pas de circuit demande/approbation séparé ; justification dans `comment` + statut N/A (permission `compliance.update`) |

---

## 5. Indicateurs

| MVP / mock | COMP-001 | Décision V1 |
| --- | --- | --- |
| Mock `cdCompliance` = moyenne pondérée (`part=0.5`) | `C/A`, `E/A`, `V/A` | **Produit** = `C/A` avec `A = N−NA−U` ; `null` si `A=0` (« Non calculable »). Score pondéré mock = option ouverte (COMP-003 H2) |
| Cartes référentiel `pct` statiques mock | — | Toujours dérivé API `frameworks/summary` |

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

- `COMP.0`–`COMP.5` : **clos** (COMP-001-A)
- Fidélité mock : `COMP.UX.*` — [RFC-COMP-003](./RFC-COMP-003%20—%20CDC%20Conformité%20(fidélité%20mock).md)
- Campagnes : `COMP.V2` — [RFC-COMP-002](./RFC-COMP-002%20—%20Campagnes%20et%20dossier%20d'audit.md)

Voir [`docs/BACKLOG.md`](../BACKLOG.md).
