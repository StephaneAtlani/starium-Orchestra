# RFC-ORG-001 — Socle Organisation Client

## Statut

**Implémentée** (socle V1 dans le dépôt : Prisma, API Nest `organization`, seed module + permissions, UI administration client).

## Référence code (vérité opérationnelle)

- **Backend** : `apps/api/src/modules/organization/` (`OrganizationModule` enregistré dans `apps/api/src/app.module.ts`). Prisma : `OrgUnit`, `OrgUnitMembership`, `OrgGroup`, `OrgGroupMembership` dans `apps/api/prisma/schema.prisma` ; migration `apps/api/prisma/migrations/20260512130000_rfc_org_001_organization/migration.sql`.
- **Rattachements** : uniquement **`Resource` de type `HUMAN`** (pas de `userId` sur les memberships). Unicité `(clientId, code)` sur unités et groupes lorsque `code` est renseigné ; plusieurs lignes sans `code` autorisées (NULL distinct en PostgreSQL).
- **API** : préfixe `/api/organization/units` et `/api/organization/groups` (CRUD unités/groupes, archive, membres). Permissions : `organization.read`, `organization.update`, `organization.members.update`. Seed : `ensureOrganizationModuleAndPermissions` + rôle global « Client admin — organisation » (`apps/api/prisma/seed.ts`).
- **Audit client** : `GET /api/audit-logs` accepte en plus `actionPrefix` (ex. `organization.`) ; **400** si `action` et `actionPrefix` sont fournis ensemble.
- **Frontend** : `apps/web/src/features/organization/`, page `apps/web/src/app/(protected)/client/administration/organization/page.tsx`, lien depuis `client/administration`.

## Objectif

Mettre en place le socle organisationnel par client dans Starium Orchestra afin de gérer :

* les unités organisationnelles ;
* les rattachements des ressources humaines ;
* les groupes métier ;
* les bases nécessaires aux futures règles de rôles, groupes et ACL.

Cette RFC doit être développée **avant les RFC avancées sur les rôles, groupes et ACL**, car elle fournit le référentiel organisationnel sur lequel les droits pourront ensuite s’appuyer.

---

# 1. Contexte

Aujourd’hui, Starium Orchestra dispose déjà d’un socle multi-tenant avec des clients, des utilisateurs, des ressources et des modules métier.

Cependant, il manque une couche organisationnelle claire permettant de représenter la structure interne d’un client :

* Direction Générale ;
* Direction Financière ;
* Direction SI ;
* Direction RH ;
* services ;
* équipes ;
* sites ;
* groupes transverses ;
* comités ;
* populations métier.

Sans cette couche, les futures ACL risquent d’être gérées uniquement utilisateur par utilisateur, ce qui serait difficile à maintenir.

La RFC-ORG-001 crée donc le référentiel d’organisation interne d’un client, sans encore porter les droits d’accès détaillés.

---

# 2. Principe d’architecture

## Décision principale

La structure organisationnelle est rattachée à un **client**.

Chaque client peut définir sa propre organisation, indépendamment des autres clients.

La RFC introduit trois notions principales :

| Élément                 | Rôle                                                                 |
| ----------------------- | -------------------------------------------------------------------- |
| Unité organisationnelle | Représente une direction, un service, un site ou une équipe          |
| Membre d’unité          | Rattache une **Resource HUMAN** à une unité (compte `User` optionnel, hors membership) |
| Groupe métier           | Regroupe des personnes selon une logique fonctionnelle ou transverse |

---

# 3. Périmètre inclus

Cette RFC couvre :

* la création d’unités organisationnelles ;
* la hiérarchie parent / enfant ;
* le rattachement de ressources humaines aux unités ;
* la création de groupes métier ;
* le rattachement de membres à des groupes ;
* les endpoints backend nécessaires ;
* les écrans frontend d’administration ;
* l’audit des changements sensibles ;
* les permissions minimales d’administration.

---

# 4. Hors périmètre

Cette RFC ne doit pas implémenter :

* le moteur ACL avancé ;
* le calcul des droits effectifs ;
* les permissions par projet, budget, contrat ou fournisseur ;
* la synchronisation Entra ID complète ;
* la gestion de charge des équipes ;
* les timesheets ;
* les droits hérités complexes ;
* les règles de licence.

Ces sujets doivent rester dans les RFC dédiées.

---

# 5. Modèle métier cible

## 5.1 Unité organisationnelle

Une unité organisationnelle représente une brique de l’organisation interne d’un client.

Exemples :

* Direction Générale ;
* DSI ;
* DAF ;
* DRH ;
* Service Infrastructure ;
* Service Paie ;
* Site Lyon ;
* Équipe Projet ERP.

Une unité peut avoir un parent.

Exemple :

```text
Client
 ├── Direction Générale
 ├── DSI
 │    ├── Infrastructure
 │    ├── Support
 │    └── Applications métier
 ├── DAF
 └── DRH
```

## 5.2 Membre d’unité

Un membre d’unité permet de rattacher une **Resource HUMAN** (fiche personne métier / collaborateur) à une unité organisationnelle.

Une même ressource peut être rattachée à plusieurs unités si nécessaire.

Exemples :

* un DSI rattaché à la Direction Générale et à la DSI ;
* un chef de projet rattaché à la DSI et à une équipe projet transverse ;
* un contrôleur de gestion rattaché à la DAF et à un groupe de pilotage budgétaire.

## 5.3 Groupe métier

Un groupe métier représente un regroupement transversal.

Exemples :

* CODIR ;
* Comité Budget ;
* Référents Cybersécurité ;
* Chefs de projet ;
* Approbateurs Budget ;
* Administrateurs Client ;
* Lecteurs Direction Générale.

Un groupe métier ne donne pas encore de droits par lui-même dans cette RFC.

Il sert de base aux futures RFC ACL.

Les rattachements **membres de groupe** suivent le même modèle que les membres d’unité : **Resource HUMAN** uniquement (pas de membership direct sur `User`).

# 6. Modèle Prisma proposé

## 6.1 OrgUnit

```prisma
model OrgUnit {
  id          String   @id @default(cuid())
  clientId    String
  parentId    String?

  code        String?
  name        String
  description String?

  type        OrgUnitType
  status      OrgUnitStatus @default(ACTIVE)

  sortOrder   Int      @default(0)
  metadata    Json?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  archivedAt  DateTime?

  client      Client   @relation(fields: [clientId], references: [id])
  parent      OrgUnit? @relation("OrgUnitHierarchy", fields: [parentId], references: [id])
  children    OrgUnit[] @relation("OrgUnitHierarchy")

  members     OrgUnitMembership[]

  @@unique([clientId, code])
  @@index([clientId])
  @@index([clientId, parentId])
  @@index([clientId, status])
}
```

## 6.2 OrgUnitMembership

Implémentation : **`resourceId` obligatoire**, pas de `userId` (alignement **Resource HUMAN** = personne métier ; le `User` reste l’acteur d’audit et l’auth).

```prisma
model OrgUnitMembership {
  id          String   @id @default(cuid())
  clientId    String
  orgUnitId   String
  resourceId  String

  roleTitle   String?
  memberType  OrgUnitMemberType @default(MEMBER)

  startsAt    DateTime?
  endsAt      DateTime?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  client   Client   @relation(fields: [clientId], references: [id])
  orgUnit  OrgUnit  @relation(fields: [orgUnitId], references: [id])
  resource Resource @relation(fields: [resourceId], references: [id])

  @@unique([orgUnitId, resourceId])
  @@index([clientId])
  @@index([clientId, orgUnitId])
  @@index([clientId, resourceId])
}
```

## 6.3 OrgGroup

```prisma
model OrgGroup {
  id          String   @id @default(cuid())
  clientId    String

  code        String?
  name        String
  description String?

  type        OrgGroupType
  status      OrgGroupStatus @default(ACTIVE)

  metadata    Json?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  archivedAt  DateTime?

  members     OrgGroupMembership[]

  @@unique([clientId, code])
  @@index([clientId])
  @@index([clientId, status])
}
```

## 6.4 OrgGroupMembership

```prisma
model OrgGroupMembership {
  id          String   @id @default(cuid())
  clientId    String
  groupId     String
  resourceId  String

  memberType  OrgGroupMemberType @default(MEMBER)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  client   Client   @relation(fields: [clientId], references: [id])
  group    OrgGroup @relation(fields: [groupId], references: [id])
  resource Resource @relation(fields: [resourceId], references: [id])

  @@unique([groupId, resourceId])
  @@index([clientId])
  @@index([clientId, groupId])
  @@index([clientId, resourceId])
}
```

## 6.5 Enums

```prisma
enum OrgUnitType {
  COMPANY
  DIRECTION
  DEPARTMENT
  SERVICE
  SITE
  TEAM
  COMMITTEE
  OTHER
}

enum OrgUnitStatus {
  ACTIVE
  ARCHIVED
}

enum OrgUnitMemberType {
  MANAGER
  MEMBER
  OBSERVER
}

enum OrgGroupType {
  BUSINESS
  COMMITTEE
  FUNCTIONAL
  SECURITY
  TRANSVERSE
  OTHER
}

enum OrgGroupStatus {
  ACTIVE
  ARCHIVED
}

enum OrgGroupMemberType {
  OWNER
  MEMBER
  OBSERVER
}
```

---

# 7. Règles métier

## 7.1 Isolation client obligatoire

Toutes les lectures et écritures doivent être filtrées par `clientId`.

Aucune unité, aucun groupe et aucun rattachement ne doit pouvoir être lu ou modifié depuis un autre client.

## 7.2 Suppression interdite en V1

En V1, une unité ou un groupe ne doit pas être supprimé physiquement.

L’action autorisée est l’archivage.

Cela évite de casser les futurs liens avec :

* les ACL ;
* les rôles ;
* les projets ;
* les budgets ;
* les audits ;
* les historiques.

## 7.3 Hiérarchie contrôlée

Une unité ne peut pas être son propre parent.

Le backend doit empêcher les cycles hiérarchiques.

Exemple interdit :

```text
DSI > Infrastructure > DSI
```

## 7.4 Nom obligatoire

Le champ `name` est obligatoire.

Le champ `code` est optionnel mais recommandé.

## 7.5 Groupes sans droits en V1

Les groupes créés dans cette RFC ne doivent pas attribuer de droits directement.

Ils seront consommés plus tard par les RFC ACL.

---

# 8. Permissions

Permissions minimales à introduire :

| Permission                    | Description                                 |
| ----------------------------- | ------------------------------------------- |
| `organization.read`           | Lire l’organisation du client               |
| `organization.update`         | Créer, modifier, archiver unités et groupes |
| `organization.members.update` | Gérer les rattachements des membres         |

Ces permissions doivent être utilisées avec la chaîne de guards existante :

```text
JwtAuthGuard
ActiveClientGuard
ModuleAccessGuard
PermissionsGuard
```

---

# 9. Endpoints Backend

## 9.1 Unités organisationnelles

```http
GET /api/organization/units
```

Retourne l’arbre organisationnel du client actif.

```http
POST /api/organization/units
```

Crée une unité organisationnelle.

```http
PATCH /api/organization/units/:id
```

Met à jour une unité.

```http
POST /api/organization/units/:id/archive
```

Archive une unité.

---

## 9.2 Membres d’unités

```http
GET /api/organization/units/:id/members
```

Liste les membres d’une unité.

```http
POST /api/organization/units/:id/members
```

Ajoute un membre à une unité.

```http
DELETE /api/organization/units/:id/members/:membershipId
```

Retire un membre d’une unité.

---

## 9.3 Groupes métier

```http
GET /api/organization/groups
```

Liste les groupes métier du client.

```http
POST /api/organization/groups
```

Crée un groupe métier.

```http
PATCH /api/organization/groups/:id
```

Met à jour un groupe métier.

```http
POST /api/organization/groups/:id/archive
```

Archive un groupe métier.

---

## 9.4 Membres de groupes

```http
GET /api/organization/groups/:id/members
```

Liste les membres d’un groupe.

```http
POST /api/organization/groups/:id/members
```

Ajoute un membre à un groupe.

```http
DELETE /api/organization/groups/:id/members/:membershipId
```

Retire un membre d’un groupe.

---

# 10. Frontend attendu

Créer une page d’administration :

```text
/app/(protected)/organization/page.tsx
```

ou, si l’administration client est déjà centralisée :

```text
/app/(protected)/settings/organization/page.tsx
```

## Onglets attendus

| Onglet       | Description                                      |
| ------------ | ------------------------------------------------ |
| Organisation | Arbre des directions, services, sites et équipes |
| Membres      | Rattachement des personnes aux unités            |
| Groupes      | Création et gestion des groupes métier           |
| Audit        | Historique des changements sensibles             |

## Règles UX

L’interface doit afficher des libellés métier, jamais des IDs bruts.

Exemples :

Bon affichage :

```text
Direction des Systèmes d’Information
CODIR
Responsable : Stéphane Atlani
```

Mauvais affichage :

```text
orgUnitId: clx89...
groupId: ckg72...
userId: usr...
```

---

# 11. Audit

Les actions suivantes doivent être auditées :

| Action                          | Événement d’audit                   |
| ------------------------------- | ----------------------------------- |
| Création d’une unité            | `organization.unit.created`         |
| Modification d’une unité        | `organization.unit.updated`         |
| Archivage d’une unité           | `organization.unit.archived`        |
| Ajout d’un membre à une unité   | `organization.unit.member.added`    |
| Retrait d’un membre d’une unité | `organization.unit.member.removed`  |
| Création d’un groupe            | `organization.group.created`        |
| Modification d’un groupe        | `organization.group.updated`        |
| Archivage d’un groupe           | `organization.group.archived`       |
| Ajout d’un membre à un groupe   | `organization.group.member.added`   |
| Retrait d’un membre à un groupe | `organization.group.member.removed` |

L’audit doit inclure au minimum :

* `clientId` ;
* `actorUserId` ;
* `entityType` ;
* `entityId` ;
* action ;
* ancienne valeur si pertinente ;
* nouvelle valeur si pertinente ;
* date.

---

# 12. Tests obligatoires

## Backend

Tester au minimum :

* création d’une unité ;
* modification d’une unité ;
* archivage d’une unité ;
* création d’un enfant ;
* blocage d’un cycle hiérarchique ;
* isolation stricte par `clientId` ;
* ajout d’un membre ;
* retrait d’un membre ;
* création d’un groupe ;
* ajout d’un membre à un groupe ;
* permissions `organization.read` ;
* permissions `organization.update` ;
* permissions `organization.members.update`.

## Frontend

Tester au minimum :

* affichage de l’arbre organisationnel ;
* création d’une unité ;
* modification d’une unité ;
* archivage d’une unité ;
* affichage des groupes ;
* ajout/retrait d’un membre ;
* absence d’IDs bruts visibles ;
* affichage des erreurs backend ;
* respect des permissions.

---

# 13. Dépendances

Cette RFC doit être réalisée avant :

* RFC-ACL-014 — Conformité Rôles, Groupes et ACL ;
* RFC-ACL-013 — Éditeur ACL par ressource ;
* RFC-ACL-006 — Intégration ACL dans les modules métier ;
* RFC avancées sur les groupes d’accès ;
* RFC sur les droits hérités ;
* RFC sur la synchronisation organisationnelle Microsoft 365.

---

# 14. Critères d’acceptation

La RFC est considérée comme terminée si :

* un client peut créer sa structure organisationnelle ;
* les unités sont hiérarchisables ;
* les membres peuvent être rattachés aux unités ;
* les groupes métier peuvent être créés ;
* les membres peuvent être rattachés aux groupes ;
* toutes les données sont strictement isolées par client ;
* les actions sensibles sont auditées ;
* les permissions sont respectées ;
* l’interface ne montre aucun ID brut ;
* aucune logique ACL avancée n’est implémentée dans cette RFC.

---

# 15. Synthèse

La **RFC-ORG-001** est le socle organisationnel de Starium Orchestra.

Elle ne gère pas encore les droits détaillés, mais elle prépare correctement :

* les rôles ;
* les groupes ;
* les ACL ;
* les droits par ressource ;
* les règles d’accès par direction, service ou comité.

Elle doit donc être développée avant les RFC ACL avancées.
