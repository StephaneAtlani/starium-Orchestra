# RFC-018 — Budget Data Import

## Statut

Draft

## Dépendances

* RFC-015-1A — Schéma Prisma Budget
* RFC-015-2 — Budget Management Backend
* RFC-015-1B — Financial Core

Cette RFC agit sur l’import de données vers le module Budget.
Elle respecte le fait que la logique budgétaire structurelle est distincte du noyau financier déjà en place. Le module Budget gère la structure, tandis que les allocations et événements financiers restent dans `financial-core`. 

---

# 1. Objectif

Permettre l’import de données budgétaires depuis :

* fichiers Excel (`.xlsx`)
* fichiers CSV (`.csv`)

avec les capacités suivantes :

* analyser un fichier source
* mapper les colonnes source vers les champs Starium
* sauvegarder un mapping réutilisable
* prévisualiser le résultat avant import
* exécuter l’import de manière transactionnelle
* éviter les doublons lors d’un réimport
* rapprocher une ligne source d’une donnée déjà importée soit via un identifiant source, soit via une combinaison de données métier

L’objectif n’est pas seulement de charger un fichier une fois, mais de permettre un **import réexécutable**, exploitable dans un contexte réel de DSI/DAF où les fichiers proviennent d’ERP, d’exports achats, de comptabilité ou d’Excel maison. Cela répond directement à la vision produit de Starium Orchestra, qui vise à remplacer les usages dispersés d’Excel par un cockpit centralisé de gouvernance. 

---

# 2. Périmètre

## Inclus

* import Excel / CSV
* analyse de structure du fichier
* mapping des colonnes
* sauvegarde des mappings
* prévisualisation
* import avec création et mise à jour
* détection anti-doublon
* historique d’exécution

## Exclus du MVP

* export Excel
* import d’allocations financières
* import de `FinancialEvent`
* synchronisation temps réel avec ERP
* connecteurs API externes
* moteur générique transverse pour tous les modules

L’import cible ici le domaine budget et prépare éventuellement un socle réutilisable pour d’autres modules plus tard.

---

# 3. Principes métier

## 3.1 Scope client

Toute opération d’import est strictement scopée par :

* `clientId`
* `budgetId`

Aucune donnée d’un client ne peut être visible ou modifiable depuis un autre client, conformément aux règles produit et à l’architecture multi-client / multi-tenant.  

## 3.2 Backend source de vérité

Le frontend assiste l’utilisateur pour :

* charger le fichier
* choisir les colonnes
* configurer le mapping
* confirmer l’import

Mais seul le backend décide :

* de la validité du mapping
* du rapprochement anti-doublon
* des créations / mises à jour
* des contrôles métier
* de la transaction finale

C’est aligné avec la règle projet selon laquelle toute logique métier critique doit rester dans le backend. 

## 3.3 Import réexécutable

Un même fichier, ou un fichier similaire réimporté plus tard, ne doit pas créer de doublons si une ligne source peut être rapprochée d’une donnée déjà connue.

## 3.4 Traçabilité complète

Chaque analyse, preview et exécution d’import doit être auditée et historisée.

---

# 4. Cas d’usage

## 4.1 Import initial depuis un Excel existant

Un DSI charge un budget tenu historiquement dans Excel.
Il mappe les colonnes, prévisualise, importe.

## 4.2 Réimport mensuel

Chaque mois, un nouvel export comptable est injecté.
Les lignes déjà importées sont reconnues et mises à jour au lieu d’être recréées.

## 4.3 Import depuis un ERP

Le fichier contient un identifiant de ligne source.
Cet identifiant devient la clé principale de rapprochement.

## 4.4 Import sans identifiant technique

Le fichier ne contient pas d’ID fiable.
Le rapprochement se fait via une combinaison de champs, par exemple :

* date
* montant
* fournisseur
* numéro de pièce

---

# 5. Formats supportés

## 5.1 Fichiers

* `.xlsx`
* `.csv`

## 5.2 Contraintes MVP

* taille max fichier : 10 MB
* nombre max de lignes analysées/importées : 20 000
* encodage CSV : UTF-8
* séparateurs CSV supportés : `,` `;`
* pour Excel : une feuille importée à la fois

---

# 6. Types de données importées

Le moteur d’import budget doit pouvoir cibler, au minimum, les lignes budgétaires importées dans un budget donné.

Selon le fichier source, les données peuvent correspondre à deux usages métier distincts :

## 6.1 Import de structure budgétaire

Import de lignes servant à construire ou enrichir la structure budgétaire :

* code
* nom
* enveloppe
* type de dépense
* montant initial
* devise
* description

## 6.2 Import de données budgétaires sources

Import de lignes issues d’une source externe utilisées comme matière d’entrée budgétaire, avec champs de rapprochement tels que :

* identifiant source
* date
* montant
* fournisseur
* numéro de pièce
* libellé
* devise
* référence

Dans le MVP, la RFC se concentre sur le mécanisme d’import, de mapping et de rapprochement. Le backend transforme ensuite ces données selon les règles du domaine budget.

---

# 7. Anti-doublon et stratégie de rapprochement

C’est le point central de cette RFC.

## 7.1 Principe

Le système ne doit pas se baser uniquement sur un `code` Starium pour éviter les doublons.
Il doit pouvoir rapprocher une ligne importée à partir des **données source du fichier**.

Deux stratégies de rapprochement sont supportées.

## 7.2 Stratégie A — Identifiant source

Si le fichier contient un identifiant stable, il est utilisé en priorité.

Exemples :

* `externalId`
* `sourceLineId`
* `erpId`
* `invoiceLineId`

Dans ce cas, deux lignes sont considérées comme identiques si :

* elles concernent le même `clientId`
* le même `budgetId`
* le même type d’entité importée
* et le même identifiant source

## 7.3 Stratégie B — Clé composite métier

Si aucun identifiant source stable n’existe, le rapprochement se fait via une combinaison de champs.

Exemple typique :

* `date`
* `amount`
* `supplier`
* `documentNumber`

Autres combinaisons possibles :

* `date + amount + currency + label`
* `supplier + documentNumber + amount`
* `reference + date + amount`

La stratégie composite est définie dans le mapping sauvegardé.

## 7.4 Priorité de matching

Ordre de priorité :

1. identifiant source explicite
2. clé composite métier
3. aucun rapprochement possible → création potentielle ou erreur selon le mode choisi

## 7.5 Modes d’import

Trois modes sont supportés.

### CREATE_ONLY

* crée uniquement les lignes non reconnues
* ignore ou rejette les lignes déjà connues

### UPSERT

* crée si aucune correspondance n’existe
* met à jour si une correspondance existe

### UPDATE_ONLY

* met à jour uniquement les lignes reconnues
* rejette les nouvelles lignes

Le mode recommandé par défaut pour les réimports est :

`UPSERT`

---

# 8. Mapping configurable et sauvegardable

## 8.1 Objectif

Le mapping permet d’associer :

* une colonne du fichier source
* à un champ logique attendu par le moteur d’import

Il doit aussi porter la stratégie anti-doublon.

## 8.2 Contenu d’un mapping

Un mapping sauvegardé doit contenir :

* le type de fichier source
* la feuille Excel ciblée si applicable
* la ligne d’en-tête
* les colonnes détectées
* les correspondances colonne → champ logique
* les éventuelles transformations de valeur
* la stratégie de rapprochement
* le mode d’import par défaut
* les options d’import

## 8.3 Exemple conceptuel

```json
{
  "fields": {
    "externalId": "ID ligne",
    "transactionDate": "Date",
    "amount": "Montant",
    "supplierName": "Fournisseur",
    "documentNumber": "N° pièce",
    "label": "Libellé",
    "currency": "Devise"
  },
  "matching": {
    "strategy": "COMPOSITE",
    "keys": ["transactionDate", "amount", "supplierName", "documentNumber"]
  },
  "defaults": {
    "currency": "EUR"
  },
  "options": {
    "headerRowIndex": 1,
    "ignoreEmptyRows": true,
    "trimValues": true,
    "importMode": "UPSERT"
  }
}
```

## 8.4 Réutilisation

Un mapping peut être :

* enregistré par client
* renommé
* marqué comme favori ou par défaut
* réutilisé sur les imports futurs

Exemples :

* `Import budget Sage`
* `Import budget compta mensuelle`
* `Import dépenses fournisseurs`

---

# 9. Traçabilité de l’origine importée

Pour éviter réellement les doublons dans le temps, il ne suffit pas de comparer le fichier courant au modèle budgétaire.
Il faut conserver une trace du lien entre :

* la ligne source importée
* et l’objet Starium créé ou mis à jour

Cette RFC introduit donc un mécanisme de traçabilité de rapprochement.

---

# 10. Modèle de données proposé

## 10.1 BudgetImportMapping

Configuration réutilisable du mapping.

```prisma
model BudgetImportMapping {
  id             String   @id @default(cuid())
  clientId       String
  name           String
  description    String?
  sourceType     BudgetImportSourceType
  entityType     BudgetImportEntityType
  sheetName      String?
  headerRowIndex Int      @default(1)
  mappingConfig  Json
  optionsConfig  Json?
  createdById    String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([clientId])
}
```

## 10.2 BudgetImportJob

Historique d’exécution.

```prisma
model BudgetImportJob {
  id            String   @id @default(cuid())
  clientId      String
  budgetId      String
  mappingId     String?
  fileName      String
  sourceType    BudgetImportSourceType
  status        BudgetImportJobStatus
  importMode    BudgetImportMode
  totalRows     Int      @default(0)
  createdRows   Int      @default(0)
  updatedRows   Int      @default(0)
  skippedRows   Int      @default(0)
  errorRows     Int      @default(0)
  summary       Json?
  createdById   String?
  createdAt     DateTime @default(now())

  @@index([clientId, budgetId])
  @@index([mappingId])
}
```

## 10.3 BudgetImportRowLink

Lien de traçabilité entre une ligne source et un objet Starium.

```prisma
model BudgetImportRowLink {
  id               String   @id @default(cuid())
  clientId         String
  budgetId         String
  importJobId      String
  targetEntityType BudgetImportTargetEntityType
  targetEntityId   String
  sourceRowNumber  Int?
  externalId       String?
  compositeHash    String?
  fingerprintData  Json?
  createdAt        DateTime @default(now())

  @@index([clientId, budgetId, targetEntityType, targetEntityId])
  @@index([clientId, budgetId, externalId])
  @@index([clientId, budgetId, compositeHash])
}
```

## 10.4 Enums

```prisma
enum BudgetImportSourceType {
  CSV
  XLSX
}

enum BudgetImportEntityType {
  BUDGET_DATA
}

enum BudgetImportTargetEntityType {
  BUDGET_LINE
}

enum BudgetImportJobStatus {
  ANALYZED
  PREVIEWED
  RUNNING
  COMPLETED
  FAILED
}

enum BudgetImportMode {
  CREATE_ONLY
  UPSERT
  UPDATE_ONLY
}
```

---

# 11. Règles de rapprochement

## 11.1 Si `externalId` est fourni

Le backend calcule la clé logique :

* `clientId`
* `budgetId`
* `targetEntityType`
* `externalId`

Si un `BudgetImportRowLink` existe déjà avec cette clé, la ligne est considérée comme connue.

## 11.2 Si `externalId` est absent

Le backend calcule un `compositeHash` à partir des champs configurés dans le mapping, après normalisation :

* trim
* casse uniforme
* format date standardisé
* nombre décimal normalisé
* suppression éventuelle des espaces parasites

Exemple :

* `2026-03-01|1200.00|aws|FAC-2026-001`

Puis hash du résultat.

## 11.3 Ambiguïté

Si plusieurs correspondances potentielles existent, la ligne passe en erreur de preview/import avec un motif explicite :

* `AMBIGUOUS_MATCH`

## 11.4 Absence de clé exploitable

Si ni identifiant source ni clé composite exploitable ne sont disponibles, la ligne ne peut pas bénéficier d’un anti-doublon fiable.
Le comportement dépend du mode d’import :

* `CREATE_ONLY` : création possible
* `UPSERT` / `UPDATE_ONLY` : erreur ou warning selon configuration

---

# 12. Workflow fonctionnel

## 12.1 Étape 1 — Analyse

Upload du fichier, lecture des colonnes, détection des feuilles, extraction d’un échantillon.

Retour :

* colonnes détectées
* feuilles disponibles
* aperçu des 20 premières lignes
* volume estimé

## 12.2 Étape 2 — Configuration du mapping

L’utilisateur choisit :

* les colonnes
* les champs logiques
* la stratégie de matching
* les clés de rapprochement
* le mode d’import
* les options

## 12.3 Étape 3 — Prévisualisation

Le backend simule l’import sans écrire en base.

Chaque ligne reçoit un statut prévisionnel :

* `CREATE`
* `UPDATE`
* `SKIP`
* `ERROR`

Exemples de motifs :

* `MATCHED_BY_EXTERNAL_ID`
* `MATCHED_BY_COMPOSITE_KEY`
* `NO_MATCH_CREATE`
* `AMBIGUOUS_MATCH`
* `INVALID_DATE`
* `INVALID_AMOUNT`
* `MISSING_REQUIRED_FIELD`

## 12.4 Étape 4 — Exécution

L’utilisateur confirme.
Le backend exécute l’import dans une transaction Prisma.

## 12.5 Étape 5 — Résultat

Retour synthétique :

* lignes créées
* lignes mises à jour
* lignes ignorées
* lignes en erreur
* résumé par type d’anomalie

---

# 13. API Backend

## 13.1 Analyse

`POST /api/budget-imports/analyze`

Body : `multipart/form-data`

* `file`

Réponse :

```json
{
  "fileToken": "tmp_123",
  "sourceType": "XLSX",
  "sheetNames": ["Feuil1"],
  "columns": ["Date", "Montant", "Fournisseur", "N° pièce"],
  "sampleRows": [],
  "rowCount": 1250
}
```

## 13.2 Preview

`POST /api/budget-imports/preview`

Body :

```json
{
  "budgetId": "clx_budget",
  "fileToken": "tmp_123",
  "mapping": {},
  "options": {
    "importMode": "UPSERT"
  }
}
```

Réponse :

```json
{
  "stats": {
    "totalRows": 1250,
    "createRows": 1120,
    "updateRows": 98,
    "skipRows": 12,
    "errorRows": 20
  },
  "previewRows": [],
  "warnings": [],
  "errors": []
}
```

## 13.3 Exécution

`POST /api/budget-imports/execute`

Body :

```json
{
  "budgetId": "clx_budget",
  "fileToken": "tmp_123",
  "mappingId": "map_001",
  "mapping": {},
  "options": {
    "importMode": "UPSERT"
  }
}
```

Réponse :

```json
{
  "jobId": "job_001",
  "status": "COMPLETED",
  "totalRows": 1250,
  "createdRows": 1120,
  "updatedRows": 98,
  "skippedRows": 12,
  "errorRows": 20
}
```

## 13.4 CRUD mappings

* `GET /api/budget-import-mappings`
* `POST /api/budget-import-mappings`
* `GET /api/budget-import-mappings/:id`
* `PATCH /api/budget-import-mappings/:id`
* `DELETE /api/budget-import-mappings/:id`

---

# 14. Sécurité et guards

Tous les endpoints d’import utilisent le pipeline standard des routes métier côté client :

* `JwtAuthGuard`
* `ActiveClientGuard`
* `ModuleAccessGuard`
* `PermissionsGuard`

Permissions minimales recommandées :

* analyse / preview : `budgets.read`
* exécution / sauvegarde mapping : `budgets.update`

Cela reste cohérent avec le modèle RBAC existant du module budgets. 

---

# 15. Audit logs

Les actions suivantes doivent être tracées :

* `budget_import.analyzed`
* `budget_import.previewed`
* `budget_import.executed`
* `budget_import.failed`
* `budget_import_mapping.created`
* `budget_import_mapping.updated`
* `budget_import_mapping.deleted`

Chaque audit log inclut au minimum :

* `clientId`
* `userId`
* `budgetId` si applicable
* `mappingId` si applicable
* résumé d’exécution

La traçabilité est une règle importante de la plateforme. 

---

# 16. Règles techniques d’exécution

## 16.1 Transaction

L’import final s’exécute dans `prisma.$transaction()`.

## 16.2 Preview sans écriture métier

La preview ne crée pas de lignes budgétaires.
Elle peut créer un artefact temporaire de session ou un `fileToken` technique.

## 16.3 Normalisation

Avant matching :

* trim des chaînes
* normalisation de casse
* parsing dates ISO
* parsing décimaux
* normalisation devise
* nettoyage espaces multiples

## 16.4 Hash composite

Le `compositeHash` doit être calculé uniquement à partir des champs déclarés dans la stratégie composite, après normalisation.

## 16.5 Idempotence

Un réimport d’un même fichier avec les mêmes clés de rapprochement ne doit pas produire de doublons, mais des `UPDATE`, `SKIP` ou `ERROR` selon le mode choisi.

---

# 17. Contraintes et limites MVP

Le MVP ne gère pas :

* les rapprochements flous de type fuzzy matching
* les règles avancées probabilistes
* les import jobs asynchrones longue durée
* les imports multi-feuilles fusionnés
* les connecteurs ERP natifs

Le matching MVP est **déterministe**, explicite et auditable.

---

# 18. Résultat attendu

À l’issue de cette RFC, Starium Orchestra disposera d’un moteur d’import budgétaire capable de :

* absorber des fichiers Excel / CSV hétérogènes
* mapper les colonnes de manière configurable
* sauvegarder les mappings par client
* prévisualiser les impacts avant import
* éviter les doublons lors des réimports
* rapprocher les données soit via un identifiant source, soit via une clé composite métier
* tracer l’historique et l’origine des données importées

Cette approche est plus réaliste qu’un simple import figé par colonnes, et beaucoup plus adaptée à ton usage cible de DSI à temps partagé travaillant avec des exports externes variés. 

-