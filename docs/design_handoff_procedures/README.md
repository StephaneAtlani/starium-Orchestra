# Handoff : Module Procédures (Starium)

## Vue d'ensemble
Éditeur de procédures par blocs pour le portail Starium (section *Gouvernance & conformité › Procédures*). Trois écrans : liste des procédures, éditeur de blocs (titres H1/H2/H3, texte riche gras/italique/souligné/barré/lien/surlignage, listes, étapes numérotées, encadrés, image, vidéo, schéma) avec réorganisation par glisser-déposer, et éditeur de diagrammes plein écran (formes, liens fléchés, libellés).

## À propos des fichiers fournis
Les fichiers de ce dossier sont des **références de design réalisées en HTML/CSS/JS vanilla** : un prototype qui montre l'apparence et le comportement attendus. Ce n'est **pas du code de production à copier**. La tâche est de **recréer ces écrans dans l'environnement du projet cible** (React, Vue, Angular, etc.) en respectant ses patterns, son design system et ses librairies. S'il n'existe pas encore d'environnement, choisir la stack la plus adaptée (recommandé : React + TypeScript, éditeur de texte riche Tiptap/ProseMirror ou Lexical, SVG natif ou React Flow pour le schéma).

Ouvrir `Procedures - Mockup dev.html` en premier : c'est la page de spécification annotée (écrans rendus en direct + repères numérotés + specs). `Procedures.html` est le prototype interactif.

## Fidélité
**Haute fidélité (hifi)** — couleurs, typographie, espacements, états et interactions sont finaux. Reproduire à l'identique en utilisant les tokens ci-dessous (ou leurs équivalents dans le design system existant du projet).

## Écrans

### 1. Liste des procédures (`#pr-home`)
- **Objectif** : parcourir, filtrer, ouvrir ou créer une procédure.
- **Layout** : shell standard (sidebar 240 px sombre + topbar), contenu `.maxw`. En-tête `.pg-head` (H1 + sous-titre à gauche, actions à droite). Sous l'en-tête : filtre segmenté. Grille `repeat(auto-fill, minmax(300px, 1fr))`, gap 16 px.
- **Composants** :
  - Filtre segmenté `.pr-seg` : pilule blanche bordure 1.5 px `neutral-200`, boutons 12.5 px/700, actif = fond `brand-ink` texte blanc. Valeurs : Toutes · Publiées · En revue · Brouillons.
  - Carte `.pr-card` : padding 18/20, radius `--radius-lg`, hover = ombre `shadow-2` + translateY(-1px). Contenu : catégorie (11 px, 800, uppercase, letter-spacing .06em, `neutral-500`), titre 15.5 px/800, badge statut à droite, résumé 12.5 px `neutral-600`, pied (border-top `neutral-100`) : avatar 24 px (fond ink, initiales or 9 px/800) · `vX.Y` · « N blocs · date ».
  - Carte création `.pr-new` : bordure 1.5 px dashed `neutral-300`, min-height 170, centrée, icône + 26 px ; hover bordure ink.
  - Badges statut : Brouillon (`bdg-neutral`), En revue (`bdg-warn`), Publiée (`bdg-success`).
  - Boutons : « Exporter le recueil » (secondaire), « Nouvelle procédure » (primaire).

### 2. Éditeur de blocs (`#pr-editor`)
- **Objectif** : rédiger la procédure bloc par bloc.
- **Layout** : barre d'édition `.pr-ed-head` (flex, gap 14, mb 20) puis grille `230px minmax(0,1fr) 260px`, gap 20. Colonnes latérales sticky. Sous 1180 px : une seule colonne, panneaux masqués.
- **Barre d'édition** : bouton retour « ‹ Procédures » (13 px/700 `neutral-600`), badge statut, indicateur `.pr-saved` (point 7 px vert `state-success` + « Enregistré » 12 px ; pendant la sauvegarde point or + « Enregistrement… »), à droite : Aperçu, Versions (secondaires), Publier (primaire, icône check).
- **Plan** (carte gauche) : titre « PLAN » 11 px/800 uppercase ; liens 12.5 px, indentation 20/32 px pour H2/H3, ellipsis ; hover fond `neutral-100`.
- **Document** `.pr-doc` : fond blanc, bordure `neutral-200`, radius lg, ombre 1, padding 48/64/80, min-height 70vh. Titre `.pr-title` 32 px/800 letter-spacing -.02em (placeholder « Titre de la procédure » `neutral-300`). Ligne méta 12.5 px `neutral-500`, border-bottom, mb 28.
- **Bloc** `.pr-blk` : gouttière gauche 58 px pour les contrôles `.pr-ctl` (bouton + et poignée 6 points, 24 px, `neutral-400`, visibles au hover/sélection). Sélectionné : `.pr-body` avec box-shadow 0 0 0 2px `brand-gold-100`. Drag : source opacité .35 ; indicateur de dépose trait 2 px or au-dessus/dessous.
- **Typo des blocs** : H1 24 px/800 mt 22 ; H2 18 px/800 mt 16 ; H3 15 px/800 `neutral-700` ; paragraphe et listes 14.5 px, line-height 1.65, `neutral-700` ; gras 800 ink ; souligné trait or 2 px ; lien `brand-gold-600` 600 ; surlignage `#FBEAB5`.
- **Étape** : pastille 30 px fond ink chiffre or 13 px/800 + texte. Numérotation auto, remise à zéro à chaque titre.
- **Encadré** : fond `brand-gold-050`, bordure `brand-gold-100`, texte `brand-gold-700` 13.5 px, icône ⓘ 18 px. Variante info : fond `#E6F0FB`, bordure `#C5DBF5`, texte `#1F4E8C`.
- **Média vide** `.pr-media-box` : dashed `neutral-300`, fond `neutral-50`, min-height 180, icône 28 px, titre + aide (« PNG, JPG, SVG · 10 Mo max » / « Coller un lien Stream, YouTube, Vimeo ou importer un MP4 »). Vidéo remplie : 16/9, dégradé sombre, bouton play 58 px or. Légende `.pr-cap` 12 px centrée, placeholder « Ajouter une légende… ».
- **Schéma** : aperçu SVG dans cadre `neutral-200` fond `neutral-50` ; bouton « Modifier le schéma » en haut à droite au hover ; vide = « Schéma vide » + bouton « Ouvrir l'éditeur de schéma ».
- **Ajouter un bloc** `.pr-add` : ligne pointillée + cercle dashed 24 px, 12.5 px `neutral-400`, hover ink.
- **Panneau Bloc** (droite) : type (select, blocs texte uniquement), ton d'encadré, source média, titre du schéma + « N formes · M liens », boutons Monter / Descendre / Dupliquer / Supprimer (rouge `state-danger`).
- **Panneau Procédure** : Catégorie (select : Pilotage, Conformité, Finance, Organisation, Sécurité), Rattachée à, Relecteurs (avatars + bouton +).
- **Panneau Historique** : lignes `vX.Y` (700 ink, min-width 36) + libellé 12 px.
- **Menu d'insertion** `#pr-menu` : popover fixed 300 px, radius lg, ombre 3, padding 8 ; sections « TEXTE » et « MÉDIA & SCHÉMAS » (10.5 px uppercase `neutral-400`), grille 2 colonnes, items 12.5 px/600 avec icône 28 px fond `neutral-100` (hover `brand-gold-050`).
- **Barre de formatage** `#pr-fmt` : fixed, fond ink, radius 10, padding 4, flèche 10 px en bas ; boutons 30 px blancs, hover rgba(255,255,255,.12), actif fond or texte ink ; séparateur 1×18 px. Ordre : B · I · U · S | lien · surligneur · effacer.

### 3. Éditeur de schéma (`#dg-wrap`)
- **Objectif** : dessiner un logigramme inséré comme bloc.
- **Layout** : overlay fixed plein écran fond `neutral-50`. Top bar 58 px blanche : retour, champ titre (15 px/800, sans bordure, focus fond `neutral-100`), segment outils, à droite Exemple · Exporter · « Insérer dans la procédure » (primaire). Corps grille `220px minmax(0,1fr) 260px`.
- **Palette** : items 13 px/600 avec miniature SVG 38×26, hover fond `neutral-50` bordure `neutral-200`, cursor grab. Rappel raccourcis en bas (C, V, 2× clic, Suppr, Échap).
- **Canevas** : fond blanc, grille de points radial 1 px `neutral-300` tous les 20 px, scroll ; en mode Relier cursor crosshair. Indice `.dg-hint` : pilule ink texte blanc 12 px/600 en bas centré.
- **Formes** (`DG_KINDS`) : start 120×44 pilule ink texte or · step 150×56 rect r8 blanc contour ink 1.75 · dec 150×80 losange fond `brand-gold-050` contour `brand-gold-600` · doc 140×56 base ondulée fond `neutral-50` · actor 130×50 fond `#E6F0FB` contour `#1F4E8C` + pictogramme · end 120×44 pilule ink + anneau or. Texte 12.5 px/700 centré, retour à la ligne auto (~7 px/caractère). Sélection : contour or 2.5 px. Survol en mode relier : contour or dashed 4 3.
- **Liens** : Bézier cubique ancrée sur le bord des formes, orientation auto (horizontale si |dx|>|dy|), trait 1.75 `neutral-600`, flèche marker 8 px ; sélection or 2.5. Zone de clic invisible 14 px. Libellé 11 px/700 avec halo blanc 4 px, au milieu du lien décalé de −8 px.
- **Propriétés** (droite) : forme → Libellé (live), Type (select), Description (textarea, info-bulle en lecture), Supprimer la forme ; lien → Libellé du lien, Inverser la flèche, Supprimer le lien ; aucune sélection → compteur.

## Interactions & comportement
- Liste : clic carte → éditeur ; filtre client-side (`PR_FILTER`) ; « Nouvelle procédure » crée un brouillon v0.1 (H1 + paragraphe vides) et ouvre l'éditeur.
- Édition en place : chaque bloc texte est contenteditable ; **mock** : `Entrée` crée un bloc après (même type ; après un titre → paragraphe), `⇧Entrée` saut de ligne, listes = comportement natif des `<li>`. **Produit Starium (écart volontaire)** : sur **paragraphe**, `Entrée` = saut de ligne (`<br>`), `⇧Entrée` = nouveau bloc `p` ; titres / étapes / encadrés gardent `Entrée` = nouveau bloc. `⌫` sur bloc vide → supprime et place le curseur en fin de bloc précédent (jamais le dernier bloc). `⌘/Ctrl+B/I/U`.
- Sélection de bloc : focus ou clic → `PR_SEL`, un seul à la fois ; clic sur le fond du document désélectionne ; le panneau Bloc suit la sélection.
- Menu d'insertion : ancré sous le « + » cliqué (offset 6 px), bascule au-dessus si dépassement (marge 12 px), largeur contrainte au viewport ; fermeture clic extérieur ; insertion à l'index puis focus ; un schéma ouvre directement l'éditeur. **Produit** : image/vidéo = picker/modale d’abord, bloc créé seulement après succès.
- Barre de formatage : affichée sur `selectionchange` si sélection non vide dans un `.pr-body`, centrée au-dessus du rectangle de sélection ; états actifs synchronisés. Le prototype utilise `execCommand` ; en prod utiliser les marks de l'éditeur riche. HTML autorisé dans `html` : b/strong, i/em, u, s, a[href], mark, li, br — sanitiser au collage et côté serveur.
- Drag & drop des blocs : uniquement via la poignée ; pendant le survol, indicateur haut/bas selon la moitié de la cible ; au drop, splice source→destination avec correction d'index, bloc déplacé sélectionné, pulse d'enregistrement. Alternative accessible : Monter / Descendre.
- Autosave : indicateur « Enregistrement… » puis « Enregistré à l'instant » (debounce 900 ms dans le proto ; en prod refléter la réponse réseau, debounce ≥ 1 s sur PATCH).
- Publier : machine d'états `draft → review → pub` ; toast « Procédure envoyée en revue » / « Procédure publiée — version X ». Publiée = lecture seule, nouvelle version = nouveau brouillon.
- Médias : clic sur la zone vide → sélecteur de fichier / saisie d'URL ; `src` renseigné → rendu + légende éditable.
- Schéma : outils Sélection (V) / Relier (C). Clic palette = ajout centré avec décalage en cascade ; glisser palette→canevas = ajout au curseur. Déplacement souris avec snap 10 px, borné à x,y ≥ 0. Double-clic = focus libellé. Relier : clic départ puis arrivée, pas de doublon, clic fond annule. Suppr/⌫ supprime forme (et ses liens) ou lien sélectionné. Échap ou Retour = abandon sans enregistrer. « Insérer dans la procédure » = commit `nodes/edges/title` dans le bloc, re-rendu aperçu (viewBox = bbox + 60 px), toast « Schéma inséré dans la procédure ». Raccourcis ignorés quand le focus est dans un champ. **Produit** : aperçu lecture avec centrage + verrouillage ; déverrouiller pour pan/zoom.
- Toasts : coin bas, icône check, 3.2 s.
- Responsive : < 1180 px, colonnes latérales masquées, gouttière de bloc 36 px, poignée de drag cachée ; l'éditeur de schéma reste desktop.

## Gestion d'état
- `PROCS[]` (liste), `PR_FILTER`, `PR_CUR` (procédure ouverte), `PR_SEL` (index bloc sélectionné), `PR_DRAG`, `PR_INSERT_AT`.
- `DG` : `{blk, nodes, edges, tool, sel, selEdge, from, drag, hov}` — copie de travail, committée seulement à l'insertion.
- Machine d'états procédure : draft → review → pub.

### Modèle de données
```ts
type Status = 'draft' | 'review' | 'pub';
interface Procedure { id: string; title: string; cat: 'Pilotage'|'Conformité'|'Finance'|'Organisation'|'Sécurité'; ver: string; st: Status; owner: string; upd: string; sum: string; blocks: Block[] }
type Block =
  | { t: 'h1'|'h2'|'h3'|'p'|'ul'|'ol'|'step'; html: string }
  | { t: 'callout'; html: string; kind: 'warn'|'info' }
  | { t: 'img'|'video'; src: string; cap: string }
  | { t: 'diag'; title: string; cap: string; nodes: Node[]; edges: Edge[] };
interface Node { id: string; k: 'start'|'step'|'dec'|'doc'|'actor'|'end'; x: number; y: number; label: string; desc?: string }
interface Edge { from: string; to: string; label?: string }
```

### API suggérée
```
GET    /procedures?status=&cat=
POST   /procedures                      → brouillon v0.1
GET    /procedures/:id
PATCH  /procedures/:id                  autosave (title, cat, blocks[])
POST   /procedures/:id/transition {to}  draft→review→pub
GET    /procedures/:id/versions
POST   /media                           multipart → { src }
```
Événements : procedure.created / updated / status_changed / published ; block.inserted / moved / deleted ; media.uploaded ; diagram.saved.

## Tokens de design
- Couleurs : `--brand-ink #0E0E10`, `--brand-gold #E8A317`, `--brand-gold-600 #CC8E0E`, `--brand-gold-700 #5F3F00`, `--brand-gold-100 #F4D58A`, `--brand-gold-050 #FBEAB5` ; neutres 0 #FFFFFF · 50 #FAF9F7 · 100 #F4F2EE · 200 #E9E6E0 · 300 #D6D2CA · 400 #B6B0A4 · 500 #8C8579 · 600 #5F5A52 · 700 #403D38 ; états success #1F8A5B / bg #E6F4ED, warning #C77A00 / bg #FFF1DC, danger #B42318 / bg #FBE8E6, info #2A6FDB / bg #E3EEFB ; bleu acteur/info #E6F0FB / #C5DBF5 / #1F4E8C.
- Typo : `Manrope` (fallback system-ui). Échelle utilisée : 9 · 11 · 12 · 12.5 · 13 · 13.5 · 14.5 · 15 · 15.5 · 18 · 24 · 32 px. Graisses 600 / 700 / 800.
- Rayons : `--radius-md`, `--radius-lg`, `--radius-pill` (voir `styles/app.css`) ; 6–10 px sur les petits contrôles.
- Ombres : `--shadow-1`, `--shadow-2`, `--shadow-3` (0 12px 32px rgba(14,14,16,.16)).
- Espacements : 2 · 4 · 6 · 8 · 10 · 12 · 14 · 16 · 18 · 20 · 28 · 48 · 64 px.

## Assets
- `assets/logo-horizontal-white.png` — logo sidebar.
- `assets/product-mock-vision-strategique.png` — image de démo pour le bloc image.
- Icônes : SVG inline style Feather/Lucide, trait 1.75, 24×24.

## Fichiers
- `Procedures - Mockup dev.html` — spécification annotée (à lire en premier).
- `Procedures.html` — prototype interactif (shell + vue + menu + barre de formatage + éditeur de schéma).
- `modules/procedures.js` — logique de référence (préfixes `pr*` éditeur, `dg*` schéma).
- `styles/procedures.css` — styles du module ; `styles/app.css` — tokens et composants partagés ; `styles/prep.css`, `styles/strategie.css`, `styles/acl.css` — dépendances du shell.
- `modules/acl.js` — boutons Droits / Partager (hors périmètre, présent pour le shell).
