# RFC-COMP-001-A — Conformité : évaluation opérationnelle (V1)

Version : 1.0 — 17 septembre 2026  
**Statut** : 📝 Draft — à implémenter (priorité backlog P0)  
**RFC mère** : [RFC-COMP-001](./RFC-COMP-001%20—%20Pilotage%20de%20la%20conformité.md)  
**Écarts** : [RFC-COMP-001-ecarts-mvp](./RFC-COMP-001-ecarts-mvp.md)  
**Suite** : [RFC-COMP-002](./RFC-COMP-002%20—%20Campagnes%20et%20dossier%20d'audit.md)

---

## 1. Objectif

Rendre le parcours quotidien **utilisable** sur le MVP existant :

> Activer un référentiel → lister les exigences → **évaluer** (statut + constat + preuve) → traiter un écart via **risque / action** → voir des KPI honnêtes.

Starium ne certifie pas. Pas de campagne ni de dossier d’audit ZIP en V1.

---

## 2. Périmètre V1

### Inclus

| Capacité | Détail |
| --- | --- |
| Évaluer | Modale exigence : statut, commentaire obligatoire si ≠ non évalué, date revue optionnelle |
| Preuves | Créer preuve (titre + URL et/ou observation) liée à l’exigence ; lister / compter |
| N/A | Statut `NOT_APPLICABLE` + justification dans commentaire (permission update) |
| Liste | Filtres déjà livrés + refresh après mutation |
| KPI | Dashboard : dénominateur `A`, effectifs, jamais 100 % si `A=0` |
| Écart | Depuis modale : lier / créer risque projet (`complianceRequirementId`) ; CTA action si module dispo |
| Audit | Log patch status + create evidence |
| RGAA / DS / mobile | Norme Starium sur la modale |

### Exclus (→ COMP-002)

Campagnes, versions immuables avancées, attendus multiples, contributions, validation 4-états, instantanés, import CSV évaluations, rappels planifiés, écarts métier dédiés.

---

## 3. Hypothèses

1. Une **exigence** MVP = unité évaluable COMP-001 (pas de sous-attendus).  
2. `PATCH /api/compliance/status/:id` et `POST /api/compliance/evidence` sont la vérité ; l’UI les branche.  
3. Si le statut n’existe pas encore : **upsert** status (endpoint existant ou `PUT`/`POST` à confirmer en C0).  
4. Preuve fichier GED = hors V1 (`fut-evidence-ged`).

---

## 4. Fichiers cibles (indicatif)

| Couche | Chemins |
| --- | --- |
| API | `apps/api/src/modules/compliance/*` — upsert status, DTO commentaire, audit |
| Web API | `apps/web/src/features/compliance/api/compliance.api.ts` |
| UI | `compliance-requirement-detail-modal.tsx` — formulaire Évaluer + preuves |
| KPI | `compliance.service` dashboard + `compliance-kpi-strip` |
| Tests | service isolation + transitions ; vitest filtres / labels |
| Doc | `docs/MANUEL-70-CONFORMITE.md`, `docs/API.md` § conformité |

---

## 5. Lots

| Lot | Livrable | Done when |
| --- | --- | --- |
| **COMP.0** | Inventaire C0 (endpoints status exacts, upsert, permissions) + glossaire UI figé | Note écarts validée, pas d’ambiguïté API |
| **COMP.1** | Formulaire Évaluer dans modale + invalidation query liste/dashboard | AC : conforme sans justificatif **refusé** ; save → liste à jour |
| **COMP.2** | Ajout preuve (URL / observation) depuis la modale | Preuve visible + compteur liste |
| **COMP.3** | N/A + commentaire obligatoire ; signal « À réexaminer » si `nextReview` dépassée (champ ou `nextAuditAt` framework) | AC N/A sans motif refusé |
| **COMP.4** | Lien / création risque depuis écart ; indicateurs `A/E/C` | KPI + pont risque OK |
| **COMP.5** | Doc manuel + recettes AC sous-ensemble V1 | Manuel à jour |

---

## 6. Critères de recette V1 (sous-ensemble COMP-001)

| ID | Scénario | Attendu |
| --- | --- | --- |
| A-01 | Évaluer conforme avec commentaire + ≥1 preuve | Status `COMPLIANT` persisté |
| A-02 | Conforme sans preuve ni observation | Refus serveur |
| A-03 | Partiel / non conforme | Status OK ; CTA risque proposé |
| A-04 | N/A sans commentaire | Refus |
| A-05 | Accès autre client | 404/403, aucune fuite |
| A-06 | Contributeur sans `compliance.update` | Refus mutation |
| A-07 | `A=0` | « Non calculable », pas 100 % |
| A-08 | Fermer risque lié | Exigence **non** auto-conforme |

(AC campagnes / import / instantané = COMP-002.)

---

## 7. Conformité by design

Voir [écarts §8](./RFC-COMP-001-ecarts-mvp.md#8-conformité-by-design-rappel-v1).

---

## 8. Ordre d’implémentation Cursor

1. COMP.0 (lecture code status upsert)  
2. COMP.1 → COMP.2 → COMP.3  
3. COMP.4 KPI + risque  
4. COMP.5 doc  

Ne pas démarrer COMP-002 avant clôture COMP.1–COMP.4.
