# RFC-PROC-005 — Éditeur riche avancé des procédures

Version : 1.0 — 18 septembre 2026

| Métadonnée | Valeur |
| --- | --- |
| **Statut** | 🟡 En cours — **Lots A–B** ✅ · Lots C–D pending |
| **Priorité** | Haute (qualité documentaire gouvernance / audit) |
| **Parent** | [RFC-PROC-001](./RFC-PROC-001%20—%20Module%20Procédures%20(cadrage%20et%20backlog%20user%20stories).md) |
| **Dépend de** | [RFC-PROC-002](./RFC-PROC-002%20—%20Créer%20éditer%20archiver%20procédures%20et%20contenu%20riche.md) (socle CRUD + TipTap MVP + `contentJson`) |
| **Alimente** | [PROC-003](./RFC-PROC-003%20—%20Versioning%20des%20procédures.md) (snapshot contenu) · [PROC-004](./RFC-PROC-004%20—%20Export%20Word%20PDF%20procédures%20avec%20logo.md) (rendu titres / médias / diagrammes) |
| **Remplace / étend** | La portée « contenu riche V1 » minimaliste livrée dans PROC-002 US-02 (H1–H3, gras/italique/lien uniquement). **US-02b** (assets + liens internes) est **absorbée** ici. |

---

## 1. Analyse de l'existant

| Élément | Constat |
| --- | --- |
| Éditeur FE | `ProcedureRichEditor` — TipTap + `StarterKit` (headings **1–3**), `Link` https, toolbar réduite (H2, bold, italic, listes, quote, lien). `window.prompt` pour les liens (à remplacer par `StariumModal`). |
| Whitelist API | `procedure-content.util.ts` : nodes `doc/paragraph/heading/bulletList/orderedList/listItem/blockquote/text/hardBreak` ; marks `bold/italic/link` ; heading level **1–3** ; pas d’image, pas de couleur, pas de underline/highlight, pas de diagramme. |
| Assets | Modèle Prisma `ProcedureAsset` prévu dans PROC-002 ; **endpoints upload/stream non livrés**. |
| Liens internes | Endpoint `GET /api/procedures/link-targets` prévu PROC-002 ; **non livré**. |
| Stockage fichiers | Dual local/S3 client (RFC-035 / DOC-002) — réutiliser domaine `procedures`. |
| Design System | Tokens `--brand-*`, `--neutral-*`, `--state-*` ; **aucune couleur libre hors palette** en UI. Modales = `StariumModal`. |
| Export | PROC-004 consommera le même `contentJson` — le schéma nodes/marks doit rester **stable et documenté**. |

**Verdict** : le MVP TipTap est un **socle technique**, pas le produit cible. Cette RFC définit l’éditeur de procédures **complet** attendu pour rédaction opérationnelle / PSSI / PRA.

---

## 2. Problème à résoudre

Un rédacteur de procédure (RSSI, DSI, responsable ops) doit produire un document **structuré comme un vrai manuel** :

- hiérarchie de titres claire (H1 → H6) pour TOC / export / navigation ;
- emphases typographiques (gras, italique, souligné) et **mise en évidence** (couleur de texte + surlignage) sans casser le DS ;
- **médias** (images, PDF) rattachés au client et à la procédure ;
- **diagrammes de fonctionnement** (flux, séquences, responsabilités) versionnés avec le contenu ;
- liens externes https + liens internes Orchestra (libellés métier).

Sans cela, Orchestra reste un carnet de notes, pas un outil de gouvernance documentaire.

---

## 3. Objectif produit

**En tant qu’** utilisateur avec `procedures.update`,  
**je veux** rédiger une procédure avec structure complète, styles, médias et diagrammes,  
**afin de** publier et exporter un document professionnel, accessible et auditables.

---

## 4. Hypothèses structurantes (à valider)

1. **Stack éditeur** : TipTap / ProseMirror conservé (déjà en prod partielle). Pas de Lexical / Plate en V1.
2. **Schéma unique** : un seul `contentJson` (document ProseMirror) validé par whitelist serveur **stricte** — source de vérité pour lecture, publish (PROC-003) et export (PROC-004).
3. **Couleurs** : palette **fermée** dérivée des tokens DS (ex. `ink`, `muted`, `brand`, `danger`, `success`, `warning`) — **pas** de color-picker hex libre (contraste AA + cohérence charte).
4. **Diagrammes V1** = nœud `procedureDiagram` avec `dialect: "mermaid"` + `source` texte (flowchart / sequence / state). Rendu côté FE (Mermaid) + export rasterisé / SVG en PROC-004.  
   **Hors V1** : canvas libre type Excalidraw / draw.io (V1.1 si besoin métier).
5. **Médias V1** : images (`image/jpeg`, `image/png`, `image/webp`, `image/gif`) + pièces jointes PDF. Vidéo = lien externe https uniquement.
6. **Heading H1** autorisé **dans le corps** (plusieurs H1 possibles) — le titre procédure reste dans les métadonnées `Procedure.title` / version ; le H1 corps sert aux sections majeures.
7. **Pas de HTML libre** / pas d’iframe / pas de script. Mermaid source validée (longueur max, pas d’HTML injecté dans le source).
8. **Collaboration temps réel** hors scope (last-write-wins + lock optimistic déjà prévu PROC-002).
9. **Accessibilité** : toolbar 100 % clavier ; diagrammes accompagnés d’un **résumé textuel** obligatoire (`aria` / champ `altSummary`) ; couleurs jamais seules porteuses d’info critique.
10. **US-02b** (PROC-002) est **retirée** du backlog PROC-002 et couverte par les US ci-dessous.

---

## 5. User stories

### US-PROC-09 — Structure documentaire (H1–H6 + blocs)

**En tant qu’** éditeur, **je veux** découper mon contenu en titres H1…H6, paragraphes, listes, citations, séparateurs,  
**afin d’**obtenir une hiérarchie lisible et exportable.

#### Critères d’acceptation

1. Toolbar / raccourcis : styles de paragraphe → H1…H6, paragraphe normal.
2. Whitelist API : `heading.attrs.level ∈ [1..6]`.
3. Nodes autorisés additionnels : `horizontalRule`, `codeBlock` (optionnel V1 — **hypothèse : oui, codeBlock plaintext** pour extraits conf / CLI).
4. Outline optionnelle (sommaire sticky desktop) générée depuis les headings du doc — **P1** (nice-to-have livrable dans le même epic si coût faible).
5. Lecture seule (archivé / sans `update`) : même rendu sémantique (`h1`…`h6` HTML).

---

### US-PROC-10 — Styles inline (gras, italique, souligné, couleur, surlignage)

**En tant qu’** éditeur, **je veux** mettre en forme le texte (gras, italique, souligné, couleur, surlignage),  
**afin de** faire ressortir avertissements, responsabilités et termes clés.

#### Critères d’acceptation

1. Marks whitelist : `bold`, `italic`, `underline`, `strike` (optionnel), `textStyle` (couleur tokenisée), `highlight` (couleur fond tokenisée), `link`.
2. UI : boutons + menus « Couleur du texte » / « Surlignage » listant **uniquement** les tokens labellisés FR (`Encre`, `Atténué`, `Or marque`, `Danger`, `Succès`, `Avertissement`, `Info`…).
3. API refuse toute couleur hors allowlist (`#rrggbb` arbitraire → 400).
4. Contraste : paires texte/fond documentées ; surlignage clair sur fond `--neutral-50` / card.
5. RGAA : l’info critique ne repose pas sur la couleur seule (le rédacteur reste responsable ; l’UI affiche un hint dans l’aide éditeur).

---

### US-PROC-11 — Médias (images + PDF)

**En tant qu’** éditeur, **je veux** insérer des images et attacher des PDF à la procédure,  
**afin d’**illustrer les étapes et joindre des annexes.

#### Critères d’acceptation

1. `POST /api/procedures/:id/assets` multipart — MIME allowlist, taille max (réglage plateforme ou constante documentée, ex. 10 Mo image / 25 Mo PDF).
2. Stockage scopé `clientId` + `procedureId` ; `ProcedureAsset` avec `label` métier (nom fichier assaini ≠ ID).
3. Node `procedureImage` : attrs `{ assetId, alt }` — **alt obligatoire** non vide (RGAA). URL jamais absolue en dur dans le JSON.
4. Node `procedureFile` : attrs `{ assetId, label }` — rendu lien téléchargement via `GET …/assets/:assetId` (stream authz).
5. Insertion UI : picker fichier + progress ; états erreur MIME/taille via `Alert` + `aria-live`.
6. Suppression asset : refus si encore référencé dans le draft **ou** soft-delete + GC (hypothèse retenue : **blocage si référencé**, message métier).
7. Isolation : asset d’un autre client / autre procédure → 404.
8. Audit `procedure.asset.uploaded` / `procedure.asset.deleted` (pas de binaire ni DCP fichier en log).

---

### US-PROC-12 — Diagrammes de fonctionnement (Mermaid)

**En tant qu’** éditeur, **je veux** créer un diagramme de fonctionnement (flux, séquence, états),  
**afin de** documenter les processus sans outil externe.

#### Critères d’acceptation

1. Node `procedureDiagram` : `{ dialect: "mermaid", source: string, altSummary: string }`.
2. UI : bloc dédié dans l’éditeur — zone source (monospace) + **aperçu live** (debounce) ; templates de départ (flowchart LR, sequence, state).
3. `altSummary` obligatoire (≥ 10 caractères) — annoncé aux lecteurs d’écran ; export PDF utilise ce texte en légende.
4. Validation API : longueur `source` ≤ 20 Ko ; caractères de contrôle / balises HTML refusés ; `dialect` ∈ allowlist.
5. Rendu lecture : SVG Mermaid dans un conteneur scrollable ; `role="img"` + `aria-label={altSummary}`.
6. Erreur de parse Mermaid : empty/error inline (**pas** de diagramme inventé) + message « Diagramme invalide — corrigez la source ».
7. Toolbar : bouton « Insérer un diagramme ».
8. Hors V1 : édition visuelle drag-and-drop, BPMN, swimlanes graphiques libres.

---

### US-PROC-13 — Liens externes et liens internes Orchestra

**En tant qu’** éditeur, **je veux** lier vers une URL https ou une entité Orchestra,  
**afin de** contextualiser la procédure dans le SI gouverné.

#### Critères d’acceptation

1. Lien externe : mark `link` — `href` https uniquement ; modale `StariumModal` (plus de `window.prompt`) ; `rel="noopener noreferrer"` + nouvel onglet.
2. Lien interne : mark ou node `procedureInternalLink` — `{ resourceType, resourceId, labelSnapshot }` ; UI = combobox **libellés métier** (`GET /api/procedures/link-targets?q=`).
3. Types V1 : `Procedure`, `Project`, `ComplianceRequirement` (si module actif).
4. Affichage : toujours `labelSnapshot` ; refresh best-effort du label si l’entité est encore lisible — **jamais** repli sur l’UUID (`displayLabel`).
5. Entité inaccessible / supprimée → libellé « Ressource indisponible » (pas l’ID).

---

### US-PROC-14 — Toolbar & UX éditeur (socle DS / RGAA)

**En tant qu’** éditeur, **je veux** une barre d’outils claire, clavier-first et mobile-friendly,  
**afin de** rédiger sans friction ni piège d’accessibilité.

#### Critères d’acceptation

1. Toolbar groupée : Structure | Inline | Couleur | Médias | Diagramme | Liens.
2. Chaque contrôle : `aria-label` FR, `aria-pressed` pour toggles, cibles `min-h-11 sm:min-h-9`, scroll horizontal sur mobile.
3. `aria-controls` → zone éditable ; focus management après insertion de bloc.
4. Autosave existant conservé + `aria-live` « Enregistrement… / Enregistré / Erreur ».
5. Loading éditeur = `LoadingState` ; erreur chargement = `ErrorState`.
6. Aucun `window.prompt` / `window.confirm` / `window.alert`.
7. `pnpm audit:modals` + `pnpm audit:ui-ids` verts sur la feature.

---

## 6. Schéma `contentJson` (whitelist cible)

### Nodes

| Node | Attrs clés | Notes |
| --- | --- | --- |
| `doc` | — | Racine |
| `paragraph` | — | |
| `heading` | `level: 1..6` | |
| `bulletList` / `orderedList` / `listItem` | — | |
| `blockquote` | — | |
| `codeBlock` | `language?` | plaintext V1 |
| `horizontalRule` | — | |
| `hardBreak` / `text` | — | |
| `procedureImage` | `assetId`, `alt` | alt requis |
| `procedureFile` | `assetId`, `label` | |
| `procedureDiagram` | `dialect`, `source`, `altSummary` | mermaid V1 |
| `procedureInternalLink` | `resourceType`, `resourceId`, `labelSnapshot` | si node plutôt que mark |

### Marks

| Mark | Attrs |
| --- | --- |
| `bold` / `italic` / `underline` / `strike?` | — |
| `link` | `href` (https), `target`, `rel` |
| `textStyle` | `colorToken` ∈ allowlist |
| `highlight` | `colorToken` ∈ allowlist |

Fichier unique de vérité partagé (idéalement package ou constantes dupliquées sync FE/API) :  
`apps/api/src/modules/procedures/lib/procedure-content.util.ts` + miroir FE pour UX pré-validation.

---

## 7. Endpoints (delta vs PROC-002)

| Méthode | Route | Perm | Notes |
| --- | --- | --- | --- |
| PATCH | `/api/procedures/:id/draft` | update | Whitelist élargie (cette RFC) |
| POST | `/api/procedures/:id/assets` | update | multipart + label |
| GET | `/api/procedures/:id/assets` | read | liste `{ id, label, mimeType, sizeBytes, createdAt }` — **label** pour UI |
| GET | `/api/procedures/:id/assets/:assetId` | read | stream binaire authz |
| DELETE | `/api/procedures/:id/assets/:assetId` | update | si non référencé |
| GET | `/api/procedures/link-targets` | read | `q`, `types[]` → `{ type, id, label }` |

---

## 8. Frontend — fichiers cibles

| Fichier | Rôle |
| --- | --- |
| `features/procedures/components/procedure-rich-editor.tsx` | Orchestrateur TipTap + extensions |
| `features/procedures/components/procedure-editor-toolbar.tsx` | Toolbar groupée DS |
| `features/procedures/components/procedure-link-modal.tsx` | `StariumModal` lien https |
| `features/procedures/components/procedure-internal-link-picker.tsx` | Combobox libellés |
| `features/procedures/components/procedure-diagram-block.tsx` | Source + preview Mermaid |
| `features/procedures/components/procedure-media-insert.tsx` | Upload image/PDF |
| `features/procedures/lib/procedure-content.ts` | EMPTY_DOC + tokens couleur + helpers |
| `features/procedures/lib/procedure-color-tokens.ts` | Allowlist alignée API |
| `features/procedures/api/procedures.api.ts` | assets + link-targets |
| API `procedure-content.util.ts` | Whitelist + validation diagram/alt |

Dépendances npm envisagées (FE) : `@tiptap/extension-underline`, `@tiptap/extension-text-style`, `@tiptap/extension-color`, `@tiptap/extension-highlight`, `mermaid` (ou `@mermaid-js/mermaid`).

---

## 9. Modifications Prisma

Aucune table nouvelle si `ProcedureAsset` déjà migré (PROC-002). Sinon reprendre le modèle PROC-002 §4.

Éventuel champ optionnel V1.1 : `ProcedureAsset.kind` (`IMAGE` \| `ATTACHMENT`) — sinon dérivé du `mimeType`.

---

## 10. Tests

### Backend

- Whitelist : H4–H6 OK ; H7 → 400.
- Marks `underline` / `highlight` / `textStyle` avec token invalide → 400.
- Node `procedureImage` sans `alt` → 400 ; `assetId` hors procédure → 400.
- `procedureDiagram` sans `altSummary` / source trop longue → 400.
- Upload MIME refusé ; asset cross-client → 404.
- Isolation draft PATCH cross-client.

### Frontend

- Toolbar clavier (Tab / Entrée / Esc sur menus couleur).
- Insertion diagramme + preview error state.
- Picker lien interne : aucun ID visible (`audit:ui-ids`).
- Mobile 320px : toolbar scrollable, cibles ≥ 44px.

---

## 11. Conformité by design

| Axe | Exigence |
| --- | --- |
| **RGPD** | Assets privés scopés client ; logs sans contenu doc ni noms fichiers nominatifs bruts si DCP ; rétention = celle de la procédure ; effacement user → anonymiser `createdByUserId` assets |
| **RGAA** | Headings sémantiques ; `alt` images ; `altSummary` diagrammes ; toolbar clavier + `aria-*` ; contrastes AA sur tokens couleur ; `aria-live` save ; `prefers-reduced-motion` sur preview |
| **Design System** | Tokens uniquement pour couleurs texte/surlignage ; `StariumModal` ; `LoadingState` / `EmptyState` / `ErrorState` ; pas de prompt natif |
| **Sécurité** | Whitelist nodes/marks ; https only ; MIME allowlist ; pas d’HTML brut ; Mermaid source bornée ; authz + client scope sur assets |
| **Mobile** | Toolbar scrollable ; blocs média/diagramme full-width ; cibles ≥ 44px ; pas d’action hover-only |

---

## 12. Hors scope (explicite)

- Éditeur collaboratif temps réel (Yjs / CRDT).
- Canvas libre (Excalidraw), BPMN natif, Visio.
- Vidéo embarquée / streaming.
- Commentaires inline / suggestions track-changes.
- Templates de procédures préremplis (V1.1).
- Diff visuel entre versions (reste PROC-003 P1 / V1.1).

---

## 13. Plan de livraison suggéré (lots)

| Lot | Contenu | US |
| --- | --- | --- |
| **A** | Whitelist H1–H6 + underline + textStyle/highlight (tokens) + toolbar | 09, 10, 14 (partiel) |
| **B** | Assets image/PDF + nodes média + endpoints | 11 |
| **C** | Diagrammes Mermaid + altSummary | 12 |
| **D** | Liens modale + liens internes | 13, 14 (fin) |

Ordre recommandé : **A → B → C → D**. Export PROC-004 consomme A/B/C dès que disponibles (sinon fallback texte).

---

## 14. Points de vigilance

- Aligner **extensions TipTap** et **whitelist API** à chaque lot (éviter le mismatch StarterKit actuel).
- Mermaid : surface XSS / SSR — rendre côté client uniquement ; sanitizer source.
- Taille `contentJson` : relever plafond si diagrammes + base64 **interdits** (toujours `assetId`).
- PROC-004 doit mapper `procedureDiagram` → image ou bloc monospace + légende.
- Ne pas bloquer PROC-003 : publish snapshotte le JSON tel quel.

---

## 15. Récapitulatif

Cette RFC élève l’éditeur procédures au niveau **manuel de gouvernance** : structure H1–H6, styles (y compris couleur/surlignage tokenisés), médias, diagrammes Mermaid, liens externes/internes — sur le socle TipTap + `contentJson` de PROC-002, avec validation serveur stricte et conformité by design.
