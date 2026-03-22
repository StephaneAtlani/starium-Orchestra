# RFC-FE-004 — Budget Envelopes & Lines Explorer UI

## Statut

Implémenté

## Domaine

Frontend — Module Budgets

## Titre

**Budget Envelopes & Lines Explorer UI**

Interface principale permettant d’explorer un budget via un **tableau hiérarchique des enveloppes et lignes budgétaires**.

---

# 1. Objectif

Implémenter la page :

```
/budgets/[budgetId]
```

qui permet d’explorer la structure complète d’un budget :

```
Budget
   └── Enveloppes (sous-budgets)
         └── Lignes budgétaires
```

La page doit afficher ces données sous forme d’un **tableau hiérarchique expandable**, inspiré des solutions de référence du marché :

* Abraxio
* Apptio
* ServiceNow ITFM
* Planview

Cette page devient **l’interface principale de travail sur un budget**.

---

# 2. Contexte

Le backend expose déjà les entités :

```
Budget
BudgetEnvelope
BudgetLine
```

et les APIs suivantes :

```
GET /api/budgets/:id
GET /api/budget-envelopes
GET /api/budget-lines
```

avec les filtres :

```
budgetId
envelopeId
status
expenseType
search
offset
limit
```

Cette RFC implémente l’interface permettant **d’explorer ces données**.

---

# 3. Positionnement dans le module Budget

Navigation utilisateur :

```
/budgets
    ↓
liste des budgets
    ↓
/budgets/[budgetId]
    ↓
exploration enveloppes
    ↓
lignes budgétaires
```

La page `/budgets/[budgetId]` devient **le cockpit budgétaire principal**.

---

# 4. Route frontend

```
apps/web/src/app/(protected)/budgets/[budgetId]/page.tsx
```

Cette page doit utiliser :

* le layout protégé existant
* le client actif
* les hooks de données du module budgets

---

# 5. Périmètre de la RFC

## Inclus

* page `/budgets/[budgetId]`
* affichage du budget
* tableau hiérarchique enveloppes / lignes
* expansion / collapse
* navigation dans la structure
* affichage des métriques budgétaires
* recherche
* filtres simples
* états loading / empty / error

## Exclus

* création enveloppe
* modification enveloppe
* création ligne
* modification ligne
* drag & drop hiérarchique
* allocations financières
* réallocations
* versioning
* snapshots

Ces fonctionnalités seront couvertes par d’autres RFC.

---

# 6. Structure visuelle de la page

```
PageHeader
Nom du budget

Toolbar
Filtres / recherche / tri

----------------------------------------------------

TABLEAU HIERARCHIQUE BUDGET

----------------------------------------------------
```

Le tableau représente :

```
Budget
   └── Sous-budgets
         └── Lignes
```

---

# 7. Tableau hiérarchique

Le tableau contient les colonnes suivantes.

| Colonne | Description                                      |
| ------- | ------------------------------------------------ |
| État    | statut de l’enveloppe ou de la ligne (badge UI) |
| Sous-budget | nom enveloppe / nom ligne                   |
| Responsable | owner                                        |
| Type    | RUN / BUILD (enveloppe) ou OPEX/CAPEX (ligne)   |
| Budget  | montant total                                   |
| % budget | poids dans budget                              |
| Lignes  | nombre de lignes                                |
| OPEX    | dépenses opérationnelles                        |
| CAPEX   | investissements                                 |
| Engagé  | dépenses engagées                               |
| Consommé | dépenses consommées                            |
| Solde   | budget restant                                  |

---

# 8. Exemple de hiérarchie

```
Infrastructure
   Serveurs
       INF-001 Achat serveurs
       INF-002 Maintenance
   Cloud
       INF-003 Azure
       INF-004 AWS

Applications
   ERP
   CRM
```

Chaque niveau peut être **expand / collapse**.

---

# 9. Comportement utilisateur

Chaque ligne peut être :

```
enveloppe
sous-enveloppe
ligne budgétaire
```

Les actions possibles :

```
expand
collapse
ouvrir
```

---

# 10. Affichage des lignes budgétaires

Une ligne budgétaire affiche :

```
Code
Nom
Budget
Engagé
Consommé
Restant
```

Avec une **barre visuelle de consommation**.

Exemple :

```
Consommé 12%
Solde 88%
```

---

# 11. Chargement des données

Les données proviennent des APIs :

```
GET /api/budgets/:id
GET /api/budget-envelopes
GET /api/budget-lines
```

Chargement :

1. charger le budget
2. charger toutes les enveloppes
3. charger les lignes
4. construire la hiérarchie

---

# 12. Construction de la hiérarchie

Les enveloppes et lignes sont renvoyées par l’API sous forme de listes.

Le frontend doit construire une structure :

```
ExplorerNode
```

Type :

```ts
type ExplorerNode = {
  id: string
  type: "envelope" | "line"
  parentId?: string
  name: string
  children?: ExplorerNode[]
}
```

Algorithme :

```
1 récupérer enveloppes
2 récupérer lignes
3 construire arbre via parentId
4 trier par sortOrder
```

---

# 13. Permissions et rôles

Cette page doit respecter le modèle **RBAC**.

Conditions d’accès :

```
utilisateur authentifié
client actif valide
module budgets actif
permission budgets.read
```

---

## budgets.read

Autorise :

```
voir budgets
voir enveloppes
voir lignes
```

---

## budgets.update

Autorise :

```
modifier enveloppes
modifier lignes
```

---

## budgets.create

Autorise :

```
créer enveloppes
créer lignes
```

---

## Important

```
CLIENT_ADMIN
≠
toutes permissions métier
```

Le frontend ne doit jamais supposer les droits.

Le backend reste **source de vérité**.

---

# 14. Multi-client

Toutes les requêtes doivent inclure :

```
X-Client-Id
```

Les query keys doivent être tenant-aware.

Exemple :

```
["budgets", clientId, "detail", budgetId]
["budgets", clientId, "envelopes", budgetId]
["budgets", clientId, "lines", budgetId]
```

---

# 15. États UI

La page doit gérer les états suivants.

### Loading

chargement :

```
budget
enveloppes
lignes
```

---

### Error

```
budget introuvable
erreur API
```

---

### Empty

cas possibles :

```
budget sans enveloppe
enveloppe sans lignes
filtre sans résultat
```

---

# 16. Structure frontend

```
features/budgets/

api/
   get-budget.ts
   get-budget-envelopes.ts
   get-budget-lines.ts

hooks/
   use-budget.ts
   use-budget-envelopes.ts
   use-budget-lines.ts
   use-budget-explorer.ts

components/

   budget-summary-card.tsx
   budget-explorer-table.tsx
   budget-explorer-row.tsx
   budget-lines-progress.tsx

lib/

   build-budget-tree.ts

types/

   budget-explorer.types.ts
```

---

# 17. Ordre d’implémentation recommandé

1. API hooks
2. types ExplorerNode
3. build-budget-tree
4. explorer table
5. explorer row expandable
6. progress bars
7. page `/budgets/[budgetId]`

---

# 18. Critères d’acceptation

La RFC est validée si :

✔ la page `/budgets/[budgetId]` existe
✔ le budget se charge correctement
✔ les enveloppes sont affichées hiérarchiquement
✔ l’expansion fonctionne
✔ les lignes sont visibles
✔ les indicateurs budgétaires sont affichés
✔ les états loading / error / empty sont gérés
✔ les query keys sont tenant-aware
✔ le RBAC est respecté

---

# 19. Résumé

Cette RFC crée **l’explorateur budgétaire principal**.

Elle permet :

```
ouvrir un budget
naviguer dans les enveloppes
voir les lignes budgétaires
comprendre la structure budgétaire
```

C’est **l’interface centrale du module Budget**.

---

# 20. Implémentation (référence)

L’implémentation suit le plan détaillé (`.cursor/plans/` ou équivalent) et respecte :

- **Route** : `apps/web/src/app/(protected)/budgets/[budgetId]/page.tsx`
- **APIs** : `GET /api/budgets/:id`, `GET /api/budget-envelopes?budgetId=&limit=&offset=`, `GET /api/budget-lines?budgetId=&limit=&offset=` (pagination gérée en boucle côté frontend pour charger l’intégralité des données).
- **Structure feature** :
  - `features/budgets/types/budget-explorer.types.ts` — types discriminés `ExplorerNode`, `BudgetExplorerFilters`, `BudgetExplorerData`
  - `features/budgets/lib/fetch-budget-explorer-data.ts` — `fetchAllEnvelopesForBudget`, `fetchAllLinesForBudget` (sans filtres API)
  - `features/budgets/lib/build-budget-tree.ts` — construction arbre, orphelins à la racine / nœud virtuel « Lignes sans enveloppe »
  - `features/budgets/lib/filter-budget-tree.ts` — filtrage côté client (search, envelopeType, expenseType)
  - `features/budgets/hooks/use-budget-envelopes.ts`, `use-budget-lines.ts`, `use-budget-explorer.ts`, `use-budget-explorer-tree.ts`
  - `features/budgets/components/budget-lines-progress.tsx`, `budget-explorer-row.tsx`, `budget-explorer-table.tsx`
- **Query keys** : `budgetEnvelopes(clientId, budgetId, { full: true })` pour l’explorer ; `budgetLinesByBudget(clientId, budgetId)` sans filtres. Toutes tenant-aware.
- **États** : loading, error, empty global (aucune enveloppe), empty filtré (message distinct). Expansion par défaut : racines ouvertes, sous-niveaux fermés.
- **Critères d’acceptation** (§18) : tous couverts.

