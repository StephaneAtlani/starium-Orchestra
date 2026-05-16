# RFC-ORG-003 — Propriété organisationnelle des ressources (Direction propriétaire)

## Statut

**Implémentée (V1)** — socle métier et API livrés. Dépend de [RFC-ORG-001](./RFC-ORG-001%20%E2%80%94%20Socle%20Organisation%20Client.md) (`OrgUnit`, hiérarchie).

- **V1** : uniquement **`ownerOrgUnitId`** nullable par entité (option **A — colonnes**), FK `OrgUnit` avec `onDelete: Restrict`, index `@@index([clientId, ownerOrgUnitId])`, réponses **`ownerOrgUnitSummary`** (liste + détail), audits **`*.ownership.changed`** si la valeur **stockée** change, garde-fou **archivage `OrgUnit`** (comptage ressources actives par type).
- **Gouvernance V2 (complément V1)** : steward, transfert massif, obligation ownership → [RFC-ORG-004](./RFC-ORG-004%20%E2%80%94%20Steward%20transfert%20et%20obligation%20ownership.md) (**✅ V1 livrée** — steward API/UI complet sur **Projet** uniquement ; autres entités : colonnes + obligation + transfert) ; backfill données owner → [RFC-ACL-022](./RFC-ACL-022%20%E2%80%94%20Migration%20backfill%20et%20feature%20flags.md).
- **SCOPE / filtrage effectif utilisateur** : [RFC-ACL-016](./RFC-ACL-016%20%E2%80%94%20R%C3%A9solution%20du%20scope%20organisationnel.md) — la RFC-ORG-003 fournit les **données** et la **résolution ownership effectif** (ex. ligne budgétaire) ; pas le moteur d’accès complet.

## Alignement plan

Référence : [_Plan de déploement Orgnisation et licences](./_Plan%20de%20d%C3%A9ploement%20Orgnisation%20et%20licences.md).

| Élément | Valeur |
| --- | --- |
| **Priorité** | **P0** |
| **Ordre recommandé** | **2** |
| **Dépendances** | RFC-ORG-001 |
| **Livrable V1 retenu** | Colonnes **`ownerOrgUnitId`** sur les modèles listés ci-dessous (pas de table polymorphe `ResourceOrgOwnership` en V1). |

---

## 1. Périmètre données (Prisma V1)

**Colonnes `ownerOrgUnitId String?`** + relation `ownerOrgUnit` → `OrgUnit` (`onDelete: Restrict`) + relations inverses nommées sur `OrgUnit` :

| Modèle | Remarque |
| --- | --- |
| `Project` | — |
| `Budget` | — |
| `BudgetLine` | Override optionnel : si `null` sur la ligne, l’ownership **effectif** suit le **budget** parent. |
| `Supplier` | — |
| `SupplierContract` | — |
| `StrategicObjective` | **Complémentaire** à `directionId` (lien `StrategicDirection`, sémantique stratégique) : ne pas confondre direction stratégique et unité organisationnelle propriétaire. |

**Hors V1** : `ProjectDocument` — pas de colonne ; un document métier hérite de la propriété via **`Project.ownerOrgUnitId`** (jointure / exposition côté service si besoin).

**Code** : `apps/api/prisma/schema.prisma` ; helpers `apps/api/src/modules/organization/org-unit-ownership.helpers.ts` (`assertOrgUnitInClient`, `resolveEffectiveOwnerOrgUnitId`, `resolveOwnerOrgUnitSource`, `toOwnerOrgUnitSummary`, `listOrgUnitOwnershipArchiveBlockers`, `orgUnitAuditRef`) ; constantes d’audit `apps/api/src/modules/organization/resource-ownership-audit.constants.ts`.

---

## 2. Règles métier (V1)

### Validation à l’écriture

- **`ownerOrgUnitId` non vide** (assignation ou changement vers un id concret) → **`assertOrgUnitInClient`** : unité existe, `clientId` aligné, statut **`ACTIVE`** (refus si **`ARCHIVED`**).
- **`null`** ou clear explicite → accepté (pas d’obligation d’ownership en V1).
- **Champ absent du PATCH** → pas de modification de l’owner existant.

### Ligne budgétaire (effectif)

- **`resolveEffectiveOwnerOrgUnitId`** : ligne non nulle → ligne ; sinon budget ; sinon `null`.
- Réponses API : **`ownerOrgUnitSummary`** construit sur l’unité **effective** ; champ recommandé **`ownerOrgUnitSource`** : `'line' | 'budget' | null`.

### Archivage `OrgUnit`

- Avant passage à **`ARCHIVED`**, le service refuse si des ressources **encore actives** référencent cette unité en **`ownerOrgUnitId`** (comptages séparés **Budget** vs **BudgetLine** sur colonne stockée — pas de double comptage des lignes « héritées »).
- Prédicats « actif » alignés sur les enums Prisma (projets terminaux `ARCHIVED`/`CANCELLED`, budget non `ARCHIVED`, lignes non `ARCHIVED`/`CLOSED`, fournisseur non archivé, contrat non état terminal, objectif non archivé selon cycle de vie).

### Transfert / steward / obligation

- **RFC-ORG-004 (V1)** : `POST /api/organization/ownership-transfers`, `GET|PATCH /api/organization/ownership-policy`, garde-fous obligation sur les 6 entités, permission `organization.ownership.transfer`. Steward exposé en API (`stewardSummary`) sur **Projet** ; persistance `stewardResourceId` ailleurs sans DTO/réponse steward V1.

---

## 3. Contrat API (V1)

### Réponses

- **`ownerOrgUnitSummary: { id, name, type, code } | null`** sur listes et détails des modules concernés (même nom JSON).
- Ne pas n’exposer que l’UUID comme seule information affichable pour l’ownership.

### Filtres liste

- Query optionnel **`ownerOrgUnitId`** sur les listes principales des modules — filtre sur la **colonne stockée** de l’entité listée.
- **BudgetLine** : le filtre s’applique **uniquement** à **`BudgetLine.ownerOrgUnitId`** (override). Les lignes dont l’effectif vient du budget **sans** override **ne sont pas** incluses par ce filtre (limitation V1 documentée ; extension « filtre par effectif » = évolution explicite).

### Audits

Création d’un log **uniquement** si **`ownerOrgUnitId` stocké** change réellement ; `oldValue` / `newValue` = références auditables (id + libellé via `orgUnitAuditRef`), pas de données sensibles supplémentaires.

| Action (stable) | Ressource audit |
| --- | --- |
| `project.ownership.changed` | `Project` |
| `budget.ownership.changed` | `Budget` |
| `budget_line.ownership.changed` | `BudgetLine` (changement colonne ligne) |
| `supplier.ownership.changed` | `Supplier` |
| `contract.ownership.changed` | `SupplierContract` |
| `strategic_objective.ownership.changed` | `StrategicObjective` |

### Permissions (mutations)

Alignement sur les permissions **update** déjà utilisées par module (`projects.update`, `budgets.update`, procurement/contrats selon conventions repo, `contracts.update`, objectifs selon garde-fous vision stratégique). Chargement des sélecteurs d’unités : **`organization.read`**.

---

## 4. Frontend (V1)

- Composants **`OwnerOrgUnitSelect`** et **`OwnerOrgUnitNullWarning`** (`apps/web/src/features/organization/components/`) — arbre via `fetchOrgUnitsTree`, libellés nom + code ; avertissement fixe si `ownerOrgUnitId` null (indépendant du flag V2).
- **Projet** : fiche détail — « Direction propriétaire » (PATCH `ownerOrgUnitId`) si `projects.update`.
- **Budget / ligne** : tiroir ligne — onglet synthèse : direction **budget** (PATCH budget) et direction **ligne** (override / héritage, texte cohérent avec `ownerOrgUnitSource`).
- **Fournisseur** : modals création / édition + modal visualisation (`/suppliers`).
- **Contrat** : formulaire création/édition + fiche détail (`/contracts`).
- **Objectif stratégique** : dialogs création / édition + carte objectif (vision stratégique).

Listes filtrées côté UI : libellés d’aide cohérents avec le contrat « filtre = colonne stockée » pour les lignes budgétaires (cf. §3).

---

## 5. Tests

- Tests unitaires helpers : `apps/api/src/modules/organization/org-unit-ownership.helpers.spec.ts` (résolution effectif / source, agrégation blockers archivage).
- Checklist d’intégration recommandée (autre client, unité `ARCHIVED`, null, PATCH absent = no-op, audit seulement sur delta réel, archivage bloqué avec types listés, isolation client) : à étendre dans les specs services/contrôleurs concernés selon la stratégie de tests du repo.

---

## 6. Points de vigilance

- **`StrategicObjective.directionId`** reste la sémantique stratégique ; **`ownerOrgUnitId`** est la propriété organisationnelle.
- Cohérence **BudgetLine** : toujours passer par les helpers backend pour l’effectif et la source ; le front ne doit pas deviner l’héritage sans `ownerOrgUnitSource`.
- Performance : index `(clientId, ownerOrgUnitId)` sur les six tables.

---

## 7. Références croisées

- [RFC-ACL-016](./RFC-ACL-016%20%E2%80%94%20R%C3%A9solution%20du%20scope%20organisationnel.md) — consommation future du scope.
- [RFC-ACL-022](./RFC-ACL-022%20%E2%80%94%20Migration%20backfill%20et%20feature%20flags.md) — obligation / backfill / feature flags.
- Index RFC : [_RFC Liste.md](./_RFC%20Liste.md).
