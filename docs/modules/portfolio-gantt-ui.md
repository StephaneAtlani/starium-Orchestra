# Gantt portefeuille — UI : déplacement, en-têtes et barres

Documentation du comportement **scroll**, **barre de dates** et **pan au clic** pour la vue `PortfolioGanttChart` (page Gantt portefeuille, `CardContent`).

**Code source principal :** `apps/web/src/features/projects/components/portfolio-gantt-chart.tsx`  
**Infobulles projet :** `apps/web/src/features/projects/components/portfolio-gantt-project-tooltip.tsx`  
**Layout temps (px, mois) :** `apps/web/src/features/projects/lib/gantt-timeline-layout.ts`  
**Groupement lignes :** `apps/web/src/features/projects/lib/portfolio-gantt-group.ts`

---

## 1. Structure DOM et conteneur de scroll

Le Gantt n’utilise **pas** un seul `sticky top-0` sur tout un `<thead>` dans le même bloc que le corps : le **`position: sticky` combiné scroll horizontal + vertical** est fragile dans les navigateurs.

Structure retenue :

1. **Carte** : hauteur max `max-h-[min(70vh,720px)]`, `overflow-hidden`, bordure.
2. **Conteneur principal** (`containerRef`) : colonne flex, reçoit le **pan** (mousedown) et le **zoom molette** (Ctrl/Cmd).
3. **Bandeau des mois** : **hors** du conteneur qui scrolle verticalement — hauteur fixe 56px, pas de `sticky` CSS pour la ligne temps.
4. **Corps** (`scrollRef`) : **seul** élément avec `overflow-auto` — c’est le **scroll container** pour le déplacement vertical et horizontal du tableau (sidebar + frise).

Largeur utile timeline pour le calcul `px/j` : `clientWidth` du scroll moins la sidebar fixe **`GANTT_SIDEBAR_PX` (280px)** (ResizeObserver sur le conteneur de scroll).

---

## 2. Barre des dates (mois) — « collée » en haut

La ligne **« janv. 2025 … »** reste visible en haut lors du **scroll vertical** parce qu’elle n’est **pas** dans le `div` qui scrolle : elle est **au-dessus** du corps scrollable dans le flex.

- Le **défilement horizontal** de la frise (mois) est **synchronisé en JavaScript** avec le corps :
  - `headerScrollRef` : `div` avec `overflow-hidden` qui contient la bande des mois en largeur `widthPx`.
  - À chaque `scroll` du corps (`scrollRef`), on copie `scrollLeft` vers `headerScrollRef.scrollLeft`.
  - Après changement de **zoom temps** ou de **données** (`layout`), re-sync explicite des `scrollLeft`.

Ainsi la barre des dates reste alignée avec la partie timeline sans dépendre d’un `sticky` sur un `<thead>` dans un scroll 2D.

---

## 3. Colonne « Projet par catégorie » — sticky horizontal

Les cellules **sidebar** (en-tête catégorie, lignes catégorie, lignes projet avec lien) utilisent **`position: sticky; left: 0`** (et `z-10`) pour rester visibles lors du **scroll horizontal** de la frise. Fonds **opaques** (`bg-muted` / `bg-card`) pour masquer le contenu qui passe dessous.

---

## 4. Ligne « aujourd’hui »

Verticale, positionnée en **`left: GANTT_SIDEBAR_PX + layout.todayPx`** dans le corps, hauteur = hauteur utile du corps des lignes, `pointer-events-none`.

---

## 5. Déplacement par clic (pan)

### Comportement

- **Clic gauche maintenu + déplacement** : translation du contenu de la frise en modifiant **`scrollLeft`** et **`scrollTop`** du `scrollRef` (toutes directions).
- **Curseur** : `cursor-grab` au repos, `cursor-grabbing` pendant le drag ; `touch-none` pendant le pan sur le conteneur pour limiter les gestes navigateur.
- **Indication** : attribut `title` sur le conteneur du Gantt (texte du type « Clic maintenu et glisser… »).

### Implémentation

1. `mousedown` sur le conteneur (`containerRef`) : enregistre position souris et scroll initial, active le mode pan (`isPanning`).
2. `mousemove` / `mouseup` sur **`window`** tant que le pan est actif : met à jour le scroll du corps ; `mouseup` termine le pan.

### Éléments qui **ne** déclenchent **pas** le pan

- Liens **`a[href]`** (ex. titre projet dans la sidebar).
- Champs **`input`, `textarea`, `select`, `label`**.
- **`button`** / **`[role="button"]`** **sauf** si `data-slot="tooltip-trigger"` : les déclencheurs d’infobulle sur la frise sont des boutons natifs ; le pan doit rester possible dessus pour ne pas bloquer tout le glisser-déposer sur les barres et pistes.

### Zoom temps (molette)

- **Molette + Ctrl** (Windows/Linux) ou **Cmd** (macOS) sur la zone Gantt : zoom avant/arrière sur l’échelle temps (`onTimeZoomChange`), sans changer le scroll « normal » sans modificateur.

---

## 6. Infobulles (`PortfolioGanttProjectTooltip`)

Les triggers utilisent **`cursor-grab`** (et `active:cursor-grabbing` quand les infobulles sont actives) pour rester cohérents avec le pan. Les **liens** dans la sidebar gardent leur `cursor-pointer` via leurs propres classes.

---

## 7. Modifier le comportement — points d’attention

- Changer les règles du **pan** : `handleTimelineMouseDown` dans `portfolio-gantt-chart.tsx` (garder les exclusions cohérentes avec les vrais boutons vs. `tooltip-trigger`).
- Changer **sticky** ou **z-index** : classes sur les lignes sidebar / pistes dans le même fichier.
- Changer la **sync header / corps** : effets liés à `headerScrollRef` et `scrollRef`.
- Ne pas réintroduire un wrapper `Table` avec `overflow-x-auto` **entre** le scroll principal et le tableau sans vérifier les régressions `sticky` (pattern connu sur la liste projets).

**Tableaux (hors Gantt)** : le grab/pan générique des listes est documenté dans **[FRONTEND_UI-UX.md](../FRONTEND_UI-UX.md) §8** (`Table`, `useTablePan`, `noWrapper` pour sticky). Le Gantt conserve sa propre implémentation (`handleTimelineMouseDown`, exclusions `tooltip-trigger`).

---

## 8. Références rapides

| Sujet | Fichier / symbole |
|--------|-------------------|
| Pan, scroll, sync header | `portfolio-gantt-chart.tsx` — `scrollRef`, `headerScrollRef`, `handleTimelineMouseDown` |
| Constante largeur sidebar | `GANTT_SIDEBAR_PX` |
| Zoom molette | `useEffect` wheel sur `containerRef`, `PORTFOLIO_GANTT_TIME_ZOOM_*` |
| Page qui embarque le composant | `portfolio-gantt-page.tsx` |
