# RFC-PROC-006 — CDC Procédures (fidélité mock design handoff)

Version : 1.0 — 18 septembre 2026

| Métadonnée | Valeur |
| --- | --- |
| **Statut** | 📝 Draft — CDC produit (F0 ✅) · implémentation F1–F5 pending |
| **Priorité** | Haute |
| **Parent** | [RFC-PROC-001](./RFC-PROC-001%20—%20Module%20Procédures%20(cadrage%20et%20backlog%20user%20stories).md) |
| **Remplace (cible UX)** | [RFC-PROC-005](./RFC-PROC-005%20—%20Éditeur%20riche%20avancé%20des%20procédures.md) (TipTap / Mermaid) |
| **S’appuie sur** | [RFC-PROC-002](./RFC-PROC-002%20—%20Créer%20éditer%20archiver%20procédures%20et%20contenu%20riche.md) (CRUD, assets, archive) · [RFC-PROC-003](./RFC-PROC-003%20—%20Versioning%20des%20procédures.md) (publish immuable) |
| **Alimente** | [RFC-PROC-004](./RFC-PROC-004%20—%20Export%20Word%20PDF%20procédures%20avec%20logo.md) |
| **Source design** | [`docs/design_handoff_procedures/`](../design_handoff_procedures/README.md) — `Procedures.html`, `modules/procedures.js`, `styles/procedures.css` |
| **Règle UX** | Fidélité hifi mock via tokens DS / classes `.pr-*` ; **pas** de copie HTML/JS vanilla en prod ; **jamais d’ID brut** ; pas de TipTap / Lexical / Mermaid |

---

## 1. Analyse de l’existant

| Élément | Constat |
| --- | --- |
| Prisma `Procedure` / `ProcedureVersion` / `ProcedureAsset` | Présents (PROC-002). Statuts `DRAFT\|PUBLISHED\|ARCHIVED` — **pas** `IN_REVIEW`. Catégories `SECURITY\|OPERATIONS\|HR\|IT_SERVICE\|COMPLIANCE\|OTHER` ≠ mock. |
| `contentJson` | Document TipTap ProseMirror (`type: 'doc'`) + whitelist nodes/marks (PROC-005 Lots A–B). |
| API | `GET/POST /procedures`, `GET :id`, `PATCH :id/draft`, archive/unarchive, assets upload/stream. **Pas** de `POST …/transition` / publish. Perm `procedures.publish` seedée. |
| FE | `/procedures` table + `/procedures/[id]/edit` TipTap. Pas de grille cartes, pas d’éditeur par blocs, pas de schéma SVG. |
| Usage | **Jamais utilisé en métier / jamais mis en production** → wipe TipTap → blocs v2 **autorisé** sans migration douce. |
| Handoff | Liste cartes + éditeur blocs + éditeur diagramme plein écran (formes + liens Bézier). |

**Verdict** : conserver le socle multi-client / RBAC / assets ; **remplacer** le modèle de contenu et l’UX par le handoff.

---

## 2. Hypothèses figées

1. Éditeur **par blocs** React (contenteditable + sanitize) — **interdit** TipTap / Lexical / `execCommand` comme source de vérité.
2. `contentJson` v2 : `{ schemaVersion: 2, blocks: Block[] }`. Migration Prisma : `UPDATE` tous les `contentJson` → `EMPTY_V2`.
3. Statuts : `DRAFT` → `IN_REVIEW` → `PUBLISHED` (+ `ARCHIVED`). Affichage version `v{N}` (`versionNumber` entier), pas semver mock.
4. Catégories : `PILOTAGE | COMPLIANCE | FINANCE | ORGANISATION | SECURITY` (remap anciennes valeurs).
5. Schéma = SVG natif (kinds `start|step|dec|doc|actor|end`) — **pas Mermaid**.
6. Publish (`IN_REVIEW` → `PUBLISHED`) = clone draft → version `PUBLISHED` immuable + nouveau draft (PROC-003).
7. « Rattachée à » = disabled « Bientôt disponible ». Relecteurs = owner uniquement.
8. Export recueil / Word-PDF = hors scope (bouton disabled → PROC-004).
9. HTML allowlist : `b/strong, i/em, u, s, a[href https], mark, br, li`.
10. Vidéo V1 = URL https uniquement ; image = asset upload (PNG/JPG/SVG, 10 Mo).

---

## 3. Modèle de données

```ts
type ProcedureContentV2 = {
  schemaVersion: 2;
  blocks: Block[];
};

type Block =
  | { t: 'h1' | 'h2' | 'h3' | 'p' | 'ul' | 'ol' | 'step'; html: string }
  | { t: 'callout'; html: string; kind: 'warn' | 'info' }
  | { t: 'img'; assetId: string; alt: string; cap: string }
  | { t: 'video'; src: string; cap: string } // https URL
  | { t: 'diag'; title: string; cap: string; nodes: DiagNode[]; edges: DiagEdge[] };

type DiagNode = {
  id: string;
  k: 'start' | 'step' | 'dec' | 'doc' | 'actor' | 'end';
  x: number;
  y: number;
  label: string;
  desc?: string;
};

type DiagEdge = { from: string; to: string; label?: string };

const EMPTY_V2: ProcedureContentV2 = {
  schemaVersion: 2,
  blocks: [
    { t: 'h1', html: '' },
    { t: 'p', html: '' },
  ],
};
```

Limites serveur : ≤ 200 blocs ; payload JSON ≤ 500_000 chars ; profondeur HTML bornée ; sanitize obligatoire au PATCH.

---

## 4. API

| Method | Path | Permission | Notes |
| --- | --- | --- | --- |
| existant | CRUD / draft / archive / assets | inchangé | Draft accepte title?, category?, contentJson v2, expectedUpdatedAt? |
| **NEW** | `POST /api/procedures/:id/transition` | `procedures.publish` si `to=PUBLISHED` sinon `procedures.update` | Body `{ to, changeSummary?, expectedUpdatedAt? }` |

Guards : `JwtAuthGuard` + `ActiveClientGuard` + `ModuleAccessGuard` + `PermissionsGuard`. `clientId` depuis scope uniquement.

### Matrice de transitions

| From | To | Permission | Effet versioning |
| --- | --- | --- | --- |
| `DRAFT` | `IN_REVIEW` | `procedures.update` | Aucun snapshot |
| `IN_REVIEW` | `DRAFT` | `procedures.update` | Aucun |
| `IN_REVIEW` | `PUBLISHED` | `procedures.publish` | Snapshot immuable + nouveau draft ; `status=PUBLISHED` |
| `PUBLISHED` | `IN_REVIEW` | `procedures.update` | Status seul ; versions publiées intactes |
| `PUBLISHED` | `DRAFT` | `procedures.update` | Status seul |
| `ARCHIVED` | * | — | 400 (unarchive existant) |

Contenu vide → 400 sur transition vers `IN_REVIEW` / `PUBLISHED`. Lock optimiste → 409.

Audit : `procedure.status_changed` ; `procedure.version.published` (pas le JSON complet).

---

## 5. Migration Prisma (F1)

Fichier : `apps/api/prisma/migrations/YYYYMMDDHHMMSS_proc_006_blocks_status_categories/`

1. Ajouter `IN_REVIEW` à `ProcedureStatus`.
2. Remap catégories puis recreate enum :

| Ancien | Nouveau |
| --- | --- |
| `COMPLIANCE` | `COMPLIANCE` |
| `SECURITY` | `SECURITY` |
| `OPERATIONS` / `IT_SERVICE` | `PILOTAGE` |
| `HR` | `ORGANISATION` |
| `OTHER` | `PILOTAGE` |

3. `UPDATE` tous les `ProcedureVersion.contentJson` → `EMPTY_V2`.

Pas de flag `contentMigrationRequired` côté API/UI.

---

## 6. User stories

### US-PROC-20 — Lister / filtrer (grille cartes) — F2

**CA** : CA-L1…L8 (filtre segmenté, grille, badges, loading/empty/error, mobile, `audit:ui-ids`).

### US-PROC-21 — Créer brouillon + ouvrir éditeur — F2

**CA** : CA-L4 (carte dashed / CTA → create EMPTY_V2 version 1 → `/procedures/:id/edit`).

### US-PROC-22 — Métadonnées + autosave — F1 + F3

**CA** : CA-E1 (indicateur Enregistrement…/Enregistré, debounce ≥ 1 s), CA-E4 (titre), CA-E19 (409), PATCH title/category.

### US-PROC-23 — Blocs texte — F3

**CA** : CA-E5…E11, E14, E15 (types texte) — h1/h2/h3/p/ul/ol/step/callout ; Entrée/⌫ ; DnD + Monter/Descendre ; menu insert **sans** img/video/diag.

### US-PROC-24 — Formatage inline + sanitize — F3

**CA** : CA-E12, E13 + DoD sanitize (FE miroir + BE vérité ; tests paste Word / `javascript:`).

### US-PROC-25 — Chrome / plan / panneaux — F3

**CA** : CA-E1…E3, E15…E17 — layout &lt;1180px ; Rattachée à disabled ; owner only ; historique `v{N}`.

### US-PROC-26 — Transitions statut — F1

**CA** : matrice §4 + CA-E18 (toasts).

### US-PROC-27 — Image asset + légende — F4

**CA** : CA-M1, M2, M4, M5.

### US-PROC-28 — Vidéo URL — F4

**CA** : CA-M3, M4.

### US-PROC-29 — Schéma SVG — F5

**CA** : CA-D1…D7.

### US-PROC-30 — contentJson v2 + isolation — F1

**CA** : assert v2 ; refuse TipTap ; isolation cross-client PATCH/transition ; sanitize serveur.

---

## 7. Critères d’acceptation détaillés

### Liste (`/procedures`) — CA-L*

| ID | Critère |
| --- | --- |
| CA-L1 | Filtre segmenté Toutes · Publiées · En revue · Brouillons (actif = ink). |
| CA-L2 | Grille cards : catégorie, titre, badge, résumé, pied owner/`vN`/blocs·date. |
| CA-L3 | Clic → edit. |
| CA-L4 | Nouvelle procédure → brouillon EMPTY_V2. |
| CA-L5 | « Exporter le recueil » disabled + tooltip Bientôt. |
| CA-L6 | Loading / empty / error. |
| CA-L7 | Mobile ≥ 320px, cibles ≥ 44px. |
| CA-L8 | `pnpm audit:ui-ids` vert. |

### Éditeur — CA-E*

| ID | Critère |
| --- | --- |
| CA-E1 | Chrome retour / statut / save / Aperçu / Versions / CTA transition. |
| CA-E2 | 3 colonnes desktop ; &lt;1180px panneaux masqués, drag handle caché. |
| CA-E3 | Plan H1–H3 scroll/focus. |
| CA-E4 | Titre éditable → PATCH. |
| CA-E5–E7 | Typo blocs, steps auto, callout warn/info. |
| CA-E8–E10 | Sélection unique, Entrée/⇧Entrée/⌫, ⌘B/I/U. |
| CA-E11 | Menu insert ancré. |
| CA-E12 | Format bar + lien `StariumModal` https. |
| CA-E13 | Allowlist HTML + sanitize coller/serveur. |
| CA-E14 | DnD poignée + actions panneau accessibles. |
| CA-E15 | Panneau Bloc selon type. |
| CA-E16 | Catégorie ; Rattachée à disabled ; owner only. |
| CA-E17 | Historique `vN` + libellés métier. |
| CA-E18 | Transitions + toasts. |
| CA-E19 | 409 → recharger. |

### Médias — CA-M* · Schéma — CA-D*

Voir handoff README / plan programme (CA-M1…M5, CA-D1…D7) — normatifs.

---

## 8. Fichiers à créer / modifier (implémentation F1–F5)

### Backend

- `apps/api/prisma/schema.prisma` + migration `proc_006_blocks_status_categories`
- `apps/api/src/modules/procedures/lib/procedure-content.util.ts` (v2 + sanitize)
- `dto/update-procedure-draft.dto.ts`, `dto/transition-procedure.dto.ts`
- `procedures.service.ts` / `procedures.controller.ts`
- tests `procedure-content.util.spec.ts`, `procedures.service.spec.ts`

### Frontend

- `apps/web/src/features/procedures/components/procedures-catalog.tsx` (grille)
- `procedure-block-editor.tsx`, `procedure-block.tsx`, `procedure-insert-menu.tsx`, `procedure-format-bar.tsx`, `procedure-editor-chrome.tsx`
- `procedure-diagram-editor.tsx` (F5)
- `lib/sanitize-procedure-html.ts`, `types/`, `procedure-labels.ts`
- styles module procédures (tokens)
- Retrait TipTap procédures (F3) ; deps `@tiptap/*` si plus utilisées ailleurs

### Docs (cette RFC + F1)

- `_RFC Liste.md`, PROC-001/002/003/005 (F0)
- `docs/API.md` (F1)

---

## 9. Backlog pipeline

| Feature | Contenu | US |
| --- | --- | --- |
| **F0** | Cette RFC + index | — ✅ |
| **F1** | Prisma wipe + v2 + transition + tests | 22 (API), 26, 30 |
| **F2** | Liste cartes | 20, 21 |
| **F3** | Éditeur blocs texte | 22–25 |
| **F4** | Médias | 27, 28 |
| **F5** | Schéma SVG | 29 |

Cycle par feature : `plan → review-plan → implement → conformité → docs → commit` (pas de push auto).

---

## 10. Tests (F1+)

- Isolation cross-client PATCH / transition
- Transitions illégales (ARCHIVED, contenu vide, PUBLISHED→PUBLISHED)
- Publish crée version immuable + nouveau draft
- Sanitize rejette `javascript:` / styles / TipTap `doc`
- Post-migrate : tous `contentJson.schemaVersion === 2`
- FE : labels, sanitize unit, smoke render blocs (F3+)

---

## 11. Hors scope

- Export Word/PDF / recueil (PROC-004)
- ACL Droits / Partager (shell mock)
- TipTap / Lexical / Mermaid
- Collab temps réel ; upload MP4 binaire
- Multi-relecteurs ; rattachement entité

---

## 12. Points de vigilance

- contenteditable + caret : état local, pas remount full list à chaque keystroke
- Sanitize coller Word (mso-*)
- Overlay schéma : focus trap RGAA ; mobile = preview only
- Permissions dynamiques sur `transition` selon `to`

---

## 13. Conformité by design

### RGPD

- DCP : `ownerUserId` / noms affichés (finalité gouvernance doc) ; minimisation (pas d’emails en clair dans logs audit).
- Contenu procédures = données métier client-scopées ; effacement via archive + politique rétention client (V2 purge).
- Assets : métadonnées minimales (`label`, mime, size) ; pas de DCP dans noms de fichiers loggés.

### RGAA

- Navigation clavier complète (blocs, menu insert, format bar, overlay schéma).
- Labels / `aria-live` autosave et erreurs upload.
- Focus visible ; trap focus overlay schéma.
- Info jamais par la couleur seule (badges + texte).

### Design System

- Tokens `--brand-*` / `--neutral-*` / `--state-*` ; `PageHeader`, `EmptyState`/`LoadingState`/`ErrorState`, `StariumModal`.
- Libellés métier partout (`displayLabel`) ; `v{N}` pas d’UUID.

### Sécurité

- Guards + RBAC client-aware ; DTO class-validator ; isolation `clientId` scope.
- Liens https only ; HTML allowlist ; audit transitions / publish.
- Pas de sur-exposition (pas de storageKey brut en UI).

### Interface mobile

- Liste dès 320px ; éditeur &lt;1180px colonnes masquées ; schéma desktop-first avec message mobile.
- Cibles ≥ 44px ; pas d’action hover-only.

---

## 14. Récapitulatif F0

| Fait | Reste |
| --- | --- |
| CDC PROC-006 + US-20…30 + CA + matrice + wipe | Implémentation F1→F5 |
| Index `_RFC Liste` + notes PROC-001/002/003/005 | `API.md` à F1 |

Commande suivante : `/rfc-pipeline RFC-PROC-006` (démarre F1).
