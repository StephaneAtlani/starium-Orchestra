# RFC-PROJ-013-3 — Cohérence Point projet

## Compte rendu, snapshot figé, lecture documentaire et UX de tenue


|                 |                                                                                  |
| --------------- | -------------------------------------------------------------------------------- |
| **Statut**      | 📝 Draft amendé (2026-09-07, 4e passe — dernière) — prêt comité + Lot 0         |
| **Date**        | 2026-09-07                                                                     |
| **Auteur**      | Audit fonctionnel + instruction code                                             |
| **Dépendances** | RFC-PROJ-013, RFC-PROJ-013-1, **RFC-PROJ-013-2** (socle livré)                   |
| **Adjacence**   | RFC-MEET-001 (séances multi-projets — hors périmètre, contrainte d’architecture) |
| **Périmètre**   | Revue unitaire (`ProjectReview` sur **un** projet)                               |


---

## 1. Résumé (décideur)

Le module **Point projet** fonctionne techniquement (création → tenue → finalisation → e-mail), mais **ne tient pas sa promesse métier** : un COPIL doit produire un compte rendu clair (sujets, notes, décisions, actions), une **trace figée** au jour J, et une **lecture documentaire** partageable.

L’audit a mis en évidence des écarts de cohérence (indicateurs contradictoires, type RETEX mal affiché, budget démo incohérent), une **double expérience** page/modale, l’absence d’URL stable pour un point finalisé, et un CR **trop centré sur le contexte projet** au détriment du cœur comité.

Cette RFC propose un **chemin court vers la cohérence** (pas une réécriture) : correctifs visibles d’abord, CR recentré après arbitrage, lecture snapshot-first, URL adressable. Le recentrage de saisie « Infos + Notes + Suites » (**ex-C9**) est **sorti** de ce document et reporté à une RFC dédiée ultérieure (**pas** RFC-PROJ-014, déjà réservée aux catégories portefeuille). Les séances multi-projets (RFC-MEET-001) restent hors scope.

**Amendement 2026-09-07 (2e passe)** — Lots 0–E, C9 sorti, C4a/C4b, C3 avant C2.

**Amendement 2026-09-07 (4e passe — dernière)** — D7 météo (défaut c) ; legacy preview refusé en Lot C ; dump ops nommé au §11 ; RGPD C7a exigence Lot B ; golden + diff de sections dans le message de commit. **Stop itération doc** — Lot 0 ensuite.

---

## 2. État des lieux — architecture réelle

### 2.1 Positionnement


| Objet                        | Rôle                                                                                                                                                                   |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ProjectReview`              | Artefact de pilotage **par projet** (ODJ, participants, décisions, actions, snapshot, CR)                                                                              |
| Routes web                   | Liste : `/projects/[projectId]?tab=points` · Conduite : `/projects/[projectId]/reviews/[reviewId]` · Ouverture hors conduite : `?openReview=` (modale, URL non stable) |
| `Meeting` / `MeetingProject` | Surcouche séances (RFC-MEET-001, draft) — pont optionnel `MeetingProject.projectReviewId`                                                                              |


**Types Prisma** (plus larges que l’audit « 3 types ») : `COPIL`, `COPRO`, `CODIR_REVIEW`, `RISK_REVIEW`, `MILESTONE_REVIEW`, `AD_HOC`, `POST_MORTEM` (RETEX UI), `PROJECT_REVIEW`, `BUDGET_REVIEW`, `ARBITRATION`, `CRISIS_POINT`, `OTHER`.

**Cycle de vie** : `PREPARING` → `SCHEDULED` → `IN_PROGRESS` → `FINALIZED` | `CANCELLED` (+ legacy `DRAFT`/`PLANNED`/`IN_REVIEW`).

### 2.2 Modèle de données (schéma actuel)

```text
ProjectReview
├── objective / executiveSummary (alias)
├── contentPayload Json?          ← météo comité, postMortem RETEX (opaque)
├── snapshotPayload Json?         ← figé à finalize (schemaVersion: 2)
├── participants[]  (attendanceStatus: EXPECTED|PRESENT|ABSENT|EXCUSED)
├── agendaItems[]   (notes, decisionSummary, expectedDecision, itemType, status)
├── decisions[]     (decisionType, status, impact, agendaItemId?)
├── actionItems[]   (responsable, dueDate, decisionId?, agendaItemId?)
└── attachments[]
```

Fichier : `apps/api/prisma/schema.prisma` (~2511–2765).

### 2.3 Fichiers clés


| Couche   | Fichiers                                                                                                                                                                                                                                                                                 |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend  | `apps/api/src/modules/projects/project-reviews/` — `project-reviews.service.ts` (finalize, report), `project-reviews-snapshot.builder.ts`, `project-review-report.builder.ts`, `project-review-email-report.service.ts`, agenda / participants / attachments services + controllers      |
| Frontend | `project-review-editor-dialog.tsx` (~3700 lignes, surface `modal` ou `page`), `project-review-conduct-view.tsx`, `project-reviews-tab.tsx`, `review-*-section.tsx`, `review-conduct-project-context.tsx`, `review-report-preview-dialog.tsx`, presets `project-review-agenda-presets.ts` |
| Routes   | `app/(protected)/projects/[projectId]/page.tsx`, `…/reviews/[reviewId]/page.tsx`                                                                                                                                                                                                         |
| Seed     | `seed-project-demo-reviews.ts`, liens budget `ensureDemoProjectBudgetLinks` dans `seed.ts`                                                                                                                                                                                               |


### 2.4 Flux finalisation / CR (réel)

```text
IN_PROGRESS
  → POST …/finalize
      → buildProjectReviewSnapshotPayload (projet + tâches/risques/jalons/budget live)
      → persist snapshotPayload + status FINALIZED
  → GET …/report-preview | POST …/send-report
      → resolveReportSnapshot : snapshot v2 si FINALIZED, sinon rebuild live
      → enrichSnapshotCommitteeMood (peut encore modifier la météo)
      → buildProjectReviewReportContent (HTML e-mail)
```

**Lecture UI d’un point finalisé** : modale éditeur avec formulaires `disabled` + panneau contexte projet **live** (`useProjectSheetQuery` / détail projet). L’onglet Historique lit **partiellement** le snapshot (pas l’ODJ, pas les KPI projet du snapshot).

### 2.5 Diagramme de navigation actuel

```text
Liste points (?tab=points)
├── IN_PROGRESS  → URL /reviews/:id (page, 7 onglets conduite)
└── autre statut → modale (?openReview=, strip URL) — onglets ≠ page
                   FINALIZED : aperçu/envoi CR + Historique partiel
```

### 2.6 Contrainte multi-projets (ne pas condamner)

RFC-MEET-001 pose déjà : la séance orchestre N projets ; **chaque** trace projet reste un `ProjectReview`. Toute simplification du modèle unitaire doit rester **composable** (un CR de séance = agrégat de N snapshots / N CR unitaires). **Ne pas absorber** `ProjectReview` dans `Meeting` (approche déjà écartée, `_RFC Liste.md`).

---

## 3. Constats vérifiés

Légende verdict : **C** confirmé · **P** partiellement confirmé · **I** infirmé · **H** hypothèse (cause non prouvée à 100 %).


| #      | Constat audit                                                                | Verdict                         | Preuve                                                                                                                                                                                                                                                                                                                                                                                                                           | Cause racine                                                                                                                                               | Gravité                                                      |
| ------ | ---------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **1**  | CR sans décisions / actions / ODJ                                            | **P → précisé**                 | **Preuve 2026-09-07** : `buildProjectReviewReportContent` **affiche** décisions ODJ, décisions standalone, actions et notes dès qu’elles sont dans le snapshot (`project-review-report.builder.ts` ~702–770 ; test jetable V1 passé). Fixture existante `baseSnapshot` contient déjà « Valider la bascule » sous ODJ. Sections **omises** si tableaux vides.                                                                     | Cause racine de l’audit : (a) point **sans** décisions en base, ou (b) cœur comité **sous** le bloc KPI projet (ordre). **Pas** un bug d’absence de rendu. | **Moyen** (ordre + empty states) — plus « bloquant si vide » |
| **2**  | Indicateurs incohérents (62 % vs 37 %, T·R·J vs tâches CR)                   | **C**                           | Header/contexte : `derivedProgressPercent ?? progressPercent` (`project-review-editor-dialog.tsx` ~388–400 ; `review-conduct-project-context.tsx` ~124). Section avancement affiche **les deux** (~2851–2857). Snapshot/CR : `progressPercent ?? derived…` (`snapshot.builder.ts` ~255–256). KPI CR tâches : `open` / `inProgress` / `late` (~547–549) ≠ `T·R·J` = openTasks / openRisks / delayedMilestones (~142–146 context). | **Deux formules d’avancement** (manuel vs moyenne tâches) + **deux agrégats tâches** (counts différents) + panneau **live** vs CR **figé**.                | Bloquant confiance                                           |
| **3**  | Snapshot non figé (statut/avancement/risques « actuels » sur point finalisé) | **P**                           | Snapshot **persisté** à finalize (`project-reviews.service.ts` ~1553–1560). Report lit le snapshot (`resolveReportSnapshot` ~1751–1759). Mais éditeur finalisé affiche le **projet live** (progress, risques). Historique promet « trace immuable » (~52–53, ~85) sans afficher le bloc projet du snapshot. `enrichSnapshotCommitteeMood` (~1691–1738) peut **altérer la météo** du CR après coup.                               | Snapshot existe ; **UX de lecture n’en consomme pas** le contexte projet ; enrichment météo casse l’immutabilité stricte du CR.                            | Bloquant confiance                                           |
| **4**  | RETEX finalisé affiché « Point COPIL »                                       | **C** (UI)                      | Select : `value={reviewType}` + options `getReviewTypeOptionsForEditor` (`editor-dialog.tsx` ~2549–2567 ; `project-review-post-mortem.ts` ~59–67). Si projet **non clos**, options = pilotage **sans** `POST_MORTEM` → `<select>` natif affiche la 1ʳᵉ option (**COPIL**) si value hors liste. Liste utilise le label API → « Retour d'expérience ».                                                                             | Bug rendu HTML select + options filtrées sur **statut projet actuel** (pas sur type stocké).                                                               | Bloquant démo                                                |
| **5**  | Ligne budget Antivirus / RUN / montant « — » sur projet e-commerce           | **C** (données) + **P** (rendu) | Seed : rotation `lines[(i-1) % lines.length]` (`seed.ts` ~2935–2948) — pas de matching métier projet↔ligne. Libellé « Antivirus… » dans lignes RUN (`seed.ts` ~198). Allocation `FULL` sans `amount`/`percentage` → CR affiche « — » (`report.builder.ts` ~425–428).                                                                                                                                                             | **Jeu démo** + rendu montant vide pour FULL. Pas un bug de rattachement runtime isolé.                                                                     | Moyen (crédibilité démo)                                     |
| **6**  | Deux expériences page vs modale                                              | **C**                           | Conduite page si `IN_PROGRESS` (`project-reviews-tab.tsx` ~184–189 ; `conduct-view.tsx` ~77–83). Onglets page ≠ modale (`editor-dialog.tsx` ~1870–1924 vs ~2475–2523). Titres « Clôture projet » / « Point de pilotage » (~3683–3685).                                                                                                                                                                                           | Design volontaire 013-2 non unifié.                                                                                                                        | Architecture                                                 |
| **7**  | Pas d’URL adressable point finalisé                                          | **C**                           | `openReview` puis strip (`project-reviews-tab.tsx` ~242–256). Conduite finalisée → `replace(projectPointsTab)` sans id (`conduct-view.tsx` ~35–37).                                                                                                                                                                                                                                                                              | Deep link limité à la modale éphémère.                                                                                                                     | Architecture / usage n°1                                     |
| **8**  | Lecture seule = champs disabled                                              | **C**                           | `editable = … && isReviewContentEditable` ; finalisé non éditable (`project-review-status.ts` ~27–32). Mêmes textareas disabled.                                                                                                                                                                                                                                                                                                 | Pas de vue document.                                                                                                                                       | Architecture / RGAA                                          |
| **9**  | Vocabulaire éclaté                                                           | **C**                           | « Points projet », « Point de pilotage », « Clôture projet », breadcrumb **Reviews** (`build-workspace-breadcrumb.ts` — segment `reviews` non mappé).                                                                                                                                                                                                                                                                            | Dettes de naming 013 / 013-2.                                                                                                                              | Moyen                                                        |
| **10** | Pas de modèle ODJ par type / pas de reprise non soldés                       | **P**                           | Presets **existent** côté front (`project-review-agenda-presets.ts`, appliqués à la création). **Pas** de carry-over actions/ODJ non soldés (affichage seul, `review-conduct-project-context.tsx` ~433+). Backend ne seed pas l’ODJ.                                                                                                                                                                                             | Audit « aucun modèle » **partiel** (presets UI) ; reprise auto **absente**.                                                                                | Métier                                                       |
| **11** | Actions point précédent dans accordéon replié                                | **C**                           | `defaultOpen={previousActionBuckets.late.length > 0}` (`review-conduct-project-context.tsx` ~433–437).                                                                                                                                                                                                                                                                                                                           | Priorité UX inversée.                                                                                                                                      | Métier                                                       |
| **12** | Participants restent « Attendu »                                             | **C**                           | Défaut `EXPECTED` ; présence éditable seulement en conduite ; **finalize ne gate pas** (`editor-dialog.tsx` ~1533–1539).                                                                                                                                                                                                                                                                                                         | Pas de rituel présence / quorum.                                                                                                                           | Métier                                                       |
| **13** | Pas d’étape de relecture                                                     | **C**                           | Statuts sans `PENDING_VALIDATION` / équivalent (`project.types.ts` ~911–920).                                                                                                                                                                                                                                                                                                                                                    | Finalize = figé + CR.                                                                                                                                      | Métier (arbitrage)                                           |
| **14** | Météo saisie à deux endroits                                                 | **C**                           | Sidebar + Clôture / Vue générale (`editor-dialog.tsx` ~1862–1866, ~2199–2227). Même state.                                                                                                                                                                                                                                                                                                                                       | Duplication UI.                                                                                                                                            | Métier / UX                                                  |
| **15** | Radar RETEX sans référentiel ni série                                        | **C**                           | Scores locaux `contentPayload.postMortem.indicateurs` ; chart local (`post-mortem-indicators-block.tsx`). Non inclus au snapshot typé ni au CR.                                                                                                                                                                                                                                                                                  | MVP local sans historique portefeuille.                                                                                                                    | Métier (V1.1+)                                               |
| **16** | Barre onglets tronquée                                                       | **C**                           | `TabsTrigger` `flex-1` + `whitespace-nowrap` (`components/ui/tabs.tsx` ~73) ; beaucoup d’onglets en modale.                                                                                                                                                                                                                                                                                                                      | Trop d’onglets / layout.                                                                                                                                   | Ergonomie                                                    |
| **17** | Indicateur onglet actif désynchronisé                                        | **P** / **H**                   | Soulignement `::after` + `overflow-x-auto` page (`editor-dialog.tsx` ~2400–2404) — clip / double état possible en transition Radix.                                                                                                                                                                                                                                                                                              | Non reproduit en test auto ; plausible CSS.                                                                                                                | Ergonomie                                                    |
| **18** | Formulaires ajout dépliés par défaut                                         | **C**                           | Décisions/actions : 1 ligne vide si vide (`editor-dialog.tsx` ~1108–1138). Attachments : bloc ajout always-on si editable.                                                                                                                                                                                                                                                                                                       | Empty row = faux contenu.                                                                                                                                  | Ergonomie                                                    |
| **19** | Libellés cryptiques T·R·J / top·surv                                         | **C**                           | Affichage `T·R·J` + tooltip seulement (~404–408). CR : `N top · M surv.` (~553–554).                                                                                                                                                                                                                                                                                                                                             | Abréviations sans légende visible.                                                                                                                         | Ergonomie                                                    |
| **20** | « Annuler le point » ambigu                                                  | **C**                           | Footer : Finaliser + Annuler le point côte à côte (~2108–2131) → `cancel` API, pas dismiss.                                                                                                                                                                                                                                                                                                                                      | Naming + placement.                                                                                                                                        | Ergonomie                                                    |
| **21** | Dates à 02:00                                                                | **P**                           | `toLocalDatetimeInput` offset local (`editor-dialog.tsx` ~316–324). Seed `addDaysUtc` sans normaliser heure (`seed-project-demo-reviews.ts` ~9–12).                                                                                                                                                                                                                                                                              | TZ seed + conversion ; pas forcément bug runtime app.                                                                                                      | Ergonomie / démo                                             |
| **22** | Panneau latéral 6 accordéons repliés                                         | **P**                           | Contexte : plusieurs `defaultOpen=false` ; Indicateurs ouverts ; actions prev souvent fermées. Rail éditeur : plusieurs sections `defaultOpen=true`.                                                                                                                                                                                                                                                                             | Audit partiel selon surface.                                                                                                                               | Ergonomie                                                    |


### 3.1 Note d’architecture (mission)

Aucune contrainte n’invalide la mission. Points à signaler :

1. Le monolithe `project-review-editor-dialog.tsx` (~3700 lignes) est déjà identifié comme anti-pattern dans RFC-FE-MEET-001 — **ne pas l’alourdir** ; extraire plutôt une vue lecture.
2. RFC-MEET-001 (draft) couvre déjà les **séances multi-projets** : cette RFC unitaire doit **préserver** le contrat snapshot/CR par projet.
3. Types Prisma > surface produit « 3 types » affichée en audit — la simplification type (COPIL / Ad hoc / RETEX) est un **choix produit**, pas l’état technique.

---

## 4. Changements proposés

Priorité : **P0** avant démo commerciale · **P1** cohérence métier · **P2** dette UX / V1.1.

Effort : **S** ≤ 2 j · **M** 3–8 j · **L** > 8 j.

### C1 — CR centré comité (réordonnancement + empty states) — **P0** · **S**


|                   |                                                                                                                                                                                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Problème**      | #1 précisé : le rendu des décisions **fonctionne** ; le CR est mal ordonné (contexte projet en tête) et omet les sections vides.                                                                                                                                                           |
| **Solution**      | Réordonner : **En-tête → Participants → Parcours sujets (notes + décisions/actions liées) → Récap actions → Prochain point**. Contexte projet en **annexe** (défaut D2=a). Empty states explicites si aucune décision/action (« Aucune décision enregistrée ») plutôt que section absente. |
| **Modèle**        | Aucun.                                                                                                                                                                                                                                                                                     |
| **API**           | Inchangée.                                                                                                                                                                                                                                                                                 |
| **UI**            | Aperçu aligné.                                                                                                                                                                                                                                                                             |
| **Migration**     | Avec **C7a** (même lot) : persister le HTML/texte à l’envoi. Les CR déjà envoyés ne sont plus régénérés à l’aperçu.                                                                                                                                                                        |
| **Effort**        | **S** (réordonnancement + empty states) — plus M. Preuve V1.                                                                                                                                                                                                                               |
| **Risque**        | Moyen (régression visuelle e-mail) — mitigué par golden HTML normalisé Lot 0.                                                                                                                                                                                                              |
| **Multi-projets** | Favorable.                                                                                                                                                                                                                                                                                 |


### C2 — Lecture documentaire du point finalisé (snapshot-first) — **P0** · **L** (découpage M+M)


|                   |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Problème**      | #3, #8 — formulaires gris ≠ document ; live vs figé.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Solution**      | Si `FINALIZED` ou `CANCELLED` : **vue document** (pas d’inputs disabled). Source = `snapshotPayload` (+ `contentPayload.postMortem` pour RETEX). Bannière « Figé le {finalizedAt} — données au moment du point ».                                                                                                                                                                                                                                                                                    |
| **Modèle**        | Aucun obligatoire. Enrichir affichage Historique → fusionner dans la vue document.                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **API**           | Exposer explicitement `snapshotPayload` (déjà si FINALIZED). Option `GET …/document` = snapshot + métadonnées.                                                                                                                                                                                                                                                                                                                                                                                       |
| **UI**            | Nouveau composant `ProjectReviewDocumentView` ; éditeur réservé aux statuts éditables.                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Migration**     | **Tranché : empty + warning uniquement** (vue document **et** aperçu / envoi CR). Message : « Snapshot indisponible — point antérieur à la version 2 ». **Interdit** : rebuild live présenté comme figé ou comme aperçu. Effectif legacy inconnu (pas d’accès préprod). Aujourd’hui `resolveReportSnapshot` rebuild live si parse échoue — **Lot C doit couper ce chemin** (même lot que C2) : `report-preview` / `send-report` sur FINALIZED sans snapshot v2 → 400 + message honnête, pas de régénération. |
| **Risque**        | Moyen (deux modes UI).                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Multi-projets** | Favorable (document unitaire réutilisable dans le deck séance).                                                                                                                                                                                                                                                                                                                                                                                                                                      |


### C3 — URL adressable — **P0** · **M**


|                   |                                                                                                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Problème**      | #7 — partage CR impossible.                                                                                                                                                                             |
| **Solution**      | Route unique `/projects/[projectId]/points/[reviewId]` (FR) **ou** conserver `/reviews/[reviewId]` et l’ouvrir pour **tous** les statuts (page). Query `openReview` → redirect 301 soft vers cette URL. |
| **Modèle**        | Aucun.                                                                                                                                                                                                  |
| **API**           | Aucun.                                                                                                                                                                                                  |
| **UI**            | `ProjectReviewConductView` généralisée en `ProjectReviewWorkspace` (mode edit ou document selon statut).                                                                                                |
| **Migration**     | Alias d’URL ancienne.                                                                                                                                                                                   |
| **Risque**        | Faible.                                                                                                                                                                                                 |
| **Multi-projets** | Neutre. **Attention** : renommage FR des routes (#9) doit rester compatible liens Meeting.                                                                                                              |


### C4 — Source unique d’indicateurs — scindé en C4a / C4b

C4 n’est plus un item unique : « C4 est fait ? » n’avait pas de réponse binaire.


| Id      | Contenu                                                                                                                                        | Lot   |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| **C4a** | Libellés en clair sur l’UI live : plus de `T·R·J` ni `top · surv.` sans légende. Une règle d’avancement affichée (« déclaré » vs « calculé »). | Lot A |
| **C4b** | Sur point finalisé / document : chiffres **du snapshot** + suffixe « au {finalizedAt} » (vs « aujourd’hui » en conduite).                      | Lot C |


### C4 (détail, commun) — **P0**


|               |                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Problème**  | #2, #19.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Solution**  | (1) **Une** métrique d’avancement affichée : `progressPercent` si renseigné, sinon dérivé — libellé explicite « Avancement déclaré » vs « Avancement calculé (tâches) ». (2) Sur point finalisé : chiffres du **snapshot** + suffixe « au {finalizedAt} ». (3) Sur conduite : chiffres live + « aujourd’hui ». (4) Remplacer `T·R·J` par « Tâches ouvertes · Risques ouverts · Jalons en retard ». (5) CR : mêmes libellés, pas `top · surv.` cryptique. |
| **Modèle**    | Snapshot déjà a `progress.globalProgress` + counts — OK.                                                                                                                                                                                                                                                                                                                                                                                                 |
| **API**       | Optionnel : champ `progressSource` = `MANUAL` ou `DERIVED` sur GET projet.                                                                                                                                                                                                                                                                                                                                                                               |
| **UI**        | Panneau contexte + header + CR.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Migration** | Aucune.                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Risque**    | Faible.                                                                                                                                                                                                                                                                                                                                                                                                                                                  |


### C5 — Bug type RETEX / select — **P0** · **S**


|                  |                                                                                                                                                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Problème**     | #4.                                                                                                                                                                                                             |
| **Solution**     | Options du select = **toujours** inclure `currentReviewType` ; si hors liste pilotage → option disabled « Type figé » ou affichage **texte** (pas select) en lecture. Ne jamais filtrer hors la value courante. |
| **Modèle / API** | Aucun.                                                                                                                                                                                                          |
| **Migration**    | Aucune.                                                                                                                                                                                                         |
| **Risque**       | Faible.                                                                                                                                                                                                         |


### C6 — Seed budget + rendu montant — **P0** · **S**


|              |                                                                                                                                                                                                                                                                       |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Problème** | #5.                                                                                                                                                                                                                                                                   |
| **Solution** | **Rendu CR** (sans reseed) : si `FULL` et montant null, « Enveloppe complète (montant non ventilé) » plutôt que « — ». **Seed** : mapping projet↔ligne cohérent, livré comme **script ciblé**, jamais via un `prisma db seed` complet (voir Lot 0 — protection démo). |
| **Risque**   | Faible (démo).                                                                                                                                                                                                                                                        |


### C7 — Immutabilité CR — scindé C7a / C7b

#### C7a — Persister le payload envoyé — **S** — **Lot B** (avec C1)

| | |
| --- | --- |
| **Problème** | Fenêtre B→C : après C1, « Prévisualiser » sur un point déjà diffusé régénère un HTML différent de celui reçu. |
| **Solution** | À `send-report` : persister `lastSentReportAt` + `lastSentReportHtml` (+ texte). `report-preview` : si déjà envoyé → payload stocké. Champs Prisma additifs. **D6 défaut (a)** : stockage **exigé** dès Lot B. |
| **RGPD (Lot B)** | HTML stocké = DCP. Rétention = durée de vie du `ProjectReview` ; purge avec le client / effacement point. Builder actuel n’injecte que `displayName` participants (pas `externalEmail`) — **garder cette contrainte** ; test Lot B : HTML stocké ne contient pas `@`. |
| **Si D6=b plus tard** | Désactiver l’aperçu des déjà-envoyés (« Aperçu indisponible — CR déjà diffusé »). |

#### C7b — Supprimer l’overlay météo — **S** — **Lot C** (selon **D7**)

| | |
| --- | --- |
| **Problème** | Overlay remplit la météo depuis contentPayload ou un **point précédent** si vide — contournement du soft-warn UI (~2214–2217). |
| **Solution (défaut D7=c)** | Pour FINALIZED : **ne plus appeler** `enrichSnapshotCommitteeMood`. CR / aperçu affichent « Météo non renseignée » si absente du snapshot. **Pas de hard-block finalize** (cohérent avec C11 défaut warning). Coût ≈ retrait de code. **Même commit** : reformuler le soft-warn UI (`project-review-editor-dialog.tsx` ~2214–2217) — aujourd’hui « Aucune météo choisie — définissez-la avant de finaliser » devient faux sous D7=c → **« Météo non renseignée — elle apparaîtra ainsi dans le compte rendu »**. |
| **Si D7=a** | Gate météo obligatoire pour types COPIL / CODIR_REVIEW seulement ; ad hoc facultatif. Message UI adapté (obligation seulement sur les types concernés). |
| **Si D7=b** | Gate météo obligatoire partout (casse le point ad hoc 10 min). Message UI peut rester « avant de finaliser ». |
| **Interdit** | Livrer suppression d’overlay + hard-block partout **sans** D7 — incohérent avec C11=(a). Laisser le libellé « définissez-la avant de finaliser » si D7=c. |


### C8 — Unifier l’expérience — scindé

- **C8-extract** (Lot D-0) : extraire les sections touchées par C10/C12/C11 **avant** de les modifier.
- **C8-unify** (Lot E) : une page, plus de modale principale, onglets réduits.

Ne pas démarrer C8-unify « en parallèle » de la tenue.


|                                |                                                                                                                                                                                                             |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Problème**                   | #6, #16, #17.                                                                                                                                                                                               |
| **Solution**                   | Une page workspace ; onglets **réduits** selon phase : Préparer (général+ODJ+qui+docs) · Tenir (ODJ-first) · Clôturer · Document. Plus de modale pour l’édition principale (modales = quick-add seulement). |
| **Risque**                     | Moyen-élevé (gros diff UI). Dépend C3.                                                                                                                                                                      |
| **Justification vs statu quo** | Coût de maintien du monolithe modal+page > extraction progressive (déjà signalé FE-MEET-001).                                                                                                               |


### C9 — RETIRÉ de cette RFC

Reporté. Pas de squelette rédigé ici (RFC-PROJ-014 est déjà pris). Identifiant réservé **RFC-PROJ-013-4** quand le comité le demandera. Motif : C9 réécrit la saisie dans un monolithe de ~3 700 lignes ; le faire avant l’extraction (Lot D) double le coût. Le CR (C1) peut déjà montrer décisions/actions **telles que saisies aujourd’hui**.

~~Modèle de tenue « Infos + Notes + Suites »~~ — texte d’origine conservé ci-dessous pour trace, **hors plan**.


|                   |                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Problème**      | Bazar ODJ / décisions / actions (audit + retour produit).                                                                                                                                                                                                                                                                                                                               |
| **Solution**      | Saisie principale **depuis le sujet ODJ** : Infos (préparation), Notes (tenue), Suites (Décision ou Action en ligne courte). Onglets Décisions/Actions = **récaps**. Déprécier UI `expectedDecision` + `decisionSummary` (migration soft : `decisionSummary` → Notes si Notes vides, sinon ignorer en CR). Entités Prisma `Decision` / `ActionItem` **conservées** (compat MEET + API). |
| **Modèle**        | Pas de breaking ; champs ODJ deviennent legacy.                                                                                                                                                                                                                                                                                                                                         |
| **Risque**        | Moyen (formation utilisateurs).                                                                                                                                                                                                                                                                                                                                                         |
| **Multi-projets** | Favorable (même structure de sujet).                                                                                                                                                                                                                                                                                                                                                    |


### C10 — Actions du point précédent en tête de conduite — **P1** · **S**


|              |                                                                                                                                                                                                      |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Problème** | #11.                                                                                                                                                                                                 |
| **Solution** | Bloc « Suivi des actions ouvertes » **ouvert par défaut** en haut du workspace conduite (pas accordéon latéral). CTA optionnel « Reprendre dans ce point » (copie action → nouvel `actionItem` lié). |
| **Risque**   | Faible.                                                                                                                                                                                              |


### C11 — Présence avant finalisation — **P1** · **S/M**


|              |                                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| **Problème** | #12.                                                                                                                           |
| **Solution** | Soft-block : warning si tous `EXPECTED` ; ou hard-block configurable. Raccourci « Tous présents ». Quorum = info, pas gate V1. |
| **Risque**   | Faible.                                                                                                                        |


### C12 — Météo : un seul lieu — **P1** · **S**


|              |                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------- |
| **Problème** | #14.                                                                                              |
| **Solution** | Uniquement onglet/section Clôture. Retirer le picker sidebar (garder lecture seule de la valeur). |
| **Risque**   | Faible.                                                                                           |


### C13 — Nomenclature FR — **P1** · **M** (routes = arbitrage)


|              |                                                                                                                                                                                                                        |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Problème** | #9.                                                                                                                                                                                                                    |
| **Solution** | Terme unique UI : **« Point projet »**. Sous-types : Point COPIL, Point ad hoc, Retour d’expérience. Fil d’Ariane : mapper `reviews` → « Points projet ». Renommage route `/points/` = **option** (coût liens + MEET). |
| **Risque**   | Faible si labels seuls ; moyen si routes.                                                                                                                                                                              |


### C14 — Ergonomie rapide — **P1** · **S**


|               |                                                                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Problèmes** | #18, #20, #21.                                                                                                                             |
| **Solution**  | Pas de ligne vide décision/action ; « Annuler la réunion » + confirm ; seed dates à 10:00 Europe/Paris ; bouton dismiss « Fermer » séparé. |
| **Risque**    | Faible.                                                                                                                                    |


### C15 — Statut « À valider » (relecture) — **Lot E** — **à arbitrer (D3)**


|                        |                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Problème**           | #13.                                                                                                               |
| **Solution option A**  | Nouveau statut `PENDING_VALIDATION` entre IN_PROGRESS et FINALIZED.                                                |
| **Solution option B**  | Garder finalize, mais forcer étape UI « Relire le CR » (preview obligatoire) avant finalize — sans nouveau statut. |
| **Plan**               | Entièrement **Lot E** (pas P1). Aligné sur D3.                                                                     |
| **Si D3=a** (défaut)   | Livrer l’option **B** en Lot E (preview obligatoire) — effort S, pas de nouvel enum.                               |
| **Si D3=b**            | Livrer l’option **A** en Lot E — effort M (enum + UI + MEET).                                                      |
| **Multi-projets**      | A alourdit l’agrégat séance ; B plus simple.                                                                       |


### C16 — Radar RETEX séries — **P2** · **L**


|              |                                                                                                                                          |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Problème** | #15.                                                                                                                                     |
| **Solution** | Inclure `postMortem.indicateurs` dans snapshot ; historique projet + comparaison portefeuille (endpoint). CR RETEX : section perception. |
| **Risque**   | Moyen. Hors chemin critique démo COPIL.                                                                                                  |


### C17 — Presets ODJ + reprise non soldés — **P1** · **M**


|              |                                                                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Problème** | #10.                                                                                                                                        |
| **Solution** | Conserver presets front ; à la création : proposer reprise actions `TODO`/`IN_PROGRESS` du dernier FINALIZED + sujets ODJ `TODO`/`SKIPPED`. |
| **Risque**   | Faible.                                                                                                                                     |


---

## 5. Ce que la RFC ne traite pas


| Hors scope                                            | Pourquoi                                                                                                                                   |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **C9 / Infos + Notes + Suites**                       | Sorti. Reporté **RFC-PROJ-013-4** (squelette non rédigé). RFC-PROJ-014 est déjà les catégories portefeuille — ne pas réutiliser ce numéro. |
| Séances multi-projets / module `meetings`             | RFC-MEET-001 / FE-MEET-001 — cette RFC prépare la brique unitaire                                                                          |
| Transcription IA / génération CR automatique          | Non demandé ; risque RGPD                                                                                                                  |
| Refonte complète Prisma (fusion Decision dans Agenda) | Coût > bénéfice ; casse MEET                                                                                                               |
| Upload binaire documents                              | RFC-PROJ-DOC-001                                                                                                                           |
| Admin studio : templates ODJ configurables client     | Possible V1.1 ; presets code suffisent Lot D                                                                                               |
| Référentiel radar RETEX multi-clients                 | C16 / Lot E                                                                                                                                |


---

## 6. Alternatives écartées

### A1 — Réécriture complète du module (nouveau modèle `ProjectPoint`)

- **Motif de rejet** : points finalisés en base + pont `MeetingProject.projectReviewId` + absorption déjà **écartée** (RFC Liste). Coût L×3, risque irréversible.

### A2 — Ne corriger que le builder e-mail (CR) sans toucher l’UI lecture

- **Motif de rejet** : l’audit #3/#8 persiste — l’utilisateur lit la modale, pas l’e-mail. Le CR « juste » sans vue document ne restaure pas la confiance « historisation ».

### A3 — Forcer la saisie décisions/actions dans des onglets séparés renforcés

- **Motif de rejet** : contraire au retour produit. Le recentrage de saisie est reporté (ex-C9 / RFC-PROJ-013-4), pas traité ici.

---

## 7. Plan de livraison

**Hypothèse de chiffrage : 1 personne, séquentiel.** À deux : Lot A (front) et Lot 0 (back) partent en parallèle le même jour ; Lot B (back, après D2) et Lot C front (C3) peuvent se chevaucher. Le gain annoncé « une semaine » suppose **2 personnes dès Lot 0/A**, pas un effet automatique du découpage.

Le plan précédent (Lot A = correctifs + template mail + Prisma) est **annulé**. Il mélangeait des natures d’effort et se déclarait indépendant alors qu’il était bloqué par D2 et D6.

### 7.1 Vérifications code (3e passe)


| #      | Vérification demandée                                                   | Résultat                                                                                                                                                                                                         | Conséquence plan                                                                     |
| ------ | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **V1** | Un point finalisé **avec ≥1 décision** produit-il un CR qui l’affiche ? | **Oui.** Preuve 2026-09-07 : builder affiche décisions ODJ + standalone + actions dès qu’elles sont dans le snapshot (`project-review-report.builder.ts` ~702–770). Sections omises seulement si tableaux vides. | C1 = **S** (réordre + empty states), plus M. Lot B ~1–2 j (+ C7a + C14), plus 3–8 j. |
| **V2** | Combien de FINALIZED sans snapshot v2 ? Traitement C2 ?                 | **Effectif inconnu** (pas d’accès préprod). Code : `parse…` refuse `schemaVersion != 2` → `resolveReportSnapshot` rebuild **live**.                                                                              | C2 : **empty + warning** uniquement. Rebuild « figé » **interdit**.                  |
| **V3** | Pourquoi l’overlay météo ? | Contournement du soft-warn ; repli sur point précédent. | **D7** défaut **(c)** : overlay OFF, CR « non renseignée », pas de hard-block. (a)/(b) = gates. |


*(Ancienne V1 « y a-t-il un golden ? » → Lot 0 / §13, ce n’est pas la preuve produit V1.)*

**Accès base démo** : pas de connexion préprod dans cette session. Dump Lot 0 = tâche ops. Sans dump, C6 = rendu FULL seul.

### 7.2 Lots

```text
Lot 0 — Harnais                         1–2 j    aucun arbitrage
  Golden HTML **normalisé** du CR actuel (dates, ids, URLs → placeholders)
  Procédure dump/restore points + liens budget du client démo
  Sortie : tests verts template ACTUEL ; dump daté

Lot A — Correctifs visibles             2–3 j    aucun arbitrage
  C5 type RETEX
  C6 rendu FULL (sans reseed) + script seed isolé APRÈS dump Lot 0
  C4a libellés en clair

Lot B — CR crédible                     1–2 j    D2 défaut (a) — démarre sans comité
  C1 réordre + empty states (S)
  C7a persister payload à l’envoi + preview = payload stocké si déjà envoyé
  C14 ergonomie rapide
  Dépend de Lot 0 (golden) pour prouver le diff

Lot C — Figé lisible                    M–L      C3 avant C2 ; C7b selon D7
  1. C3 URL adressable
  2. C2 vue document + **couper rebuild live** preview/send legacy (même lot)
  3. C4b chiffres « au {date} »
  4. C7b : fin overlay (+ gate seulement si D7=a ou b) + reformulation message UI météo (même commit)

Lot D — Tenue métier                    M        extraction d’abord
  D-0 extraction (C8-extract) puis C10, C12, C11 (D5), C17, C13 labels (D1=a)

Lot E — V1.1
  RFC-PROJ-013-4 (ex-C9) · C15 (D3) · C16 · C8-unify
```

### 7.3 Dépendances (corrigées)

- **C7a dans Lot B** avec C1. **C7b** = fin overlay en Lot C ; gate météo **uniquement** si D7=a/b.
- **C2 + refus preview/send legacy** dans le **même Lot C** (pas de dette « ensuite »).
- **C3 → C2**. **C8-extract avant** C10/C12/C11. **C4a / C4b**.

### 7.4 Critères de sortie par lot


| Lot   | Sortie (binaire)                                                                               | Critères §9                                                        |
| ----- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **0** | Golden HTML commité + dump daté                                                                | — (non-régression)                                                 |
| **A** | Prospect ne voit plus COPIL sur un RETEX, « — » budget, `T·R·J`                                | RETEX liste+ouverture ; budget FULL lisible ; indicateurs en clair |
| **B** | CR réordonné + empty states ; aperçu d’un CR déjà envoyé = payload stocké (C7a)                | CR e-mail ; Annuler ≠ Fermer                                       |
| **C** | URL stable ; document figé ; legacy = warning document **et** aperçu/envoi ; overlay OFF (D7) | URL ; snapshot « au {date} » ; live ≠ document |
| **D** | Actions précédentes en tête ; météo unique ; labels FR                                         | actions sans accordéon ; météo un seul lieu ; présence selon D5    |
| **E** | Hors chemin démo                                                                               | C15/C16/C8 complet / 013-4                                         |


**Démo commerciale sans comité** : Lot 0 + Lot A.  
**CR crédible** : + Lot B (D2=a par défaut, comité peut basculer annexe↔tête sans coût architectural).  
**Historisation tenue** : + Lot C.

---

## 8. Décisions à arbitrer


| #   | Question                                       | Options                                                       | Lot bloqué           | Défaut si silence                                                                                 |
| --- | ---------------------------------------------- | ------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------- |
| D1  | Renommer les routes `/reviews/` → `/points/` ? | (a) Labels seuls (b) Alias + redirect (c) Breaking rename     | Lot D (C13)          | **(a)** — ne bloque personne                                                                      |
| D2  | Contexte projet dans le mail CR ?              | (a) Annexe (b) Lien app seulement (c) Garder en tête          | Lot B (présentation) | **(a) Annexe** — Lot B démarre. Le comité peut passer à (b)/(c) plus tard (réordre, pas d’archi). |
| D3  | Statut `PENDING_VALIDATION` ?                  | (a) Non — preview obligatoire (b) Oui                         | Lot E (C15)          | **(a)**                                                                                           |
| D4  | Surface types produit                          | (a) Garder enum large (b) UI limitée à COPIL / Ad hoc / RETEX | C5 n’attend pas D4   | **(a)**                                                                                           |
| D5  | Hard-block présence à finalize ?               | (a) Warning (b) Block                                         | Lot D (C11)          | **(a)**                                                                                           |
| D6  | Stocker le HTML exact envoyé ?                 | (a) Oui (b) Non — snapshot suffit                             | C7a (Lot B) | **(a)** — rétention/purge exigées Lot B |
| D7  | Météo obligatoire à la finalisation ?          | (a) Obligatoire COPIL/CODIR, facultative ad hoc (b) Obligatoire partout (c) Facultative ; CR dit « non renseignée » | C7b (Lot C) | **(c)** — overlay OFF, pas de gate ; cohérent C11=(a) |


**Aucun arbitrage ne bloque Lot 0 ni Lot A.** Lot B : D2=a, D6=a. Lot C : D7=c (retrait overlay) ; (a)/(b) n’ajoutent qu’un gate.

---

## 9. Critères d’acceptation

Chaque case porte le lot qui la coche. Un lot n’est « terminé » que si **toutes** ses cases sont vraies.

### Liste des points (`?tab=points`)

- [ ] **A** — Type RETEX affiché « Retour d'expérience » (liste **et** ouverture).
- [ ] **C** — Clic d’un point finalisé → URL stable contenant l’id ; refresh conserve la vue.
- [ ] **C** — Partage du lien ouvre le document figé (après C2 ; après C3 seul, l’UI actuelle est acceptable).

### Conduite (`IN_PROGRESS`)

- [ ] **D** — Actions du point précédent visibles sans ouvrir un accordéon.
- [ ] **A** — Indicateurs : libellés en clair (C4a).
- [ ] **C** — Chiffres finalisés libellés « au {date} » (C4b).
- [ ] **D** — Météo : un seul contrôle de saisie.
- [ ] **B** — Ajout décision/action : liste existante d’abord, pas formulaire vide imposé.
- [ ] **B** — « Annuler la réunion » ≠ Fermer ; confirm explicite.

### Clôture / Finalisation

- [ ] **D** — Warning si tous les participants sont « Attendu » (D5=a ; block si D5=b).
- [ ] **E** — Aperçu CR obligatoire avant finalize (D3=a) ou statut intermédiaire (D3=b).
- [ ] **C** — Après finalize : bascule document ; sans snapshot v2 → warning honnête (pas de rebuild) **y compris** sur aperçu / envoi.
- [ ] **C** — Overlay météo OFF ; si D7=c, finalize **sans** hard-block météo ; CR peut afficher « Météo non renseignée ».
- [ ] **B** — Aperçu d’un CR déjà envoyé = contenu stocké (C7a), pas le template courant.

### Document / Historique (FINALIZED)

- [ ] **C** — Affiche statut projet, avancement, risques **du snapshot**, libellés « au {date} ».
- [ ] **C** — Affiche ODJ avec notes + décisions + actions.
- [ ] **C** — Modifier le projet live ne change pas le document ; CR déjà envoyé inchangé (C7 / D6).

### Compte rendu e-mail

- [ ] **B** — Sections Décisions et Actions toujours présentes (contenu ou empty state).
- [ ] **B** — Ordre conforme à D2 (annexe, lien seul, ou tête — pas d’interprétation).
- [ ] **A** — RETEX : pas de type « COPIL » dans l’éditeur (C5). Le mail RETEX suit C1 en Lot B.
- [ ] **A** — Budget : pas de « — » nu pour FULL. Seed cohérent **seulement** si dump Lot 0 fait.

### Non-régression multi-client / sécurité

- [ ] Finalize / report / document : scope `clientId` + `projectId` inchangé.
- [ ] Pas de DCP (e-mails) dans logs / snapshot URLs.
- [ ] `pnpm audit:ui-ids` ; pas d’ID brut en UI document.

---

## 10. Conformité by design

### RGPD

- DCP : `displayName` participants ; e-mails invitations / `externalEmail` = finalité organisation / envoi — **pas** dans le snapshot ni dans le HTML de CR (builder : `displayName` seulement, `project-review-report.builder.ts` ~445, ~677).
- Snapshot : pas de `meetingUrl` / URLs attachments ; pas d’e-mails en clair dans les logs.
- **C7a (Lot B, D6=a par défaut)** : `lastSentReportHtml` est un stockage de DCP.
  - Rétention : alignée sur le `ProjectReview` (suppression / anonymisation avec le point ou le client).
  - Purge : job ou cascade client — **exigée** dans le même lot que C7a (pas « à définir »).
  - Test d’acceptation Lot B : HTML stocké **sans** motif e-mail (`@`).
- Effacement personne : displayName dans document figé / CR stocké — base à confirmer juridique (intérêt légitime gouvernance).

### RGAA

- Vue document : HTML sémantique (`article`, titres), pas inputs disabled pour le contenu.
- Focus visible ; onglets clavier ; `aria-live` sur finalisation / envoi.
- Contrastes : texte figé ≠ `disabled` muted confondable avec placeholder.

### Design System

- `StariumModal` pour quick-add / confirm uniquement.
- `PageHeader`, `EmptyState`, `LoadingState`, `ErrorState` sur workspace.
- Tokens uniquement ; pas de hex.

### Sécurité

- Authz `projects.read` / `projects.update` inchangée ; isolation client.
- DTO existants ; audit `project.review.finalized` / `send-report` conservés.
- Pas de sur-exposition : document = whitelist snapshot.

### Mobile

- Workspace page responsive dès 320px ; onglets → select déjà présent en conduite ; document stack vertical ; cibles ≥ 44px.

---

## 11. Effort consolidé & priorisation démo

Hypothèse : **1 personne**. Ne pas additionner ces lignes en « moyenne ».


| Priorité | Lots | Effort | Arbitrage / ops |
| --- | --- | --- | --- |
| **Démarrable aujourd’hui** | Lot 0 + Lot A (C5, C6 **rendu**, C4a) | 3–5 j | aucun comité |
| **Lot A seed mapping** | C6 script projet↔ligne | +0,5 j | **Ops** : dump `project_reviews` + `project_budget_links` du client démo — **owner : responsable préprod / DSI produit** ; **avant** le jour J du script C6 (sinon Lot A s’arrête au rendu FULL, antivirus toujours visible) |
| **CR crédible** | + Lot B (C1 S + C7a + C14) | +1–2 j | D2=a, D6=a |
| **Figé lisible** | + Lot C (C3, C2+refus legacy preview, C4b, C7b) | +1–2 sem. | D7=c défaut |
| **Tenue** | + Lot D | +1 sem. | D1=a, D5 |
| **V1.1** | Lot E | hors démo | D3 |


---

## 12. Points de vigilance

1. **Ne pas casser** le pont `MeetingProject.projectReviewId` ni le contrat snapshot v2.
2. Extraction (Lot D-0) **avant** C10/C12/C11.
3. **C7a avec C1 (Lot B)** : aperçu déjà-envoyé = HTML stocké ; rétention/purge RGPD dans le lot.
4. **C7b** : overlay OFF. Gate météo **seulement** si D7=a/b — jamais hard-block implicite (≠ C11 warning).
5. **C2 legacy** : empty + warning sur **document et aperçu/envoi** dans le Lot C — pas de dette « ensuite ».
6. **Dump ops** nommé §11 avant script seed C6.
7. Incertitude #17 : C8-unify (Lot E).

---

## 13. Stratégie de test

### Lot 0 — harnais (première tâche, avant tout builder)

- Étendre `project-review-report.builder.spec.ts`.
- **Golden = HTML entier**, après normalisation des volatiles :
  - dates ISO → `{{DATE}}`
  - ids / UUID → `{{ID}}`
  - URLs app / logos → `{{URL}}` / `{{LOGO}}`
- Cas :
  1. CR avec ODJ + décisions + actions (preuve V1) — golden structure + contenu métier.
  2. CR sans décision ni action — aujourd’hui sections **omises** ; Lot B fait échouer jusqu’à empty state.
  3. `FULL` sans montant — aujourd’hui « — » ; Lot A jusqu’au libellé FULL.
- L’ordre des titres seul est **insuffisant** (risque C1 = régression visuelle e-mail). Le HTML normalisé est la source de vérité.
- Isolation client : tests finalize/report existants non affaiblis.

### Lots suivants


| Lot | Test                                                                                                                   |
| --- | ---------------------------------------------------------------------------------------------------------------------- |
| A   | Spec `getReviewTypeOptionsForEditor` : `POST_MORTEM` toujours listé si value courante.                                 |
| B   | Golden Lot 0 mis à jour **dans le même commit** que C1, **avec le diff de sections listé dans le message de commit**. Spec C7a : preview = payload stocké ; HTML sans `@`. |
| C   | Spec : FINALIZED sans snapshot v2 → preview/send refusés. Overlay non appelé. Gate météo seulement si D7=a/b. Sous D7=c : assertion que le libellé UI ne contient plus « avant de finaliser ». |
| D   | Specs unitaires des sections extraites (présence, météo).                                                              |


## 14. Fichiers prévisionnels (implémentation future — non faite ici)

**Lot 0** : `project-review-report.builder.spec.ts` ; note ops dump (runbook, pas de code obligatoire).

**Lot A** : `project-review-post-mortem.ts`, libellés `review-conduct-project-context.tsx` / éditeur, rendu budget dans `project-review-report.builder.ts`. Script seed isolé, pas `seed.ts` entier.

**Lot B** : `project-review-report.builder.ts` + golden ; Prisma `lastSentReport`* (C7a).

**Lot C** : routes, `ProjectReviewDocumentView`, refus rebuild legacy sur preview/send, fin overlay (C7b), gate météo **ssi** D7=a/b.

**Lot D** : extraire sections de `project-review-editor-dialog.tsx` puis C10–C13.

**Prisma** : C7a (Lot B) ; éventuellement C15 (Lot E).

---

## 15. Récapitulatif

4e passe (dernière doc). **D7** (défaut c). Legacy preview coupé en Lot C. Dump ops §11. RGPD C7a exigence Lot B. Golden + liste de sections dans le commit C1. Note d’arbitrage : `docs/RFC/RFC-PROJ-013-3 — Note arbitrage D1-D7.md`. **Lot 0 ensuite**, pas une 5e passe.