# RFC-013-1 — Security logs (authentification)

## Statut

Implémenté (backend API + Prisma + cron de purge)

## Priorité

Haute

---

# 1. Contexte

La plateforme **Starium Orchestra** implémente déjà un système d’audit métier via **RFC-013 — Audit Logs**.

Les audit logs enregistrent les **actions métier** effectuées sur les entités du système :

* utilisateurs
* clients
* rôles
* modules
* budgets
* contrats
* licences

Ces logs permettent d’assurer la **traçabilité fonctionnelle** des opérations.

Cependant, les événements liés à **l’authentification et à la sécurité** ne doivent pas être enregistrés dans `AuditLog`, afin d’éviter de polluer la traçabilité métier.

---

# 2. Objectif

Mettre en place un système de **Security Logs** permettant de tracer les événements de sécurité liés à l’authentification.

Ces logs servent à :

* audit de sécurité
* analyse forensic
* détection d’anomalies
* investigation en cas d’incident
* conformité réglementaire

---

# 3. Périmètre

Cette RFC concerne uniquement :

* les **événements d’authentification**

Elle ne concerne pas :

* les audit logs métier (RFC-013)
* les logs applicatifs
* les logs techniques
* l’observabilité

---

# 4. Principe

Les événements de sécurité sont enregistrés dans une table dédiée :

```
SecurityLog
```

Cette table est **distincte de `AuditLog`**.

---

# 5. Événements enregistrés

Les événements suivants doivent être loggés.

```
auth.login.success
auth.login.failure
auth.refresh
auth.logout
```

---

# 6. Données enregistrées

Chaque log doit contenir :

```
event
userId
email
success
reason
ipAddress
userAgent
requestId
createdAt
```

Description :

| Champ     | Description                     |
| --------- | ------------------------------- |
| event     | type d’événement                |
| userId    | utilisateur concerné (nullable) |
| email     | email utilisé pour l’auth       |
| success   | succès ou échec                 |
| reason    | cause d’échec                   |
| ipAddress | adresse IP                      |
| userAgent | navigateur / client             |
| requestId | identifiant de requête          |
| createdAt | date de création                |

Notes :

* `userId` peut être `null` si l’utilisateur n’existe pas
* `reason` n’est utilisé que pour les échecs

---

# 7. Modèle de données

Modifier :

```
apps/api/prisma/schema.prisma
```

Ajouter :

```prisma
model SecurityLog {
  id        String   @id @default(cuid())

  event     String

  userId    String?
  email     String?

  success   Boolean
  reason    String?

  ipAddress String?
  userAgent String?
  requestId String?

  createdAt DateTime @default(now())

  user User? @relation(fields: [userId], references: [id])

  @@index([event])
  @@index([userId])
  @@index([createdAt])
}
```

---

# 8. Architecture backend

Créer un module :

```
apps/api/src/modules/security-logs
```

Structure :

```
security-logs
 ├ security-logs.module.ts
 └ security-logs.service.ts
```

---

# 9. SecurityLogsService

Service responsable de la création des logs.

```ts
@Injectable()
export class SecurityLogsService {

  constructor(private prisma: PrismaService) {}

  async create(data: {
    event: string
    userId?: string
    email?: string
    success: boolean
    reason?: string
    ipAddress?: string
    userAgent?: string
    requestId?: string
  }) {
    return this.prisma.securityLog.create({
      data
    })
  }

}
```

---

# 10. Intégration dans AuthService

Modifier :

```
apps/api/src/modules/auth/auth.service.ts
```

Injecter :

```
SecurityLogsService
```

---

## Login success

```ts
await this.securityLogsService.create({
  event: "auth.login.success",
  userId: user.id,
  email: user.email,
  success: true,
  ipAddress: meta.ipAddress,
  userAgent: meta.userAgent,
  requestId: meta.requestId
})
```

---

## Login failure

```ts
await this.securityLogsService.create({
  event: "auth.login.failure",
  email: dto.email,
  success: false,
  reason: "invalid_credentials",
  ipAddress: meta.ipAddress,
  userAgent: meta.userAgent,
  requestId: meta.requestId
})
```

---

## Refresh token

```ts
await this.securityLogsService.create({
  event: "auth.refresh",
  userId: user.id,
  email: user.email,
  success: true,
  ipAddress: meta.ipAddress,
  userAgent: meta.userAgent,
  requestId: meta.requestId
})
```

---

## Logout

```ts
await this.securityLogsService.create({
  event: "auth.logout",
  userId: user.id,
  email: user.email,
  success: true,
  ipAddress: meta.ipAddress,
  userAgent: meta.userAgent,
  requestId: meta.requestId
})
```

---

# 11. Métadonnées de requête

Les champs suivants doivent être injectés via middleware global :

```
requestId
ipAddress
userAgent
```

Ces informations proviennent de :

```
RequestMeta decorator
```

---

# 12. Rétention

Les **security logs** doivent être conservés :

```
13 mois
```

Conformément aux contraintes réglementaires.

---

# 13. Nettoyage automatique

Implémenter un job planifié :

```
SecurityLogsCleanupService
```

Cron :

```
tous les jours à 03:00
```

Processus :

```
delete from SecurityLog
where createdAt < now() - interval '13 months'
```

---

# 14. API

Aucune API publique n’est exposée pour l’instant.

Les logs sont uniquement :

* stockés en base
* consultables via Prisma Studio
* exploitables ultérieurement via **Admin Studio**

---

# 15. Sécurité

Les security logs ne doivent jamais contenir :

* mot de passe
* hash
* token
* refresh token
* secrets

---

# 16. Relation avec RFC-013

| RFC       | Fonction      |
| --------- | ------------- |
| RFC-013   | audit métier  |
| RFC-013-1 | security logs |

---

# 17. Résultat final

Deux systèmes de traçabilité coexistent.

### Audit métier

```
AuditLog
```

Exemples :

```
user.created
contract.updated
module.enabled
```

---

### Security logs

```
SecurityLog
```

Exemples :

```
auth.login.success
auth.login.failure
auth.refresh
auth.logout
```

---

# 18. Checklist développement

Backend :

```
[x] ajouter modèle Prisma SecurityLog
[x] migration Prisma
[x] créer module security-logs
[x] créer SecurityLogsService
[x] intégrer dans AuthService
[x] ajouter job de purge
```

Tests :

```
[x] login success log
[x] login failure log
[x] refresh log
[x] logout log
```

---

Si tu veux, je peux aussi te faire la **RFC-014 — Administration Studio**, qui va être **une des plus importantes du projet**, car elle va piloter :

* modules
* clients
* rôles
* permissions
* observabilité
* audit
* sécurité.
