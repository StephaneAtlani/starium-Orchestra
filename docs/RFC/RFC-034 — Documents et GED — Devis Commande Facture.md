# RFC-034 — Documents et GED (Devis, Commande, Facture)

## Statut

**Draft** — spécification produit et technique ; implémentation par phases (voir §9). **V1 = méthode A** : stockage binaire **MinIO privé** (Docker, non exposé publiquement), **NestJS seul point d’entrée** upload/download ; **V2** : liens externes et/ou dépôt Microsoft (hors périmètre V1).

## Priorité

Haute pour la **traçabilité** des engagements et de la consommation (preuves CODIR, conformité, litiges fournisseurs).

## Dépendances

* [RFC-025 — Procurement Core](./RFC-025%20%E2%80%94%20Procurement%20Core.md) — fournisseurs, `PurchaseOrder`, `Invoice`, intégration Financial Core
* [RFC-PROJ-DOC-001 — ProjectDocument](./RFC-PROJ-DOC-001%20%E2%80%94%20Mod%C3%A8le.md) — **pattern** registre documentaire (métadonnées, isolation client) — *réutiliser les principes ; le stockage fichier projet reste historique / hors périmètre procurement V1 (MinIO)*
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

* **`ProjectDocument`** (RFC-PROJ-DOC-001) : registre **rattaché à un projet** ; historiquement lecture disque local pour `STARIUM` côté API — **ne constitue pas** le modèle cible procurement **V1**, qui repose sur **MinIO privé** (voir §2).
* **Procurement V1** : aucun stockage binaire « disque serveur applicatif » comme référence d’architecture ; **MinIO** sur réseau **interne Docker**, joignable **uniquement** par le backend.

## 1.3 Lacunes fonctionnelles

1. **Pas de coffre-fort documentaire** pour les pièces **devis**, **bon de commande**, **facture PDF**, confirmations, avenants — indispensable pour audit et opérations.
2. **Pas de devis structuré** : impossible de versionner un accord prix **avant** transformation en engagement (`PurchaseOrder`).
3. **Risque de silos** si chaque module invente son upload : il faut un **modèle unique** « pièce rattachée à un objet procurement », extensible (futurs bons de livraison, avoirs).

---

# 2. Hypothèses éventuelles

## 2.1 Décision technique V1 vs V2 (verrouillée)

| | **V1 (MVP — méthode A)** | **V2 (hors V1)** |
| --- | --- | --- |
| **Stockage binaire** | **MinIO** privé, conteneurisé (ex. Docker), **non exposé** sur Internet ; **aucun bucket public** | Extensions possibles selon besoin |
| **Accès MinIO** | **Uniquement** depuis l’API NestJS sur le **réseau interne** (ex. réseau Docker) | — |
| **Navigateur** | **Aucun** accès direct navigateur → MinIO ; **aucune** signed URL en V1 | Lien **EXTERNAL** et/ou **MICROSOFT** : métadonnées + stratégie d’accès dédiée (hors V1) |
| **Point d’entrée** | Upload et download **exclusivement** via routes backend (multipart / stream) | — |

## 2.2 Table des hypothèses

| ID | Hypothèse |
| --- | --- |
| **H1** | La **GED procurement** est **client-scoped** : toute pièce porte `clientId` et est liée à un parent métier du **même** client (contrainte DB + validation service). |
| **H2** | **Une pièce** est rattachée à **exactement un** parent parmi : **devis** (fournisseur), **commande**, **facture** ( XOR logique ; pas de double lien). |
| **H3** | Le **devis** (`SupplierQuotation`) est une entité **métier** distincte de la commande : montants / devise / statut propres ; transformation en `PurchaseOrder` = action métier explicite (pas seulement un renommage). |
| **H4** | **V1 — Stockage binaire** : objets dans **MinIO** (bucket non public), clés d’objet **non prédictibles**, contrôle d’accès **uniquement** via l’API ; pas de fichier servi depuis le disque local applicatif pour ce périmètre. |
| **H5** | **OCR / recherche plein texte / signature électronique qualifiée** : **hors périmètre** de cette RFC (arbitrage ultérieur). |
| **H6** | **V2 —** `storageType` **EXTERNAL** (URL métier) et **MICROSOFT** (dépôt / projection M365) : **hors MVP V1** ; pas de route Microsoft dédiée aux pièces procurement en V1. |

---

# 3. Liste des fichiers à créer / modifier (cible implémentation)

## 3.1 Backend (NestJS)

| Fichier / zone | Action |
| --- | --- |
| `apps/api/prisma/schema.prisma` | **Modifié** — modèles `SupplierQuotation`, `ProcurementAttachment` (+ enums) ; relations vers `Supplier`, `PurchaseOrder`, `Invoice`, `Client`, `User` |
| `apps/api/prisma/migrations/*` | **Créé** — migration SQL + contraintes CHECK (exactement un parent) |
| `apps/api/src/modules/procurement/` | **Étendu** — sous-module `quotations/` et `attachments/` (ou services dédiés dans module existant) |
| `quotations/*.controller.ts` | **Créé** — CRUD devis + transition vers commande |
| `attachments/*.controller.ts` | **Créé** — `multipart` upload, liste, stream download, archive ; **guards** : `JwtAuthGuard`, `ActiveClientGuard`, `ModuleAccessGuard`, `PermissionsGuard` |
| Client **MinIO** (SDK) | **Créé** — put/get/delete objets ; configuration endpoint **interne** uniquement |
| `docker-compose` / infra | **Mis à jour** — service MinIO **non publié** vers l’hôte (ou bind localhost / réseau interne uniquement) |
| DTOs `create/update/list` | **Créés** — validation `class-validator` ; réponses **sans** `objectKey`, `bucket`, checksum vers le frontend |
| Services | **Créés** — scope client, règles métier (statuts, rattachement), validation **MIME / extensions** et **taille max fichier** (§4.3) — **sans** plafond agrégé de stockage par client en V1 |
| Guards / permissions | **Alignés** — `procurement.*` ; **chaîne obligatoire** V1 : Jwt + client actif + module + permissions |
| Tests `*.spec.ts` | **Créés** — isolation inter-clients, XOR parent, streaming, mock MinIO |

## 3.2 Frontend (Next.js)

| Fichier / zone | Action |
| --- | --- |
| `apps/web/src/features/procurement/` (ou équivalent) | **Étendu** — onglets / sections **Documents** sur fiches devis, commande, facture |
| API client + query keys | **Créés / modifiés** — clés tenant-aware avec `clientId` |
| Composants liste pièces | **Créés** — nom fichier, type, taille, date, utilisateur (**libellé**, pas ID) ; **aucune** exposition de `storageKey` / `objectKey` / URL MinIO / URL signée |

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
* `storageType` : enum conservé pour évolution **V2** — en **V1**, seule la valeur **`STARIUM`** est utilisée (binaire dans MinIO). **`EXTERNAL`** et **`MICROSOFT`** : **hors MVP V1** (pas de persistance ni de flux associés en V1).
* Côté persistance interne ( **non exposé** au frontend ) : référence objet **MinIO** — `bucket` (ou convention par environnement), `objectKey` (clé d’objet opaque), optionnel **`checksumSha256`** (ou équivalent) pour intégrité.
* `uploadedByUserId`, `createdAt`, `updatedAt`
* `status` : `ACTIVE` | `ARCHIVED` (suppression logique **par défaut** ; voir §4.4)

**Opérations V1** :

* **Upload** : `multipart/form-data` → **endpoint NestJS uniquement** → validation (taille max fichier, allowlist MIME / extensions) → écriture **MinIO** via SDK → persistance métadonnées + **audit** `procurement_attachment.uploaded` (ou équivalent).
* **Download** : après contrôle **JwtAuthGuard + ActiveClientGuard + ModuleAccessGuard + PermissionsGuard** et vérification parent / `clientId` → **streaming** depuis MinIO vers le client (headers `Content-Type` / `Content-Disposition`) + **audit** `procurement_attachment.downloaded`.
* **Archivage** : `ARCHIVED` + `archivedAt` + **audit** `procurement_attachment.archived` ; suppression physique du binaire dans MinIO **uniquement** selon règle de rétention explicite (voir §12) — **hors** chemin heureux par défaut.
* **Tentative d’accès refusé** (permissions / mauvais client / parent) : **audit** `procurement_attachment.access_denied` (ou action équivalente dans la convention RFC-013), **sans** fuite d’existence d’objet si politique produit l’exige.

## 4.3 Sécurité des fichiers (V1)

* **MIME** : liste **allowlist** configurable (ex. `application/pdf`, images limitées) ; rejets explicites.
* **Taille** : **plafond** par fichier (et optionnellement par requête) ; refus auditable.
* **Clés d’objet MinIO** : **non prédictibles** (ex. UUID / préfixe aléatoire), jamais dérivées seules du nom de fichier utilisateur.
* **Isolation** : toute lecture / écriture MinIO précédée de la preuve que l’attachment appartient au **client actif** et au **parent** — **aucun** accès inter-client, **aucun** path traversal sur clé métier.
* **Volumétrie (hors règle bloquante V1)** : aucun refus d’upload pour dépassement d’un **volume agrégé** par client ; l’usage peut être **observé** en exploitation (monitoring, capacité disque, alertes infra), sans en faire une **exigence fonctionnelle** MVP.
* **MinIO** : service **non exposé** publiquement ; pas de bucket public ; pas d’URL présignée en V1 ; upload et download **uniquement** via le backend (cf. §2.1).
* **Suppression** : par défaut **logique** (`ARCHIVED`) ; **suppression physique** du binaire MinIO uniquement selon **règle de rétention** documentée (alignement légal / exploitation), pas comme action utilisateur standard V1.

## 4.4 Cas d’usage transverses

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

/// V1 : uniquement STARIUM (binaire MinIO). EXTERNAL / MICROSOFT réservés V2 — hors usage V1.
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
  /// V1 : toujours STARIUM. EXTERNAL / MICROSOFT : V2 uniquement.
  storageType           ProcurementStorageType        @default(STARIUM)

  /// Bucket MinIO (ou nom logique) — jamais exposé au frontend.
  storageBucket         String?
  /// Clé d’objet opaque — jamais exposée au frontend.
  objectKey             String?
  /// Intégrité optionnelle post-upload.
  checksumSha256        String?

  /// V2 : lien externe ; null en V1.
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

> Préfixe `/api`. **V1** : toutes les routes pièces jointes passent par **JwtAuthGuard + ActiveClientGuard + ModuleAccessGuard + PermissionsGuard**. **Aucune** signed URL MinIO, **aucune** route Microsoft pour les attachments en V1.

## 6.1 Devis

* `GET /api/supplier-quotations` — liste filtrable (`supplierId`, `status`, dates)
* `POST /api/supplier-quotations` — création
* `GET /api/supplier-quotations/:id` — détail enrichi (libellés fournisseur, ligne budget)
* `PATCH /api/supplier-quotations/:id` — mise à jour (statuts selon machine d’état)
* `POST /api/supplier-quotations/:id/convert-to-purchase-order` — **action métier** création `PurchaseOrder` + lien

**Pièces jointes devis** : **Phase 2** (voir §9) — mêmes patterns que §6.2 lorsque `SupplierQuotation` est livré.

## 6.2 Pièces jointes — V1 (PurchaseOrder & Invoice, Phase 1)

| Méthode | Route | Comportement |
| --- | --- | --- |
| `GET` | `/api/purchase-orders/:id/attachments` | Liste métadonnées (pas de `objectKey`, pas de bucket, pas d’URL MinIO) |
| `POST` | `/api/purchase-orders/:id/attachments` | **multipart** → upload via backend → MinIO ; audit upload |
| `GET` | `/api/purchase-orders/:id/attachments/:attachmentId/download` | **Stream** binaire via backend depuis MinIO ; audit download |
| `GET` | `/api/invoices/:id/attachments` | Idem commande |
| `POST` | `/api/invoices/:id/attachments` | Idem commande |
| `GET` | `/api/invoices/:id/attachments/:attachmentId/download` | Idem commande |
| `POST` | `…/attachments/:attachmentId/archive` (ou `DELETE` métier soft-delete) | Archivage logique ; audit ; **pas** de suppression physique MinIO par défaut |

**Réponses** : inclure pour `uploadedByUser` au minimum `firstName`, `lastName` ou `email` pour l’UI (règle *valeur, pas ID*) ; **ne jamais** renvoyer `objectKey`, `storageBucket`, `checksumSha256` ni URL interne MinIO au frontend.

---

# 7. Intégration Financial Core et audit

* **Devis** : par défaut **aucun** `FinancialEvent` tant que le devis n’est pas transformé en **commande** (engagement) — éviter le double comptage.
* **Commande / Facture** : inchangé RFC-025 (engagement / consommation).
* **Audit (V1 — pièces jointes)** : journaliser au minimum **upload**, **download**, **archivage** ; journaliser les **refus** d’accès (téléchargement / lecture liste) et les **tentatives d’archivage / suppression refusées** (permissions, mauvais parent, mauvais client) de manière cohérente avec RFC-013 (sans exposer de détails techniques dangereux). Actions métier devis : `quotation.created|updated|status_changed`, `quotation.converted_to_purchase_order` avec `resourceId` et snapshots sobres lorsque la Phase 2 est livrée.

---

# 8. UI/UX (principes)

* Section **« Documents »** sur chaque fiche (devis, commande, facture) : tableau avec tri par date, badge catégorie, actions télécharger / ajouter (selon droits).
* **V1** : le frontend **ne reçoit jamais** `objectKey`, `storageBucket`, `checksumSha256`, URL MinIO, URL signée, ni `storageKey` technique ; téléchargement **uniquement** via `GET …/attachments/:attachmentId/download` (flux streamé par l’API).
* **Jamais** afficher UUID comme libellé principal (règles habituelles *valeur métier*).
* États **loading / error / empty** explicites (FRONTEND_UI-UX).
* Lien navigation **Devis → Commande → Facture** lorsque les IDs sont reliés (fil d’ariane ou encart « Chaîne documentaire ») — surtout **Phase 2** pour le devis.

---

# 9. Phasage recommandé

| Phase | Contenu |
| --- | --- |
| **Phase 1** | `ProcurementAttachment` sur **`PurchaseOrder`** et **`Invoice`** + **MinIO privé** (Docker, non exposé) + **upload multipart** et **download stream** backend uniquement + **audit** + **sécurité fichier** (§4.3) — **V1** ; volumétrie **surveillée en exploitation** uniquement (pas de refus lié à un plafond agrégé par client) |
| **Phase 2** | `SupplierQuotation` + attachments + conversion en **`PurchaseOrder`** (même stack MinIO / API pour les pièces devis) |
| **Phase 3** | Versionnement remplace/supersede pièce, workflow validation avancé ; **`EXTERNAL` / `MICROSOFT`** (V2), éventuelle **sync documentaire** Microsoft — **hors V1** |

---

# 10. Tests obligatoires (reprise esprit .cursorrules)

* **Isolation client** : impossible de lire une pièce ou un devis d’un autre client (tests service + intégration).
* **Contrainte parent** : rejeter création si 0 ou >1 parent.
* **Permissions** : chaîne **Jwt + ActiveClient + module + `procurement.*`** ; pas de contournement par ID deviné.
* **Download** : aucune fuite d’`objectKey` / bucket dans les réponses JSON ; streaming autorisé **uniquement** après contrôle.
* **MinIO** : tests avec mock ou conteneur ; vérifier que **aucun** chemin d’accès public MinIO n’est requis côté tests E2E navigateur.
* **V1** : **pas** de tests obligatoires sur un **plafond agrégé** de stockage par client (hors périmètre MVP) ; en revanche couvrir **refus** sur **taille fichier** ou **MIME** hors allowlist.
* **Conversion devis → PO** : transaction (devis `ACCEPTED`, PO créé, lien cohérent) — Phase 2.

---

# 11. Récapitulatif final

Cette RFC introduit une **GED métier procurement** centrée sur **devis**, **commande** et **facture**. **V1** impose **MinIO privé**, **API NestJS comme seul point d’entrée** (upload/download), **sans** URL signée ni exposer MinIO au navigateur. Elle complète RFC-025 en ajoutant la **couche preuve documentaire** et, en Phase 2, la **formalisation du devis fournisseur**.

---

# 12. Points de vigilance

1. **Sauvegarde et restauration MinIO** : stratégie de backup des volumes / réplication ; procédure de **restauration** testée (RTO/RPO).
2. **Politique de rétention** : durée légale / métier des pièces ; alignement **purge physique** MinIO avec archivage logique.
3. **Volumétrie (exploitation)** : suivre l’usage disque / capacité MinIO et les alertes infra ; **pas** de plafond agrégé imposé par client en V1 — la volumétrie n’est **pas** une exigence fonctionnelle MVP.
4. **Antivirus / scan** : **hors MVP** ou **optionnel** selon arbitrage risque (fichiers entrants).
5. **RGPD** : données perso dans les PDF ; **effacement** : coordination base + objets MinIO (voir rétention).
6. **Unicité** `reference` devis par client : tolérance aux doublons fournisseur (suffixe interne).
7. **Ne pas dupliquer** la logique TVA : rester aligné RFC-006 / RFC-025.
8. **V1** : **ne pas** activer de bucket public, **ne pas** exposer MinIO, **ne pas** délivrer de signed URL — tout passe par l’API authentifiée.

---

## Historique documentaire

| Date | Auteur | Commentaire |
| --- | --- | --- |
| 2026-04 | — | Création RFC-034 |
| 2026-04 | — | Alignement V1 : MinIO privé Docker, API seule entrée, pas de signed URL ; V2 EXTERNAL/MICROSOFT ; sécurité fichier §4.3 ; phasage §9 |
| 2026-04 | — | Retrait plafond agrégé stockage V1 : garde-fous taille/MIME uniquement ; volumétrie = monitoring exploitation |
