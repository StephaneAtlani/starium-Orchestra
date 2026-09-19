# RFC-PROC-001 — Module Procédures (cadrage et backlog user stories)

Version : 1.0 — 17 septembre 2026

| Métadonnée | Valeur |
| --- | --- |
| **Statut** | 📝 Draft — cadrage produit |
| **Priorité** | Haute (gouvernance documentaire / conformité) |
| **Livraisons** | [PROC-002](./RFC-PROC-002%20—%20Créer%20éditer%20archiver%20procédures%20et%20contenu%20riche.md) · [PROC-006](./RFC-PROC-006%20—%20CDC%20Procédures%20fidélité%20mock%20design%20handoff.md) (**cible UX**) · [PROC-007](./RFC-PROC-007%20—%20Configuration%20module%20Procédures%20(cycle%20validateurs%20catégories).md) (**config module**) · [PROC-008](./RFC-PROC-008%20—%20Modèles%20de%20procédures%20(outline%20client).md) (**modèles outline**) · [PROC-005](./RFC-PROC-005%20—%20Éditeur%20riche%20avancé%20des%20procédures.md) (historique TipTap, supersédé) · [PROC-003](./RFC-PROC-003%20—%20Versioning%20des%20procédures.md) · [PROC-004](./RFC-PROC-004%20—%20Export%20Word%20PDF%20procédures%20avec%20logo.md) |
| **Dépendances** | Multi-client + RBAC · stockage fichiers (RFC-035) · branding client · Conformité (pont futur preuves / références) |
| **Hors scope immédiat** | GED universelle · sync SharePoint · portail public · signature électronique · IA de rédaction |

---

## 1. Analyse de l'existant

| Élément | Constat |
| --- | --- |
| Module `procedures` / modèle `Procedure` | **Absent** (Prisma, Nest, UI) |
| Documents projet | `ProjectDocument` (RFC-PROJ-DOC-001/002) — silo **projet**, pas procédures transverses |
| GED procurement | RFC-034/035 — pièces jointes PO/facture, dual stockage local/S3 |
| Conformité | Preuves `ComplianceEvidence` (URL / fichier / observation) ; mock UI parle de « politique / procédure » comme **référence texte**, sans entité Procedure |
| Branding / logo client | Type FE `ClientBranding.logoUrl` ; logo binaire **fournisseur** existe ; logo **client** pour exports pas encore unitaire (reports points projet passent un `logoUrl` souvent `null`) |
| Éditeur riche | Aucun TipTap / Lexical / Plate dans `apps/web` aujourd’hui |
| Export PDF | Générateurs maison (CODIR / réunions) — pattern réutilisable, pas de DOCX transverse |

**Verdict** : créer un **module métier dédié** `procedures` (client-scoped), distinct de `ProjectDocument` et de la GED procurement. Pont Conformité = V1.1 / V2 (rattacher une procédure publiée comme preuve / référence).

---

## 2. Problème à résoudre

Le DSI / RSSI / responsable opérationnel doit maintenir des **procédures internes** (PSSI, onboarding, PRA, gestion des accès, etc.) :

- rédigées dans Starium (pas seulement des PDF externes) ;
- enrichies (texte structuré, images/vidéo, liens internes Orchestra + liens externes) ;
- **versionnées** (auditabilité, publication, lecture de versions figées) ;
- **exportables** Word / PDF avec **logo de l’entreprise cliente** pour diffusion CODIR / audit.

---

## 3. Objectif produit

En tant qu’utilisateur autorisé du **client actif**, je gère le cycle de vie des procédures de mon organisation dans Orchestra : création → rédaction riche → publication de versions → archivage → export brandé.

---

## 4. Hypothèses structurantes (à valider)

1. **Scope** : une procédure appartient à **un seul client** ; jamais de lecture cross-client.
2. **Nature** : document métier **gouvernance / opérationnel**, pas un fichier projet. Lien optionnel vers projet / exigence conformité en V1.1.
3. **Contenu** : document JSON **blocs v2** (`schemaVersion: 2`) — cible produit [PROC-006](./RFC-PROC-006%20—%20CDC%20Procédures%20fidélité%20mock%20design%20handoff.md) (handoff design). Le socle TipTap PROC-002/005 est **obsolète** (jamais en prod). Pas de HTML libre non sanitizé.
4. **Cycle de vie procédure** : `DRAFT` → `IN_REVIEW` → `PUBLISHED` → `ARCHIVED` (archivage logique). Voir matrice PROC-006.
5. **Versions** : une version **courante éditable** (brouillon) + versions **publiées immuables** ; voir PROC-003.
6. **Logo** : export utilise le logo client (à provisionner si absent — hypothèse : champs `Client.logoStorageKey` / API branding, ou fallback nom client sans image).
7. **Module activation** : code module `procedures` + permissions `procedures.*` + `ModuleAccessGuard`.
8. **Langue UI** : français, libellés métier, **jamais d’ID brut** affiché.
9. **Médias** : images + PDF en **PROC-005** ; vidéo = lien externe (hors embed natif V1).

---

## 5. Backlog user stories (index)

| ID | User story | RFC | Priorité |
| --- | --- | --- | --- |
| **US-PROC-01** | Créer une procédure (métadonnées + brouillon vide) | PROC-002 | P0 |
| **US-PROC-02** | Éditer le contenu riche (socle TipTap MVP) | PROC-002 | P0 |
| **US-PROC-03** | Archiver / désarchiver une procédure | PROC-002 | P0 |
| **US-PROC-04** | Lister / filtrer / rechercher les procédures du client | PROC-002 | P0 |
| **US-PROC-05** | Publier une version et consulter l’historique | PROC-003 | P0 |
| **US-PROC-06** | Comparer / restaurer depuis une version publiée (borné) | PROC-003 | P1 |
| **US-PROC-07** | Exporter en PDF avec logo client | PROC-004 | P0 |
| **US-PROC-08** | Exporter en Word (.docx) avec logo client | PROC-004 | P0 |
| **US-PROC-09** | Structure documentaire H1–H6 + blocs | PROC-005 → **PROC-006** | P0 (supersédé) |
| **US-PROC-10** | Styles inline (gras, italique, souligné, couleur, surlignage) | PROC-005 → **PROC-006** | P0 (supersédé) |
| **US-PROC-11** | Médias images + PDF (`ProcedureAsset`) | PROC-005 → **PROC-006** | P0 (supersédé) |
| **US-PROC-12** | Diagrammes (Mermaid → **SVG handoff**) | PROC-005 → **PROC-006** | P0 (supersédé) |
| **US-PROC-13** | Liens externes https + liens internes Orchestra | PROC-005 → **PROC-006** | P1 |
| **US-PROC-14** | Toolbar / UX éditeur DS + RGAA | PROC-005 → **PROC-006** | P0 (supersédé) |
| **US-PROC-20** | Lister / filtrer (grille cartes handoff) | **PROC-006** | P0 |
| **US-PROC-21** | Créer brouillon + ouvrir éditeur | **PROC-006** | P0 |
| **US-PROC-22** | Métadonnées + autosave | **PROC-006** | P0 |
| **US-PROC-23** | Éditer blocs texte | **PROC-006** | P0 |
| **US-PROC-24** | Formatage inline + sanitize | **PROC-006** | P0 |
| **US-PROC-25** | Chrome / plan / panneaux | **PROC-006** | P0 |
| **US-PROC-26** | Transitions DRAFT ↔ IN_REVIEW ↔ PUBLISHED | **PROC-006** | P0 |
| **US-PROC-27** | Médias image (asset) + légende | **PROC-006** | P0 |
| **US-PROC-28** | Vidéo URL https | **PROC-006** | P0 |
| **US-PROC-29** | Éditeur schéma SVG + preview | **PROC-006** | P0 |
| **US-PROC-30** | contentJson v2 API + isolation client | **PROC-006** | P0 |
| **US-PROC-31** | Configurer le module (cycle pilotage, validateurs, catégories) | **[PROC-007](./RFC-PROC-007%20—%20Configuration%20module%20Procédures%20(cycle%20validateurs%20catégories).md)** | P0 |
| **US-PROC-32** | CRUD modèles outline (brouillon) | **[PROC-008](./RFC-PROC-008%20—%20Modèles%20de%20procédures%20(outline%20client).md)** | P0 |
| **US-PROC-33** | Warning imbrication titres | **PROC-008** | P0 |
| **US-PROC-34** | Activer / archiver / éditer modèle actif | **PROC-008** | P0 |
| **US-PROC-35** | Page modèles + droits manage | **PROC-008** | P0 |
| **US-PROC-36** | Création procédure depuis modèle ACTIVE | **PROC-008** | P0 |
| **US-PROC-37** | Traçabilité « Créée depuis… » + delete/archive forcée | **PROC-008** | P0 |

Critères d’acceptation détaillés dans chaque RFC fille.

---

## 6. Modèle métier cible (vue d’ensemble)

```
Client
 └── Procedure                    # coquille (code, titre, statut, owner…)
      ├── ProcedureVersion[]      # n° version, statut DRAFT|PUBLISHED, contentJson, publishedAt…
      └── ProcedureAsset[]        # médias uploadés (storageKey, mime, label)
```

Invariants :

- `Procedure.clientId` obligatoire sur toute requête.
- Une seule version `DRAFT` courante par procédure (ou zéro si tout est figé — règle fine en PROC-003).
- Une version `PUBLISHED` est **immuable** (contenu + assets snapshot / références figées).
- Archivage de la procédure n’efface pas les versions (rétention documentaire).

---

## 7. Permissions RBAC (proposition)

| Permission | Intention |
| --- | --- |
| `procedures.read` | Liste + lecture versions publiées / courante selon droits |
| `procedures.create` | Créer une procédure |
| `procedures.update` | Éditer métadonnées + contenu brouillon |
| `procedures.publish` | Publier une version |
| `procedures.configure` | Config module (cycle, validateurs, catégories) — PROC-007 |
| `procedures.archive` | Archiver / désarchiver |
| `procedures.export` | Déclencher export Word/PDF |

Seed : rôle CLIENT_ADMIN + profils gouvernance / conformité (à aligner `default-profiles.json`).

---

## 8. Routes UI (proposition)

| Route | Intention |
| --- | --- |
| `/procedures` | Catalogue (filtres statut, recherche titre/code) |
| `/procedures/configuration` | Config module : cycle pilotage, validateurs, catégories (PROC-007) |
| `/procedures/new` | Création |
| `/procedures/[id]` | Lecture + actions (éditer, versions, export, archiver) |
| `/procedures/[id]/edit` | Éditeur riche |
| `/procedures/[id]/versions` | Historique versions |

Sidebar : groupe **Procédures** avec enfants **Catalogue** + **Configuration** (pattern Budgets).

---

## 9. API REST (esquisse — détail dans RFC filles)

Préfixe : `/api/procedures` — toujours scopé client actif.

- `GET /api/procedures` — liste paginée
- `POST /api/procedures` — création
- `GET /api/procedures/:id` — détail + version courante
- `PATCH /api/procedures/:id` — métadonnées
- `POST /api/procedures/:id/archive` / `…/unarchive`
- `PATCH /api/procedures/:id/draft` — contenu brouillon
- `POST /api/procedures/:id/assets` — upload média
- `GET /api/procedures/:id/versions`
- `POST /api/procedures/:id/versions/publish`
- `GET /api/procedures/:id/versions/:versionId`
- `POST /api/procedures/:id/export` — `{ format: 'PDF' \| 'DOCX', versionId? }` → job ou stream

---

## 10. Liste des fichiers à créer / modifier (cible d’implémentation)

### Prisma / seed

- `apps/api/prisma/schema.prisma` — `Procedure`, `ProcedureVersion`, `ProcedureAsset`, enums
- migration dédiée
- `apps/api/prisma/seed.ts` — module + permissions

### Backend

- `apps/api/src/modules/procedures/` — module, controller, service, DTOs, export, tests
- enregistrement `AppModule`
- package RBAC `procedures.*`

### Frontend

- `apps/web/src/features/procedures/` — api, query-keys, composants, éditeur
- routes `app/(protected)/procedures/...`
- navigation + module visibility

### Docs

- cette RFC + PROC-002/003/004
- `docs/RFC/_RFC Liste.md`
- ultérieurement `docs/API.md`, `docs/LIAISONS-MODULES.md` (pont conformité), manuel utilisateur

---

## 11. Ordre de livraison recommandé

1. **PROC-002** — modèle + CRUD + éditeur riche + archivage + liste UI  
2. **PROC-003** — publish + historique + immutabilité  
3. **PROC-004** — logo client + export PDF puis DOCX  

---

## 12. Conformité by design

### RGPD

- DCP possibles : auteur (`createdByUserId`), propriétaire, contenu texte pouvant contenir des noms → **minimiser** métadonnées exposées ; pas de DCP en logs ; effacement/anonymisation auteur via `SetNull` ; rétention alignée archivage client ; export = traitement documentaire dans le scope client.

### RGAA

- Éditeur : toolbar accessible clavier, labels, annonces `aria-live` sauvegarde ; liste et fiches sémantiques ; focus visible ; contrastes AA.

### Design System

- `PageHeader`, `EmptyState` / `LoadingState` / `ErrorState`, `FilterBar`, `StariumModal`, tokens — pas de hex en dur ; libellés métier.

### Sécurité

- Authz + isolation `clientId` sur chaque endpoint ; DTO validés ; sanitization contenu riche (pas de script) ; assets privés ; audit `procedure.*` ; pas de sur-exposition.

### Mobile

- Liste en cartes &lt; `md` ; éditeur utilisable ≥ 320px (toolbar scrollable) ; cibles ≥ 44px ; export déclenchable au pouce.

---

## 13. Points de vigilance

- Ne pas fusionner avec `ProjectDocument` (périmètres différents).
- Immutabilité des versions publiées vs édition concurrente du brouillon.
- Liens internes : toujours résoudre vers **libellé** API (`title`/`code`/`name`), jamais UUID en UI.
- Export : perf (jobs async si &gt; seuil) ; logo manquant = comportement explicite (placeholder texte, pas d’échec silencieux).
- Droit d’auteur / contenus importés (hors scope juridique produit).

---

## 14. Récapitulatif

RFC mère du module **Procédures**. Implémentation découpée en **PROC-002 / 003 / 004**. Aucun code livré dans ce document.
