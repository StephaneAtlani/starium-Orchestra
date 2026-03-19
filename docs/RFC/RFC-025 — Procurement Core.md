# RFC-025 — Procurement Core  
## Fournisseurs, commandes, factures & création rapide

## Statut  
Draft

---

# 1. Objectif

Introduire un **domaine Procurement Core** permettant de modéliser :

- fournisseurs  
- commandes (engagements)  
- factures (consommation)  

et de les connecter au **Financial Core** existant.

👉 Objectif clé :

> passer d’un moteur financier abstrait à un **pilotage réel des dépenses IT**

---

# 2. Problème adressé

Aujourd’hui :

- `FinancialEvent` = abstraction
- pas d’entités métier réelles
- pas de pilotage fournisseur

👉 Impossible de répondre à :

- dépenses par fournisseur  
- factures en attente  
- engagements ouverts  

---

# 3. Principes directeurs

## 3.1 Séparation stricte

- Procurement = métier  
- Financial Core = calcul  

---

## 3.2 Backend = source de vérité

- aucune logique critique en frontend  
- API-first  

---

## 3.3 Multi-client strict

- toutes les entités ont `clientId`  
- scope via client actif  

---

## 3.4 Intégration budget native

- commande → engagement  
- facture → consommation  

---

# 4. Périmètre

## Inclus

- fournisseurs  
- commandes  
- factures  
- lien budget  
- génération FinancialEvent  
- audit logs  
- création rapide fournisseur  

## Hors périmètre

- workflow validation  
- multi-lignes  
- OCR  
- ERP  
- rapprochement avancé  

---

# 5. Cas d’usage

## 5.1 Fournisseur

Créer Microsoft, AWS, ESN, etc.

## 5.2 Commande

- engagement budgétaire  
- ex : abonnement SaaS annuel  

## 5.3 Facture

- consommation réelle  
- ex : facture AWS mensuelle  

## 5.4 Lien commande → facture

- facture partielle ou totale  

## 5.5 Création fournisseur à la volée

- saisir “Microsoft”  
- cliquer “Créer”  
- continuer sans rupture  

---

# 6. Concepts métier

## Supplier

Fournisseur / prestataire

## PurchaseOrder

Engagement budgétaire

## Invoice

Consommation réelle

---

# 7. Modèle de données

## 7.1 Enums

```prisma
enum SupplierStatus {
  ACTIVE
  INACTIVE
  ARCHIVED
}

enum PurchaseOrderStatus {
  DRAFT
  ISSUED
  APPROVED
  PARTIALLY_INVOICED
  FULLY_INVOICED
  CANCELLED
}

enum InvoiceStatus {
  RECEIVED
  VALIDATED
  PAID
  CANCELLED
}
````

---

## 7.2 Supplier

```prisma
model Supplier {
  id        String   @id @default(cuid())
  clientId  String
  name      String
  code      String?
  siret     String?
  vatNumber String?
  status    SupplierStatus @default(ACTIVE)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  purchaseOrders PurchaseOrder[]
  invoices       Invoice[]

  @@unique([clientId, name])
}
```

---

## 7.3 PurchaseOrder

```prisma
model PurchaseOrder {
  id           String   @id @default(cuid())
  clientId     String
  supplierId   String
  budgetLineId String?

  reference    String
  label        String

  amountHt     Decimal
  taxRate      Decimal?
  taxAmount    Decimal?
  amountTtc    Decimal?

  orderDate    DateTime
  status       PurchaseOrderStatus

  invoices     Invoice[]

  @@unique([clientId, reference])
}
```

---

## 7.4 Invoice

```prisma
model Invoice {
  id               String   @id @default(cuid())
  clientId         String
  supplierId       String
  budgetLineId     String?
  purchaseOrderId  String?

  invoiceNumber    String
  label            String

  amountHt         Decimal
  taxRate          Decimal?
  taxAmount        Decimal?
  amountTtc        Decimal?

  invoiceDate      DateTime
  status           InvoiceStatus

  @@unique([clientId, invoiceNumber, supplierId])
}
```

---

# 8. Intégration Financial Core

## 8.1 Commande

```text
COMMITMENT_REGISTERED
sourceType = PURCHASE_ORDER
```

👉 impact : committedAmount

---

## 8.2 Facture

```text
CONSUMPTION_REGISTERED
sourceType = INVOICE
```

👉 impact : consumedAmount

---

## 8.3 Règle clé

❌ pas de calcul dans procurement
✔️ tout passe par financial-core

---

# 9. TVA / HT / TTC

* Decimal uniquement
* stockage complet : HT / TVA / TTC
* conformité RFC-006

---

# 10. Règles métier

## 10.1 Cohérence client

tout doit être dans le même client

---

## 10.2 Fournisseur obligatoire

commande / facture = supplier requis

---

## 10.3 BudgetLine optionnelle

si absente → pas de FinancialEvent

---

## 10.4 Unicité

* commande : reference unique
* facture : unique par fournisseur

---

## 10.5 Annulation

via status uniquement

---

## 10.6 Cohérence commande / facture

* même fournisseur
* même client

---

## 10.7 Création rapide fournisseur

### Objectif

Créer un fournisseur en 1 clic sans quitter le flux.

---

### Donnée minimale

```json
{
  "name": "Microsoft"
}
```

---

### Comportement

* trim automatique
* nom obligatoire
* si existe → retourne existant
* sinon → création

---

### Endpoint

```text
POST /api/suppliers/quick-create
```

---

### Réponse

```json
{
  "id": "sup_xxx",
  "name": "Microsoft"
}
```

---

### Permissions

* inclus dans `procurement.create`

---

### Audit

```text
supplier.created
creationMode = QUICK_CREATE
```

---

### UX attendue

* champ autocomplete
* si pas trouvé → “Créer ‘X’”
* sélection automatique

---

# 11. API

## Suppliers

```text
GET /api/suppliers
POST /api/suppliers
POST /api/suppliers/quick-create
PATCH /api/suppliers/:id
```

---

## Purchase Orders

```text
GET /api/purchase-orders
POST /api/purchase-orders
PATCH /api/purchase-orders/:id
```

---

## Invoices

```text
GET /api/invoices
POST /api/invoices
PATCH /api/invoices/:id
```

---

## Endpoints contextuels

```text
GET /api/suppliers/:id/invoices
GET /api/suppliers/:id/purchase-orders
GET /api/budget-lines/:id/invoices
GET /api/budget-lines/:id/purchase-orders
```

---

# 12. DTO

## CreatePurchaseOrderDto

```text
supplierId OR supplierName
budgetLineId?
reference
label
amountHt / amountTtc
taxRate
orderDate
```

👉 si `supplierId` absent et `supplierName` présent
→ quick create automatique

---

## CreateInvoiceDto

```text
supplierId OR supplierName
budgetLineId?
purchaseOrderId?
invoiceNumber
label
amountHt / amountTtc
taxRate
invoiceDate
```

---

# 13. Structure module

```text
procurement/
  suppliers/
  purchase-orders/
  invoices/
```

---

# 14. Audit logs

```text
supplier.created
purchase_order.created
invoice.created
```

---

# 15. Réponses API

```json
{
  "items": [],
  "total": 0,
  "limit": 20,
  "offset": 0
}
```

---

# 16. Séquences

## Commande

* create PO
* create FinancialEvent
* recalcul

## Facture

* create invoice
* create FinancialEvent
* recalcul

---

# 17. Frontend

* select fournisseur dynamique
* création inline
* intégration drawer budget

---

# 18. Valeur produit

👉 transformation majeure :

**avant**

* moteur financier

**après**

* cockpit DSI / DAF

---

# 19. Critères de succès

* fournisseurs créables
* commandes créables
* factures créables
* impact budget réel
* quick create fonctionnel
* audit OK
* multi-client respecté

---

# 20. Recommandation

Ordre d’implémentation :

1. Supplier + quick create
2. PurchaseOrder
3. Invoice
4. FinancialEvent auto
5. UI

---

# Conclusion

👉 Cette RFC transforme Starium Orchestra :

**outil de budget → cockpit de pilotage IT**

```

---
