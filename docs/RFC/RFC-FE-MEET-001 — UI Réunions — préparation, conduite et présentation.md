# RFC-FE-MEET-001 — UI Réunions — préparation, conduite et présentation

**Statut :** 📝 Draft — aucun écran livré. Les lots **F1** (liste) et **I** (administration des modèles) sont **débloqués** : leurs routes API existent depuis le lot A de RFC-MEET-001. Les lots **G** (conduite, présentation) et **H** (exports, compte rendu) attendent les lots **B→E** côté API.
**Priorité :** Haute
**Module :** Meetings (frontend) — feature `apps/web/src/features/meetings/`
**Impact :** Navigation, module Projets (onglet « Points projet »), présentation comité CODIR
**Dépendances :**

- [RFC-MEET-001](./RFC-MEET-001%20%E2%80%94%20Module%20R%C3%A9unions%20de%20gouvernance%20(CODIR%2C%20COPIL%2C%20COPRO).md) — core backend (modèle, API, RBAC, sections)
- [docs/FRONTEND_UI-UX.md](../FRONTEND_UI-UX.md) · [docs/design-system/README.md](../design-system/README.md) · [docs/design-system/MODALES.md](../design-system/MODALES.md)
- [RFC-FE-MOB-001](./RFC-FE-MOB-001%20%E2%80%94%20Fondations%20mobile-first%20transverses.md) / [RFC-FE-MOB-002](./RFC-FE-MOB-002%20%E2%80%94%20DataTable%20responsive%20et%20listes%20denses.md) / [RFC-FE-MOB-003](./RFC-FE-MOB-003%20%E2%80%94%20FilterBar%2C%20toolbars%20et%20plan%20de%20migration%20modules.md) — mobile-first
- [RFC-014-1](./RFC-014-1%20%E2%80%94%20UX-UI%20et%20Design%20System%20de%20l%E2%80%99application.md) — Design System

**Hors scope :** rendu serveur des slides, édition collaborative temps réel, thèmes de présentation personnalisés par client (V2), récurrence de série.

---

# 0. Analyse de l'existant

## 0.1 Ce qui est réutilisable tel quel

| Brique | Fichier | Réutilisation |
| --- | --- | --- |
| **Deck & slides comité** | [`committee-presentation/components/slides/`](../../apps/web/src/features/projects/committee-presentation/components/slides/) (7 slides), [`codir-presentation-overlay.tsx`](../../apps/web/src/features/projects/committee-presentation/components/codir-presentation-overlay.tsx) | Base du mode présentation, à généraliser en `meeting-section-slide` |
| **Registre de widgets** | [`widgets/committee-widget-registry.tsx`](../../apps/web/src/features/projects/committee-presentation/widgets/committee-widget-registry.tsx) — 19 widgets | Alimente les sections `PORTFOLIO_SYNTHESIS`, `PROJECT_STATUS`, `DECISIONS`, `ACTIONS` |
| **Export PDF** | [`codir-minimal-pdf.ts`](../../apps/web/src/features/projects/committee-presentation/lib/codir-minimal-pdf.ts) (générateur maison, **aucune dépendance externe**), `codir-pdf-slides.ts`, [`codir-pdf-export.ts`](../../apps/web/src/features/projects/committee-presentation/lib/codir-pdf-export.ts) | À généraliser — **ne pas remplacer par une librairie** |
| **Planning macro** | [`build-macro-planning-gantt.ts`](../../apps/web/src/features/projects/lib/build-macro-planning-gantt.ts), `project-macro-gantt-bar.tsx`, `gantt-timeline-layout.ts` | Section `PLANNING_MACRO`, une barre par phase + marqueurs jalons |
| **Matrice de risques** | [`risk-criticality-matrix.ts`](../../apps/web/src/features/projects/risks/lib/risk-criticality-matrix.ts) (`buildRiskMatrix`, grille P×I 5×5), [`risks-registry-matrix.tsx`](../../apps/web/src/features/projects/risks/components/risks-registry-matrix.tsx) | Section `RISKS` |
| **Signaux d'attention** | [`project-pilotage-attention-panel.tsx`](../../apps/web/src/features/projects/components/project-pilotage-attention-panel.tsx) — libellés, hints et sévérités des codes `NO_OWNER`, `NO_TASKS`, `PLANNING_DRIFT`… | Sections `PORTFOLIO_SYNTHESIS` et `BLOCKERS` (candidats) |
| **Règles de CTA par statut** | [`project-review-status.ts`](../../apps/web/src/features/projects/lib/project-review-status.ts) | Modèle pour `meeting-status.ts` |
| **`pptxgenjs@^4.0.1`** | [`apps/web/package.json:31`](../../apps/web/package.json) — **déjà en dépendance, jamais importé** | Export `.pptx` sans installation supplémentaire |

## 0.2 Ce qu'il ne faut pas reproduire

[`project-review-editor-dialog.tsx`](../../apps/web/src/features/projects/components/project-review-editor-dialog.tsx) fait **142 Ko / ~3 700 lignes** : un composant monolithique orchestrant 7 onglets. C'est le plus gros fichier du frontend et le principal frein à l'évolution des points projet.

**Règle structurante de cette RFC : une section = un composant autonome**, enregistré dans un registre. Aucun composant de la feature ne doit dépasser ~400 lignes.

## 0.3 Modèle de feature à suivre

[`apps/web/src/features/capacity/`](../../apps/web/src/features/capacity/) — arborescence `api/ components/ hooks/ lib/ types/`, fichiers kebab-case, `authFetch` en premier paramètre des fonctions API, query keys **scopées `clientId`** dès la racine.

---

# 1. Objectif

Fournir le cockpit qui permet de **préparer, tenir et restituer** un comité sans passer par PowerPoint :

- une **préparation** où l'on compose le comité (template, projets, sections, convoqués) sans saisir de donnée métier ;
- une **conduite** en séance : appel, puis progression section par section avec saisie des décisions ;
- une **présentation** plein écran alimentée par les données réelles ;
- des **restitutions** : compte rendu e-mail, PDF, PowerPoint.

---

# 2. Hypothèses

1. Le backend expose `GET /api/meetings/:id/deck` comme **source unique** de l'affichage des sections (RFC-MEET-001 §4.8). Le frontend ne recompose jamais une section à partir d'appels dispersés.
2. PDF et PPTX sont générés **côté navigateur**, à partir de la réponse `deck`.
3. Le mode présentation n'est pas disponible sous le breakpoint `md` (§9.5).
4. Les réglages de deck aujourd'hui en `localStorage` (`committee-codir-page-settings`) sont **importables une fois** dans un template client, puis abandonnés.
5. L'écran `/projects/committee/codir` existant **reste en place** pendant toute la trajectoire ; sa dépréciation est un lot ultérieur (§7, lot J).

---

# 3. Fichiers à créer / modifier

## 3.1 Routes — `apps/web/src/app/(protected)/meetings/`

```
page.tsx                            → /meetings                       liste
[meetingId]/page.tsx                → /meetings/:id                   préparation
[meetingId]/conduct/page.tsx        → /meetings/:id/conduct            conduite
[meetingId]/conduct/layout.tsx      → neutralise le scroll du workspace
[meetingId]/present/page.tsx        → /meetings/:id/present            présentation
[meetingId]/present/layout.tsx      → plein écran, hors chrome applicatif
templates/page.tsx                  → /meetings/templates              administration
```

Le layout de conduite reprend le procédé déjà utilisé par [`projects/[projectId]/reviews/[reviewId]/layout.tsx`](../../apps/web/src/app/(protected)/projects/) (neutralisation du scroll de `main.starium-workspace-sheet`).

## 3.2 Feature — `apps/web/src/features/meetings/`

```
api/
  meetings.api.ts · meetings.queries.ts · meetings.mutations.ts
  meeting-templates.api.ts
components/
  meetings-list-page.tsx · meetings-list-filters.tsx · meeting-card.tsx
  meeting-status-badge.tsx · meeting-type-badge.tsx
  meeting-create-dialog.tsx
  meeting-workspace.tsx                    ← préparation (orchestrateur mince)
  meeting-scope-panel.tsx                  ← projets inscrits, ordre, rapporteur
  meeting-sections-panel.tsx               ← réordonnancement, activation
  meeting-attendees-panel.tsx              ← convoqués
  meeting-invite-dialog.tsx
  meeting-conduct-view.tsx                 ← conduite (orchestrateur mince)
  meeting-attendance-roll-call.tsx         ← l'appel
  meeting-quorum-banner.tsx
  meeting-decision-dialog.tsx
  meeting-blocker-dialog.tsx · meeting-blocker-candidates-dialog.tsx
  meeting-present-view.tsx · meeting-present-controls.tsx
  meeting-export-menu.tsx
  meeting-report-preview-dialog.tsx
  sections/
    meeting-section-registry.tsx           ← 16 entrées
    meeting-section-shell.tsx              ← squelette commun (titre, états)
    meeting-section-cover.tsx
    meeting-section-attendance.tsx
    meeting-section-agenda.tsx
    meeting-section-portfolio-synthesis.tsx
    meeting-section-project-status.tsx
    meeting-section-planning-macro.tsx
    meeting-section-alerts.tsx
    meeting-section-risks.tsx
    meeting-section-blockers.tsx
    meeting-section-budget-consumption.tsx
    meeting-section-capacity.tsx
    meeting-section-arbitrations.tsx
    meeting-section-decisions.tsx
    meeting-section-actions.tsx
    meeting-section-next-steps.tsx
    meeting-section-free-text.tsx
  templates/
    meeting-templates-page.tsx · meeting-template-form-dialog.tsx
    meeting-template-sections-editor.tsx · meeting-template-duplicate-dialog.tsx
hooks/
  use-meetings-query.ts · use-meeting-detail-query.ts · use-meeting-deck-query.ts
  use-meeting-mutations.ts · use-meeting-templates.ts
  use-meeting-presentation.ts              ← navigation clavier, plein écran
lib/
  meetings-query-keys.ts · meeting-status.ts · meeting-labels.ts
  meeting-section-catalog.ts · meeting-quorum.ts
  meeting-pdf-export.ts · meeting-pptx-export.ts
types/
  meeting.types.ts · meeting-deck.types.ts
constants/
  meeting-routes.ts
```

## 3.3 Fichiers modifiés hors feature

| Fichier | Modification |
| --- | --- |
| [`apps/web/src/config/navigation.ts`](../../apps/web/src/config/navigation.ts) | Entrée « Réunions » en section **CONTRÔLE**, au-dessus de « Cycles de pilotage » |
| [`apps/web/src/features/projects/types/project.types.ts`](../../apps/web/src/features/projects/types/project.types.ts) l. 888 | Correctif enum `ProjectReviewType` (7 → 12 valeurs) — cf. RFC-MEET-001 §3.3 |
| [`apps/web/src/features/projects/components/project-reviews-context-banner.tsx`](../../apps/web/src/features/projects/components/project-reviews-context-banner.tsx) | Lot J : mention du comité d'origine quand un point projet provient d'une réunion |
| [`docs/INVENTAIRE-COMPOSANTS.md`](../INVENTAIRE-COMPOSANTS.md) | Inscription des nouveaux composants |

---

# 4. Implémentation

## 4.1 Navigation

```ts
{
  label: 'Réunions',
  href: '/meetings',
  icon: CalendarDays,                     // Lucide
  scope: 'client',
  moduleCode: 'meetings',
  requiredPermissions: ['meetings.read'],
  allowedClientRoles: ['CLIENT_ADMIN', 'CLIENT_USER'],
}
```

Placée en tête de la section `CONTRÔLE` (l. 144 de `navigation.ts`), juste avant « Cycles de pilotage » — la réunion est le rituel, le cycle est la cadence.

L'accès à `/meetings/templates` est conditionné à `meetings.templates.manage` via `usePermissions().has(...)` — **masquage uniquement**, l'autorisation reste backend.

## 4.2 Query keys

Modèle [`capacity-query-keys.ts`](../../apps/web/src/features/capacity/lib/capacity-query-keys.ts) — racine scopée `clientId`, tout en dérive :

```ts
export const meetingsQueryKeys = {
  all: (clientId: string) => ['meetings', clientId] as const,
  list: (clientId: string, filters: MeetingListFilters) =>
    [...meetingsQueryKeys.all(clientId), 'list', filters] as const,
  detail: (clientId: string, meetingId: string) =>
    [...meetingsQueryKeys.all(clientId), 'detail', meetingId] as const,
  deck: (clientId: string, meetingId: string) =>
    [...meetingsQueryKeys.all(clientId), 'deck', meetingId] as const,
  attendance: (clientId: string, meetingId: string) =>
    [...meetingsQueryKeys.all(clientId), 'attendance', meetingId] as const,
  blockerCandidates: (clientId: string, meetingId: string) =>
    [...meetingsQueryKeys.all(clientId), 'blocker-candidates', meetingId] as const,
  templates: (clientId: string) =>
    [...meetingsQueryKeys.all(clientId), 'templates'] as const,
};
```

**Aucune clé sans `clientId`** — condition d'isolation côté cache.

## 4.3 Le registre de sections — pièce centrale

```ts
export type MeetingSectionRenderer = {
  sectionType: MeetingSectionType;
  /** Libellé par défaut, surchargeable par titleOverride */
  defaultTitle: string;
  icon: LucideIcon;
  /** Vue « travail » : préparation et conduite */
  Panel: ComponentType<MeetingSectionProps>;
  /** Vue « projection » : une ou plusieurs slides */
  Slide: ComponentType<MeetingSectionProps>;
  /** Nombre de slides produites (pagination du diaporama) */
  slideCount: (payload: unknown) => number;
  /** Contribution à l'export PDF / PPTX */
  toExportSlides: (payload: unknown, ctx: ExportContext) => ExportSlide[];
};

export const MEETING_SECTION_REGISTRY: Record<MeetingSectionType, MeetingSectionRenderer>;
```

Conséquences :

- Ajouter une section = ajouter **une entrée** au registre et **un fichier**. Aucun `switch` disséminé.
- Les trois surfaces — préparation, conduite, présentation — et les deux exports consomment le **même** registre : impossible qu'une section soit projetée sans être exportable.
- `meeting-section-shell.tsx` porte le squelette commun : titre, `EmptyState`, `LoadingState`, `ErrorState`, bloc de notes de séance. Une section concrète n'écrit que son contenu.

## 4.4 Écran `/meetings` — liste

- `PageHeader` (« Réunions », `h1` `text-xl sm:text-2xl`) + CTA « Nouvelle réunion » (`meetings.create`).
- `FilterBar` : type de rituel, statut, période, projet. Chips actives.
- Table `StariumTableWrap` desktop — **6 colonnes** : Réunion · Type · Date · Périmètre (n projets) · Statut · Décisions. Cartes empilées sous `md`.
- Bande KPI `.starium-module` + `KpiCard` : à venir (30 j) · en cours · finalisées ce trimestre · points bloquants ouverts. **Jamais dans une `Card`** — règle « pas de cadre dans cadre ».
- États : `LoadingState` (skeleton de table), `EmptyState` (« Aucune réunion — créez votre premier comité »), `ErrorState`.

## 4.5 Écran `/meetings/:id` — préparation

Orchestrateur mince (`meeting-workspace.tsx`, cible < 300 lignes) composant quatre panneaux dans un `.starium-stack` :

| Panneau | Contenu |
| --- | --- |
| **Cadrage** | Titre, objectif, template (lecture seule après création), date, durée, mode, lieu, animateur, rattachement à une instance de cycle |
| **Périmètre** — `meeting-scope-panel.tsx` | Projets inscrits, réordonnables, rapporteur et temps alloué par projet. Combobox de recherche projet affichant **le nom, jamais l'ID** |
| **Sections** — `meeting-sections-panel.tsx` | Liste réordonnable issue du template ; interrupteur d'activation ; titre surchargeable. Réordonnancement **clavier** obligatoire (§9.2) |
| **Convoqués** — `meeting-attendees-panel.tsx` | Liste, rôle, requis ; bouton « Importer depuis les cercles COPIL / COPROJ » ; **aucun e-mail affiché** |

CTA du pied de page, pilotés par `meeting-status.ts` (modèle `project-review-status.ts`) :

| Statut | CTA principal | Secondaires |
| --- | --- | --- |
| `PREPARING` | **Planifier** (confirmation : rappelle la création des points projet) | Annuler la réunion |
| `SCHEDULED` | **Démarrer le comité** (confirmation) | Renvoyer les invitations · Annuler |
| `IN_PROGRESS` | **Reprendre la conduite** | — |
| `FINALIZED` | **Aperçu du compte rendu** | Envoyer · Exporter PDF · Exporter PowerPoint |

## 4.6 Écran `/meetings/:id/conduct` — conduite

Trois zones :

1. **En-tête collant** — titre, chrono de séance, `meeting-quorum-banner` (`7 présents / 9 requis`, libellé texte en plus de la couleur), CTA « Finaliser ».
2. **Rail de sections** (gauche, desktop) — progression, section courante. Sous `md` : `Select` de navigation (`meeting-conduct-section-select`).
3. **Panneau de section** — `Panel` du registre, en écriture.

**Première section imposée : l'appel.** `meeting-attendance-roll-call.tsx` — une ligne par convoqué : nom, rôle, requis, et un groupe de boutons *Présent · Absent · Excusé*, plus un sélecteur de délégation. Le check-in est optimiste avec rollback en cas d'échec.

Sur les sections `DECISIONS` et `BLOCKERS`, la saisie ouvre une **`StariumModal`**. Pour une décision de portée `MACRO_TASK`, le formulaire affiche un sélecteur **Projet → Phase → (tâche optionnelle)** peuplé par libellé.

## 4.7 Écran `/meetings/:id/present` — présentation

- Plein écran, hors chrome applicatif, `useMeetingPresentation` gère : plein écran natif, navigation `←` / `→` / `Début` / `Fin`, sortie par `Échap`, masquage du curseur après inactivité.
- Les slides proviennent du registre (`Slide` + `slideCount`) : le nombre total est calculé, pas codé en dur.
- Barre de contrôle rétractable : position (`3 / 12`), sommaire des sections, bascule de thème, sortie.
- **Alternative obligatoire** : un bouton « Vue liste » présent en permanence rend l'intégralité du contenu en flux vertical accessible. Le diaporama n'est jamais le seul accès.
- Animations : **fade + translate 4–8px** uniquement, jamais de `scale 0→1`, durées via `--duration-*`, supprimées sous `prefers-reduced-motion`.

## 4.8 Exports

| Export | Implémentation |
| --- | --- |
| **PDF** | `meeting-pdf-export.ts` — généralise `codir-pdf-export.ts` en itérant `toExportSlides` du registre. Le moteur `codir-minimal-pdf.ts` (paysage 297×210 mm, sans dépendance) est conservé et déplacé dans un `lib/` partagé |
| **PPTX** | `meeting-pptx-export.ts` — **premier usage** de `pptxgenjs@4` (déjà en dépendance). Même source `toExportSlides`. Import **dynamique** (`await import('pptxgenjs')`) pour ne pas alourdir le bundle initial |
| **Compte rendu** | `meeting-report-preview-dialog.tsx` → `GET …/report-preview` puis `POST …/send-report`. Disponible **uniquement en `FINALIZED`** |

Les trois exports partagent la même source de vérité (`deck` + registre) : aucune divergence possible entre ce qui est projeté et ce qui est diffusé.

## 4.9 Écran `/meetings/templates`

- Liste des templates : nom, portée, type, système ou client, nombre de sections, masqué ou non.
- Actions : **Dupliquer** (systèmes et clients), **Modifier** / **Supprimer** (clients seulement), **Masquer** (systèmes).
- `meeting-template-sections-editor.tsx` : liste réordonnable, interrupteur d'activation, champ de titre, panneau de configuration par section (ex. *Risques → nombre de risques affichés*), bouton « Ajouter un bloc libre » (`FREE_TEXT`, N occurrences).
- Un template système affiche un bandeau explicite : *« Modèle fourni par Starium — dupliquez-le pour l'adapter. »* Les contrôles d'édition sont désactivés, pas masqués (compréhension > dissimulation).
- La **portée** est en lecture seule après création, avec l'explication affichée — cf. RFC-MEET-001 §8-12.

---

# 5. Modifications Prisma

Aucune. Cette RFC est exclusivement frontend ; le modèle est porté par [RFC-MEET-001](./RFC-MEET-001%20%E2%80%94%20Module%20R%C3%A9unions%20de%20gouvernance%20(CODIR%2C%20COPIL%2C%20COPRO).md) §5.

---

# 6. Tests

Vitest, `*.spec.ts(x)` colocalisés dans la feature, libellés **en français**.

| Fichier | Couvre |
| --- | --- |
| `lib/meeting-status.spec.ts` | Règles de CTA par statut : planifier, démarrer, finaliser, exporter ; compte rendu indisponible hors `FINALIZED` |
| `lib/meeting-section-catalog.spec.ts` | **Les 16 `MeetingSectionType` ont une entrée de registre** (test d'exhaustivité — garde-fou contre l'oubli lors d'un ajout) |
| `lib/meeting-quorum.spec.ts` | Calcul du quorum, délégation non comptée deux fois, absence de règle = pas de blocage |
| `lib/meetings-query-keys.spec.ts` | **Toutes les clés contiennent `clientId`** ; deux clients ne partagent jamais une clé |
| `lib/meeting-pptx-export.spec.ts` | Nombre de slides = somme des `slideCount`, ordre respecté, import dynamique |
| `lib/meeting-pdf-export.spec.ts` | Parité PDF / PPTX sur le même `deck` |
| `components/meeting-attendance-roll-call.spec.tsx` | Rendu, changement de statut, annonce `aria-live`, **aucun e-mail affiché** |
| `components/sections/meeting-section-shell.spec.tsx` | États loading / empty / error ; section `partial` affiche le motif de filtrage |
| `components/meetings-list-page.spec.tsx` | Rendu liste, filtres, `EmptyState` |
| `components/meeting-present-view.spec.tsx` | Navigation clavier, `Échap`, présence du bouton « Vue liste » |

Commandes :

```bash
pnpm --filter @starium-orchestra/web test -- meetings
pnpm --filter @starium-orchestra/web typecheck
pnpm audit:modals
```

---

# 7. Récapitulatif — lots

| Lot | Contenu | État |
| --- | --- | --- |
| **F1** | Fondations : feature, types, query keys, client API, route `/meetings`, entrée de navigation | ❌ à faire |
| **F2** | Écran de préparation : cadrage, périmètre, sections, convoqués, CTA de cycle de vie | ❌ à faire |
| **F3** | Registre de sections + les 16 composants `Panel` | ❌ à faire |
| **G1** | Conduite : rail, appel, quorum, saisie décisions et points bloquants | ❌ à faire |
| **G2** | Présentation : `Slide` du registre, plein écran, clavier, vue liste alternative | ❌ à faire |
| **H1** | Export PDF généralisé | ❌ à faire |
| **H2** | Export PPTX (`pptxgenjs`) + aperçu et envoi du compte rendu | ❌ à faire |
| **I** | Administration des templates + import des réglages `localStorage` du deck CODIR | ❌ à faire |
| **J** | Convergence : bandeau d'origine sur l'onglet « Points projet », deep-links, dépréciation annoncée de `/projects/committee/codir`, manuel utilisateur | ❌ à faire |

---

# 8. Points de vigilance

| # | Sujet | Traitement |
| --- | --- | --- |
| 1 | **Reproduire le monolithe** de l'éditeur de points projet | Registre de sections + plafond de ~400 lignes par composant. `meeting-section-catalog.spec.ts` garantit l'exhaustivité |
| 2 | **Divergence projection / export** | Une seule source : `toExportSlides` du registre alimente écran, PDF et PPTX. Test de parité `meeting-pdf-export.spec.ts` |
| 3 | **Poids du bundle** — `pptxgenjs` est volumineux | Import **dynamique** au clic sur l'export, jamais en statique |
| 4 | **Contraste des thèmes de présentation sombres** | Point de contrôle explicite de la revue `starium-ui-reviewer` ; ne pas se fier au rendu projeté |
| 5 | **Glisser-déposer seul** = blocage RGAA | Contrôles « Monter / Descendre » obligatoires partout où il y a du réordonnancement |
| 6 | **Cohabitation avec `/projects/committee/codir`** | Les deux écrans coexistent jusqu'au lot J. Un bandeau signale le nouveau module sur l'ancien écran, sans coupure |
| 7 | **Perte des réglages `localStorage`** | Import proposé une fois au lot I ; l'ancien écran continue de fonctionner entre-temps |
| 8 | **Volumétrie du deck** | `staleTime` élevé sur `deck`, invalidation ciblée après saisie, squelette par section plutôt qu'un écran de chargement global |
| 9 | **Sections vides** | Une section sans donnée doit expliquer **pourquoi** (« Aucune phase définie sur ce projet ») et proposer l'action corrective — sinon le comité conclura que l'outil ne sait pas et reviendra à PowerPoint |

---

# 9. Conformité by design

## 9.1 RGPD

- **Aucun e-mail affiché** dans l'UI — ni dans la liste des convoqués, ni dans l'appel, ni dans le compte rendu à l'écran. Un participant externe est identifié par son nom d'affichage et son rôle.
- Les **données de présence** sont visibles des seules personnes disposant de `meetings.read` sur le client actif.
- `meetingUrl` n'est jamais rendu dans une slide ni dans un export.
- Aucune donnée de réunion n'est persistée en `localStorage` — seules des préférences d'affichage non nominatives (thème de présentation, section repliée).

## 9.2 RGAA / WCAG 2.1 AA

| Exigence | Traitement |
| --- | --- |
| **Navigation clavier** | Intégrale sur les trois écrans. Présentation : `←` / `→` / `Début` / `Fin` / `Échap`. Réordonnancement des sections et des projets : **contrôles « Monter / Descendre » en plus du glisser-déposer** — le drag seul n'est jamais l'unique moyen |
| **Sémantique** | `<table>` pour l'appel et les tableaux denses, `<nav>` pour le rail de sections, `<h1>` unique par page, hiérarchie de titres continue |
| **Labels** | `<label>` associé à chaque champ ; erreurs via `aria-invalid` + `aria-describedby` |
| **`aria-live`** | `polite` sur : changement de slide (titre + `3 sur 12`), pointage de présence, mise à jour du quorum, ajout d'une décision |
| **Contrastes** | ≥ 4.5:1 partout, **y compris sur les thèmes de présentation sombres** — vérification incluse dans la revue `starium-ui-reviewer` |
| **Jamais la couleur seule** | Santé projet, sévérité de blocage, statut de présence et statut de réunion portent toujours un libellé ou une icône |
| **Mouvement** | `prefers-reduced-motion` supprime les transitions de slide et les animations de panneau |
| **Alternative** | Vue liste complète accessible depuis le mode présentation |
| **Langue** | `lang="fr"`, `focus-visible` sur tous les interactifs |

## 9.3 Design System

- Composants imposés : `PageHeader`, `PageContainer` / `.starium-stack`, `KpiCard`, `Table` / `StariumTableWrap`, `FilterBar` / `FilterBarField`, `EmptyState`, `LoadingState`, `ErrorState`, `IconButton`, `Button size="icon*"`.
- **Toute modale via `StariumModal`** ([`form-dialog-shell.tsx`](../../apps/web/src/components/layout/form-dialog-shell.tsx)) : header icône Lucide or + titre + sous-titre + croix `aria-label="Fermer"`, pied *Annuler* (`outline`) + action primaire. `layout="legacy"` interdit. Import direct de `Dialog*` interdit — `pnpm audit:modals` doit passer.
- **Pas de cadre dans cadre** : la bande KPI utilise `.starium-module` + `KpiCard`, jamais une `Card` englobante.
- **Tokens uniquement** — aucun hex, aucun px arbitraire. Bordures : `border-border`, `border-border/60`, jamais `border` seule. Texte secondaire : `text-muted-foreground` / `.starium-text-muted`.
- Rayons : cards `--radius-lg`, boutons / inputs `--radius-md`, badges `--radius-pill`, modales `--radius-xl`.
- Tableaux : bordures **horizontales uniquement**, **max 8 colonnes**, `tabular-nums` sur les montants et les pourcentages, troncature + tooltip.
- Icônes **Lucide** exclusivement, **aucun emoji**, français, sentence case, vouvoiement.
- **Libellés métier, jamais d'ID** : projets par nom, personnes par nom d'affichage, phases par nom, sections par libellé, templates par nom. Les combobox soumettent l'ID et affichent la valeur.
- Avant tout nouveau composant : vérifier [`docs/INVENTAIRE-COMPOSANTS.md`](../INVENTAIRE-COMPOSANTS.md).

## 9.4 Sécurité

- L'UI **masque ou désactive** en fonction de `usePermissions().has(...)` mais ne remplace jamais l'autorisation backend.
- Accès aux données via `authFetch` uniquement ; aucun appel direct.
- `clientId` présent dans **toutes** les query keys (test dédié) — aucun risque de servir le cache d'un autre client après bascule.
- Aucune logique métier dans l'UI : le quorum affiché est celui calculé par le backend ; `meeting-quorum.ts` ne fait que le formater.
- Une section marquée `partial` affiche explicitement le motif (« 2 projets masqués — accès restreint ») : le filtrage est visible, jamais silencieux.

## 9.5 Interface mobile

| Breakpoint | Comportement |
| --- | --- |
| **≥ 320px** | Toutes les fonctions de préparation et de conduite restent accessibles |
| **< `md`** | Liste en cartes ; workspace en accordéon de sections ; rail de conduite remplacé par un `Select` ; tableaux denses en scroll horizontal **contenu** (la page ne défile jamais horizontalement) |
| **< `md`** | **Mode présentation désactivé**, avec bascule automatique vers la vue liste et message explicite — projeter depuis un téléphone n'a pas de sens, mais consulter le contenu si |

- **L'appel est l'usage mobile prioritaire** : une carte par personne, boutons de statut ≥ 44×44px, quorum en en-tête collant, pas de scroll horizontal.
- Aucune interaction dépendant du survol ; les actions de ligne sont accessibles au tap.
- Modales en pleine hauteur sous `md`, avec pied d'action collant.

---

# 10. Definition of Done

- [ ] `pnpm --filter @starium-orchestra/web typecheck` et `test` passent
- [ ] `pnpm audit:modals` passe
- [ ] Les 16 sections ont une entrée de registre (test d'exhaustivité vert)
- [ ] Toutes les query keys contiennent `clientId` (test vert)
- [ ] Parité écran / PDF / PPTX vérifiée par test
- [ ] RGAA : clavier intégral, `aria-live`, contrastes AA sur thèmes clair **et** sombre, alternative non-diaporama, réordonnancement au clavier
- [ ] Mobile : validé dès 320px ; appel utilisable au téléphone ; aucun scroll horizontal de page
- [ ] Design System : composants et tokens existants, aucune valeur en dur, états loading / empty / error sur chaque section
- [ ] Aucun e-mail ni ID technique visible dans l'UI
- [ ] [`docs/INVENTAIRE-COMPOSANTS.md`](../INVENTAIRE-COMPOSANTS.md) et [`_RFC Liste.md`](./_RFC%20Liste.md) à jour
- [ ] Aucun fichier hors périmètre modifié
