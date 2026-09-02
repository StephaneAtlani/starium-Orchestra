# RFC-BUD-043 — Import budgétaire CSV/Excel — centre de gestion

## Statut

📝 **Draft** — clarifie et étend **RFC-018** (moteur livré) ; cible l’écran **Configuration → Imports** et le parcours administrateur DSI/DAF.

## Priorité

🔥 **Haute** — adoption Excel → Orchestra ; le wizard `/budgets/[budgetId]/import` existe mais le hub `/budgets/imports` est un placeholder et les jobs ne sont pas exploitables en UI.

## Dépendances

* [RFC-018 — Budget Data Import](./RFC-018%20%E2%80%94%20Budget%20Data%20Import.md) — moteur analyze / preview / execute / mappings (✅ backend)
* [RFC-BUD-041](./RFC-BUD-041%20%E2%80%94%20Ajouts%20structurels%20en%20cours%20d'exercice%20et%20gouvernance%20pr%C3%A9visionnel-atterrissage.md) — intentions import (structure vs réel), articulation PA
* [RFC-032 — Historisation décisions budgétaires](./RFC-032%20%E2%80%94%20Historisation%20d%C3%A9cisions%20budg%C3%A9taires.md)
* [RFC-FE-BUD-032 — Fiche budget cockpit](./RFC-FE-BUD-032%20%E2%80%94%20Fiche%20budget%20cockpit%20(refonte%20pr%C3%A9sentation%20%26%20fonctionnalit%C3%A9s).md)
* [RFC-BUD-044 — Automatisation des imports budgétaires](./RFC-BUD-044%20%E2%80%94%20Automatisation%20des%20imports%20budg%C3%A9taires.md) — planification et dépôts automatiques (hors périmètre de cette RFC)

## Remplace / clarifie

* **RFC-018** reste la référence technique du **moteur d’import** (API, anti-doublon, transaction).
* **Cette RFC** fixe le **modèle produit CSV/Excel**, le **centre de gestion** sous Configuration, les **profils d’import**, l’**historique des exécutions** et les **écarts assumés** par rapport à la spec initiale RFC-018.
* Le hub `/budgets/imports` remplace la page d’orientation actuelle.

---

# 1. Analyse de l'existant

## 1.1 Moteur RFC-018 (livré)

| Composant | État | Détail |
|-----------|------|--------|
| API `POST analyze` / `preview` / `execute` | ✅ | Module `apps/api/src/modules/budget-import/` |
| CRUD `BudgetImportMapping` | ✅ | `/api/budget-import-mappings` |
| Persistance `BudgetImportJob` + `BudgetImportRowLink` | ✅ | Jobs en base, **sans API de lecture liste** |
| Wizard UI 4 étapes | ✅ | `/budgets/[budgetId]/import` |
| Mappings sauvegardés dans le wizard | ✅ | CRUD depuis l’étape Configuration |
| Hub Configuration → Imports | 🔸 | `/budgets/imports` = texte + lien liste budgets |
| Historique imports dans fiche budget | ❌ | Onglet Historique = décisions RFC-032 uniquement |
| Export template réimportable | ❌ | Hors MVP RFC-018 |
| Intention métier (structure / réel) | ❌ | Écart RFC-BUD-041 §3.7 |

## 1.2 Formats et limites (inchangées, rappel explicite)

| Format | Support | Contraintes |
|--------|---------|-------------|
| **CSV** | ✅ | UTF-8, séparateurs `,` ou `;`, 1ère ligne = en-têtes |
| **XLSX** | ✅ | Une feuille par exécution ; changement d’onglet via `analyze-sheet` |
| Taille | Réglage plateforme | Défaut 10 Mo (`PlatformUploadSettings`) |
| Volume | 20 000 lignes max | Rejet au-delà |

**Parser** : `exceljs` (API). Pas de `.xls` legacy.

## 1.3 Données réellement importées aujourd’hui

Cible unique : **`BudgetLine`** du budget actif.

| Champ logique (mapping) | Create | Update (UPSERT) |
|-----------------------|--------|-----------------|
| `name` / `label` | ✅ | ❌ (non MAJ) |
| `amount` / `initialAmount` | ✅ → `initialAmount` | ✅ |
| `committedAmount` | ✅ | ✅ |
| `consumedAmount` | ✅ | ✅ |
| `currency` | ✅ | ✅ |
| `envelopeCode` / `envelope` / `envelopeId` | ✅ résolution | — (enveloppe figée sur la ligne existante) |
| `externalId` | ✅ clé anti-doublon | matching |

**Non importé** (hors scope moteur actuel, documenté ici pour éviter les malentendus) :

* Planning 12 mois
* Commandes / factures procurement (entités séparées)
* `FinancialEvent` / allocations
* Création d’enveloppes depuis le fichier (création inline UI pour une enveloppe par défaut seulement)

Les blocs wizard **Commandes** / **Factures** mappent des **montants agrégés sur la ligne**, pas des PO/factures.

## 1.4 Problème produit

1. **Configuration → Imports** ne permet pas de **gérer** : profils nommés, historique, relance, diagnostic.
2. Les **mappings** ne sont créés qu’en passant par un budget — pas de vue transverse client.
3. **Aucune visibilité** sur les jobs passés (`BudgetImportJob` orphelin côté UI).
4. Le **CSV** n’est pas documenté produit (encodage, séparateur, modèle) — source de tickets support.
5. Pas de **modèle téléchargeable** pour préparer un fichier conforme.

---

# 2. Objectif

Mettre en place un **centre de gestion des imports budgétaires** accessible depuis **Configuration → Imports** (`/budgets/imports`), permettant à un administrateur budget client de :

1. **Voir et gérer les profils d’import** (mappings sauvegardés) — CRUD, duplication, association budget/exercice par défaut.
2. **Consulter l’historique des exécutions** par client (jobs) avec statut, volumes, fichier source, auteur, budget cible.
3. **Lancer un import manuel** vers un budget (redirection wizard pré-rempli depuis un profil).
4. **Télécharger un modèle CSV** et la documentation inline des colonnes attendues.
5. **Comprendre clairement** ce qu’un import CSV fait et ne fait pas (réel vs structure, lien PA — RFC-BUD-041).

Le wizard par budget (`/budgets/[budgetId]/import`) **reste** le lieu d’exécution détaillée ; le centre de gestion en est le **cockpit administratif**.

---

# 3. Hypothèses

| # | Hypothèse | Impact si fausse |
|---|-----------|------------------|
| H1 | Un profil d’import est **scoped client** (comme aujourd’hui) | Profils plateforme multi-clients |
| H2 | L’import manuel reste **synchrone HTTP** (MVP) ; gros volumes → RFC-BUD-044 (async) | Refonte execute en job BullMQ immédiate |
| H3 | **CSV prioritaire** pour les intégrateurs ERP/compta ; XLSX pour usage Excel maison | Spéc CSV allégée |
| H4 | L’historique jobs suffit pour le support ; pas de stockage du fichier source après execute | Archivage S3 des fichiers importés |
| H5 | Permission `budgets.update` pour gérer profils et lancer imports ; `budgets.read` pour consulter historique | Granularité `budget_import.*` dédiée |

---

# 4. Modèle produit — import CSV clarifié

## 4.1 Typologie de fichiers (profils métier)

Chaque **profil d’import** (`BudgetImportMapping` enrichi) porte un **`importPurpose`** :

| Valeur | Libellé UI | Usage | Mode recommandé | Effet principal |
|--------|------------|-------|-----------------|-----------------|
| `STRUCTURE` | Structure budgétaire | Premier chargement, nouvelles lignes | `CREATE_ONLY` ou `UPSERT` | CREATE/UPDATE lignes, montants initiaux |
| `REALITY` | Réel comptable / ERP | Réimport mensuel consommé/engagé | `UPDATE_ONLY` ou `UPSERT` | MAJ `committedAmount` / `consumedAmount` |
| `MIXED` | Mixte | Fichiers ERP avec structure + réel | `UPSERT` | Les deux |

Ce choix **n’altère pas** le moteur : il préconfigure `importMode`, les champs obligatoires du mapping et les **messages d’avertissement** (ex. import structure sur budget `VALIDATED` → alerte mid-year RFC-BUD-041).

## 4.2 Modèle CSV canonique (téléchargeable)

Fichier **`orchestra-import-lignes-modele.csv`** (UTF-8, séparateur `;` par défaut FR) :

```csv
external_id;libelle;code_enveloppe;montant_initial;montant_engage;montant_consomme;devise
ERP-001;Licences Microsoft;RUN-001;120000;45000;38000;EUR
ERP-002;Infogérance;RUN-002;80000;0;12000;EUR
```

| Colonne modèle | Champ logique | Obligatoire | Notes |
|----------------|---------------|-------------|-------|
| `external_id` | `externalId` | Recommandé (réimport) | Clé stable ERP |
| `libelle` | `name` | Oui (create) | Jamais afficher l’ID seul en UI |
| `code_enveloppe` | `envelopeCode` | Oui* | *Ou enveloppe par défaut du profil |
| `montant_initial` | `initialAmount` | Selon purpose | Structure |
| `montant_engage` | `committedAmount` | Optionnel | Réel |
| `montant_consomme` | `consumedAmount` | Optionnel | Réel |
| `devise` | `currency` | Optionnel | Défaut EUR |

Le modèle est **indicatif** : le mapping reste configurable colonne → champ logique (RFC-018).

## 4.3 Règles CSV (documentation inline UI)

* Encodage **UTF-8** (BOM UTF-8 accepté).
* Séparateur **`,` ou `;`** — détection automatique sur la 1ère ligne.
* Ligne d’en-tête obligatoire (index configurable, défaut 1).
* Montants : décimale `.` ou `,` selon option profil (`decimalSeparator`).
* Dates (si clé composite) : formats `DD/MM/YYYY` ou `YYYY-MM-DD`.
* Lignes vides ignorées si `ignoreEmptyRows: true`.
* Doublons `external_id` dans le même fichier → `DUPLICATE_SOURCE_KEY`.

## 4.4 Anti-doublon (rappel opérationnel)

1. **`externalId`** si colonne mappée (prioritaire).
2. **Clé composite** configurable (`date + amount + …`).
3. **`BudgetImportRowLink`** persiste le lien source → ligne pour les réimports.

---

# 5. Centre de gestion — écran `/budgets/imports`

## 5.1 Structure page (3 zones)

Route : **`/budgets/imports`** (remplace le placeholder).

```
┌─────────────────────────────────────────────────────────────┐
│ PageHeader — Imports budget                                 │
│ Description + lien doc CSV                                  │
├─────────────────────────────────────────────────────────────┤
│ KPI strip (optionnel lot 2) : jobs 30j, taux succès, dernier  │
├─────────────────────────────────────────────────────────────┤
│ [ Onglet Profils ] [ Onglet Historique ] [ Onglet Aide CSV ]  │
└─────────────────────────────────────────────────────────────┘
```

### Onglet **Profils**

Tableau des `BudgetImportMapping` :

| Colonne | Contenu |
|---------|---------|
| Nom | `name` + `description` tronquée |
| Type fichier | CSV / XLSX |
| Finalité | Structure / Réel / Mixte (`importPurpose`) |
| Budget par défaut | Nom budget (si `defaultBudgetId` renseigné) |
| Dernière utilisation | Date dernier job lié |
| Actions | Modifier · Dupliquer · Supprimer · **Lancer import** |

Actions :

* **Nouveau profil** → `StariumModal` (nom, type source, finalité, budget/exercice par défaut) puis redirection wizard ou éditeur mapping inline (lot 2).
* **Dupliquer** → copie mapping + options, suffixe « (copie) ».
* **Lancer import** → `/budgets/[budgetId]/import?profileId=…` (wizard pré-charge mapping).

Filtres : type source, finalité, recherche texte nom.

### Onglet **Historique**

Liste paginée des `BudgetImportJob` :

| Colonne | Contenu |
|---------|---------|
| Date | `createdAt` |
| Budget | Nom + code exercice |
| Fichier | `fileName` |
| Profil | Nom mapping (si `mappingId`) |
| Statut | COMPLETED / FAILED / RUNNING |
| Résultat | `createdRows` / `updatedRows` / `skippedRows` / `errorRows` |
| Auteur | Nom utilisateur (`createdBy`) |
| Actions | Détail · Relancer (lot 2) |

**Détail job** : drawer ou page `/budgets/imports/jobs/[jobId]` — stats, `summary.errorsByType`, lien budget, horodatage. Pas de rejeu du fichier (non conservé post-execute).

### Onglet **Aide CSV**

* Règles §4.3 en prose + encadré erreurs fréquentes.
* Bouton **Télécharger le modèle CSV**.
* Encadré « Ce que l’import ne fait pas » (planning, PO/factures, PA).
* Lien vers [RFC-BUD-044](./RFC-BUD-044%20%E2%80%94%20Automatisation%20des%20imports%20budg%C3%A9taires.md) pour planification.

## 5.2 Entrées navigation

| Entrée | Comportement |
|--------|--------------|
| Configuration → Imports | Centre de gestion (cette RFC) |
| Fiche budget → Historique → Importer | Wizard (`/budgets/[budgetId]/import`) |
| Fiche budget → action Import | Idem |

Carte Configuration : libellé mis à jour → « **Gérer les imports** (profils, historique, modèle CSV) ».

## 5.3 Wizard — ajustements mineurs

* Query `?profileId=` : pré-sélection mapping + options + budget si cohérent.
* Query `?purpose=REALITY` : pré-sélection mode `UPDATE_ONLY` + blocs commandes/factures activés.
* Lien « Gérer les profils » → `/budgets/imports?tab=profiles`.
* Post-execute : lien « Voir dans l’historique » → détail job.

---

# 6. API — extensions backend

## 6.1 Nouveaux endpoints

| Méthode | Route | Permission | Description |
|---------|-------|------------|-------------|
| `GET` | `/api/budget-import-jobs` | `budgets.read` | Liste jobs client (filtres `budgetId`, `status`, `from`, `to`, pagination) |
| `GET` | `/api/budget-import-jobs/:id` | `budgets.read` | Détail job + mapping résumé + auteur |
| `GET` | `/api/budget-imports/template.csv` | `budgets.read` | Modèle CSV statique (ou généré) |
| `POST` | `/api/budget-import-mappings/:id/duplicate` | `budgets.update` | Duplication profil |

## 6.2 Enrichissement `BudgetImportMapping` (Prisma)

Champs optionnels ajoutés :

```prisma
model BudgetImportMapping {
  // … existant …
  importPurpose     BudgetImportPurpose @default(MIXED)
  defaultBudgetId   String?
  defaultBudget     Budget? @relation(fields: [defaultBudgetId], references: [id], onDelete: SetNull)
  lastUsedAt        DateTime?  // MAJ à chaque execute réussi
}

enum BudgetImportPurpose {
  STRUCTURE
  REALITY
  MIXED
}
```

Index : `@@index([clientId, importPurpose])`, `@@index([clientId, defaultBudgetId])`.

Validation create/update : `defaultBudgetId` doit appartenir au `clientId` actif.

## 6.3 Réponse liste jobs (exemple)

```json
{
  "items": [
    {
      "id": "clx…",
      "budgetId": "…",
      "budgetLabel": "Budget RUN 2026",
      "fileName": "export_compta_janvier.csv",
      "sourceType": "CSV",
      "status": "COMPLETED",
      "importMode": "UPDATE_ONLY",
      "mappingName": "Compta mensuelle Sage",
      "totalRows": 450,
      "createdRows": 0,
      "updatedRows": 442,
      "skippedRows": 5,
      "errorRows": 3,
      "createdByLabel": "Marie Dupont",
      "createdAt": "2026-09-02T08:15:00.000Z"
    }
  ],
  "total": 12
}
```

**Jamais** exposer `fileToken`, chemins disque, ou identifiants techniques seuls comme libellé principal.

## 6.4 Intégration historique budget (RFC-032)

`GET /api/budgets/:budgetId/decision-history` : enrichir avec entrées synthétiques **`budget_import.executed`** / **`budget_import.failed`** (déjà en audit) — filtre `category=import` côté UI onglet Historique fiche budget (lot 2, optionnel lot 1).

---

# 7. Liste des fichiers à créer / modifier

## Backend

| Fichier | Action |
|---------|--------|
| `apps/api/prisma/schema.prisma` | Enums + champs mapping |
| `apps/api/prisma/migrations/…_rfc_bud_043_import_hub/` | Migration |
| `apps/api/src/modules/budget-import/budget-import-jobs.controller.ts` | **Créer** |
| `apps/api/src/modules/budget-import/budget-import-jobs.service.ts` | **Créer** |
| `apps/api/src/modules/budget-import/dto/list-import-jobs.query.dto.ts` | **Créer** |
| `apps/api/src/modules/budget-import/budget-import-mappings.service.ts` | duplicate + lastUsedAt |
| `apps/api/src/modules/budget-import/budget-import.service.ts` | MAJ lastUsedAt post-execute |
| `apps/api/src/modules/budget-import/budget-import.module.ts` | Enregistrer controller |
| `apps/api/src/modules/budget-import/dto/create-mapping.dto.ts` | `importPurpose`, `defaultBudgetId` |
| `docs/API.md` §19 | Documenter nouvelles routes |

## Frontend

| Fichier | Action |
|---------|--------|
| `apps/web/src/app/(protected)/budgets/imports/page.tsx` | Refonte hub 3 onglets |
| `apps/web/src/app/(protected)/budgets/imports/jobs/[jobId]/page.tsx` | **Créer** — détail job |
| `apps/web/src/features/budgets/import-hub/` | **Créer** — composants hub |
| `apps/web/src/features/budgets/api/budget-imports.api.ts` | listJobs, getJob, duplicateMapping, downloadTemplate |
| `apps/web/src/features/budgets/budget-import/budget-import-wizard.tsx` | profileId query, lien historique |
| `apps/web/src/app/(protected)/budgets/configuration/page.tsx` | Libellé carte Imports |
| `apps/web/src/features/budgets/lib/budget-query-keys.ts` | Clés jobs list |

---

# 8. Implémentation — lots

| Lot | Contenu | DoD |
|-----|---------|-----|
| **L1** | API list/detail jobs + UI onglet Historique + modèle CSV | Jobs visibles, template téléchargeable |
| **L2** | Enrichissement mapping (purpose, defaultBudget) + onglet Profils CRUD/duplicate + wizard `profileId` | Gestion profils depuis Configuration |
| **L3** | Onglet Aide CSV + KPI strip + entrées historique fiche budget | Parcours support complet |
| **L4** (option) | Export lignes budget → CSV compatible profil | Symétrie import/export |

---

# 9. Tests

## Backend

* `budget-import-jobs.service.spec.ts` : isolation client, filtres, pagination.
* `budget-import-jobs.integration.spec.ts` : liste après execute, 403 cross-client.
* Mappings : duplicate, validation `defaultBudgetId` hors scope.
* Execute : `lastUsedAt` mis à jour.

## Frontend

* Vitest : rendu hub empty/loading/error ; libellés métier (pas d’ID brut).
* Wizard : chargement `?profileId=`.
* `pnpm audit:ui-ids` vert.

---

# 10. Récapitulatif

| Sujet | Avant | Après RFC-BUD-043 |
|-------|-------|-------------------|
| Configuration → Imports | Placeholder | Centre profils + historique + aide CSV |
| Profils | CRUD wizard only | Vue transverse + duplicate + finalité |
| Jobs | DB only | API + UI historique |
| CSV | Implicite RFC-018 | Modèle, règles, doc inline |
| Wizard | Isolé | Lié au hub (`profileId`, historique post-import) |

**Hors périmètre** (RFC-BUD-044) : planification, dépôt SFTP, exécution async BullMQ, notifications auto.

---

# 11. Points de vigilance

* **Performance** : liste jobs avec jointures budget/user — index + pagination stricte.
* **Fichiers non conservés** : l’historique ne permet pas de « rejouer » ; documenter clairement.
* **Budget LOCKED/ARCHIVED** : execute reste interdit ; profil peut exister mais lancement bloqué avec message métier.
* **Mid-year** (RFC-BUD-041) : imports `STRUCTURE` sur budget validé → warning UI, pas de blocage technique MVP sauf évolution gardes.
* **Ne pas confondre** montants ligne importés et **PA** : l’import alimente le live ; l’activation PA reste un rituel séparé.

---

# 12. Conformité by design

## RGPD

* **DCP** : nom fichier (peut contenir des infos métier), identité auteur import (`createdById` → nom affiché), pas de contenu ligne en audit détaillé.
* **Finalité** : alimentation budgétaire opérationnelle ; pas de réutilisation marketing.
* **Minimisation** : pas de stockage du fichier après execute ; job = métadonnées + compteurs.
* **Rétention** : jobs conservés 24 mois (configurable client phase 2) puis purge anonymisée.
* **Logs** : pas de lignes CSV en clair dans les logs applicatifs.
* **Scope client** : toutes les requêtes filtrent `clientId` actif.

## RGAA

* Onglets hub : pattern `.starium-tab-group` ou équivalent clavier.
* Tableaux : `<table>` sémantique, cartes mobile `< md` (RFC-FE-MOB-002).
* Statuts job : texte + badge (pas couleur seule).
* `aria-live="polite"` sur refresh historique post-import.
* Labels explicites sur filtres et actions.

## Design System

* `PageHeader`, `PageContainer`, `FilterBar`, `Table` / cartes, `EmptyState`, `LoadingState`, `ErrorState`.
* `StariumModal` pour création/édition profil.
* Tokens uniquement ; libellés FR métier (`budgetLabel`, `mappingName`, pas de CUID visible).
* Bouton modèle CSV : `variant="outline"`.

## Sécurité

* Guards standards + `budgets.read` / `budgets.update`.
* `defaultBudgetId` validé contre scope client.
* Pas d’exposition cross-client sur jobs/mappings.
* Audit : `budget_import_mapping.duplicated`, accès liste jobs (optionnel `budget_import.jobs.listed` en debug).

## Interface mobile

* Hub responsive dès 320px ; actions profil en menu overflow sur mobile.
* Cibles ≥ 44px sur CTAs « Lancer import », « Télécharger modèle ».
* Drawer détail job plein écran mobile.

---

# 13. Références

* [RFC-018 — Budget Data Import](./RFC-018%20%E2%80%94%20Budget%20Data%20Import.md)
* [RFC-018 — Conformité implémentation](./RFC-018%20%E2%80%94%20Conformité%20impl%C3%A9mentation.md)
* [RFC-BUD-044 — Automatisation](./RFC-BUD-044%20%E2%80%94%20Automatisation%20des%20imports%20budg%C3%A9taires.md)
* [docs/API.md](../API.md) §19
* Code : `apps/api/src/modules/budget-import/`, `apps/web/src/features/budgets/budget-import/`
