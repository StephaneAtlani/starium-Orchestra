# RFC-034 — Documents et GED (Devis, Commande, Facture)

## Statut

**Draft** — spécification produit et technique ; implémentation à planifier par phases (voir §9).

## Priorité

Haute pour la **traçabilité** des engagements et de la consommation (preuves CODIR, conformité, litiges fournisseurs).

## Dépendances

* [RFC-025 — Procurement Core](./RFC-025%20%E2%80%94%20Procurement%20Core.md) — fournisseurs, `PurchaseOrder`, `Invoice`, intégration Financial Core
* [RFC-PROJ-DOC-001 — ProjectDocument](./RFC-PROJ-DOC-001%20%E2%80%94%20Mod%C3%A8le.md) — **pattern** registre documentaire (métadonnées, `storageType`, isolation client) — *réutiliser les principes, pas le modèle projet tel quel*
* [RFC-006-TVA — Gestion HT / TTC / TVA](./RFC-006-TVA%20%E2%80%94%20Gestion%20HT%20-%20TTC%20-%20TVA%20%26%20Toggle%20d%E2%80%99affichage.md) — cohérence montants sur entités commerciales
* [RFC-013 — Audit logs](./RFC-013%20%E2%80%94%20Audit%20logs.md) — journalisation des opérations sur pièces et entités
* UI : [docs/FRONTEND_UI-UX.md](../FRONTEND_UI-UX.md) — états loading / error / empty ; **libellés métier**, jamais d’ID brut (fournisseur, références documentaires)

---

# 1. Analyse de l’existant

## 1.1 Procurement (commande, facture)

* Le schéma Prisma expose déjà **`PurchaseOrder`** et **`Invoice`** (`clientId`, `supplierId`, montants HT/TVA/TTC, liens optionnels `budgetLineId`, `purchaseOrderId` pour la facture) — aligné RFC-025.
* Les API existantes (`/api/invoices`, commandes selon implémentation module procurement) appliquent **`procurement.read` / `procurement.create`** (et dérivés) + **client actif**.
* **Aucune entité « Devis » / quotation fournisseur** n’est modélisée aujourd’hui : le flux documentaire commence côté produit au niveau **commande** ou **facture**.

## 1.2 Documents ailleurs dans la plateforme

* **`ProjectDocument`** (RFC-PROJ-DOC-001) : registre **rattaché à un projet** ; catégories, statuts, `storageType` (`STARIUM` | `EXTERNAL` | `MICROSOFT`), `storageKey` / `externalUrl` ; pas de GED transverse procurement dans ce modèle.
* Téléchargement contrôlé **fichiers locaux** : résolution de chemin sous racine client (`ProjectDocumentContentService` — anti path traversal).

## 1.3 Lacunes fonctionnelles

1. **Pas de coffre-fort documentaire** pour les pièces **devis**, **bon de commande**, **facture PDF**, confirmations, avenants — indispensable pour audit et opérations.
2. **Pas de devis structuré** : impossible de versionner un accord prix **avant** transformation en engagement (`PurchaseOrder`).
3. **Risque de silos** si chaque module invente son upload : il faut un **modèle unique** « pièce rattachée à un objet procurement », extensible (futurs bons de livraison, avoirs).

---

# 2. Hypothèses éventuelles

| ID | Hypothèse |
| --- | --- |
| **H1** | La **GED procurement** est **client-scoped** : toute pièce porte `clientId` et est liée à un parent métier du **même** client (contrainte DB + validation service). |
| **H2** | **Une pièce** est rattachée à **exactement un** parent parmi : **devis** (fournisseur), **commande**, **facture** ( XOR logique ; pas de double lien). |
| **H3** | Le **devis** (`SupplierQuotation`) est une entité **métier** distincte de la commande : montants / devise / statut propres ; transformation en `PurchaseOrder` = action métier explicite (pas seulement un renommage). |
| **H4** | **Stockage binaire** : réutiliser le pattern **répertoire racine + `clientId` + segments sûrs** (comme les documents projet), avec namespace dédié procurement (`…/procurement/…`) pour éviter collision de chemins. Alternative **objet S3** : **hors MVP** sauf décision infra. |
| **H5** | **OCR / recherche plein texte / signature électronique qualifiée** : **hors périmètre** de cette RFC (voir §8). |
| **H6** | **Microsoft Teams / SharePoint** comme dépôt secondaire : **optionnel** post-MVP ; même principe que `ProjectDocument` + sync (référence `externalUrl` ou table de sync dédiée procurement si besoin). |

---

# 3. Liste des fichiers à créer / modifier (cible implémentation)

## 3.1 Backend (NestJS)

| Fichier / zone | Action |
| --- | --- |
| `apps/api/prisma/schema.prisma` | **Modifié** — modèles `SupplierQuotation`, `ProcurementAttachment` (+ enums) ; relations vers `Supplier`, `PurchaseOrder`, `Invoice`, `Client`, `User` |
| `apps/api/prisma/migrations/*` | **Créé** — migration SQL + contraintes CHECK (exactement un parent) |
| `apps/api/src/modules/procurement/` | **Étendu** — sous-module `quotations/` et `attachments/` (ou services dédiés dans module existant) |
| `quotations/*.controller.ts` | **Créé** — CRUD devis + transition vers commande |
| `attachments/*.controller.ts` | **Créé** — liste / création / suppression / téléchargement sécurisé |
| DTOs `create/update/list` | **Créés** — validation `class-validator` |
| Services | **Créés** — scope client, règles métier (statuts, rattachement) |
| Guards / permissions | **Alignés** — `procurement.*` (lecture pièces = lecture procurement ; création = `procurement.create` ou `procurement.update` selon politique fine) |
| Tests `*.spec.ts` | **Créés** — isolation inter-clients, validation XOR parent, téléchargement |

## 3.2 Frontend (Next.js)

| Fichier / zone | Action |
| --- | --- |
| `apps/web/src/features/procurement/` (ou équivalent) | **Étendu** — onglets / sections **Documents** sur fiches devis, commande, facture |
| API client + query keys | **Créés / modifiés** — clés tenant-aware avec `clientId` |
| Composants liste pièces | **Créés** — nom fichier, type, taille, date, utilisateur (**libellé**, pas ID) |

## 3.3 Documentation

| Fichier | Action |
| --- | --- |
| `docs/API.md` | **Mis à jour** — endpoints quotations + attachments |
| `docs/RFC/_RFC Liste.md` | **Mis à jour** — entrée RFC-034 |

---

# 4. Spécification fonctionnelle

## 4.1 Objet métier « Devis » (`SupplierQuotation`)

**But** : matérialiser une **proposition commerciale fournisseur** avant engagement.

Champs minimaux recommandés :

* `clientId`, `supplierId`
* `reference` (réf. fournisseur ou interne), `label`
* `quotationDate`, optionnel `validUntil`
* Montants : `amountHt`, `taxRate`, `taxAmount`, `amountTtc`, `currency` (alignement devise budgets / RFC-025 plan fournisseur)
* `status` : au minimum `DRAFT`, `SENT`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `SUPERSEDED`
* `budgetLineId` optionnel (pré-engagement sur ligne)
* Lien optionnel vers `purchaseOrderId` une fois **transformé en commande** (1 devis accepté → 0 ou 1 PO selon règle produit ; **MVP** : 1:1)

**Règles** :

* Passage `ACCEPTED` → création `PurchaseOrder` (service transactionnel) + copie des montants **ou** saisie ajustée (à trancher produit ; **MVP** : copie avec édition contrôlée).
* `ProcurementAttachment` peut référencer le devis **dès** `DRAFT` (brouillon PDF interne).

## 4.2 Pièce jointe GED (`ProcurementAttachment`)

**But** : **registre** des fichiers (PDF, images scannées, etc.) pour preuve et consultation.

Attributs (alignés sur l’esprit RFC-PROJ-DOC-001) :

* `clientId`
* **Un seul** des FK : `supplierQuotationId` | `purchaseOrderId` | `invoiceId` (contrainte DB)
* `name` (titre métier affiché), `originalFilename`, `mimeType`, `extension`, `sizeBytes`
* `category` : enum dédié — ex. `QUOTE_PDF`, `ORDER_CONFIRMATION`, `INVOICE`, `AMENDMENT`, `CORRESPONDENCE`, `OTHER`
* `storageType` : `STARIUM` | `EXTERNAL` ( | `MICROSOFT` si extension INT )
* `storageKey` (chemins relatifs sûrs) ou `externalUrl`
* `uploadedByUserId`, `createdAt`, `updatedAt`
* `status` : `ACTIVE` | `ARCHIVED` (soft delete cohérent audit)

**Opérations** :

* **Upload** : multipart → écriture sous racine configurée ; persistance métadonnées.
* **Download** : vérif scope client + parent ; stream avec headers `Content-Type` / `Content-Disposition`.
* **Suppression** : archivage logique préféré à l’effacement brut (sauf admin).

## 4.3 Cas d’usage transverses

| Cas | Comportement attendu |
| --- | --- |
| Utilisateur consulte une facture | Liste des pièces + téléchargement |
| Contrôle de gestion | Preuve devis + BC + facture sur la même ligne budgétaire (navigation ou liens) |
| Rupture de chaîne | Devis sans PO possible (statut rejeté) ; facture sans PO possible si modèle métier l’autorise (déjà partiellement géré côté `Invoice`) |

---

# 5. Modèle de données (Prisma — proposition)

> Les noms exacts peuvent être ajustés à l’implémentation ; l’important est la **sémantique** et les **contraintes**.

```prisma
enum SupplierQuotationStatus {
  DRAFT
  SENT
  ACCEPTED
  REJECTED
  EXPIRED
  SUPERSEDED
}

enum ProcurementAttachmentCategory {
  QUOTE_PDF
  ORDER_CONFIRMATION
  INVOICE
  AMENDMENT
  CORRESPONDENCE
  OTHER
}

enum ProcurementAttachmentStatus {
  ACTIVE
  ARCHIVED
}

/// Même sémantique que ProjectDocumentStorageType (éviter couplage Prisma inter-modules si préféré).
enum ProcurementStorageType {
  STARIUM
  EXTERNAL
  MICROSOFT
}

model SupplierQuotation {
  id            String   @id @default(cuid())
  clientId      String
  supplierId    String
  budgetLineId  String?
  purchaseOrderId String? @unique // 1:1 MVP après conversion

  reference     String
  label         String
  quotationDate DateTime
  validUntil    DateTime?
  currency      String

  amountHt      Decimal   @db.Decimal(18, 2)
  taxRate       Decimal?  @db.Decimal(5, 2)
  taxAmount     Decimal?  @db.Decimal(18, 2)
  amountTtc     Decimal?  @db.Decimal(18, 2)

  status        SupplierQuotationStatus @default(DRAFT)

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  client        Client   @relation(...)
  supplier      Supplier @relation(...)
  budgetLine    BudgetLine? @relation(...)
  purchaseOrder PurchaseOrder? @relation(...)
  attachments   ProcurementAttachment[]

  @@unique([clientId, reference])
  @@index([clientId, supplierId])
}

model ProcurementAttachment {
  id                    String   @id @default(cuid())
  clientId              String

  supplierQuotationId   String?
  purchaseOrderId       String?
  invoiceId             String?

  name                  String
  originalFilename      String?
  mimeType              String?
  extension             String?
  sizeBytes             Int?

  category              ProcurementAttachmentCategory @default(OTHER)
  status                ProcurementAttachmentStatus   @default(ACTIVE)
  storageType           ProcurementStorageType        @default(STARIUM)

  storageKey            String?
  externalUrl           String?

  uploadedByUserId      String?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  archivedAt            DateTime?

  client                Client @relation(...)
  supplierQuotation     SupplierQuotation? @relation(...)
  purchaseOrder         PurchaseOrder?     @relation(...)
  invoice               Invoice?           @relation(...)
  uploadedByUser        User? @relation(...)

  @@index([clientId])
  @@index([supplierQuotationId])
  @@index([purchaseOrderId])
  @@index([invoiceId])
}
```

**Contrainte SQL** (migration) : exactement **une** des trois FK non nulles ; interdiction des trois null.

**Relations inverses** à ajouter sur `PurchaseOrder`, `Invoice`, `Supplier` selon le schéma existant.

---

# 6. API REST (proposition)

> Préfixe `/api` ; toutes les routes sous **client actif** et permissions procurement.

## 6.1 Devis

* `GET /api/supplier-quotations` — liste filtrable (`supplierId`, `status`, dates)
* `POST /api/supplier-quotations` — création
* `GET /api/supplier-quotations/:id` — détail enrichi (libellés fournisseur, ligne budget)
* `PATCH /api/supplier-quotations/:id` — mise à jour (statuts selon machine d’état)
* `POST /api/supplier-quotations/:id/convert-to-purchase-order` — **action métier** création `PurchaseOrder` + lien

## 6.2 Pièces jointes (pattern générique par parent)

* `GET /api/supplier-quotations/:id/attachments`
* `POST /api/supplier-quotations/:id/attachments` — multipart ou JSON + upload dédié selon pattern API existant
* `GET /api/supplier-quotations/:id/attachments/:attachmentId/download`

* `GET|POST …/purchase-orders/:id/attachments` (+ download)
* `GET|POST …/invoices/:id/attachments` (+ download)

* `DELETE` ou `POST …/archive` — archivage logique

**Réponses** : inclure pour `uploadedByUser` au minimum `firstName`, `lastName` ou `email` pour l’UI (règle *valeur, pas ID*).

---

# 7. Intégration Financial Core et audit

* **Devis** : par défaut **aucun** `FinancialEvent` tant que le devis n’est pas transformé en **commande** (engagement) — éviter le double comptage.
* **Commande / Facture** : inchangé RFC-025 (engagement / consommation).
* **Audit** : `quotation.created|updated|status_changed`, `procurement_attachment.created|archived`, `quotation.converted_to_purchase_order` avec `resourceId` pertinents et snapshots JSON sobres.

---

# 8. UI/UX (principes)

* Section **« Documents »** sur chaque fiche (devis, commande, facture) : tableau avec tri par date, badge catégorie, actions télécharger / ajouter (selon droits).
* **Jamais** afficher `storageKey` ou UUID comme libellé principal.
* États **loading / error / empty** explicites (FRONTEND_UI-UX).
* Lien navigation **Devis → Commande → Facture** lorsque les IDs sont reliés (fil d’ariane ou encart « Chaîne documentaire »).

---

# 9. Phasage recommandé

| Phase | Contenu |
| --- | --- |
| **Phase 1** | `ProcurementAttachment` sur **`PurchaseOrder`** et **`Invoice`** + API + UI liste / téléchargement |
| **Phase 2** | `SupplierQuotation` + attachments + conversion en commande |
| **Phase 3** | Versionnement remplace/supersede pièce, workflow validation, intégration stockage objet / Microsoft |

---

# 10. Tests obligatoires (reprise esprit .cursorrules)

* **Isolation client** : impossible de lire une pièce ou un devis d’un autre client (tests service + intégration).
* **Contrainte parent** : rejeter création si 0 ou >1 parent.
* **Permissions** : `procurement.read` refuse sans accès ; pas de contournement par ID deviné.
* **Download** : path traversal sur `storageKey` rejeté.
* **Conversion devis → PO** : transaction (devis `ACCEPTED`, PO créé, lien cohérent).

---

# 11. Récapitulatif final

Cette RFC introduit une **GED métier procurement** centrée sur **devis**, **commande** et **facture**, en réutilisant les **bonnes pratiques** du registre `ProjectDocument` sans mélanger les périmètres. Elle complète RFC-025 en ajoutant la **couche preuve documentaire** et la **formalisation du devis fournisseur**, prerequisite naturel d’une chaîne d’achat maîtrisée.

---

# 12. Points de vigilance

1. **Taille / quota** fichiers par client — politique à définir (sinon risque DoS stockage).
2. **RGPD** : documents peuvent contenir des données perso — durée de rétention et droit à l’effacement (alignement politique client).
3. **Unicité** `reference` devis par client : prévoir tolérance aux doublons fournisseur (suffixe interne).
4. **Ne pas dupliquer** la logique TVA : rester aligné RFC-006 / RFC-025.
5. **Ne pas exposer** de signed URL longue durée sans contrôle RBAC équivalent.

---

## Historique documentaire

| Date | Auteur | Commentaire |
| --- | --- | --- |
| 2026-04 | — | Création RFC-034 |
