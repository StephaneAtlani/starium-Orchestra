# RFC-PROJ-013 — Points Projet COPIL-COPRO et Historisation

## Statut

Implémenté

## Implémentation (référence code)

- **Prisma** : [`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma) — `ProjectReviewType` (dont **`POST_MORTEM`** — retour d’expérience), `ProjectReviewStatus`, `ProjectReview`, `ProjectReviewParticipant`, `ProjectReviewDecision`, `ProjectReviewActionItem`. Extensions par rapport au bloc §6 initial : `contentPayload Json?` (brouillon structuré ; pour un REX, clé métier **`postMortem`** dans le JSON), `nextReviewDate`, participants `isRequired`, `linkedTaskId` optionnel sur les actions (référence `ProjectTask` même scope), index complémentaires `@@index([clientId, projectId, status])` et `@@index([projectId, reviewDate])`.
- **Backend** : [`apps/api/src/modules/projects/project-reviews/`](../../apps/api/src/modules/projects/project-reviews/) — `ProjectReviewsService`, `ProjectReviewsController`, `project-reviews-snapshot.builder.ts`, DTOs dans `dto/`. Enregistrement dans [`projects.module.ts`](../../apps/api/src/modules/projects/projects.module.ts). Toutes les opérations filtrent par `clientId` + `projectId` (via `getProjectForScope`) ; le seul `reviewId` ne suffit pas à cibler une ressource.
- **API** (préfixe `/api`) : `GET` / `POST` `/projects/:projectId/reviews`, `GET` / `PATCH` `/projects/:projectId/reviews/:reviewId`, `POST` `…/finalize`, `POST` `…/cancel`. Permissions : `projects.read` (lectures), `projects.update` (écritures). Réponse **détail** : `snapshotPayload` toujours présent dans le JSON — `null` si `status !== FINALIZED`, objet figé si `FINALIZED`. Liste : items sans charge `snapshotPayload`.
- **Snapshot** : généré uniquement au `finalize` dans une transaction ; contrat léger (projet, health, arbitrage, compteurs tâches, risques + top 5, jalons max 5, budget synthèse, `generatedAt`).
- **Audit** : `project.review.created`, `project.review.updated`, `project.review.finalized`, `project.review.cancelled` ; `resourceType` `project_review`.
- **Frontend** : onglet **Points projet** sur le détail projet — [`project-detail-view.tsx`](../../apps/web/src/features/projects/components/project-detail-view.tsx) (onglets Synthèse / Points projet), [`project-reviews-tab.tsx`](../../apps/web/src/features/projects/components/project-reviews-tab.tsx), [`project-reviews.api.ts`](../../apps/web/src/features/projects/api/project-reviews.api.ts), types et clés React Query dans `project.types.ts` / `project-query-keys.ts`.
- **Tests** : [`project-reviews.service.spec.ts`](../../apps/api/src/modules/projects/project-reviews/project-reviews.service.spec.ts).
- **Seed démo** : [`seed-project-demo-reviews.ts`](../../apps/api/prisma/seed-project-demo-reviews.ts) — points projet riches sur les projets `{prefix}-SEED-01` … `10` ; inclut des **`POST_MORTEM`** exemples (finalisés et brouillon) sur certains jeux (`SEED-03`, `SEED-06`, `SEED-09`). Réinitialisation idempotente à chaque `prisma db seed`.

## Dépendances

* RFC-PROJ-001 — Cadrage fonctionnel Projets
* RFC-PROJ-002 — Prisma Schema Portefeuille
* RFC-PROJ-003 — Règles métier
* RFC-PROJ-009 — Audit logs
* RFC-PROJ-012 — Project Sheet

---

# 1. Objectif

Mettre en place la gestion complète des **points projet** depuis la fiche projet :

`/projects/:id`
(ex : `http://localhost:3000/projects/cmn04n27t000toa27g80piz44`)

Le module doit permettre de :

* piloter un projet via des rituels (COPIL / COPRO)
* capturer les décisions et actions
* historiser chaque point
* figer l’état du projet à une date donnée

👉 Le point projet devient un **artefact de pilotage historisé**, distinct de la fiche projet.

---

# 2. Problème adressé

Aujourd’hui :

* la fiche projet = état courant
* audit logs = traçabilité technique

Mais il manque :

* une **mémoire de pilotage**
* un historique lisible des décisions
* une vision des points passés
* un suivi structuré des actions issues des comités

---

# 3. Concepts clés

## 3.1 Distinction structurante

| Objet            | Rôle                         |
| ---------------- | ---------------------------- |
| **Fiche projet** | état courant                 |
| **Point projet** | snapshot + compte-rendu figé |

---

## 3.2 Types de points (normatif MVP)

```prisma
enum ProjectReviewType {
  COPIL
  COPRO
  CODIR_REVIEW
  RISK_REVIEW
  MILESTONE_REVIEW
  AD_HOC
  POST_MORTEM
}
```

### POST_MORTEM — Retour d’expérience

* réservé aux projets au statut **`COMPLETED`**, **`CANCELLED`** ou **`ARCHIVED`** (sinon création / bascule de type refusée) ;
* pour un projet **clos**, toute **nouvelle** revue doit être de type **`POST_MORTEM`** (les brouillons COPIL/COPRO ouverts avant clôture restent éditables ou convertibles en REX) ;
* **`nextReviewDate`** interdit (pas de « prochain point » après un REX) : création et mise à jour rejettent une date renseignée ; le spawn automatique de brouillon suivant (PATCH avec `nextReviewDate` ≠ date du point) ne s’applique pas si le type effectif est `POST_MORTEM` ;
* contenu structuré côté UI/API : `contentPayload` avec objet **`postMortem`** (champs texte + indicateurs 0–5 selon implémentation front).

### COPIL — Comité de pilotage

* sponsor présent
* décisions stratégiques
* arbitrages
* budget / risques majeurs
* jalons critiques

### COPRO — Comité de projets

* suivi opérationnel
* avancement
* tâches
* blocages
* coordination

👉 COPIL et COPRO = **types principaux du MVP**

---

## 3.3 Statuts

```prisma
enum ProjectReviewStatus {
  DRAFT
  FINALIZED
  CANCELLED
}
```

---

## 3.4 Principe d’immutabilité

* `DRAFT` → modifiable
* `FINALIZED` → figé (non modifiable)
* `CANCELLED` → visible mais inactif

---

# 4. Périmètre MVP

## Inclus

* création point projet
* édition brouillon
* finalisation (snapshot + verrouillage)
* historique des points
* décisions
* actions
* participants
* résumé structuré

## Exclus

* IA
* export avancé
* workflow validation multi-niveaux
* coédition temps réel

---

# 5. Modèle fonctionnel

## 5.1 Métadonnées

* projectId
* clientId
* reviewDate
* reviewType (COPIL / COPRO…)
* status
* title
* facilitatorUserId
* participants
* nextReviewDate

---

## 5.2 Contenu du point

### Résumé exécutif

* faits marquants
* alertes
* décisions attendues

### Avancement

* progression
* jalons
* dérives

### Tâches

* terminées
* en cours
* en retard
* critiques

### Risques / blocages

* risques ouverts
* criticité
* plans d’action

### Décisions

* prises
* en attente
* impact

### Actions

* à faire
* responsable
* échéance

---

# 6. Modèle de données (Prisma)

## 6.1 ProjectReview

```prisma
model ProjectReview {
  id                String   @id @default(cuid())
  clientId          String
  projectId         String

  reviewDate        DateTime
  reviewType        ProjectReviewType
  status            ProjectReviewStatus @default(DRAFT)

  title             String?
  executiveSummary  String?
  contentPayload    Json?

  facilitatorUserId String?
  finalizedAt       DateTime?
  finalizedByUserId String?

  nextReviewDate    DateTime?
  snapshotPayload   Json?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  project           Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  participants      ProjectReviewParticipant[]
  decisions         ProjectReviewDecision[]
  actionItems       ProjectReviewActionItem[]

  @@index([clientId, projectId, reviewDate])
  @@index([clientId, projectId, status])
  @@index([projectId, reviewDate])
}
```

---

## 6.2 Participants

```prisma
model ProjectReviewParticipant {
  id              String @id @default(cuid())
  clientId        String
  projectReviewId String

  userId          String?
  displayName     String?

  attended        Boolean @default(true)
  isRequired      Boolean @default(false)

  projectReview   ProjectReview @relation(fields: [projectReviewId], references: [id], onDelete: Cascade)
}
```

---

## 6.3 Décisions

```prisma
model ProjectReviewDecision {
  id              String @id @default(cuid())
  clientId        String
  projectReviewId String

  title           String
  description     String?

  createdAt       DateTime @default(now())
}
```

---

## 6.4 Actions

```prisma
model ProjectReviewActionItem {
  id              String @id @default(cuid())
  clientId        String
  projectReviewId String
  projectId       String

  title           String
  status          ProjectTaskStatus
  dueDate         DateTime?
  linkedTaskId    String?

  projectReview   ProjectReview @relation(fields: [projectReviewId], references: [id], onDelete: Cascade)
  linkedTask      ProjectTask?  @relation(fields: [linkedTaskId], references: [id], onDelete: SetNull)
}
```

---

# 7. Snapshot projet (clé du système)

## Principe

Lors du `FINALIZED` :

* génération automatique `snapshotPayload`
* état réel du projet à cet instant

## Contenu minimum

* statut projet
* avancement
* arbitrages
* tâches
* risques
* jalons
* budget (si existant)

## Règle

👉 construit **uniquement backend**
👉 jamais recalculé frontend

---

# 8. Règles métier

* création libre → DRAFT
* modification uniquement en DRAFT
* FINALIZED = verrouillage
* snapshot généré à la finalisation
* historique trié par date desc
* isolation stricte par clientId
* **REX (`POST_MORTEM`)** : éligibilité projet **`COMPLETED` \| `CANCELLED` \| `ARCHIVED`** ; pas de **`nextReviewDate`** ; pas de brouillon « prochain point » spawné pour ce type (voir §3.2 POST_MORTEM).

---

# 9. API backend

## Liste

GET `/api/projects/:id/reviews`

## Détail

GET `/api/projects/:id/reviews/:reviewId`

## Création

POST `/api/projects/:id/reviews`

## Update (DRAFT uniquement)

PATCH `/api/projects/:id/reviews/:reviewId`

## Finalisation

POST `/api/projects/:id/reviews/:reviewId/finalize`

## Annulation

POST `/api/projects/:id/reviews/:reviewId/cancel`

---

# 10. Frontend

Depuis :
`/projects/[id]`

## Ajouts UI

### Bouton

* “Créer un point projet”

### Onglet

* “Points projet”

### Vue liste

* historique
* tri par date

### Vue détail

* lecture complète
* snapshot inclus

### Mode édition

* uniquement DRAFT

---

# 11. React Query

```ts
['project', projectId, 'reviews']
['project', projectId, 'review', reviewId]
```

---

# 12. Audit

Émis côté implémentation :

* `project.review.created`
* `project.review.updated`
* `project.review.finalized`
* `project.review.cancelled`

---

# 13. Points de vigilance

* taille du snapshot JSON
* cohérence avec tâches existantes
* performance lecture historique
* permissions strictes

---

# 14. Positionnement produit

Ce module transforme ton outil :

👉 de **suivi projet**
➡️ en **outil de pilotage réel**

Avec :

* mémoire
* décisions
* responsabilité
* traçabilité métier
