# RFC-PROC-003 — Versioning des procédures

Version : 1.0 — 17 septembre 2026

| Métadonnée | Valeur |
| --- | --- |
| **Statut** | 📝 Draft |
| **Parent** | [RFC-PROC-001](./RFC-PROC-001%20—%20Module%20Procédures%20(cadrage%20et%20backlog%20user%20stories).md) |
| **Dépend de** | [RFC-PROC-002](./RFC-PROC-002%20—%20Créer%20éditer%20archiver%20procédures%20et%20contenu%20riche.md) · transitions / `IN_REVIEW` : [RFC-PROC-006](./RFC-PROC-006%20—%20CDC%20Procédures%20fidélité%20mock%20design%20handoff.md) |
| **Suite** | [RFC-PROC-004](./RFC-PROC-004%20—%20Export%20Word%20PDF%20procédures%20avec%20logo.md) |

> **Note 2026-09-18** — Le publish immuable (clone draft + nouveau draft) reste la règle. L’endpoint `POST …/transition` et le statut `IN_REVIEW` sont spécifiés dans **PROC-006** (US-26) ; cette RFC garde US-05/06 (historique, restore).

---

## 1. Analyse de l'existant

Patterns de versioning déjà présents dans Orchestra :

| Domaine | Pattern | Réemploi |
| --- | --- | --- |
| Budget | `BudgetSnapshot` figé au workflow | Snapshot immuable à événement |
| Conformité | `ComplianceEvidence.version` + `supersedesId` | Chaîne de versions |
| Vision stratégique | Vision / schéma direction avec versions + archivage | Cycle brouillon → publié → nouvelle version |

Pour les procédures : **hybride** — brouillon mutable + publications immuables numérotées (proche vision / snapshot).

---

## 2. User stories

### US-PROC-05 — Publier une version et consulter l’historique

**En tant qu’** utilisateur avec `procedures.publish`,  
**je veux** publier le brouillon courant comme version figée et consulter l’historique,  
**afin de** disposer d’une référence auditables et d’une version « officielle » à diffuser.

#### Critères d’acceptation

1. Prérequis : procédure non `ARCHIVED` ; brouillon non vide (au moins un bloc texte ou média).
2. Action **Publier** : saisie optionnelle `changeSummary` (notes de version).
3. Effet transactionnel :
   - la version `DRAFT` courante passe en `PUBLISHED` (ou copie snapshot — **hypothèse retenue : le draft est cloné en PUBLISHED, puis un nouveau DRAFT est créé** pour continuer à éditer sans muter le publié) ;
   - `versionNumber` incrémenté (1, 2, 3…) ;
   - `Procedure.status = PUBLISHED` ;
   - `currentPublishedVersionId` mis à jour ;
   - `publishedAt` / `publishedByUserId` renseignés.
4. Une version `PUBLISHED` **refuse** tout `PATCH` contenu (`403`/`409`).
5. `GET …/versions` : liste décroissante avec n°, date, auteur (**libellé**), résumé, badge « Courante ».
6. `GET …/versions/:versionId` : contenu complet en lecture.
7. UI lecture : bascule « Version publiée courante » vs « Brouillon » si l’utilisateur a `update`.
8. Audit `procedure.version.published` (procedureId, versionNumber, summary — pas le JSON complet).

### US-PROC-06 — Restaurer une version publiée dans le brouillon (P1)

**En tant qu’** utilisateur avec `procedures.update` (+ `publish` si politique stricte),  
**je veux** repartir d’une ancienne version publiée comme nouveau brouillon,  
**afin de** corriger une régression ou republier une variante.

#### Critères d’acceptation

1. Action **Restaurer dans le brouillon** depuis une version `PUBLISHED`.
2. Écrase (après confirmation modale) le `contentJson` + titre snapshot du DRAFT courant.
3. **Ne supprime pas** et **ne modifie pas** les versions publiées existantes.
4. Ne publie pas automatiquement.
5. Audit `procedure.draft.restored_from_version`.
6. Hors V1 : diff visuel ligne à ligne (nice-to-have V1.1).

---

## 3. Hypothèses

1. **Modèle publish** = clone draft → published + nouveau draft (évite mutation du publié).
2. Numérotation **entière monotone** par procédure ; pas de semver en V1.
3. Pas de branches / forks.
4. Lecture publique externe hors scope (lien magique, portail).
5. Conservations : pas de purge auto des anciennes versions en V1 (rétention manuelle admin = V2).
6. Permission : `procedures.publish` distincte de `update` (séparation rédacteur / valideur).

---

## 4. Règles métier

```
[DRAFT procedure]
   └─ Version DRAFT (mutable)
         │ publish
         ▼
[PUBLISHED procedure]
   ├─ Version N PUBLISHED (immutable)
   └─ Version N+1 DRAFT (nouvelle, copie du contenu publié)

[ARCHIVED] : publish interdit ; restore draft interdit tant qu’archivé
```

Concurrence :

- Publish refuse si `expectedDraftUpdatedAt` ne matche pas.
- Deux publishes simultanés : unique constraint / transaction sérialisée.

---

## 5. API

| Méthode | Route | Perm |
| --- | --- | --- |
| GET | `/api/procedures/:id/versions` | read |
| GET | `/api/procedures/:id/versions/:versionId` | read |
| POST | `/api/procedures/:id/versions/publish` | publish | body: `{ changeSummary?, expectedDraftUpdatedAt }` |
| POST | `/api/procedures/:id/versions/:versionId/restore-to-draft` | update | P1 |

Réponse publish :

```json
{
  "procedure": { "id": "…", "status": "PUBLISHED", "title": "…" },
  "publishedVersion": {
    "id": "…",
    "versionNumber": 2,
    "publishedAt": "…",
    "publishedByDisplayName": "Alice Martin",
    "changeSummary": "Ajout § PRA"
  },
  "draftVersion": { "id": "…", "versionNumber": 3, "lifecycle": "DRAFT" }
}
```

---

## 6. UI

- Fiche procédure : bandeau version (`v2 · Publiée le … par …`).
- Onglet / page **Versions** : timeline ; actions Voir / Restaurer / Exporter (PROC-004).
- Modale publish (`StariumModal`) : résumé + confirmation.
- États empty (aucune publication) explicites.

---

## 7. Tests

- Publish clone + nouveau draft ; published immutable.
- Isolation client sur `versions/:id`.
- Publish sur ARCHIVED → 400.
- Concurrence `expectedDraftUpdatedAt` → 409.
- Restore P1 n’altère pas les published.
- Audit émis.

---

## 8. Conformité by design

| Axe | Exigence |
| --- | --- |
| **RGPD** | Auteur de publication = DCP ; logs sans corps ; conservation versions = finalité audit/gouvernance documentée |
| **RGAA** | Timeline clavier ; modale focus trap ; annonces publication |
| **DS** | Badges statut tokens ; pas d’ID version brut comme seul libellé (`Version 2` OK, UUID non) |
| **Sécurité** | Immutabilité enforce server-side ; publish RBAC ; pas d’accès version d’un autre client |
| **Mobile** | Timeline empilée ; CTA publish sticky accessible |

---

## 9. Points de vigilance

- Taille `contentJson` : indexer / limiter ; éventuel stockage objet pour très gros docs (hors V1).
- Assets : version publiée doit rester cohérente si asset soft-deleted → **hypothèse V1 : interdire delete asset référencé par une version PUBLISHED**.
- Export (PROC-004) cible une `versionId` explicite (défaut = published courante).

---

## 10. Récapitulatif

Couvre **US-PROC-05** (P0) et **US-PROC-06** (P1). Socle d’auditabilité pour conformité et exports figés.
