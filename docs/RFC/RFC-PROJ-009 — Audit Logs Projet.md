# RFC-PROJ-009 — Audit Logs Projet

## Statut

Draft

## Priorité

Haute (gouvernance + traçabilité cockpit)

## Dépendances

* RFC-013 — Audit logs 
* RFC-PROJ-001 — Module Projets (cadrage fonctionnel)
* RFC-PROJ-002 — Prisma Schema Projet
* Architecture globale Starium Orchestra 

---

# 1. Objectif

Mettre en place la **traçabilité complète des actions sur le module Projets** :

* création
* modification
* suppression (logique)
* actions métier critiques

afin de :

* sécuriser le pilotage projet
* permettre l’audit (DSI / DAF / DG)
* comprendre les évolutions dans le temps
* garantir la conformité (gouvernance SI)

👉 Aligné avec la règle produit :

> toutes les données doivent être auditables 

---

# 2. Problème résolu

Aujourd’hui sans audit projet :

* impossible de savoir **qui a modifié un projet**
* aucune traçabilité des changements de planning
* aucune preuve en cas de dérive
* pas de base pour analyse post-mortem

👉 Incompatible avec un **cockpit de gouvernance IT**

---

# 3. Périmètre

## Inclus

Audit des entités :

* Project
* ProjectTask
* ProjectRisk
* ProjectMilestone

Actions :

* create
* update
* delete (soft delete)
* changements critiques

## Exclus

* logs techniques
* logs frontend
* observabilité (Sentry, logs infra)

---

# 4. Principe d’audit

Chaque action métier génère un **AuditLog**.

Structure standard (RFC-013) :

```text
userId
clientId
action
resourceType
resourceId
oldValue
newValue
timestamp
```

---

# 5. Convention des actions

Format :

```
<resource>.<action>
```

## 5.1 Projet

```
project.created
project.updated
project.deleted
project.status.updated
project.owner.updated
```

## 5.2 Tâches

```
project_task.created
project_task.updated
project_task.deleted
project_task.status.updated
project_task.assigned
```

## 5.3 Risques

```
project_risk.created
project_risk.updated
project_risk.deleted
project_risk.level.updated
```

## 5.4 Jalons

```
project_milestone.created
project_milestone.updated
project_milestone.deleted
```

---

# 6. Modèle de données

👉 Réutilisation **intégrale du modèle existant `AuditLog`**

Aucune modification Prisma requise.

```prisma
model AuditLog {
  id String @id @default(cuid())

  clientId String
  userId   String?

  action String

  resourceType String
  resourceId   String?

  oldValue Json?
  newValue Json?

  createdAt DateTime @default(now())
}
```

👉 Conforme RFC-013 

---

# 7. Architecture backend

## 7.1 Module utilisé

```
apps/api/src/modules/audit-logs
```

Service :

```
AuditLogsService
```

---

## 7.2 Règle critique

⚠️ Les logs sont créés :

👉 **dans les services métier (ProjectService, etc.)**
❌ jamais dans les controllers

---

# 8. Intégration dans le module Projet

## 8.1 Exemple — création projet

```ts
await this.auditLogsService.create({
  userId: request.user.id,
  clientId,
  action: "project.created",
  resourceType: "project",
  resourceId: project.id,
  newValue: {
    name: project.name,
    status: project.status,
    startDate: project.startDate,
    endDate: project.endDate
  }
})
```

---

## 8.2 Exemple — modification projet

```ts
await this.auditLogsService.create({
  userId: request.user.id,
  clientId,
  action: "project.updated",
  resourceType: "project",
  resourceId: project.id,
  oldValue: previousData,
  newValue: updatedData
})
```

---

## 8.3 Exemple — suppression logique

```ts
await this.auditLogsService.create({
  userId: request.user.id,
  clientId,
  action: "project.deleted",
  resourceType: "project",
  resourceId: project.id
})
```

---

# 9. Règles métier

## 9.1 Scope client

* tous les logs sont liés à `clientId`
* aucune fuite inter-client

👉 conforme architecture multi-tenant 

---

## 9.2 Atomicité

* log créé **dans la même transaction métier si critique**
* sinon juste après succès

---

## 9.3 Granularité

Audit obligatoire pour :

* changement de statut
* changement de dates
* changement d’affectation
* suppression

---

## 9.4 Données sensibles

* ne pas stocker données inutiles
* privilégier champs métier clés

---

# 10. API

## Consultation logs

```
GET /api/audit-logs?resourceType=project
```

Filtres :

```
resourceType
action
userId
dateFrom
dateTo
resourceId
```

---

## Permissions

```
audit_logs.read
```

---

# 11. Sécurité

* CLIENT_ADMIN → logs de son client
* PLATFORM_ADMIN → tous les logs
* filtrage strict par `clientId`

---

# 12. Rétention

* 24 mois en base active
* archivage ensuite

👉 conforme RFC-013 

---

# 13. Tests

## Unit tests

* création log
* mapping action/resource
* oldValue / newValue

## Integration tests

* isolation client
* permissions
* filtres API

---

# 14. Impact produit

Cette RFC est **critique pour Starium Orchestra** :

👉 Sans audit :

* pas de gouvernance
* pas de crédibilité DSI
* pas de cockpit

👉 Avec audit :

* traçabilité complète
* base pour IA (analyse des dérives)
* historique projet exploitable

---

# 15. Extensions futures

* timeline projet basée sur audit logs
* détection automatique d’anomalies
* scoring de dérive projet
* audit consolidé multi-clients

