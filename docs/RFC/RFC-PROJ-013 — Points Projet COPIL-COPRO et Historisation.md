# RFC-PROJ-013 — Points Projet COPIL-COPRO et Historisation

## Statut

Draft

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
}
```

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

  facilitatorUserId String?
  finalizedAt       DateTime?
  finalizedByUserId String?

  snapshotPayload   Json?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  project           Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  participants      ProjectReviewParticipant[]
  decisions         ProjectReviewDecision[]
  actionItems       ProjectReviewActionItem[]

  @@index([clientId, projectId, reviewDate])
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

  projectReview   ProjectReview @relation(fields: [projectReviewId], references: [id], onDelete: Cascade)
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

Ajouter :

`project.review.created`
`project.review.updated`
`project.review.finalized`

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
