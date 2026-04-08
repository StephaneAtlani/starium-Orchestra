# RFC-FE-006-CORR — Budget Envelope Detail UI

## Statut

Draft

## Titre

**Budget Envelope Detail UI — Page détail d’une enveloppe budgétaire**

---

# 1. Objectif

Créer la page :

```text
/budget-envelopes/[id]
```

Cette page permet de consulter une **enveloppe budgétaire** comme une **maille intermédiaire de pilotage**, entre le budget global et les lignes budgétaires.

Elle doit offrir :

* une vision consolidée des montants de l’enveloppe
* une vue claire de son identité et de son statut
* une liste des lignes qu’elle contient
* une navigation vers les lignes
* une compréhension rapide de la santé budgétaire de l’enveloppe

---

# 2. Rôle dans le produit

Cette page répond à des questions métier simples et critiques :

* Où en est cette enveloppe ?
* Est-elle encore ouverte ou verrouillée ?
* Quelles lignes consomment le budget ?
* Cette enveloppe est-elle en dérive ?
* Puis-je encore agir dessus ?

Elle constitue la **vue intermédiaire de pilotage** entre :

* le **budget** comme vue globale
* la **ligne budgétaire** comme vue d’analyse fine

---

# 3. Position dans l’UX

## Navigation cible

```text
/budgets/[id]
   └── clic sur une enveloppe
        → /budget-envelopes/[id]
              └── clic sur une ligne
                   → /budget-lines/[id]
```

Logique de drill-down :

**Budget → Enveloppe → Ligne**

---

# 4. Périmètre

## Inclus

* chargement du détail d’une enveloppe
* affichage de l’identité de l’enveloppe
* affichage du **statut de l’enveloppe**
* affichage des montants consolidés
* liste paginée des lignes de l’enveloppe
* navigation vers le budget parent
* navigation vers le détail d’une ligne
* gestion des états UI complets

## Exclus

* création d’enveloppe
* édition d’enveloppe
* changement de statut d’enveloppe
* création de ligne
* réallocation
* historique d’événements au niveau enveloppe
* actions financières directes depuis l’enveloppe

---

# 5. Modèle métier attendu

L’enveloppe devient un objet métier de gouvernance avec son propre statut.

## 5.1 Statut d’enveloppe

Le backend doit exposer un champ :

```ts
status
```

Valeurs attendues :

```ts
DRAFT
ACTIVE
LOCKED
ARCHIVED
```

## 5.2 Sémantique métier

| Statut   | Description                                    |
| -------- | ---------------------------------------------- |
| DRAFT    | Enveloppe en préparation                       |
| ACTIVE   | Enveloppe ouverte et exploitable               |
| LOCKED   | Enveloppe figée, aucune modification autorisée |
| ARCHIVED | Enveloppe historisée                           |

## 5.3 Règle UX importante

Le frontend **affiche** le statut et adapte l’interface, mais ne porte **aucune logique métier source de vérité**.

Exemples :

* badge visuel du statut
* message d’information si enveloppe verrouillée
* désactivation de boutons d’action quand ils existeront plus tard

---

# 6. APIs consommées

## 6.1 Détail enveloppe

```http
GET /api/budget-envelopes/:id
```

Retour attendu :

* identité enveloppe
* budgetId
* code
* name
* description
* currency
* **status**
* montants consolidés

## 6.2 Lignes de l’enveloppe

```http
GET /api/budget-lines?envelopeId=:id&offset=0&limit=20
```

Réponse paginée standard :

```ts
{
  items: [],
  total: number,
  limit: number,
  offset: number
}
```

---

# 7. Données affichées

## 7.1 Header

Le header affiche :

* nom de l’enveloppe
* code si disponible
* **badge de statut**
* breadcrumb

Exemple :

```text
Budgets / Budget IT 2026 / RUN Infrastructure
```

Actions minimales :

* retour au budget parent
* accès rapide au budget

---

## 7.2 Bloc identité

Afficher :

* `name`
* `code`
* `description`
* `status`
* `currency`
* `budgetId`

Le statut doit être visible à deux endroits :

* dans le header sous forme de badge
* dans le bloc identité sous forme de champ lisible

---

## 7.3 Bloc montants

Afficher les KPI suivants :

* `initialAmount`
* `revisedAmount`
* `forecastAmount`
* `committedAmount`
* `consumedAmount`
* `remainingAmount`

Règle impérative :

**Aucun calcul frontend**
Le backend reste la source de vérité.

---

## 7.4 Liste des lignes

Afficher les lignes rattachées à l’enveloppe.

### Colonnes minimales

* `code`
* `name`
* `status`
* `initialAmount`
* `revisedAmount`
* `forecastAmount`
* `committedAmount`
* `consumedAmount`
* `remainingAmount`

### Interaction

* clic sur une ligne → `/budget-lines/[id]`

Le fait d’afficher aussi le statut des lignes est important pour garder une cohérence de lecture entre enveloppe et lignes.

---

# 8. Layout UI

## Structure recommandée

```text
PageHeader
└─ Breadcrumb + titre + badge statut

Grid
├─ Card Identité
└─ Card Contexte budget

KPI Grid
├─ Initial
├─ Révisé
├─ Forecast
├─ Engagé
├─ Consommé
└─ Restant

Section
└─ Table lignes
```

---

# 9. Règles UX liées au statut

## 9.1 Enveloppe DRAFT

* affichage standard
* badge `DRAFT`
* message optionnel de contexte : enveloppe en préparation

## 9.2 Enveloppe ACTIVE

* affichage standard
* badge `ACTIVE`

## 9.3 Enveloppe LOCKED

* badge `LOCKED`
* affichage d’un message visible :

> Cette enveloppe est verrouillée. Aucune modification n’est autorisée.

* les futures actions interactives devront apparaître désactivées

## 9.4 Enveloppe ARCHIVED

* badge `ARCHIVED`
* page consultable en lecture seule
* style visuel plus neutre / atténué possible

---

# 10. Couleurs et sémantique visuelle

## 10.1 Badge statut

Recommandation visuelle :

* `DRAFT` → neutre
* `ACTIVE` → positif
* `LOCKED` → warning / sombre
* `ARCHIVED` → secondaire / atténué

## 10.2 KPI restant

Même logique que pour les lignes :

* `remainingAmount < 0` → danger
* `remainingAmount = 0` → attention
* `remainingAmount > 0` → normal

---

# 11. États UI

## Loading

* skeleton header
* skeleton badge statut
* skeleton KPI
* skeleton table

## Error

* `404` → enveloppe introuvable
* `403` → accès refusé
* autre → erreur standard avec retry

## Empty

* aucune ligne → afficher : **Aucune ligne budgétaire**
* description absente → masquer proprement
* champs non fournis → fallback visuel propre

---

# 12. Architecture frontend

## Dossier cible

```text
features/budgets/
  api/
    budget-envelopes.api.ts
  hooks/
    use-budget-envelope.ts
    use-budget-envelope-lines.ts
  components/
    budget-envelope-header.tsx
    budget-envelope-summary-cards.tsx
    budget-envelope-identity-card.tsx
    budget-envelope-lines-table.tsx
    budget-envelope-status-badge.tsx
```

---

## Query keys

```ts
["budget-envelope", clientId, envelopeId]
["budget-envelope-lines", clientId, envelopeId, offset, limit]
```

Le `clientId` doit être présent dans les query keys.

---

# 13. Types TypeScript

## 13.1 Détail enveloppe

```ts
type BudgetEnvelopeDetail = {
  id: string;
  budgetId: string;
  code: string | null;
  name: string;
  description?: string | null;
  status:
    | "DRAFT"
    | "PENDING_VALIDATION"
    | "ACTIVE"
    | "REJECTED"
    | "DEFERRED"
    | "LOCKED"
    | "ARCHIVED";
  currency: string;
  initialAmount: number;
  revisedAmount: number;
  forecastAmount: number;
  committedAmount: number;
  consumedAmount: number;
  remainingAmount: number;
};
```

## 13.2 Liste de lignes

Le type doit inclure au minimum :

```ts
type BudgetEnvelopeLineItem = {
  id: string;
  code: string | null;
  name: string;
  status: string;
  initialAmount: number;
  revisedAmount: number;
  forecastAmount: number;
  committedAmount: number;
  consumedAmount: number;
  remainingAmount: number;
};
```

---

# 14. API client frontend

Créer dans `features/budgets/api/budget-envelopes.api.ts` :

```ts
getBudgetEnvelope(id: string)
getBudgetEnvelopeLines(envelopeId: string, params?: { offset?: number; limit?: number })
```

Règles :

* utiliser le client HTTP authentifié existant
* ne pas faire de `fetch` brut dans les composants
* laisser l’infrastructure existante injecter `Authorization` et `X-Client-Id`

---

# 15. Règles d’implémentation

## 15.1 Ce que le frontend peut faire

* afficher le statut
* adapter visuellement l’interface
* afficher un message selon le statut
* désactiver de futures actions si nécessaire
* formater les montants et dates

## 15.2 Ce que le frontend ne doit pas faire

* recalculer les montants
* inférer des transitions de statut
* imposer des règles métier métier côté client
* décider seul si une action est autorisée sans confirmation backend

---

# 16. Critères d’acceptation

La RFC est considérée comme terminée lorsque :

1. la route `/budget-envelopes/[id]` existe
2. le détail de l’enveloppe est chargé depuis l’API
3. le **statut de l’enveloppe** est visible dans le header et dans le détail
4. les KPI financiers sont affichés
5. la liste paginée des lignes de l’enveloppe est affichée
6. chaque ligne permet de naviguer vers `/budget-lines/[id]`
7. les états loading / error / empty sont gérés
8. l’interface reste strictement read-only
9. l’UI s’adapte correctement à `LOCKED` et `ARCHIVED`

---

# 17. Résumé

Cette RFC crée la **page de détail d’une enveloppe budgétaire** et introduit explicitement le **statut d’enveloppe** dans l’expérience utilisateur.

Elle permet :

* une lecture consolidée d’un sous-périmètre budgétaire
* une navigation claire vers les lignes
* une meilleure gouvernance visuelle
* une base propre pour les futures actions et workflows

