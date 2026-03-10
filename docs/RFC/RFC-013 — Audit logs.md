# RFC-013 — Audit logs

## Statut

Implémenté (backend API + Prisma + archivage planifié)

## Priorité

Haute

---

# 1. User Story

### US-013 — Audit logs

En tant qu’administrateur
je veux tracer les actions
afin d’assurer la traçabilité des opérations.

---

# 2. Objectif

Mettre en place un système d’**audit des actions métier** dans Starium Orchestra permettant de :

* tracer les actions réalisées par les utilisateurs
* conserver l’historique des modifications
* faciliter les audits de sécurité
* fournir une traçabilité complète des opérations

Le système doit respecter :

* l’architecture **multi-client**
* l’isolation **tenant**
* le modèle **RBAC**
* la logique **backend source de vérité**

---

# 3. Périmètre

Cette RFC concerne uniquement :

* les **audit logs métier**

Elle ne concerne pas :

* les logs techniques
* les logs applicatifs
* l’observabilité

---

# 4. Principe d’audit

Chaque action importante doit générer un **audit log**.

Un audit log contient :

```text
utilisateur
client
action
ressource
horodatage
```

Structure logique :

```text
User
Client
Resource
Action
Timestamp
```

---

# 5. Convention des actions

Convention utilisée :

```
<resource>.<action>
```

Exemples :

```
user.created
user.updated
user.deleted

contract.created
contract.updated
contract.deleted

license.created
license.updated
license.deleted
```

---

# 6. Actions à auditer

Les actions suivantes doivent être enregistrées.

## Utilisateurs

```
user.created
user.updated
user.deleted
user.roles.updated
```

---

## Clients

```
client.created
client.updated
client.deleted
```

---

## Modules

```
module.enabled
module.disabled
```

---

## Budgets

```
budget.created
budget.updated
budget.deleted
```

---

## Contrats

```
contract.created
contract.updated
contract.deleted
```

---

## Licences

```
license.created
license.updated
license.deleted
```

---

# 7. Modèle de données

## Table AuditLog

Modèle final implémenté dans `apps/api/prisma/schema.prisma` :

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

  ipAddress String?
  userAgent String?
  requestId String?

  createdAt DateTime @default(now())

  user   User?  @relation(fields: [userId], references: [id], onDelete: SetNull)
  client Client @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@index([clientId])
  @@index([userId])
  @@index([action])
  @@index([resourceType])
  @@index([createdAt])
}
```

---

# 8. Architecture backend

Le module est implémenté dans :

```
apps/api/src/modules/audit-logs
```

Structure :

```
audit-logs
 ├ audit-logs.module.ts
 ├ audit-logs.service.ts
 └ dto
```

Le module dépend de :

```
PrismaModule
```

---

# 9. AuditLogsService

Le service est responsable de la création des logs.

Exemple :

```ts
@Injectable()
export class AuditLogsService {

  constructor(private prisma: PrismaService) {}

  async create(data: {
    userId?: string
    clientId?: string
    action: string
    resourceType: string
    resourceId?: string
    oldValue?: any
    newValue?: any
  }) {
    return this.prisma.auditLog.create({
      data
    })
  }

}
```

---

# 10. Utilisation dans les services métier

Les logs doivent être créés **dans les services**, jamais dans les controllers.

---

## Exemple — création utilisateur

```ts
await this.auditLogsService.create({
  userId: request.user.id,
  clientId: activeClient.id,
  action: "user.created",
  resourceType: "user",
  resourceId: newUser.id,
  newValue: {
    email: newUser.email
  }
})
```

---

## Exemple — modification contrat

```ts
await this.auditLogsService.create({
  userId: request.user.id,
  clientId: activeClient.id,
  action: "contract.updated",
  resourceType: "contract",
  resourceId: contract.id,
  oldValue: previousData,
  newValue: updatedData
})
```

---

# 11. API

## Consultation des logs (client actif)

```
GET /api/audit-logs
```

Guards (RFC-010 + RFC-011 + RFC-012) :

```
JwtAuthGuard
ActiveClientGuard
ModuleAccessGuard
PermissionsGuard
```

La route utilise `@RequirePermissions("audit_logs.read")`.  
Tout utilisateur du **client actif** possédant cette permission peut consulter les logs du **client actif** uniquement (filtre systématique sur `clientId` issu du contexte).

---

# 12. Filtres

Filtres possibles :

```
resourceType
action
userId
dateFrom
dateTo
```

Exemple :

```
/api/audit-logs?action=user.created
```

---

# 13. Sécurité

Règles :

* un **CLIENT_ADMIN** peut consulter les logs de son client
* un **PLATFORM_ADMIN** peut consulter tous les logs
* aucune fuite inter-client n’est possible

Toutes les requêtes doivent filtrer :

```
clientId
```

---

# 14. Rétention

Les **audit logs métier** sont conservés :

```
24 mois en base active
```

Au-delà :

```
archivage dans AuditLogArchive
```

---

## Table archive

Modèle implémenté (mêmes champs métier/forensic + indexes pour requêtes d’archive) :

```prisma
model AuditLogArchive {
  id String @id

  clientId String
  userId   String?

  action String

  resourceType String
  resourceId   String?

  oldValue Json?
  newValue Json?

  ipAddress String?
  userAgent String?
  requestId String?

  createdAt  DateTime
  archivedAt DateTime @default(now())

  @@index([clientId])
  @@index([userId])
  @@index([action])
  @@index([resourceType])
  @@index([createdAt])
}
```

---

# 15. Archivage

Un job planifié archive les logs anciens.

Fréquence :

```
quotidienne
```

Critère :

```
logs > 24 mois
```

Processus :

```
1 copie vers AuditLogArchive
2 suppression table active
```

---

# 16. Checklist développement

Backend :

```
[x] ajouter modèle Prisma AuditLog
[x] ajouter modèle AuditLogArchive
[x] migration Prisma
[x] créer module audit-logs
[x] créer AuditLogsService
[x] intégrer audit dans services métier
```

API :

```
[x] GET /api/audit-logs
[x] GET /api/platform/audit-logs
```

Tests :

```
[x] création audit log
[x] modification audit log
[x] suppression audit log
[x] isolation client
```

---

# 17. Critères d’acceptation

La fonctionnalité est validée lorsque :

* toutes les actions sensibles sont tracées
* les logs contiennent `userId` et `clientId`
* les logs respectent l’isolation client
* un CLIENT_ADMIN peut consulter les logs
* un PLATFORM_ADMIN peut consulter tous les logs

