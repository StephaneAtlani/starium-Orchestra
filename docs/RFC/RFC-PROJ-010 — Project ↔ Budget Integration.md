# 📄 RFC-PROJ-010 — Project ↔ Budget Integration

## Statut

❌ À faire (CRITIQUE PRODUIT — FORECAST)

---

# 1. Objectif

Permettre de **lier les projets aux budgets** afin de :

* connecter le **pilotage projet** au **pilotage financier**
* alimenter automatiquement le **forecast budgétaire**
* suivre les **coûts réels vs prévisionnels par projet**
* donner une **vision CODIR : coût projet → impact budget**

👉 Cette RFC est le **point de convergence** entre :

* module **Projects**
* module **Budget**
* module **Financial Core**

Sans cette RFC :

> ❌ pas de pilotage réel
> ❌ pas de forecast fiable
> ❌ pas de cockpit décisionnel

---

# 2. Problème adressé

Aujourd’hui :

* les projets sont isolés
* les budgets sont isolés
* les coûts ne sont pas reliés

Résultat :

* impossible de répondre à :

  * “Combien coûte réellement ce projet ?”
  * “Quel est l’impact sur mon budget IT ?”
  * “Est-ce que je vais dépasser ?”

👉 Cette RFC résout ce problème structurel.

---

# 3. Principe fonctionnel

Un **Project** peut être lié :

* à une ou plusieurs **BudgetLine**
* indirectement à une **BudgetEnvelope**
* indirectement à un **Budget**

---

## 3.1 Types de liaison

### 1️⃣ Liaison simple (MVP)

```
Project → BudgetLine
```

### 2️⃣ Liaison multiple

Un projet peut consommer plusieurs lignes :

* Infra
* Licences
* Prestations

---

## 3.2 Cas d’usage

### Exemple 1 — Projet ERP

```
Projet : Migration ERP

BudgetLines :
- Prestations ESN → 120k
- Licences ERP → 80k
- Infra → 40k
```

👉 Vision :

* coût total projet = 240k
* répartition budgétaire claire

---

### Exemple 2 — Projet Cloud

```
Projet : Migration AWS

BudgetLine :
- Cloud OPEX
```

👉 forecast alimenté automatiquement

---

# 4. Modèle de données

## 4.1 Nouveau modèle

```prisma
model ProjectBudgetLink {
  id             String   @id @default(cuid())
  clientId       String

  projectId      String
  budgetLineId   String

  allocationType ProjectBudgetAllocationType
  percentage     Decimal? @db.Decimal(5,2)
  amount         Decimal? @db.Decimal(18,2)

  createdAt      DateTime @default(now())

  project        Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  budgetLine     BudgetLine @relation(fields: [budgetLineId], references: [id], onDelete: Restrict)

  @@unique([projectId, budgetLineId])
  @@index([clientId])
}
```

---

## 4.2 Enum

```prisma
enum ProjectBudgetAllocationType {
  FULL        // 100% sur une ligne
  PERCENTAGE  // répartition %
  FIXED       // montant fixe
}
```

---

# 5. Règles métier

## 5.1 Scope client

* `Project.clientId == BudgetLine.clientId`
* obligatoire

---

## 5.2 Unicité

* 1 lien max par (projectId, budgetLineId)

---

## 5.3 Modes d’allocation

### FULL

```
1 projet → 1 ligne → 100%
```

---

### PERCENTAGE

```
Projet → plusieurs lignes

Ex :
Infra = 50%
Licence = 50%
```

👉 somme = 100%

---

### FIXED

```
Projet → ligne → montant fixe
```

---

## 5.4 Validation

| Règle            | Description               |
| ---------------- | ------------------------- |
| % total = 100    | obligatoire si PERCENTAGE |
| amount > 0       | si FIXED                  |
| cohérence client | obligatoire               |
| ligne ACTIVE     | obligatoire               |

---

# 6. Intégration Financial Core (CRITIQUE)

👉 C’est ici que la RFC devient **clé produit**

---

## 6.1 Génération d’événements financiers

Quand :

* tâche complétée
* milestone validée
* coût enregistré

👉 créer un :

```
FinancialEvent
```

avec :

```ts
sourceType = PROJECT
sourceId   = projectId
```

---

## 6.2 Types d’événements

Exemples :

```
PROJECT_COST_ESTIMATED
PROJECT_COST_COMMITTED
PROJECT_COST_CONSUMED
```

---

## 6.3 Impact sur BudgetLine

Le financial-core recalculera :

* forecastAmount
* committedAmount
* consumedAmount
* remainingAmount

👉 déjà conforme à ton moteur 

---

# 7. API Backend

Module :

```
apps/api/src/modules/project-budget/
```

---

## 7.1 Endpoints

### Lier un projet

```
POST /api/projects/:id/budget-links
```

---

### Lister les liens

```
GET /api/projects/:id/budget-links
```

---

### Supprimer

```
DELETE /api/project-budget-links/:id
```

---

## 7.2 Guards

Standard :

```
JwtAuthGuard
ActiveClientGuard
ModuleAccessGuard
PermissionsGuard
```

---

## 7.3 Permissions

```
projects.update
budgets.read
```

---

# 8. Impact Frontend

Aligné avec la vision cockpit 

---

## 8.1 UI

### Dans Projet

Ajouter :

* onglet **Budget**
* sélection BudgetLine
* répartition (% ou montant)

---

## 8.2 Dans BudgetLine

Ajouter :

* liste des projets liés
* impact financier

---

## 8.3 Cockpit

Nouveaux KPI :

* coût par projet
* budget consommé par projet
* dérive projet → budget

---

# 9. Audit

Chaque action génère :

```
project.budget_link.created
project.budget_link.deleted
```

Conforme audit logs 

---

# 10. Séquence complète (clé produit)

```
Projet créé
   ↓
Liaison BudgetLine
   ↓
Tâche réalisée
   ↓
FinancialEvent (PROJECT)
   ↓
Financial Core
   ↓
Recalcul BudgetLine
   ↓
Dashboard mis à jour
```

---

# 11. Dépendances

| RFC          | Description      |
| ------------ | ---------------- |
| RFC-PROJ-002 | Modèle Project   |
| RFC-015-2    | Budget structure |
| RFC-015-1B   | Financial Core   |
| RFC-016      | Reporting        |

---

# 12. Valeur produit

👉 Ce que ça débloque :

* ✔ forecast réel (pas Excel fake)
* ✔ pilotage projet + budget unifié
* ✔ vision CODIR immédiate
* ✔ différenciation énorme produit

---

# ⚠️ Conclusion (très important)

👉 Cette RFC est :

> 🔥 **STRUCTURELLE ET CRITIQUE**

Sans elle :

* ton module projet = gadget
* ton budget = statique
* ton SaaS = non différenciant

Avec elle :

> 💡 tu crées un vrai **cockpit de pilotage SI**

---

Si tu veux, je peux te faire la suite directe :

👉 **RFC-PROJ-011 — Project Financial Tracking (forecast auto, coût réel, dérive projet)**

C’est la continuité logique et encore plus différenciante.
