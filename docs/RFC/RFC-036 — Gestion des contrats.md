# RFC-036 — Gestion des contrats (fournisseur / IT)

## Statut

**Draft (spécification)** — **implémentation code livrée** : modèle Prisma `SupplierContract` + `ContractAttachment`, API `/api/contracts` et `/api/contracts/:contractId/attachments`, module RBAC `contracts`, UI `/contracts` (liste, fiche, pièces jointes). Voir migration `20260419120000_rfc036_supplier_contracts`, `apps/api/src/modules/contracts/`, `apps/web/src/features/contracts/`.

## Priorité

Haute pour le **pilotage DSI multi-clients** : visibilité sur cadres contractuels, échéances, renouvellements et lien avec **fournisseurs** et, plus tard, **engagements** (commandes) et **consommation** (factures).

## Dépendances

* [RFC-FOU-025-A — Supplier Core](./RFC-FOU-025-A%20%E2%80%94%20Supplier%20Core%20(Hardening%20%26%20Alignment).md) — fournisseur obligatoire comme contrepartie métier
* [RFC-025 — Procurement Core](./RFC-025%20%E2%80%94%20Procurement%20Core.md) — commandes / factures ; lien optionnel contrat → PO / facture en phase ultérieure
* [RFC-034 — Documents et GED](./RFC-034%20%E2%80%94%20Documents%20et%20GED%20%E2%80%94%20Devis%20Commande%20Facture.md) / [RFC-035 — Stockage procurement](./RFC-035%20%E2%80%94%20Procurement%20stockage%20local%20et%20dual%20backend.md) — **réutilisation** du même principe de stockage (local / S3, API stream) pour les **pièces contrat** (phase pièces jointes)
* [RFC-013 — Audit logs](./RFC-013%20%E2%80%94%20Audit%20logs.md) — traçabilité des mutations
* UI : [docs/FRONTEND_UI-UX.md](../FRONTEND_UI-UX.md) — états loading / error / empty ; **libellés métier** (fournisseur, statuts, types) — **jamais** d’ID brut affiché

---

# 1. Analyse de l’existant

## 1.1 Vision et catalogue modules

* [docs/VISION_PRODUIT.md](../VISION_PRODUIT.md) cite explicitement les **contrats** dans le périmètre produit (pilotage fournisseurs et contrats).
* Le catalogue de modules plateforme inclut la notion de module **contracts** (référence schéma / seeds historiques) ; des permissions du type `contracts.read` / `contracts.create` / `contracts.update` / `contracts.delete` sont **attendues** côté RBAC (alignement à vérifier dans `seed` / `AdminPermission` au moment de l’implémentation).

## 1.2 Financial Core

* L’enum Prisma **`FinancialSourceType`** contient déjà la valeur **`CONTRACT`**, ce qui permettra, dans une phase ultérieure, de rattacher **allocations** ou **`FinancialEvent`** à un contrat sans casser le modèle transversal.
* Aujourd’hui, **aucune** entité métier « contrat » n’alimente ce `sourceType` : la valeur est **préparatoire**.

## 1.3 Procurement

* **`Supplier`**, **`PurchaseOrder`**, **`Invoice`** sont en place (`clientId`, montants HT/TVA/TTC, liens budget optionnels).
* **Aucun** lien `purchaseOrderId` / `invoiceId` → contrat n’existe : les commandes et factures ne portent pas encore de référence contractuelle structurée.

## 1.4 Documents

* **`ProcurementAttachment`** couvre **uniquement** PO et facture (contrainte XOR). Les pièces **contrat** nécessitent soit un **nouveau parent** dédié (`supplierContractId`), soit une **généralisation** du registre GED (hors périmètre MVP si on veut livrer vite : préférer `ContractAttachment` miroir du pattern RFC-034 avec réutilisation du **même** service de stockage que le procurement).

## 1.5 Projets

* **`ProjectDocumentCategory`** inclut **`CONTRACT`** pour les documents **projet** ; ce n’est **pas** le même objet métier qu’un **contrat fournisseur** cadre. Un lien optionnel **projet ↔ contrat** peut être une **phase 2** (portfolio, dépendances).

## 1.6 Lacunes

1. Pas de **registre contractuel** client-scopé (référence interne, dates, renouvellement, statut).
2. Pas de **vue consolidée** « contrats qui expirent » / préavis pour le CODIR ou le DSI fractionné.
3. Pas de **pièces** rattachées au contrat dans le même pipeline sécurisé que la GED procurement.
4. Pas de **liaison** explicite contrat → commande / facture (traçabilité de l’engagement au cadre juridique).

---

# 2. Hypothèses éventuelles

| ID | Hypothèse |
| --- | --- |
| **H1** | Un **contrat** est toujours rattaché à **exactement un** `Supplier` du **même** `clientId` ; pas de contrat « sans fournisseur » en V1. |
| **H2** | **Multi-client strict** : toutes les requêtes et écritures filtrent / valident par **client actif** (header / guard existants) ; jamais de fuite inter-client. |
| **H3** | La **référence métier** (`reference` ou `code`) est **unique par client** (comme pour les PO), pour éviter les doublons de saisie. |
| **H4** | Les montants contractuels en V1 sont **informatifs** (plafond, TCAM, valeur annuelle) : la **vérité financière** reste **`FinancialEvent`** / lignes budget ; pas de double comptabilité automatique sans règles métier explicites (phase ultérieure). |
| **H5** | **Signature électronique qualifiée**, **clause library**, **OCR** et **workflow juridique multi-niveaux** : **hors MVP**. |
| **H6** | **Renouvellement** : en V1, champs **déclaratifs** (type de renouvellement, date de fin, préavis en jours) ; **notifications** et **tâches** = phase 2. |
| **H7** | **Pièces jointes** : même contraintes sécurité que RFC-034/035 (pas d’URL signée navigateur → S3 en V1, accès **uniquement** via API). |

---

# 3. Liste des fichiers à créer / modifier (cible implémentation)

## 3.1 Backend (NestJS)

| Fichier / zone | Action |
| --- | --- |
| `apps/api/prisma/schema.prisma` | Modèles **`SupplierContract`**, enums statut / type / mode de renouvellement ; relations `Client`, `Supplier` ; optionnel **`ContractAttachment`** (FK `supplierContractId`) + réutilisation champs stockage alignés `ProcurementAttachment` |
| `apps/api/prisma/migrations/*` | Migration avec index `(clientId)`, `(clientId, supplierId)`, `(clientId, endDate)`, unicité `(clientId, reference)` |
| `apps/api/src/modules/contracts/` (ou `supplier-contracts/`) | `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`, tests |
| Garde / permissions | `JwtAuthGuard`, client actif, **`contracts.read`**, **`contracts.create`**, **`contracts.update`**, **`contracts.delete`** (ou granularité retenue par le produit) |
| Stockage pièces | Réutiliser **`ProcurementObjectStorageService`** (ou extraire un **`ClientBlobStorageService`** partagé) + contrôleur **`/api/contracts/:id/attachments`** (miroir logique RFC-034) |
| `docs/API.md` | Documenter les routes et codes d’erreur |

## 3.2 Frontend (Next.js)

| Fichier / zone | Action |
| --- | --- |
| `apps/web/src/features/contracts/` | API client, types, query keys tenant-aware, hooks |
| Pages | Liste `/contracts`, fiche `/contracts/[id]` (ou sous-menu procurement selon IA produit) |
| Formulaires | Select fournisseur avec **libellé** (nom, code) ; statuts / types en **libellés** ; pas d’UUID affiché |
| Pièces jointes | Panneau type `procurement-attachments-panel` une fois API disponible |

## 3.3 Documentation

| Fichier | Action |
| --- | --- |
| `docs/RFC/_RFC Liste.md` | Entrée **RFC-036** |
| `docs/ARCHITECTURE.md` | Court paragraphe module contrats + isolation client (après implémentation) |

---

# 4. Spécification fonctionnelle

## 4.1 Objet métier

**Contrat fournisseur / IT** : accord-cadre, contrat de licence, prestation, maintenance, etc., opposant le **client Orchestra** (l’organisation active) à un **fournisseur** référencé.

### Champs métier (V1)

* **Identification** : `reference` (réf. interne ou numéro contrat), `title` / `label`
* **Liens** : `supplierId` (obligatoire), `clientId`
* **Typologie** : `kind` (ex. FRAMEWORK, LICENSE_SAAS, SERVICES, MAINTENANCE, OTHER)
* **Cycle de vie** : `status` (ex. DRAFT, ACTIVE, SUSPENDED, NOTICE, EXPIRED, TERMINATED)
* **Dates** : `signedAt?`, `effectiveStart`, `effectiveEnd?`, `terminatedAt?`
* **Renouvellement** : `renewalMode` (NONE, TACIT, EXPLICIT), `noticePeriodDays?`, `renewalTermMonths?` (optionnel)
* **Commercial (informatif)** : `currency`, `annualValue?`, `totalCommittedValue?` (Decimal nullable), `billingFrequency?` (enum léger ou string contrôlée)
* **Texte libre** : `description?`, `internalNotes?` (RBAC restreint si notes sensibles — à trancher : `contracts.manage_internal_notes` ou champ visible seulement `contracts.update`)

### Cas d’usage V1

1. Créer / modifier / archiver (soft delete ou statut) un contrat.
2. Lister et filtrer par fournisseur, statut, fenêtre de dates (ex. expire dans 90 jours).
3. Consulter la fiche avec **toutes** les infos affichées en libellés (fournisseur, catégorie fournisseur si exposée).
4. (Phase pièces) Joindre PDF signé, avenants, CGV.

### Hors V1 (références pour roadmap)

* Lien **`PurchaseOrder`** / **`Invoice`** (`contractId` optionnel sur ces entités ou table de liaison N-N si un contrat couvre plusieurs commandes).
* **`FinancialAllocation`** / événements générés depuis échéancier contractuel.
* Lien **`Project`**.
* Notifications échéance / préavis, calendrier, export CODIR.

---

# 5. Modèle de données (Prisma — proposition)

```prisma
enum SupplierContractKind {
  FRAMEWORK
  LICENSE_SAAS
  SERVICES
  MAINTENANCE
  OTHER
}

enum SupplierContractStatus {
  DRAFT
  ACTIVE
  SUSPENDED
  NOTICE
  EXPIRED
  TERMINATED
}

enum SupplierContractRenewalMode {
  NONE
  TACIT
  EXPLICIT
}

model SupplierContract {
  id        String   @id @default(cuid())
  clientId  String
  supplierId String

  reference String
  title     String

  kind   SupplierContractKind
  status SupplierContractStatus @default(DRAFT)

  signedAt        DateTime?
  effectiveStart  DateTime
  effectiveEnd    DateTime?
  terminatedAt    DateTime?

  renewalMode       SupplierContractRenewalMode @default(NONE)
  noticePeriodDays  Int?
  renewalTermMonths Int?

  currency              String  @db.VarChar(3)
  annualValue           Decimal? @db.Decimal(18, 2)
  totalCommittedValue   Decimal? @db.Decimal(18, 2)
  billingFrequency      String?  @db.VarChar(32)

  description    String? @db.VarChar(4000)
  internalNotes  String? @db.VarChar(4000)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  client   Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  supplier Supplier @relation(fields: [supplierId], references: [id], onDelete: Restrict)

  attachments ContractAttachment[]

  @@unique([clientId, reference])
  @@index([clientId])
  @@index([clientId, supplierId])
  @@index([clientId, status])
  @@index([clientId, effectiveEnd])
}
```

**Pièces jointes (alignement RFC-034/035)** — même esprit que `ProcurementAttachment` :

* `ContractAttachment` avec `clientId`, `supplierContractId`, métadonnées fichier, `storageBucket`, `objectKey`, `checksumSha256`, catégorie (CONTRACT_PDF, AMENDMENT, SLA, OTHER), statut ACTIVE/ARCHIVED.
* Contrainte : `supplierContract.clientId === attachment.clientId` (validation service + FK).

---

# 6. API REST (proposition)

Ressource au pluriel, alignée `.cursorrules` : **`/api/contracts`**.

| Méthode | Route | Permission | Description |
| --- | --- | --- | --- |
| GET | `/api/contracts` | `contracts.read` | Liste paginée + filtres (`supplierId`, `status`, `expiresBefore`, `search`) |
| GET | `/api/contracts/:id` | `contracts.read` | Détail ; inclure `supplier: { id, name, code? }` pour l’UI |
| POST | `/api/contracts` | `contracts.create` | Création (DTO validé) |
| PATCH | `/api/contracts/:id` | `contracts.update` | Mise à jour partielle |
| DELETE | `/api/contracts/:id` | `contracts.delete` | Suppression logique **ou** hard delete selon politique audit (préférer **statut TERMINATED** + archivage si contraintes FK futures) |

**Pièces (phase)** :

* `GET|POST /api/contracts/:id/attachments`
* `GET /api/contracts/:id/attachments/:attachmentId/download`
* `PATCH /api/contracts/:id/attachments/:attachmentId/archive`

**Réponses** : jamais exposer `objectKey` / secrets ; réponses JSON métier comme RFC-034.

---

# 7. Règles métier (service)

1. **Scope** : `contract.clientId` doit égaler le client actif autorisé pour l’utilisateur.
2. **Fournisseur** : `supplierId` doit appartenir au **même** `clientId`.
3. **Cohérence dates** : `effectiveEnd >= effectiveStart` si les deux sont renseignés ; `terminatedAt` cohérent avec statut `TERMINATED`.
4. **Référence** : unicité `(clientId, reference)` — erreur 409 explicite.
5. **Transitions de statut** : documenter les transitions autorisées (ex. DRAFT → ACTIVE ; ACTIVE → NOTICE → EXPIRED) ; rejeter les sauts invalides (422).
6. **Audit** : création, mise à jour champs sensibles, archivage pièce, téléchargement pièce (alignement RFC-013).

---

# 8. Frontend (rappels)

* **Valeur affichée, pas ID** : liste et filtres utilisent noms fournisseurs, libellés de statut / type.
* **Contexte client** : toutes les requêtes passent par le client actif (comme procurement).
* États **loading / error / empty** sur liste et fiche.

---

# 9. Tests (définition)

## Backend

* Service : création avec bon `clientId` ; rejet si `supplier` d’un autre client.
* Contrôleur : 403 sans permission ; 404 si contrat d’un autre client.
* Unicité `reference` par client.
* Pièces : pas de téléchargement si attachment ne correspond pas au contrat / client.

## Frontend

* Tests de hooks / formulaire : soumission avec IDs mais **affichage** mocké avec libellés fournisseur.

---

# 10. Récapitulatif final

* Cette RFC introduit un **registre contractuel** `SupplierContract` **client-scopé**, lié à **`Supplier`**, avec champs de **cycle de vie** et **renouvellement** déclaratifs en V1.
* Les **pièces** reprennent le **modèle sécurisé** GED procurement (RFC-034/035).
* Le **Financial Core** peut **plus tard** utiliser `FinancialSourceType.CONTRACT` pour des allocations ou événements ; pas obligatoire au MVP.
* Les **liaisons PO / facture** et **notifications** sont **roadmap** explicite.

---

# 11. Points de vigilance

* **Ne pas** afficher d’UUID ou d’ID interne en UI (règle globale Starium).
* **Ne pas** relâcher le filtre client sur un seul endpoint « pratique ».
* **Suppression** : préférer statuts et archivage pour garder l’**historique audit** et les futures FK (`purchaseOrder.contractId`, etc.).
* **Données juridiques** : clarifier rétention, export RGPD et accès aux `internalNotes` (permission dédiée si besoin).
* Éviter la **duplication** de la logique stockage : factoriser avec le module procurement si possible.

---

# 12. Phases de livraison suggérées

| Phase | Contenu |
| --- | --- |
| **P1** | Prisma `SupplierContract` + CRUD API + permissions + tests isolation + UI liste / fiche |
| **P2** | `ContractAttachment` + routes upload/download/archive + panneau UI |
| **P3** | Filtres échéances, exports, notifications |
| **P4** | `contractId` sur PO/Invoice (optionnel) + reporting budget / CODIR |
