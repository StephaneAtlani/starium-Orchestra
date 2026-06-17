# Starium Design System — Handoff pour Cursor / Claude Code

> Ce dossier est un **package de référence design** à lire par un LLM (Claude, GPT-4, Cursor) pour implémenter le design system Starium dans un codebase réel. Les fichiers HTML inclus sont des **maquettes de référence**, pas du code à copier directement.

---

## Contexte produit

**Starium** est un SaaS B2B de pilotage des directions : projets, budgets, ressources, gouvernance. Audience : CODIR / COMEX / directeurs de projets. L'esthétique visée est **Apple-inspired** — sobriété, premium, performant — réchauffée par une **signature dorée distincte**.

**Baseline :** *Révélez vos talents.*

---

## Structure du projet source

```
/
├── styles.css              ← entrée CSS principale (importe colors_and_type.css)
├── colors_and_type.css     ← TOUS les tokens CSS (couleurs, typo, espace, ombres, motion)
├── fonts/
│   └── Manrope-VariableFont_wght.ttf   ← fonte auto-hébergée
├── assets/
│   ├── logo-horizontal.png             ← logo noir (fond clair)
│   ├── logo-horizontal-white.png       ← logo blanc (fond sombre)
│   ├── icon-starium.png                ← monogramme noir
│   └── icon-starium-white.png          ← monogramme blanc
├── ui_kits/app/index.html              ← maquette HF de l'app principale
└── docs/Charte Design System.html      ← charte complète 24 pages (référence)
```

---

## Tokens CSS — utilisation

Importer `styles.css` (ou `colors_and_type.css` directement) dans votre app :

```css
@import url('./styles.css');
/* puis utiliser les variables partout */
```

### Couleurs principales

| Token | Valeur | Usage |
|---|---|---|
| `--brand-gold` | `#E8A317` | Accent principal — CTA, courbe principale, menu actif |
| `--brand-gold-600` | `#CC8E0E` | Hover sur actions dorées |
| `--brand-gold-100` | `#F4D58A` | Fond d'icônes, badges actifs |
| `--brand-gold-050` | `#FBEAB5` | Surface très claire, highlights |
| `--brand-ink` | `#0E0E10` | Texte primaire, logo, sidebar |
| `--neutral-50` | `#FAF9F7` | Fond d'app (jamais blanc pur) |
| `--neutral-100` | `#F4F2EE` | Surface hover, skeleton |
| `--neutral-200` | `#E9E6E0` | Bordures, séparateurs |
| `--neutral-500` | `#8C8579` | Texte muted / métadonnées |
| `--state-success` | `#1F8A5B` | Succès / Terminé |
| `--state-warning` | `#C77A00` | Attention / En cours à risque |
| `--state-danger` | `#B42318` | Danger / En retard |
| `--state-info` | `#2A6FDB` | Info / Nouveau |

### Typographie

```css
/* Famille unique */
font-family: var(--font-sans);   /* Manrope, system-ui */
font-family: var(--font-mono);   /* JetBrains Mono */

/* Échelle de titre */
font: var(--text-display-xl);    /* 800 64px/1.05 */
font: var(--text-display-l);     /* 800 48px/1.08 */
font: var(--text-display-m);     /* 700 36px/1.12 */
font: var(--text-h1);            /* 700 28px/1.2 */
font: var(--text-h2);            /* 700 22px/1.25 */
font: var(--text-h3);            /* 600 18px/1.3 */
font: var(--text-h4);            /* 600 15px/1.35 */

/* Corps */
font: var(--text-body);          /* 400 15px/1.55 */
font: var(--text-body-s);        /* 400 13px/1.5 */
font: var(--text-caption);       /* 500 12px/1.4 */
font: var(--text-overline);      /* 600 11px — UPPERCASE, tracking 0.08em */
```

**Règles typo importantes :**
- Titres en `letter-spacing: -0.02em` (tracking tight)
- Overlines toujours en UPPERCASE + `letter-spacing: 0.08em`
- Chiffres dans tableaux/KPI : `font-variant-numeric: tabular-nums`
- `font-weight: 700–800` pour tout ce qui est display / hero

### Espacement (base 4px)

```css
--space-1: 4px   --space-2: 8px   --space-3: 12px  --space-4: 16px
--space-5: 20px  --space-6: 24px  --space-8: 32px  --space-10: 40px
--space-12: 48px --space-16: 64px --space-20: 80px --space-24: 96px
```

### Rayons

```css
--radius-xs: 4px   --radius-sm: 6px   --radius-md: 10px  --radius-lg: 14px
--radius-xl: 20px  --radius-2xl: 28px --radius-pill: 999px
```

- **Cards** → `--radius-lg` (14px) ← valeur signature
- **Boutons / inputs** → `--radius-md` (10px)
- **Badges / chips / avatars** → `--radius-pill`
- **Modals** → `--radius-xl` (20px)

### Ombres / Élévation

```css
--shadow-1  /* KPI cards sur fond app */
--shadow-2  /* Cards posées */
--shadow-3  /* Popovers, dropdowns */
--shadow-4  /* Modals, dialogs */
--shadow-focus  /* Focus ring doré : 0 0 0 3px rgba(232,163,23,0.32) */
```

### Motion

```css
--duration-fast: 120ms   /* micro-interactions hover */
--duration-base: 200ms   /* transitions standard */
--duration-slow: 320ms   /* transitions de page */
--ease-standard: cubic-bezier(0.2, 0, 0, 1)    /* Apple-like */
--ease-emphasis: cubic-bezier(0.2, 0, 0, 1.2)  /* modals, toasts */
```

---

## Composants — spécifications

### Layout global

```
┌─────────────────────────────────────┐
│  Topbar (h: 64px, bg: #fff)         │
├──────────────┬──────────────────────┤
│ Sidebar      │  Contenu principal   │
│ (w: 248px)   │  bg: #FAF9F7         │
│ bg: #0E0E10  │  padding: 32px       │
│ text: #fff   │                      │
└──────────────┴──────────────────────┘
```

**Sidebar :**
- Fond `#0E0E10`, texte `#FFFFFD`
- Logo blanc en haut (`logo-horizontal-white.png`)
- Nav item actif : fond `#E8A317`, icône blanche, texte blanc, radius `--radius-md`
- Sections overline en `--neutral-400` (atténuée sur fond sombre)
- Réductible à 64px (icônes seules)

**Topbar :**
- Fond blanc, `border-bottom: 1px solid --neutral-200`
- Recherche universelle ⌘K (fond `--neutral-100`, radius `--radius-md`)
- Sélecteur organisation, cloche notifications (dot or si non lu), avatar

### Boutons

```css
/* Primaire (CTA) */
background: var(--brand-gold);
color: var(--brand-ink);
font-weight: 700;
border-radius: var(--radius-md);
padding: 10px 18px;
/* hover: --brand-gold-600 | active: --brand-gold-700 */

/* Secondaire */
background: transparent;
border: 1.5px solid var(--neutral-200);
color: var(--fg-1);
/* hover: background --neutral-100 */

/* Ghost */
background: transparent;
color: var(--fg-2);
/* hover: background --neutral-100 */

/* Danger */
background: var(--state-danger);
color: #fff;
```

### KPI Cards

```html
<!-- Structure type -->
<div style="
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: var(--shadow-1);
  display: flex;
  align-items: center;
  gap: 16px;
">
  <!-- Icône à gauche -->
  <div style="
    width: 44px; height: 44px;
    border-radius: var(--radius-md);
    background: var(--brand-gold-100);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  ">
    <!-- Lucide icon, stroke #E8A317, 22px -->
  </div>
  <!-- Données à droite -->
  <div>
    <div style="font: var(--text-overline); text-transform: uppercase; letter-spacing: 0.08em; color: var(--fg-3);">Label</div>
    <div style="font: var(--text-display-m); letter-spacing: -0.02em; color: var(--fg-1);">42</div>
    <div style="font: var(--text-caption); color: var(--fg-3);">Sous-texte / tendance</div>
  </div>
</div>
```

### Badges / Chips de statut

```css
/* Structure commune */
.chip {
  display: inline-flex; align-items: center;
  padding: 3px 9px;
  border-radius: var(--radius-pill);
  font: var(--text-caption);
  font-weight: 600;
}

/* Terminé (vert) */   background: var(--state-success-bg); color: var(--state-success);
/* En cours (or) */    background: var(--brand-gold-050);   color: var(--brand-gold-700);
/* En retard (rouge)*/ background: var(--state-danger-bg);  color: var(--state-danger);
/* Attention */        background: var(--state-warning-bg); color: var(--state-warning);
/* Neutre */           background: var(--neutral-100);      color: var(--neutral-600);
/* Info (bleu) */      background: var(--state-info-bg);    color: var(--state-info);
```

### Tableaux de données

```css
/* En-têtes */
font: var(--text-overline);
text-transform: uppercase;
letter-spacing: 0.08em;
color: var(--neutral-500);
padding: 10px 14px;
border-bottom: 1.5px solid var(--neutral-200);

/* Cellules */
padding: 10px 14px;
border-bottom: 1px solid var(--neutral-100);
font-size: 13px;

/* Hover row */
background: var(--neutral-50);

/* Colonne nom */
font-weight: 600; color: var(--fg-1);
```

Règles : jamais de bordures verticales · max 8 colonnes · troncature avec tooltip · `tabular-nums` sur les numériques.

### Barres de progression

```css
/* Track */
background: var(--neutral-200);
border-radius: var(--radius-pill);
height: 6px; /* ou 8px */

/* Fill selon état */
/* OK / En cours */ background: var(--brand-gold);
/* Terminé */       background: var(--state-success);
/* En retard */     background: var(--state-danger);
/* Neutre */        background: var(--neutral-400);
```

### Champs de saisie

```css
background: var(--bg-surface);
border: 1.5px solid var(--border-subtle);
border-radius: var(--radius-md);
padding: 10px 14px;
font: var(--text-body-s);

/* Focus */
border-color: var(--brand-gold);
box-shadow: var(--shadow-focus);

/* Error */
border-color: var(--state-danger);
```

### Alertes / Notifications

```css
/* 4 états — même structure : dot coloré + titre bold + message */
/* padding: 13px 16px; border-radius: 9px; */

/* Succès */  background: var(--state-success-bg); color: var(--state-success);
/* Warning */ background: var(--state-warning-bg); color: var(--state-warning);
/* Danger */  background: var(--state-danger-bg);  color: var(--state-danger);
/* Info */    background: var(--state-info-bg);    color: var(--state-info);
```

### Modales

```css
/* Overlay */  background: rgba(14,14,16,0.45); backdrop-filter: blur(8px);
/* Box */      border-radius: var(--radius-xl); box-shadow: var(--shadow-4);
/* Largeur */  480px (L) · 360px (M)
/* Structure */ header (icône + titre + sous-titre + close) · corps · footer (actions)
```

### Onglets (Tabs)

```css
/* Tab bar */
border-bottom: 1.5px solid var(--neutral-200);

/* Tab inactif */
color: var(--fg-3);
padding: 10px 16px;

/* Tab actif */
color: var(--brand-gold);
border-bottom: 2px solid var(--brand-gold);
font-weight: 600;
```

---

## Iconographie

**Bibliothèque :** Lucide Icons (https://lucide.dev)
- Taille : 20px (UI), 16px (inline), 24px (hero / ronds KPI)
- Stroke : `1.75` pour 20px · `1.5` pour 24px
- Couleur : `currentColor` par défaut
- Dans les anneaux dorés : couleur `--brand-gold`

**Icônes fréquentes :** `Target`, `Eye`, `AlertTriangle`, `CheckCircle2`, `TrendingUp`, `LayoutDashboard`, `Briefcase`, `FileText`, `Users`, `Search`, `Bell`, `Shield`, `ChevronDown`

---

## Voix & copie

- **Langue** : Français · sentence case partout · overlines en UPPERCASE
- **Personne** : Vous (vouvoiement) · Nous pour l'organisation/Starium
- **Ton** : posé, expert, orienté résultat. Jamais de superlatifs marketing.
- **Pas d'emoji** dans l'UI. Seule exception : `✦` (U+2726) comme ornement de titre.
- **Verbes** : aligner · piloter · décider · arbitrer · révéler · sécuriser
- **Chiffres** : espace fine pour milliers (`1 240`) · `%` collé · `€` après · dates `15 mai 2024`

---

## Règles à ne pas violer

| ✗ Interdit | ✓ À la place |
|---|---|
| Fond d'app blanc pur `#fff` | `--neutral-50` (`#FAF9F7`) |
| Gradient vif en arrière-plan | Fond uni + icône dorée |
| Gris froid (bleuté) | Neutres "papier" chauds |
| `border-left: 4px solid gold` comme accent | Fond teinté + icône colorée |
| Emoji dans l'UI | Icône Lucide correspondante |
| Title Case anglais | Sentence case français |
| Ombre avec teinte colorée | Ombre noire faible opacité |
| Scale 0→1 sur animation | Fade + translate 4–8px |
| Plus de 8 colonnes dans un tableau | Masquer / drawer de détail |
| Bordures verticales dans tableaux | Uniquement horizontales |

---

## Fichiers de référence inclus

| Fichier | Description |
|---|---|
| `tokens.css` | Copie complète de tous les tokens CSS |
| `styles.css` | Entrée CSS (importe tokens.css) |
| `ui-kit-reference.html` | Maquette HF de l'app (tous les composants) |
| `charte-reference.html` | Charte design 24 pages (spécifications complètes) |

---

## Comment utiliser dans Cursor

1. **Ouvrir ce dossier** dans Cursor
2. **Dire à Claude Code :** *"Voici le design system Starium. Lis README.md pour comprendre les tokens, règles et composants, puis implémente [ce que tu veux] en respectant ce système."*
3. **Importer `tokens.css`** dans votre app (React, Vue, Svelte, Next.js…)
4. **Utiliser les variables CSS** — elles fonctionnent nativement dans tous les frameworks modernes
5. Pour Tailwind, demander à Claude Code de générer un `tailwind.config.js` depuis `tokens.css`

### Implémentation Orchestra (`apps/web`)

| Artefact | Rôle |
|----------|------|
| `apps/web/src/styles/tokens.css` | Tokens DS + `--ds-*` (rayon, ombre, KPI) |
| `apps/web/src/app/globals.css` | Pont shadcn, `.starium-card`, `.starium-module`, `.starium-kpi-card`, `.starium-panel`, remap `@theme` |
| `apps/web/src/components/ui/kpi-card.tsx` | Score card KPI partagée |
| [FRONTEND_UI-UX.md](../FRONTEND_UI-UX.md) §2.1 | Règles « pas de cadre dans cadre » et patterns cockpit |

---

*Starium Design System v1.0 · Confidentiel*
