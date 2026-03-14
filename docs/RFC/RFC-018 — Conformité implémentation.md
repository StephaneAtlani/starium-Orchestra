# RFC-018 — Conformité de l’implémentation

Vérification effectuée par rapport au **plan** (`.cursor/plans/rfc-018_budget_data_import_0b0166d8.plan.md`) et à la **RFC-018 — Budget Data Import**.

---

## 1. Schéma Prisma

| Point | Statut |
|-------|--------|
| Enums : `BudgetImportSourceType` (CSV, XLSX), `BudgetImportEntityType` = **BUDGET_LINES**, `BudgetImportTargetEntityType` = **BUDGET_LINE**, `BudgetImportJobStatus`, `BudgetImportMode` | Conforme |
| Modèles `BudgetImportMapping`, `BudgetImportJob`, `BudgetImportRowLink` avec champs et index | Conforme |
| Structure minimale de `summary` : `warningsCount`, `errorsByType` | Conforme (`BudgetImportJobSummary`) |
| Relations Client / User / Budget | Conforme |

**Note** : La RFC §10.4 indique `BudgetImportEntityType = BUDGET_DATA` ; le plan et l’implémentation utilisent **BUDGET_LINES** comme convenu dans les ajustements.

---

## 2. FileToken / BudgetImportFileStoreService

| Point | Statut |
|-------|--------|
| Métadonnées : fileToken, clientId, uploadedByUserId, fileName, sourceType, createdAt, expiresAt | Conforme (`BudgetImportFileStoreMeta`) |
| Méthodes save(), get(), delete() | Conforme |
| Vérifications dans get() : client actif, non expiré, `uploadedByUserId === userId` → sinon 403 | Conforme |
| Stockage : dossier temporaire (temp/imports) | Conforme |

---

## 3. Préparation hors transaction / transaction réservée aux écritures

| Point | Statut |
|-------|--------|
| Préparation (parsing, mapping, normalisation, résolution enveloppes, matching, calcul des actions) **avant** toute écriture DB | Conforme |
| Transaction Prisma : création Job RUNNING, créations/mises à jour BudgetLine + RowLink, mise à jour job (compteurs, summary) | Conforme |
| Nettoyage fileToken après execute | Conforme |

---

## 4. Préchargement

| Point | Statut |
|-------|--------|
| Enveloppes du budget chargées une fois (maps par id / code) | Conforme (`loadEnvelopeMaps`) |
| RowLinks utiles chargés une fois (maps par externalId / compositeHash) | Conforme (`loadRowLinkMaps`, `buildRowLinkMaps`) |
| Aucune requête Prisma par ligne dans la boucle | Conforme |

---

## 5. Anti-doublon et RowLink

| Point | Statut |
|-------|--------|
| Un seul RowLink par clé logique (externalId ou compositeHash) | Conforme : `findRowLinkByKeyInTx` avant création |
| Clés : (clientId, budgetId, targetEntityType, externalId) et (clientId, budgetId, targetEntityType, compositeHash) | Conforme (requêtes findFirst dans la transaction) |

---

## 6. Doublons internes au fichier

| Point | Statut |
|-------|--------|
| Détection des lignes avec même externalId ou même compositeHash dans le même fichier | Conforme (`seenExternalId`, `seenCompositeHash` dans `resolveActions`) |
| Motif **DUPLICATE_SOURCE_KEY** pour les lignes concernées | Conforme (action ERROR, reason DUPLICATE_SOURCE_KEY) |

---

## 7. UPDATE_ONLY sans correspondance

| Point | Statut |
|-------|--------|
| Si aucune correspondance trouvée → **SKIP** avec raison **NO_MATCH_UPDATE_ONLY** | Conforme |

---

## 8. Options d’import

| Point | Statut |
|-------|--------|
| defaultEnvelopeId, defaultCurrency, importMode, ignoreEmptyRows, trimValues, dateFormat?, decimalSeparator? | Conforme (`BudgetImportOptionsConfig`, DTOs Preview/Execute) |

---

## 9. Statuts et reasons de preview

| Point | Statut |
|-------|--------|
| Statuts : CREATE, UPDATE, SKIP, ERROR | Conforme (`BudgetImportPreviewStatus`) |
| Reasons : MATCHED_BY_EXTERNAL_ID, MATCHED_BY_COMPOSITE_KEY, NO_MATCH_CREATE, NO_MATCH_UPDATE_ONLY, MISSING_ENVELOPE, INVALID_AMOUNT, INVALID_DATE, MISSING_REQUIRED_FIELD, DUPLICATE_SOURCE_KEY, AMBIGUOUS_MATCH | Conforme (`PREVIEW_REASONS`) |
| CREATE_ONLY / UPDATE : reason selon match (externalId vs composite) | Conforme (correction appliquée : `matchReason`) |

---

## 10. API (RFC §13)

| Endpoint | Body / Réponse | Statut |
|----------|----------------|--------|
| POST /api/budget-imports/analyze | multipart file → fileToken, sourceType, sheetNames?, columns, sampleRows, rowCount | Conforme |
| POST /api/budget-imports/preview | budgetId, fileToken, mapping, options → stats, previewRows, warnings, errors | Conforme |
| POST /api/budget-imports/execute | budgetId, fileToken, mappingId?, mapping, options → jobId, status, totalRows, createdRows, updatedRows, skippedRows, errorRows | Conforme |
| GET/POST /api/budget-import-mappings, GET/PATCH/DELETE :id | CRUD scopé clientId | Conforme |

---

## 11. Sécurité (RFC §14)

| Point | Statut |
|-------|--------|
| JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard sur toutes les routes | Conforme |
| budgets.read pour analyze + preview ; budgets.update pour execute + CRUD mappings | Conforme |

---

## 12. Audit logs (RFC §15)

| Action | Statut |
|--------|--------|
| budget_import.analyzed, budget_import.previewed, budget_import.executed, budget_import.failed | Conforme |
| budget_import_mapping.created, budget_import_mapping.updated, budget_import_mapping.deleted | Conforme |

---

## 13. Contraintes MVP

| Point | Statut |
|-------|--------|
| Taille max 10 MB, 20 000 lignes, CSV UTF-8, séparateurs `,` et `;`, une feuille Excel | Conforme (`constants.ts`, parser) |

---

## 14. Écarts mineurs / non bloquants

- **analyze-file.dto.ts** : non créé ; l’analyse utilise directement le fichier multipart (pas de DTO body requis).
- **AMBIGUOUS_MATCH** : raison définie et utilisable ; l’implémentation ne la pose pas encore (les maps ne donnent qu’un lien par clé). À ajouter si on détecte plusieurs correspondances en base pour une même clé.

---

## 15. Correction appliquée lors de la vérification

- **CREATE_ONLY / UPDATE** : la raison utilisée pour SKIP (CREATE_ONLY) et UPDATE est maintenant **MATCHED_BY_EXTERNAL_ID** ou **MATCHED_BY_COMPOSITE_KEY** selon la clé ayant servi au match (et non toujours MATCHED_BY_EXTERNAL_ID).

---

**Conclusion** : L’implémentation est **conforme** au plan et à la RFC-018 pour les points vérifiés ci-dessus.
