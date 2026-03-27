# RFC-TEAM-001 — Synchronisation des collaborateurs depuis AD DS

## Statut

Implémentée (MVP Microsoft Graph / Entra ID)

## Priorité

Haute

## Dépendances

* Vision produit Starium Orchestra — module **Gestion des équipes** (`collaborateurs`, `compétences`, `affectations`) 
* Architecture technique — principes **API-first**, **multi-client**, **multi-tenant**, backend NestJS + Prisma + PostgreSQL 
* API Starium Orchestra — usage standard du `Authorization: Bearer <token>` + `X-Client-Id` + guards métier scopés client 
* RFC-013 — Audit logs (traçabilité obligatoire des actions métier) 

---

# 1. Objectif

Permettre à un client Starium de **synchroniser ses collaborateurs depuis un Active Directory Domain Services (AD DS)**, avec deux modes :

1. **synchronisation globale** d’un périmètre LDAP/OU ;
2. **synchronisation filtrée par groupe AD**, afin d’importer uniquement les collaborateurs membres d’un ou plusieurs groupes cibles.

L’objectif est d’éviter une saisie manuelle des collaborateurs dans Starium Orchestra, tout en gardant Starium comme **cockpit de pilotage** et non comme source de vérité RH/annuaire.

## 1.1 État implémenté (code actuel)

Le MVP livré utilise **Microsoft Graph** (Entra ID) comme provider annuaire dans le module `team-directory` :

* connexion annuaire client (`DirectoryConnection`) ;
* groupes cibles (`DirectoryGroupScope`) ;
* preview + exécution + historisation (`DirectorySyncJob`) ;
* création / mise à jour / désactivation logique des `Collaborator`.

En complément, l’exécution de sync alimente aussi les **membres client** :

* provisioning automatique `User` + `ClientUser` à partir des entrées annuaire ;
* rôle par défaut `CLIENT_USER` ;
* statut `ClientUser` aligné sur l’état actif/inactif du compte annuaire ;
* mise à jour des champs profil `User` (`firstName`, `lastName`, `department`, `jobTitle`) à chaque sync.

Quand l’option **"Verrouiller les collaborators synchronisés"** est active :

* l’édition des informations de membre synchronisé est bloquée ;
* l’attribution des rôles métier reste possible via l’action dédiée "Rôles".

---

# 2. Problème adressé

Dans beaucoup d’organisations, les collaborateurs existent déjà dans l’AD DS avec :

* nom
* prénom
* email
* identifiant réseau
* service
* manager
* appartenance à des groupes

Aujourd’hui, sans synchronisation :

* les fiches collaborateurs doivent être recréées manuellement ;
* les écarts entre AD et Starium apparaissent rapidement ;
* le rattachement hiérarchique est difficile à maintenir ;
* il est impossible de limiter simplement le périmètre à une population utile, par exemple :

  * DSI
  * équipe IT
  * CODIR
  * filiale donnée
  * groupe sécurité ou applicatif.

Cette RFC introduit un **connecteur AD DS** centré sur le module équipes.

---

# 3. Positionnement produit

Cette fonctionnalité fait partie du module **Gestion des équipes** de Starium Orchestra, déjà prévu dans la vision produit avec les objets :

* collaborateurs
* compétences
* affectations 

Starium ne remplace pas l’AD DS :

* **AD DS** reste la source de vérité annuaire ;
* **Starium** consomme et structure les données utiles au pilotage.

---

# 4. Périmètre

## Inclus

* configuration d’une connexion AD DS par client ;
* test de connexion LDAP / LDAPS ;
* synchronisation manuelle des collaborateurs ;
* filtrage optionnel par **groupe AD** ;
* création et mise à jour des collaborateurs dans Starium ;
* désactivation logique des collaborateurs qui sortent du périmètre synchronisé ;
* récupération optionnelle du manager si présent dans l’AD ;
* historisation des exécutions de sync ;
* audit logs.

## Exclus du MVP

* synchronisation temps réel ;
* provisioning inverse Starium → AD ;
* synchronisation des mots de passe ;
* authentification SSO ;
* synchronisation complète des groupes AD comme objets métier Starium ;
* gestion avancée des photos ;
* synchronisation multi-forêts complexe ;
* résolution automatique avancée des conflits RH.

---

# 5. Cas d’usage

## 5.1 Synchronisation complète d’une OU

Un client souhaite importer tous les collaborateurs d’une OU donnée :

* `OU=Users,DC=entreprise,DC=local`

## 5.2 Synchronisation filtrée par groupe

Un client souhaite importer uniquement les membres du groupe :

* `CN=DSI,OU=Groups,DC=entreprise,DC=local`

ou d’une liste de groupes :

* `DSI`
* `Chefs de projet IT`
* `CODIR`

## 5.3 Synchronisation d’une population pilote

Un client veut démarrer avec un périmètre limité avant généralisation.

## 5.4 Mise à jour hiérarchique

Le champ manager AD doit mettre à jour la hiérarchie manager → collaborateur dans Starium.

---

# 6. Principes métier

## 6.1 Scope client

Toute configuration et toute synchronisation sont strictement rattachées à un `clientId`, conformément au modèle multi-client de Starium Orchestra. Toute donnée métier appartient à un client et toutes les requêtes doivent vérifier le scope client. 

## 6.2 Source de vérité

Pour les attributs synchronisés :

* AD DS = source de vérité ;
* Starium = copie de travail pilotée.

## 6.3 Synchronisation filtrée par groupe

Le filtrage par groupe est une **option de cadrage fonctionnel majeure**.

Règle :

* si aucun groupe n’est configuré, la sync s’exécute sur le périmètre LDAP défini ;
* si un ou plusieurs groupes sont configurés, seuls les utilisateurs appartenant à ces groupes sont éligibles.

## 6.4 Désactivation logique

Si un collaborateur synchronisé n’est plus trouvé dans le périmètre de sync :

* il n’est pas supprimé physiquement ;
* il passe en statut `INACTIVE` ou `DISABLED_SYNC`.

## 6.5 Préservation des données locales

Certains champs doivent pouvoir rester pilotés localement dans Starium, par exemple :

* compétences
* notes internes
* affectations projet
* commentaires managériaux

La sync AD ne doit pas écraser ces champs.

---

# 7. Données synchronisées

## 7.1 Champs minimums

Attributs AD envisagés :

* `objectGUID` ou identifiant technique stable
* `sAMAccountName`
* `userPrincipalName`
* `mail`
* `givenName`
* `sn`
* `displayName`
* `title`
* `department`
* `company`
* `employeeId`
* `telephoneNumber`
* `mobile`
* `manager`
* `memberOf`
* `whenChanged`
* état actif/inactif du compte

## 7.2 Clé de rapprochement

Ordre recommandé :

1. `objectGUID` AD encodé côté Starium comme `externalDirectoryId`
2. à défaut `userPrincipalName`
3. à défaut `mail`

La clé primaire métier de rapprochement doit rester le **directory stable id** si disponible.

---

# 8. Modèle de données proposé

## 8.1 ADDirectoryConnection

Configuration de connexion par client.

```prisma
model ADDirectoryConnection {
  id                String   @id @default(cuid())
  clientId          String
  name              String
  host              String
  port              Int
  encryptionMode    ADEncryptionMode
  bindDn            String
  bindPasswordEnc   String
  baseDn            String
  usersBaseDn       String?
  groupsBaseDn      String?
  isActive          Boolean  @default(true)
  syncOnlyGroups    Boolean  @default(false)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  client            Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  groupScopes       ADDirectoryGroupScope[]
  syncJobs          ADDirectorySyncJob[]

  @@index([clientId])
}
```

## 8.2 ADDirectoryGroupScope

Liste des groupes autorisés pour la sync.

```prisma
model ADDirectoryGroupScope {
  id             String   @id @default(cuid())
  clientId       String
  connectionId   String
  groupDn        String
  groupCn        String?
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())

  client         Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  connection     ADDirectoryConnection @relation(fields: [connectionId], references: [id], onDelete: Cascade)

  @@index([clientId, connectionId])
  @@unique([connectionId, groupDn])
}
```

## 8.3 Extension Collaborator

```prisma
model Collaborator {
  id                    String   @id @default(cuid())
  clientId              String
  firstName             String?
  lastName              String?
  displayName           String
  email                 String?
  jobTitle              String?
  department            String?
  phone                 String?
  mobile                String?
  employeeNumber        String?
  managerId             String?
  status                CollaboratorStatus
  source                CollaboratorSource @default(MANUAL)

  externalDirectoryId   String?
  externalDirectoryType ExternalDirectoryType?
  externalUsername      String?
  externalDn            String?
  lastSyncedAt          DateTime?
  syncHash              String?

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}
```

## 8.4 ADDirectorySyncJob

Historique d’exécution.

```prisma
model ADDirectorySyncJob {
  id                  String   @id @default(cuid())
  clientId            String
  connectionId        String
  status              ADDirectorySyncJobStatus
  mode                ADDirectorySyncMode
  startedAt           DateTime @default(now())
  finishedAt          DateTime?
  totalFound          Int      @default(0)
  createdCount        Int      @default(0)
  updatedCount        Int      @default(0)
  deactivatedCount    Int      @default(0)
  skippedCount        Int      @default(0)
  errorCount          Int      @default(0)
  summary             Json?
  triggeredByUserId   String?

  client              Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  connection          ADDirectoryConnection @relation(fields: [connectionId], references: [id], onDelete: Cascade)

  @@index([clientId, connectionId])
  @@index([startedAt])
}
```

## 8.5 Enums

```prisma
enum ADEncryptionMode {
  LDAP
  LDAPS
  STARTTLS
}

enum ADDirectorySyncJobStatus {
  RUNNING
  COMPLETED
  FAILED
}

enum ADDirectorySyncMode {
  FULL
  GROUP_FILTERED
}

enum CollaboratorSource {
  MANUAL
  ADDS
}

enum ExternalDirectoryType {
  ADDS
}
```

---

# 9. Règles métier détaillées

## 9.1 Un collaborateur appartient toujours à un client

Toutes les écritures doivent être filtrées par `clientId`, conformément à l’architecture backend et au pipeline `JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard`.  

## 9.2 Pas de suppression physique à la sync

Si un utilisateur AD sort du périmètre :

* ne pas supprimer ;
* désactiver logiquement ;
* conserver l’historique projet / budget / affectation.

## 9.3 Filtrage par groupe

Deux stratégies possibles :

### Mode A — Groupe unique ou liste de groupes

On récupère uniquement les membres des groupes configurés.

### Mode B — Périmètre LDAP + filtre groupe

On cherche dans le périmètre utilisateurs, puis on conserve uniquement les utilisateurs appartenant aux groupes autorisés.

MVP recommandé : **Mode A**, plus simple et plus robuste.

## 9.4 Hiérarchie manager

Si l’attribut `manager` existe :

* tenter de résoudre le manager dans le lot courant ou via un collaborateur déjà synchronisé ;
* mettre à jour `managerId` ;
* si le manager n’est pas résolu, ne pas bloquer la sync.

## 9.5 Comptes désactivés AD

Si le compte AD est désactivé :

* marquer le collaborateur Starium comme inactif ;
* ne pas le supprimer.

## 9.6 Champs locaux protégés

La sync ne modifie pas :

* compétences ;
* affectations ;
* commentaires internes ;
* tags managériaux.

---

# 10. Workflow fonctionnel

## 10.1 Configuration

Le client admin configure :

* serveur AD ;
* port ;
* mode de chiffrement ;
* compte technique bind ;
* base DN ;
* périmètre utilisateurs ;
* option “sync uniquement les membres des groupes suivants” ;
* groupes autorisés.

## 10.2 Test de connexion

L’utilisateur lance un test :

* bind LDAP ;
* lecture d’un échantillon ;
* vérification des groupes configurés.

## 10.3 Prévisualisation

Le backend calcule :

* nombre d’utilisateurs trouvés ;
* nombre de créations ;
* nombre de mises à jour ;
* nombre de désactivations ;
* anomalies bloquantes.

## 10.4 Exécution

Le backend exécute la sync et historise un job.

---

# 11. API backend

Toutes les routes suivent les conventions API de Starium : `/api`, `Authorization`, `X-Client-Id`, guards standard côté client actif. 

## 11.1 Connexion AD

### GET `/api/team-directory/ad-connections`

Liste des connexions du client actif.

### POST `/api/team-directory/ad-connections`

Crée une connexion AD.

Body :

```json
{
  "name": "AD principal",
  "host": "dc01.entreprise.local",
  "port": 636,
  "encryptionMode": "LDAPS",
  "bindDn": "CN=svc-starium,OU=Service Accounts,DC=entreprise,DC=local",
  "bindPassword": "secret",
  "baseDn": "DC=entreprise,DC=local",
  "usersBaseDn": "OU=Users,DC=entreprise,DC=local",
  "groupsBaseDn": "OU=Groups,DC=entreprise,DC=local",
  "syncOnlyGroups": true
}
```

### PATCH `/api/team-directory/ad-connections/:id`

Met à jour la connexion.

### POST `/api/team-directory/ad-connections/:id/test`

Teste la connexion et retourne un diagnostic simple.

---

## 11.2 Groupes cibles

### GET `/api/team-directory/ad-connections/:id/groups`

Liste les groupes configurés pour la connexion.

### POST `/api/team-directory/ad-connections/:id/groups`

Ajoute un groupe de scope.

```json
{
  "groupDn": "CN=DSI,OU=Groups,DC=entreprise,DC=local",
  "groupCn": "DSI"
}
```

### DELETE `/api/team-directory/ad-connections/:id/groups/:groupScopeId`

Retire un groupe du scope.

---

## 11.3 Synchronisation

### POST `/api/team-directory/ad-sync/preview`

Prévisualisation.

```json
{
  "connectionId": "conn_123"
}
```

Réponse :

```json
{
  "mode": "GROUP_FILTERED",
  "totalFound": 42,
  "createCount": 10,
  "updateCount": 28,
  "deactivateCount": 4,
  "items": [
    {
      "externalDirectoryId": "user_guid_1",
      "displayName": "Nom Prénom",
      "firstName": "Prénom",
      "lastName": "Nom",
      "email": "prenom.nom@entreprise.com",
      "username": "prenom.nom@entreprise.com",
      "department": "IT",
      "jobTitle": "DSI",
      "isActive": true,
      "action": "update"
    }
  ],
  "warnings": [],
  "errors": []
}
```

### POST `/api/team-directory/ad-sync/execute`

Lance la synchronisation.

```json
{
  "connectionId": "conn_123"
}
```

Réponse :

```json
{
  "jobId": "job_123",
  "status": "COMPLETED",
  "totalFound": 42,
  "createdCount": 10,
  "updatedCount": 28,
  "deactivatedCount": 4,
  "skippedCount": 0,
  "errorCount": 0
}
```

### GET `/api/team-directory/ad-sync/jobs`

Liste des jobs.

### GET `/api/team-directory/ad-sync/jobs/:id`

Détail d’un job.

---

# 12. Sécurité

## 12.1 Transport

* LDAP simple interdit en production hors réseau maîtrisé ;
* privilégier **LDAPS** ou **STARTTLS**.

## 12.2 Secret de bind

Le mot de passe du compte technique doit être :

* chiffré en base ;
* jamais retourné par l’API ;
* jamais loggé.

## 12.3 Permissions

Permissions proposées :

* `teams.read`
* `teams.update`
* `teams.directory.read`
* `teams.directory.update`
* `teams.directory.sync`

MVP minimum :

* lecture config : `teams.read`
* création / update config : `teams.update`
* exécution sync : `teams.update`

## 12.4 Isolation client

Une connexion AD n’est visible et utilisable que dans son client.

---

# 13. Audit logs

Cette RFC doit produire des audit logs conformément au module audit existant et à la convention `<resource>.<action>`. 

Actions proposées :

* `ad_directory_connection.created`
* `ad_directory_connection.updated`
* `ad_directory_connection.tested`
* `ad_directory_group_scope.created`
* `ad_directory_group_scope.deleted`
* `collaborator_sync.previewed`
* `collaborator_sync.executed`
* `collaborator_sync.failed`

Ressources :

* `ad_directory_connection`
* `ad_directory_group_scope`
* `ad_directory_sync_job`
* `collaborator`

---

# 14. Structure backend recommandée

```text
apps/api/src/modules/team-directory/
├── team-directory.module.ts
├── ad-connections/
│   ├── ad-connections.controller.ts
│   ├── ad-connections.service.ts
│   └── dto/
├── ad-group-scopes/
│   ├── ad-group-scopes.controller.ts
│   ├── ad-group-scopes.service.ts
│   └── dto/
├── ad-sync/
│   ├── ad-sync.controller.ts
│   ├── ad-sync.service.ts
│   ├── ad-ldap.service.ts
│   └── dto/
└── tests/
```

---

# 15. Algorithme de synchronisation

1. charger la connexion AD du client actif ;
2. vérifier le scope client ;
3. ouvrir la connexion LDAP ;
4. récupérer les utilisateurs du périmètre ;
5. si `syncOnlyGroups = true`, appliquer le filtre sur les groupes configurés ;
6. normaliser les données ;
7. rapprocher par `externalDirectoryId` puis `userPrincipalName` puis `email` ;
8. créer ou mettre à jour les collaborateurs ;
9. résoudre les relations manager ;
10. désactiver les collaborateurs ADDS sortis du périmètre ;
11. écrire le job ;
12. écrire l’audit log.

Le tout doit être transactionnel pour les écritures Starium, mais la lecture LDAP reste hors transaction DB.

---

# 16. Règles de performance

Pour le MVP :

* sync manuelle uniquement ;
* pagination LDAP interne si nécessaire ;
* pas de temps réel ;
* pas de cron obligatoire.

Optimisations futures :

* delta sync sur `whenChanged` ;
* sync planifiée ;
* traitement par batch ;
* cache temporaire des résolutions manager.

---

# 17. Tests attendus

## Unit tests

* mapping LDAP → Collaborator ;
* rapprochement par `externalDirectoryId` ;
* fallback par email ;
* filtrage par groupe ;
* désactivation logique ;
* non-écrasement des champs locaux.

## Integration tests

* isolation client stricte ;
* permissions ;
* création / update / désactivation ;
* job history ;
* audit logs.

## Tests métier critiques

* utilisateur hors groupe non importé ;
* utilisateur retiré du groupe → désactivation logique ;
* manager introuvable non bloquant ;
* doublon email géré sans cross-client.

---

# 18. Ce que la RFC ne fait pas

Cette RFC ne traite pas :

* l’authentification des utilisateurs Starium via AD ;
* le SSO Microsoft / ADFS / Entra ID ;
* la synchronisation des compétences ;
* la synchronisation des groupes comme équipes Starium ;
* l’écriture vers l’AD.

---

# 19. Décision MVP recommandée

Pour un MVP robuste, je recommande de figer les choix suivants :

* **une connexion AD DS par client** dans un premier temps ;
* **sync manuelle uniquement** ;
* **filtrage par liste de groupes AD** ;
* **désactivation logique** des collaborateurs sortis du périmètre ;
* **manager facultatif et non bloquant** ;
* **source = ADDS** sur les collaborateurs synchronisés ;
* **pas de suppression physique**.

---

# 20. Critères de succès

La RFC est réussie si :

* un client peut configurer une connexion AD DS ;
* il peut limiter la sync à un ou plusieurs groupes AD ;
* la sync crée et met à jour les collaborateurs sans fuite inter-client ;
* les collaborateurs retirés du périmètre sont désactivés logiquement ;
* la hiérarchie manager est partiellement ou totalement reconstruite ;
* les jobs de sync sont historisés ;
* les actions sont auditables.

---

## Note d’alignement technique

Cette RFC conserve un cadrage "AD DS" historique. L’implémentation MVP actuelle dans le repo est réalisée via **Microsoft Graph / Entra ID** (`DirectoryProviderType.MICROSOFT_GRAPH`) avec les routes :

* `/api/team-directory/ad-connections`
* `/api/team-directory/ad-connections/:id/groups`
* `/api/team-directory/ad-sync/preview`
* `/api/team-directory/ad-sync/execute`
* `/api/team-directory/ad-sync/jobs`
