# Plan d'implémentation RFC-018 — Budget Data Import (révisé)

## Contexte

- **Backend** : NestJS, Prisma, module `budget-management` existant (`apps/api/src/modules/budget-management/`).
- **Pas d'upload fichier existant** : ajout de `FileInterceptor` (multer) + librairies Excel/CSV.
- **Cible métier** : création/mise à jour de `BudgetLine` dans un budget donné ; chaque ligne requiert un `envelopeId`. Le mapping peut fournir une colonne `envelopeCode` / `envelopeId` ou l’option `defaultEnvelopeId`.

---

## 1. Schéma Prisma et stockage temporaire

**Fichier** : `apps/api/prisma/schema.prisma`

### Enums MVP (cadrage simple)

- **BudgetImportSourceType** : `CSV`, `XLSX`
- **BudgetImportEntityType** : `BUDGET_LINES`
- **BudgetImportTargetEntityType** : `BUDGET_LINE`
- **BudgetImportJobStatus** : `ANALYZED`, `PREVIEWED`, `RUNNING`, `COMPLETED`, `FAILED`
- **BudgetImportMode** : `CREATE_ONLY`, `UPSERT`, `UPDATE_ONLY`

### Modèles

- **BudgetImportMapping** : id, clientId, name, description?, sourceType, entityType (`BUDGET_LINES`), sheetName?, headerRowIndex, mappingConfig (Json), optionsConfig? (Json), createdById?, timestamps. Index `[clientId]`. Relations Client, User? (createdBy).
- **BudgetImportJob** : id, clientId, budgetId, mappingId?, fileName, sourceType, status, importMode, totalRows, createdRows, updatedRows, skippedRows, errorRows, summary (Json), createdById?, createdAt. Index `[clientId, budgetId]`, `[mappingId]`. Relations Client, Budget?, BudgetImportMapping?, User?, BudgetImportRowLink[].
  - **Structure minimale de `summary`** : `{ warningsCount: number, errorsByType: Record<string, number> }` (ex. `errorsByType: { "INVALID_AMOUNT": 3, "MISSING_ENVELOPE": 1 }`). Autres champs optionnels autorisés.
- **BudgetImportRowLink** : id, clientId, budgetId, importJobId, targetEntityType (`BUDGET_LINE`), targetEntityId, sourceRowNumber?, externalId?, compositeHash?, fingerprintData? (Json), createdAt. Index `[clientId, budgetId, targetEntityType, targetEntityId]`, `[clientId, budgetId, externalId]` (unique quand non null), `[clientId, budgetId, compositeHash]` (unique quand non null). Relations Client, BudgetImportJob.

Contraintes d’unicité à respecter côté service (et éventuellement en base) pour l’anti-doublon :
- Au plus un RowLink par `(clientId, budgetId, targetEntityType, externalId)` quand externalId est renseigné.
- Au plus un RowLink par `(clientId, budgetId, targetEntityType, compositeHash)` quand compositeHash est renseigné.

### FileToken et stockage temporaire

- **BudgetImportFileStoreService** : stockage temporaire (dossier `temp/imports` ou équivalent). Chaque entrée conserve des **métadonnées** incluant au minimum :
  - `fileToken`, `clientId`, `uploadedByUserId`, `fileName`, `sourceType`, `createdAt`, `expiresAt`
- **Règle MVP fileToken** : **seul l’utilisateur ayant uploadé le fichier** peut faire preview et execute. Vérifications : token = client actif, non expiré, et `uploadedByUserId === userId` du contexte. Sinon → 403.
- Nettoyage après utilisation (execute) ou TTL (cron optionnel pour tokens orphelins).

---

## 2. Dépendances NPM

- **Excel** : `xlsx` (SheetJS).
- **CSV** : `csv-parse` (ou parsing manuel `,` / `;`).
- **Upload** : `@types/multer` (dev).

---

## 3. Module budget-import

Arborescence : `apps/api/src/modules/budget-import/` avec controller (analyze, preview, execute), mappings controller/service, `budget-import.service`, `budget-import-file-store.service`, `budget-import-parser.service`, `budget-import-matching.service`, DTOs, types, constantes. Guards : JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard. Permissions : `budgets.read` (analyze, preview), `budgets.update` (execute, CRUD mappings).

---

## 4. Analyse (POST /api/budget-imports/analyze)

- Body : `multipart/form-data` avec `file`.
- Contrôles : 10 MB max, `.xlsx` ou `.csv`.
- Après sauvegarde du fichier : enregistrer dans le file store avec les métadonnées complètes (fileToken, clientId, uploadedByUserId, fileName, sourceType, createdAt, expiresAt), retourner `fileToken`.
- Réponse : `fileToken`, `sourceType`, `sheetNames` (XLSX), `columns`, `sampleRows`, `rowCount`.

---

## 5. Options d’import (formalisation explicite)

Les options d’import doivent être formalisées explicitement (mapping ou body preview/execute) avec les champs suivants :

| Option | Type | Description |
|--------|------|-------------|
| **defaultEnvelopeId** | string | Enveloppe par défaut si pas de colonne envelope. |
| **defaultCurrency** | string | Devise par défaut. |
| **importMode** | enum | `CREATE_ONLY` \| `UPSERT` \| `UPDATE_ONLY`. |
| **ignoreEmptyRows** | boolean | Ignorer les lignes vides. |
| **trimValues** | boolean | Trim des valeurs. |
| **dateFormat?** | string | Format d’entrée des dates (ex. `DD/MM/YYYY`, `YYYY-MM-DD`). |
| **decimalSeparator?** | `,` \| `.` | Séparateur décimal pour le parsing des montants. |

---

## 6. Prévisualisation (POST /api/budget-imports/preview)

- Vérifier **fileToken** : appartient au client actif et n’est pas expiré.
- **Préchargement** (avant la boucle, aucune requête Prisma par ligne) :
  - Enveloppes du budget (`budgetId` + clientId) → Map par `id`, Map par `code`.
  - RowLinks existants pour (clientId, budgetId, targetEntityType) → Map par externalId et Map par compositeHash pour le matching.
- Parsing du fichier via fileToken (déjà scopé).
- Pour chaque ligne : mapping → normalisation (trim, dateFormat, decimalSeparator) → résolution enveloppe (colonne ou defaultEnvelopeId) → calcul externalId ou compositeHash.
- **Doublons internes au fichier** : le preview doit détecter les doublons dans le fichier importé (même `externalId` ou même `compositeHash` entre lignes du même fichier). Pour ces doublons, utiliser le motif explicite **DUPLICATE_SOURCE_KEY** sur les lignes concernées (toutes sauf la première occurrence, ou toutes selon la règle métier choisie).
- Rapprochement avec les RowLinks préchargés : au plus un match par clé ; si plusieurs matchs pour une clé → **AMBIGUOUS_MATCH**.
- Statuts de preview **standardisés** :
  - **CREATE** | **UPDATE** | **SKIP** | **ERROR**
- Reasons (motifs) **standardisés** :
  - `MATCHED_BY_EXTERNAL_ID`, `MATCHED_BY_COMPOSITE_KEY`, `NO_MATCH_CREATE`, **NO_MATCH_UPDATE_ONLY** (UPDATE_ONLY sans correspondance → SKIP), `MISSING_ENVELOPE`, `INVALID_AMOUNT`, `INVALID_DATE`, `MISSING_REQUIRED_FIELD`, `DUPLICATE_SOURCE_KEY`, `AMBIGUOUS_MATCH`
- Réponse : `stats`, `previewRows` (avec status + reason par ligne), `warnings`, `errors`.

---

## 7. Exécution (POST /api/budget-imports/execute) — préparation hors transaction, écriture en transaction

- Vérifier **fileToken** : client actif et non expiré.

- **Phase 1 — Préparation (tout avant la transaction, aucune écriture DB)** :
  - Parsing du fichier.
  - Application du mapping et normalisation (trim, dateFormat, decimalSeparator).
  - Résolution des enveloppes (préchargement : enveloppes du budget + RowLinks utiles en mémoire — maps par id/code et par externalId/compositeHash).
  - Matching (rapprochement avec RowLinks préchargés), détection doublons internes au fichier (DUPLICATE_SOURCE_KEY).
  - Calcul des actions par ligne : CREATE / UPDATE / SKIP / ERROR et reasons.
  - Construction de la liste d’opérations à appliquer (créations, mises à jour) et des lignes à ignorer ou en erreur.

- **UPDATE_ONLY** : si aucune correspondance trouvée pour une ligne → **SKIP** avec raison **NO_MATCH_UPDATE_ONLY**.

- **Phase 2 — Transaction Prisma (réservée aux écritures)** :
  - Dans une seule `prisma.$transaction()` :
    - Créer le **BudgetImportJob** (status RUNNING).
    - Créer / mettre à jour les **BudgetLine**.
    - Créer / mettre à jour les **BudgetImportRowLink** (un seul par clé logique : vérifier avant insert ; si clé déjà présente → SKIP ou erreur).
    - Mettre à jour le job final : compteurs, status COMPLETED/FAILED, **summary** (structure minimale : `warningsCount`, `errorsByType`).
  - **Anti-doublon RowLink** : clés logiques `(clientId, budgetId, targetEntityType, externalId)` et `(clientId, budgetId, targetEntityType, compositeHash)` ; avant chaque création de RowLink, vérifier dans la transaction qu’aucun RowLink n’existe déjà pour cette clé.

- Nettoyer le fichier temporaire (fileToken) après exécution.
- Audit : `budget_import.executed` / `budget_import.failed`.

---

## 8. Anti-doublon BudgetImportRowLink (renforcé)

- Clés logiques uniques :
  - **externalId** : `(clientId, budgetId, targetEntityType, externalId)` — au plus un enregistrement par combinaison (externalId non vide).
  - **compositeHash** : `(clientId, budgetId, targetEntityType, compositeHash)` — au plus un enregistrement par combinaison (compositeHash non vide).
- Côté service : avant d’insérer un nouveau RowLink, s’assurer qu’aucun RowLink existant n’a déjà cette clé (dans la transaction). Si oui → ne pas créer de second RowLink (SKIP ou erreur selon le mode).
- Optionnel : contraintes uniques en base sur `(clientId, budgetId, targetEntityType, externalId)` (where externalId not null) et `(clientId, budgetId, targetEntityType, compositeHash)` (where compositeHash not null) pour garantir l’intégrité au niveau DB.

---

## 9. CRUD BudgetImportMapping

- GET/POST /api/budget-import-mappings, GET/PATCH/DELETE /api/budget-import-mappings/:id, tous scopés clientId, permissions budgets.read / budgets.update.

---

## 10. Audit logs

- Actions : `budget_import.analyzed`, `budget_import.previewed`, `budget_import.executed`, `budget_import.failed`, `budget_import_mapping.created`, `budget_import_mapping.updated`, `budget_import_mapping.deleted`. Chaque entrée avec clientId, userId, resourceType/resourceId, newValue (résumé).

---

## 11. Normalisation et contraintes MVP

- Normalisation : trim, casse, dates selon dateFormat → ISO, décimaux selon decimalSeparator, devise, espaces multiples.
- Limites : 10 MB, 20 000 lignes, CSV UTF-8, séparateurs `,` et `;`, une feuille Excel.

---

## 12. Tests

- Unitaires : parser, matching (externalId, compositeHash, doublons internes DUPLICATE_SOURCE_KEY, AMBIGUOUS_MATCH), préchargement enveloppes + RowLinks, préparation hors transaction.
- Intégration : analyze (métadonnées fileToken complètes), preview (vérif fileToken = client actif + non expiré, doublons internes, reasons), execute (préparation hors transaction puis transaction écritures uniquement : Job, BudgetLine, RowLink, update job), CRUD mappings.
- Isolation client : fileToken d’un client refusé pour preview/execute d’un autre client.

---

## Récapitulatif des ajustements intégrés

1. **FileToken** : métadonnées explicites (fileToken, clientId, uploadedByUserId, fileName, sourceType, createdAt, expiresAt). **MVP** : seul l’utilisateur ayant uploadé peut faire preview/execute (`uploadedByUserId === userId`). Vérifications : client actif, non expiré, autorisé → sinon 403.
2. **Doublons dans le fichier** : le preview détecte les doublons internes (même externalId ou même compositeHash dans le même fichier) avec motif explicite **DUPLICATE_SOURCE_KEY**.
3. **Préparation hors transaction** : parsing, mapping, normalisation, résolution enveloppes, matching, calcul des actions CREATE/UPDATE/SKIP/ERROR — tout avant la transaction. La transaction est réservée aux écritures : BudgetImportJob, BudgetLine, BudgetImportRowLink, update final du job.
4. **Préchargement** : enveloppes du budget **et** RowLinks utiles préchargés en mémoire avant la boucle ; aucune requête Prisma par ligne.
5. **Options** : formalisation explicite — defaultEnvelopeId, defaultCurrency, importMode, ignoreEmptyRows, trimValues, dateFormat?, decimalSeparator?.
6. **Enums MVP** : BudgetImportEntityType = BUDGET_LINES, BudgetImportTargetEntityType = BUDGET_LINE.
7. **BudgetImportJob.summary** : structure minimale `{ warningsCount, errorsByType }`.
8. **UPDATE_ONLY** : aucune correspondance → SKIP avec raison NO_MATCH_UPDATE_ONLY.
