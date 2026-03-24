# RFC-RES-001 — Resource Registry (Catalogue de ressources projet)

## Statut

Partiellement implémenté (MVP)

## Priorité

Haute (fondation module projet)

## Dépendances

* RFC-011 — Modules, rôles et permissions
* RFC-013 — Audit logs
* RFC-014-2 — Frontend auth / active client / navigation
* RFC-PROJ-012 — Project Sheet
* RFC-RES-002 — Resource Assignment & Costing

---

# 1. Objectif

Mettre en place un **catalogue de ressources projet** permettant de :

* structurer les **ressources mobilisables dans les projets**
* préparer le **moteur d’affectation** (RFC-RES-002)
* permettre le **calcul du coût ressources**
* éviter la duplication des entités
* rendre le module **administrable et navigable** dans Starium Orchestra

👉 Cette RFC est une **fondation du module projet**, pensée pour évoluer vers un référentiel transverse.

---

# 2. Positionnement

Cette RFC introduit un **catalogue de ressources projet structuré**, avec une ouverture contrôlée vers plusieurs types de ressources.

Elle couvre dans un premier temps :

```text
Ressources projet :
- humaines (priorité MVP)
- matérielles (référentiel simple)
- licences (référentiel simple)
```

⚠️ Règle clé :

> Le MVP est centré sur les **ressources humaines (costing + staffing)**.
> Les autres types sont présents uniquement pour structurer le référentiel.

---

# 3. Problème résolu

Aujourd’hui :

* aucune structuration des ressources
* duplication des données (personnes, outils, licences)
* impossibilité de :

  * calculer un coût projet fiable
  * piloter la charge
  * standardiser les rôles
  * contrôler proprement l’accès au module

👉 Résultat :

* ROI projet imprécis
* arbitrage difficile
* pilotage CODIR limité
* administration non industrialisée

---

# 4. Périmètre MVP

## Inclus

* ressources humaines (complet)
* typologie des ressources (`HUMAN`, `MATERIAL`, `LICENSE`)
* rôles projet
* coût journalier (TJM / coût interne)
* activation / désactivation
* permissions backend `resources.*`
* rôles métier par défaut
* entrée de navigation dans la sidebar

## Inclus (léger — sans logique métier avancée)

* ressources matérielles (référentiel simple)
* licences (référentiel simple)

## Exclus

* planning détaillé
* timesheet
* gestion RH complète
* gestion de stock matériel
* gestion cycle de vie licences
* inventaire IT complet
* costing avancé hors humain
* charge / affectation détaillée (RFC-RES-002)

---

# 5. Concepts métier

## 5.1 Resource

Une ressource représente un **élément mobilisable dans un projet**.

Types :

```text
HUMAN
MATERIAL
LICENSE
```

## 5.2 Resource Role

Rôle projet (uniquement pour `HUMAN`) :

* Project Manager
* Developer
* Architect
* DSI
* Consultant

## 5.3 Resource usage

Tous les types peuvent être liés à un projet, mais avec des usages différents :

| Type     | Usage MVP       |
| -------- | --------------- |
| HUMAN    | staffing + coût |
| MATERIAL | informationnel  |
| LICENSE  | informationnel  |

## 5.4 Cost model

Applicable uniquement aux ressources humaines :

```text
dailyRate (TJM ou coût interne)
```

---

# 6. Modèle de données

## 6.1 Enum

```prisma
enum ResourceType {
  HUMAN
  MATERIAL
  LICENSE
}
```

## 6.2 Resource

```prisma
model Resource {
  id          String   @id @default(cuid())
  clientId    String

  name        String
  firstName   String?
  code        String?

  type        ResourceType

  // HUMAN uniquement
  email       String?

  roleId      String?
  role        ResourceRole? @relation(fields: [roleId], references: [id])

  affiliation ResourceAffiliation?
  companyName String?
  dailyRate   Decimal? @db.Decimal(12,2)

  // MATERIAL / LICENSE
  metadata    Json?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  client      Client   @relation(fields: [clientId], references: [id])

  @@unique([clientId, email])
  @@unique([clientId, code])
  @@index([clientId])
  @@index([clientId, type])
}
```

## 6.3 ResourceRole

```prisma
model ResourceRole {
  id        String   @id @default(cuid())
  clientId  String

  name      String
  code      String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  client    Client   @relation(fields: [clientId], references: [id])
  resources Resource[]

  @@unique([clientId, name])
  @@index([clientId])
}
```

---

# 7. Règles métier

## 7.1 Scope client

* toute ressource appartient à un `clientId`
* aucune ressource inter-client

## 7.2 Unicité

```text
(clientId, email) unique si type = HUMAN et email renseigné
(clientId, code) unique si code renseigné
```

## 7.3 Inactivation / suppression

* pas de suppression ou désactivation exposée dans l’API MVP actuelle
* la gestion de cycle de vie (archive/désactivation) reste à livrer

## 7.4 Coût

* `dailyRate` uniquement pour `HUMAN`
* si absent → coût non calculable

## 7.5 Cohérence

* `roleId` doit appartenir au même client
* aucune incohérence inter-client

## 7.6 Règles par type

### HUMAN

* peut avoir `email`, `roleId`, `dailyRate`
* utilisé pour affectation projet et calcul de coût

### MATERIAL

* pas de `email`, `roleId`, `dailyRate`
* utilisé comme référentiel simple
* informations portées par `metadata`

### LICENSE

* pas de `email`, `roleId`, `dailyRate`
* utilisé comme référentiel simple
* informations portées par `metadata`

---

# 8. Module et activation

Le catalogue de ressources doit être exposé comme un **module métier dédié**, activable par client, conformément à l’architecture modulaire de Starium Orchestra et au modèle d’activation par `Module` / `ClientModule` déjà en place.  

## 8.1 Code module

```text
resources
```

## 8.2 Activation

Le module peut être :

* `ENABLED`
* `DISABLED`

pour chaque client.

Quand le module est désactivé :

* aucune route `/api/resources*` n’est accessible
* aucune entrée sidebar “Ressources” n’est visible
* aucune permission `resources.*` n’est exploitable

---

# 9. RBAC du module

Le module doit suivre le pattern RBAC standard du projet :

```text
JwtAuthGuard
→ ActiveClientGuard
→ ModuleAccessGuard
→ PermissionsGuard
```

avec `@RequirePermissions(...)`, sans mélange de modules sur une même route. 

## 9.1 Permissions à créer

```text
resources.read
resources.create
resources.update
```

MVP : pas de `resources.delete`.

## 9.2 Matrice des permissions

| Action   | Permission         |
| -------- | ------------------ |
| GET      | `resources.read`   |
| GET /:id | `resources.read`   |
| POST     | `resources.create` |
| PATCH    | `resources.update` |

## 9.3 Endpoints protégés

Toutes les routes `/api/resources` et `/api/resource-roles` utilisent :

```text
JwtAuthGuard
ActiveClientGuard
ModuleAccessGuard
PermissionsGuard
```

---

# 10. Rôles par défaut du module

La RFC doit prévoir des **rôles métier par défaut** créés automatiquement pour le client lors de l’activation initiale du module, selon le modèle RBAC existant. 

## 10.1 Rôles par défaut à seed

### Resource Manager

Rôle d’administration métier du module.

Permissions :

```text
resources.read
resources.create
resources.update
```

### Resource Viewer

Rôle lecture seule.

Permissions :

```text
resources.read
```

## 10.2 Code de rôles recommandé

```text
resources_manager
resources_viewer
```

## 10.3 Règles

* ces rôles sont créés par client
* ils sont créés une seule fois
* leur création doit être idempotente
* ils peuvent ensuite être renommés côté client si la politique RBAC du projet l’autorise
* `CLIENT_ADMIN` n’implique pas automatiquement toutes les permissions métier ; l’accès réel reste porté par RBAC métier, conformément au modèle existant. 

---

# 11. API

## 11.1 Ressources

### Liste

```http
GET /api/resources
```

Filtres :

```text
type
isActive
search
offset
limit
```

### Création

```http
POST /api/resources
```

Exemple `HUMAN` :

```json
{
  "name": "Jean Dupont",
  "type": "HUMAN",
  "email": "jean@company.com",
  "roleId": "role_pm",
  "dailyRate": 600
}
```

Exemple `MATERIAL` :

```json
{
  "name": "Serveur AWS",
  "type": "MATERIAL",
  "metadata": {
    "provider": "AWS"
  }
}
```

### Mise à jour

```http
PATCH /api/resources/:id
```

### Détails

```http
GET /api/resources/:id
```

## 11.2 Rôles de ressources

### Liste

```http
GET /api/resource-roles
```

### Création

```http
POST /api/resource-roles
```

### Mise à jour

```http
PATCH /api/resource-roles/:id
```

---

# 12. Navigation frontend / menu gauche

La RFC doit explicitement prévoir l’intégration dans la **sidebar gauche**, conformément à l’architecture frontend et à la navigation déclarative du projet. 

## 12.1 Entrée de menu

Le module apparaît dans la navigation du scope client.

Proposition :

```text
Organisation
- Ressources
```

ou, si tu veux rester très orienté projet :

```text
Pilotage
- Ressources
```

## 12.2 Décision recommandée

Pour Starium Orchestra, le plus cohérent en MVP est :

```text
Organisation
- Ressources
```

car le registre sert plusieurs projets d’un même client.

## 12.3 Visibilité du menu

L’entrée sidebar “Ressources” n’est visible que si :

* un client actif est sélectionné
* le module `resources` est `ENABLED`
* l’utilisateur possède au minimum `resources.read`

## 12.4 Route frontend

```text
/resources
```

## 12.5 Pages MVP

* `/resources` → liste filtrable
* `/resources/new` → création d’une ressource
* `/resources/[id]` → fiche ressource
* `/resources/roles` → catalogue des rôles de ressources

---

# 13. Sécurité

Guards standards :

```text
JwtAuthGuard
ActiveClientGuard
ModuleAccessGuard
PermissionsGuard
```

Permissions :

```text
resources.read
resources.create
resources.update
```

Toutes les requêtes sont strictement scopées par `clientId`, conformément aux règles produit du projet. 

---

# 14. Audit logs

À ajouter :

```text
resource.created
resource.updated
resource.deactivated
resource_role.created
resource_role.updated
```

Convention alignée sur RFC-013. 

---

# 15. Intégration avec module projet

## 15.1 Resource Assignment (RFC-RES-002)

```text
Project
  → ResourceAssignment
       → Resource
```

## 15.2 Impact fiche projet

Permettra de calculer :

```text
resourceCost = Σ (jours × dailyRate)
```

⚠️ En MVP :

* le coût ressources peut être partiel
* il ne doit pas bloquer la fiche projet si l’affectation détaillée n’est pas encore livrée

---

# 16. Exemple métier

Projet ERP :

```text
Chef de projet → HUMAN → 600€/j
Développeur → HUMAN → 500€/j
Licence SAP → LICENSE → référentiel simple
Serveur AWS → MATERIAL → référentiel simple
```

---

# 17. Évolutions futures

* compétences (`skills`)
* capacité / disponibilité
* charge multi-projets
* timesheet
* costing matériel / licence
* référentiel transverse global
* liens avec fournisseurs / contrats / actifs IT

---

# 18. Résultat attendu

Un module permettant :

* la structuration des ressources projet
* l’administration contrôlée via RBAC
* la navigation dans le cockpit
* la préparation du staffing
* le calcul futur du coût projet
* l’amélioration du ROI et de l’arbitrage

---

# 19. Décision clé

👉 Le catalogue :

* est **typé** (`HUMAN / MATERIAL / LICENSE`)
* est **simple en MVP**
* est **protégé par RBAC**
* possède des **rôles par défaut**
* est **visible dans la sidebar gauche**
* est **centré sur la valeur projet**

---

## 20. État d’implémentation constaté (2026-03-24)

Livré :

* module backend `resources` + `resource-roles`
* guards standards (`JwtAuthGuard`, `ActiveClientGuard`, `ModuleAccessGuard`, `PermissionsGuard`)
* permissions `resources.read`, `resources.create`, `resources.update`
* bootstrap des rôles par défaut (`resources_manager`, `resources_viewer`)
* pages frontend `/resources`, `/resources/new`, `/resources/[id]`, `/resources/roles`
* entrée sidebar “Organisation > Ressources”

Non livré (reste hors scope MVP actuel) :

* endpoint de désactivation (`POST /api/resources/:id/deactivate`)
* champ métier `isActive` et filtrage associé