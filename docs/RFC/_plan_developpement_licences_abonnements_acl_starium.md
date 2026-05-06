# Plan de développement — Licences, abonnements et ACL Starium Orchestra

## 1. Objectif global

Mettre en place une couche complète de gestion des licences, abonnements, modules activés, visibilité interne et ACL au-dessus du RBAC existant, sans le casser.

Le système doit permettre de gérer :

- les abonnements commerciaux des clients ;
- les licences utilisateur ;
- les licences facturables et non facturables ;
- les licences d’évaluation 30 jours ;
- les accès support temporaires ;
- les modules activés par client ;
- les modules masqués par utilisateur ou groupe ;
- les ACL sur les données sensibles.

Le modèle cible :

```text
PLATFORM_ADMIN
→ gère les clients, abonnements, quotas, modules activés, licences spéciales

CLIENT_ADMIN
→ gère les utilisateurs, licences client, groupes, visibilité interne et ACL

Utilisateur
→ accède uniquement selon licence + module + RBAC + ACL
```

---

## 2. Principe d’accès final

Un utilisateur peut accéder à une donnée uniquement si toutes les conditions sont vraies :

```text
1. utilisateur authentifié
2. utilisateur rattaché au client actif
3. rattachement ClientUser actif
4. licence active et non expirée
5. module activé par le PLATFORM_ADMIN pour ce client
6. module visible pour cet utilisateur
7. licence compatible avec l’action demandée
8. RBAC API compatible
9. ACL ressource compatible si la ressource est restreinte
```

Formule cible :

```text
Licence
∩ Module activé
∩ Module visible
∩ RBAC
∩ ACL
= accès réel
```

---

## 3. Décisions produit validées

| Sujet | Décision |
|---|---|
| Licence portée par | `ClientUser` |
| Compte utilisateur | Global et unique |
| Multi-client | Oui, un utilisateur peut appartenir à plusieurs clients |
| Licence par client | Oui, via `ClientUser` |
| READ_ONLY | Illimité en V1 |
| READ_WRITE client | Soumis à quota |
| Quota | Porté par abonnement |
| Abonnements mixtes | Oui |
| Utilisateur | Rattaché à un seul abonnement à la fois dans un client |
| CLIENT_ADMIN | Ne voit pas automatiquement les données sensibles |
| PLATFORM_ADMIN | Gère abonnements, quotas, modules activés et licences spéciales |
| Évaluation | Licence 30 jours |
| Support Starium | Accès temporaire avec expiration obligatoire |
| ACL | Utilisateurs + groupes |
| Ressources existantes | Visibles comme aujourd’hui si aucune ACL restrictive |

---

## 4. Types de licence

### 4.1 READ_ONLY

Licence lecture seule.

Règles :

```text
- illimitée en V1
- ne consomme aucun quota
- autorise la lecture si module + RBAC + ACL autorisent
- interdit toute écriture
- attribuable par CLIENT_ADMIN et PLATFORM_ADMIN
```

Même si l’utilisateur possède un rôle avec permission `*.update`, la licence `READ_ONLY` bloque l’écriture.

---

### 4.2 READ_WRITE

Licence lecture / écriture.

Règles :

```text
- autorise la lecture et l’écriture uniquement si module + RBAC + ACL autorisent
- ne donne jamais accès automatiquement à tout
- peut être facturable ou non facturable selon licenseBillingMode
```

---

## 5. Modes de facturation / attribution

### 5.1 CLIENT_BILLABLE

Licence facturée au client.

```text
READ_WRITE + CLIENT_BILLABLE
→ consomme un siège de l’abonnement client
```

Cas d’usage : utilisateur interne client, chef de projet client, DSI client, DAF client, membre CODIR client.

---

### 5.2 EXTERNAL_BILLABLE

Licence portée ou facturée ailleurs.

```text
READ_WRITE + EXTERNAL_BILLABLE
→ ne consomme pas le quota du client
```

Cas d’usage : DSI à temps partagé, consultant externe, cabinet partenaire, PMO externe, intégrateur.

Attribuable uniquement par `PLATFORM_ADMIN`.

---

### 5.3 NON_BILLABLE

Licence non facturable.

```text
READ_WRITE + NON_BILLABLE
→ ne consomme pas le quota client
→ motif obligatoire
```

Cas d’usage : geste commercial, bêta test, formation interne, migration accompagnée, exception validée.

Attribuable uniquement par `PLATFORM_ADMIN`.

---

### 5.4 PLATFORM_INTERNAL

Licence interne Starium / support.

```text
READ_WRITE + PLATFORM_INTERNAL
→ accès support temporaire
→ date de fin obligatoire
→ motif obligatoire
→ audit renforcé
```

Règles :

```text
- durée recommandée : 7 jours maximum
- renouvellement manuel uniquement
- expiration automatique obligatoire
- réservé au support / équipe Starium
```

---

### 5.5 EVALUATION

Licence d’évaluation 30 jours.

```text
READ_WRITE + EVALUATION
→ essai 30 jours
→ ne consomme pas le quota client
→ non facturable
→ attribuable uniquement par PLATFORM_ADMIN
```

Règles :

```text
- durée par défaut : 30 jours
- licenseEndsAt obligatoire
- si absent, le backend génère now + 30 jours
- motif obligatoire
- pas de renouvellement automatique
- conversion possible vers CLIENT_BILLABLE, EXTERNAL_BILLABLE ou NON_BILLABLE
```

---

## 6. Abonnements client

Un client peut avoir plusieurs abonnements.

| Abonnement | Quota READ_WRITE | Durée |
|---|---:|---:|
| Pack DSI | 5 | 1 an |
| Pack CODIR | 3 | 2 ans |
| Pack Projets | 10 | 3 ans |

Règle :

```text
Un ClientUser ne peut consommer qu’un seul abonnement à la fois.
```

Donc :

```text
ClientUser.subscriptionId = abonnement utilisé
```

Seul ce cas consomme un quota :

```text
licenseType = READ_WRITE
AND licenseBillingMode = CLIENT_BILLABLE
AND subscriptionId = abonnement actif
```

---

## 7. Période de grâce

Chaque abonnement possède une période de grâce.

| Engagement | Période de grâce |
|---|---:|
| 1 an | 30 jours |
| 2 ans | 60 jours |
| 3 ans | 90 jours |

Pendant la période de grâce : accès maintenu, warning admin, renouvellement à traiter.

Après la période de grâce : écriture bloquée pour `READ_WRITE + CLIENT_BILLABLE`, lecture maintenue temporairement selon règle commerciale.

---

## 8. Modèles Prisma

### 8.1 Enums

```prisma
enum ClientUserLicenseType {
  READ_ONLY
  READ_WRITE
}

enum ClientUserLicenseBillingMode {
  CLIENT_BILLABLE
  EXTERNAL_BILLABLE
  NON_BILLABLE
  PLATFORM_INTERNAL
  EVALUATION
}

enum ClientSubscriptionStatus {
  DRAFT
  ACTIVE
  SUSPENDED
  EXPIRED
  CANCELLED
}

enum SubscriptionBillingPeriod {
  MONTHLY
  YEARLY
  CUSTOM
}
```

### 8.2 ClientSubscription

```prisma
model ClientSubscription {
  id                  String   @id @default(cuid())
  clientId            String

  name                String
  status              ClientSubscriptionStatus

  startsAt            DateTime
  endsAt              DateTime?
  gracePeriodEndsAt   DateTime?

  durationMonths      Int?
  gracePeriodDays     Int?

  readWriteSeatsLimit Int

  billingPeriod       SubscriptionBillingPeriod?
  billingReference    String?
  notes               String?

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@index([clientId])
  @@index([clientId, status])
}
```

### 8.3 Extension ClientUser

Ajouter sur `ClientUser` :

```prisma
subscriptionId           String?

licenseType              ClientUserLicenseType @default(READ_ONLY)
licenseBillingMode       ClientUserLicenseBillingMode @default(CLIENT_BILLABLE)

licenseStartsAt          DateTime?
licenseEndsAt            DateTime?
licenseAssignmentReason  String?

@@index([clientId, subscriptionId])
@@index([clientId, licenseType, licenseBillingMode])
```

---

## 9. Groupes d’accès

### 9.1 AccessGroup

```prisma
model AccessGroup {
  id          String   @id @default(cuid())
  clientId    String
  name        String
  description String?
  isSystem    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  members AccessGroupMember[]

  @@unique([clientId, name])
  @@index([clientId])
}
```

### 9.2 AccessGroupMember

```prisma
model AccessGroupMember {
  id        String   @id @default(cuid())
  clientId  String
  groupId   String
  userId    String
  createdAt DateTime @default(now())

  group AccessGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)

  @@unique([groupId, userId])
  @@index([clientId, userId])
}
```

---

## 10. Visibilité modules

Le `PLATFORM_ADMIN` active ou désactive les modules pour un client.

Le `CLIENT_ADMIN` peut ensuite masquer certains modules pour tout le client, un groupe ou un utilisateur.

### 10.1 ClientModuleVisibility

```prisma
model ClientModuleVisibility {
  id          String @id @default(cuid())
  clientId    String
  moduleCode  String

  scopeType   ModuleVisibilityScopeType
  scopeId     String?

  visibility  ModuleVisibilityState

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([clientId, moduleCode])
  @@index([clientId, scopeType, scopeId])
}

enum ModuleVisibilityScopeType {
  CLIENT
  GROUP
  USER
}

enum ModuleVisibilityState {
  VISIBLE
  HIDDEN
}
```

Priorité :

```text
USER override
> GROUP override
> CLIENT default
> module activé plateforme
```

---

## 11. ACL ressources

### 11.1 ResourceAcl

```prisma
model ResourceAcl {
  id             String @id @default(cuid())
  clientId       String

  resourceType   String
  resourceId     String

  subjectType    ResourceAclSubjectType
  subjectId      String

  permission     ResourceAclPermission

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([clientId, resourceType, resourceId])
  @@index([clientId, subjectType, subjectId])
  @@unique([clientId, resourceType, resourceId, subjectType, subjectId, permission])
}

enum ResourceAclSubjectType {
  USER
  GROUP
}

enum ResourceAclPermission {
  READ
  WRITE
  ADMIN
}
```

---

## 12. Règle par défaut ACL

Pour ne pas casser l’existant :

```text
Si aucune ACL n’existe sur une ressource
→ comportement actuel conservé
```

Dès qu’une ACL existe :

```text
ACL présente
→ seuls les utilisateurs/groupes autorisés peuvent accéder
```

---

## 13. Services backend

### 13.1 LicenseService

Responsabilités : vérifier licence active, expiration, quota abonnement, sièges consommés, blocage READ_ONLY, conversion EVALUATION, modes facturables et non facturables.

Méthodes :

```ts
getClientLicenseUsage(clientId: string)
assignClientUserLicense(...)
assertCanWriteByLicense(...)
isLicenseActive(...)
isSubscriptionUsable(...)
```

### 13.2 SubscriptionService

Responsabilités : créer abonnement client, activer/suspendre/annuler abonnement, calculer période de grâce, calculer usage par abonnement, vérifier abonnement actif ou en grâce.

### 13.3 ModuleVisibilityService

Responsabilités : résoudre les modules visibles, appliquer priorité `USER > GROUP > CLIENT`, filtrer navigation frontend, bloquer accès API si module masqué.

### 13.4 AccessGroupService

Responsabilités : CRUD groupes, gestion membres, vérification cross-client, audit changements.

### 13.5 AccessControlService

Responsabilités : vérifier ACL ressource, résoudre droits utilisateur + groupes, gérer absence ACL = comportement actuel.

Méthodes :

```ts
canReadResource(userId, clientId, resourceType, resourceId)
canWriteResource(userId, clientId, resourceType, resourceId)
canAdminResource(userId, clientId, resourceType, resourceId)
assertCanReadResource(...)
assertCanWriteResource(...)
assertCanAdminResource(...)
```

---

## 14. Guards backend

Pipeline cible :

```text
JwtAuthGuard
→ ActiveClientGuard
→ ModuleAccessGuard
→ ModuleVisibilityGuard
→ LicenseGuard
→ PermissionsGuard
→ ResourceAclGuard si ressource ciblée
```

### 14.1 LicenseGuard

Bloque : écriture avec READ_ONLY, licence expirée, CLIENT_BILLABLE hors abonnement actif/grâce, EVALUATION expirée, PLATFORM_INTERNAL expiré.

### 14.2 ModuleVisibilityGuard

Bloque si le module est masqué pour l’utilisateur.

### 14.3 ResourceAclGuard

Bloque si la ressource est restreinte et que l’utilisateur n’a pas l’ACL requise.

---

## 15. Endpoints backend

### 15.1 Plateforme — abonnements

```text
GET    /api/platform/clients/:clientId/subscriptions
POST   /api/platform/clients/:clientId/subscriptions
PATCH  /api/platform/clients/:clientId/subscriptions/:subscriptionId
POST   /api/platform/clients/:clientId/subscriptions/:subscriptionId/activate
POST   /api/platform/clients/:clientId/subscriptions/:subscriptionId/suspend
POST   /api/platform/clients/:clientId/subscriptions/:subscriptionId/cancel
```

Protégés par `JwtAuthGuard` + `PlatformAdminGuard`.

### 15.2 Plateforme — modules client

Routes existantes à conserver comme source d’activation module client :

```text
GET   /api/clients/:clientId/modules
POST  /api/clients/:clientId/modules
PATCH /api/clients/:clientId/modules/:moduleCode
```

### 15.3 Plateforme — licences utilisateur

```text
GET   /api/platform/clients/:clientId/license-usage
PATCH /api/platform/clients/:clientId/users/:userId/license
```

Le `PATCH` plateforme peut modifier : `licenseType`, `licenseBillingMode`, `subscriptionId`, `licenseStartsAt`, `licenseEndsAt`, `licenseAssignmentReason`.

### 15.4 Client — usage licences

```text
GET /api/client-license-usage
```

Réponse :

```ts
{
  readOnly: { used: number; limit: null; unlimited: true };
  readWriteClientBillable: { used: number; limit: number };
  readWriteExternalBillable: { used: number };
  readWriteNonBillable: { used: number };
  readWritePlatformInternal: { used: number };
  readWriteEvaluation: { used: number; expiresSoon: number; expired: number };
}
```

### 15.5 Client — attribution licence utilisateur

```text
PATCH /api/users/:userId/license
```

Le `CLIENT_ADMIN` peut uniquement attribuer `READ_ONLY` ou `READ_WRITE + CLIENT_BILLABLE`.

### 15.6 Groupes d’accès

```text
GET    /api/access-groups
POST   /api/access-groups
GET    /api/access-groups/:id
PATCH  /api/access-groups/:id
DELETE /api/access-groups/:id
GET    /api/access-groups/:id/members
POST   /api/access-groups/:id/members
DELETE /api/access-groups/:id/members/:userId
```

### 15.7 Visibilité modules

```text
GET   /api/module-visibility
PATCH /api/module-visibility
```

Payload :

```json
{
  "moduleCode": "budgets",
  "scopeType": "GROUP",
  "scopeId": "group_daf",
  "visibility": "HIDDEN"
}
```

### 15.8 ACL ressources

```text
GET    /api/resource-acl/:resourceType/:resourceId
PUT    /api/resource-acl/:resourceType/:resourceId
POST   /api/resource-acl/:resourceType/:resourceId/entries
DELETE /api/resource-acl/:resourceType/:resourceId/entries/:entryId
```

---

## 16. Frontend — écrans à créer

### 16.1 Administration plateforme

#### `/admin/clients/[clientId]/subscriptions`

Colonnes : nom abonnement, statut, début, fin, fin période de grâce, durée, licences RW utilisées, licences RW incluses, référence contrat, actions.

Actions : créer abonnement, modifier, activer, suspendre, annuler.

#### `/admin/clients/[clientId]/licenses`

Colonnes : utilisateur, email, licence, mode facturation, abonnement, début, fin, motif, statut licence, actions.

Actions : attribuer licence partenaire, attribuer licence offerte, attribuer licence support, attribuer évaluation 30 jours, convertir/prolonger/révoquer.

#### `/admin/clients/[clientId]/modules`

Peut réutiliser l’administration existante des modules client.

### 16.2 Administration client

#### `/client/administration/licenses`

Vue simplifiée pour CLIENT_ADMIN.

Colonnes : utilisateur, email, licence, abonnement, début, fin, statut, dernière modification, actions.

Le CLIENT_ADMIN voit : lecture, lecture/écriture, quota utilisé/disponible.

#### `/client/administration/access-groups`

Colonnes : nom, description, nombre de membres, type, actions.

#### `/client/administration/module-visibility`

Matrice : module, client, groupes, utilisateurs avec exception, statut visible/masqué.

### 16.3 Onglet Accès sur ressources métier

À ajouter progressivement sur : projets, budgets, contrats, documents, fournisseurs, applications, licences, vision stratégique, cycles de pilotage.

Contenu : utilisateurs autorisés, groupes autorisés, permission READ/WRITE/ADMIN, ressource publique ou restreinte.

---

## 17. Audit obligatoire

Actions à auditer :

```text
client_subscription.created
client_subscription.updated
client_subscription.activated
client_subscription.suspended
client_subscription.cancelled
client_user.license.assigned
client_user.license.updated
client_user.license.revoked
client_user.license.expired
client_user.license.billing_mode_changed
client_user.license.evaluation_granted
client_user.license.evaluation_extended
client_user.license.evaluation_expired
client_user.license.evaluation_converted
client_user.license.support_access_granted
client_user.license.support_access_expired
access_group.created
access_group.updated
access_group.deleted
access_group.member_added
access_group.member_removed
module_visibility.updated
resource_acl.updated
resource_acl.entry_added
resource_acl.entry_removed
```

Audit minimum : `clientId`, `targetUserId`, `actorUserId`, `resourceType`, `resourceId`, `oldValue`, `newValue`, `licenseType`, `licenseBillingMode`, `subscriptionId`, `reason`, `requestId`, `ipAddress`, `userAgent`, `createdAt`.

---

## 18. Roadmap RFC — Licences, abonnements et ACL

| RFC | Nom | Objectif | Description | Priorité | État | Dépendances | Livrables principaux |
|---|---|---|---|---|---|---|---|
| RFC-ACL-001 | Abonnements et licences client | Mettre en place le socle commercial des licences | Créer les abonnements client, les quotas READ_WRITE, les licences READ_ONLY / READ_WRITE portées par `ClientUser`, et le contrôle de consommation des sièges | P0 | À développer | RBAC existant, ClientUser, PlatformAdminGuard | `ClientSubscription`, extension `ClientUser`, `LicenseService`, `SubscriptionService`, endpoints abonnements, usage licences, tests quota |
| RFC-ACL-002 | Licences spéciales et évaluation | Gérer les licences non standard | Ajouter les modes `EXTERNAL_BILLABLE`, `NON_BILLABLE`, `PLATFORM_INTERNAL`, `EVALUATION`, avec motif, expiration, audit et conversion | P0 | À développer | RFC-ACL-001 | billing modes, évaluation 30 jours, accès support temporaire, expiration automatique, audit renforcé |
| RFC-ACL-003 | Groupes d’accès client | Créer des groupes métier d’accès | Permettre au CLIENT_ADMIN de créer des groupes et d’y affecter des utilisateurs pour simplifier la gestion des droits | P1 | À développer | ClientUser, ActiveClientGuard | `AccessGroup`, `AccessGroupMember`, CRUD groupes, gestion membres, UI groupes, audit |
| RFC-ACL-004 | Visibilité des modules | Masquer ou afficher des modules selon client, groupe ou utilisateur | Permettre au CLIENT_ADMIN de masquer certains modules pour tout le client, un groupe ou un utilisateur, sans désactiver le module côté plateforme | P1 | À développer | RFC-ACL-003, modules client existants | `ClientModuleVisibility`, `ModuleVisibilityService`, `ModuleVisibilityGuard`, navigation filtrée, tests priorité USER > GROUP > CLIENT |
| RFC-ACL-005 | ACL ressources génériques | Créer le moteur ACL réutilisable | Ajouter une couche d’accès fine sur les ressources métier : utilisateur/groupe + READ/WRITE/ADMIN | P1 | À développer | RFC-ACL-003 | `ResourceAcl`, `AccessControlService`, `ResourceAclGuard`, API générique ACL, règle absence ACL = comportement actuel |
| RFC-ACL-006 | Intégration ACL dans les modules métier | Brancher l’ACL sur les ressources réelles | Appliquer progressivement l’ACL sur Documents, Projets, Budgets, Contrats, Fournisseurs, Applications, Vision stratégique et Cycles de pilotage | P2 | À développer | RFC-ACL-005 | filtrage listes, contrôle détail, mutations protégées, onglet Accès par ressource, tests par module |
| RFC-ACL-007 | Frontend administration ACL | Créer les interfaces d’administration | Ajouter les écrans plateforme et client pour gérer abonnements, licences, groupes, visibilité modules et ACL ressources | P1 | À développer | RFC-ACL-001 à 005 | pages `/admin/clients/[clientId]/subscriptions`, `/admin/clients/[clientId]/licenses`, `/client/administration/licenses`, groupes, visibilité modules, onglet Accès |
| RFC-ACL-008 | Audit et traçabilité avancée ACL | Renforcer la traçabilité sécurité | Centraliser et normaliser les audit logs sur licences, abonnements, groupes, visibilité modules, ACL et accès support | P1 | À développer | RFC-ACL-001 à 005 | actions audit standardisées, payloads `oldValue/newValue`, filtres audit, événements support/évaluation |
| RFC-ACL-009 | Expiration automatique et jobs | Automatiser les expirations | Ajouter les jobs backend pour expirer les licences d’évaluation, support, abonnements hors grâce et notifier les admins | P2 | À développer | RFC-ACL-001, RFC-ACL-002, socle queue si utilisé | job expiration licences, job abonnements, alertes admin, audit `expired`, tests temps |
| RFC-ACL-010 | UX cockpit licences & droits | Rendre le modèle lisible pour les admins | Créer une vue claire des licences, quotas, abonnements, statuts et droits effectifs, avec filtres et badges métier | P2 | À développer | RFC-ACL-007 | tableaux lisibles, badges statut, filtres, alertes expiration, aucun ID brut affiché |
| RFC-ACL-011 | Matrice des droits effectifs | Afficher “pourquoi un utilisateur a accès ou non” | Ajouter une vue de diagnostic des droits effectifs combinant licence, module, RBAC, visibilité module et ACL ressource | P2 | À développer | RFC-ACL-004, RFC-ACL-005 | endpoint diagnostic, UI matrice droits, explication des refus 403 |
| RFC-ACL-012 | Commercialisation et reporting licences | Préparer la facturation SaaS | Produire des indicateurs commerciaux : licences consommées, abonnements actifs, évaluations en cours, licences non facturables, accès support | P3 | À développer | RFC-ACL-001, RFC-ACL-002 | dashboard plateforme, exports, filtres client, indicateurs billing |

---

## 19. Ordre de développement recommandé

| Ordre | RFC | Pourquoi |
|---:|---|---|
| 1 | RFC-ACL-001 | Socle obligatoire : abonnements, licences, quotas |
| 2 | RFC-ACL-002 | Nécessaire pour consultants, support, POC et évaluation 30 jours |
| 3 | RFC-ACL-003 | Les groupes simplifient ensuite visibilité modules et ACL |
| 4 | RFC-ACL-004 | Permet de masquer les modules proprement côté client |
| 5 | RFC-ACL-005 | Crée le moteur ACL générique |
| 6 | RFC-ACL-007 | Les admins doivent pouvoir gérer le système |
| 7 | RFC-ACL-006 | Intégration progressive dans les modules métier |
| 8 | RFC-ACL-008 | Durcissement audit et traçabilité |
| 9 | RFC-ACL-009 | Automatisation des expirations |
| 10 | RFC-ACL-010 | Amélioration UX cockpit |
| 11 | RFC-ACL-011 | Diagnostic avancé des droits |
| 12 | RFC-ACL-012 | Reporting commercial et facturation |

---

## 20. Tests obligatoires

### 20.1 Backend

```text
READ_ONLY ne peut pas écrire
READ_ONLY illimité
READ_WRITE + CLIENT_BILLABLE consomme quota abonnement
READ_WRITE + CLIENT_BILLABLE refusé si quota dépassé
READ_WRITE + EXTERNAL_BILLABLE ne consomme pas quota
READ_WRITE + NON_BILLABLE ne consomme pas quota
READ_WRITE + PLATFORM_INTERNAL ne consomme pas quota
EVALUATION ne consomme pas quota
EVALUATION expire à J+30 si date absente
EVALUATION expirée bloque l’écriture
PLATFORM_INTERNAL sans date de fin refusé
NON_BILLABLE sans motif refusé
CLIENT_ADMIN ne peut pas attribuer licence spéciale
PLATFORM_ADMIN peut attribuer tous les modes
changement CLIENT_BILLABLE vers NON_BILLABLE libère un siège
changement NON_BILLABLE vers CLIENT_BILLABLE consomme un siège
cross-client interdit
audit obligatoire sur toute modification licence
module masqué refusé
ACL utilisateur READ autorise lecture
ACL utilisateur READ refuse écriture
ACL groupe WRITE autorise écriture
CLIENT_ADMIN sans ACL ne voit pas ressource restreinte
absence ACL conserve comportement actuel
```

### 20.2 Frontend

```text
affichage quota licences
READ_ONLY illimité affiché clairement
boutons écriture masqués si READ_ONLY
CLIENT_ADMIN ne voit pas options licence spéciale
PLATFORM_ADMIN voit tous les modes
navigation masque modules non visibles
table groupes fonctionnelle
onglet Accès visible sur ressource
aucun ID brut affiché seul
états loading/error/empty/success
```

---

## 21. Gates de sortie

Le chantier est terminé uniquement si :

```text
- RBAC existant non cassé
- modules plateforme toujours activables par client
- READ_ONLY illimité fonctionne
- READ_WRITE facturable consomme quota abonnement
- licences spéciales ne consomment pas quota
- évaluation 30 jours fonctionne
- support interne expire automatiquement
- CLIENT_ADMIN limité aux licences client
- PLATFORM_ADMIN peut gérer tous les modes
- ACL ne rend pas invisibles les ressources existantes sans règle
- audit complet actif
- frontend clair pour plateforme et client
- tests backend/frontend passent
```

---

## 22. Prompt Cursor prêt à copier

```text
Tu dois implémenter le système de licences, abonnements et ACL de Starium Orchestra.

Objectif :
Ajouter une couche commerciale et métier au-dessus du RBAC existant, sans casser l’architecture actuelle.

Contexte existant :
- Starium possède déjà un RBAC API par modules, rôles et permissions.
- Les routes plateforme utilisent JwtAuthGuard + PlatformAdminGuard.
- Les routes client utilisent JwtAuthGuard + ActiveClientGuard + ModuleAccessGuard + PermissionsGuard.
- Les modules sont déjà activables/désactivables par client via les routes plateforme.
- Le backend reste source de vérité.
- Le frontend ne doit jamais être la seule sécurité.

Décisions produit :
- Un utilisateur possède un compte global unique.
- Un utilisateur peut appartenir à plusieurs clients.
- La licence est portée par ClientUser.
- READ_ONLY est illimité en V1.
- READ_WRITE + CLIENT_BILLABLE consomme un quota d’abonnement client.
- Un client peut avoir plusieurs abonnements.
- Un ClientUser ne peut consommer qu’un seul abonnement à la fois.
- Le PLATFORM_ADMIN gère abonnements, quotas, modules activés et licences spéciales.
- Le CLIENT_ADMIN peut attribuer READ_ONLY sans limite et READ_WRITE + CLIENT_BILLABLE dans la limite du quota.
- Le CLIENT_ADMIN ne peut pas attribuer EXTERNAL_BILLABLE, NON_BILLABLE, PLATFORM_INTERNAL ou EVALUATION.
- Le CLIENT_ADMIN administre les droits mais ne voit pas automatiquement toutes les données sensibles.
- Les ACL doivent cibler utilisateurs et groupes.
- Si aucune ACL n’existe sur une ressource, le comportement actuel est conservé.
- Si une ACL existe sur une ressource, seuls les sujets autorisés peuvent accéder.

Licences :
ClientUserLicenseType :
- READ_ONLY
- READ_WRITE

ClientUserLicenseBillingMode :
- CLIENT_BILLABLE
- EXTERNAL_BILLABLE
- NON_BILLABLE
- PLATFORM_INTERNAL
- EVALUATION

Règles :
- READ_ONLY interdit toute écriture.
- READ_ONLY ne consomme aucun quota.
- READ_WRITE + CLIENT_BILLABLE consomme un siège de l’abonnement.
- EXTERNAL_BILLABLE ne consomme pas le quota client.
- NON_BILLABLE ne consomme pas le quota client et nécessite un motif.
- PLATFORM_INTERNAL ne consomme pas le quota client, nécessite un motif et une date de fin.
- EVALUATION ne consomme pas le quota client, dure 30 jours par défaut et nécessite un motif.
- EVALUATION expirée bloque l’écriture.
- PLATFORM_INTERNAL expiré bloque l’accès support.

Modèles Prisma à créer ou compléter :
- ClientSubscription
- ClientUser avec licenseType, licenseBillingMode, subscriptionId, licenseStartsAt, licenseEndsAt, licenseAssignmentReason
- AccessGroup
- AccessGroupMember
- ClientModuleVisibility
- ResourceAcl

Services :
- SubscriptionService
- LicenseService
- AccessGroupService
- ModuleVisibilityService
- AccessControlService

Guards :
- LicenseGuard
- ModuleVisibilityGuard
- ResourceAclGuard

Pipeline cible client :
JwtAuthGuard
→ ActiveClientGuard
→ ModuleAccessGuard
→ ModuleVisibilityGuard
→ LicenseGuard
→ PermissionsGuard
→ ResourceAclGuard si ressource ciblée

Endpoints plateforme :
- GET /api/platform/clients/:clientId/subscriptions
- POST /api/platform/clients/:clientId/subscriptions
- PATCH /api/platform/clients/:clientId/subscriptions/:subscriptionId
- POST /api/platform/clients/:clientId/subscriptions/:subscriptionId/activate
- POST /api/platform/clients/:clientId/subscriptions/:subscriptionId/suspend
- POST /api/platform/clients/:clientId/subscriptions/:subscriptionId/cancel
- GET /api/platform/clients/:clientId/license-usage
- PATCH /api/platform/clients/:clientId/users/:userId/license

Endpoints client :
- GET /api/client-license-usage
- PATCH /api/users/:userId/license
- GET /api/access-groups
- POST /api/access-groups
- GET /api/access-groups/:id
- PATCH /api/access-groups/:id
- DELETE /api/access-groups/:id
- GET /api/access-groups/:id/members
- POST /api/access-groups/:id/members
- DELETE /api/access-groups/:id/members/:userId
- GET /api/module-visibility
- PATCH /api/module-visibility
- GET /api/resource-acl/:resourceType/:resourceId
- PUT /api/resource-acl/:resourceType/:resourceId
- POST /api/resource-acl/:resourceType/:resourceId/entries
- DELETE /api/resource-acl/:resourceType/:resourceId/entries/:entryId

Frontend :
Créer :
- /admin/clients/[clientId]/subscriptions
- /admin/clients/[clientId]/licenses
- /client/administration/licenses
- /client/administration/access-groups
- /client/administration/module-visibility

Ajouter progressivement un onglet Accès sur les ressources métier.

Contraintes :
- Ne pas casser le RBAC existant.
- Ne pas rendre les ressources existantes invisibles sans ACL.
- Ne jamais accepter clientId dans les DTO client-scopés.
- Les routes plateforme peuvent cibler clientId dans l’URL car elles sont protégées par PlatformAdminGuard.
- Toutes les requêtes client doivent utiliser le client actif.
- Backend source de vérité.
- Aucun ID brut affiché seul côté UI.
- Audit obligatoire sur toute modification de licence, abonnement, groupe, visibilité module ou ACL.

Tests obligatoires :
- READ_ONLY ne peut pas écrire.
- READ_ONLY est illimité.
- READ_WRITE + CLIENT_BILLABLE consomme quota abonnement.
- Dépassement quota refusé.
- EXTERNAL_BILLABLE ne consomme pas quota.
- NON_BILLABLE sans motif refusé.
- PLATFORM_INTERNAL sans date de fin refusé.
- EVALUATION sans date de fin génère J+30.
- EVALUATION expirée bloque écriture.
- CLIENT_ADMIN ne peut pas attribuer les licences spéciales.
- PLATFORM_ADMIN peut attribuer tous les modes.
- Changement de mode libère ou consomme un siège correctement.
- Module masqué refuse l’accès.
- ACL utilisateur et groupe fonctionnent.
- Absence ACL conserve comportement actuel.
- Cross-client interdit.
- Audit log écrit pour chaque action sensible.

Découpage recommandé :
- RFC-ACL-001 : abonnements et licences client
- RFC-ACL-002 : licences spéciales et évaluation
- RFC-ACL-003 : groupes d’accès
- RFC-ACL-004 : visibilité modules
- RFC-ACL-005 : ACL ressources génériques
- RFC-ACL-006 : intégration modules métier
- RFC-ACL-007 : frontend administration ACL
- RFC-ACL-008 : audit et traçabilité avancée ACL
- RFC-ACL-009 : expiration automatique et jobs
- RFC-ACL-010 : UX cockpit licences & droits
- RFC-ACL-011 : matrice des droits effectifs
- RFC-ACL-012 : commercialisation et reporting licences
```
