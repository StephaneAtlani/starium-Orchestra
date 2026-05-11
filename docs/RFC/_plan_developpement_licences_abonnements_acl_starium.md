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
  CANCELED
  EXPIRED
}

enum SubscriptionBillingPeriod {
  MONTHLY
  YEARLY
}
```

### 8.2 ClientSubscription

```prisma
model ClientSubscription {
  id                  String                    @id @default(cuid())
  clientId            String
  status              ClientSubscriptionStatus  @default(DRAFT)
  billingPeriod       SubscriptionBillingPeriod @default(MONTHLY)
  readWriteSeatsLimit Int
  startsAt            DateTime?
  endsAt              DateTime?
  graceEndsAt         DateTime?
  createdAt           DateTime                  @default(now())
  updatedAt           DateTime                  @updatedAt

  @@index([clientId])
  @@index([clientId, status])
}
```

> Note V1 : pas de champ `name`, `durationMonths`, `gracePeriodDays`, `billingReference`, `notes`. La période de grâce est portée par `graceEndsAt` (date absolue calculée à la création / activation), pas par une durée stockée. La règle commerciale §7 reste valide en entrée de calcul, mais elle n’est pas matérialisée dans la table.

### 8.3 Extension ClientUser

Ajouter sur `ClientUser` :

```prisma
subscriptionId           String?

licenseType              ClientUserLicenseType        @default(READ_ONLY)
licenseBillingMode       ClientUserLicenseBillingMode @default(NON_BILLABLE)

licenseStartsAt          DateTime?
licenseEndsAt            DateTime?
licenseAssignmentReason  String?

@@index([clientId, subscriptionId])
@@index([clientId, licenseType, licenseBillingMode])
@@index([clientId, licenseEndsAt])
```

---

## 9. Groupes d’accès

### 9.1 AccessGroup

```prisma
model AccessGroup {
  id        String   @id @default(cuid())
  clientId  String
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  members   AccessGroupMember[]

  @@unique([clientId, name])
  @@index([clientId])
}
```

> V1 : pas de `description` ni `isSystem` en base. Le frontend peut afficher un sous-titre dérivé (nb membres, etc.) mais ne s’appuie pas sur ces champs.

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
  id             String                 @id @default(cuid())
  clientId       String
  /// Code normalisé (uppercase), whitelist métier V1 côté application.
  resourceType   String
  resourceId     String
  subjectType    ResourceAclSubjectType
  subjectId      String
  permission     ResourceAclPermission
  createdAt      DateTime               @default(now())
  updatedAt      DateTime               @updatedAt

  @@unique([clientId, resourceType, resourceId, subjectType, subjectId])
  @@index([clientId, resourceType, resourceId])
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

> Important V1 : la contrainte d’unicité ne contient **pas** `permission`. Un même sujet (`USER` ou `GROUP`) ne peut donc avoir **qu’une seule** entrée par `(clientId, resourceType, resourceId)`. La hiérarchie `READ < WRITE < ADMIN` étant inclusive, il n’est jamais utile de stocker plusieurs niveaux pour le même sujet : la mise à jour remplace le niveau (PUT/POST côté API). Pas d’index secondaire `[clientId, subjectType, subjectId]` en V1 (les requêtes passent toujours par la clé `(resourceType, resourceId)` ou par filtrage via groupes).

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

Méthodes (réelles) :

```ts
getClientUsage(clientId: string)
assignByPlatform(actorUserId, clientId, userId, dto, meta?)
assignByClientAdmin(actorUserId, clientId, userId, dto, meta?)
validateWriteAccess(userId: string, clientId: string): Promise<void>
```

`validateWriteAccess` est la primitive utilisée par `LicenseWriteGuard` (mutations) et levée explicitement par les services métier sensibles. Pas d’API publique `isLicenseActive` / `isSubscriptionUsable` séparée — la logique est encapsulée en interne.

### 13.2 SubscriptionService

Responsabilités : créer abonnement client, activer/suspendre/annuler abonnement, calculer période de grâce, calculer usage par abonnement, vérifier abonnement actif ou en grâce.

Méthodes (réelles) :

```ts
listByClient(clientId: string)
create(actorUserId, clientId, dto, meta?)
update(actorUserId, clientId, subscriptionId, dto, meta?)
transition(actorUserId, clientId, subscriptionId, targetStatus, meta?)
```

`transition` couvre `activate / suspend / cancel` côté contrôleur (les routes POST `/activate|/suspend|/cancel` mappent vers la même primitive avec un statut cible). L’expiration automatique (`EXPIRED`) est déclenchée par le job RFC-ACL-009, pas par cette primitive directement.

### 13.3 ModuleVisibilityService

Responsabilités : résoudre les modules visibles, appliquer priorité `USER > GROUP > CLIENT`, filtrer navigation frontend, bloquer accès API si module masqué.

Méthodes (réelles) :

```ts
computeVisibilityForModule(...)                        // pure, applique la priorité
isVisibleForUser(userId, clientId, moduleCode)
getVisibilityMap(userId, clientId)                     // tous modules → état effectif
getVisibleModuleCodesForUser(userId, clientId)         // alimente GET /me/permissions
listMatrix(clientId): ModuleVisibilityMatrixRow[]      // UI matrice CLIENT_ADMIN
setOverride(actor, dto, meta?)                         // PATCH /api/module-visibility
removeOverride(actor, target, meta?)                   // DELETE /api/module-visibility
```

Consommé par `ModuleAccessGuard` + `EffectivePermissionsService` (pas de guard séparé `ModuleVisibilityGuard`).

### 13.4 AccessGroupService

Responsabilités : CRUD groupes, gestion membres, vérification cross-client, audit changements.

Méthodes (réelles) :

```ts
listGroups(clientId)
getGroupById(clientId, groupId)
createGroup(actor, clientId, dto, meta?)
updateGroup(actor, clientId, groupId, dto, meta?)
deleteGroup(actor, clientId, groupId, meta?)          // transaction : supprime aussi les ResourceAcl GROUP associées (RFC-ACL-005)
listMembers(clientId, groupId)
addMember(actor, clientId, groupId, userId, meta?)    // refus si userId hors client
removeMember(actor, clientId, groupId, userId, meta?)
```

Tous appels protégés par `ActiveClientGuard` + RBAC `CLIENT_ADMIN` ; isolation stricte par `clientId` du contexte actif.

### 13.5 AccessControlService

Responsabilités : vérifier ACL ressource, résoudre droits utilisateur + groupes, gérer absence ACL = comportement actuel.

Méthodes (réelles, V1) :

```ts
// Validation et parsing route (utilisé par contrôleurs ET ResourceAclGuard)
resolveResourceAclRoute(...)
parseResourceTypeFromRoute(raw)
parseResourceIdFromRoute(raw)
assertSubjectInClient(clientId, subjectType, subjectId)

// Lecture / mutation des entrées (API /api/resource-acl/...)
listEntries(clientId, resourceType, resourceId)
replaceEntries(actor, clientId, resourceType, resourceId, entries, meta?)   // PUT — transactionnel
addEntry(actor, clientId, resourceType, resourceId, entry, meta?)           // POST entries
removeEntry(actor, clientId, resourceType, resourceId, entryId, meta?)      // DELETE entries

// Évaluation droits (consommée par ResourceAclGuard et services métier RFC-ACL-006)
canReadResource({ userId, clientId, resourceType, resourceId })
canWriteResource({ userId, clientId, resourceType, resourceId })
canAdminResource({ userId, clientId, resourceType, resourceId })
filterReadableResourceIds({ userId, clientId, resourceType, resourceIds })  // anti N+1 RFC-ACL-006
```

> Pas d’API `assertCanReadResource` / `assertCanWriteResource` / `assertCanAdminResource` séparée en V1 — les modules métier appellent les `can…Resource` et lèvent l’exception localement, ou s’appuient sur `ResourceAclGuard`. La hiérarchie `READ < WRITE < ADMIN` est appliquée côté évaluation : `WRITE` couvre `READ`, `ADMIN` couvre tout.

---

## 14. Guards backend

Pipeline réel V1 :

```text
JwtAuthGuard
→ ActiveClientGuard
→ ModuleAccessGuard         (module activé client + visibilité module RFC-ACL-004)
→ PermissionsGuard          (RBAC sur permissions décorées)
→ LicenseWriteGuard         (sur mutations explicitement annotées)
→ ResourceAclGuard          (si la route déclare resourceType / resourceId, RFC-ACL-006)
```

### 14.1 LicenseWriteGuard

Bloque les mutations en : `READ_ONLY`, licence expirée, `CLIENT_BILLABLE` hors abonnement actif/grâce, `EVALUATION` expirée, `PLATFORM_INTERNAL` expiré.

> Pas de `LicenseGuard` global posé sur tout le pipeline : la vérification d’écriture est ciblée via `LicenseWriteGuard` + appel direct à `LicenseService.validateWriteAccess()` dans les services sensibles. Les lectures restent gouvernées par RBAC + visibilité module + ACL ressource.

### 14.2 Visibilité modules

Pas de `ModuleVisibilityGuard` séparé. La visibilité module (RFC-ACL-004) est intégrée à `ModuleAccessGuard` via `EffectivePermissionsService`, qui combine module activé client + override `USER > GROUP > CLIENT`. Le frontend reçoit `visibleModuleCodes` sur `GET /api/me/permissions`.

### 14.3 ResourceAclGuard

Bloque si la ressource est restreinte (au moins une entrée ACL existe) et que l’utilisateur n’a pas le niveau requis (READ < WRITE < ADMIN), y compris pour `CLIENT_ADMIN` (mode strict, voir §18.1). Posé sélectivement dans les contrôleurs métier (RFC-ACL-006), pas globalement.

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
GET   /api/platform/clients/:clientId/users
PATCH /api/platform/clients/:clientId/users/:userId/license
```

- **`GET …/users`** (RFC-ACL-010) : liste des membres du **client ciblé par** `:clientId` — **même shape** que `GET /api/users` (User + `ClientUser`, y compris champs licence). Protégé par **`JwtAuthGuard` + `PlatformAdminGuard` uniquement** : **pas** d’`ActiveClientGuard`, **pas** de résolution via le client actif / `X-Client-Id`. Retourne **404** si le `Client` n’existe pas.
- Le `PATCH` plateforme peut modifier : `licenseType`, `licenseBillingMode`, `subscriptionId`, `licenseStartsAt`, `licenseEndsAt`, `licenseAssignmentReason`.

### 15.4 Client — usage licences

```text
GET /api/client-license-usage
```

Réponse réelle (V1, alignée `LicenseService.getClientUsage`) :

```ts
{
  clientId: string;
  totalReadWriteBillableUsed: number;
  subscriptions: Array<{
    id: string;
    status: ClientSubscriptionStatus;
    graceEndsAt: string | null;
    readWriteSeatsLimit: number;
    readWriteBillableUsed: number;
  }>;
}
```

> Les compteurs détaillés par mode (`EVALUATION`, `NON_BILLABLE`, `PLATFORM_INTERNAL`, `EXTERNAL_BILLABLE`, `READ_ONLY`) sont exposés par les cockpits (RFC-ACL-010) et le reporting plateforme (RFC-ACL-012, `GET /api/platform/license-reporting/overview`), pas par cet endpoint client. La shape ci-dessus reste volontairement minimale pour le quota commercial.

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
GET    /api/module-visibility
PATCH  /api/module-visibility
DELETE /api/module-visibility
```

`DELETE` retire un override (retour à l’héritage `USER > GROUP > CLIENT > module activé plateforme`). Le payload identifie la cible par `moduleCode` + `scopeType` + `scopeId?`.

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

### 15.9 Plateforme — diagnostics droits effectifs (RFC-ACL-011)

```text
GET /api/access-diagnostics/effective-rights                                    (client actif)
GET /api/platform/clients/:clientId/access-diagnostics/effective-rights        (PlatformAdminGuard)
```

Réponse : 6 couches consolidées (`license`, `subscription`, `moduleActivation`, `moduleVisibility`, `rbac`, `acl`). Whitelist `resourceType` V1 = `PROJECT | BUDGET | CONTRACT | SUPPLIER | STRATEGIC_OBJECTIVE`. Refus générique `DIAGNOSTIC_SCOPE_MISMATCH` hors périmètre (anti-fuite).

### 15.10 Plateforme — reporting commercial licences (RFC-ACL-012)

```text
GET /api/platform/license-reporting/overview
GET /api/platform/license-reporting/clients
GET /api/platform/license-reporting/monthly
GET /api/platform/license-reporting/clients.csv
GET /api/platform/license-reporting/monthly.csv
```

Tous protégés par `JwtAuthGuard` + `PlatformAdminGuard` (pas d’endpoint client).

Filtres communs : `clientId`, `licenseBillingMode`, `subscriptionStatus`, `from` (mois), `to` (mois). Fenêtre max 24 mois pour `/monthly`. Calcul à la volée à partir des dates `licenseStartsAt` / `licenseEndsAt` / `subscription.startsAt` / `subscription.endsAt` / `graceEndsAt` (pas de table d’agrégats en V1).

Exports : CSV RFC 4180 + BOM UTF-8 ; JSON via les endpoints non `.csv`.

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

### 16.4 Cockpits et diagnostics livrés (RFC-ACL-010 / RFC-ACL-011)

```text
/admin/clients/[clientId]/licenses-cockpit              (RFC-ACL-010)
/admin/clients/[clientId]/access-diagnostics            (RFC-ACL-011)
/client/administration/licenses-cockpit                 (RFC-ACL-010)
/client/administration/access-cockpit                   (RFC-ACL-010)
/client/administration/access-diagnostics               (RFC-ACL-011)
```

### 16.5 Reporting commercial plateforme (RFC-ACL-012)

```text
/admin/license-reporting     (PlatformAdminGuard, sidebar Plateforme)
```

KPI cards (8 indicateurs canoniques), table par client, trajectoire mensuelle, filtres (`clientId`, `licenseBillingMode`, `subscriptionStatus`, `from`/`to`), exports CSV / JSON. Pas d’écran client équivalent en V1 (reporting plateforme uniquement).

---

## 17. Audit obligatoire

Actions canoniques (alignées sur `acl-audit-actions.ts`, RFC-ACL-008) :

```text
# Abonnements client
client_subscription.created
client_subscription.updated
client_subscription.activated
client_subscription.suspended
client_subscription.cancelled
client_subscription.expired

# Licence utilisateur (une seule action canonique par mutation)
client_user.license.assigned
client_user.license.updated
client_user.license.evaluation_granted
client_user.license.evaluation_extended
client_user.license.evaluation_expired
client_user.license.support_access_granted
client_user.license.support_access_expired
client_user.license.subscription_expired_downgrade
client_user.license.billing_mode_changed
client_user.license.write_denied

# Groupes d’accès
access_group.created
access_group.updated
access_group.deleted
access_group.member_added
access_group.member_removed

# Visibilité modules
module_visibility.updated

# ACL ressources
resource_acl.replaced
resource_acl.entry_created
resource_acl.entry_deleted
```

> Notes V1 :
> - **Pas** d’action `client_user.license.revoked` ni `evaluation_converted` séparée : les transitions correspondantes se résolvent en `updated` ou `billing_mode_changed` via `resolveCanonicalLicenseAction()`.
> - **Pas** d’action `client_user.license.expired` générique : utiliser `evaluation_expired`, `support_access_expired` ou `subscription_expired_downgrade` selon le déclencheur (job RFC-ACL-009).
> - `write_denied` est utilisé par `LicenseWriteGuard` pour tracer un blocage (avec `LicenseWriteDeniedReasonCode`).
> - Les payloads `oldValue` / `newValue` suivent l’enveloppe `{ assignment | subscription, meta }` (snapshot métier + meta `actorUserId`/`targetUserId`/`reason`/`requestId`/`ipAddress`/`userAgent`).

Audit minimum côté ligne : `clientId`, `targetUserId`, `actorUserId`, `resourceType`, `resourceId`, `oldValue`, `newValue`, `licenseType`, `licenseBillingMode`, `subscriptionId`, `reason`, `requestId`, `ipAddress`, `userAgent`, `createdAt`.

---

## 18. Roadmap RFC — Licences, abonnements et ACL

| RFC | Nom | Objectif | Description | Priorité | État | Dépendances | Livrables principaux |
|---|---|---|---|---|---|---|---|
| RFC-ACL-001 | Abonnements et licences client | Mettre en place le socle commercial des licences | Créer les abonnements client, les quotas READ_WRITE, les licences READ_ONLY / READ_WRITE portées par `ClientUser`, et le contrôle de consommation des sièges | P0 | **Implémentée (backend MVP)** | RBAC existant, ClientUser, PlatformAdminGuard | `ClientSubscription`, extension `ClientUser`, `LicenseService`, `SubscriptionService`, endpoints plateforme + client, usage licences, `LicenseWriteGuard` appliqué sur des routes représentatives ; déploiement global du guard reste évolutif ; **cockpit licences UI = RFC-ACL-010** |
| RFC-ACL-002 | Licences spéciales et évaluation | Gérer les licences non standard | Ajouter les modes `EXTERNAL_BILLABLE`, `NON_BILLABLE`, `PLATFORM_INTERNAL`, `EVALUATION`, avec motif, expiration, audit et conversion | P0 | **Implémentée (backend)** | RFC-ACL-001 | Matrice stricte licence/billing, règles `subscriptionId`/motif/dates, blocage écriture si licence expirée, compatibilité backfill ACL-001, tests dédiés ; jobs d’expiration = RFC-ACL-009 |
| RFC-ACL-003 | Groupes d’accès client | Créer des groupes métier d’accès | Permettre au CLIENT_ADMIN de créer des groupes et d’y affecter des utilisateurs pour simplifier la gestion des droits | P1 | **Implémentée (MVP)** | ClientUser, ActiveClientGuard | `AccessGroup`, `AccessGroupMember`, API `/api/access-groups*`, audit `access_group.*`, UI canonique **`/client/administration/access-groups`** (legacy `/client/access-groups` → redirect uniquement) ; pas de branchement sur permissions métier dans ce lot |
| RFC-ACL-004 | Visibilité des modules | Masquer ou afficher des modules selon client, groupe ou utilisateur | Permettre au CLIENT_ADMIN de masquer certains modules pour tout le client, un groupe ou un utilisateur, sans désactiver le module côté plateforme | P1 | **Implémentée (MVP)** | RFC-ACL-003 (groupes réutilisables), modules client existants | `ClientModuleVisibility`, `ModuleVisibilityService`, API `/api/module-visibility`, visibilité appliquée dans `ModuleAccessGuard` (+ `EffectivePermissionsService`), `visibleModuleCodes` sur `GET /me/permissions`, UI `/client/administration/module-visibility`, navigation filtrée, tests priorité USER > GROUP (VISIBLE gagnant) > CLIENT |
| RFC-ACL-005 | ACL ressources génériques | Créer le moteur ACL réutilisable | Ajouter une couche d’accès fine sur les ressources métier : utilisateur/groupe + READ/WRITE/ADMIN | P1 | **Implémentée (backend MVP)** | RFC-ACL-003 | Livré : `ResourceAcl`, `AccessControlModule` dans **`AppModule`** (hors `CommonModule`), `resolveResourceAclRoute` avant toute requête Prisma, API `/api/resource-acl/...`, garde + décorateur, whitelist + CUID, `PUT` transactionnel, `DELETE` scoping strict, audit **old/new** structurés (snapshots replace/delete), DTO sans `clientId`, transaction `deleteGroup` + `ResourceAcl` ; absence d’entrées = RBAC inchangé ; périmètre UI = **RFC-ACL-013** (§18.1) |
| RFC-ACL-006 | Intégration ACL dans les modules métier | Brancher l’ACL sur les ressources réelles | Appliquer progressivement l’ACL sur Documents, Projets, Budgets, Contrats, Fournisseurs, Applications, Vision stratégique et Cycles de pilotage | P2 | **Implémentée (backend V1)** | RFC-ACL-005 | ACL intégrée sur Projects/Budgets/Budget-lines (héritage)/Contracts/Suppliers/ProjectDocuments/ContractAttachments/StrategicObjective, filtrage batch anti N+1, contrôles détail+mutation, tests backend ciblés |
| RFC-ACL-007 | Frontend administration ACL | Créer les interfaces d’administration | Ajouter les écrans plateforme et client pour gérer abonnements, licences, groupes, visibilité modules et ACL ressources | P1 | **🟡 En cours (frontend partiel)** | RFC-ACL-001 à 006 | pages livrées: `/admin/clients/[clientId]/subscriptions`, `/admin/clients/[clientId]/licenses`, `/client/administration/licenses`, `/client/administration/access-groups`, **cockpits RFC-ACL-010** (`/client/administration/licenses-cockpit`, `/client/administration/access-cockpit`, `/admin/clients/[clientId]/licenses-cockpit`); data layer `features/licenses/*` (API + hooks + query keys) ; **éditeur ACL par ressource en contexte = RFC-ACL-013 (V1)** ; restent à finaliser: portail transverse type « liste centrale des ACL » (vision RFC-007 historique) + cohérence permissions/navigation |
| RFC-ACL-008 | Audit et traçabilité avancée ACL | Renforcer la traçabilité sécurité | Centraliser et normaliser les audit logs sur licences, abonnements, groupes, visibilité modules, ACL et accès support | P1 | **🟡 Partielle (socle backend)** | RFC-ACL-001 à 006 | nomenclature ACL/licences enrichie, `AuditLogsService.create(input, tx?)` transactionnel, payloads `oldValue/newValue` généralisés sur mutations critiques ; restent: couverture exhaustive des actions + filtres/reporting dédiés |
| RFC-ACL-009 | Expiration automatique et jobs | Automatiser les expirations | Jobs backend pour expirer licences d’évaluation/support, abonnements hors grâce et notifier les admins | P2 | **Implémentée (backend MVP)** | RFC-ACL-001, RFC-ACL-002 | Cron + BullMQ (`license_expiration_scan`), runner transactionnel, downgrades explicites (`READ_ONLY` + `NON_BILLABLE`), audit `client_subscription.expired` + `client_user.license.*_expired`, notifications admin dédupliquées |
| RFC-ACL-010 | UX cockpit licences & droits | Rendre le modèle lisible pour les admins | Créer une vue claire des licences, quotas, abonnements, statuts et droits effectifs, avec filtres et badges métier | P2 | **Implémentée (V1)** | RFC-ACL-001 à 004 (données), RFC-ACL-007 cohabitation CRUD | Cockpits `/client/administration/licenses-cockpit`, `/client/administration/access-cockpit`, `/admin/clients/[clientId]/licenses-cockpit` ; features `licenses-cockpit/*`, `access-cockpit/*` ; `GET /api/platform/clients/:clientId/users` (PlatformAdminGuard uniquement, pas ActiveClient) ; `UserResponse` étendu dates/motif licence ; quick-actions sous fallback rôle documenté (`license-quick-actions-policy.ts`) tant qu’aucune permission API dédiée ; aucun `/client/access-groups` exposé dans l’UI ; aucun ID brut comme libellé principal |
| RFC-ACL-011 | Matrice des droits effectifs | Afficher “pourquoi un utilisateur a accès ou non” | Ajouter une vue de diagnostic des droits effectifs combinant licence, module, RBAC, visibilité module et ACL ressource | P2 | **Implémentée (V1)** | RFC-ACL-004, RFC-ACL-005 | Module Nest `access-diagnostics` (endpoints client `GET /api/access-diagnostics/effective-rights` et plateforme `GET /api/platform/clients/:clientId/access-diagnostics/effective-rights`), 6 couches consolidées (`license`/`subscription`/`moduleActivation`/`moduleVisibility`/`rbac`/`acl`), whitelist `resourceType` V1 (`PROJECT`/`BUDGET`/`CONTRACT`/`SUPPLIER`/`STRATEGIC_OBJECTIVE`), refus générique `DIAGNOSTIC_SCOPE_MISMATCH` hors périmètre (anti-fuite), UI `/client/administration/access-diagnostics` + `/admin/clients/[clientId]/access-diagnostics` |
| RFC-ACL-012 | Commercialisation et reporting licences | Préparer la facturation SaaS | Produire des indicateurs commerciaux : licences consommées, abonnements actifs, évaluations en cours, licences non facturables, accès support | P3 | **Implémentée (V1)** | RFC-ACL-001, RFC-ACL-002 | Module Nest `license-reporting` (PlatformAdminGuard), endpoints `/api/platform/license-reporting/{overview,clients,monthly,*.csv}`, dictionnaire KPI canonique, exports CSV (RFC 4180 + BOM UTF-8) et JSON, feature web `/admin/license-reporting` (KPI cards + trajectoire mensuelle + table par client), filtres `clientId/licenseBillingMode/subscriptionStatus/from/to`, fenêtre max 24 mois, calcul à la volée sans nouvelle table |
| RFC-ACL-013 | Éditeur ACL par ressource | Permettre au CLIENT_ADMIN d’éditer les ACL depuis les fiches métier | Dialog + liste + ajout/retrait d’entrées (USER/GROUP, READ/WRITE/ADMIN), garde-fous self-lockout / dernier ADMIN, client actif + header `X-Client-Id`, aucune route Next dédiée | P2 | **Implémentée (V1 — frontend)** | RFC-ACL-005, RFC-ACL-006 | Feature `apps/web/src/features/resource-acl/` (API client, query keys tenant-aware, hooks, libs, tests Vitest) ; intégrations : projets, contrats, fournisseurs, budgets, lignes de budget (lecture héritée + CTA), objectifs stratégiques ; visibilité stricte `CLIENT_ADMIN` |
| RFC-ACL-014 | Conformité modèle Rôles + Groupes + ACL (5 couches) | Aligner code + UI + doc sur le modèle réel à 5 couches (licence/abonnement/module activé/visibilité/RBAC/ACL) | Garde-fou backend `last ADMIN` (409, `force=true` PLATFORM_ADMIN only), diagnostic self-service `GET /api/access-diagnostics/effective-rights/me` ouvert `CLIENT_USER` (anti-fuite), popover « Pourquoi cet accès ? », page d’aide `/client/help/access-model`, `docs/ACCESS-MODEL.md`, `/me/permissions` enrichi `roles[]`, renommage UI « Permissions » → « Accès à la ressource » | P2 | **Draft** | RFC-ACL-005, RFC-ACL-011, RFC-ACL-013 | Garde-fou serveur, route `me/effective-rights`, `<AccessExplainerPopover />`, `/client/help/access-model`, `docs/ACCESS-MODEL.md`, audit `resource_acl.lockout_blocked` + `access_diagnostic.self_requested` ; aucune migration Prisma |

La colonne **État** ci-dessus pour ACL-001 à **006** et ACL-009 est alignée avec l’implémentation backend actuelle. **RFC-ACL-010** (cockpits licences / accès), **RFC-ACL-011** (matrice droits effectifs), **RFC-ACL-012** (commercialisation / reporting plateforme) et **RFC-ACL-013** (éditeur ACL par ressource sur fiches métier) sont **implémentées (V1)** côté web et/ou API selon le périmètre de chaque RFC. ACL-007/008 restent en avancement partiel côté frontend (portail admin transverse / traçabilité exhaustive) au-delà des lots livrés ci-dessus.

### 18.1 RFC-ACL-005 — décisions V1 pour l’implémentation backend

Référence RFC : [RFC-ACL-005 — ACL ressources génériques](./RFC-ACL-005%20%E2%80%94%20ACL%20ressources%20g%C3%A9n%C3%A9riques.md). Le module NestJS **`access-control`** est **livré** sous `apps/api/src/modules/access-control/` et importé depuis **`AppModule`** (sans **`CommonModule`**, pour limiter cycles / exports globaux) ; les règles suivantes décrivent le comportement **V1** réel backend (toujours **sans** portail transverse type liste centrale RFC-ACL-007 ; l’éditeur **contextuel** par ressource côté web = [RFC-ACL-013](./RFC-ACL-013%20%E2%80%94%20%C3%89diteur%20ACL%20par%20ressource.md)). Toujours **sans** application systématique de `ResourceAclGuard` sur les contrôleurs HTTP métier RFC-ACL-006, sauf évolution ultérieure documentée.

- **Validation route** : **`resolveResourceAclRoute`** — même règles **`resourceType` / `resourceId`** pour **GET, PUT, POST, DELETE** et pour **`ResourceAclGuard`**.
- **RFC-ACL-006** : chaque module métier qui pose **`ResourceAclGuard`** doit importer **`AccessControlModule`** dans son module Nest (les providers ne sont pas globaux via `CommonModule`).

**Rôle CLIENT_ADMIN**

- **Mode strict** sur l’accès **métier** derrière `ResourceAclGuard` : même un `CLIENT_ADMIN` doit avoir une entrée ACL **dont le niveau agrégé suffit** dès qu’au moins une entrée existe pour la ressource (mode restreint).
- Les routes sous **`/api/resource-acl/…`** restent réservées aux **`CLIENT_ADMIN`** (comme pour groupes et visibilité modules).
- Il n’y a **pas** de contournement implicite de l’ACL côté garde selon le rôle.

**Hiérarchie des permissions**

- Ordre : `READ` &lt; `WRITE` &lt; `ADMIN`.
- `WRITE` inclut `READ` ; `ADMIN` inclut `WRITE` et `READ`.
- `canReadResource` : accepte `READ`, `WRITE` ou `ADMIN`.
- `canWriteResource` : accepte `WRITE` ou `ADMIN` uniquement.
- `canAdminResource` : accepte `ADMIN` uniquement.

**API `PUT /api/resource-acl/:resourceType/:resourceId` (remplacement du jeu d’entrées)**

- Validation **complète** du payload avant toute suppression en base (DTO, enums, doublons `(subjectType, subjectId)` dans le body → `400` explicite).
- Vérification que **chaque sujet** `USER` / `GROUP` **appartient au client actif** avant mutation.
- **Transaction Prisma** : après validations réussies uniquement (`deleteMany` puis recréation) ; **ne jamais** supprimer l’ancien jeu si une validation échoue.

**Paramètres de route**

- `resourceType` et `resourceId` : validation **stricte** (whitelist ou format, longueurs plafonnées, identifiant aligné sur les **CUID** Prisma du repo pour `resourceId`) ; valeurs vides ou invalides → `400`. La vérification d’**existence métier** de la ressource cible reste du ressort de **RFC-ACL-006**.

**Intégrité avec les groupes**

- Lors de la suppression d’un **`AccessGroup`**, supprimer **obligatoirement** les lignes `ResourceAcl` avec `subjectType = GROUP` et `subjectId` = id du groupe, **dans la même transaction** que la suppression du groupe lorsque c’est possible (pas de FK polymorphe sur `subjectId`).

**Périmètre exclu de la livraison RFC-005**

- Aucun branchement de `ResourceAclGuard` sur les contrôleurs métier (projets, budgets, etc.) : **RFC-ACL-006**.
- Aucun écran **liste centrale** « toutes les ACL du client » au sens portail **RFC-ACL-007** : l’UI V1 d’édition se fait **en contexte** sur chaque ressource (**RFC-ACL-013**).

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
| 13 | RFC-ACL-013 | Éditeur ACL sur les fiches métier (client actif, `CLIENT_ADMIN`) |
| 14 | RFC-ACL-014 | Conformité 5 couches : garde-fou serveur lockout + diagnostic self-service + page d’aide |

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
ACL WRITE autorise aussi lecture (via hiérarchie)
ACL ADMIN autorise lecture et écriture (via hiérarchie)
ACL groupe WRITE autorise écriture aux membres
CLIENT_ADMIN sans entrée ACL sur ressource en mode restreint est refusé (strict)
PUT remplace ACL sans effacer l’ancien jeu si validation ou doublon dans body
doublons sujet dans body PUT ⇒ 400
resourceType invalide ⇒ 400
resourceId invalide ⇒ 400
suppression groupe supprime les ResourceAcl GROUP associées (même transaction)
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
- LicenseWriteGuard (écriture, routes ciblées)
- ModuleAccessGuard (module activé + visibilité module RFC-ACL-004 + RBAC sur permissions décorées)
- ResourceAclGuard (RFC-ACL-005, RFC-ACL-006 sur routes métier — le module Nest concerné importe **AccessControlModule**, non exposé par **CommonModule**)

Pipeline cible client :
JwtAuthGuard
→ ActiveClientGuard
→ ModuleAccessGuard
→ LicenseWriteGuard sur mutations si route annotée
→ PermissionsGuard
→ ResourceAclGuard si ressource ciblée (RFC-ACL-006)

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
- /client/access-groups (groupes d’accès)
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
- RFC-ACL-013 : éditeur ACL par ressource (fiches métier)
- RFC-ACL-014 : conformité modèle 5 couches (garde-fou serveur + self-diagnostic + page d’aide)
```
