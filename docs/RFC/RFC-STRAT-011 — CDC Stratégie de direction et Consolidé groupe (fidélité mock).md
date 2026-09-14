# RFC-STRAT-011 — CDC Stratégie de direction et Consolidé groupe (fidélité mock)

| | |
| --- | --- |
| **Statut** | ✅ Implémentée (fidélité mock Merge A+B — portefeuille, fiche schéma, consolidé, PDF print) |
| **Date** | 2026-09-14 |
| **Parents** | [RFC-STRAT-005](./RFC-STRAT-005%20%E2%80%94%20Stratégie%20par%20direction%20et%20vision%20stratégique.md) · [RFC-STRAT-006](./RFC-STRAT-006%20%E2%80%94%20Stratégie%20de%20direction%20et%20validation%20CODIR) · [RFC-STRAT-003](./RFC-STRAT-003%20%E2%80%94%20Strategic%20Vision%20Frontend%20UI.md) / [RFC-STRAT-009](./RFC-STRAT-009%20%E2%80%94%20Vision%20stratégique%20V1%20%E2%80%94%20Frontend%20cockpit%20et%20UX.md) |
| **Source design** | *Refonte Portail Client* — `#view-vision` (onglets **Directions** + **Consolidé groupe**) + `#view-dirstrat` (schéma directeur) |
| **Code mock** | [`ui_kits/app/modules/strategie.js`](./_sources/Design%20system%20et%20CDC/ui_kits/app/modules/strategie.js) · [`strategie-consol.js`](./_sources/Design%20system%20et%20CDC/ui_kits/app/modules/strategie-consol.js) · [`styles/strategie.css`](./_sources/Design%20system%20et%20CDC/ui_kits/app/styles/strategie.css) |
| **Règle UX** | Fidélité classes `.stg-*` via `features/strategic-direction-strategy/styles/strategie.css` + tokens DS ; `StariumModal` uniquement ; **jamais d’ID brut** ; graphiques / scores **100 % API** (pas de séries décoratives). |

---

## 1. Analyse de l’existant

### 1.1 Ce que le mock livre (sept. 2026)

Sous **Vision stratégique**, le mock expose **trois sous-onglets** :

| Onglet mock | Contenu |
| --- | --- |
| **Vision groupe** | Hors périmètre de cette RFC (déjà couvert STRAT-003/009) |
| **Directions** | Grille de cartes `.stg-card` (sigle teinté, anneau score, périmètre, horizon / chantiers / ETP / budget, badge statut·version, revue) + carte dashed « Ajouter une direction » |
| **Consolidé groupe** | KPI ×4 · matrice directions×axes · heatmap maturité (6 dims) · timeline groupe · portefeuille chantiers · recouvrements tokenisés · CTA Comparer |

Clic carte → vue dédiée **`#view-dirstrat`** (« *SIGLE — Schéma directeur* ») :

- Hero (sigle, ambition HTML, meta directeur / rattachement / ETP / budget / revue, anneau alignement)
- KPI direction (4 cellules libres)
- Sous-onglets : **Axes stratégiques** (timeline Gantt chantiers + axes propres + blocs texte/image) · **Objectifs** (OKR + budget horizon) · **Alignement** (contribution axes groupe + maturité) · **Alertes** (règles calculées + risques) · **Historique** (revues / versions)
- Actions : Export PDF 1 page · Nouvelle revue · Modifier la direction
- Modales : direction · chantier · bloc · OKR · revue · comparateur 2 directions

### 1.2 Ce que le produit a déjà (STRAT-005 / 006)

| Couche | État | Écart mock |
| --- | --- | --- |
| Référentiel `StrategicDirection` | CRUD code/name/description, onglet **Directions** sous `/strategic-vision` | Pas de sigle teinté, ETP, budget fonctionnement, tone, parent, sponsor structurés |
| `StrategicDirectionStrategy` | Fiche texte + JSON (`strategicPriorities`, `expectedOutcomes`, `kpis`, `majorInitiatives`, `risks`) + workflow CODIR + liens axes/objectifs + versions/compare | UI **formulaire admin**, pas portefeuille cartes ni schéma directeur timeline |
| Route `/strategic-direction-strategy` | Liste + édition monolithe (`strategic-direction-strategy-page.tsx` ~2k lignes) | Pas de grille `.stg-*`, pas d’onglet Consolidé, pas de Gantt chantiers |
| Score / maturité / alertes schéma | Absents | Mock calcule `stgScore` / `stgMaturity` / `stgAlerts` côté client (interdit en prod : vérité backend) |
| Consolidé groupe | Absent | À créer |
| PDF 1 page | Absent | Print CSS mock (`#stg-print`) |
| Recouvrements | Absent | Heuristique tokens mock — à cadrer (signal soft) |

### 1.3 Navigation produit vs mock

| Mock | Produit actuel | Cible STRAT-011 |
| --- | --- | --- |
| Vision › Directions | `/strategic-vision?tab=directions` (référentiel) **et** `/strategic-direction-strategy` (stratégies) | **Séparer** : référentiel reste Vision ; **portefeuille schéma** = `/strategic-direction-strategy` (accueil cartes) |
| Vision › Consolidé groupe | — | `/strategic-direction-strategy?view=consolide` (ou `tab=consolide`) |
| `#view-dirstrat` | édition inline / sélection id | `/strategic-direction-strategy/[id]` (fiche schéma) |

Sidebar inchangée : **Vision stratégique › Stratégie** → portefeuille ; Vision Entreprise inchangée.

### 1.4 Mapping métier mock → modèles Orchestra

| Concept mock | Mapping produit | Notes |
| --- | --- | --- |
| Direction (carte) | `StrategicDirection` + stratégie courante non archivée | 1 carte = direction **ayant** une stratégie active pour la vision de référence, ou carte « à créer » |
| Sigle / tone | `StrategicDirection.code` + nouveau `accentTone` (enum token DS) | Libellé affiché = `code` (jamais cuid) |
| Directeur·rice / parent / FTE / budget fonct. | Champs optionnels sur `StrategicDirection` **ou** snapshot sur stratégie | Minimisation RGPD : sponsor = `HumanResource` / User lié, pas free-text email |
| Ambition / horizon / version / statut | `StrategicDirectionStrategy` (`ambition`, `horizonLabel`, `status`, versioning existant) | Statuts mock `brouillon/revue/valide` ↔ `DRAFT` / `SUBMITTED` / `APPROVED` (+ `REJECTED` / `ARCHIVED`) |
| Axes propres (lanes) | Sous-ensemble JSON **ou** axes direction locaux | Distincts des `StrategicAxis` groupe ; lanes = index pour Gantt |
| Chantiers | Enrichissement `majorInitiatives` **structuré** (V1) → entité `StrategicDirectionWorkstream` (V2) | Fenêtre `startMonthOffset`/`endMonthOffset`, `progressPct`, jalons, budget, liens optionnels `projectIds` |
| OKR | `expectedOutcomes` structuré | title, ownerLabel, target, current, progressPct |
| Alignement axes groupe | Liens `axisLinks` + score contribution **déclaré** (nouveau champ ou map JSON) | Confronté aux chantiers rattachés (calcul BE) |
| Risques | `risks` JSON typé | name, probability, impact, ownerLabel, level |
| Blocs texte/image | Nouveau JSON `contentBlocks` ou documents module Documents | Image = Document client-scopé (pas base64 localStorage) |
| Revues | Versioning + audit déjà là ; UI timeline mock | Réutiliser `GET …/versions` ; « Nouvelle revue » = soumission / adaptation version |
| Score / maturité / alertes | Endpoints calcul BE | Aucune formule en React |

---

## 2. Hypothèses figées

| # | Décision |
| --- | --- |
| H1 | On **évolue** `strategic-direction-strategy` + enrichit `StrategicDirection` — **pas** de second module « schéma directeur » autonome. |
| H2 | Le mock « Schéma directeur » = **présentation CODIR** de la stratégie de direction (STRAT-006), pas un nouveau workflow parallèle. |
| H3 | Calculs score / maturité / alertes / matrice / recouvrements = **backend** uniquement ; UI = rendu + empty/skeleton. |
| H4 | Horizon Gantt V1 = années de `horizonLabel` parsées **ou** `horizonStartYear` + `horizonYearCount` (défaut 3) sur la stratégie ; offsets mois 0…N×12−1. |
| H5 | Chantiers V1 = JSON validé dans `majorInitiatives` (schéma Zod/DTO strict) ; migration table V2 si volumétrie / liens projets lourds. |
| H6 | Images des blocs = `Document` / upload existant (pas data-URL en DB). |
| H7 | Recouvrements = **signal soft** (tokens normalisés, top N) — pas d’écriture automatique en ODJ réunion (CTA toast / stub lien MEET si présent). |
| H8 | Export PDF V1 = **print CSS** 1 page (comme mock) ; génération serveur PDF = hors lot. |
| H9 | Graphiques / anneaux / heatmaps : uniquement données API ≥ seuils réels ; sinon empty (règle charts-dynamic-only). |
| H10 | Permissions inchangées : `strategic_direction_strategy.read|create|update|review` ; lecture consolidé = `read` ; CRUD chantiers/blocs = `update`. |
| H11 | Fidélité visuelle : porter `strategie.css` → `apps/web/src/features/strategic-direction-strategy/styles/strategie.css` en remplaçant hex/px hors tokens par variables DS quand divergence. |

---

## 3. Liste des fichiers à créer / modifier

### Sources (référence — déjà dans le repo)

| Fichier | Rôle |
| --- | --- |
| `docs/RFC/_sources/Design system et CDC/ui_kits/app/modules/strategie.js` | Grille, fiche schéma, alertes, modales |
| `…/strategie-consol.js` | Consolidé, compare, PDF |
| `…/styles/strategie.css` | Classes `.stg-*` |
| `…/Refonte Portail Client.html` | Markup `#view-vision` / `#view-dirstrat` |

### Doc / index

| Fichier | Action |
| --- | --- |
| `docs/RFC/RFC-STRAT-011 — ….md` | **Créé** (ce document) |
| `docs/RFC/_RFC Liste.md` | Indexer STRAT-011 |
| `docs/RFC/RFC-STRAT-006 — ….md` | Pointer UX cible → STRAT-011 |
| `docs/API.md` | Endpoints consolide / score / workstreams (à la livraison) |
| `docs/LIAISONS-MODULES.md` | Pont soft chantiers ↔ `Project` (si liens) |

### Backend (implémentation)

| Fichier | Action |
| --- | --- |
| `apps/api/prisma/schema.prisma` | Champs direction (tone, FTE, budget, parentLabel, sponsor…) ; champs stratégie (horizon years, contentBlocks, contribution map) ; éventuellement `StrategicDirectionWorkstream` V2 |
| `apps/api/src/modules/strategic-direction-strategy/**` | DTOs structurés initiatives/OKR/risks ; `GET …/portfolio` ; `GET …/consolidation` ; `GET …/:id/schema-metrics` (score, maturité, alertes) |
| `apps/api/src/modules/strategic-vision/**` | Enrichir `StrategicDirection` DTO si champs identité |

### Frontend (implémentation)

| Fichier | Action |
| --- | --- |
| `apps/web/src/features/strategic-direction-strategy/styles/strategie.css` | Port `.stg-*` |
| `…/components/strategic-direction-strategy-portfolio.tsx` | Grille cartes (accueil) |
| `…/components/strategic-direction-schema-page.tsx` | Fiche `#view-dirstrat` |
| `…/components/strategic-direction-consolidation-page.tsx` | Onglet consolidé |
| `…/components/*-timeline.tsx`, `*-compare-dialog.tsx`, `*-print.tsx` | Gantt, comparateur, print |
| Routes App Router | `page.tsx` portefeuille ; `[id]/page.tsx` fiche ; query `view=consolide` |
| Découper / réduire le monolithe `strategic-direction-strategy-page.tsx` | Form édition → drawer / `StariumModal` depuis la fiche |

---

## 4. Spécification fonctionnelle

### 4.1 Écrans (DoD visuelle)

#### S1 — Portefeuille Directions (`/strategic-direction-strategy`)

Zones (mock `stgRenderDirs`) :

1. `PageHeader` « Stratégie » + CTA **Ajouter une direction** / **Nouvelle stratégie** (selon droits)
2. Barre recherche `.stg-search` (filtre name/code/sponsor — libellés)
3. Grille `.stg-grid` de `.stg-card` :
   - sigle teinté · nom · sous-ligne sponsor · parent
   - anneau score alignement (API)
   - scope (description / context)
   - cellules Horizon · Chantiers (n + livrés) · Effectif · Budget
   - pied badge statut·versionLabel · « Revue {date} »
4. Carte dashed `.stg-add` → création
5. États : loading skeletons · empty « Aucune direction stratégique » · error `ErrorState`

Clic carte → S2.

#### S2 — Schéma directeur (`/strategic-direction-strategy/[id]`)

1. Breadcrumb / retour « Toutes les directions »
2. Hero `.stg-hero` + anneau alignement
3. Bande KPI (données stratégie `kpis` — empty si vide)
4. Sous-onglets URL `?tab=axes|objectifs|alignement|alertes|historique` (défaut `axes`)
5. Contenu par onglet = mock §1.1
6. Actions header : Export PDF · Revue / workflow existant · Modifier (modale identité + édition stratégie)

#### S3 — Consolidé groupe (`?view=consolide`)

1. KPI ×4 (directions, chantiers, budget horizon, alignement moyen + n recouvrements)
2. Matrice directions × axes vision (heat + n chantiers)
3. Heatmap maturité 6 dimensions
4. Timeline groupe (liane par direction)
5. Table portefeuille chantiers (libellés direction/axes — pas d’IDs)
6. Cartes recouvrements + CTA soft
7. CTA Comparer → `StariumModal` (réutilise logique compare existante + présentation mock côte-à-côte)

### 4.2 Contrats API proposés (additifs)

Préfixe existant `/api/strategic-direction-strategies` + `/api/strategic-directions`.

| Méthode | Route | Permission | Rôle |
| --- | --- | --- | --- |
| `GET` | `/api/strategic-direction-strategies/portfolio` | `read` | Liste cartes : direction + stratégie courante + `alignmentScore` + compteurs chantiers |
| `GET` | `/api/strategic-direction-strategies/consolidation` | `read` | Payload S3 (matrices, timeline, dups, KPI) — visionId query optionnelle |
| `GET` | `/api/strategic-direction-strategies/:id/schema-metrics` | `read` | `{ score, maturity, alerts[] }` |
| `PATCH` | `/api/strategic-directions/:id` | `strategic_vision.update` **ou** `manage_directions` | Identité mock (tone, fte, …) |
| `PATCH` | `/api/strategic-direction-strategies/:id` | `update` | Étendre DTO : initiatives structurées, OKR, risks typés, contentBlocks, budgetsByYear, contributionByAxisId |

**Règles** : `clientId` depuis scope ; filtres `where: { clientId }` ; pas de fuite inter-client sur consolidation ; audit sur écritures sensibles (identité direction, remplacement initiatives, revue).

### 4.3 Formules backend (reprendre le mock, documentées)

**Score d’alignement** (par direction, moyenne sur axes de la vision liée) :

```text
pour chaque axe A :
  cov = min(100, n_chantiers_liés(A) * 34)
  prog = moyenne(progressPct des chantiers liés) ou 0
  contrib = contributionDéclarée[A] ∈ [0,100]
  score_A = 0.5 * contrib + 0.3 * cov + 0.2 * prog
score = round(moyenne(score_A))
```

**Maturité** (6 dims 0–100) — calquée sur `stgMaturity` :

| Dim | Principe |
| --- | --- |
| Ambition | longueur texte ambition (cap 100) |
| Objectifs | 0.5×couverture OKR + 0.5×moyenne progress |
| Chantiers | 0.5×couverture + 0.5×moyenne progress |
| Budget | couverture budget horizon vs somme budgets chantiers |
| Risques | min(100, n_risques × 30) |
| Revue | fraîcheur dernière revue (cible semestrielle, décroissance après 90 j) |

**Alertes** — port des règles `stgAlerts` (axe non couvert, contribution faible, chantier en retard / non démarré / non aligné, budget non couvert, revue périmée, aucun OKR, aucun risque). Niveaux `danger|warning|info` ; libellés FR métier.

**Recouvrements** — tokens (≥4 car., stopwords FR mock) partagés entre chantiers de **directions différentes** ; sévérité par chevauchement de fenêtres ; top 6.

### 4.4 Modales (`StariumModal`)

| Modale | Champs (libellés métier) | Statut |
| --- | --- | --- |
| Direction | Sigle*, Nom*, Sponsor (HR combobox), Rattachement, Périmètre, ETP, Budget k€, Tone | **Livré** |
| Chantier | Nom*, Pilote, Budget, Avancement, Axe propre (lane), Fenêtre début/fin, Axes groupe (chips), Jalons | **Livré** |
| Bloc | Titre*, Contenu / légende ; image via upload Document (silo stratégie) | **Livré** |
| OKR | Objectif*, Responsable, Indicateur cible, Actuel, Avancement | **Livré** |
| Revue | Instance + Note + workflow submit/review | **Livré** (hybride CODIR) |
| Comparer | 2 selects directions (labels) + corps `.stg-cmp` complet | **Livré** |

## 5. Modifications Prisma

### 5.1 `StrategicDirection` (additif)

```prisma
accentTone   String?  // 'info'|'gold'|'purple'|'teal'|'success'|'danger' — tokens UI
parentLabel  String?
sponsorHumanResourceId String?  // préféré au free-text
fteCount     Int?
operatingBudgetCents BigInt?
```

(Sponsor free-text legacy `ownerLabel` sur stratégie conservé en lecture jusqu’à migration données.)

### 5.2 `StrategicDirectionStrategy` (additif)

```prisma
horizonStartYear Int?
horizonYearCount Int?   @default(3)
budgetsByYear    Json?  // { "2026": 4200000, ... } montants en cents
axisContributions Json? // { "<strategicAxisId>": 0..100 }
contentBlocks    Json?  // [{ kind: 'text'|'image', title, body, documentId? }]
```

`majorInitiatives` / `expectedOutcomes` / `risks` / `kpis` : **contrats JSON documentés** (validation class-validator / Zod) alignés mock — pas de migration destructive.

### 5.3 V2 optionnelle — `StrategicDirectionWorkstream`

Table dédiée si les chantiers dépassent le JSON (liens N projets, index, audit granulaire). Hors P0–P2 si JSON suffit.

---

## 6. Plan d’implémentation (lots)

| Lot | Contenu | Critère de sortie |
| --- | --- | --- |
| **P0** | Port CSS `.stg-*` + portfolio cartes S1 + route fiche stub + DTOs identité direction | Parité visuelle grille vs mock (données API réelles) |
| **P1** | Fiche S2 hero + onglets Axes (timeline) / Objectifs / Alignement ; CRUD chantiers/OKR/blocs ; `schema-metrics` | Timeline + scores BE |
| **P2** | Onglets Alertes + Historique ; brancher versions/workflow ; print PDF | Alertes listées = API |
| **P3** | Consolidation S3 + compare modal + recouvrements | Matrice + heatmap + empty states |
| **P4** | Découpe monolithe page actuelle ; tests ; `API.md` ; handoff captures `screenshots/stg/` | `pnpm audit:ui-ids` · `audit:modals` verts |

Ordre non négociable : **P0 → P1** avant Consolidé (P3 consomme les chantiers structurés).

---

## 7. Tests

### Backend

- Isolation client sur `portfolio` / `consolidation` / `schema-metrics`
- Formules score/maturité : fixtures DSI/DAF du seed mock
- Validation DTO initiatives (fenêtre e>s, pct 0–100, axisIds du client)
- Refus contribution axe hors `alignedVisionId`

### Frontend

- Labels : code direction, noms axes, jamais cuid (`audit:ui-ids`)
- Modales via `StariumModal` (`audit:modals`)
- Empty/loading/error sur S1–S3
- Query keys `clientId` + `visionId` + `strategyId`
- Anneau / heatmap absents si métriques insuffisantes

---

## 8. Récapitulatif

Cette RFC **spécifie** l’adaptation UI/CDC du mock **Directions + Schéma directeur + Consolidé groupe** sur le socle STRAT-005/006, sans recréer un module parallèle. Livrable documentaire : ce fichier + index. **Code non modifié** à ce stade.

---

## 9. Points de vigilance

1. **Confusion Vision vs Stratégie** : ne pas fusionner l’onglet référentiel Directions (Vision) avec le portefeuille schéma (Stratégie) — deux intentions.
2. **Schéma directeur** nommé dans STRAT-006 « hors scope » : ici on **réalise la couche présentation** ; pas de second workflow d’approbation.
3. **JSON vs table chantiers** : surveiller taille payload et besoin de jointures projets avant P4.
4. **Sponsor / FTE** : DCP → HR lié + rétention alignée annuaire ; pas de logging des noms en clair hors audit déjà prévu.
5. **Recouvrements** : faux positifs tokens — UI doit dire « signal », pas « doublon avéré ».
6. **Charts-dynamic-only** : interdiction de hardcoder les % du seed mock en prod.
7. **Monolithe FE** : refactor de `strategic-direction-strategy-page.tsx` obligatoire en P4 pour maintenabilité.

---

## 10. Conformité by design

### RGPD

- DCP : sponsor (HR/User), pilotes chantiers, auteurs de revue — finalité = gouvernance stratégique client.
- Minimisation : pas d’email en clair dans cartes ; pas de base64 image en DB.
- Effacement : cascade client ; anonymisation labels si User/HR soft-deleted → `displayLabel(…, 'Collaborateur retiré')`.
- Logs : pas de DCP en clair ; audit ids + libellés tronqués.
- Scope : tout filtrable `clientId`.

### RGAA

- Cartes cliquables = `button` / lien réel ; focus-visible ; Tab order hero → onglets → timeline.
- Labels sur tous champs modales ; `aria-invalid` + `aria-describedby`.
- Anneau score : texte % visible (pas couleur seule) ; heatmaps = valeur numérique + fond.
- `aria-live` toasts / alertes chargées ; `prefers-reduced-motion` (pas de translate hover si reduced).

### Design System

- Tokens uniquement ; classes `.stg-*` alignées `tokens.css`.
- `PageHeader`, `KpiCard` / `.stg-kpi`, `LoadingState` / `EmptyState` / `ErrorState`, `StariumModal`.
- Libellés métier partout.

### Sécurité

- Guards existants ; DTO class-validator ; consolidation ne traverse pas les clients.
- Audit : création/MAJ direction identité, remplacement initiatives, revue, archive.
- Pas de sur-exposition : whitelist champs portfolio/consolidation.

### Interface mobile

- Grille `minmax` fluide dès 320px ; cartes empilées.
- Timeline : scroll horizontal contrôlé + libellés au-dessus des barres.
- Matrice consolidée : scroll + sticky colonne direction ; cibles ≥ 44px.
- Comparateur : stack 1 colonne sous `md`.

---

## 11. Critères d’acceptation (global)

- [ ] S1 grille visuelle alignée mock (tokens) alimentée par `GET …/portfolio`
- [ ] S2 fiche schéma avec 5 onglets et timeline chantiers API
- [ ] Scores / maturité / alertes = `schema-metrics` (tests formules)
- [ ] S3 consolidation complète ou empty explicite
- [ ] Workflow CODIR STRAT-006 préservé
- [ ] `pnpm audit:ui-ids` et `pnpm audit:modals` verts
- [ ] Aucune série graphique hardcodée

---

## 12. Hors périmètre

- IA de rédaction / recommandation d’axes
- Génération PDF serveur / PPTX
- Inscription automatique en ODJ réunion (MEET) — CTA soft seulement
- Modification automatique des projets depuis un chantier
- Fusion de l’onglet Vision groupe dans cette RFC
