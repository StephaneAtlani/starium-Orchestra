# Starium — Design System

> **Révélez vos talents.** Starium est une plateforme SaaS de pilotage des directions, projets, budgets et ressources, à destination des dirigeants et de leurs équipes. La marque vise la sobriété et la performance d'Apple, réchauffée par une signature dorée distinctive.

---

## Sources fournies

Aucun codebase ni Figma n'a été partagé pour cette première itération. Le système est extrapolé à partir des éléments visuels suivants :

- `assets/logo-horizontal.png` — logo principal noir (ex. `uploads/LOGO_HORIZONTAL.png`)
- `assets/logo-vertical.png` — logo vertical noir (ex. `uploads/LOGO_VERTICAL.png`)
- `assets/icon-starium.png` — icône / monogramme noir (ex. `uploads/ICONE_STARIUM.png`)
- `assets/logo-horizontal-white.png` — logo horizontal blanc (fonds sombres) (ex. `uploads/LOGO_HORIZONTAL_BLANC.png`)
- `assets/logo-vertical-white.png` — logo vertical blanc (fonds sombres) (ex. `uploads/LOGO_VERTICAL_BLANC.png`)
- `assets/icon-starium-white.png` — monogramme blanc (fonds sombres) (ex. `uploads/ICONE_STARIUM_BLANC.png`)
- `assets/product-mock-vision-strategique.png` — maquette « Vision stratégique 2026 » fournie en référence (ex. `uploads/ChatGPT Image 6 mai 2026, 14_12_39.png`)

> ✅ **Typographie** : **Manrope** est la fonte de marque, auto-hébergée en variable font dans `fonts/Manrope-VariableFont_wght.ttf` (poids 200–800) et déclarée en `@font-face` dans `colors_and_type.css`. Plus de dépendance CDN pour la fonte principale. Mono : *JetBrains Mono* (Google Fonts).

---

## Index du dossier

| Fichier / dossier | Rôle |
|---|---|
| `README.md` | Ce document — fondamentaux de marque, ton, motifs visuels |
| `SKILL.md` | Skill Claude / Agent — point d'entrée pour réutiliser le système |
| `styles.css` | **Point d'entrée du design system** — `@import url('styles.css')` charge tous les tokens, styles de base et fontes |
| `colors_and_type.css` | Tokens CSS : couleurs, typo, espace, rayons, ombres, motion (importé par `styles.css`) |
| `components/` | Composants React du design system (un dossier par composant : `.jsx`, `.d.ts`, carte de specimen `@dsCard`) |
| `fonts/` | Fonte de marque Manrope (variable font auto-hébergée) |
| `assets/` | Logos, icône, mock produit |
| `preview/` | Cartes de specimen pour l'onglet Design System |
| `ui_kits/app/` | Recréation HFI du SaaS Starium (sidebar, topbar, dashboard, KPI cards, table, etc.) |

> Les fichiers `_ds_bundle.js`, `_ds_manifest.json` et `_adherence.oxlintrc.json` sont **générés automatiquement** par le compilateur — ne pas les éditer à la main.

---

## 1 — Identité

**Nom** : Starium
**Baseline** : *Révélez vos talents.*
**Métier** : SaaS de pilotage — directions, projets, budgets, ressources.
**Positionnement** : la sobriété d'Apple appliquée à la gouvernance d'entreprise. Calme, premium, performant. On ne crie pas — on aligne.

L'identité repose sur trois éléments :

1. **Le wordmark** — *Starium* en très gros gras, lettres rondes et fermées (presque géométriques), tracking serré.
2. **Le monogramme** — quatre lobes noirs en rotation autour d'un point doré central en forme de scintillement à 4 branches (l'« étoile »).
3. **L'étoile** — `✦` à 4 branches, symbole de l'éclat / du talent révélé. C'est le seul élément graphique « ornemental » autorisé.

---

## 2 — Content fundamentals

### Voix
- **Calme, posée, experte.** On ne survend pas. On constate, on aligne, on décide.
- **Décisionnaire, pas technique.** L'audience est CODIR / COMEX / direction de projet — pas des devs. On parle valeur, pilotage, alignement, risque, capacité — pas API, endpoint, payload.
- **Orientée résultat.** Verbes d'action concrets : *aligner, piloter, décider, arbitrer, révéler, sécuriser*.

### Casse
- **Titres et sous-titres : Sentence case.** *« Vision stratégique 2026 »*, *« Axes stratégiques »*, *« Score d'alignement global »*. Jamais de Title Case anglo-saxon.
- **Boutons : Sentence case.** *« Modifier la vision »*, *« Voir le détail »*, *« Exporter »*.
- **Overlines / sections de menu : UPPERCASE tracké.** *GOUVERNANCE*, *PILOTAGE*, *RÉFÉRENTIEL*. C'est le seul endroit où on monte en capitales.

### Personne
- **Vous** par défaut (vouvoiement professionnel).
- **Nous** pour parler de Starium en tant qu'éditeur ou de l'organisation cliente dans une vision (*« notre cap »*, *« nos talents »*).
- Jamais de *tu*.

### Langue
- **Français** est la langue maîtresse. Anglicismes tolérés uniquement quand l'usage métier l'impose (*dashboard*, *KPI*, *NPS*, *roadmap*).
- Apostrophes typographiques (`'`) et guillemets français (`« … »`) — pas de `"…"` droits.
- Espaces fines insécables avant `: ; ! ?` quand le rendu le permet.
- Chiffres : espaces fines pour les milliers (`1 240`), `%` collé (`82%`), `€` après (`1 240 €`).
- Dates compactes : `15 mai 2024`, `31 déc. 2026`, `T1 2025`.

### Emoji et ornements
- **Pas d'emoji** dans l'UI ni les supports de marque. Ils cassent le ton premium.
- **Une seule exception ornementale** : l'étoile `✦` à 4 branches du logo, utilisée avec parcimonie comme puce visuelle ou ornement de titre.
- **Pas de `→`, `★`, `🚀`, `✨`** — on les remplace par l'icône Lucide correspondante (cf. ICONOGRAPHY).

### Exemples concrets (extraits de la maquette)
- ✅ *« Définir notre cap, aligner l'organisation et créer de la valeur durable. »*
- ✅ *« Être la référence de confiance de nos clients en délivrant des solutions innovantes et durables. »*
- ✅ *« Score d'alignement global »* / *« Axes stratégiques actifs »* / *« Alertes de désalignement »*
- ✅ *« En bonne trajectoire »* / *« Attention requise »* / *« En retard »* — labels de statut au présent court.
- ❌ *« 🚀 Boostez votre performance ! »* — trop fort, trop emoji.
- ❌ *« Click here to modify »* — anglais, impératif sec.

---

## 3 — Visual foundations

### Couleurs
- **Or Starium `#E8A317`** — accent unique. Usage parcimonieux : CTA primaire, anneaux d'icônes circulaires, valeurs clés, ligne active de menu, courbes de graphique principal. **Jamais en arrière-plan plein de grande surface.**
- **Encre `#0E0E10`** — texte primaire, logo, surfaces "ink" (sidebar de marque, footer dark).
- **Neutres papier (`#FAF9F7` → `#14130F`)** — chaleur très légère ; jamais de gris bleuté froid. Le fond d'app est `#FAF9F7`, pas blanc pur.
- **Tints dorés `#FBEAB5` / `#F4D58A`** — anneaux d'icônes, badges « actif », surfaces de mise en avant douces.
- **États sémantiques** — vert sobre (succès), or chaud (warning, *préfère le warning au gold de marque dans les tables*), rouge profond (danger), bleu encre (info). Toujours déclinés en paire `text` / `bg` doux.

### Typographie
- **Famille unique : Manrope** (substitut, cf. note plus haut). Pas de serif, pas de display secondaire.
- **Hiérarchie tendue** : on saute des paliers (28 → 22 → 18 → 15 → 13). Pas de `text-md` mou intermédiaire.
- **Display chunky** : titres en `font-weight: 700–800`, `letter-spacing: -0.02em`. C'est ce qui rappelle le wordmark.
- **Body en 15px / line-height 1.55**. Confortable sans être aéré.
- **Overlines 11px UPPERCASE tracking 0.08em** pour les sections de sidebar et catégories.
- **Tabular numerals** (`font-variant-numeric: tabular-nums`) sur les KPI, scores, montants, pourcentages dans les tables.

### Espace et rythme
- **Base 4px**, échelle 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64.
- **Cards : padding 24px**, gap interne 16px.
- **Topbar 64px**, sidebar 248px — chiffres ronds, jamais de 67 ou 251.
- **Marges généreuses entre sections (48–64px)** — l'air est un signal premium.

### Arrière-plans
- **Pas d'images full-bleed dans l'UI.** L'app vit sur `#FAF9F7` uni.
- **Pas de gradients vifs.** Une seule exception : un *dégradé encre* très subtil dans certains hero marketing (`#0E0E10 → #1F1C18`), avec l'étoile dorée en filigrane.
- **Pas de motifs / textures / illustrations dessinées**. La sobriété est le motif.
- **L'icône Starium peut servir de filigrane** très très basse opacité (3–6%) en grand format, top-right, pour les écrans hero / login / 404.

### Motion
- **Discret.** `120ms` (micro), `200ms` (standard), `320ms` (transitions de page).
- **Easing standard** `cubic-bezier(0.2, 0, 0, 1)` — entrée rapide, sortie qui s'étire. Apple-like.
- **Pas de bounce, pas de spring.** Une légère emphasis (`cubic-bezier(0.2, 0, 0, 1.2)`) tolérée sur les apparitions de modals/toasts uniquement.
- **Fades + translate de 4–8px** pour entrées. Jamais de scale 0 → 1 violent.
- **Hover : 120ms** sur fond et bordure. Pas de transform.

### États interactifs
- **Hover (boutons primaires)** : fond `--brand-gold-600` (assombrissement 8%).
- **Hover (boutons secondaires / lignes)** : fond `--neutral-100`.
- **Hover (lien)** : passage à `--brand-gold-600`, **pas de underline** (sauf dans un paragraphe).
- **Active / press** : fond `--brand-gold-700` ou `--neutral-200`. **Pas de scale** — on reste posé.
- **Focus** : `box-shadow: 0 0 0 3px rgba(219,152,1,0.28)` (focus ring or). Toujours visible au clavier.
- **Disabled** : opacité 0.4, `cursor: not-allowed`, pas de hover.

### Bordures
- **1px solide** sur fond chaud `--neutral-200` (`#E9E6E0`). Jamais 2px sauf focus.
- **Pas de border colorée seule** comme accent (pas de "left border gold de 4px"). On utilise plutôt fond tinté + icône colorée.
- **Dividers** : même `--neutral-200`, full-bleed dans les listes / tables.

### Ombres et élévation
- **Système à 4 paliers** (`--shadow-1` à `--shadow-4`), tous en encre noire à très faible opacité (0.03 → 0.12). Pas d'ombres bleutées.
- `shadow-1` : cards de KPI sur fond app.
- `shadow-2` : cards posées (objectifs, listes).
- `shadow-3` : popovers, dropdowns.
- `shadow-4` : modals, dialogs.
- **Pas d'ombres internes** sauf input focus.
- **Focus ring** = ombre or 3px à 28% — c'est notre seule "ombre colorée".

### Rayons
- **Échelle** : 4 / 6 / 10 / 14 / 20 / 28 / pill.
- **Cards : 14px** (`--radius-lg`). C'est la valeur signature.
- **Boutons : 10px** (`--radius-md`). Pas de pill sauf badges et avatars.
- **Inputs : 10px**.
- **Badges / chips : pill** (`999px`).
- **Avatars : pill** (cercle).
- **Modals : 20px**.

### Transparence et flou
- **Très peu utilisé.** L'UI est nette et opaque.
- **Topbar/sidebar fixes** : opaques, séparées par `--border-subtle`. Pas de blur de scroll par défaut.
- **Backdrop de modal** : `rgba(14,14,16,0.4)` + `backdrop-filter: blur(8px)` — c'est le seul blur courant.

### Imagerie
- Quand des photos sont nécessaires (équipes, dirigeants), **noir & blanc ou désaturé chaud**, pas d'or saturé. Composition aérée, regards calmes. Pas de stock images "corporate happy team".
- **Avatars utilisateurs** : photo carré arrondie en pill, fallback initiales sur fond neutre `--neutral-200` texte `--neutral-700`. Jamais de fallback coloré random.

### Layout
- **Sidebar fixe** 248px à gauche (réductible à 64px).
- **Topbar fixe** 64px en haut, contenu : sélecteur de client actif + recherche centrale + notifications + profil.
- **Container max** 1280px sur les écrans marketing ; full-width sur l'app (avec gouttières 32px).
- **Grilles 12 colonnes** sur le marketing ; **grille fluide en `auto-fit minmax(280px, 1fr)`** pour les cards de KPI.
- **Sticky** : topbar, en-têtes de tableau, barres d'action de modal.

---

## 4 — Iconography

### Système
- **Lucide Icons** (CDN) — substitut documenté. Stroke 1.5–1.75px, outlined, coins légèrement arrondis. À aligner avec la fonte officielle quand fournie. La maquette de référence montre des icônes outlined très propres parfaitement compatibles avec Lucide (`Target`, `Eye`, `AlertTriangle`, `CheckCircle2`, `Sparkles`, `ShieldCheck`, `Users`, `TrendingUp`, `LayoutDashboard`, `Briefcase`, `FileText`, `Search`, `Bell`, `HelpCircle`, `ChevronDown`).
- **Taille standard** : 20px (UI), 16px (inline texte/badges), 24px (hero / ronds dorés).
- **Stroke** : `stroke-width: 1.75` pour le 20px, `1.5` pour le 24px.
- **Couleur** : `currentColor`. Dans les "anneaux dorés" (cf. plus bas), couleur `--brand-gold`.

### Anneaux dorés (motif signature)
La maquette montre un motif récurrent : **icône Lucide outlined dans un cercle 40px de fond `--brand-gold-100` (`#F4D58A`), icône en `--brand-gold` (`#E8A317`)**. C'est le marqueur visuel de chaque KPI, vision, axe stratégique. À utiliser systématiquement pour ancrer les "objets de pilotage".

### Logo
- **`assets/icon-starium.png`** — monogramme noir, pour favicons, app icons, anneau de marque sur fond clair.
- **`assets/icon-starium-white.png`** — monogramme blanc, pour fonds sombres (sidebar dark, hero ink, splash).
- **`assets/logo-horizontal.png`** — usage par défaut sur fond clair (header, login, footer, signature email).
- **`assets/logo-horizontal-white.png`** — version blanche pour fonds sombres.
- **`assets/logo-vertical.png`** / **`assets/logo-vertical-white.png`** — usage portrait (couvertures de doc, splash mobile), noir et blanc.
- Zone de protection : au moins une "hauteur de S" tout autour.
- **Règle d'usage** : version noire sur fonds clairs (`--neutral-50` à `--neutral-200`), version blanche sur fonds `--brand-ink` ou photo sombre. La pointe de l'étoile reste **toujours dorée** dans les deux versions.

### Emoji et caractères Unicode
- **Pas d'emoji.**
- L'étoile `✦` (U+2726, BLACK FOUR POINTED STAR) **peut** apparaître comme ornement de titre / décoration discrète, en or, taille modeste — c'est l'écho du logo.
- Aucun autre caractère Unicode décoratif.

---

## 5 — Composants

Les composants réutilisables du design system vivent dans `components/<Nom>/` (un dossier par composant : implémentation `.jsx`, typage `.d.ts`, et carte de specimen `@dsCard`). Le compilateur les expose sur le namespace global **`window.StariumDesignSystem_019e02`**.

| Composant | Chemin | Description |
|---|---|---|
| `Button` | `components/Button/` | Contrôle d'action principal — variantes `primary` / `secondary` / `modifier` / `ghost` / `danger`, tailles `sm` / `md` / `lg`, icônes optionnelles, état désactivé. |
| `Modal` | `components/Modal/` | Dialogue — overlay flouté, en-tête (icône ronde dorée + titre/sous-titre + fermeture), corps scrollable, pied d'actions. Largeur configurable. |

### Consommer un composant

Dans une page HTML (ou une carte `@dsCard`), charger le stylesheet et le bundle, puis lire le composant depuis le namespace :

```html
<link rel="stylesheet" href="styles.css">
<script src="_ds_bundle.js"></script>
<script>
  const { Button } = window.StariumDesignSystem_019e02;
  // React.createElement(Button, { variant: 'primary' }, 'Nouveau projet')
</script>
```

> Les composants n'utilisent que des tokens du design system (`var(--brand-gold)`, `var(--radius-md)`…) : tant que `styles.css` est chargé, ils s'affichent correctement partout.

---

## 6 — UI kits

| Kit | Chemin | Description |
|---|---|---|
| App SaaS Starium | `ui_kits/app/index.html` | Recréation HF de l'écran *Vision stratégique 2026* : sidebar, topbar, KPI ring cards, vision card, axes stratégiques, table d'objectifs, alertes, graphique d'alignement, documents clés. |

Chaque kit contient son `README.md`, son `index.html` interactif (clic vers les onglets, hover des lignes, etc.), et des composants `.jsx` factorisés.

---
