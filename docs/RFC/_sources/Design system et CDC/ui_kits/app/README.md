# Portail Client — Starium

Application HTML/CSS/JS **sans framework ni build**. Ouvrir `Refonte Portail Client.html` dans un navigateur : ça marche, il n'y a rien à installer.

## Structure

```
Refonte Portail Client.html   Structure HTML + script principal (navigation, vues diverses)
styles/app.css                Tout le CSS (tokens, composants, modules)
budget/                       Module Budget (6 fichiers)
modules/                      Autres modules métier (7 fichiers)
```

### budget/
| Fichier | Rôle |
|---|---|
| `budget-data.js` | Données (`MBUDGETS`, courbes, icônes) + helpers de calcul (`mbTot`, `mbf`, `mbFlatLines`…) |
| `budget-views.js` | Accueil, détail d'un budget, tableau des lignes, export CSV |
| `budget-depense.js` | Saisie d'une dépense (engagé / consommé) |
| `budget-import.js` | Sources (XLS/API/ERP) + assistant d'import en 4 étapes |
| `budget-reaffect.js` | Réaffectation entre lignes, workflow de validation, journal |
| `budget-forecast.js` | Scénarios bas/central/haut, versions budgétaires, prévisionnel mensuel |

### modules/
`capacite.js`, `scenario.js`, `reunions.js`, `seance.js`, `plans-action.js`, `equipes.js`, `conformite.js`

## Conventions

**Scripts classiques, portée globale partagée.** Pas de modules ES, pas d'`import`/`export`. Les fichiers sont chargés par `<script src>` **avant** le script principal, dans cet ordre : `modules/*` puis `budget/*`. Une `const`/`let` au niveau racine d'un fichier est visible depuis tous les autres.

**Préfixes.** Chaque module préfixe ses symboles : `mb*`/`MB_` budget, `bs*`/`BS_` import, `br*`/`BR_` réaffectation, `bsc*`/`BSC_` scénarios, `mtg*`/`MTG_` réunions, `liv*`/`LIV_` séance live, `scn*`/`SCN_` scénario quarterplan, `cap*`/`CAP_` capacité, `pa*`/`PA_` plans d'action, `eq*`/`EQ_` équipes.

**Rendu.** Les vues sont produites par concaténation de chaînes puis `innerHTML` sur un conteneur (`#budgets-detail`, `#mtg-instances`, `#scnGantt`…). Il n'y a pas de moteur de template. Les interactions passent par des `onclick="maFonction()"` inline appelant des fonctions globales — **renommer une fonction casse l'UI sans erreur au chargement**, penser à chercher son nom dans tous les fichiers *et* dans le HTML.

**Navigation.** `showView('nom')` active la `<section class="view" id="view-nom">` correspondante, met à jour le fil d'Ariane via `VIEW_META` et appelle le `render*` du module concerné. Ajouter une vue = une `<section>` dans le HTML + une entrée dans `VIEW_META` + un `if` dans `showView`.

**Helpers globaux** définis dans le script principal, utilisés partout : `fmtEur(n)` formatage euros, `showToast(msg)` notification.

**Données.** Tout est en dur dans des littéraux JS (aucune API). Les objets sont mutés sur place (ex. `l.budget -= amt`), puis on rappelle la fonction de rendu.

## Design

Tokens CSS dans `:root` en haut de `styles/app.css`. Palette : encre `--brand-ink` #0E0E10, ambre `--brand-gold` #E8A317, neutres `--neutral-*`, sémantiques `--state-success|danger|info`.

Conventions de boutons : action principale = fond encre + texte blanc (`.btn-primary`, `.mb-act-btn.primary`) ; action secondaire = fond blanc + liseré fin (`.btn-secondary`, `.btn-modifier`). Pas de dégradés. Sélecteurs segmentés en pilule blanche à bord arrondi, onglet actif en encre pleine.

Langue de l'interface : **français**.
