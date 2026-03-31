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
- Frontend (aligné §13) : tests des flux critiques du wizard (navigation 4 étapes, validation mapping avant preview, affichage erreurs ligne par ligne), avec mocks des endpoints analyze / preview / execute.

---

## 13. UX / Frontend flow

Objectif : rendre l’import exploitable en **cockpit Starium** (lecture rapide, décision, pas de friction) sans modifier l’architecture backend ni les modèles Prisma existants.

### 13.1 Parcours en 4 étapes (obligatoire)

Flux linéaire à respecter côté UI :

1. **Upload** — sélection / glisser-déposer du fichier (`.csv` / `.xlsx`), contrôle taille et type, appel `POST /api/budget-imports/analyze`, récupération `fileToken` + métadonnées (`columns`, `sampleRows`, `rowCount`, feuilles XLSX).
2. **Mapping** — association colonnes source → champs cibles (montant, devise, enveloppe code/id, externalId, dates, libellés, etc.), options d’import (`importMode`, `defaultEnvelopeId`, `defaultCurrency`, `decimalSeparator`, `dateFormat`, `ignoreEmptyRows`, `trimValues`), possibilité de **charger un mapping sauvegardé** (voir §13.4).
3. **Preview** — appel `POST /api/budget-imports/preview` avec `fileToken` + configuration ; affichage des statistiques agrégées et d’une table **ligne par ligne** avec statut (`CREATE` | `UPDATE` | `SKIP` | `ERROR`) et `reason` normalisé (aligné sur le plan §6).
4. **Execute** — confirmation explicite (résumé des volumes CREATE/UPDATE/SKIP/ERROR), puis `POST /api/budget-imports/execute` ; écran de **résultat** (job, compteurs, lien vers détail erreurs si `FAILED` ou erreurs partielles selon politique API).

### 13.2 Emplacement et composants (`apps/web/src/features/budget-import/`)

- Arborescence dédiée : pages ou route(s) sous le périmètre budget / admin selon la navigation existante, **sans** dupliquer la logique métier (consommation stricte des APIs).
- Composants typiques (noms indicatifs) : `BudgetImportWizard` (stepper 4 étapes), `BudgetImportUploadStep`, `BudgetImportMappingStep`, `BudgetImportPreviewStep`, `BudgetImportExecuteStep`, `BudgetImportRowStatusTable` (preview + éventuellement relecture post-job), `BudgetImportErrorList` (erreurs **ligne par ligne** avec numéro de ligne source et `reason`).
- Réutilisation des patterns UI du cockpit (cartes, densité lisible, actions primaires claires, pas d’IDs bruts en libellé utilisateur — libellés enveloppe / budget via données déjà résolues côté API ou référentiels chargés).

### 13.3 États UI : loading, error, validation

- **Loading** : spinners / skeletons par étape ; désactivation des actions destructives pendant analyze, preview, execute ; indication de progression lorsque le backend expose des compteurs ou un statut de job (sinon état indéterminé avec message honnête).
- **Error** : erreurs réseau / 403 / 413 / 422 avec message utilisateur et **action de retour** (réessayer upload, corriger mapping, revenir au preview).
- **Validation** : validation **formulaire mapping** avant preview (champs obligatoires pour le mode choisi, cohérence devise / enveloppe par défaut) ; **blocage** si mapping incomplet (aligné §14) — pas d’appel preview tant que la config minimale n’est pas valide.
- **Preview** : toute ligne en `ERROR` doit être visible avec **numéro de ligne** et motif ; option de filtre « erreurs uniquement » pour décision rapide.

### 13.4 Sauvegarde et réutilisation d’un mapping

- CRUD mappings déjà prévu (§9) : l’UI doit permettre **enregistrer** le mapping courant (nom, description optionnelle), **lister** les mappings du client, **appliquer** un mapping existant à un nouveau fichier (réajustement des noms de colonnes si le fichier diffère — l’utilisateur valide avant preview).
- Distinction claire entre **mapping réutilisable** (config JSON côté `BudgetImportMapping`) et **fileToken** (ponctuel, lié à un upload).

---

## 14. Règles métier renforcées

Ces règles **complètent** les sections 5 à 11 sans remplacer la logique transactionnelle ni l’anti-doublon (§6–8).

### 14.1 Devise obligatoire et homogène

- La **devise** est **obligatoire** pour toute ligne importée (colonne dédiée et/ou `defaultCurrency` selon les options).
- **Homogénéité** : toutes les lignes d’un même run d’import doivent résoudre vers la **même devise effective** que celle attendue pour le budget / le périmètre cible (selon règles `budget-management`). Toute ligne avec devise manquante, non parseable ou **incohérente** avec la règle d’homogénéité → statut **ERROR** avec motif explicite (ex. `INVALID_CURRENCY` ou extension du catalogue de reasons documentée dans l’implémentation).

### 14.2 Enveloppe introuvable

- Si la résolution enveloppe (colonne + `defaultEnvelopeId`) échoue (code inconnu, id hors budget, enveloppe inactive si la règle métier l’exige) → **ERROR** (pas de création silencieuse), motif du type `MISSING_ENVELOPE` ou dérivé documenté.

### 14.3 Montant invalide

- Montant vide, non numérique, hors bornes métier, ou incohérent après normalisation (`decimalSeparator`) → **ERROR**, motif `INVALID_AMOUNT` (déjà prévu §6).

### 14.4 Mapping incomplet → blocage

- Tant que les champs **minimaux** requis par le mode d’import et le mapping ne sont pas satisfaits (ex. pas de colonne montant mappée, pas d’enveloppe résolvable ni `defaultEnvelopeId` quand obligatoire) → **blocage** côté API (422) et côté UI **avant** preview ; pas d’exécution partielle sur une config invalide.

### 14.5 Incohérence `clientId` → rejet

- Toute incohérence entre le **client actif** du contexte JWT / header, le `budgetId` / `envelopeId` résolu et le scoping attendu par `budget-management` → **rejet** (403/404/422 selon le cas) ; aucune fuite inter-client. Le fichier et le `fileToken` restent **strictement** rattachés au client du contexte (déjà §4, §6–7).

---

## 15. Performance & scalabilité

Sans modifier l’architecture ni les modèles existants : stratégie **MVP scalable** pour un usage SaaS.

### 15.1 Traitement par batch

- Au-delà d’un seuil configurable (ex. **500 lignes** par batch interne), le **parsing et la préparation** (Phase 1, §7) découpent le travail par segments pour limiter les pics CPU et faciliter le suivi ; les **écritures** restent orchestrées dans la **même** transaction Prisma définie au plan (pas de multiplication de transactions métier implicites sans décision produit).
- Les compteurs (`totalRows`, `createdRows`, etc.) et le `summary` du job restent cohérents avec l’ensemble du fichier.

### 15.2 Streaming (piste future, hors MVP obligatoire)

- Prévoir dans la conception des services une **séparation** entre lecture fichier / itération lignes et persistance, de sorte qu’un **streaming** (chunked read) puisse remplacer la lecture monolithique **sans** changer le contrat d’anti-doublon ni la Phase 1 / Phase 2.

### 15.3 Limitation mémoire explicite

- Documenter et respecter des plafonds : taille fichier (déjà §4, §11), nombre max de lignes, et **non chargement** de l’intégralité des gros fichiers en mémoire brute si évolution vers streaming ; pour le MVP, chargement mémoire acceptable sous les limites annoncées avec revue avant montée en charge.

### 15.4 Préparation hors transaction (rappel structurant)

- Maintenir impérativement le principe §7 : **toute** la préparation (parse, mapping, normalisation, résolution enveloppes, matching RowLinks, détection doublons internes) **hors** `prisma.$transaction` ; la transaction ne contient que Job + lignes + RowLinks + finalisation job — garantie de performance et de sûreté déjà posée.

---

## 16. Intégration avec autres modules

### 16.1 Cohérence avec budget-management

- **Validation stricte `envelopeId` / `budgetId`** : toute enveloppe résolue doit **appartenir** au `budgetId` du job et au **client** du contexte ; vérifications alignées sur les services existants `budget-management` (pas de raccourci contournant les guards / scoping).
- **Hiérarchie Budget → Envelope → Line** : l’import ne crée que des `BudgetLine` **sous** une enveloppe déjà rattachée au budget cible ; pas de création d’enveloppe fantôme ni de ligne orpheline.
- **Ligne existante (merge vs overwrite)** : le comportement est **piloté** par `importMode` (`CREATE_ONLY` | `UPSERT` | `UPDATE_ONLY`) déjà défini §5–7 — à documenter en spec produit : *UPSERT* = mise à jour des champs mappés lorsque le match RowLink / clé est trouvé ; *UPDATE_ONLY* = pas de création, skips documentés ; *CREATE_ONLY* = pas de mise à jour des lignes existantes matchées (SKIP ou erreur selon règle déjà choisie côté implémentation, **sans** casser l’anti-doublon).

### 16.2 Post-import : financial-core et cohérence des agrégats

- **Recalcul automatique** : après succès d’un job (`COMPLETED`), déclencher les recalculs / invalidations attendus via le **financial-core** (totaux budget, enveloppes, engagements si applicable) selon les points d’extension déjà utilisés ailleurs dans la plateforme — **sans** nouveau modèle Prisma pour cet import.
- **Snapshot après import** : possibilité de **déclencher** un snapshot budgétaire / versionnement (RFC-019 ou équivalent) **après** import réussi, de façon optionnelle ou pilotée par paramètre métier, pour figer un état « post-import ».

### 16.3 Reporting et KPI

- Lier l’import au **rafraîchissement** des vues reporting / KPI (RFC-016, dashboards) soit par recalcul synchrone contrôlé, soit par invalidation de cache / événement interne, pour que l’utilisateur ne voie pas des agrégats obsolètes après un import massif.

### 16.4 Logs exploitables pour audit (structuration)

- Les actions d’audit listées §10 restent la base ; **structurer** les payloads `newValue` / résumés pour qu’ils soient **exploitables** en production : `jobId`, `budgetId`, `importMode`, volumes CREATE/UPDATE/SKIP/ERROR, fichier d’origine (nom, pas de contenu binaire), corrélation utilisateur, et **référence** aux erreurs métier agrégées (`errorsByType`). Les détails ligne à ligne restent dans le job / réponses preview et traces applicatives selon politique de rétention — cohérent avec l’audit sans explosion de volume dans le seul journal d’audit.

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
9. **UX / Frontend flow (§13)** : wizard 4 étapes (upload → mapping → preview → execute), feature `features/budget-import/`, états loading/error/validation, erreurs ligne par ligne, sauvegarde / réutilisation de mapping, alignement cockpit Starium.
10. **Règles métier renforcées (§14)** : devise obligatoire et homogène, enveloppe introuvable → ERROR, montant invalide → ERROR, mapping incomplet → blocage, incohérence client → rejet.
11. **Performance & scalabilité (§15)** : traitement par batch (ex. 500 lignes), piste streaming future, limites mémoire explicites, rappel préparation hors transaction.
12. **Intégration avec autres modules (§16)** : cohérence `budget-management` (validation budget/enveloppe, hiérarchie, merge/overwrite via `importMode`), post-import financial-core + snapshot optionnel + reporting/KPI, audit structuré pour exploitation.
