# RFC-PROC-008 — Modèles de procédures (outline client)

Version : 1.0 — 19 septembre 2026

| Métadonnée | Valeur |
| --- | --- |
| **Statut** | ✅ Implémenté (V1 outline — phases 1–4) |
| **Priorité** | Haute (standardisation à la création) |
| **Parent** | [RFC-PROC-001](./RFC-PROC-001%20—%20Module%20Procédures%20(cadrage%20et%20backlog%20user%20stories).md) |
| **PRD / PLAN** | [`docs/PRD.md`](../PRD.md) · [`docs/PLAN.md`](../PLAN.md) |
| **S’appuie sur** | [RFC-PROC-002](./RFC-PROC-002%20—%20Créer%20éditer%20archiver%20procédures%20et%20contenu%20riche.md) · [RFC-PROC-006](./RFC-PROC-006%20—%20CDC%20Procédures%20fidélité%20mock%20design%20handoff.md) (`contentJson` blocs v2) · [RFC-PROC-007](./RFC-PROC-007%20—%20Configuration%20module%20Procédures%20(cycle%20validateurs%20catégories).md) (`ProcedureCategory`) |
| **Diagrammes** | [`docs/diagrams/procedures-templates/`](../diagrams/procedures-templates/) — cycle de vie · création depuis modèle · qui fait quoi (`.excalidraw` + PNG/SVG) |

---

## 1. Analyse de l’existant

| Élément | Constat |
| --- | --- |
| Création procédure | `POST /api/procedures` → brouillon avec `EMPTY_PROCEDURE_DOC` (`h1` + `p` vides) — **pas** de template |
| Contenu | Blocs `schemaVersion: 2` (`h1`\|`h2`\|`h3`\|…) — PROC-006 |
| Templates voisin | `MeetingTemplate` (réunions) — pattern CRUD client + manage |
| PROC-005 | Listait « Templates de procédures préremplis (V1.1) » en hors-scope — **remplacé par cette RFC** |
| Logo client | RFC-PROC-004 — **hors** cette livraison |

**Verdict** : livrer des **modèles client** (outline titres) + application **copie figée** à la création.

---

## 2. Hypothèses

1. Un modèle = artefact **client-scopé** (`ProcedureTemplate`), pas de catalogue plateforme V1.
2. Contenu V1 = **outline** `{ level: 1|2|3, title }[]` stocké en `outlineJson` — pas de corps riche (V1.x).
3. Application = **copie figée** dans le draft `contentJson` ; traçabilité soft `sourceTemplateId` + `sourceTemplateName`.
4. Permission **`procedures.templates.manage`** pour le catalogue ; picker = **`procedures.create`** (ou manage).
5. Isolation : toute query filtrée `clientId` ; jamais de `clientId` dans le body.

---

## 3. User stories (US-PROC-32…)

Index détaillé aligné PRD (US-1…18 du PRD = US-PROC-32…49 ci-dessous, regroupées) :

| ID | Résumé | Priorité |
| --- | --- | --- |
| **US-PROC-32** | CRUD modèles (nom, catégorie optionnelle, outline) en brouillon | P0 |
| **US-PROC-33** | Warning imbrication non bloquant | P0 |
| **US-PROC-34** | Activer (nom + ≥1 H1) / archiver / éditer actif | P0 |
| **US-PROC-35** | Page `/procedures/templates` + deny sans manage | P0 |
| **US-PROC-36** | Création procédure avec modèle ACTIVE (aperçu, catégorie préremplie, titres+p vides) ou document vide | P0 |
| **US-PROC-37** | « Créée depuis… » + delete / archive forcée si références | P0 |

Critères d’acceptation : voir `docs/PLAN.md` (phases 1–4, toutes cochées).

---

## 4. API

Base : `/api/procedure-templates` — guards JWT + client actif + module + permissions.

| Méthode | Route | Permission | Comportement |
| --- | --- | --- | --- |
| GET | `/api/procedure-templates` | `procedures.templates.manage` | Liste tous statuts du client |
| GET | `/api/procedure-templates/active` | `procedures.create` **ou** `templates.manage` | Liste `ACTIVE` (picker) |
| POST | `/api/procedure-templates` | manage | Création `DRAFT` |
| GET | `/api/procedure-templates/:id` | manage | Détail + outline + `hierarchyWarnings` |
| PATCH | `/api/procedure-templates/:id` | manage | Update (refus si `ARCHIVED`) |
| POST | `/api/procedure-templates/:id/transition` | manage | Body `{ status: DRAFT\|ACTIVE\|ARCHIVED }` ; ACTIVE exige nom + ≥1 H1 |
| DELETE | `/api/procedure-templates/:id` | manage | Hard delete si 0 procédure liée ; sinon archive forcée + message |

**Création procédure** — `POST /api/procedures` accepte `templateId?` :

- Template doit être `ACTIVE` et du client → sinon **400**.
- Draft initial = matérialisation outline (chaque titre → bloc `h1|h2|h3` + `p` vide).
- Pose `sourceTemplateId` + `sourceTemplateName` (snapshot).

**Détail procédure** — `GET /api/procedures/:id` expose :

- `sourceTemplateId`, `sourceTemplateName`, `sourceTemplateLabel` (nom live si template encore là, sinon snapshot).

Audits : `procedure.template.created|updated|transitioned|deleted|archived_on_delete`.

---

## 5. Schéma

```
ProcedureTemplate
  clientId, name, categoryId?, status (DRAFT|ACTIVE|ARCHIVED), outlineJson, createdByUserId?

Procedure
  + sourceTemplateId? → ProcedureTemplate (onDelete SetNull)
  + sourceTemplateName? (VARCHAR 200)
```

---

## 6. UI

| Route | Rôle |
| --- | --- |
| `/procedures/templates` | Catalogue + création |
| `/procedures/templates/[id]` | Édition outline, activer / archiver / supprimer |
| Dialog création procédure | Select modèle optionnel + aperçu outline |
| Fiche édition procédure | Mention « Créée depuis… » |

Nav : enfant **Modèles** sous Procédures (`procedures.templates.manage`).

---

## 7. Conformité by design

| Standard | Application |
| --- | --- |
| **RGPD** | Pas de DCP dans l’outline ; `createdByUserId` technique ; audits sans contenu nominatif excessif ; scope client |
| **RGAA** | Labels, `aria-live` warnings, cibles ≥ 44px, états loading/empty/error, focus visible |
| **Design System** | `PageHeader`, `StariumModal`, tokens, libellés métier (jamais d’ID en UI) |
| **Sécurité** | Authz + isolation client ; DTO validés ; HTML titres échappé à la matérialisation |
| **Mobile** | Layouts fluides, listes empilables, boutons min-h-11 |

---

## 8. Hors périmètre (V1)

Identique PRD : logo, modèles riches, catalogue système, « enregistrer comme modèle », sync vivant, versioning templates, code métier, export lié au modèle.

---

## 9. Implémentation (références code)

| Couche | Emplacement |
| --- | --- |
| Prisma | `ProcedureTemplate`, `ProcedureTemplateStatus`, FK source sur `Procedure` |
| API | `procedure-templates.controller.ts` / `.service.ts` |
| Create | `procedures.service.ts` (`templateId`, matérialisation) |
| UI | `features/procedures/components/procedure-template-*`, `procedure-create-dialog.tsx` |
| Perm | seed `procedures.templates.manage` (+ CLIENT_ADMIN procédures) |
| Tests | `procedure-templates.service.spec.ts`, outline util |

---

## 10. Points de vigilance

- Activer sans sauvegarder l’outline UI : le bouton **Activer** enchaîne save puis transition.
- Picker : uniquement `ACTIVE` ; archivé disparaît immédiatement de `/active`.
- Renommage template : `sourceTemplateLabel` préfère le nom live ; le snapshot reste pour le cas archive/delete soft.
