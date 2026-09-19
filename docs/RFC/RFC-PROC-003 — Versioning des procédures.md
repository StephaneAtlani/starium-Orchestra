# RFC-PROC-003 — Versioning des procédures

Version : 1.1 — 18 septembre 2026

| Métadonnée | Valeur |
| --- | --- |
| **Statut** | ✅ Implémenté (major.minor) |
| **Parent** | [RFC-PROC-001](./RFC-PROC-001%20—%20Module%20Procédures%20(cadrage%20et%20backlog%20user%20stories).md) |
| **Dépend de** | [RFC-PROC-002](./RFC-PROC-002%20—%20Créer%20éditer%20archiver%20procédures%20et%20contenu%20riche.md) · transitions / `IN_REVIEW` : [RFC-PROC-006](./RFC-PROC-006%20—%20CDC%20Procédures%20fidélité%20mock%20design%20handoff.md) |
| **Suite** | [RFC-PROC-004](./RFC-PROC-004%20—%20Export%20Word%20PDF%20procédures%20avec%20logo.md) |
| **PRD / Plan** | `docs/PRD.md` · `docs/PLAN.md` · `docs/DESIGN.md` |

> **Note 2026-09-18** — Numérotation **`v{major}.{minor}`** (plus d’entier monotone). Le draft technique n’a **pas** de n° ; le n° est figé à la publish. `bumpType` `MINOR` (défaut) / `MAJOR` (commentaire obligatoire). 1ʳᵉ publish = `v1.0`. Publish via `POST …/transition` `{ to: PUBLISHED, bumpType?, changeSummary? }`.

---

## 1. Analyse de l'existant

Patterns de versioning déjà présents dans Orchestra :

| Domaine | Pattern | Réemploi |
| --- | --- | --- |
| Budget | `BudgetSnapshot` figé au workflow | Snapshot immuable à événement |
| Conformité | `ComplianceEvidence.version` + `supersedesId` | Chaîne de versions |
| Vision stratégique | Vision / schéma direction avec versions + archivage | Cycle brouillon → publié → nouvelle version |

Pour les procédures : **hybride** — brouillon technique mutable (sans n°) + publications immuables `vX.Y`.

---

## 2. User stories

### US-PROC-05 — Publier une version et consulter l’historique

**En tant qu’** utilisateur avec `procedures.publish` (ou validateur selon config cycle),  
**je veux** publier le brouillon courant comme version figée `vX.Y` (mineure ou majeure) et consulter l’historique,  
**afin de** disposer d’une référence auditable et d’une version « officielle » à diffuser.

#### Critères d’acceptation

1. Prérequis : procédure non `ARCHIVED` ; brouillon non vide.
2. Action **Publier** : choix Mineure (défaut) / Majeure + aperçu `vX.Y` ; `changeSummary` **obligatoire si Majeure** (sauf 1ʳᵉ = `v1.0` forcée).
3. Effet transactionnel :
   - le draft technique passe en `PUBLISHED` avec `versionMajor` / `versionMinor` / `bumpType` ;
   - un **nouveau draft technique** (major/minor `NULL`) est créé (copie du contenu) ;
   - `Procedure.status = PUBLISHED` ; `currentPublishedVersionId` mis à jour ;
   - `publishedAt` / `publishedByUserId` renseignés.
4. Une version `PUBLISHED` **refuse** tout `PATCH` contenu.
5. `GET …/versions` : publiées only, décroissant, libellé `vX.Y`, date, auteur (**libellé**), résumé, badges Courante / Majeure.
6. `GET …/versions/:versionId` : contenu complet en lecture.
7. UI : brouillon **sans** `vX.Y` ; publiée courante affichée à part.
8. Audit `procedure.version.published` (procedureId, versionLabel, bumpType, summary — pas le JSON complet).

### US-PROC-06 — Restaurer une version publiée dans le brouillon

**En tant qu’** utilisateur avec `procedures.update`,  
**je veux** repartir d’une ancienne version publiée comme contenu du brouillon,  
**afin de** corriger une régression ou republier une variante.

#### Critères d’acceptation

1. Action **Restaurer dans le brouillon** depuis une version `PUBLISHED` (confirmation).
2. Écrase le `contentJson` + titre du DRAFT courant.
3. **Ne supprime pas** et **ne modifie pas** les versions publiées ; **ne crée pas** de nouveau `vX.Y`.
4. Ne publie pas automatiquement.
5. Audit `procedure.draft.restored_from_version`.
6. Hors scope : diff visuel ligne à ligne.

---

## 3. Hypothèses

1. **Modèle publish** = draft → published + nouveau draft technique (évite mutation du publié).
2. Numérotation **`major.minor`** ; 1ʳᵉ = `1.0` ; mineure `minor++` ; majeure `major++`, `minor = 0`.
3. Pas de branches / forks / patch.
4. Lecture publique externe hors scope.
5. Pas de purge auto des anciennes versions en V1.
6. Même permission `procedures.publish` pour mineure et majeure.
7. Diffusion industrialisée (mail/Teams/ack) hors scope — toute publish = version officielle.

---

## 4. Règles métier

```
[DRAFT procedure]
   └─ Version DRAFT technique (mutable, major/minor NULL)
         │ publish (bumpType MINOR|MAJOR)
         ▼
[PUBLISHED procedure]
   ├─ Version vX.Y PUBLISHED (immutable)
   └─ Version DRAFT technique (nouvelle, copie du contenu, sans n°)

[ARCHIVED] : publish interdit ; restore draft interdit tant qu’archivé
```

Concurrence :

- Publish refuse si `expectedUpdatedAt` ne matche pas.
- Deux publishes simultanés : unique `(procedureId, versionMajor, versionMinor)` / transaction.

---

## 5. API

| Méthode | Route | Perm |
| --- | --- | --- |
| GET | `/api/procedures/:id/versions` | read |
| GET | `/api/procedures/:id/versions/:versionId` | read |
| POST | `/api/procedures/:id/transition` `{ to: PUBLISHED, bumpType?, changeSummary?, expectedUpdatedAt? }` | publish (gate) |
| POST | `/api/procedures/:id/versions/:versionId/restore-to-draft` | update |

---

## 6. UI

- Fiche : méta « Brouillon » + « Publiée courante : vX.Y » si existante.
- Panneau **Historique** : timeline publiées ; badges ; restore.
- Modale publish (`StariumModal`) : segmented Mineure/Majeure + aperçu + commentaire.

---

## 7. Tests

- 1ʳᵉ publish → `v1.0` ; mineure → `v1.1` ; majeure sans commentaire → 400 ; majeure avec commentaire → `v2.0`.
- Isolation client sur `versions/:id`.
- Restore n’altère pas les published.
- Audit émis.

---

## 8. Conformité by design

| Axe | Exigence |
| --- | --- |
| **RGPD** | Auteur de publication = DCP ; logs sans corps ; conservation versions = finalité audit/gouvernance |
| **RGAA** | Timeline clavier ; modale focus trap ; erreurs `aria-invalid` / `aria-describedby` |
| **DS** | Badges tokens ; libellé `vX.Y` jamais UUID |
| **Sécurité** | Immutabilité publish ; RBAC ; isolation client |
| **Mobile** | Timeline empilée ; CTA publish accessible ≥ 44px |
