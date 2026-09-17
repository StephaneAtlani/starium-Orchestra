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

---

## Module Conformité

Suivi de la conformité réglementaire et sécurité par **référentiel** (RGPD, ISO 27001, NIST CSF, DORA…). Disponible dans l'application complète (`showView('conformite')`) et en page autonome : `Conformite.html`.

### Parcours utilisateur

1. **Accueil Conformité** (`#conformite-home`) — 4 KPI (référentiels actifs, exigences évaluées, écarts, prochaine échéance), grille des référentiels actifs (carte = logo, jauge circulaire, compteurs conformes / en cours / écarts, badge d'état) et tableau des dernières évaluations. Clic sur une carte → détail.
2. **Bibliothèque** (`#conformite-library`) — catalogue de 11 référentiels groupés par domaine (Réglementaire, Sécurité & cyber, Sectoriel). Un interrupteur active / désactive un référentiel pour l'environnement ; seuls les actifs apparaissent à l'accueil. Les référentiels sans jeu de contrôles détaillé portent le badge « Catalogue » et ouvrent un toast « Évaluation à démarrer ».
3. **Détail d'un référentiel** (`#conformite-detail`) — hero (logo, version, périmètre, responsable, modalité, échéance, anneau de score), barre de répartition + légende, onglets pour basculer entre référentiels actifs, arbre **domaine → exigence** (accordéon, score par domaine), rail droit (donut, maturité par domaine, bloc évaluation → plan de remédiation). Actions d'en-tête : *Nouveau contrôle*, *Lancer une revue*, export.
4. **Tiroir d'évaluation** (`#dw-panel`) — s'ouvre au clic sur une exigence : statut (5 boutons), niveau de maturité 1–5, responsable, note, preuves (fichier, lien, référence documentaire, note), bloc « écart » affiché uniquement pour Partiel / Écart. Navigation précédent / suivant sans fermer, `Échap` ferme.
5. **Modales** — `#ctrlModal` ajout d'une exigence personnalisée ; `#reviewModal` campagne de revue (mode, périmètre par domaine, compteur d'exigences) ; `#remModal` plan de remédiation (KPI + tableau filtrable écarts / partiels).

### Modèle de données (`modules/conformite.js`)

- `CATALOG[]` — catalogue de la bibliothèque : `{key, name, sub, domain, origin, req, active, pct, ok, wip, ko, foot, badge}`. Les chiffres `pct/ok/wip/ko` des cartes d'accueil sont **statiques** (données de démo), indépendants de `FRAMEWORKS`.
- `FRAMEWORKS{key}` — référentiels détaillés (`nist`, `iso27001`, `rgpd`, `dora`) : `{name, ver, scope, owner, mode, audit, maturityLabel, fns[]}`.
  - `fns[]` = domaines / fonctions : `{code, name, color, cats[]}`.
  - `cats[]` = exigences : `{code, name, ctrl, st, o:[avClass, initiales]}` + champs de session préfixés `_` : `_mat` (maturité), `_note`, `_evid[]` (preuves), `_custom`, `_action/_prio/_actiondue` (remédiation).
- `CD_ST` — les 5 statuts et leur poids : `conf` Conforme (1), `part` Partiel (0,5), `ecart` Écart (0), `todo` À évaluer (exclu), `na` Non applicable (exclu). `CD_CYCLE` donne l'ordre de rotation au clic sur une pastille.
- `CD_KEY` — référentiel courant ; `OWNER_NAMES` — mapping initiales → nom.

### Calcul du score

`cdCompliance(cats)` = Σ poids / nombre d'exigences pondérables × 100, arrondi. « À évaluer » et « Non applicable » ne comptent ni au numérateur ni au dénominateur. Appliqué au référentiel entier (anneau hero, donut) et à chaque domaine (barre de l'accordéon, bloc maturité). Couleur via `pctColor` : ≥ 75 % vert, ≥ 50 % ambre, sinon rouge. `cdCounts` fournit la répartition par statut.

### Workflow évaluation → revue → remédiation

- **Évaluation** : `openAssess(fi,ci)` → modification en mémoire → `saveAssess()` écrit `st/_mat/_note/o` et relance `cdRender()`. Raccourci : clic sur la pastille de statut dans l'arbre (`cdCycle`) sans ouvrir le tiroir.
- **Revue** : `openReview()` propose une campagne sur les domaines cochés ; `rvLaunch()` ne fait qu'un toast (pas de persistance — prototype).
- **Remédiation** : `remGaps()` dérive automatiquement le plan des exigences en statut `ecart` (priorité haute) ou `part` (moyenne) ; action et échéance par défaut, surchargées par `_action/_prio/_actiondue` si renseignés. Rien à saisir : corriger une exigence la retire du plan.

### Liens avec Risques / Plans d'action

Dans le prototype les liens sont **éditoriaux** (données cohérentes, pas de jointure) : le risque « Non-conformité DORA » et le plan « Remédiation DORA » apparaissent dans Risques, le Dashboard et Plans d'action ; le projet « Conformité RGPD » figure dans le portefeuille et les Plans d'action ; la « Revue Conformité » est une instance de Réunions. Cible fonctionnelle : une exigence en `ecart` génère une tâche dans Plans d'action et peut être rattachée à un risque.

### Intégration technique

- Fichiers : `modules/conformite.js` (logique + données), markup des vues et modales dans `Refonte Portail Client.html` (ou `Conformite.html`), styles dans `styles/app.css` (classes `refcard-*`, `lib-*`, `cd-*`, `dw-*`, `rv-*`, `rem-*`, `chip-*`).
- Dépendances globales attendues : `showView`, `showToast`, `fmtEur`, `VIEW_META.conformite` (fil d'Ariane), un `.page-content` scrollable, `#breadcrumb`, `#toastWrap`. Le script s'auto-initialise (`renderActiveGrid()` au chargement) ; `showView('conformite')` appelle `confBack()`.
- Préfixes : `cd*` détail, `ass*` tiroir d'évaluation, `rv*` revue, `rem*` remédiation, `conf*` navigation.
- `Conformite.html` reprend le shell (sidebar, topbar, boutons Droits / Partager via `modules/acl.js`) avec un `showView` réduit ; les autres entrées de menu affichent un toast.
