# Plan d'implémentation RFC-019 — Budget Versioning

Document de référence : [RFC-019 — Budget Versioning](RFC-019%20—%20Budget%20Versioning.md).

---

## Règles impératives (à respecter en implémentation)

Les cinq points suivants sont **obligatoires** et doivent être appliqués dans le code et les tests :

1. **Relations Prisma nommées explicitement**  
   Entre BudgetVersionSet et Budget : côté set, nommer **versions**, **baselineBudget**, **activeBudget** (avec noms de relation Prisma explicites) ; côté Budget, **versionSet** (même nom de relation que le set). Self-relation **BudgetVersionParent** (parentBudget / childVersions). Voir §1.2 et §1.3.

2. **Règle stricte de code**  
   `BudgetVersionSet.code` = code métier stable **sans suffixe de version**.  
   `Budget.code` = **`{versionSet.code}-V{versionNumber}`** (formule exacte). À appliquer en createBaseline et createRevision.

3. **Activation idempotente**  
   Si la version ciblée est déjà ACTIVE, `activateVersion(budgetId)` retourne un **succès sans aucun changement d’état** (pas d’écriture en base, pas d’audit).

4. **Interdiction d’archiver la baseline unique**  
   Interdire l’archivage de la baseline si elle est **la seule version du set**. Plus largement, éviter qu’un version set se retrouve **sans aucune version exploitable**.

5. **Stabilité obligatoire des codes BudgetEnvelope et BudgetLine (normatif)**  
   Les codes des **BudgetEnvelope** et **BudgetLine** restent **stables d’une version à l’autre** ; **seuls les IDs changent**. Cette règle doit être explicitée dans la **duplication** (§5.5), le **compare** (§5.7) et les **points de vigilance** (§9). Ne jamais générer de nouveaux codes au clonage.

---

## 1. Schéma Prisma

**Fichier** : `apps/api/prisma/schema.prisma`

### 1.1 Enums

- **BudgetVersionKind** : `BASELINE`, `REVISION`
- **BudgetVersionStatus** : `DRAFT`, `ACTIVE`, `SUPERSEDED`, `ARCHIVED`

### 1.2 Modèle BudgetVersionSet

- Champs : `id`, `clientId`, `exerciseId`, `code`, `name`, `description?`, `baselineBudgetId?`, `activeBudgetId?`, `createdAt`, `updatedAt`
- **Relations entre BudgetVersionSet et Budget : nommage explicite obligatoire**  
  Pour éviter toute ambiguïté (plusieurs relations du set vers Budget), les quatre noms suivants doivent être utilisés explicitement dans le schéma Prisma :
  - Côté **BudgetVersionSet** : **versions** (tous les budgets du set), **baselineBudget** (la baseline V1), **activeBudget** (la version active) — chacune avec un nom de relation Prisma explicite (ex. `@relation("VersionSetVersions")`, etc.).
  - Côté **Budget** : **versionSet** — relation inverse vers le set, avec le même nom de relation que côté set (ex. `@relation("VersionSetVersions", ...)`).
- Relations vers : `client` (Client), `exercise` (BudgetExercise)
- Contraintes : `@@unique([clientId, code])`, `@@index([clientId])`, `@@index([exerciseId])`

Exemple de déclaration Prisma (à adapter selon la syntaxe exacte) :

- `versions Budget[]` avec `@relation("VersionSetVersions", ...)` côté BudgetVersionSet
- `baselineBudget Budget? @relation("VersionSetBaseline", fields: [baselineBudgetId], references: [id])`
- `activeBudget Budget? @relation("VersionSetActive", fields: [activeBudgetId], references: [id])`
- Côté **Budget** : `versionSet BudgetVersionSet? @relation("VersionSetVersions", ...)` pour la relation inverse du set.

### 1.3 Extension du modèle Budget

- Champs optionnels : `versionSetId?`, `versionNumber?`, `versionLabel?`, `versionKind?`, `versionStatus?`, `parentBudgetId?`, `activatedAt?`, `archivedAt?`, `isVersioned Boolean @default(false)`
- **Relations (nommage explicite obligatoire)** :
  - **versionSet** : `BudgetVersionSet?` — même nom de relation que côté BudgetVersionSet (ex. `@relation("VersionSetVersions", ...)`) pour éviter toute ambiguïté.
  - **parentBudget** : `Budget?` — self-relation nommée **BudgetVersionParent** (`@relation("BudgetVersionParent", fields: [parentBudgetId], references: [id])`)
  - **childVersions** : `Budget[]` — `@relation("BudgetVersionParent")`
- Index : `[clientId, versionSetId]`, `[clientId, versionStatus]`, `[clientId, versionKind]`
- Contrainte : `@@unique([versionSetId, versionNumber])` (pour les budgets versionnés ; les non versionnés ont `versionSetId` et `versionNumber` à null)

### 1.4 Autres modèles

- **BudgetExercise** : ajouter `budgetVersionSets BudgetVersionSet[]`
- **Client** : ajouter `budgetVersionSets BudgetVersionSet[]`

Créer une migration Prisma après modification du schéma.

---

## 2. Règle stricte de code (normative)

Règle **stricte** pour tout le versioning. Aucune exception.

- **BudgetVersionSet.code** = code métier stable, **sans suffixe de version** (ex. `BUD-2026-IT`).
- **Budget.code** (pour un budget versionné) = **`{versionSet.code}-V{versionNumber}`** (formule exacte).
  - Exemple : versionSet.code = `BUD-2026-IT` → budget V1 = `BUD-2026-IT-V1`, budget V2 = `BUD-2026-IT-V2`.

À appliquer systématiquement en createBaseline et createRevision ; à documenter dans le code et à rappeler dans les points de vigilance.

---

## 3. Module budget-versioning

**Arborescence** : `apps/api/src/modules/budget-versioning/`

- **budget-versioning.module.ts** : imports PrismaModule, AuditLogsModule ; providers BudgetVersioningService ; controllers BudgetVersionSetsController et BudgetVersioningController (actions sous `/budgets`).
- **budget-versioning.service.ts** : logique métier (voir §4 et §5).
- **DTOs** (class-validator) :
  - `list-version-sets.query.dto.ts` : `exerciseId?`, `search?`, `offset?`, `limit?`
  - `create-revision.dto.ts` : `label?`, `description?`
  - `compare-versions.query.dto.ts` : `targetBudgetId` (requis pour GET compare)
- **Types** : `budget-versioning.types.ts` (réponses : version set détail, version history, compare diff).
- **Tests** : `budget-versioning.service.spec.ts`, `tests/budget-versioning.integration.spec.ts` (optionnel).

Enregistrer le module dans `apps/api/src/app.module.ts`.

---

## 4. Routes API

Guards : JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard.  
Permissions : `budgets.read` (GET), `budgets.create` (create-baseline, create-revision), `budgets.update` (activate-version, archive-version).

- **BudgetVersionSetsController** (`@Controller('budget-version-sets')`) :
  - `GET /` — liste (query : exerciseId, search, offset, limit)
  - `GET /:id` — détail (métadonnées, baseline, active, liste des versions par versionNumber)

- **BudgetVersioningController** (`@Controller('budgets')`) — routes spécifiques uniquement (pas de conflit avec BudgetsController) :
  - `POST /:id/create-baseline`
  - `POST /:id/create-revision` (body optionnel CreateRevisionDto)
  - `POST /:id/activate-version`
  - `POST /:id/archive-version`
  - `GET /:id/version-history`
  - `GET /:id/compare?targetBudgetId=...`

Enregistrer le controller des actions de versioning de façon à ce que Nest matche ces routes (segments fixes) avant le `@Get(':id')` générique du BudgetsController.

---

## 5. Règles métier et algorithme de duplication

### 5.1 createBaseline(budgetId)

- **Précondition** : budget source **non versionné** (`!source.isVersioned`), scope client vérifié.
- **Convention de code** :
  - **BudgetVersionSet.code** = code métier stable du budget source (ex. celui du budget existant, sans suffixe de version), ou dérivé stable (ex. même valeur que le code actuel du budget).
  - **Nouveau Budget (V1).code** = **`{BudgetVersionSet.code}-V1`** (strictement).
- **Règle métier : baseline = première version active**  
  Lors de la création d’une baseline, la baseline **est** la première version du set et elle est **automatiquement ACTIVE**. Donc :
  - `BudgetVersionSet.baselineBudgetId` = id du nouveau budget V1
  - `BudgetVersionSet.activeBudgetId` = id du même budget V1  
  Les deux pointent vers cette version V1.
- **Transaction** :
  1. Créer `BudgetVersionSet` (clientId, exerciseId, code = code métier stable, name, description).
  2. Créer le nouveau `Budget` (copie des champs métier du source ; code = `versionSet.code + '-V1'` ; versionSetId, versionNumber = 1, versionLabel = 'V1', versionKind = BASELINE, **versionStatus = ACTIVE**, isVersioned = true ; pas de parentBudgetId).
  3. **Duplication des enveloppes** (voir §5.4) : conserver les **codes** des enveloppes à l’identique (stabilité pour la comparaison) ; map `oldEnvelopeId -> newEnvelopeId`.
  4. **Duplication des lignes** (voir §5.4) : conserver les **codes** des lignes ; rattacher aux nouvelles enveloppes via le map.
  5. Mettre à jour `BudgetVersionSet.baselineBudgetId` et `activeBudgetId` = nouveau budget.
- **Audit** : `budget_version_set.created`, `budget_version.baseline_created`.

### 5.2 createRevision(budgetId, dto?)

- **Précondition** : budget source **versionné**, **non archivé**, scope client.
- **Convention de code** : nouveau **Budget.code** = **`{BudgetVersionSet.code}-V{nextVersionNumber}`** (strictement).
- **Transaction** :
  1. Calculer `nextVersionNumber` = max(versionNumber) + 1 dans le set.
  2. Créer nouveau Budget (code = `versionSet.code + '-V' + nextVersionNumber`, versionKind = REVISION, versionStatus = DRAFT, parentBudgetId = source.id, versionSetId, versionNumber, versionLabel dérivé ex. 'V2').
  3. Duplication enveloppes et lignes (même règle : **codes stables**, map oldEnvelopeId → newEnvelopeId).
- Ne pas modifier `baselineBudgetId` ni `activeBudgetId`.
- **Audit** : `budget_version.revision_created`.

### 5.3 activateVersion(budgetId)

- **Préconditions** : budget du même client et du même version set, non archivé.
- **Règle d’idempotence (obligatoire)** : si la version ciblée est **déjà ACTIVE**, l’opération est **idempotente** : retourner un **succès sans aucun changement d’état** (aucune mise à jour en base, aucun audit). Comportement retenu : pas d’écriture d’audit dans ce cas.
- Sinon : en transaction — passer la version ciblée en ACTIVE et `activatedAt = now()` ; passer l’ancienne version active du set en SUPERSEDED ; mettre à jour `BudgetVersionSet.activeBudgetId`.
- **Audit** : `budget_version.activated` (uniquement en cas de changement effectif).

### 5.4 archiveVersion(budgetId)

- **Préconditions** : version **non active** (on n’archive pas la version active).
- **Règle renforcée (obligatoire)** :
  - **Interdire l’archivage de la baseline** si elle est **la seule version du set** (refuser l’opération avec une erreur métier explicite).
  - **Plus largement** : éviter qu’un version set se retrouve **sans aucune version exploitable** — au moins une version non archivée doit rester. Refuser tout archivage qui conduirait à un set sans version exploitable.
- Pas de suppression physique.
- Mise à jour : `versionStatus = ARCHIVED`, `archivedAt = now()` (après validation des règles ci-dessus).
- **Audit** : `budget_version.archived`.

### 5.5 Duplication : enveloppes et lignes (stabilité des codes, hiérarchie)

- **Règle normative : stabilité des codes BudgetEnvelope et BudgetLine**  
  Les **codes** des **BudgetEnvelope** et des **BudgetLine** restent **stables d’une version à l’autre** ; **seuls les IDs changent**. Les codes sont recopiés à l’identique lors de la duplication. Cette règle est obligatoire pour permettre le compare (§5.7) et doit être respectée dans l’algorithme de duplication ainsi que rappelée dans les points de vigilance (§9).
- **Algorithme de duplication des BudgetEnvelope** (risque principal à maîtriser) :
  1. Charger toutes les enveloppes du budget source (avec ordre déterministe, ex. sortOrder puis id).
  2. Construire un **map `oldEnvelopeId -> newEnvelopeId`** :
     - Créer les enveloppes **sans parentId** (ou dans l’ordre hiérarchique : d’abord racines, puis enfants en utilisant déjà le map pour parentId). Pour chaque enveloppe créée, enregistrer l’association oldId → newId.
     - Si on crée d’abord toutes sans parent : après création, faire une passe de mise à jour des `parentId` via le map (oldParentId -> newParentId).
  3. **Reconstruction correcte des parentId** : chaque nouvelle enveloppe doit avoir `parentId = map(oldParentId)` lorsque l’enveloppe source avait un parent.
- **Duplication des BudgetLine** :
  - Pour chaque ligne : créer une nouvelle ligne avec **même code** (et name, description, expenseType, currency) ; **envelopeId = map(source.envelopeId)** ; cloner les montants (initialAmount, revisedAmount, forecastAmount, committedAmount, consumedAmount, remainingAmount). Ne pas cloner les allocations ni les événements financiers.
- **Transaction unique** : toute la duplication (version set + budget + enveloppes + lignes + mises à jour baseline/active) s’exécute dans **une seule transaction** Prisma pour éviter tout état incohérent.

### 5.6 getVersionHistory(budgetId)

- Charger le budget, récupérer `versionSetId` ; retourner les budgets du set (avec métadonnées version) triés par `versionNumber`.

### 5.7 compareVersions(sourceBudgetId, targetBudgetId)

- Les deux budgets doivent avoir le même `versionSetId` (sinon 400).
- **Matching par code (normatif)** : la comparaison repose sur les **codes** des **BudgetEnvelope** et **BudgetLine**, qui sont **stables d’une version à l’autre** (seuls les IDs changent — voir §5.5). Le compare s’appuie sur cette règle : alignement des objets entre les deux versions par code.
- Retourner un diff : objets ajoutés, supprimés, modifiés ; pour les lignes/enveloppes modifiées, écarts de montants (structure type RFC §9.3 : source, target, delta).

---

## 6. Lecture seule pour SUPERSEDED / ARCHIVED

- **BudgetsService.update** : si `existing.isVersioned && ['SUPERSEDED','ARCHIVED'].includes(existing.versionStatus)` → `BadRequestException('Cannot update a superseded or archived version')`.
- **BudgetEnvelopesService** (create + update) : après vérification LOCKED/ARCHIVED du budget, ajouter la même condition sur versionné + versionStatus SUPERSEDED/ARCHIVED.
- **BudgetLinesService** (create + update) : idem (budget ou enveloppe avec budget) → refus si budget versionné et versionStatus SUPERSEDED ou ARCHIVED.

---

## 7. Réponses API et documentation

- **GET budget-version-sets** : champs au moins id, clientId, exerciseId, code, name, description, baselineBudgetId, activeBudgetId, createdAt.
- **GET budget-version-sets/:id** : détail + liste des versions (id, versionNumber, versionLabel, versionKind, versionStatus, parentBudgetId, activatedAt, archivedAt) triée par versionNumber.
- **POST create-baseline / create-revision** : réponse type RFC (versionSetId, budgetId, versionNumber, versionLabel, versionKind, versionStatus, parentBudgetId si révision).
- **GET version-history** : tableau des versions (même forme que les éléments du détail du set).
- **GET compare** : sourceBudgetId, targetBudgetId, diff (ex. lines avec code, source, target, delta).
- **docs/API.md** : section « Budget Versioning (RFC-019) » avec endpoints, paramètres, body, réponses, permissions.

---

## 8. Ordre d’implémentation recommandé

1. Prisma : enums, BudgetVersionSet avec **relations nommées** (versions, baselineBudget, activeBudget), extension Budget avec relation versionSet et self-relation BudgetVersionParent, Client/BudgetExercise, migration.
2. BudgetVersioningService : createBaseline (avec convention de code stricte et baseline = première version active), createRevision, activateVersion (idempotence), archiveVersion (règle baseline unique), list/get version sets, version-history, compare (matching par code).
3. DTOs et types.
4. BudgetVersionSetsController (GET list, GET :id).
5. BudgetVersioningController sous `budgets` (POST create-baseline, create-revision, activate-version, archive-version ; GET version-history, compare).
6. BudgetVersioningModule + enregistrement dans AppModule.
7. Garde-fous lecture seule dans BudgetsService, BudgetEnvelopesService, BudgetLinesService.
8. Tests unitaires et d’intégration.
9. Mise à jour de docs/API.md.

---

## 9. Points de vigilance

- **Relations Prisma nommées explicitement** : entre BudgetVersionSet et Budget, utiliser obligatoirement les noms **versions**, **baselineBudget**, **activeBudget** (côté set) et **versionSet** (côté Budget), avec des noms de relation Prisma explicites (ex. "VersionSetVersions", "VersionSetBaseline", "VersionSetActive") pour éviter toute ambiguïté. Conserver la self-relation **BudgetVersionParent** (parentBudget / childVersions).
- **Règle stricte de code** : `BudgetVersionSet.code` = code métier stable **sans suffixe de version** ; `Budget.code` = **`{versionSet.code}-V{versionNumber}`**. Exemple : versionSet `BUD-2026-IT` → budgets `BUD-2026-IT-V1`, `BUD-2026-IT-V2`. À appliquer systématiquement en createBaseline et createRevision.
- **Stabilité obligatoire des codes BudgetEnvelope et BudgetLine** (normatif) : en **duplication** (§5.5), conserver à l’identique les **codes** des enveloppes et des lignes — **seuls les IDs changent**. En **compare** (§5.7), le matching repose sur ces codes. Ne jamais générer de nouveaux codes lors du clonage. Cette règle doit être explicitée dans la duplication, le compare et respectée dans les tests.
- **Duplication hiérarchique** : risque principal = reconstruction correcte des **parentId** des BudgetEnvelope. Utiliser systématiquement un **map oldEnvelopeId -> newEnvelopeId** ; créer les enveloppes puis mettre à jour les parentId via ce map (ou créer en ordre hiérarchique) ; rattacher chaque BudgetLine à la nouvelle enveloppe via le map. **Transaction unique** pour toute la duplication.
- **Baseline = première version active** : à la création de la baseline, `baselineBudgetId` et `activeBudgetId` pointent tous deux vers le budget V1 créé.
- **Activation idempotente** : si la version ciblée est déjà ACTIVE, retourner un succès **sans aucun changement d’état** (pas d’audit).
- **Archivage** : interdire l’archivage de la baseline si elle est la seule version du set ; plus largement, éviter qu’un version set se retrouve sans aucune version exploitable.
- **Ordre des contrôleurs** : enregistrer le controller des actions de versioning de façon à ce que les routes avec segments fixes soient matchées avant le `@Get(':id')` du BudgetsController.

---

## 10. Ce qui ne change pas (intention RFC)

- Duplication de la structure Budget / BudgetEnvelope / BudgetLine ; pas de clonage des allocations ni des événements financiers.
- Séparation budget-management et financial-core inchangée.
- Routes et structure du module conservées (budget-version-sets + actions sous budgets).
- Réallocation déjà limitée au même budget (même version) ; pas de modification.

---

*Ce plan, après durcissement sur les relations Prisma nommées, la règle stricte de code, l’activation idempotente, l’interdiction d’archiver la baseline unique et la stabilité normative des codes enveloppes/lignes, est considéré comme **final** pour l’implémentation RFC-019.*
