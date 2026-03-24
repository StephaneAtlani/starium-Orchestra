# RFC-PROJ-014 — Catégories du portefeuille projets

## Statut

Proposé

## Objectif

Mettre en place un **référentiel de catégories de portefeuille configurable par client** pour structurer le cockpit projets selon une arborescence simple et stable :

* **Niveau 1 : Catégorie**
* **Niveau 2 : Sous-catégorie**
* rattachement métier ensuite de :

  * **Project**
  * **Activity**

Cette RFC couvre uniquement le **référentiel d’arborescence**.
Le rattachement de `Project` et `Activity` à une sous-catégorie est traité dans **RFC-PROJ-015**.
Les agrégations portefeuille par catégorie sont traitées dans **RFC-PROJ-016**.

---

# 1. Périmètre

## Inclus

* référentiel client de catégories portefeuille
* hiérarchie limitée à **2 niveaux**
* CRUD backend des catégories
* écran d’administration dans **Projects / Options**
* ordre d’affichage
* activation / désactivation
* isolation stricte par `clientId`
* base par défaut Starium duplicable ou seedée par client

## Exclu

* rattachement des projets aux catégories
* rattachement des activités aux catégories
* KPI et agrégations portefeuille
* profondeur infinie
* catégories globales partagées entre clients à l’exécution
* refonte de la navigation portefeuille

---

# 2. Décision produit

## Modèle cible

Le portefeuille est structuré par une arborescence métier simple :

* **Catégorie**
* **Sous-catégorie**

Les `Project` et `Activity` ne sont **pas** des nœuds de l’arbre.

## Règle MVP non négociable

La profondeur maximale est de **2 niveaux** :

* niveau 1 : catégorie racine
* niveau 2 : sous-catégorie

Aucun niveau supplémentaire ne peut être créé.

## Finalité métier

Cette structure sert à :

* organiser le portefeuille
* filtrer les vues
* regrouper les projets et activités
* produire une lecture lisible pour DSI / CODIR / DG

---

# 3. Règles métier

## Structure

* une catégorie racine a `parentId = null`
* une sous-catégorie a `parentId` pointant vers une catégorie racine
* une sous-catégorie ne peut pas avoir d’enfant
* une catégorie inactive reste historisée
* la suppression physique est déconseillée si des rattachements existent plus tard

## Unicité

Pour un client donné :

* deux catégories sœurs ne peuvent pas avoir le même nom sous le même parent
* unicité logique portée par : `clientId + parentId + normalizedName`

## Ordre

Chaque nœud possède un champ `sortOrder` :

* tri croissant dans l’affichage
* réorganisation possible par client depuis l’écran d’options

## Activation

Chaque nœud possède un champ `isActive` :

* `true` par défaut
* un nœud inactif n’est plus proposé dans les sélecteurs
* un nœud inactif peut rester visible dans les écrans d’administration

## Isolation client

Toutes les opérations sont strictement limitées au `clientId` actif :

* aucune lecture cross-client
* aucune mutation cross-client
* backend source de vérité

---

# 4. Modèle de données

## Nouveau modèle Prisma

```prisma
model ProjectPortfolioCategory {
  id         String   @id @default(cuid())
  clientId   String
  parentId   String?
  name       String
  slug       String?
  color      String?
  icon       String?
  sortOrder  Int      @default(0)
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  client     Client                    @relation(fields: [clientId], references: [id], onDelete: Cascade)
  parent     ProjectPortfolioCategory? @relation("ProjectPortfolioCategoryTree", fields: [parentId], references: [id], onDelete: Restrict)
  children   ProjectPortfolioCategory[] @relation("ProjectPortfolioCategoryTree")

  @@index([clientId])
  @@index([clientId, parentId])
  @@index([clientId, isActive])
  @@unique([clientId, parentId, name])
}
```

## Remarques

* `parentId = null` : catégorie racine
* `parentId != null` : sous-catégorie
* `slug`, `color`, `icon` sont optionnels mais utiles côté UI
* `@@unique([clientId, parentId, name])` couvre l’unicité dans un même niveau de parent

## Validation applicative complémentaire

Le backend doit aussi vérifier :

* que `parentId` appartient bien au même `clientId`
* que le parent visé est une racine
* qu’on ne crée jamais un niveau 3

---

# 5. API backend

## Module

Créer un sous-domaine dédié dans `projects` :

* `project-portfolio-categories.controller.ts`
* `project-portfolio-categories.service.ts`
* DTO dédiés
* usage des guards existants :

  * `JwtAuthGuard`
  * `ActiveClientGuard`
  * `ModuleAccessGuard`
  * `PermissionsGuard`

## Routes proposées

### Liste arborescente

```http
GET /api/projects/options/portfolio-categories
```

Retour attendu :

* liste arborescente ou liste plate structurée
* uniquement pour le `clientId` actif

### Détail

```http
GET /api/projects/options/portfolio-categories/:id
```

### Création racine

```http
POST /api/projects/options/portfolio-categories
```

Body exemple :

```json
{
  "name": "Transformation",
  "color": "#DB9801",
  "icon": "folder",
  "sortOrder": 10
}
```

### Création sous-catégorie

```http
POST /api/projects/options/portfolio-categories
```

Body exemple :

```json
{
  "name": "ERP",
  "parentId": "cat_root_123",
  "sortOrder": 20
}
```

### Mise à jour

```http
PATCH /api/projects/options/portfolio-categories/:id
```

Champs modifiables :

* `name`
* `color`
* `icon`
* `sortOrder`
* `isActive`
* `parentId` uniquement si la règle de profondeur reste valide

### Réorganisation

```http
POST /api/projects/options/portfolio-categories/reorder
```

Body exemple :

```json
{
  "items": [
    { "id": "cat_1", "sortOrder": 10 },
    { "id": "cat_2", "sortOrder": 20 }
  ]
}
```

### Désactivation / activation

Peut passer par `PATCH`, pas besoin d’endpoint séparé.

### Suppression

```http
DELETE /api/projects/options/portfolio-categories/:id
```

En MVP, suppression autorisée uniquement si :

* pas d’enfants
* aucun rattachement métier futur bloquant

Sinon, privilégier la désactivation.

---

# 6. DTO et validations

## CreateProjectPortfolioCategoryDto

```ts
name: string;
parentId?: string | null;
color?: string | null;
icon?: string | null;
sortOrder?: number;
```

## UpdateProjectPortfolioCategoryDto

```ts
name?: string;
parentId?: string | null;
color?: string | null;
icon?: string | null;
sortOrder?: number;
isActive?: boolean;
```

## Validations métier obligatoires

* `name` non vide, trim obligatoire
* refus des doublons sur un même parent
* `parentId` inexistant => erreur 404
* `parentId` d’un autre client => 404 ou 403 selon convention existante
* parent non racine => erreur métier
* tentative de niveau 3 => erreur métier explicite
* refus d’auto-référence
* refus de cycle, même si la profondeur 2 limite déjà ce cas

---

# 7. Règles de service

## create()

* récupérer `clientId` depuis `request.activeClient`
* si `parentId` absent : créer une racine
* si `parentId` présent :

  * charger le parent
  * vérifier même client
  * vérifier que le parent est une racine
  * créer la sous-catégorie

## update()

* interdire tout passage vers un niveau 3
* si changement de parent :

  * vérifier la validité du nouveau parent
  * vérifier unicité du nom dans le nouveau parent
* conserver l’intégrité de l’arbre

## delete()

* si enfants existants : refuser
* si rattachements existants plus tard : refuser
* sinon suppression autorisée
* en pratique produit : privilégier `isActive = false`

## list()

Deux formats possibles :

* soit retourner une structure déjà hiérarchisée
* soit retourner une liste plate triée avec `parentId`

Recommandation : retourner une structure hiérarchique directement exploitable par le frontend.

---

# 8. Permissions

Conserver le pattern RBAC existant du module `projects`.

Permissions recommandées :

* `projects.read` : lecture du référentiel
* `projects.update` : création / modification / suppression / réorganisation

Pas de nouveau module de permissions requis pour cette RFC sauf si tu veux une granularité fine plus tard du type :

* `projects.options.read`
* `projects.options.update`

En MVP, rester aligné avec l’existant.

---

# 9. Audit logs

Ajouter des logs dédiés sur le domaine projet :

* `project.portfolio-category.created`
* `project.portfolio-category.updated`
* `project.portfolio-category.deleted`
* `project.portfolio-category.reordered`
* `project.portfolio-category.activated`
* `project.portfolio-category.deactivated`

## ResourceType recommandé

```ts
PROJECT_PORTFOLIO_CATEGORY
```

## Payload minimal

* `id`
* `clientId`
* `name`
* `parentId`
* `sortOrder`
* `isActive`

En update, journaliser le diff comme dans les autres modules Starium.

---

# 10. Frontend attendu

## Écran

Route recommandée :

```txt
/projects/options
```

Section dédiée :

```txt
Catégories du portefeuille
```

## Comportements

* afficher l’arbre sur 2 niveaux
* créer une catégorie
* créer une sous-catégorie
* éditer nom / couleur / icône / statut
* réordonner
* désactiver / réactiver
* empêcher visuellement l’ajout d’un niveau 3

## UX attendue

* vue hiérarchique simple
* actions inline ou menu contextuel
* confirmation avant suppression
* badge actif / inactif
* message explicite si suppression impossible

---

# 11. Seed / base par défaut Starium

Le produit peut proposer une base par défaut réutilisable par client, par exemple :

* Run

  * Maintenance applicative
  * Support & exploitation
* Transformation

  * ERP
  * Data & BI
* Infrastructure

  * Réseau
  * Poste de travail
* Cybersécurité

  * Conformité
  * Remédiation

## Règle de mise en œuvre

Cette base ne doit pas être une donnée globale partagée à l’exécution.
Elle doit être :

* soit injectée au moment de la création du client
* soit proposée comme modèle à dupliquer

Chaque client reste propriétaire de sa structure.

---

# 12. Cas limites

* création d’une sous-catégorie sous une sous-catégorie : refus
* déplacement d’une racine sous une sous-catégorie : refus
* déplacement créant un niveau 3 : refus
* renommage sur un nom déjà pris sous le même parent : refus
* suppression d’une catégorie avec enfants : refus
* désactivation d’un parent avec enfants actifs : autorisée en MVP si affichage cohérent, sinon refuser par simplification
* parent d’un autre client : refus

---

# 13. Critères d’acceptation

## Backend

* un client peut gérer ses catégories portefeuille
* l’arborescence est limitée à 2 niveaux
* aucune fuite cross-client n’est possible
* l’unicité par parent est garantie
* l’ordre d’affichage est persisté
* l’activation / désactivation fonctionne
* les audit logs sont produits

## Frontend

* un client admin peut administrer son arborescence dans `Projects / Options`
* l’arbre est lisible et stable
* impossible via UI de créer un niveau 3
* l’ordre est modifiable
* les catégories inactives sont identifiables

---

# 14. Hors RFC / suites

Les RFC suivantes dépendent directement de celle-ci :

* **RFC-PROJ-015 — Project / Activity Mapping**

  * rattacher `Project` et `Activity` à une sous-catégorie

* **RFC-PROJ-016 — Portfolio Aggregation**

  * exposer les KPI portefeuille par catégorie / sous-catégorie

---

# 15. Décision finale

Cette RFC introduit le **socle de structuration du portefeuille projets**.
Sans elle, le module projet reste une liste fonctionnelle.
Avec elle, Starium commence à devenir un **cockpit portefeuille pilotable**, lisible et exploitable par un DSI ou un CODIR.
