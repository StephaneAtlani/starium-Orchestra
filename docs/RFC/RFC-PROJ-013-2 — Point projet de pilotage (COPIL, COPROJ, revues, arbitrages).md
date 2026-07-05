# RFC-PROJ-013-2 — Point projet de pilotage

## COPIL, COPROJ, revues projet, arbitrages et rituels de gouvernance

## Statut

**Proposé** — reorientation produit et plan d’implémentation. Cette RFC **complète** **RFC-PROJ-013** (socle) et **reoriente** l’approche centrée « réunion » de **RFC-PROJ-013-1** vers un **artefact de pilotage**.

> **Note de numérotation** : l’identifiant **RFC-PROJ-014** est déjà réservé au référentiel *Catégories du portefeuille projets*. Ce lot porte donc le numéro **RFC-PROJ-013-2**.

## Dépendances

* **RFC-PROJ-013** — Points Projet COPIL/COPRO et Historisation (socle `ProjectReview`, participants, décisions, actions, snapshot)
* **RFC-PROJ-013-1** — Cycle de vie réunion (Phases 1–3 livrées : statuts `PLANNED` / `IN_REVIEW`, logistique réunion, invitations)
* **RFC-PROJ-001** — Cadrage fonctionnel Projets
* **RFC-PROJ-009** — Audit logs
* **RFC-PROJ-012** — Project Sheet
* **RFC-PROJ-018** — ProjectRisk EBIOS RM minimal (référence risques depuis un point)
* **RFC-PROJ-DOC-001** — Registre documents projet (références `documentId` sur pièces jointes)

**Hors périmètre direct (lots ultérieurs ou existants)** :

* **RFC-PROJ-INT-001** / **INT-004** / **INT-005** — Microsoft 365 (Teams, calendrier) : moyens logistiques secondaires
* **RFC-038** — Notifications in-app (invitations)

---

## 0. Analyse de l’existant

### 0.1 Ce qui est déjà en place (RFC-PROJ-013 + RFC-PROJ-013-1)

| Domaine | État actuel | Référence code |
| ------- | ----------- | -------------- |
| Entité `ProjectReview` | ✅ | `apps/api/prisma/schema.prisma` — champs réunion, snapshot, facilitateur, finalisation |
| Types de point | ✅ partiel | `COPIL`, `COPRO`, `CODIR_REVIEW`, `RISK_REVIEW`, `MILESTONE_REVIEW`, `AD_HOC`, `POST_MORTEM` |
| Cycle de vie | ✅ orienté réunion | `PLANNED` → `IN_REVIEW` → `FINALIZED` / `CANCELLED` (+ `DRAFT` legacy) |
| Participants | ✅ | `ProjectReviewParticipant` — présence, `externalEmail` (Phase 3) |
| Ordre du jour | ✅ partiel | `ProjectReviewAgendaItem` — titre, description, ordre, durée, owner, notes, `decisionSummary` |
| Décisions | ✅ minimal | `ProjectReviewDecision` — titre, description, lien agenda |
| Actions | ✅ | `ProjectReviewActionItem` + `ProjectReviewActionItemContributor` — responsable unique |
| Snapshot | ✅ | Généré au `finalize` — contrat léger projet / risques / budget |
| API | ✅ | CRUD revue, `finalize`, `cancel`, `start-review`, agenda, participants, decisions, actions, `invite` |
| Frontend | ✅ | Onglet Points projet, éditeur dialogue, deep links `?openReview=` |

### 0.2 Écarts par rapport à la cible de cette RFC

| Besoin cible | Écart |
| ------------ | ----- |
| Point créable **sans date** de réunion | `reviewDate` est **obligatoire** aujourd’hui |
| Cycle `PREPARING` avant planification | Absent — `PLANNED` suppose une réunion à venir |
| Statuts sémantiques pilotage | `PLANNED` / `IN_REVIEW` nomment la logistique, pas la préparation / tenue |
| Types rituels complets | Manquent `PROJECT_REVIEW`, `BUDGET_REVIEW`, `ARBITRATION`, `CRISIS_POINT` ; libellés UI à harmoniser |
| `objective`, période couverte | Absents — `executiveSummary` / `contentPayload` partiellement utilisés |
| Agenda typé | Pas de `type`, `objective`, `expectedDecision` sur `ProjectReviewAgendaItem` |
| Pièces jointes structurées | Pas de modèle `ProjectReviewAttachment` |
| Décisions typées / statutées | Pas de `decisionType`, `status`, `decidedBy`, `impact` |
| Snapshot orienté compte rendu pilotage | Snapshot actuel = synthèse projet, pas CR structuré par ODJ |
| UI orientée onglets pilotage | Éditeur monolithique — pas de navigation `Vue générale / ODJ / …` |
| Logistique secondaire | UI et parcours encore fortement centrés réunion / invitation |

### 0.3 Hypothèses

1. **Compatibilité** : on conserve le nom technique `ProjectReview` et les routes `/reviews` existantes ; évolution additive + migration de statuts.
2. **RFC-PROJ-013-1 non supprimée** : invitations Teams/email restent disponibles en Phase E ; cette RFC change la **priorité UX** et le **modèle de statuts**, pas l’investissement déjà livré.
3. **`POST_MORTEM`** : règles RFC-PROJ-013 (projets clos uniquement) restent valides ; type conservé dans l’enum cible.
4. **Risques** : le registre `ProjectRisk` (RFC-PROJ-018) reste la source ; le point projet ne fait que **référencer / discuter / tracer** des risques existants ou des signaux faibles (lot ultérieur pour création depuis ODJ).
5. **Documents** : rattachement via `ProjectDocument` existant (`DOCUMENT_REFERENCE`) ou URL externe ; pas d’upload binaire nouveau dans ce lot (aligné RFC-PROJ-DOC-001 MVP).

---

# 1. Objectif

Recentrer le module **Points projet** de Starium Orchestra sur sa vraie finalité métier :

> **Préparer, tenir, tracer et historiser un point de pilotage projet.**

Un point projet n’est pas une simple réunion Teams ou un événement calendrier.
C’est un **artefact de gouvernance** permettant de piloter un projet via :

* un objectif clair ;
* un ordre du jour structuré ;
* des documents et liens associés ;
* des participants ;
* des décisions ;
* des actions ;
* des responsables ;
* des intervenants ;
* des risques ;
* des arbitrages ;
* un snapshot final historisé.

Teams, email et calendrier sont des **moyens logistiques secondaires**.

---

# 2. Problème à corriger

La conception précédente (RFC-PROJ-013-1) était trop centrée sur :

```text
Créer une réunion
→ planifier
→ inviter
→ démarrer
→ finaliser
```

Or, dans Starium Orchestra, le besoin métier est plutôt :

```text
Créer un point projet
→ préparer l’ordre du jour
→ joindre les documents utiles
→ ajouter les participants
→ planifier si besoin
→ tenir le point
→ tracer décisions/actions/arbitrages
→ figer le compte rendu de pilotage
```

Le cœur du module doit donc être le **pilotage**, pas la logistique de réunion.

---

# 3. Positionnement produit

Le module doit permettre de gérer différents rituels projet :

* COPIL ;
* COPROJ ;
* revue projet ;
* revue jalon ;
* comité risque ;
* revue budgétaire ;
* arbitrage projet ;
* point de crise projet ;
* revue post-mortem / retour d’expérience.

Chaque point projet doit devenir une **preuve de pilotage**.

---

# 4. Non-objectifs

Cette RFC ne vise pas à faire de Starium :

* un outil de visioconférence ;
* un clone Teams ;
* un agenda Outlook ;
* un outil de prise de notes générique ;
* un outil de compte rendu isolé.

Les fonctionnalités suivantes restent secondaires ou dans des lots ultérieurs :

* création automatique Teams ;
* invitation Outlook ;
* email externe ;
* transcription IA ;
* génération automatique de compte rendu ;
* intégration Microsoft Graph avancée.

---

# 5. Cycle de vie cible

Le cycle de vie recommandé est :

```text
PREPARING
→ SCHEDULED
→ IN_PROGRESS
→ FINALIZED
→ CANCELLED
```

## 5.1 PREPARING — Préparation

Le point projet existe, mais il n’est pas forcément planifié.

Actions possibles :

* définir le type de point ;
* définir l’objectif ;
* préparer l’ordre du jour ;
* ajouter documents et liens ;
* ajouter participants ;
* préparer les sujets à arbitrer ;
* rattacher des risques ;
* rattacher des actions à revoir.

## 5.2 SCHEDULED — Planifié

Le point projet est planifié.

Actions possibles :

* définir date / heure ;
* définir mode : présentiel, visio, hybride ;
* définir lieu ou lien ;
* envoyer invitation si activée ;
* modifier les informations logistiques ;
* continuer à préparer l’ordre du jour.

## 5.3 IN_PROGRESS — En cours de tenue

Le point projet est en cours.

Actions possibles :

* traiter les points d’ordre du jour ;
* saisir les notes ;
* prendre des décisions ;
* créer des actions ;
* assigner un responsable ;
* ajouter des intervenants ;
* enregistrer les arbitrages ;
* mettre à jour les risques.

## 5.4 FINALIZED — Finalisé

Le point projet est figé.

Actions possibles :

* consulter le compte rendu ;
* consulter le snapshot ;
* suivre les actions générées ;
* exporter si besoin ;
* créer le prochain point projet.

## 5.5 CANCELLED — Annulé

Le point projet est annulé.

Actions possibles :

* consulter en lecture seule ;
* conserver l’historique.

### 5.6 Mapping avec l’existant (RFC-PROJ-013-1)

| Statut actuel (`ProjectReviewStatus`) | Statut cible | Règle de migration |
| ------------------------------------- | ------------ | ------------------ |
| `DRAFT` (legacy) | `PREPARING` ou `IN_PROGRESS` | Selon présence de `startedAt` |
| `PLANNED` | `SCHEDULED` | Si `reviewDate` renseignée ; sinon `PREPARING` |
| `IN_REVIEW` | `IN_PROGRESS` | Direct |
| `FINALIZED` | `FINALIZED` | Inchangé |
| `CANCELLED` | `CANCELLED` | Inchangé |

> Les anciennes valeurs restent en **legacy temporaire** dans l’enum Prisma le temps de la migration applicative ; le code applicatif n’écrit plus que les nouvelles valeurs.

---

# 6. Modèle métier cible

## 6.1 ProjectReview / ProjectPoint

Nom technique : conserver **`ProjectReview`** pour compatibilité API et Prisma.
Nom métier UI : **Point projet**.

Champs principaux (cible — *italique* = absent ou incomplet aujourd’hui) :

```text
id
clientId
projectId
type                    (reviewType)
title
objective               ← executiveSummary ou nouveau champ dédié
periodStart?            ← nouveau
periodEnd?              ← nouveau
status
reviewDate?             ← rendre optionnel en PREPARING
durationMinutes?        ← nouveau
facilitatorUserId?
meetingMode?
location?
meetingUrl?
createdByUserId?        ← nouveau (audit / traçabilité)
startedAt?
startedByUserId?
finalizedAt?
finalizedByUserId?
cancelledAt?            ← nouveau
cancelledByUserId?      ← nouveau
createdAt
updatedAt
```

Champs conservés sans changement sémantique majeur : `contentPayload`, `snapshotPayload`, `nextReviewDate`, champs Microsoft (`microsoftOnlineMeetingId`, `microsoftEventId`, …).

## 6.2 ProjectReviewType

Enum cible (évolution de l’existant) :

```text
COPIL
COPRO
PROJECT_REVIEW          ← nouveau (ou alias CODIR_REVIEW legacy)
MILESTONE_REVIEW
RISK_REVIEW
BUDGET_REVIEW           ← nouveau
ARBITRATION             ← nouveau
CRISIS_POINT            ← nouveau
POST_MORTEM
OTHER                   ← remplace AD_HOC
```

Libellés UI (valeur affichée, pas clé enum) :

| Enum | Libellé UI |
| ---- | ---------- |
| `COPIL` | Comité de pilotage |
| `COPRO` | Comité projet |
| `PROJECT_REVIEW` | Revue projet |
| `MILESTONE_REVIEW` | Revue jalon |
| `RISK_REVIEW` | Comité risque |
| `BUDGET_REVIEW` | Revue budgétaire |
| `ARBITRATION` | Arbitrage |
| `CRISIS_POINT` | Point de crise |
| `POST_MORTEM` | Retour d’expérience |
| `OTHER` | Autre |

**Migration enum** : `CODIR_REVIEW` → `PROJECT_REVIEW` ; `AD_HOC` → `OTHER` (mapper données + conserver legacy en lecture seule temporaire).

---

# 7. Ordre du jour structuré

Entité existante à **enrichir** : `ProjectReviewAgendaItem`.

Champs cibles :

```text
id
clientId
projectReviewId
title
description?
objective?              ← nouveau
type                    ← nouveau (enum)
orderIndex
plannedDurationMinutes?
ownerUserId?
status
expectedDecision?       ← nouveau
notes?
decisionSummary?
createdAt
updatedAt
```

## 7.1 Type de point d’ordre du jour

```text
INFORMATION
DECISION
ARBITRATION
RISK
ACTION_REVIEW
BUDGET
MILESTONE
OTHER
```

## 7.2 Statut d’un point d’ordre du jour

```text
TODO
IN_PROGRESS
DONE
SKIPPED
```

(déjà aligné avec `ProjectReviewAgendaItemStatus`)

## 7.3 Règles métier

| Statut point projet | Règles ODJ |
| ------------------- | ---------- |
| `PREPARING` | ODJ éditable ; documents/liens éditables ; notes de tenue **non** éditables |
| `SCHEDULED` | ODJ éditable ; documents/liens éditables ; logistique éditable |
| `IN_PROGRESS` | Points démarrables / clôturables / reportables ; notes éditables ; décisions et actions créables ; nouveaux points ajoutables |
| `FINALIZED` / `CANCELLED` | Lecture seule |

---

# 8. Documents et liens

**Nouvelle entité** : `ProjectReviewAttachment`.

Objectif : rattacher un document ou un lien au point projet ou à un élément précis.

Champs :

```text
id
clientId
projectReviewId
agendaItemId?
decisionId?
actionItemId?
type
title
description?
url?
documentId?             → ProjectDocument.id si DOCUMENT_REFERENCE
fileName?
mimeType?
sizeBytes?
uploadedByUserId?
createdAt
updatedAt
```

## 8.1 Type d’attachement

```text
FILE
URL
DOCUMENT_REFERENCE
POWERBI_LINK
SHAREPOINT_LINK
OTHER
```

## 8.2 Règles métier

Un document ou lien peut être rattaché à :

* tout le point projet ;
* un point d’ordre du jour ;
* une décision ;
* une action ;
* un risque (lot ultérieur).

Exemples métier : budget actualisé, CR précédent, dashboard Power BI, devis fournisseur, lien SharePoint, support COPIL.

---

# 9. Participants

Entité existante : `ProjectReviewParticipant` — champs largement alignés.

Champs cibles :

```text
id
clientId
projectReviewId
userId?
displayName?
roleLabel?
attendanceStatus
externalEmail?          // uniquement si lot email activé (RFC-PROJ-013-1 Phase 3)
invitedAt?
lastInvitedAt?
lastEmailedAt?
createdAt
updatedAt
```

## 9.1 Statut de présence

```text
EXPECTED
PRESENT
ABSENT
EXCUSED
```

(déjà en place)

## 9.2 Règles métier

* participant interne : `userId` — libellé UI = nom / email utilisateur, **jamais** UUID seul ;
* participant externe : `displayName` (+ `externalEmail` si fonctionnalité email activée) ;
* pas d’email dans les audits ou logs ;
* présence modifiable pendant la tenue du point (`IN_PROGRESS`).

---

# 10. Décisions

Entité existante à **enrichir** : `ProjectReviewDecision`.

Champs recommandés :

```text
id
clientId
projectReviewId
agendaItemId?
title
description?
decisionType?           ← nouveau
status                  ← nouveau
decidedByUserId?        ← nouveau
decidedAt?              ← nouveau
impact?                 ← nouveau
createdAt
updatedAt
```

## 10.1 Types de décision

```text
GO
NO_GO
ARBITRATION
BUDGET_VALIDATION
SCOPE_CHANGE
RISK_ACCEPTANCE
PRIORITY_CHANGE
OTHER
```

## 10.2 Statut de décision

```text
DRAFT
VALIDATED
REJECTED
SUPERSEDED
```

---

# 11. Actions

Entité existante : `ProjectReviewActionItem` + `ProjectReviewActionItemContributor`.

Champs recommandés (compléments) :

```text
decisionId?             ← lien explicite vers décision
description?            ← si absent
priority?               ← aligner ProjectTaskPriority ou champ dédié
```

## 11.1 Responsable unique

Règle obligatoire :

```text
Une action = un responsable unique (responsibleUserId).
```

Le responsable est accountable : porte l’action, met à jour l’avancement, relance les intervenants, clôture ou demande la clôture.

## 11.2 Intervenants

Entité : `ProjectReviewActionItemContributor` (existant).

Règle :

```text
Une action peut avoir 0 à n intervenants.
Les intervenants contribuent mais ne portent pas la responsabilité finale.
```

---

# 12. Risques et arbitrages

Les risques peuvent être :

* rattachés au module risque existant (**RFC-PROJ-018**) ;
* référencés depuis un point d’ordre du jour (`type = RISK` ou `ARBITRATION`) ;
* créés comme signal faible pendant la tenue (lot ultérieur).

Règle de conception :

```text
Le point projet ne remplace pas le registre des risques.
Il permet de discuter, arbitrer et tracer l’évolution d’un risque.
```

Table de liaison suggérée (Phase C+) : `ProjectReviewRiskReference` (`projectReviewId`, `agendaItemId?`, `projectRiskId`, `discussionNotes?`, `arbitrationSummary?`).

---

# 13. Logistique de réunion

Les champs logistiques restent **secondaires** — déjà présents via RFC-PROJ-013-1.

Champs :

```text
reviewDate?
durationMinutes?
meetingMode?
location?
meetingUrl?
microsoftOnlineMeetingId?
microsoftEventId?
```

## 13.1 Mode de réunion

```text
ONSITE
REMOTE
HYBRID
```

## 13.2 Règles

* `meetingUrl` autorisé uniquement pour `REMOTE` ou `HYBRID` ;
* `location` autorisé pour `ONSITE` ou `HYBRID` ;
* `meetingUrl` **jamais** dans les audits, logs ni snapshots ;
* Teams / email / calendrier = moyens logistiques ; exposés en UI **après** la préparation pilotage (Phase E).

---

# 14. Snapshot final

À la finalisation, générer un snapshot figé orienté **compte rendu de pilotage** (évolution du builder existant `project-reviews-snapshot.builder.ts`).

Le snapshot doit contenir :

```text
Informations générales du point
Type de point
Projet
Objectif
Période couverte
Date réelle
Animateur
Participants + présence
Ordre du jour dans l’ordre
Documents et liens référencés (titres / types — pas d’URL sensibles)
Notes par point
Décisions prises
Actions créées
Responsables
Intervenants
Risques abordés
Arbitrages
Points non traités
Prochaines étapes
```

Le snapshot ne doit **jamais** contenir :

```text
meetingUrl
externalEmail
token Teams
lien confidentiel
donnée sensible non nécessaire
```

---

# 15. Écran cible

L’écran principal doit être orienté **pilotage** (évolution de `project-review-editor-dialog.tsx` ou page dédiée `/projects/:id/reviews/:reviewId`).

## 15.1 Onglets

```text
Vue générale
Ordre du jour
Participants
Décisions
Actions
Documents & liens
Historique
```

## 15.2 Formulaire « Créer / éditer un point projet »

Champs :

```text
Type de point
Projet
Titre
Objectif du point
Période couverte
Statut (lecture seule — dérivé du cycle)
Date et heure (optionnel en PREPARING)
Durée
Mode
Lieu ou lien de réunion
Animateur
Participants
Documents / liens
Notes préparatoires
```

## 15.3 Formulaire « Ajouter un point à l’ordre du jour »

Champs :

```text
Titre
Description
Type
Responsable
Durée prévue
Document ou lien associé
Décision attendue
```

## 15.4 Formulaire « Créer une action »

Champs :

```text
Titre
Description
Responsable unique
Intervenants
Échéance
Priorité
Statut
Lien avec décision
Lien avec point d’ordre du jour
```

---

# 16. API cible

Préfixe existant : `/api/projects/:projectId/reviews`. Évolution additive.

## 16.1 Points projet

```http
POST   /api/projects/:projectId/reviews
GET    /api/projects/:projectId/reviews
GET    /api/projects/:projectId/reviews/:reviewId
PATCH  /api/projects/:projectId/reviews/:reviewId
POST   /api/projects/:projectId/reviews/:reviewId/schedule    ← PLANNED → SCHEDULED (ex-start-review étendu)
POST   /api/projects/:projectId/reviews/:reviewId/start         ← SCHEDULED|PREPARING → IN_PROGRESS
POST   /api/projects/:projectId/reviews/:reviewId/finalize
POST   /api/projects/:projectId/reviews/:reviewId/cancel
```

> Routes existantes `start-review`, `invite` : mapper vers `start` / conserver `invite` en Phase E.

## 16.2 Ordre du jour

```http
POST   …/agenda-items
PATCH  …/agenda-items/:agendaItemId
PATCH  …/agenda-items/reorder
POST   …/agenda-items/:agendaItemId/start
POST   …/agenda-items/:agendaItemId/complete
POST   …/agenda-items/:agendaItemId/skip
```

## 16.3 Documents et liens

```http
POST   …/attachments
PATCH  …/attachments/:attachmentId
DELETE …/attachments/:attachmentId
```

## 16.4 Participants

(déjà en place — enrichir validation selon statut)

```http
POST   …/participants
PATCH  …/participants/:participantId
DELETE …/participants/:participantId
```

## 16.5 Décisions

```http
POST   …/decisions
PATCH  …/decisions/:decisionId
```

## 16.6 Actions

```http
POST   …/action-items
PATCH  …/action-items/:actionItemId
```

Permissions : voir §17.

---

# 17. Droits et sécurité

Permissions recommandées (évolution RBAC) :

```text
projects.read
projects.update
projects.review.create
projects.review.prepare
projects.review.conduct
projects.review.finalize
projects.review.cancel
```

Règles :

* toutes les requêtes sont scopées par `clientId` (dérivé du scope auth, jamais du body seul) ;
* chaque point projet appartient à un projet et à un client ;
* les documents sont visibles selon les droits projet / document ;
* un utilisateur externe ne reçoit jamais d’accès automatique à la plateforme ;
* données sensibles (`meetingUrl`, `externalEmail`, tokens) jamais dans logs / audits / snapshots.

**Phase A–D** : réutiliser `projects.read` / `projects.update` comme aujourd’hui ; affiner les permissions granulaires en lot RBAC dédié si nécessaire.

---

# 18. Audit logs

Événements recommandés (extension de `project-audit.constants.ts`) :

```text
project.review.created
project.review.updated
project.review.scheduled
project.review.started
project.review.finalized
project.review.cancelled

project.review.agenda_item.created
project.review.agenda_item.updated
project.review.agenda_item.reordered
project.review.agenda_item.started
project.review.agenda_item.completed
project.review.agenda_item.skipped

project.review.attachment.added
project.review.attachment.updated
project.review.attachment.removed

project.review.decision.created
project.review.decision.updated
project.review.action.created
project.review.action.updated
project.review.action.responsibility_assigned
```

Ne **jamais** auditer en clair :

```text
meetingUrl
externalEmail
token
lien confidentiel
contenu complet d’un document
```

---

# 19. Migration depuis l’existant

Si l’existant utilise encore :

```text
DRAFT / PLANNED / IN_REVIEW / FINALIZED / CANCELLED
```

Migration cible :

```text
DRAFT      → PREPARING (ou IN_PROGRESS si startedAt)
PLANNED    → SCHEDULED (ou PREPARING si pas de reviewDate)
IN_REVIEW  → IN_PROGRESS
FINALIZED  → FINALIZED
CANCELLED  → CANCELLED
```

Recommandation technique :

1. Ajouter les nouvelles valeurs à l’enum Prisma ;
2. Migration SQL de données ;
3. Adapter mappers API (réponses exposant les deux noms en transition si besoin) ;
4. Conserver anciennes valeurs en legacy temporaire ;
5. Supprimer legacy dans un lot ultérieur ;
6. Rendre `reviewDate` nullable — défaut `null` en `PREPARING`.

---

# 20. Phasage recommandé

## Phase A — Recentrage métier

* nouveau cycle `PREPARING / SCHEDULED / IN_PROGRESS / FINALIZED / CANCELLED` ;
* `reviewDate` optionnel en préparation ;
* formulaire « Créer un point projet » recentré ;
* distinction pilotage vs logistique en UI ;
* renommage UI : **Point projet**, pas « Réunion ».

## Phase B — Ordre du jour + documents

* types ODJ + champs `objective` / `expectedDecision` ;
* entité `ProjectReviewAttachment` ;
* rattachement document → point ou item ODJ ;
* préparation possible avant planification.

## Phase C — Tenue du point

* mode conduite (`IN_PROGRESS`) ;
* notes par point ODJ ;
* décisions typées / statutées ;
* actions + responsable unique + intervenants ;
* participants présents / absents.

## Phase D — Snapshot et historique

* finalisation ;
* compte rendu figé structuré ;
* snapshot pilotage ;
* historique onglet ;
* CTA « Créer le prochain point ».

## Phase E — Logistique (existant RFC-PROJ-013-1)

* réintégrer invitations in-app, email, Teams, calendrier **en second plan** dans l’UX ;
* pas de régression sur Phases 2–3 déjà livrées.

---

# 21. Critères d’acceptation

La RFC est validée si :

- [ ] un utilisateur peut créer un point projet **sans** date de réunion ;
- [ ] un utilisateur peut préparer un ordre du jour avant planification ;
- [ ] un utilisateur peut ajouter des documents et liens au point projet ;
- [ ] un utilisateur peut rattacher un document à un point d’ordre du jour ;
- [ ] un utilisateur peut planifier le point seulement quand nécessaire ;
- [ ] un utilisateur peut démarrer la tenue du point ;
- [ ] un utilisateur peut saisir décisions, actions, responsables et intervenants ;
- [ ] un utilisateur peut finaliser le point ;
- [ ] le snapshot final est figé et ne contient pas de données sensibles logistiques ;
- [ ] la logistique Teams/email/calendrier reste secondaire en UX ;
- [ ] l’interface parle de **pilotage**, pas seulement de réunion ;
- [ ] tous les champs relationnels affichent des **libellés métier**, jamais un ID brut.

---

# 22. Phrase produit de référence

> **Starium Orchestra transforme chaque COPIL, COPROJ ou revue de projet en acte de pilotage opérationnel : préparé, documenté, tracé et historisé.**

---

# 23. Décision

Cette RFC **reoriente** l’approche centrée « cycle de vie réunion » de RFC-PROJ-013-1.

Nouvelle orientation :

```text
Point projet = artefact de pilotage
Réunion = moment éventuel du point projet
Teams / email / calendrier = moyens logistiques secondaires
```

Le module doit répondre à l’objectif principal de Starium Orchestra :

> **Piloter les projets, les décisions, les actions et les arbitrages dans un cockpit de gouvernance opérationnelle.**

---

# 24. Fichiers à créer / modifier

## 24.1 Backend — Prisma

| Fichier | Action |
| ------- | ------ |
| `apps/api/prisma/schema.prisma` | Enums statuts/types ODJ/décisions ; modèle `ProjectReviewAttachment` ; champs `ProjectReview`, `ProjectReviewAgendaItem`, `ProjectReviewDecision` |
| `apps/api/prisma/migrations/*` | Migration statuts + nullable `reviewDate` + nouvelles tables/colonnes |

## 24.2 Backend — module `project-reviews`

| Fichier | Action |
| ------- | ------ |
| `project-reviews.service.ts` | Transitions `PREPARING` → `SCHEDULED` → `IN_PROGRESS` ; règles éditabilité |
| `project-reviews.controller.ts` | Routes `schedule`, `start` ; CRUD attachments |
| `project-reviews-snapshot.builder.ts` | Snapshot orienté CR pilotage |
| `dto/*.ts` | DTOs create/update ; enums ; validation `reviewDate` conditionnelle |
| `project-review-attachments.service.ts` | **Nouveau** |
| `project-audit.constants.ts` | Nouveaux événements audit |

## 24.3 Frontend

| Fichier | Action |
| ------- | ------ |
| `project-reviews-tab.tsx` | Liste — statuts pilotage, CTA préparer / planifier |
| `project-review-editor-dialog.tsx` ou page dédiée | Onglets pilotage §15 |
| `project-reviews.api.ts` | Nouvelles routes / types |
| Composants `review-*-section.tsx` | Sections ODJ, attachments, décisions typées |
| `project.types.ts` | Enums / statuts alignés API |

## 24.4 Documentation

| Fichier | Action |
| ------- | ------ |
| `docs/API.md` | Endpoints attachments + transitions statuts |
| `docs/modules/projects-mvp.md` | Parcours point projet pilotage |
| `docs/RFC/_RFC Liste.md` | Entrée RFC-PROJ-013-2 |

---

# 25. Implémentation — ordre suggéré

1. **Migration Prisma** — nouveaux statuts + mapping données + `reviewDate` nullable.
2. **Service** — machine à états + garde-fous éditabilité par statut.
3. **API** — DTOs + routes schedule/start + tests isolation client.
4. **Agenda enrichi** — types ODJ + routes start/complete/skip item.
5. **Attachments** — modèle + CRUD + lien `ProjectDocument`.
6. **Décisions enrichies** — types + statuts.
7. **Snapshot builder** — contrat CR pilotage.
8. **Frontend Phase A** — création sans date + libellés statuts.
9. **Frontend Phases B–D** — onglets + tenue + historique.
10. **Doc** — API.md, `_RFC Liste.md`, statut RFC → Implémenté par phase.

---

# 26. Tests

## 26.1 Backend (obligatoires)

* Création point en `PREPARING` sans `reviewDate` ;
* Transition `PREPARING` → `SCHEDULED` exige `reviewDate` ;
* Transition vers `IN_PROGRESS` — ODJ notes éditables ; `FINALIZED` lecture seule ;
* Responsable unique obligatoire sur action ;
* Attachments scopés client ; suppression cascade ;
* Snapshot sans `meetingUrl` / `externalEmail` ;
* Cross-client refusé sur toutes les routes ;
* Migration statuts legacy → cible.

## 26.2 Frontend

* Création point sans date ;
* Affichage libellés type/statut/participant (pas d’UUID visible) ;
* Onglets navigables clavier ; annonces `aria-live` sur changement statut ;
* États empty / loading / error par onglet.

---

# 27. Récapitulatif final

| Lot | Apport principal |
| --- | ---------------- |
| **RFC-PROJ-013** | Socle point projet, snapshot léger, types COPIL/COPRO/REX |
| **RFC-PROJ-013-1** | Logistique réunion, invitations, Microsoft (livré) |
| **RFC-PROJ-013-2** (cette RFC) | Recentrage **pilotage** : cycle PREPARING→…, ODJ typé, pièces jointes, CR structuré, UX gouvernance |

---

# 28. Points de vigilance

| Risque | Mitigation |
| ------ | ---------- |
| Régression invitations Teams/email | Phase E explicite ; ne pas casser routes `invite` existantes |
| Double sémantique statuts pendant migration | Mapper API ; tests migration ; legacy en lecture seule |
| `reviewDate` obligatoire côté DB | Migration nullable + validation DTO conditionnelle |
| Snapshot incompatible historique | Versionner `snapshotPayload.schemaVersion` |
| Surcharge UI éditeur | Découper en onglets / composants section |
| Fuite `meetingUrl` dans logs | Helpers privacy existants (`project-review-invitation-privacy.helpers.ts`) |

---

# 29. Conformité by design

## 29.1 RGPD

| Exigence | Application |
| -------- | ----------- |
| **DCP concernées** | `externalEmail` participants externes ; noms/emails utilisateurs participants ; contenu notes ODJ pouvant mentionner des personnes |
| **Finalité** | Pilotage projet, traçabilité des décisions et actions — pas de prospection |
| **Minimisation** | Email externe optionnel jusqu’à invite ; pas de collecte superflue en préparation |
| **Rétention** | Alignée sur durée vie projet + archivage client ; snapshot figé = preuve |
| **Effacement** | Anonymisation participant externe si demande ; suppression point annulé selon politique client |
| **Export** | Snapshot + liste actions exportables (lot ultérieur PDF) |
| **Logs** | Pas de DCP en clair ; pseudonymisation emails ; **jamais** `meetingUrl` |

## 29.2 RGAA

| Exigence | Application |
| -------- | ----------- |
| **Sémantique** | `nav` onglets pilotage ; `table` listes ODJ/actions ; un `h1` par page point |
| **Clavier** | Parcours complet création → tenue → finalisation ; focus visible ; pièges focus modales |
| **Formulaires** | `<label>` sur tous champs ; erreurs `aria-invalid` + `aria-describedby` |
| **Dynamique** | Toasts et changements statut via `aria-live="polite"` |
| **Contraste** | Badges statut avec texte + icône — pas couleur seule |
| **Mobile** | Onglets scrollables ou accordéon ≥ 320px ; cibles ≥ 44px |

## 29.3 Design System

| Exigence | Application |
| -------- | ----------- |
| **Composants** | `starium-tablecard`, `starium-dt`, shadcn Tabs/Dialog/Badge, sections `.starium-form-section` |
| **Tokens** | Couleurs statuts via thème ; pas de hex en dur |
| **Libellés** | Types rituel, statuts, participants, responsables — **valeur métier, pas ID** |
| **États** | Loading skeleton, empty « Aucun point à l’ordre du jour », error boundary par section |

## 29.4 Sécurité

| Exigence | Application |
| -------- | ----------- |
| **Authz** | Guards existants + permissions review granulaires (§17) |
| **Isolation client** | `getProjectForScope` sur chaque opération |
| **DTOs** | class-validator sur tous écrits ; `reviewDate` / `meetingUrl` validés selon statut/mode |
| **Audit** | Événements §18 ; pas de données sensibles |
| **API** | Whitelist champs réponse ; pas d’exposition token Microsoft |

## 29.5 Interface mobile

| Exigence | Application |
| -------- | ----------- |
| **Layout** | Onglets empilés ; cartes ODJ sur mobile au lieu de tableau dense |
| **Tableaux** | Colonnes prioritaires ; scroll horizontal contrôlé si nécessaire |
| **Actions** | Boutons « Démarrer le point », « Finaliser » accessibles pouce |
| **Modales** | Plein écran mobile pour formulaires action / décision |

---

## Références

* [RFC-PROJ-013 — Points Projet COPIL/COPRO et Historisation](./RFC-PROJ-013%20—%20Points%20Projet%20COPIL-COPRO%20et%20Historisation.md)
* [RFC-PROJ-013-1 — Cycle de vie réunion Point projet](./RFC-PROJ-013-1%20—%20Cycle%20de%20vie%20réunion%20Point%20projet%20(planification,%20invitations,%20tenue).md)
* [RFC-PROJ-018 — ProjectRisk EBIOS RM minimal](./RFC-PROJ-018%20—%20ProjectRisk%20EBIOS%20RM%20minimal.md)
* [docs/FRONTEND_UI-UX.md](../FRONTEND_UI-UX.md)
* [docs/ARCHITECTURE.md](../ARCHITECTURE.md)
