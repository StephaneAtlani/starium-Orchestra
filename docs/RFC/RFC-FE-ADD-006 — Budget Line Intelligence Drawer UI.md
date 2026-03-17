# RFC-FE-ADD-006 — Budget Line Intelligence Drawer UI

## Statut

Draft

## Titre

**Budget Line Intelligence Drawer UI — Volet horizontal bas pour le pilotage détaillé d’une ligne budgétaire**

---

## 1. Objectif

Permettre, depuis l’explorateur budgétaire ou toute liste de lignes budgétaires, d’ouvrir un **grand volet horizontal ancré en bas de la page** lorsqu’un utilisateur clique sur le **titre d’une BudgetLine**.

Ce volet devient l’espace principal de lecture et d’action sur une ligne budgétaire, avec une approche **cockpit DSI / DAF / pilotage opérationnel**.

Il doit permettre de :

* consulter rapidement la synthèse financière de la ligne
* visualiser les commandes, factures et autres événements financiers
* créer des événements financiers manuels
* consulter les allocations associées
* visualiser les métadonnées utiles au pilotage
* centraliser les informations importantes attendues par un DSI sans quitter la page courante

L’objectif est d’éviter une navigation lourde vers une page dédiée à chaque clic et de fournir une expérience de pilotage fluide, rapide et contextualisée.

---

## 2. Problème résolu

Aujourd’hui, la ligne budgétaire est surtout manipulée comme un objet de structure budgétaire. Or, pour un DSI, une ligne représente surtout un **objet de pilotage vivant** :

* engagement budgétaire
* commandes en cours
* factures reçues
* consommation réelle
* écarts
* alertes
* contexte fournisseur
* commentaires / notes / pièces utiles à terme

Le simple affichage tabulaire ne suffit pas.

Le besoin métier réel est :

> cliquer sur une ligne, ouvrir instantanément un cockpit détaillé, sans casser le contexte de lecture de la page budget.

---

## 3. Périmètre

### Inclus

* ouverture d’un **drawer horizontal bottom sheet** sur clic du titre d’une ligne
* chargement asynchrone du détail complet de la ligne
* affichage structuré par onglets ou sections
* consultation des montants consolidés
* consultation des événements financiers
* création d’événements financiers manuels :

  * commande
  * facture
  * autre événement financier utile
* consultation des allocations
* affichage d’informations DSI utiles au pilotage
* invalidation React Query après mutation
* fonctionnement multi-client strict via `X-Client-Id`

### Exclus du MVP

* upload de pièces jointes
* GED complète de la ligne
* workflow d’approbation
* édition inline massive multi-événements
* timeline transverse multi-lignes
* moteur de commentaires collaboratifs temps réel
* notifications automatiques
* synchronisation ERP / comptabilité externe

---

## 4. Références et dépendances

Cette RFC frontend s’appuie sur le socle déjà présent :

* architecture frontend cockpit, App Shell, feature-first, API-first, TanStack Query, React Hook Form, Zod 
* vision frontend comme cockpit de gouvernance et non simple enchaînement de formulaires 
* backend `budget-management` pour la structure : BudgetExercise, Budget, BudgetEnvelope, BudgetLine 
* backend `financial-core` pour les événements financiers, allocations et recalcul automatique des montants de ligne  
* reporting budgétaire pour enrichissements futurs de synthèse/KPI si nécessaire 

---

## 5. Principes UX

### 5.1 Interaction principale

Dans un tableau ou arbre budgétaire, le **titre de la ligne** devient interactif.

Action :

* clic sur le titre → ouverture du drawer bas
* clic sur une autre ligne pendant drawer ouvert → drawer réutilisé avec rechargement du contexte
* fermeture → retour immédiat au tableau sans perte de scroll ni d’état d’expansion

### 5.2 Positionnement

Le composant est un **volet horizontal large**, fixé en bas du viewport ou de la zone workspace.

Caractéristiques recommandées :

* largeur : 100% de la zone contenu
* hauteur : 55 à 75 vh selon viewport
* header fixe
* body scrollable
* footer optionnel fixe pour actions principales

### 5.3 Philosophie

Le drawer n’est pas une simple fiche technique.

Il doit être conçu comme un :

> **mini cockpit de pilotage de la ligne budgétaire**

---

## 6. Structure UX cible

## 6.1 Header du drawer

Le header affiche immédiatement :

* nom de la ligne
* code ligne
* enveloppe
* budget
* statut
* expenseType
* devise
* badges d’alerte éventuels :

  * dépassement
  * reste négatif
  * facture récente
  * commande non couverte
* actions rapides :

  * ajouter commande
  * ajouter facture
  * ajouter autre événement
  * ouvrir la page complète (si route dédiée conservée)
  * fermer

Exemple visuel :

```text
[BL-001] Licences Microsoft 365
RUN / Poste de travail / ACTIVE / OPEX / EUR
Alerte: reste faible | 2 factures ce mois | 1 engagement en attente
[+ Commande] [+ Facture] [+ Événement] [Ouvrir la fiche] [Fermer]
```

---

## 6.2 Zone de synthèse haute

Sous le header, afficher une bande KPI compacte :

* initialAmount
* revisedAmount
* forecastAmount
* committedAmount
* consumedAmount
* remainingAmount

Ratios UI calculés côté frontend à partir des montants renvoyés :

* taux engagé
* taux consommé
* taux forecast

Ces ratios sont **d’affichage uniquement**. Le backend reste la source de vérité pour les montants. 

---

## 6.3 Onglets recommandés

Le drawer contient les onglets suivants.

### Onglet 1 — Vue d’ensemble

Contient :

* synthèse métier
* description de la ligne
* rattachement enveloppe / budget / exercice
* montants
* indicateurs simples
* dernier événement financier
* dernier mouvement / dernière mise à jour
* informations analytiques si RFC-021 implémentée plus tard

### Onglet 2 — Commandes & engagements

Contient les événements financiers traduits métier comme commandes / engagements :

* date
* libellé
* montant
* sourceType
* référence éventuelle
* statut d’usage UI
* commentaire

Par défaut, cet onglet affiche principalement les `COMMITMENT_REGISTERED`. Le backend agrège déjà ces événements sur la ligne. 

### Onglet 3 — Factures & consommation

Contient les événements financiers de type consommation :

* date facture
* libellé
* montant
* fournisseur si présent plus tard
* référence documentaire éventuelle
* commentaire

Cet onglet affiche principalement les `CONSUMPTION_REGISTERED`. 

### Onglet 4 — Allocations

Liste paginée des `FinancialAllocation` liées à la ligne :

* allocationType
* sourceType
* sourceId
* allocatedAmount
* effectiveDate
* notes

### Onglet 5 — Informations DSI

Onglet orienté pilotage, sans introduire de logique métier critique.
Il peut contenir, dans le MVP ou en extension graduelle :

* criticité métier
* récurrence de la dépense
* catégorie de dépense
* horizon de renouvellement
* commentaire libre de pilotage
* dépendance fournisseur
* exposition contractuelle
* notes opérationnelles
* lien futur vers contrat / fournisseur / licence / commande

Cet onglet peut commencer en lecture simple avec placeholders UI si les données backend ne sont pas encore disponibles.

---

## 7. Traduction métier des événements

Le backend expose des **FinancialEvent** et non des objets “Commande” ou “Facture” natifs du budget. Le frontend doit donc proposer une lecture métier plus naturelle sans falsifier le modèle. 

Convention UI MVP :

* **Commande** = création d’un `FinancialEvent` avec `eventType = COMMITMENT_REGISTERED`
* **Facture** = création d’un `FinancialEvent` avec `eventType = CONSUMPTION_REGISTERED`
* **Autre événement** = formulaire avancé exposant le `FinancialEventType` autorisé par l’API

Le backend reste maître du recalcul de :

* forecastAmount
* committedAmount
* consumedAmount
* remainingAmount 

---

## 8. Actions utilisateur

## 8.1 Ajouter une commande

Ouvre un dialog ou panneau secondaire contenant au minimum :

* date
* libellé
* montant
* description optionnelle
* sourceType = `MANUAL`

Au submit :

* `POST /api/financial-events`
* payload :

  * `budgetLineId`
  * `sourceType: MANUAL`
  * `eventType: COMMITMENT_REGISTERED`
  * `amount`
  * `currency`
  * `eventDate`
  * `label`
  * `description?`

## 8.2 Ajouter une facture

Même logique avec :

* `eventType: CONSUMPTION_REGISTERED`

## 8.3 Ajouter un autre événement

Formulaire avancé exposant :

* type d’événement
* date
* montant
* label
* description
* sourceType
* sourceId éventuel si modèle futur

## 8.4 Consulter les événements

Le drawer charge la liste via :

* `GET /api/budget-lines/:id/events`

## 8.5 Consulter les allocations

Le drawer charge la liste via :

* `GET /api/budget-lines/:id/allocations`

Ces endpoints existent dans le périmètre `financial-core`. 

---

## 9. Données à afficher dans le drawer

## 9.1 Données indispensables MVP

Depuis la BudgetLine :

* id
* code
* name
* description
* status
* expenseType
* currency
* initialAmount
* revisedAmount
* forecastAmount
* committedAmount
* consumedAmount
* remainingAmount
* budgetId
* envelopeId

Depuis le contexte structurel :

* nom budget
* code budget
* nom enveloppe
* type enveloppe

Depuis les événements :

* id
* eventType
* amount
* eventDate
* label
* description
* sourceType
* sourceId

Depuis les allocations :

* id
* allocationType
* allocatedAmount
* effectiveDate
* sourceType
* sourceId
* notes

## 9.2 Informations importantes attendues par un DSI

Le drawer doit favoriser les données directement exploitables pour le pilotage :

* où en est la dépense ?
* qu’est-ce qui est engagé ?
* qu’est-ce qui est déjà facturé ?
* reste-t-il du budget ?
* la dérive est-elle visible ?
* quelles actions doivent être prises ?
* y a-t-il un risque d’oubli, de dépassement ou d’absence de couverture budgétaire ?

---

## 10. Architecture frontend

## 10.1 Route et mode d’intégration

Cette RFC ne remplace pas forcément la page `/budget-lines/[id]`, mais introduit un mode UX prioritaire par drawer.

Le drawer est utilisé dans :

* `/budgets/[budgetId]`
* listes de lignes
* futurs écrans de reporting détaillé

## 10.2 Arborescence recommandée

```text
features/budgets/
├── api/
│   ├── get-budget-line-detail.ts
│   ├── list-budget-line-events.ts
│   ├── list-budget-line-allocations.ts
│   ├── create-financial-event.ts
│   └── financial-drawer.types.ts
├── hooks/
│   ├── use-budget-line-drawer.ts
│   ├── use-budget-line-detail.ts
│   ├── use-budget-line-events.ts
│   ├── use-budget-line-allocations.ts
│   └── use-create-financial-event.ts
├── components/
│   ├── budget-line-drawer/
│   │   ├── budget-line-intelligence-drawer.tsx
│   │   ├── budget-line-drawer-header.tsx
│   │   ├── budget-line-kpi-strip.tsx
│   │   ├── budget-line-overview-tab.tsx
│   │   ├── budget-line-commitments-tab.tsx
│   │   ├── budget-line-invoices-tab.tsx
│   │   ├── budget-line-allocations-tab.tsx
│   │   ├── budget-line-dsi-info-tab.tsx
│   │   ├── create-order-dialog.tsx
│   │   ├── create-invoice-dialog.tsx
│   │   └── create-financial-event-dialog.tsx
│   └── ...
├── schemas/
│   ├── create-order.schema.ts
│   ├── create-invoice.schema.ts
│   └── create-financial-event.schema.ts
└── types/
    └── financial-core.types.ts
```

Cette structure reste conforme à l’architecture frontend feature-first recommandée. 

---

## 11. Gestion d’état

## 11.1 État du drawer

Le frontend gère :

```ts
type BudgetLineDrawerState = {
  isOpen: boolean;
  selectedBudgetLineId: string | null;
  activeTab:
    | "overview"
    | "commitments"
    | "invoices"
    | "allocations"
    | "dsi-info";
};
```

## 11.2 Règles

* un seul drawer ouvert à la fois
* changement de ligne = rechargement des queries
* fermeture = reset du `selectedBudgetLineId`
* état local UI, sans persistance obligatoire

---

## 12. API frontend

## 12.1 Lecture du détail ligne

Réutiliser `GET /api/budget-lines/:id` pour la donnée cœur structurelle. 

## 12.2 Lecture événements

`GET /api/budget-lines/:id/events`

## 12.3 Lecture allocations

`GET /api/budget-lines/:id/allocations`

## 12.4 Création événement

`POST /api/financial-events`

Le frontend ne calcule jamais lui-même les nouveaux montants consolidés. Après mutation, il invalide simplement :

* détail ligne
* liste événements
* liste allocations
* vue budget concernée si nécessaire

---

## 13. Query keys

Toutes les query keys métier doivent être tenant-aware. 

Exemples :

```ts
["budget-line-detail", clientId, budgetLineId]
["budget-line-events", clientId, budgetLineId, pagination]
["budget-line-allocations", clientId, budgetLineId, pagination]
```

Après création d’un événement :

```ts
invalidateQueries(["budget-line-detail", clientId, budgetLineId])
invalidateQueries(["budget-line-events", clientId, budgetLineId])
invalidateQueries(["budgets", clientId, budgetId])
```

---

## 14. Composants UI

## 14.1 Composant racine

`BudgetLineIntelligenceDrawer`

Responsabilités :

* ouvrir / fermer
* orchestrer les onglets
* charger le bon contexte
* afficher états loading/error/empty

## 14.2 Composants internes

* `BudgetLineDrawerHeader`
* `BudgetLineKpiStrip`
* `BudgetLineOverviewTab`
* `BudgetLineCommitmentsTab`
* `BudgetLineInvoicesTab`
* `BudgetLineAllocationsTab`
* `BudgetLineDsiInfoTab`
* dialogs de création

## 14.3 Composant d’entrée dans le tableau

Le titre de ligne devient un composant du type :

`BudgetLineTitleTrigger`

Responsabilités :

* style clickable
* accessibilité clavier
* ouverture du drawer avec `budgetLineId`

---

## 15. États UI obligatoires

Chaque onglet ou bloc de données doit gérer explicitement :

* loading
* error
* empty
* success

Aucun “blanc” non expliqué ne doit apparaître. C’est cohérent avec les règles frontend déjà posées. 

---

## 16. Accessibilité et ergonomie

Le drawer doit :

* être focusable
* être fermable via bouton et `Esc`
* conserver un titre accessible
* supporter navigation clavier
* garder des zones scrollables lisibles
* être utilisable sur écran portable
* se dégrader proprement en plein écran sur petits viewports

---

## 17. Performance

### MVP

* chargement lazy à l’ouverture
* pas de préchargement massif
* pagination simple des listes événements / allocations
* réutilisation du même drawer pour éviter remounts inutiles

### Optimisations futures

* préfetch au hover sur le titre
* cache léger du dernier drawer ouvert
* virtualisation si volumétrie élevée

---

## 18. Règles importantes

* aucune logique métier critique en frontend
* aucun recalcul “source de vérité” côté UI
* aucune écriture sans passer par l’API backend
* respect strict du client actif
* les libellés “commande” et “facture” sont une **projection UX** d’événements financiers backend

---

## 19. Critères de succès

La RFC est considérée réussie si :

1. cliquer sur le titre d’une ligne ouvre un drawer horizontal bas
2. le drawer charge le détail de la ligne sans navigation page complète
3. les montants consolidés sont visibles immédiatement
4. l’utilisateur peut consulter les événements financiers de la ligne
5. l’utilisateur peut créer une commande manuelle
6. l’utilisateur peut créer une facture manuelle
7. l’utilisateur peut consulter les allocations de la ligne
8. les mutations invalident correctement les données et rafraîchissent les montants
9. l’expérience reste fluide dans le cockpit budget

---

## 20. Ordre d’implémentation recommandé

### Phase 1

* state drawer
* trigger sur titre ligne
* structure drawer
* chargement `GET /budget-lines/:id`

### Phase 2

* KPI strip
* onglet overview
* onglet events lecture

### Phase 3

* dialog ajouter commande
* dialog ajouter facture
* mutation `POST /api/financial-events`

### Phase 4

* onglet allocations
* polish UX
* responsive
* accessibilité

### Phase 5

* onglet informations DSI enrichi
* liens futurs vers fournisseurs / contrats / licences

---

## 21. Décision UX finale

La navigation principale reste la page budget.
La **ligne budgétaire n’ouvre plus prioritairement une page dédiée**, mais un **grand volet horizontal bas de pilotage**.

La page `/budget-lines/[id]` peut rester :

* soit comme fallback deep-link
* soit comme vue détaillée secondaire
* soit être conservée pour des usages avancés

Mais l’UX standard devient :

> **tableau budget → clic sur ligne → drawer cockpit détaillé**