# RFC-COMP-004 — Gestion des preuves de conformité

Version : 0.1 — 18 septembre 2026  
**Statut** : 📝 **Draft**  
**Parents** : [RFC-COMP-001](./RFC-COMP-001%20—%20Pilotage%20de%20la%20conformité.md) §8 · [RFC-COMP-001-A](./RFC-COMP-001-A%20—%20Évaluation%20opérationnelle%20(V1).md) · [RFC-COMP-002](./RFC-COMP-002%20—%20Campagnes%20et%20dossier%20d'audit.md) · [RFC-COMP-003](./RFC-COMP-003%20—%20CDC%20Conformité%20(fidélité%20mock).md)  
**Liaison future** : `fut-evidence-ged` ([LIAISONS-MODULES](../LIAISONS-MODULES.md)) · [RFC-PROC-*](./RFC-PROC-001%20—%20Module%20Procédures%20(cadrage%20et%20backlog%20user%20stories).md) (référence procédure)

---

## 1. Objectif

Rendre le panneau **Preuves & documents** du tiroir d’évaluation digne d’un dossier d’audit : créer / consulter / apprécier / versionner / retirer des preuves, avec métadonnées lisibles et règles métier alignées COMP-001 §8 — sans attendre le module GED 2027 pour livrer le parcours URL / observation / référence.

---

## 2. Analyse de l’existant

### 2.1 Backend (partiel)

| Capacité | État |
| --- | --- |
| Modèle `ComplianceEvidence` (`name`, `description`, `url`, `fileId`, `version`, `isCurrent`, `supersedesId`, `assessment`, `collectedAt`) | ✅ |
| Enum `ComplianceEvidenceAssessment` : `TO_REVIEW` / `RELEVANT` / `PARTIAL` / `INSUFFICIENT` | ✅ |
| `POST /api/compliance/evidence` (kinds `URL` \| `OBSERVATION` \| `FILE`) | ✅ |
| `PATCH /api/compliance/evidence/:id` (appréciation, nom, description, `collectedAt`) | ✅ API, ❌ UI |
| `POST /api/compliance/evidence/:id/versions` | ✅ API, ❌ UI |
| Règle conforme ≥ 1 preuve « justifiable » (`evidenceJustifiesCompliance`) | ✅ |
| `DELETE` / archivage preuve | ❌ |
| Upload binaire / rattachement GED (`fileId` réel) | ❌ (`fut-evidence-ged`) |
| Kind métier **Référence** (politique / procédure) distinct de `OBSERVATION` | ❌ (UI mock le propose, API le mappe en observation) |

### 2.2 Frontend (tiroir évaluation)

| Capacité | État |
| --- | --- |
| Menu d’ajout (fichier / lien / référence / note) | ✅ partiel |
| Formulaire inline titre + URL / détail | ✅ minimal |
| Liste (icône kind + nom + lien) | ✅ minimal |
| Suppression (mock `assDelEvidence`) | ❌ |
| Édition / appréciation | ❌ |
| Nouvelle version | ❌ |
| Date de collecte, auteur, métadonnées (type · taille · date) | ❌ |
| Upload fichier (kind `FILE`) | ❌ — formulaire affiché, `fileId` jamais renseigné |
| Réutiliser une preuve existante (autre exigence) | ❌ |
| Sélecteur procédure / politique (PROC) | ❌ |

### 2.3 Mock CDC (`Conformite.html` / `conformite.js`)

- Liste avec icône type, libellé, méta (`PDF · 480 Ko · date` / `Lien externe · date` / `Référence interne` / `Note`).
- Bouton retirer (×) sur chaque ligne.
- Quatre types d’ajout ; fichier = placeholder mock (pas d’upload réel).

### 2.4 Écarts produit (pourquoi cette RFC)

La V1 (001-A) a volontairement borné les preuves à « créer URL/observation pour débloquer conforme ». COMP-002 a ajouté versionnage + appréciation **côté API**, mais le tiroir UI reste un stub : l’évaluateur ne peut pas gérer le cycle de vie d’une preuve. C’est bloquant pour un dossier d’audit crédible.

---

## 3. Hypothèses (à valider)

1. **H1** — Pas de GED transverse avant 2027 : le lot « fichier » de cette RFC = soit **désactivation UI du kind FILE** jusqu’à `fut-evidence-ged`, soit **upload silo conformité** minimal (document client-scopé dédié) — décision produit au plan.
2. **H2** — Kind **REFERENCE** : pointeur vers une **procédure** (PROC) ou un libellé libre + URL interne ; pas un 5ᵉ type binaire.
3. **H3** — Soft-delete / `isCurrent=false` plutôt que hard-delete si la preuve a été figée dans un snapshot de campagne.
4. **H4** — Appréciation au niveau **preuve ↔ exigence** (modèle actuel plat) ; le modèle « attendus multiples » COMP-001 reste hors scope.
5. **H5** — Permissions : lecture `compliance.read` ; écriture `compliance.update` ; pas de permission dedicated `evidence.*` en V1 de cette RFC.

---

## 4. Périmètre

### In scope (lots proposés)

| Lot | Contenu |
| --- | --- |
| **COMP.EV.1** | UX liste fidèle mock : méta, empty, actions retirer / ouvrir ; désactiver ou masquer FILE tant que pas d’upload |
| **COMP.EV.2** | CRUD UI : éditer métadonnées ; DELETE soft ou hard selon H3 ; confirmation accessible |
| **COMP.EV.3** | Appréciation (`assessment`) + libellés métier ; impact sur « preuve justifiable » pour conforme |
| **COMP.EV.4** | Versionnage UI (`POST …/versions`) + historique des versions courante / archivées |
| **COMP.EV.5** | Kind REFERENCE + date de collecte + auteur affiché (libellé, jamais ID) |
| **COMP.EV.6** | Réutiliser une preuve existante du client (picker labellisé) |
| **COMP.EV.7** | *(option)* Upload fichier silo conformité **ou** branchement GED — voir H1 |

### Hors scope

- Module GED transverse / CMDB (`fut-evidence-ged` roadmap 2027).
- Critères / attendus multi-niveaux (COMP-001 cible).
- Téléchargement serveur d’URL externes.
- Score pondéré mock, campagnes (déjà COMP-002).

---

## 5. User stories

### US-EV-01 — Consulter les preuves d’une exigence

**En tant qu’** évaluateur, **je veux** voir pour chaque preuve un type lisible, un titre, une méta (date, nature) et l’appréciation, **afin de** juger rapidement la couverture.

**Critères**

- Empty state « Aucune preuve jointe. »
- Ligne : icône kind · titre (lien si URL) · méta · badge appréciation · actions.
- Aucun ID technique visible (`pnpm audit:ui-ids`).

### US-EV-02 — Ajouter une preuve (lien / note / référence)

**En tant qu’** évaluateur avec `compliance.update`, **je veux** ajouter une preuve selon le type, **afin de** justifier l’évaluation.

**Critères**

- Menu 3 ou 4 options (FILE masqué ou désactivé avec hint si H1 = différé).
- Validation serveur : URL requise pour `URL` ; texte pour `OBSERVATION` / `REFERENCE`.
- Audit log `compliance.evidence.create`.
- Toast succès + refresh détail exigence.

### US-EV-03 — Retirer une preuve

**En tant qu’** évaluateur, **je veux** retirer une preuve non figée, **afin de** corriger une erreur.

**Critères**

- Confirmation (StariumModal) ; `aria` OK.
- Si preuve référencée dans un snapshot : refus explicite ou soft-archive (H3).
- Recalcul règle « conforme sans preuve » à l’enregistrement suivant du statut.

### US-EV-04 — Apprécier une preuve

**En tant qu’** évaluateur / validateur, **je veux** marquer une preuve `À examiner` / `Pertinente` / `Partielle` / `Insuffisante`, **afin de** documenter la couverture.

**Critères**

- UI select / segmented labellisé (pas d’enum brut).
- `INSUFFICIENT` ne compte **pas** pour justifier un statut conforme (déjà backend).
- Audit `compliance.evidence.patch`.

### US-EV-05 — Nouvelle version

**En tant qu’** évaluateur, **je veux** déposer une nouvelle version d’une preuve, **afin de** conserver l’historique sans écraser la référence audit.

**Critères**

- `POST …/versions` → nouvelle ligne `isCurrent`, ancienne conservée.
- Signal UI « nouvelle version — réexamen recommandé » sur l’exigence (badge / hint).
- Libellés : « v2 (courante) », « v1 (archivée) ».

### US-EV-06 — Réutiliser une preuve

**En tant qu’** évaluateur, **je veux** rattacher une preuve déjà existante du client à cette exigence, **afin d’** éviter les doublons.

**Critères**

- Picker scoped client, options = titre + kind + date (jamais ID).
- Soit duplication logique légère (même `fileId`/`url`), soit lien partagé — **décider au plan** (préférer copie métadonnées + même `fileId` pour ne pas coupler les appréciations).

### US-EV-07 — Fichier binaire (lot conditionnel)

**En tant qu’** évaluateur, **je veux** joindre un PDF/DOCX, **afin de** figer une pièce dans le dossier.

**Critères** (si H1 = silo)

- Upload validé (type MIME, taille max), `fileId` persisté, téléchargement scoped client.
- Sinon : report `fut-evidence-ged` + UI FILE masquée.

---

## 6. API (cible)

Existant à **brancher UI** :

- `POST /api/compliance/evidence`
- `PATCH /api/compliance/evidence/:id`
- `POST /api/compliance/evidence/:id/versions`

À **ajouter** :

| Méthode | Route | Notes |
| --- | --- | --- |
| `DELETE` | `/api/compliance/evidence/:id` | Soft ou hard selon H3 ; 409 si snapshot |
| `GET` | `/api/compliance/evidence?requirementId=` | Liste paginée (détail exigence peut suffire en V1) |
| `GET` | `/api/compliance/evidence/search?q=` | Picker réutilisation (libellés) |

DTO : étendre create avec `kind: REFERENCE` (ou convention `OBSERVATION` + flag `referenceCode`) ; `collectedAt` à la création.

Isolation : `clientId` depuis le scope ; jamais depuis le body.

---

## 7. UI / Design System

- Zone dans `ComplianceAssessDrawerBody` — section **Preuves & documents**.
- Menu ajout : portal `z ≥ 90` (déjà en place).
- Confirmations / édition : **`StariumModal`** uniquement.
- États loading / empty / error.
- Mobile : liste en cartes empilées, cibles ≥ 44px, pas d’action hover-only.
- Libellés appréciation FR : « À examiner », « Pertinente », « Partielle », « Insuffisante ».

---

## 8. Fichiers probables

| Zone | Fichiers |
| --- | --- |
| API | `compliance.service.ts`, `compliance.controller.ts`, DTO evidence, `compliance.service.spec.ts` |
| Prisma | évent. enum kind `REFERENCE` ; migration soft-delete / `archivedAt` |
| Web | `compliance-assess-drawer-body.tsx`, `compliance-requirement-detail-modal.tsx`, `compliance.api.ts`, nouveau `compliance-evidence-*.tsx` (liste / modal) |
| Doc | `API.md`, `LIAISONS-MODULES.md` (si silo docs), `MANUEL-70-CONFORMITE.md`, `BACKLOG.md` |

---

## 9. Tests

- Isolation inter-clients create / patch / delete / version / search.
- Conforme refusé si seules preuves `INSUFFICIENT`.
- Version : ancienne `isCurrent=false`, nouvelle `TO_REVIEW`.
- Delete bloqué si snapshot (si H3).
- UI : `audit:ui-ids`, `audit:modals`, parcours clavier menu + confirm.

---

## 10. Conformité by design

### RGPD

- Preuves = potentiellement documents sensibles / DCP indirectes (noms, emails dans PDF).
- Finalité : justification d’évaluation conformité du **client actif**.
- Minimisation : pas de scrape d’URL ; pas de contenu binaire dans logs / audit (réfs id + titre).
- Rétention : alignée documents client ; purge / anonymisation auteur si user effacé (conserver libellé historique).
- Droits : export via dossier campagne ; effacement selon H3.

### RGAA

- Liste en éléments focusables ; menu `role="menu"` ; confirmations piège de focus géré (StariumModal).
- Appréciation : pas couleur seule (libellé + badge).
- `aria-live` sur ajout / erreur.

### Design System

- Tokens uniquement ; `StariumModal` ; empty / loading / error ; **jamais d’ID en UI**.

### Sécurité

- Authz `compliance.*` client-aware ; validation DTO ; audit actions sensibles ; pas de sur-exposition `fileId` brut sans libellé.

### Mobile

- Tiroir déjà side-panel ; formulaires preuve full-width ; cibles 44px ; pas de dépendance hover.

---

## 11. Découpage BACKLOG proposé

| Item | Contenu | Dépendance |
| --- | --- | --- |
| `COMP.EV.1` | Liste + méta + FILE masqué/hint | — |
| `COMP.EV.2` | Edit + delete | EV.1 |
| `COMP.EV.3` | Appréciation UI | EV.1 |
| `COMP.EV.4` | Versions UI | EV.2 |
| `COMP.EV.5` | REFERENCE + collectedAt | EV.1 |
| `COMP.EV.6` | Réutilisation picker | EV.2 |
| `COMP.EV.7` | Upload fichier / GED | H1 · `fut-evidence-ged` |

---

## 12. Points de vigilance

- Ne pas laisser le menu **Fichier** promettre un upload tant que `fileId` n’est pas branché.
- Snapshots campagne : toute suppression doit respecter l’intégrité du dossier d’audit.
- Pont PROC (référence procédure) : attendre stabilité PROC-002/003 ou accepter libellé libre en EV.5.
- Ne pas confondre preuve et **plan d’actions** / risque (déjà COMP-002 remédiation).

---

## 13. Critères d’acceptation RFC (Draft → Ready)

- [ ] H1–H5 tranchées
- [ ] Lots EV.1–EV.6 priorisés
- [ ] Contrats API delete / search figés dans `API.md` au moment du plan
- [ ] Maquette / alignement mock CDC validé produit
