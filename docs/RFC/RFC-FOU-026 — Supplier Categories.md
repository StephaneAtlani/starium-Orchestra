# RFC-FOU-026 — Supplier Categories

## Statut

Draft

## Priorité

Haute

## Dépendances

* RFC-025 — Procurement Core
* RFC-025-A — Supplier Core (Hardening)
* Architecture Starium Orchestra (multi-tenant, API-first) 

---

# 1. Objectif

Introduire un référentiel **Supplier Categories** permettant de :

* classifier les fournisseurs par type métier (cloud, ERP, télécom…)
* structurer le portefeuille fournisseurs
* améliorer la lisibilité cockpit (DG / DSI / DAF)
* permettre filtres, regroupements et KPI

👉 Ce référentiel transforme une liste plate de fournisseurs en **vision pilotable**.

---

# 2. Problème adressé

Aujourd’hui, même avec un bon référentiel fournisseur :

* aucune segmentation métier
* impossible de répondre à :

  * “combien on dépense en cloud ?”
  * “quels fournisseurs critiques sécurité ?”
* difficulté de priorisation et arbitrage

👉 Sans catégorisation :

> le cockpit reste **opérationnel mais pas décisionnel**

---

# 3. Positionnement produit

Supplier Categories est :

* un **référentiel métier configurable par client**
* un **axe d’analyse stratégique**
* une **clé de lecture cockpit**

Ce n’est pas :

* un simple tag libre
* un champ texte
* un attribut optionnel sans impact

---

# 4. Périmètre

## Inclus

* modèle `SupplierCategory`
* CRUD backend
* assignation d’une catégorie à un supplier (1:1 en MVP)
* filtre API par catégorie
* normalisation + unicité
* audit logs

## Exclus (MVP)

* hiérarchie multi-niveaux
* multi-catégories par supplier
* catégorisation automatique IA
* scoring / criticité
* catégorisation globale plateforme

---

# 5. Principes d’architecture

## 5.1 Multi-tenant strict

* une catégorie appartient à un `clientId`
* aucune mutualisation inter-client
* scope obligatoire via `ActiveClientGuard` 

## 5.2 Backend source de vérité

* validation unicité
* normalisation
* cohérence assignation supplier

## 5.3 Simplicité MVP

* **1 supplier = 1 catégorie max**
* pas de hiérarchie
* pas de complexité inutile

---

# 6. Cas d’usage

## 6.1 Création de catégories

Exemples :

* Cloud
* Télécom
* ERP
* Cybersécurité
* SaaS
* Infrastructure

## 6.2 Assignation

Un fournisseur AWS → catégorie “Cloud”
Un fournisseur Orange → “Télécom”

## 6.3 Filtrage

* liste fournisseurs par catégorie
* cockpit : dépenses par catégorie

---

# 7. Modèle de données

## 7.1 Prisma

```prisma
model SupplierCategory {
  id             String   @id @default(cuid())
  clientId       String

  name           String
  normalizedName String
  code           String?

  color          String?   // pour UI cockpit
  icon           String?   // optionnel

  isActive       Boolean   @default(true)

  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  client         Client    @relation(fields: [clientId], references: [id], onDelete: Cascade)
  suppliers      Supplier[]

  @@index([clientId])
  @@unique([clientId, normalizedName])
}
```

---

## 7.2 Évolution Supplier

Ajouter dans `Supplier` :

```prisma
supplierCategoryId String?

supplierCategory   SupplierCategory? @relation(fields: [supplierCategoryId], references: [id], onDelete: SetNull)

@@index([supplierCategoryId])
```

---

# 8. Règles de gestion

## 8.1 Nom obligatoire

* `name` requis
* non vide après trim

## 8.2 Normalisation

```text
normalizedName = trim + lowercase + collapse spaces
```

## 8.3 Unicité

* unique par `(clientId, normalizedName)`

## 8.4 Désactivation

* `isActive = false`
* ne supprime pas les suppliers existants
* empêche nouvelle assignation

## 8.5 Assignation supplier

* optionnelle
* 1 seule catégorie par supplier (MVP)
* si catégorie supprimée → `supplierCategoryId = null`

---

# 9. API

## 9.1 Endpoints

```text
GET    /api/supplier-categories
POST   /api/supplier-categories
PATCH  /api/supplier-categories/:id
DELETE /api/supplier-categories/:id (soft delete → isActive=false)
```

## 9.2 Intégration Supplier

```text
PATCH /api/suppliers/:id
{
  supplierCategoryId: "cat_xxx"
}
```

## 9.3 Filtres

```text
GET /api/suppliers?supplierCategoryId=cat_xxx
```

---

# 10. DTOs

## CreateSupplierCategoryDto

```ts
name: string;
code?: string;
color?: string;
icon?: string;
```

## UpdateSupplierCategoryDto

Tous les champs optionnels

---

# 11. Service

## SupplierCategoriesService

Fonctions :

* `list(clientId)`
* `create(clientId, dto)`
* `update(clientId, id, dto)`
* `deactivate(clientId, id)`

## Règles

* normalisation systématique
* rejet si doublon
* refus update si conflit

---

# 12. Audit logs

Actions :

```text
supplier_category.created
supplier_category.updated
supplier_category.deactivated
supplier.category_assigned
```

Audit conforme RFC-013 

---

# 13. Tests

## Unit

* création catégorie
* conflit normalizedName
* update avec conflit
* désactivation
* assignation supplier

## Intégration

* filtrage supplier par catégorie
* assignation cross-client refusée
* catégorie inactive non assignable

---

# 14. Frontend (non inclus dans ce ticket)

Prévu :

* dropdown catégorie dans Supplier
* filtre dans liste fournisseurs
* couleurs dans cockpit

---

# 15. Ordre d’implémentation

1. Prisma (SupplierCategory + relation Supplier)
2. migration
3. service backend
4. endpoints
5. assignation Supplier
6. tests
7. (frontend plus tard)

---

# 16. Critères de succès

* une catégorie peut être créée / modifiée / désactivée
* un supplier peut être catégorisé
* aucun doublon de catégorie
* filtrage opérationnel
* aucun impact sur multi-tenant
* aucun impact sur PO / Invoice

---

# 17. Décision finale

Supplier Categories introduit un **axe de lecture stratégique du procurement** :

> on passe de “liste de fournisseurs”
> à “portefeuille structuré pilotable”
