# RFC-MEET-001 — Module Réunions de gouvernance (CODIR, COPIL, COPRO)

**Statut :** 📝 Draft
**Priorité :** Haute
**Module :** Meetings (Core) — code Nest/Next `meetings`
**Impact :** Projets, Points projet (`ProjectReview`), Cycles de pilotage, Risques, Planning, Budgets, Capacité, Alertes
**Dépendances :**

- [RFC-PROJ-013-2](./RFC-PROJ-013-2%20%E2%80%94%20Point%20projet%20de%20pilotage%20(COPIL%2C%20COPROJ%2C%20revues%2C%20arbitrages).md) — socle `ProjectReview` (cycle de vie, ODJ, décisions, actions, snapshot v2)
- [RFC-PROJ-CYCLE-003](./RFC-PROJ-CYCLE-003%20%E2%80%94%20Governance%20Cycle%20Instances%20and%20Configurable%20Propagation.md) — instances de cycle et propagation configurable
- [RFC-PROJ-011](./RFC-PROJ-011%20%E2%80%94%20T%C3%A2ches%20%20activit%C3%A9s%20jalons%20et%20base%20Gantt.md) — phases, tâches, jalons
- [RFC-PROJ-018](./RFC-PROJ-018%20%E2%80%94%20ProjectRisk%20EBIOS%20RM%20minimal.md) — registre des risques
- [RFC-PROJ-010](./RFC-PROJ-010%20%E2%80%94%20Project%20%E2%86%94%20Budget%20Integration.md) — liens projet ↔ budget
- [RFC-CAPA-001](./RFC-CAPA-001%20%E2%80%94%20Gestion%20de%20la%20capacit%C3%A9%20des%20%C3%A9quipes%20et%20des%20collaborateurs) — capacité
- [RFC-038](./RFC-038%20%E2%80%94%20Socle%20alertes%20et%20emails%20async.md) — alertes, notifications, e-mails async
- [RFC-PROJ-DOC-001](./RFC-PROJ-DOC-001%20%E2%80%94%20Mod%C3%A8le.md) — registre documentaire projet
- [RFC-ACL-018](./RFC-ACL-018%20%E2%80%94%20Moteur%20de%20d%C3%A9cision%20d'acc%C3%A8s%20unifi%C3%A9.md) / [RFC-ACL-025](./RFC-ACL-025%20%E2%80%94%20Adoption%20guards%20HTTP%20moteur%20unifi%C3%A9.md) — moteur de décision d'accès
- UI : [RFC-FE-MEET-001](./RFC-FE-MEET-001%20%E2%80%94%20UI%20R%C3%A9unions%20%E2%80%94%20pr%C3%A9paration%2C%20conduite%20et%20pr%C3%A9sentation.md)

**Hors scope :** visioconférence, transcription IA, génération automatique de compte rendu, agenda Outlook avancé, récurrence de série, imputation de la charge de préparation en capacité, création d'un nouveau **type** de section par le client (voir §8-11).

---

# 0. Analyse de l'existant

## 0.1 Trois briques qui se recouvrent

| Brique | Code | Couvre | Ne couvre pas |
| --- | --- | --- | --- |
| **Points projet** — `ProjectReview` | [`apps/api/src/modules/projects/project-reviews/`](../../apps/api/src/modules/projects/project-reviews/) (52 fichiers, ~8 900 l.), [`project-reviews-tab.tsx`](../../apps/web/src/features/projects/components/project-reviews-tab.tsx) | Point **mono-projet** : cycle de vie `PREPARING → SCHEDULED → IN_PROGRESS → FINALIZED / CANCELLED`, ODJ typé, participants + émargement, décisions, actions (avec `linkedTaskId`), pièces jointes, invitations in-app / e-mail / Teams, compte rendu e-mail, snapshot `schemaVersion: 2` | `projectId` **obligatoire** → aucune réunion portefeuille ; pas de template ; pas de mode présentation ; pas de sections planning / alertes / budget ; pas de permission dédiée |
| **Cycles de pilotage** — `GovernanceCycle*` | [`apps/api/src/modules/governance-cycles/`](../../apps/api/src/modules/governance-cycles/), [`features/governance-cycles/`](../../apps/web/src/features/governance-cycles/) | Arbitrage **portefeuille** : items multi-sources, scoring, `GovernanceCycleInstance` (séance de décision), agenda, clôture, propagation configurable projet / budget | Pas une réunion : ODJ réduit à une liste d'items, pas de présentation, pas d'appel, pas de sections métier |
| **Présentation CODIR** | [`features/projects/committee-presentation/`](../../apps/web/src/features/projects/committee-presentation/) | Deck slides, overlay plein écran, 19 widgets configurables, export PDF via générateur maison `codir-minimal-pdf.ts` | Deck figé « CODIR », non templatable, réglages persistés en **`localStorage`** (`committee-codir-page-settings`), **aucune trace serveur** (ni présence, ni décision) |

## 0.2 Modèle de données en place (référence)

`apps/api/prisma/schema.prisma` :

| Objet | Ligne | Note |
| --- | --- | --- |
| `ProjectReview` + 6 modèles satellites | 2471 – 2720 | `ProjectReviewParticipant`, `…AgendaItem`, `…Decision`, `…ActionItem`, `…ActionItemContributor`, `…Attachment` |
| 9 enums `ProjectReview*` | 1560 – 1660 | `ProjectReviewType` compte **12** valeurs |
| `ProjectGovernanceCircle` | 2815 | `systemKind: ProjectGovernanceCircleSystemKind` (`COPIL` / `COPROJ`) + `ProjectTeamGovernanceMembership` |
| `ProjectTaskPhase` | 2901 | Pas de dates propres — début / fin / avancement **dérivés** des tâches |
| `ProjectTask` | 2950 | `ProjectTaskStatus` inclut `BLOCKED` |
| `ProjectRisk` | 3300 | `probability` × `impact` (1–5) → `criticalityScore` (1–25), `criticalityLevel` |
| `ProjectMilestone` | 3376 | `targetDate`, `status`, `phaseId` |
| `BudgetLine` | 3918 | `initialAmount`, `committedAmount` (**engagé**), `consumedAmount` (**consommé**), `remainingAmount` |
| `Alert` | 4855 | `entityType` / `entityId`, `severity`, `ruleCode` |
| `GovernanceCycle` + 5 modèles | 5631 – 5801 | dont `GovernanceCycleInstance`, `GovernanceCycleInstanceDecision`, `BudgetGovernanceDecision` |

## 0.3 Ce sur quoi on s'appuie sans le réécrire

- **Snapshot v2** — [`project-reviews-snapshot.builder.ts`](../../apps/api/src/modules/projects/project-reviews/project-reviews-snapshot.builder.ts) agrège **déjà, pour un projet** : `progress.globalProgress`, `arbitration` (3 niveaux), `tasks { open, inProgress, done, late }`, `risks { open, mitigated, closed, monitored, topRisks[5] }`, `milestones[5]`, `budget.links[]`, décisions, actions, participants — et exclut `meetingUrl` et les URL de pièces jointes (`snapshotContainsSensitiveUrls()`, l. 407).
- **Presets d'ordre du jour** par type de rituel — [`project-review-agenda-presets.ts`](../../apps/web/src/features/projects/lib/project-review-agenda-presets.ts).
- **Cercles de gouvernance** `COPIL` / `COPROJ` — [`project-governance-circles.service.ts`](../../apps/api/src/modules/projects/project-governance-circles.service.ts) : source naturelle de pré-remplissage des convoqués.
- **Signaux de pilotage** — [`projects-pilotage.service.ts`](../../apps/api/src/modules/projects/projects-pilotage.service.ts) et [`project-list-pilotage-snapshot.ts`](../../apps/api/src/modules/projects/project-list-pilotage-snapshot.ts) : `ProjectSignals` (`isLate`, `isBlocked`, `hasNoOwner`, `hasNoTasks`, `hasNoRisks`, `hasNoMilestones`, `hasPlanningDrift`, `isCritical`), `warnings[]`, `computedHealth`.
- **Budget consommé** — `consumedBudgetAmountsByProjectId` ([`projects.service.ts:1015`](../../apps/api/src/modules/projects/projects.service.ts)).
- **Capacité** — `GET /api/capacity/dashboard/portfolio` ([`capacity.controller.ts:214`](../../apps/api/src/modules/capacity/capacity.controller.ts)).
- **Planning macro** — `GET /api/projects/:projectId/gantt` (phases + jalons) et `GET /api/projects/portfolio-gantt` ([`projects.controller.ts:68`](../../apps/api/src/modules/projects/projects.controller.ts)).
- **Alertes** — 7 règles en place dans [`alerts-trigger.service.ts`](../../apps/api/src/modules/alerts/alerts-trigger.service.ts) : `budget.line.overrun`, `budget.line.near_limit`, `project.overdue`, `project.milestone.delayed`, `project.risk.critical`, `contract.expiring`, `contract.expired`. **Aucune règle réunion.**

## 0.4 Approche écartée — absorption de `ProjectReview` (2026-07-26)

Une première conception a été menée puis **abandonnée pour raison produit**. Elle est conservée ici pour mémoire, afin qu'elle ne soit pas reproposée.

| | Détail |
| --- | --- |
| **Où** | Branche `backup/pre-revert-48029b3`, divergée de `ae9de89` — commits `2b2f717` (RFC, 1 409 l.) et `10d2600` (implémentation API, ~4 000 l.) |
| **Principe** | *Extraction* du domaine Points projet : `RFC-MEET-001` d'alors **supersédait** RFC-PROJ-013 / 013-1 / 013-2, avec §23 « Migration depuis Points projet et **retrait de `ProjectReview`** » et un script `migrate-project-reviews-to-meetings.ts` |
| **Ampleur livrée** | Module Nest `meetings` (controller, service, `meeting-run`, `meeting-deck`, `meeting-dispatch`), migration SQL de 942 lignes, `seed-meetings.ts`, suppression des DTO `project-reviews` |
| **Sort** | Non fusionnée sur `main` — retirée par rollback (stash `temp-before-rollback-2b2f717`) |
| **Motif** | **Décision produit** : l'absorption de `ProjectReview` a été jugée **trop large et trop risquée**. Elle imposait une migration de données irréversible et la réécriture d'un domaine déjà stabilisé et éprouvé en production |

**Conséquence pour la présente RFC** : la surcouche (§1.1) n'est pas un choix par défaut, c'est la réponse explicite à cet arbitrage. `ProjectReview` **reste la source de vérité du point projet** ; le module Réunions orchestre sans migrer. Toute proposition future de fusionner les deux domaines doit d'abord traiter le risque de migration qui a fait échouer la première tentative.

## 0.5 Écarts qui motivent cette RFC

| # | Écart | Conséquence métier |
| --- | --- | --- |
| E1 | `ProjectReview.projectId` est **obligatoire** | Impossible de porter un CODIR ou un COPRO couvrant plusieurs projets |
| E2 | Aucun objet « template de réunion » | Chaque comité se reconstruit à la main ; pas de standard client |
| E3 | Aucune notion de **section** | Impossible de dire « ce comité présente le planning macro, le budget consommé et les alertes » |
| E4 | Le deck CODIR n'existe **qu'en `localStorage`** | Ni partage, ni trace, ni reproductibilité d'une séance à l'autre |
| E5 | Aucune **entité point bloquant** | Le suivi des irritants se fait hors outil ; seuls des signaux dérivés existent |
| E6 | Aucune permission dédiée | Tout passe par `projects.read` / `projects.update` — impossible d'ouvrir un comité à un profil non contributeur projet |
| E7 | Pas d'export PowerPoint | La restitution reste sous PowerPoint, avec ressaisie manuelle |

---

# 1. Objectif

> **Préparer, convoquer, tenir, tracer et restituer un rituel de gouvernance — quel que soit son périmètre.**

Le module doit permettre de gérer **CODIR, COPIL, COPRO, revue de projet, revue budgétaire, comité risques, arbitrage, point de crise, post-mortem**, chacun décrit par un **template** qui détermine les **sections** présentées, alimentées **en lecture** par les modules existants.

## 1.1 Principe d'architecture — surcouche (3 règles non négociables)

1. **Zéro duplication de donnée métier.** Risques, phases / jalons, avancement, alertes, budget consommé, capacité et arbitrages sont **lus** via les services existants. Ils ne sont figés dans `Meeting.snapshotPayload` qu'**à la finalisation**.
2. **La trace par projet reste dans `ProjectReview`.** Au passage en `SCHEDULED`, la réunion crée ou lie **un `ProjectReview` par projet inscrit** (`MeetingProject.projectReviewId`). Décisions, actions et compte rendu par projet réutilisent l'API `/api/projects/:projectId/reviews/*` existante. L'onglet « Points projet » reste alimenté ; aucune régression.
3. **La trace portefeuille reste dans les cycles.** Si `Meeting.governanceCycleInstanceId` est renseigné, les arbitrages multi-projets s'écrivent via `GovernanceCycleInstanceDecision` et bénéficient de la propagation configurable de RFC-PROJ-CYCLE-003.

Le module ne possède en propre **que ce qui n'existe nulle part** : template, périmètre multi-projets, appel / émargement, sections, deck serveur, registre des points bloquants.

## 1.2 Non-objectifs

Cette RFC ne fait pas de Starium un outil de visioconférence, un clone Teams, un agenda Outlook, ni un outil de prise de notes générique. Elle ne remplace pas `ProjectReview` et ne fusionne pas les cycles de pilotage.

---

# 2. Hypothèses

1. **`ProjectReview` et `GovernanceCycleInstance` ne sont pas modifiés structurellement.** Le module s'y branche par des FK **sortantes** portées par `Meeting` / `MeetingProject`. Aucune migration de données existante.
2. **Aucun stockage binaire nouveau** : les pièces jointes sont une référence `ProjectDocument` ou une URL externe (aligné RFC-PROJ-DOC-001 MVP).
3. **Le rendu de présentation reste client-side.** PDF et PPTX sont générés dans le navigateur (RFC-FE-MEET-001) ; le backend ne fournit que l'agrégat de données.
4. **La récurrence de série n'est pas implémentée en V1.** `MeetingTemplate.cadence` est informatif ; la reconduction se fait par duplication d'une réunion.
5. **L'appel est manuel** : pointage en séance. Aucune détection de présence Teams.
6. **La portée d'un template est figée** (`PROJECT` ou `PORTFOLIO`). Un besoin mixte se traduit par deux templates — voir §8-12.
7. **Le catalogue de `MeetingSectionType` est fermé côté code.** Le client compose librement à partir de ce catalogue et dispose de `FREE_TEXT` instanciable N fois comme échappatoire — voir §8-11.

---

# 3. Fichiers à créer / modifier

## 3.1 Backend — à créer

```
apps/api/src/modules/meetings/
  meetings.module.ts
  meetings.controller.ts
  meeting-templates.controller.ts
  meetings.service.ts
  meeting-templates.service.ts
  meeting-attendance.service.ts
  meeting-deck.service.ts                    ← agrégation des sections
  meeting-decisions.service.ts
  meeting-blockers.service.ts
  meeting-project-review-bridge.service.ts   ← règle §1.1-2
  meeting-report.builder.ts
  meetings-snapshot.builder.ts
  dto/
    create-meeting.dto.ts · update-meeting.dto.ts · schedule-meeting.dto.ts
    invite-meeting.dto.ts · list-meetings.query.dto.ts · deck.query.dto.ts
    add-meeting-projects.dto.ts · reorder-meeting-projects.dto.ts
    create-attendee.dto.ts · update-attendee.dto.ts · check-in-attendee.dto.ts
    reorder-sections.dto.ts · update-section.dto.ts
    create-agenda-item.dto.ts · update-agenda-item.dto.ts · reorder-agenda-items.dto.ts
    create-decision.dto.ts · update-decision.dto.ts
    create-blocker.dto.ts · update-blocker.dto.ts · promote-blocker-candidate.dto.ts
    create-attachment.dto.ts · update-attachment.dto.ts
    create-meeting-template.dto.ts · update-meeting-template.dto.ts
    upsert-template-sections.dto.ts
  lib/
    meeting-status.helpers.ts · meeting-quorum.util.ts
    meeting-section-catalog.ts · meeting-blocker-candidates.util.ts
    system-meeting-templates.ts
  tests/
```

## 3.2 Backend — à modifier

| Fichier | Modification |
| --- | --- |
| [`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma) | 10 modèles + 8 enums (§5) ; `EmailDelivery.meetingId?` |
| `apps/api/prisma/migrations/<ts>_rfc_meet_001_meetings/migration.sql` | Migration additive idempotente |
| [`apps/api/prisma/seed.ts`](../../apps/api/prisma/seed.ts) | `ensureMeetingsModuleAndPermissions()` + `ensureSystemMeetingTemplates()` |
| [`apps/api/prisma/default-profiles.json`](../../apps/api/prisma/default-profiles.json) | Ajout des permissions `meetings.*` aux profils |
| [`apps/api/src/app.module.ts`](../../apps/api/src/app.module.ts) | Import `MeetingsModule` |
| [`apps/api/src/modules/alerts/alerts-trigger.service.ts`](../../apps/api/src/modules/alerts/alerts-trigger.service.ts) | 4 règles réunion (§4.9) |

## 3.3 Frontend

Voir [RFC-FE-MEET-001](./RFC-FE-MEET-001%20%E2%80%94%20UI%20R%C3%A9unions%20%E2%80%94%20pr%C3%A9paration%2C%20conduite%20et%20pr%C3%A9sentation.md). Une modification relève de cette RFC :

| Fichier | Modification |
| --- | --- |
| [`apps/web/src/features/projects/types/project.types.ts`](../../apps/web/src/features/projects/types/project.types.ts) l. 888 | **Correctif préalable** : le type `ProjectReviewType` n'expose que 7 des 12 valeurs Prisma. Le pont doit pouvoir écrire `PROJECT_REVIEW`, `BUDGET_REVIEW`, `ARBITRATION`, `CRISIS_POINT`, `OTHER` |

## 3.4 Documentation

[`docs/API.md`](../API.md) (nouvelle section) · [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) §7 · [`docs/RFC/_RFC Liste.md`](./_RFC%20Liste.md) · [`docs/MANUEL-40-PROJETS-RISQUES-ACTIONS.md`](../MANUEL-40-PROJETS-RISQUES-ACTIONS.md)

---

# 4. Implémentation

## 4.1 Objets propres au module

| Modèle | Rôle |
| --- | --- |
| `MeetingTemplate` | Modèle de rituel : `code`, `name`, `kind`, `scope`, `isSystem`, `isHidden`, `defaultDurationMinutes`, `cadence`, `defaultAgenda Json?` |
| `MeetingTemplateSection` | Composition du template : `sectionType`, `sortOrder`, `titleOverride`, `isEnabled`, `config Json` |
| `Meeting` | La réunion |
| `MeetingProject` | N‑N réunion ↔ projet : `sortOrder`, `rapporteurUserId`, `allocatedMinutes`, **`projectReviewId?`** |
| `MeetingAttendee` | Convoqué + **appel** : `attendanceStatus`, `checkedInAt`, `delegateOfAttendeeId?` |
| `MeetingSectionInstance` | Sections retenues pour **cette** réunion (copie du template, réordonnable sans l'altérer) |
| `MeetingAgendaItem` | Point d'ODJ rattaché à une section et/ou un projet |
| `MeetingDecision` | Décision / arbitrage, avec **portée** `MEETING` / `PROJECT` / `MACRO_TASK` |
| `MeetingBlocker` | **Registre des points bloquants** — n'existe nulle part aujourd'hui |
| `MeetingAttachment` | Référence `ProjectDocument` ou URL |

## 4.2 Catalogue des sections

`MeetingSectionType` — 16 valeurs :

| Section | Contenu restitué | Source (lecture) |
| --- | --- | --- |
| `COVER` | Nom, période, date, animateur, projets à l'ODJ | `Meeting`, `MeetingProject` |
| `ATTENDANCE` | Convoqués, statut de présence, délégations, **quorum** | `MeetingAttendee` (propre) |
| `AGENDA` | Points d'ODJ, durée prévue, porteur | `MeetingAgendaItem` (propre) |
| `PORTFOLIO_SYNTHESIS` | Une ligne par projet : santé, avancement, statut, criticité, responsable, **signaux d'attention** | `projects-pilotage.service.ts`, `project-list-pilotage-snapshot.ts` |
| `PROJECT_STATUS` | Avancement global, tâches `open / inProgress / done / late`, météo du comité précédent | Snapshot v2 + `project-review-committee-mood.helpers.ts` |
| `PLANNING_MACRO` | **Une barre par phase** + jalons en marqueurs ; jalons en retard signalés | `GET /projects/:id/gantt`, `GET /projects/portfolio-gantt` |
| `ALERTS` | Alertes actives du périmètre, triées par sévérité | `Alert` filtré `entityType='project'` |
| `RISKS` | Top N risques (défaut 5) + **matrice P×I** (grille 5×5, score 1–25) | `project-risks.service.ts` |
| `BLOCKERS` | Registre + **candidats détectés** proposés à la promotion | `MeetingBlocker` + §4.6 |
| `BUDGET_CONSUMPTION` | Budget cible, **engagé**, **consommé**, reste, % de consommation ; total portefeuille | `BudgetLine` via `ProjectBudgetLink`, `consumedBudgetAmountsByProjectId` |
| `CAPACITY` | `capacity / allocated / forecast / committed / available` par équipe | `GET /api/capacity/dashboard/portfolio` |
| `ARBITRATIONS` | États **Métier → Comité → CODIR** + motif de refus + **recommandation COPIL** | `Project.arbitration*Status`, `copilRecommendation`, `GovernanceCycleItem.decisionStatus` |
| `DECISIONS` | Décisions de la séance (saisie) | `MeetingDecision` (propre) |
| `ACTIONS` | Actions, responsables, échéances — rattachables à une `ProjectTask` | `ProjectReviewActionItem` via le pont |
| `NEXT_STEPS` | Prochain comité, sujets reportés, points d'ODJ non traités | Calculé |
| `FREE_TEXT` | Bloc libre — **instanciable N fois**, titre personnalisable | Propre |

> Les sections **ne portent aucune donnée métier** : `MeetingSectionInstance` ne stocke que l'ordre, l'activation, le titre, la configuration et les notes de séance.

## 4.3 Templates système

Livrés par le seed, `isSystem = true`, **non supprimables** mais **masquables** (`isHidden`).

| Template | `scope` | Sections (ordre) |
| --- | --- | --- |
| **CODIR** | `PORTFOLIO` | COVER · ATTENDANCE · PORTFOLIO_SYNTHESIS · ARBITRATIONS · BUDGET_CONSUMPTION · ALERTS · DECISIONS · NEXT_STEPS |
| **COPIL** | `PROJECT` | COVER · ATTENDANCE · AGENDA · PROJECT_STATUS · PLANNING_MACRO · BUDGET_CONSUMPTION · RISKS · BLOCKERS · ARBITRATIONS · DECISIONS · ACTIONS · NEXT_STEPS |
| **COPRO** | `PROJECT` | COVER · ATTENDANCE · AGENDA · PROJECT_STATUS · PLANNING_MACRO · BLOCKERS · ACTIONS · NEXT_STEPS |
| **Revue de projet** | `PROJECT` | COVER · ATTENDANCE · AGENDA · PROJECT_STATUS · PLANNING_MACRO · RISKS · DECISIONS · ACTIONS · NEXT_STEPS |
| **Revue budgétaire** | `PORTFOLIO` | COVER · ATTENDANCE · BUDGET_CONSUMPTION · CAPACITY · ARBITRATIONS · DECISIONS · NEXT_STEPS |
| **Comité risques** | `PORTFOLIO` | COVER · ATTENDANCE · RISKS · BLOCKERS · ALERTS · DECISIONS · ACTIONS · NEXT_STEPS |
| **Arbitrage** | `PORTFOLIO` | COVER · ATTENDANCE · PORTFOLIO_SYNTHESIS · ARBITRATIONS · BUDGET_CONSUMPTION · CAPACITY · DECISIONS |
| **Point de crise** | `PROJECT` | COVER · ATTENDANCE · BLOCKERS · RISKS · PLANNING_MACRO · DECISIONS · ACTIONS |
| **Post-mortem** | `PROJECT` | COVER · ATTENDANCE · AGENDA · PROJECT_STATUS · BUDGET_CONSUMPTION · FREE_TEXT · DECISIONS · NEXT_STEPS |

Les **ordres du jour par défaut** (`defaultAgenda`) reprennent les presets déjà écrits dans [`project-review-agenda-presets.ts`](../../apps/web/src/features/projects/lib/project-review-agenda-presets.ts), remontés côté serveur dans `lib/system-meeting-templates.ts`. Ils ne sont pas réécrits.

### Personnalisation client

| Action | Autorisée | Note |
| --- | --- | --- |
| Dupliquer un template système | ✅ | La copie a `isSystem = false` et est pleinement modifiable |
| Créer un template de zéro | ✅ | Nom, portée, durée, cadence |
| Réordonner / activer / désactiver une section | ✅ | `sortOrder`, `isEnabled` |
| Renommer une section | ✅ | `titleOverride` |
| Configurer une section | ✅ | `config Json` — ex. `{ "topRisksLimit": 3, "onlyCritical": true }` |
| Ajouter plusieurs `FREE_TEXT` | ✅ | Chacune avec son titre |
| Masquer un template système | ✅ | `isHidden` |
| Supprimer / modifier un template système | ❌ | `409 MEETING_TEMPLATE_SYSTEM_READONLY` |
| Créer un nouveau **type** de section | ❌ | Catalogue fermé — voir §8-11 |
| Changer la portée d'un template | ❌ | Voir §8-12 |

## 4.4 Cycle de vie

```text
PREPARING → SCHEDULED → IN_PROGRESS → FINALIZED
     ↘──────────────────────────────↗ CANCELLED
```

Aligné sur `ProjectReviewStatus` (RFC-PROJ-013-2), sans valeur legacy.

| Transition | Effets |
| --- | --- |
| **création** (`PREPARING`) | Instancie `MeetingSectionInstance` depuis le template ; instancie l'ODJ par défaut ; date non obligatoire |
| **`schedule`** | Exige `scheduledAt` et ≥ 1 `MeetingProject` si `scope = PROJECT`. **Crée ou lie un `ProjectReview` par projet** (§4.5). Déclenche les invitations |
| **`start`** | Fige la composition des sections (`sectionsLockedAt`), ouvre l'appel |
| **`finalize`** | Calcule le quorum, génère `snapshotPayload`, propage les décisions (§4.7), débloque compte rendu et exports |
| **`cancel`** | Depuis tout statut sauf `FINALIZED` ; motif obligatoire ; les `ProjectReview` liés sont annulés |

Le compte rendu et les exports **ne sont disponibles qu'en `FINALIZED`** — même règle que `canPreviewOrSendReviewReport` côté points projet.

## 4.5 Pont vers `ProjectReview` — `meeting-project-review-bridge.service.ts`

Cœur de la règle §1.1-2.

- À `schedule`, pour chaque `MeetingProject` sans `projectReviewId` : création d'un `ProjectReview` via `ProjectReviewsService` avec `reviewType` dérivé de `MeetingTemplate.kind` (CODIR → `PROJECT_REVIEW`, COPIL → `COPIL`, COPRO → `COPRO`, Arbitrage → `ARBITRATION`, Revue budgétaire → `BUDGET_REVIEW`, Point de crise → `CRISIS_POINT`, Post-mortem → `POST_MORTEM`, sinon `OTHER`), `title` = titre de la réunion, `objective`, `periodStart/End`, `reviewDate` = `scheduledAt`.
- **Idempotence** : un `MeetingProject` ne crée qu'un seul `ProjectReview`. Retirer un projet **délie** sans supprimer la review (elle porte peut-être déjà des décisions).
- À `finalize`, les `MeetingDecision` de portée `PROJECT` ou `MACRO_TASK` sont **répliquées** en `ProjectReviewDecision` sur la review du projet concerné, puis chaque review liée est finalisée.
- Les **actions** sont écrites directement en `ProjectReviewActionItem` (qui porte déjà `linkedTaskId`) : le module ne possède pas d'entité action propre.
- Si le projet est **hors périmètre d'accès** de la personne qui planifie, la création est refusée (`403 ACCESS_DECISION_DENIED`) — pas de création silencieuse.

## 4.6 Points bloquants — `meeting-blockers.service.ts`

`MeetingBlocker` est le **registre de gouvernance** des irritants : il survit à la réunion qui l'a levé.

- Champs : `title`, `description`, `severity`, `status` (`OPEN` / `ESCALATED` / `RESOLVED`), `projectId?`, `riskId?`, `taskId?`, `ownerUserId?`, `dueDate?`, `raisedAtMeetingId`, `resolvedAtMeetingId?`, `resolvedAt?`.
- **Candidats dérivés** (`meeting-blocker-candidates.util.ts`) — proposés, jamais créés d'office :

| Origine | Règle |
| --- | --- |
| `ProjectTask.status = BLOCKED` | Toute tâche bloquée d'un projet du périmètre |
| `ProjectSignals` | `isBlocked`, `isLate`, `hasPlanningDrift` |
| `ProjectRisk` | `criticalityLevel = CRITICAL` et `status ∈ { OPEN, MONITORED }` |
| `Alert` | `severity = CRITICAL` et `status = ACTIVE` |

La promotion (`POST …/blockers/promote`) crée un `MeetingBlocker` en conservant la référence d'origine (`taskId` / `riskId`). Un candidat déjà promu n'est plus proposé.

## 4.7 Décisions et arbitrages — `meeting-decisions.service.ts`

`MeetingDecision.scope` :

| Portée | `projectId` | `projectTaskPhaseId` / `projectTaskId` | Usage |
| --- | --- | --- | --- |
| `MEETING` | ∅ | ∅ | Décision transverse au comité |
| `PROJECT` | requis | ∅ | GO / NO GO sur un projet |
| `MACRO_TASK` | requis | **au moins un requis** | *« Phase 3 — Reprise de données : NO GO tant que la qualification n'est pas livrée »* |

`MeetingDecisionType` reprend `ProjectReviewDecisionType` : `GO`, `NO_GO`, `ARBITRATION`, `BUDGET_VALIDATION`, `SCOPE_CHANGE`, `RISK_ACCEPTANCE`, `PRIORITY_CHANGE`, `OTHER`. Statut : `DRAFT` / `VALIDATED` / `REJECTED` / `SUPERSEDED`.

**Propagation à la finalisation :**

| Portée | Destination |
| --- | --- |
| `PROJECT` / `MACRO_TASK` | `ProjectReviewDecision` sur la review liée (règle §1.1-2) |
| `MEETING` avec `governanceCycleInstanceId` renseigné | `GovernanceCycleInstanceDecision` — la propagation projet / budget reste celle de RFC-PROJ-CYCLE-003, **inchangée** |
| `MEETING` sans instance | Conservée sur `MeetingDecision` uniquement |

Le module **ne modifie jamais directement** `Project.arbitration*Status` ni `Project.status` : il passe par les mécanismes de propagation existants.

## 4.8 Agrégation — `meeting-deck.service.ts`

`GET /api/meetings/:id/deck` renvoie une entrée par section active, dans l'ordre.

```ts
type MeetingDeckResponse = {
  meetingId: string;
  status: MeetingStatus;
  source: 'live' | 'snapshot';           // 'snapshot' dès FINALIZED
  generatedAt: string;
  sections: Array<{
    sectionInstanceId: string;
    sectionType: MeetingSectionType;
    title: string;                        // titleOverride ?? libellé catalogue
    sortOrder: number;
    payload: unknown;                     // contrat typé par sectionType
    partial?: { reason: 'ACCESS_FILTERED' | 'SOURCE_UNAVAILABLE'; hiddenCount?: number };
  }>;
};
```

Règles :

1. **`AccessDecisionService` est appliqué projet par projet** avant toute agrégation. Un projet hors périmètre est retiré et signalé par `partial.reason = 'ACCESS_FILTERED'` — jamais silencieusement.
2. `PROJECT_STATUS`, `RISKS` et `BUDGET_CONSUMPTION` **appellent le snapshot builder v2 existant** par projet, puis composent la vue portefeuille. Aucune réimplémentation de l'agrégation.
3. Une source indisponible (module désactivé chez le client, ex. `capacity`) rend `payload: null` + `partial.reason = 'SOURCE_UNAVAILABLE'` — pas d'erreur 500.
4. En `FINALIZED`, la réponse est servie **depuis `snapshotPayload`** : les chiffres présentés en séance restent ceux du jour.

## 4.9 Alertes réunion

Quatre règles à ajouter dans [`alerts-trigger.service.ts`](../../apps/api/src/modules/alerts/alerts-trigger.service.ts) :

| `ruleCode` | Déclenchement | Sévérité |
| --- | --- | --- |
| `meeting.upcoming` | Réunion `SCHEDULED` dans les 48 h | `INFO` |
| `meeting.not_finalized` | Réunion `IN_PROGRESS` depuis > 7 jours | `WARNING` |
| `meeting.action.overdue` | Action issue d'un comité dont `dueDate` est dépassée | `WARNING` |
| `meeting.quorum_not_met` | Réunion finalisée sans quorum atteint | `WARNING` |

`entityType = 'meeting'`, `entityId = meeting.id`, `entityLabel` = **titre de la réunion** (jamais l'ID).

## 4.10 Contrat API

Préfixe `/api`. Guards, dans l'ordre : `JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard`.

### Réunions

| Méthode | Route | Permission |
| --- | --- | --- |
| `GET` | `/meetings` — filtres `status`, `templateKind`, `projectId`, `from`, `to`, pagination | `meetings.read` |
| `POST` | `/meetings` | `meetings.create` |
| `GET` | `/meetings/:id` | `meetings.read` |
| `PATCH` | `/meetings/:id` | `meetings.update` |
| `POST` | `/meetings/:id/schedule` | `meetings.update` |
| `POST` | `/meetings/:id/start` | `meetings.conduct` |
| `POST` | `/meetings/:id/finalize` | `meetings.conduct` |
| `POST` | `/meetings/:id/cancel` | `meetings.update` |
| `POST` | `/meetings/:id/invite` | `meetings.update` |
| `GET` | `/meetings/:id/deck` | `meetings.read` |
| `GET` | `/meetings/:id/report-preview` — `FINALIZED` uniquement | `meetings.read` |
| `POST` | `/meetings/:id/send-report` — `FINALIZED` uniquement | `meetings.update` |

### Périmètre projets

| Méthode | Route | Permission |
| --- | --- | --- |
| `POST` / `DELETE` | `/meetings/:id/projects` · `/meetings/:id/projects/:meetingProjectId` | `meetings.update` |
| `PATCH` | `/meetings/:id/projects/reorder` | `meetings.update` |

### Appel

| Méthode | Route | Permission |
| --- | --- | --- |
| `POST` / `PATCH` / `DELETE` | `/meetings/:id/attendees` (+ `/:attendeeId`) | `meetings.update` |
| `POST` | `/meetings/:id/attendees/:attendeeId/check-in` | `meetings.conduct` |
| `GET` | `/meetings/:id/attendance` — présents / requis / quorum | `meetings.read` |
| `POST` | `/meetings/:id/attendees/from-governance-circles` — pré-remplissage | `meetings.update` |

### Sections, ODJ, décisions, points bloquants, pièces jointes

| Méthode | Route | Permission |
| --- | --- | --- |
| `PATCH` | `/meetings/:id/sections/reorder` · `/meetings/:id/sections/:sectionId` | `meetings.update` |
| `POST` / `PATCH` / `DELETE` | `/meetings/:id/agenda-items` (+ `/:itemId`), `PATCH …/reorder` | `meetings.update` |
| `POST` / `PATCH` / `DELETE` | `/meetings/:id/decisions` (+ `/:decisionId`) | `meetings.conduct` |
| `GET` | `/meetings/:id/blockers/candidates` | `meetings.read` |
| `POST` | `/meetings/:id/blockers/promote` | `meetings.conduct` |
| `POST` / `PATCH` / `DELETE` | `/meetings/:id/blockers` (+ `/:blockerId`) | `meetings.conduct` |
| `POST` / `PATCH` / `DELETE` | `/meetings/:id/attachments` (+ `/:attachmentId`) | `meetings.update` |

### Templates

| Méthode | Route | Permission |
| --- | --- | --- |
| `GET` | `/meeting-templates` | `meetings.read` |
| `POST` | `/meeting-templates` | `meetings.templates.manage` |
| `GET` | `/meeting-templates/:id` | `meetings.read` |
| `PATCH` / `DELETE` | `/meeting-templates/:id` | `meetings.templates.manage` |
| `POST` | `/meeting-templates/:id/duplicate` | `meetings.templates.manage` |
| `PUT` | `/meeting-templates/:id/sections` | `meetings.templates.manage` |

### Codes d'erreur métier

`MEETING_INVALID_TRANSITION` · `MEETING_SCHEDULE_REQUIRES_DATE` · `MEETING_SCOPE_REQUIRES_PROJECT` · `MEETING_NOT_FINALIZED` · `MEETING_TEMPLATE_SYSTEM_READONLY` · `MEETING_TEMPLATE_SCOPE_IMMUTABLE` · `MEETING_DECISION_SCOPE_MISMATCH` · `MEETING_BLOCKER_CANDIDATE_ALREADY_PROMOTED` · `ACCESS_DECISION_DENIED`.

## 4.11 Permissions et isolation

Module `meetings` (catalogue `Module`), 5 permissions :

| Code | Libellé | Portée |
| --- | --- | --- |
| `meetings.read` | Réunions — lecture | Liste, détail, deck, aperçu du compte rendu |
| `meetings.create` | Réunions — création | Créer une réunion |
| `meetings.update` | Réunions — modification | Préparation, périmètre, convocation, envoi du compte rendu |
| `meetings.conduct` | Réunions — conduite | Démarrer, appel, décisions, points bloquants, finaliser |
| `meetings.templates.manage` | Réunions — gestion des modèles | CRUD templates et sections |

Profils par défaut ([`default-profiles.json`](../../apps/api/prisma/default-profiles.json)) : *Lecteur* → `meetings.read` ; *Chef de projet* → `read`, `create`, `update`, `conduct` ; *Directeur / CODIR* → les 5.

**Isolation — règles absolues :**

1. `clientId` est **toujours** dérivé du client actif (`@ActiveClientId()`), **jamais** lu dans le body.
2. Toute écriture revalide que la réunion, les projets, les utilisateurs et les documents ciblés appartiennent au client actif.
3. Toute lecture agrégée re-filtre **projet par projet** via `AccessDecisionService` (intent `read`) — cf. §4.8-1.
4. Les templates sont scopés client ; les templates système sont **instanciés par client** au seed (pas de ligne globale partagée).

## 4.12 Audit

Actions journalisées via `AuditLogsModule` : `meeting.created` · `meeting.updated` · `meeting.scheduled` · `meeting.started` · `meeting.finalized` · `meeting.cancelled` · `meeting.project.added|removed` · `meeting.attendee.added|updated|removed|checked_in` · `meeting.section.updated|reordered` · `meeting.decision.created|updated|deleted` · `meeting.blocker.created|promoted|resolved` · `meeting.attachment.added|removed` · `meeting.report.sent` · `meeting_template.created|updated|deleted|duplicated`.

**Jamais journalisés en clair** : `meetingUrl`, `MeetingAttendee.externalEmail`, `MeetingAttachment.url`.

---

# 5. Modifications Prisma

## 5.1 Enums

```prisma
/// RFC-MEET-001 — cycle de vie d'une réunion de gouvernance
enum MeetingStatus {
  PREPARING
  SCHEDULED
  IN_PROGRESS
  FINALIZED
  CANCELLED
}

enum MeetingTemplateKind {
  CODIR
  COPIL
  COPRO
  PROJECT_REVIEW
  BUDGET_REVIEW
  RISK_COMMITTEE
  ARBITRATION
  CRISIS_POINT
  POST_MORTEM
  CUSTOM
}

/// Portée d'un template — immuable après création (RFC-MEET-001 §8-12)
enum MeetingScope {
  PROJECT
  PORTFOLIO
}

enum MeetingSectionType {
  COVER
  ATTENDANCE
  AGENDA
  PORTFOLIO_SYNTHESIS
  PROJECT_STATUS
  PLANNING_MACRO
  ALERTS
  RISKS
  BLOCKERS
  BUDGET_CONSUMPTION
  CAPACITY
  ARBITRATIONS
  DECISIONS
  ACTIONS
  NEXT_STEPS
  FREE_TEXT
}

enum MeetingMode {
  REMOTE
  ONSITE
  HYBRID
}

enum MeetingAttendanceStatus {
  EXPECTED
  PRESENT
  ABSENT
  EXCUSED
}

enum MeetingAgendaItemStatus {
  TODO
  IN_PROGRESS
  DONE
  SKIPPED
}

enum MeetingDecisionScope {
  MEETING
  PROJECT
  MACRO_TASK
}

enum MeetingDecisionType {
  GO
  NO_GO
  ARBITRATION
  BUDGET_VALIDATION
  SCOPE_CHANGE
  RISK_ACCEPTANCE
  PRIORITY_CHANGE
  OTHER
}

enum MeetingDecisionStatus {
  DRAFT
  VALIDATED
  REJECTED
  SUPERSEDED
}

enum MeetingBlockerSeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum MeetingBlockerStatus {
  OPEN
  ESCALATED
  RESOLVED
}

enum MeetingAttachmentType {
  URL
  DOCUMENT_REFERENCE
  POWERBI_LINK
  SHAREPOINT_LINK
  OTHER
}
```

## 5.2 Modèles (extrait structurant)

```prisma
/// RFC-MEET-001 — modèle de rituel de gouvernance (système ou client)
model MeetingTemplate {
  id       String @id @default(cuid())
  clientId String

  code                   String
  name                   String              @db.VarChar(200)
  description            String?             @db.VarChar(1000)
  kind                   MeetingTemplateKind
  /// Immuable après création — voir RFC-MEET-001 §8-12
  scope                  MeetingScope
  isSystem               Boolean             @default(false)
  isHidden               Boolean             @default(false)
  defaultDurationMinutes Int?
  cadence                GovernanceCycleCadence?
  /// Ordre du jour par défaut (JSON) — repris des presets RFC-PROJ-013-2
  defaultAgenda          Json?

  createdByUserId String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  client   Client                   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  sections MeetingTemplateSection[]
  meetings Meeting[]

  @@unique([clientId, code])
  @@index([clientId])
  @@index([clientId, kind])
}

model MeetingTemplateSection {
  id         String @id @default(cuid())
  clientId   String
  templateId String

  sectionType   MeetingSectionType
  sortOrder     Int
  titleOverride String?            @db.VarChar(200)
  isEnabled     Boolean            @default(true)
  /// Réglages de section (ex. { "topRisksLimit": 3 }) — jamais de DCP
  config        Json?

  client   Client          @relation(fields: [clientId], references: [id], onDelete: Cascade)
  template MeetingTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)

  @@unique([templateId, sortOrder])
  @@index([clientId])
  @@index([clientId, templateId])
}

/// RFC-MEET-001 — une réunion de gouvernance (1..N projets)
model Meeting {
  id         String @id @default(cuid())
  clientId   String
  templateId String

  title           String        @db.VarChar(300)
  objective       String?       @db.VarChar(2000)
  status          MeetingStatus @default(PREPARING)
  scheduledAt     DateTime?
  durationMinutes Int?
  periodStart     DateTime?
  periodEnd       DateTime?

  meetingMode MeetingMode?
  location    String?      @db.VarChar(300)
  /// DCP indirecte — jamais en snapshot, en compte rendu ni en audit
  meetingUrl  String?

  facilitatorUserId String?
  /// Rattachement optionnel à une instance de cycle (RFC-PROJ-CYCLE-003)
  governanceCycleInstanceId String?
  /// Ex. { "requiredRatio": 0.6 } — quorum évalué à la finalisation
  quorumRule                Json?

  sectionsLockedAt DateTime?
  startedAt        DateTime?
  startedByUserId  String?
  finalizedAt      DateTime?
  finalizedByUserId String?
  cancelledAt       DateTime?
  cancelledByUserId String?
  cancelReason      String?  @db.VarChar(1000)

  /// Figé à la finalisation — exclut meetingUrl et e-mails externes
  snapshotPayload Json?

  createdByUserId String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  client   Client          @relation(fields: [clientId], references: [id], onDelete: Cascade)
  template MeetingTemplate @relation(fields: [templateId], references: [id], onDelete: Restrict)
  governanceCycleInstance GovernanceCycleInstance? @relation(fields: [governanceCycleInstanceId], references: [id], onDelete: SetNull)

  projects   MeetingProject[]
  attendees  MeetingAttendee[]
  sections   MeetingSectionInstance[]
  agendaItems MeetingAgendaItem[]
  decisions  MeetingDecision[]
  attachments MeetingAttachment[]
  raisedBlockers   MeetingBlocker[] @relation("MeetingBlockerRaisedAt")
  resolvedBlockers MeetingBlocker[] @relation("MeetingBlockerResolvedAt")

  @@index([clientId])
  @@index([clientId, status])
  @@index([clientId, scheduledAt])
  @@index([clientId, templateId])
}

/// Périmètre : un projet inscrit à une réunion + pont vers le point projet
model MeetingProject {
  id        String @id @default(cuid())
  clientId  String
  meetingId String
  projectId String

  sortOrder        Int     @default(0)
  rapporteurUserId String?
  allocatedMinutes Int?
  /// Règle de surcouche §1.1-2 — la trace par projet reste dans ProjectReview
  projectReviewId  String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  client        Client         @relation(fields: [clientId], references: [id], onDelete: Cascade)
  meeting       Meeting        @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  project       Project        @relation(fields: [projectId], references: [id], onDelete: Cascade)
  projectReview ProjectReview? @relation(fields: [projectReviewId], references: [id], onDelete: SetNull)

  @@unique([meetingId, projectId])
  @@unique([meetingId, sortOrder])
  @@index([clientId])
  @@index([clientId, projectId])
}

/// Convoqué + appel / émargement
model MeetingAttendee {
  id        String @id @default(cuid())
  clientId  String
  meetingId String

  userId      String?
  resourceId  String?
  /// DCP — participant externe sans compte. Jamais affiché en UI ni journalisé.
  externalEmail String?
  displayName String? @db.VarChar(200)
  roleLabel   String? @db.VarChar(200)

  isRequired       Boolean                 @default(false)
  attendanceStatus MeetingAttendanceStatus @default(EXPECTED)
  checkedInAt      DateTime?
  /// Représentation : ce participant remplace un autre convoqué
  delegateOfAttendeeId String?

  invitedAt     DateTime?
  lastInvitedAt DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  client   Client  @relation(fields: [clientId], references: [id], onDelete: Cascade)
  meeting  Meeting @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  user     User?     @relation(fields: [userId], references: [id], onDelete: SetNull)
  resource Resource? @relation(fields: [resourceId], references: [id], onDelete: SetNull)
  delegateOf MeetingAttendee?  @relation("MeetingAttendeeDelegation", fields: [delegateOfAttendeeId], references: [id], onDelete: SetNull)
  delegates  MeetingAttendee[] @relation("MeetingAttendeeDelegation")

  @@index([clientId])
  @@index([clientId, meetingId])
  @@index([userId])
}

/// Sections retenues pour CETTE réunion — copie du template, réordonnable
model MeetingSectionInstance {
  id        String @id @default(cuid())
  clientId  String
  meetingId String

  sectionType   MeetingSectionType
  sortOrder     Int
  titleOverride String?            @db.VarChar(200)
  isEnabled     Boolean            @default(true)
  config        Json?
  /// Notes de séance saisies sur la section
  notes         String?

  client  Client  @relation(fields: [clientId], references: [id], onDelete: Cascade)
  meeting Meeting @relation(fields: [meetingId], references: [id], onDelete: Cascade)

  @@unique([meetingId, sortOrder])
  @@index([clientId])
  @@index([clientId, meetingId])
}

/// Décision / arbitrage — portée réunion, projet ou macro-tâche
model MeetingDecision {
  id        String @id @default(cuid())
  clientId  String
  meetingId String

  scope             MeetingDecisionScope @default(MEETING)
  projectId         String?
  projectTaskPhaseId String?
  projectTaskId     String?
  agendaItemId      String?

  title        String                @db.VarChar(300)
  description  String?
  decisionType MeetingDecisionType   @default(OTHER)
  status       MeetingDecisionStatus @default(VALIDATED)
  impact       String?               @db.VarChar(2000)
  decidedByUserId String?
  decidedAt       DateTime?

  /// Décision répliquée dans ProjectReview à la finalisation (§4.7)
  propagatedDecisionId String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  client  Client  @relation(fields: [clientId], references: [id], onDelete: Cascade)
  meeting Meeting @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  project          Project?           @relation(fields: [projectId], references: [id], onDelete: SetNull)
  projectTaskPhase ProjectTaskPhase?  @relation(fields: [projectTaskPhaseId], references: [id], onDelete: SetNull)
  projectTask      ProjectTask?       @relation(fields: [projectTaskId], references: [id], onDelete: SetNull)
  agendaItem       MeetingAgendaItem? @relation(fields: [agendaItemId], references: [id], onDelete: SetNull)
  decidedBy        User?              @relation("MeetingDecisionDecidedBy", fields: [decidedByUserId], references: [id], onDelete: SetNull)

  @@index([clientId])
  @@index([clientId, meetingId])
  @@index([clientId, projectId])
}

/// Registre des points bloquants — survit à la réunion qui l'a levé
model MeetingBlocker {
  id       String @id @default(cuid())
  clientId String

  title       String                 @db.VarChar(300)
  description String?
  severity    MeetingBlockerSeverity @default(MEDIUM)
  status      MeetingBlockerStatus   @default(OPEN)

  projectId   String?
  riskId      String?
  taskId      String?
  ownerUserId String?
  dueDate     DateTime?

  raisedAtMeetingId   String
  resolvedAtMeetingId String?
  resolvedAt          DateTime?
  resolutionNote      String? @db.VarChar(2000)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  client     Client       @relation(fields: [clientId], references: [id], onDelete: Cascade)
  project    Project?     @relation(fields: [projectId], references: [id], onDelete: SetNull)
  risk       ProjectRisk? @relation(fields: [riskId], references: [id], onDelete: SetNull)
  task       ProjectTask? @relation(fields: [taskId], references: [id], onDelete: SetNull)
  owner      User?        @relation("MeetingBlockerOwner", fields: [ownerUserId], references: [id], onDelete: SetNull)
  raisedAt   Meeting      @relation("MeetingBlockerRaisedAt", fields: [raisedAtMeetingId], references: [id], onDelete: Cascade)
  resolvedIn Meeting?     @relation("MeetingBlockerResolvedAt", fields: [resolvedAtMeetingId], references: [id], onDelete: SetNull)

  @@index([clientId])
  @@index([clientId, status])
  @@index([clientId, projectId])
  @@index([raisedAtMeetingId])
}
```

`MeetingAgendaItem` et `MeetingAttachment` suivent les mêmes conventions que leurs équivalents `ProjectReview*` (ordre, section, projet, porteur, statut / type, `documentId`, `url`).

## 5.3 Modification hors module

```prisma
model EmailDelivery {
  // …
  /// RFC-MEET-001 — traçabilité des invitations et comptes rendus de réunion
  meetingId String?
  meeting   Meeting? @relation(fields: [meetingId], references: [id], onDelete: SetNull)

  @@index([clientId, meetingId])
}
```

## 5.4 Migration

`apps/api/prisma/migrations/<YYYYMMDDHHMMSS>_rfc_meet_001_meetings/migration.sql`, en-tête `-- RFC-MEET-001 Meetings`.

Conventions (modèle : [`20260724120000_rfc_capa_001_capacity`](../../apps/api/prisma/migrations/20260724120000_rfc_capa_001_capacity/migration.sql)) :

- `CREATE TYPE` explicite pour chaque enum ; `ADD COLUMN IF NOT EXISTS` pour `EmailDelivery.meetingId` (idempotence — cf. [INCIDENT-2026-05-06](../INCIDENT-2026-05-06-PRISMA-MIGRATIONS.md)).
- Toute table : `clientId TEXT NOT NULL`, FK `Client` `ON DELETE CASCADE`, index `(clientId)`, uniques préfixés `clientId` ou portés par le parent.
- **FK composites tenant-scopées** pour les références inter-entités : index unique `("clientId","id")` sur `Project`, `ProjectReview`, `ProjectTask`, `ProjectTaskPhase`, `ProjectRisk`, `GovernanceCycleInstance` puis FK `("clientId", "<fk>")` — garantit au niveau SQL qu'une réunion ne peut jamais référencer une entité d'un autre client.
- `prisma migrate deploy` en **job one-shot de release**, jamais au boot applicatif.

## 5.5 Seed

- `ensureMeetingsModuleAndPermissions()` — modèle `ensureCapacityModuleAndPermissions()` ([`seed.ts:1338`](../../apps/api/prisma/seed.ts)) : upsert du `Module` `meetings` + les 5 `Permission`.
- `ensureSystemMeetingTemplates()` — pour chaque client, upsert des 9 templates système et de leurs sections depuis `lib/system-meeting-templates.ts` (`upsert` sur `(clientId, code)` : ré-exécutable sans effet de bord, ne réécrit pas `isHidden` ni les sections déjà personnalisées d'une **copie** client).
- `apps/api/prisma/seed-meetings-demo.ts` — jeu de démonstration : un CODIR `FINALIZED` (6 projets, quorum atteint, 3 décisions dont une `MACRO_TASK`), un COPIL `SCHEDULED`, un COPRO `PREPARING` sans date, 2 points bloquants dont un `ESCALATED`.

---

# 6. Tests

## 6.1 Backend — `apps/api/src/modules/meetings/tests/`

| Fichier | Couvre |
| --- | --- |
| `meetings.service.spec.ts` | Transitions valides et refusées, `schedule` sans date → `MEETING_SCHEDULE_REQUIRES_DATE`, `scope = PROJECT` sans projet → `MEETING_SCOPE_REQUIRES_PROJECT`, compte rendu refusé hors `FINALIZED` |
| `meeting-attendance.service.spec.ts` | Check-in, idempotence, délégation (un délégué ne compte pas deux fois), calcul de quorum avec `requiredRatio`, pré-remplissage depuis les cercles `COPIL` / `COPROJ` |
| `meeting-deck.service.spec.ts` | Ordre des sections, section désactivée absente, **projet hors périmètre retiré + `partial.reason = 'ACCESS_FILTERED'`**, module `capacity` absent → `SOURCE_UNAVAILABLE` sans 500, `FINALIZED` sert le snapshot et non le live |
| `meeting-project-review-bridge.service.spec.ts` | 1 `ProjectReview` par `MeetingProject`, idempotence sur double `schedule`, mapping `MeetingTemplateKind → ProjectReviewType`, retrait d'un projet = déliaison sans suppression, projet inaccessible → `403` |
| `meeting-decisions.service.spec.ts` | Cohérence `scope` / champs (`MACRO_TASK` sans phase ni tâche → `MEETING_DECISION_SCOPE_MISMATCH`), propagation `PROJECT` → `ProjectReviewDecision`, propagation `MEETING` + instance → `GovernanceCycleInstanceDecision`, **aucune écriture directe sur `Project.arbitration*Status`** |
| `meeting-blockers.service.spec.ts` | Détection des 4 familles de candidats, promotion conserve `taskId` / `riskId`, candidat déjà promu non reproposé, résolution renseigne `resolvedAtMeetingId` |
| `meeting-templates.service.spec.ts` | Duplication d'un template système, template système non supprimable (`409`), portée immuable (`409`), `FREE_TEXT` instanciable N fois, réordonnancement |
| `meetings-snapshot.builder.spec.ts` | **Aucune URL de réunion, aucune URL de pièce jointe, aucun e-mail externe** dans le snapshot (test miroir de `snapshotContainsSensitiveUrls`) |
| `meetings-isolation.spec.ts` | **Aucune fuite inter-clients** : lecture, écriture, deck, templates, blockers — chaque route testée avec un `clientId` étranger |
| `meetings-permissions.spec.ts` | Métadonnées des guards sur chaque handler, `meetings.conduct` requis pour `start` / `finalize` / `check-in` / décisions |
| `meetings-seed-permissions.spec.ts` | Modèle [`capacity-seed-permissions.spec.ts`](../../apps/api/src/modules/capacity/tests/capacity-seed-permissions.spec.ts) : le module et les 5 permissions sont déclarés dans `seed.ts` et `default-profiles.json` |
| `dto/*.spec.ts` | `ValidationPipe` : champs requis, longueurs, `scope` / `sectionType` hors enum rejetés, `clientId` absent des DTO |

## 6.2 Frontend

Voir RFC-FE-MEET-001 §Tests.

## 6.3 Commandes de vérification

```bash
pnpm --filter @starium-orchestra/api test -- meetings
pnpm --filter @starium-orchestra/api prisma:generate
pnpm typecheck
pnpm lint
```

---

# 7. Récapitulatif — lots

| Lot | Contenu | État |
| --- | --- | --- |
| **A** | Prisma (10 modèles, 13 enums) + migration + `MeetingsModule` + CRUD réunions + templates système au seed + RBAC | ❌ à faire |
| **B** | `meeting-deck.service` : agrégation des 16 sections + `GET /meetings/:id/deck` + filtrage `AccessDecisionService` | ❌ à faire |
| **C** | Cycle de vie complet + appel / émargement + quorum + `meeting-project-review-bridge` (+ correctif enum §3.3) | ❌ à faire |
| **D** | Décisions et arbitrages (dont `MACRO_TASK`) + propagation vers `ProjectReview` / `GovernanceCycleInstance` | ❌ à faire |
| **E** | Registre des points bloquants + détection et promotion des candidats | ❌ à faire |
| **F** | FE — liste et workspace de préparation ([RFC-FE-MEET-001](./RFC-FE-MEET-001%20%E2%80%94%20UI%20R%C3%A9unions%20%E2%80%94%20pr%C3%A9paration%2C%20conduite%20et%20pr%C3%A9sentation.md)) | ❌ à faire |
| **G** | FE — conduite et mode présentation | ❌ à faire |
| **H** | Exports PDF / PPTX + compte rendu e-mail + `EmailDelivery.meetingId` | ❌ à faire |
| **I** | FE — administration des templates client | ❌ à faire |
| **J** | Convergence : alertes réunion, bandeau sur l'onglet « Points projet », deep-links, manuel utilisateur | ❌ à faire |

Ordre recommandé : **A → C → B → D → E**, puis **F → G → H → I**, **J** en clôture. C avant B parce que le pont conditionne le contrat du deck.

---

# 8. Points de vigilance

| # | Sujet | Traitement |
| --- | --- | --- |
| 1 | **`ProjectReview.projectId` obligatoire** → pas de comité portefeuille | Raison d'être de `Meeting` ; le pont crée N reviews, jamais de review sans projet |
| 2 | **Trois modèles de séance** (`ProjectReview`, `GovernanceCycleInstance`, `Meeting`) | Les règles §1.1-2 et §1.1-3 arbitrent : `Meeting` orchestre, **ne devient jamais une troisième vérité**. À relire à chaque évolution du module |
| 3 | **Risque de double saisie** — conséquence directe du choix « surcouche » | Aucune entité action propre au module ; les décisions `PROJECT` / `MACRO_TASK` sont répliquées, pas ressaisies. Si le couplage devient un frein, l'absorption de `ProjectReview` reste l'option V2 |
| 4 | **Volumétrie du deck portefeuille** (N projets × 16 sections) | Le deck appelle le snapshot builder par projet : coût linéaire. Garde-fou `MEETING_MAX_PROJECTS` (défaut 30), pagination du périmètre, `staleTime` côté FE |
| 5 | **Fuite inter-clients par référence croisée** | FK composites tenant-scopées au niveau SQL (§5.4) — la base refuse la référence même en cas de bug applicatif |
| 6 | **Sur-exposition par le deck** | Le deck est la route la plus exposée du module : elle traverse projets, budgets, risques et capacité. `AccessDecisionService` par projet est **obligatoire**, testé par `meeting-deck.service.spec.ts` |
| 7 | **`EmailDelivery` ne connaît que `projectReviewId`** | Ajout de `meetingId?` (§5.3) |
| 8 | **Aucune règle d'alerte réunion** | 4 règles ajoutées (§4.9) |
| 9 | **Désynchronisation de types** : le TS `ProjectReviewType` n'expose que 7 des 12 valeurs Prisma | **Correctif préalable au lot C** — sinon le pont ne peut pas écrire `ARBITRATION`, `BUDGET_REVIEW`, `CRISIS_POINT` |
| 10 | **Deck CODIR persisté en `localStorage`** (`committee-codir-page-settings`) | La configuration devient serveur. Migration douce : à la première ouverture du module, proposer d'importer les réglages locaux dans un template client |
| 11 | **Catalogue de sections fermé** | Un client ne peut pas créer un **type** de section (cela suppose du code d'agrégation). Échappatoire : `FREE_TEXT` instanciable N fois avec titre libre. À exposer clairement dans l'UI d'administration |
| 12 | **Portée de template immuable** | Basculer `PROJECT` ↔ `PORTFOLIO` casserait l'inscription des projets et le pont. Deux templates distincts — plus lisible à l'usage |
| 13 | **Pas de récurrence de série** | `cadence` informatif + duplication. Une vraie série (`MeetingSeries`) est une évolution assumée |
| 14 | **Charge de préparation non imputée** | `CapacityAllocationSourceType` n'a pas de valeur réunion. Hors périmètre V1 |
| 15 | **Adoption** | La valeur du module dépend de la fraîcheur des données projet. Si phases, jalons, risques et liens budgétaires ne sont pas tenus, les sections seront vides et le réflexe PowerPoint reviendra. **Le lot B est le test réel du module** |

---

# 9. Conformité by design

## 9.1 RGPD

| Item | Traitement |
| --- | --- |
| **DCP concernées** | Identité des participants (`userId`, `displayName`, `roleLabel`), **e-mail de participant externe** (`MeetingAttendee.externalEmail`), **données de présence** (`attendanceStatus`, `checkedInAt`, `delegateOfAttendeeId`) |
| **Finalité** | Preuve de gouvernance : établir qui a décidé quoi, quand, en présence de qui |
| **Base légale** | Intérêt légitime de l'organisation cliente (pilotage interne) ; le client reste responsable de traitement, Starium sous-traitant |
| **Minimisation** | Aucun e-mail affiché en UI (règle déjà appliquée côté points projet) ; pas de commentaire libre sur une personne ; `externalEmail` uniquement si le participant n'a pas de compte |
| **Rétention** | Alignée sur le projet et l'exercice de gouvernance du client ; purge en cascade `onDelete: Cascade` depuis `Client` |
| **Effacement / anonymisation** | `onDelete: SetNull` sur `userId` / `resourceId` : la suppression d'un compte laisse la trace de gouvernance sans identifier la personne. Le snapshot conserve `displayName` — à neutraliser sur demande d'effacement via la procédure existante |
| **Export** | Le compte rendu et l'export PDF valent réponse au droit d'accès sur les réunions concernées |
| **Logs** | `meetingUrl`, `externalEmail` et `MeetingAttachment.url` **jamais** en clair dans l'audit ni dans le snapshot (test dédié `meetings-snapshot.builder.spec.ts`) |
| **Scope client** | Toute donnée porte `clientId` ; aucune requête sans filtre client |

## 9.2 RGAA / WCAG 2.1 AA

- **Mode présentation** : navigation clavier complète (`←` / `→` / `Échap` / `Début` / `Fin`), `aria-live="polite"` sur le changement de slide annonçant le titre de section et la position (`3 sur 8`), respect de `prefers-reduced-motion` (transitions supprimées), contraste ≥ 4.5:1 y compris sur les thèmes sombres.
- **Alternative non-diaporama obligatoire** : chaque section est consultable en vue liste ; le diaporama n'est jamais le seul accès à l'information.
- **Appel** : `<table>` sémantique, `<label>` explicite sur chaque contrôle de statut, changement de statut annoncé via `aria-live`, quorum exposé en texte (pas seulement en jauge colorée).
- **Information jamais portée par la couleur seule** : santé projet, sévérité de blocage et statut de présence portent toujours un libellé ou une icône en plus de la couleur.
- `lang="fr"`, `focus-visible` sur tous les éléments interactifs.

## 9.3 Design System

- Composants imposés : `PageHeader`, `PageContainer`, `KpiCard`, `Table` / `StariumTableWrap`, `FilterBar`, `EmptyState`, `LoadingState`, `ErrorState`, `IconButton`.
- **Toute modale passe par `StariumModal`** ([`form-dialog-shell.tsx`](../../apps/web/src/components/layout/form-dialog-shell.tsx)) ; import direct de `Dialog*` interdit hors socle. Vérification : `pnpm audit:modals`.
- **États loading / empty / error par section** — une section sans donnée affiche un `EmptyState` explicite, jamais un bloc vide.
- Tokens uniquement : aucune couleur ni espacement en dur ; icônes **Lucide** ; aucun emoji dans l'UI.
- **Libellés métier, jamais d'ID** : projets par `name`, personnes par nom d'affichage, phases par `name`, sections par leur libellé. `entityLabel` des alertes = titre de la réunion.
- Réutilisation : widgets et slides de [`committee-presentation/`](../../apps/web/src/features/projects/committee-presentation/), générateur PDF `codir-minimal-pdf.ts`, planning macro [`build-macro-planning-gantt.ts`](../../apps/web/src/features/projects/lib/build-macro-planning-gantt.ts), matrice de risques [`risk-criticality-matrix.ts`](../../apps/web/src/features/projects/risks/lib/risk-criticality-matrix.ts).

## 9.4 Sécurité

- Chaîne de guards `JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard` sur **tous** les controllers.
- `clientId` **toujours** dérivé du contexte actif ; **jamais** accepté dans un body ou une query.
- **Re-filtrage `AccessDecisionService` projet par projet** sur toute lecture agrégée (§4.8-1) et sur toute inscription de projet.
- DTO `class-validator` sur **tous** les écrits ; enums validés ; longueurs bornées.
- Isolation garantie **jusqu'au niveau SQL** par FK composites tenant-scopées (§5.4).
- Audit complet des actions sensibles (§4.12), sans DCP ni URL en clair.
- Pas de sur-exposition : le deck ne renvoie que les projets autorisés et signale explicitement le filtrage.

## 9.5 Interface mobile

- Testé **dès 320px**. Cibles tactiles ≥ 44×44px sur tous les contrôles, en particulier les boutons de pointage de l'appel.
- **L'appel est utilisable au téléphone** — c'est l'usage mobile prioritaire : liste en cartes, un contrôle de statut par personne, quorum en en-tête collant.
- Liste des réunions en cartes sous `md` ; workspace de préparation en accordéon de sections.
- Tableaux denses (synthèse portefeuille, budget) en scroll horizontal **contenu dans son conteneur** — la page ne défile jamais horizontalement ; troncature + tooltip.
- **Mode présentation désactivé sous `md`**, avec bascule automatique vers la vue liste et message explicite.
- Aucune interaction dépendant du survol.

---

# 10. Definition of Done

- [ ] `pnpm typecheck`, `pnpm lint` et `pnpm test` passent
- [ ] `pnpm audit:modals` passe (0 `DialogContent` direct hors socle)
- [ ] Migration appliquée par `prisma migrate deploy` en job one-shot
- [ ] Isolation client vérifiée par `meetings-isolation.spec.ts` sur **chaque** route
- [ ] Permissions `meetings.*` enforcées et couvertes par `meetings-permissions.spec.ts`
- [ ] Seed idempotent : `ensureMeetingsModuleAndPermissions` + `ensureSystemMeetingTemplates` ré-exécutables
- [ ] Snapshot sans URL ni e-mail externe (test dédié)
- [ ] Deck testé avec un projet hors périmètre → filtré et signalé
- [ ] RGAA : clavier, `aria-live`, contrastes AA, alternative non-diaporama
- [ ] Mobile : validé dès 320px, appel utilisable au téléphone
- [ ] Libellés métier partout, aucun ID technique visible
- [ ] [`docs/API.md`](../API.md), [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) §7 et [`_RFC Liste.md`](./_RFC%20Liste.md) à jour
- [ ] Aucun fichier hors périmètre modifié
