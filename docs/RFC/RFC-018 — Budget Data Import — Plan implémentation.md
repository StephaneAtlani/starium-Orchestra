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
- Frontend (aligné §13) : tests des flux critiques du wizard (navigation macro-étapes, **blocs métier** fichier/feuille → enveloppe → ligne → commandes/factures si activés, validation avant preview, affichage erreurs ligne par ligne et **rattachement visuel au bloc** quand l’UI le permet), avec mocks analyze / analyze-sheet / preview / execute.

---

## 13. UX / Frontend flow

Objectif : rendre l’import exploitable en **cockpit Starium** (lecture rapide, décision, pas de friction) sans modifier l’architecture backend ni les modèles Prisma existants.

**Refonte UX cible (parcours métier par blocs)** : remplacer l’écran de **mapping plat** (liste générique de colonnes) par un **assistant découpé en blocs fonctionnels successifs**, une question métier à la fois. L’implémentation **continue de sérialiser** vers le même contrat API (`mappingConfig` + `optionsConfig` + `fileToken`, etc.) : la structure par blocs est une **organisation UI et cognitive**, pas un nouveau schéma backend obligatoire. Les libellés visibles utilisateur sont en **français métier** ; éviter en surface les termes techniques (`fields`, `matching`, DTO) — les noms techniques restent dans le code et les payloads.

---

### 13.0 Vue d’ensemble : macro-étapes inchangées côté API

Le flux **analyze → preview → execute** et les permissions (`budgets.read` / `budgets.update`) **ne changent pas**. Côté UI, on distingue :

| Macro-étape | Rôle |
|-------------|------|
| **Configuration** (remplace l’ancien écran unique « Mapping » trop dense) | Enchaînement de **blocs métier** (fichier/feuille, enveloppe, ligne budgétaire, commandes, factures, options transverses : devise, séparateur décimal, mode d’import…). |
| **Aperçu** | `POST …/preview` — voir §13.7 pour la présentation par blocs. |
| **Import** | `POST …/execute` — inchangé. |

Un **stepper** peut afficher 4 grands jalons (*Fichier → Configuration → Aperçu → Import*) tout en découpant la phase **Configuration** en **sous-étapes ou sections** (une section = un bloc métier), pour ne jamais présenter un seul écran surcharge.

---

### 13.1 Blocs fonctionnels successifs (configuration)

Chaque bloc doit avoir un **titre métier**, une **phrase d’aide** et des **contrôles limités** à ce périmètre.

#### Bloc 1 — Fichier / feuille

- **Upload** du fichier (`.csv` / `.xlsx`), contrôles taille/type, appel `POST /api/budget-imports/analyze`, récupération `fileToken`, `columns`, `sampleRows`, `rowCount`, `sheetNames` (XLSX).
- **Si Excel** : étape ou panneau **explicite** pour choisir l’**onglet / feuille** (`POST /api/budget-imports/analyze-sheet` avec `fileToken` + `sheetName` si déjà implémenté) — la feuille est **obligatoire** avant de poursuivre (validation locale + cohérence avec `sheetName` côté preview/execute).
- **Si CSV** : ce bloc ne propose **pas** de sélection de feuille (étape masquée ou sautée).

#### Bloc 2 — Enveloppe

L’utilisateur doit pouvoir indiquer **comment** la ligne sera rattachée à une enveloppe du budget cible (aligné §6 / §16.1) :

| Mode UX | Comportement | Impact mapping / options |
|--------|----------------|---------------------------|
| **Colonne fichier** | L’enveloppe est lue dans une colonne (code et/ou identifiant) | Mappe `envelopeCode` / `envelopeId` ; `defaultEnvelopeId` optionnel comme repli pour lignes sans code reconnu. |
| **Enveloppe existante** | Une seule enveloppe pour tout le fichier | `defaultEnvelopeId` **obligatoire** ; **pas** de colonne enveloppe (les champs enveloppe du mapping restent vides). |
| **Nouvelle enveloppe** | Création avant ou pendant l’assistant | **Sans nouveau endpoint d’import** : s’appuyer sur les **API / écrans existants** `budget-management` (création d’enveloppe sur le budget), puis retour au wizard avec liste d’enveloppes rafraîchie. Documenter le flux (lien « Créer une enveloppe » → retour). Si création inline non disponible, le plan impose au minimum **sélection** ou **colonne**. |

Validation locale : **au moins une** résolution d’enveloppe valide avant preview (colonne + éventuel repli, ou enveloppe unique, ou combinaison documentée).

#### Bloc 3 — Ligne budgétaire

- **Colonne obligatoire** qui sert de **base d’identité / libellé / clé métier** pour la `BudgetLine` (ex. libellé de ligne, code métier) — correspondance vers les champs logiques existants (`name`, `label`, éventuellement clé de rapprochement via `externalId` / matching composite selon §6).
- Le plan précise que cette étape est **la colonne structurante** de la ligne : l’utilisateur doit **voir** qu’il définit « la ligne budgétaire », pas un champ générique anonyme.

#### Bloc 4 — Commandes (sous-mapping dédié)

Section **optionnelle ou activable** (« Mon fichier contient des données commande ») :

- Colonne **montant initial** commande (alignement sur champs normalisés existants : `amount` / `initialAmount` selon contrat technique).
- Colonne **montant facturé / engagé** (`committedAmount` si exposé par le mapping — voir implémentation).
- Colonne **date de commande** : **optionnelle** sauf si le contrat backend / le mode de matching l’exige (documenter la règle au moment de l’implémentation).

Si la section **commandes est activée**, les champs **marqués requis** dans ce bloc doivent être **validés avant** l’appel preview.

#### Bloc 5 — Factures (sous-mapping dédié)

Section **optionnelle ou activable** (« Mon fichier contient des données facture ») :

- Colonne **montant initial** facture.
- Colonne **montant consommé** (`consumedAmount` si exposé).
- Colonne **date de facture** : optionnelle ou obligatoire selon contrat backend.

Même règle : si la section **factures est activée**, validation des champs requis du bloc avant preview.

#### Bloc 6 — Options transverses (compact)

Regrouper hors des blocs « métier » purs : **devise** (colonne et/ou défaut), **séparateur décimal**, **format de date**, **mode d’import** (`CREATE_ONLY` / `UPSERT` / `UPDATE_ONLY`), **correspondance des lignes** (référence externe / clé composite) si présent dans le design actuel — **libellés français**, pas de jargon `matching` en titre.

---

### 13.2 Mapping structuré (vue conceptuelle pour le plan et l’UI)

Même si le **payload API** reste un `mappingConfig` + `optionsConfig` JSON plat, la **documentation produit** et l’**UI** doivent présenter une structure logique par blocs :

```text
mapping (vue métier)
├── file / sheet          → fileToken, sourceType, sheetName (XLSX)
├── envelope              → colonne(s) enveloppe OU enveloppe unique (defaultEnvelopeId)
├── budgetLine            → libellé / identité ligne + clés de rapprochement
├── purchaseOrders (cmd)  → montants + date commande (si section activée)
└── invoices (factures)   → montants + date facture (si section activée)
```

Les **écrans** ne listent plus « une grille unique de tous les champs » : chaque bloc a ses propres sélecteurs de colonnes (listes déroulantes alimentées par les en-têtes du fichier).

---

### 13.3 Validation locale renforcée (avant preview)

À implémenter côté client (en complément des 422 API, §14) :

| Règle | Détail |
|-------|--------|
| Feuille Excel | Si `sourceType === XLSX` : feuille sélectionnée obligatoire (cohérence avec analyze-sheet / preview). |
| Enveloppe | Au moins un des trois cas : colonne(s) résolue(s), ou enveloppe par défaut obligatoire en mode « une seule enveloppe », ou flux création enveloppe complété + sélection. |
| Ligne budgétaire | Colonne identité / libellé (champ requis du bloc 3) renseignée. |
| Commandes | Si section activée : montants requis identifiés ; date selon règle produit. |
| Factures | Si section activée : idem. |
| Dates | Si colonnes dates fournies pour commandes/factures : format cohérent avec `dateFormat`. |
| Preview | **Bloquée** tant que les blocs requis ne sont pas valides. |

---

### 13.4 Parcours en 4 étapes API (rappel) + découpage UI

Flux **API** inchangé :

1. **Analyze** (upload + éventuellement analyze-sheet).
2. **Configuration** = enchaînement des blocs §13.1 (remplace l’ancien monolithe « Mapping »).
3. **Preview** — `POST /api/budget-imports/preview`.
4. **Execute** — `POST /api/budget-imports/execute`.

### 13.5 Emplacement et composants (`apps/web/src/features/budgets/budget-import/`)

- Arborescence **sous** `features/budgets/` (chemin validé produit), **sans** dupliquer la logique métier serveur.
- Découpage composants **suggéré** (évolutif) : `BudgetImportWizard` ; sous-composants ou sous-étapes **par bloc** (ex. `BudgetImportFileSheetStep`, `BudgetImportEnvelopeStep`, `BudgetImportBudgetLineStep`, `BudgetImportOrdersMappingStep`, `BudgetImportInvoicesMappingStep`) en plus ou à la place d’un seul `BudgetImportMappingStep` monolithique ; `BudgetImportPreviewStep`, `BudgetImportExecuteStep` ; tables d’aperçu / erreurs.
- Réutilisation des patterns cockpit (cartes, une question claire par écran ou section, pas d’IDs bruts visibles).

### 13.6 États UI : loading, error, validation

- **Loading** : spinners / skeletons par étape et par appel analyze / analyze-sheet / preview / execute.
- **Error** : messages utilisateur + retour au **bloc** concerné quand c’est possible (ex. erreur enveloppe → bloc Enveloppe).
- **Validation** : voir §13.3 ; pas d’appel preview tant que la configuration minimale n’est pas valide.

### 13.7 Preview / exécution (présentation métier)

- **Preview** : au-delà de la table ligne à ligne existante (§6), le plan cible une **lecture par blocs** dans l’UI :
  - résumé ou onglets : **lignes budgétaires détectées**, **données commande** (si section activée), **données facture** (si section activée) ;
  - les **erreurs** sont **rattachées au bloc** concerné (enveloppe, ligne, commandes, factures) par regroupement visuel ou filtre, en réutilisant les `reason` API existantes tant que possible.
- **Execute** : confirmation avec volumes CREATE/UPDATE/SKIP/ERROR ; écran résultat inchangé en principe.

### 13.8 Sauvegarde et réutilisation d’un mapping

- CRUD mappings (§9) : l’UI enregistre toujours un **JSON** compatible backend ; la **structure par blocs** peut être **reflétée** dans l’UI de reprise (« reprendre un mapping ») en réhydratant chaque section.
- Distinction **mapping réutilisable** vs **fileToken** ponctuel (inchangé).

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
- **Refonte UX (§13.3)** : la validation locale **par blocs** (feuille Excel, enveloppe, ligne budgétaire, sections commandes/factures activées) **complète** cette règle sans changer les contrats API.

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
9. **UX / Frontend flow (§13)** : wizard **macro-étapes** analyze → configuration → preview → execute ; **configuration par blocs métier** (fichier/feuille, enveloppe avec 3 cas UX, ligne budgétaire obligatoire, sections commandes/factures optionnelles, options transverses) ; pas d’écran de mapping plat unique ; validation locale renforcée (§13.3) ; preview présentable par blocs et erreurs rattachées au bloc ; arborescence `apps/web/src/features/budgets/budget-import/` ; permissions inchangées ; alignement cockpit Starium.
10. **Règles métier renforcées (§14)** : devise obligatoire et homogène, enveloppe introuvable → ERROR, montant invalide → ERROR, mapping incomplet → blocage, incohérence client → rejet.
11. **Performance & scalabilité (§15)** : traitement par batch (ex. 500 lignes), piste streaming future, limites mémoire explicites, rappel préparation hors transaction.
12. **Intégration avec autres modules (§16)** : cohérence `budget-management` (validation budget/enveloppe, hiérarchie, merge/overwrite via `importMode`), post-import financial-core + snapshot optionnel + reporting/KPI, audit structuré pour exploitation.
