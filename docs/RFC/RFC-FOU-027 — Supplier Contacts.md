# RFC-FOU-027 — Supplier Contacts

## Statut

Implémentée (MVP)

## Priorité

Haute

## État

🟡 Partiel (écarts ciblés)

## Dépendances

* RFC-025 — Procurement Core
* RFC-FOU-025-A — Supplier Core (Hardening & Alignment)
* RFC-FOU-026 — Supplier Categories
* Architecture technique Starium Orchestra
* API / multi-client / guards / permissions

---

# 1. Objectif

Introduire la gestion de **contacts rattachés à un fournisseur** dans Starium Orchestra.

Cette RFC vise à permettre :

* de créer plusieurs contacts pour un même fournisseur
* de distinguer les interlocuteurs selon leur rôle
* de centraliser les coordonnées utiles au pilotage procurement
* de préparer les futurs usages contrats, commandes, factures et relances

Exemples de contacts :

* commercial
* support
* comptabilité
* responsable contrat
* DPO / sécurité
* direction de compte

Le contact fournisseur devient une **donnée métier secondaire structurée**, rattachée au référentiel maître `Supplier`.

---

# 2. Problème adressé

Aujourd’hui, même avec un bon référentiel fournisseur :

* on ne sait pas à qui écrire ou téléphoner
* les équipes gardent les bons interlocuteurs dans Outlook, Teams, Excel ou notes perso
* les interlocuteurs comptables, commerciaux et support sont mélangés
* la donnée disparaît quand le contact quitte l’entreprise
* les flux commandes / factures / contrats ne peuvent pas pointer proprement vers un contact

Sans contacts structurés :

* le pilotage fournisseur reste incomplet
* la continuité opérationnelle est faible
* la qualité du référentiel procurement est limitée

---

# 3. Positionnement produit

Supplier Contacts est :

* un **sous-référentiel métier** rattaché à `Supplier`
* une brique de **gouvernance opérationnelle**
* un futur support pour les workflows procurement et contractuels

Ce n’est pas :

* un carnet d’adresses global utilisateur
* un CRM complet
* un module d’emailing
* une synchronisation de contacts Microsoft / Google dans ce MVP

---

# 4. Périmètre

## Inclus

* modèle `SupplierContact`
* CRUD backend des contacts fournisseur
* rattachement obligatoire à un `Supplier`
* contact principal optionnel par fournisseur
* filtres simples
* audit logs
* exposition dans le détail fournisseur
* UI minimale dans la fiche fournisseur (`/suppliers`, dialog d’édition)

## Exclus du MVP

* synchronisation Outlook / Google Contacts
* photo/avatar
* historique d’échanges
* notes privées par utilisateur
* multi-fournisseur pour un même contact
* permissions spécifiques par type de contact
* workflow de validation
* tests d’intégration backend complets (à finaliser)

---

# 5. Principes d’architecture

## 5.1 Multi-client strict

Chaque contact :

* appartient à un `clientId`
* est rattaché à un `supplierId` du même client
* ne peut jamais être visible d’un autre client

Toutes les routes passent par le pipeline métier standard :

```text
JwtAuthGuard
→ ActiveClientGuard
→ ModuleAccessGuard
→ PermissionsGuard
```

## 5.2 Backend source de vérité

Le backend contrôle :

* la cohérence `clientId ↔ supplierId`
* la normalisation des coordonnées
* les doublons évidents
* la règle du contact principal
* l’inactivation logique si retenue

## 5.3 Simplicité MVP

Décisions MVP :

* **1 contact appartient à 1 seul fournisseur**
* **1 fournisseur peut avoir 0..N contacts**
* un contact peut être marqué `isPrimary = true`
* **au plus 1 contact principal par fournisseur**

---

# 6. Cas d’usage

## 6.1 Création d’un contact commercial

Supplier : Microsoft
Contact :

* prénom : Julie
* nom : Martin
* email : [julie.martin@microsoft.com](mailto:julie.martin@microsoft.com)
* rôle : Commerciale
* téléphone : +33...

## 6.2 Création d’un contact comptabilité

Supplier : Orange
Contact :

* email facturation
* téléphone service comptable
* rôle : Comptabilité

## 6.3 Consultation depuis la fiche fournisseur

Sur la fiche d’un fournisseur, l’utilisateur voit :

* le contact principal
* la liste des autres contacts
* leur rôle / email / téléphone

## 6.4 Mise à jour

Un contact change d’email ou quitte le fournisseur :

* mise à jour
* désactivation logique si nécessaire

---

# 7. Décisions métier

## 7.1 Contact principal

Un fournisseur peut avoir un **contact principal**.

Règles :

* au plus un contact `isPrimary = true` par fournisseur
* si un nouveau contact est défini principal, l’ancien perd ce statut
* si le contact principal est désactivé / archivé, aucun contact principal n’est imposé automatiquement sauf décision explicite

## 7.2 Contact facultatif

Un fournisseur peut exister sans contact.

## 7.3 Rôle de contact

Le rôle est un **champ libre cadré** dans le MVP, pas un référentiel séparé.

Exemples :

* Commercial
* Support
* Comptabilité
* Juridique
* Sécurité
* Direction de compte

Décision MVP :

* `role` = string optionnelle
* pas de table `SupplierContactRole` pour l’instant

## 7.4 Désactivation plutôt que suppression

Comme les autres référentiels Starium :

* pas de suppression physique en MVP
* désactivation logique via `isActive = false`

---

# 8. Modèle de données

## 8.1 Nouveau modèle Prisma

```prisma
model SupplierContact {
  id             String   @id @default(cuid())
  clientId       String
  supplierId     String

  firstName      String?
  lastName       String?
  fullName       String
  normalizedName String

  role           String?
  email          String?
  phone          String?
  mobile         String?

  isPrimary      Boolean  @default(false)
  isActive       Boolean  @default(true)

  notes          String?

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  client         Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  supplier       Supplier @relation(fields: [supplierId], references: [id], onDelete: Cascade)

  @@index([clientId])
  @@index([supplierId])
  @@index([clientId, supplierId])
  @@index([clientId, isActive])
  @@index([supplierId, isPrimary])
  @@unique([supplierId, normalizedName])
}
```

## 8.2 Extension du modèle Supplier

Ajouter dans `Supplier` :

```prisma
contacts SupplierContact[]
```

## 8.3 Remarques

* `fullName` est stocké pour simplifier affichage et recherche
* `normalizedName` sert à prévenir les doublons évidents dans un même fournisseur
* `@@unique([supplierId, normalizedName])` : évite de créer deux fois “Julie Martin” pour le même fournisseur
* `email` n’est pas rendu unique globalement dans le MVP, car une adresse générique peut exister dans plusieurs organisations ou services
* si plus tard tu veux durcir, tu pourras ajouter une unicité partielle sur `(supplierId, email normalisé)` quand non null

---

# 9. Règles de gestion

## 9.1 Rattachement obligatoire

Un contact doit toujours être rattaché à un fournisseur existant du client actif.

## 9.2 Nom obligatoire

Il faut au minimum pouvoir identifier humainement le contact.

Décision MVP :

* `fullName` obligatoire
* `firstName` / `lastName` facultatifs
* si `firstName` + `lastName` sont fournis, `fullName` est dérivé
* sinon `fullName` vient du payload

## 9.3 Normalisation

Créer helpers backend :

```text
normalizeContactName(name)
normalizeEmail(email)
normalizePhone(phone)
```

Règles :

* `normalizedName = trim + lowercase + collapse spaces`
* `email = trim + lowercase`
* `phone/mobile = trim`
* `fullName` = version affichable nettoyée

## 9.4 Doublons

Un doublon évident doit être refusé dans le même fournisseur :

* même `normalizedName`
* et/ou éventuellement même `email` si tu souhaites durcir dès le MVP

Décision MVP recommandée :

* blocage sur `normalizedName`
* warning possible plus tard sur `email`

## 9.5 Contact principal

Si `isPrimary = true` à la création ou mise à jour :

* mettre tous les autres contacts du fournisseur à `isPrimary = false`
* faire l’opération dans une transaction

## 9.6 Désactivation

Si `isActive = false` :

* le contact reste historisé
* il n’est plus proposé comme interlocuteur actif
* s’il était principal, `isPrimary` peut rester vrai ou être remis à false selon la règle retenue

Décision MVP recommandée :

* lors de la désactivation d’un contact principal, forcer `isPrimary = false`

---

# 10. API backend

## 10.1 Routes

Nouveau contrôleur dédié :

```text
GET    /api/suppliers/:supplierId/contacts
POST   /api/suppliers/:supplierId/contacts
GET    /api/suppliers/:supplierId/contacts/:id
PATCH  /api/suppliers/:supplierId/contacts/:id
POST   /api/suppliers/:supplierId/contacts/:id/deactivate
```

## 10.2 Option détail fournisseur

Le détail fournisseur peut inclure les contacts si utile :

```text
GET /api/suppliers/:id?includeContacts=true
```

Ou, plus simple en MVP :

* garder les contacts sur route dédiée seulement

## 10.3 Permissions

Rester aligné sur le domaine `procurement.*` existant :

* `procurement.read`
* `procurement.create`
* `procurement.update`

Ne pas introduire `supplier_contacts.*` dans le MVP.

---

# 11. DTOs

## 11.1 CreateSupplierContactDto

```ts
export class CreateSupplierContactDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  fullName: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  role?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  mobile?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
```

## 11.2 UpdateSupplierContactDto

Tous les champs optionnels :

* `firstName?`
* `lastName?`
* `fullName?`
* `role?`
* `email?`
* `phone?`
* `mobile?`
* `isPrimary?`
* `isActive?` seulement si tu ne veux pas une route dédiée de désactivation
* `notes?`

## 11.3 Query DTO

```ts
search?: string;
isActive?: boolean;
offset?: number;
limit?: number;
```

---

# 12. Structure backend recommandée

Créer :

```text
apps/api/src/modules/procurement/supplier-contacts/
├── supplier-contacts.controller.ts
├── supplier-contacts.service.ts
├── dto/
│   ├── create-supplier-contact.dto.ts
│   ├── update-supplier-contact.dto.ts
│   └── list-supplier-contacts.query.dto.ts
└── tests/
```

Le module reste rattaché à `procurement.module.ts`.

---

# 13. Logique de service

## 13.1 create

Étapes :

1. charger le supplier par `supplierId + clientId`
2. normaliser les champs
3. vérifier doublon
4. si `isPrimary = true`, reset des autres contacts du supplier
5. créer le contact
6. auditer
7. retourner le contact

## 13.2 list

* lister les contacts d’un supplier
* pagination standard
* filtre `isActive`
* recherche sur `fullName`, `email`, `role`

## 13.3 getById

* charger par `id + supplierId + clientId`
* refuser cross-client

## 13.4 update

Étapes :

1. charger le contact
2. normaliser
3. vérifier doublons
4. si `isPrimary = true`, reset des autres contacts
5. si désactivation implicite et contact principal, forcer `isPrimary = false`
6. mettre à jour
7. auditer

## 13.5 deactivate

Étapes :

1. charger le contact
2. si déjà inactif → idempotence possible
3. passer `isActive = false`
4. si `isPrimary = true`, passer `isPrimary = false`
5. auditer

---

# 14. Réponses API

## 14.1 Liste contacts

```json
{
  "items": [
    {
      "id": "sc_1",
      "supplierId": "sup_1",
      "firstName": "Julie",
      "lastName": "Martin",
      "fullName": "Julie Martin",
      "role": "Commerciale",
      "email": "julie.martin@example.com",
      "phone": "+33102030405",
      "mobile": "+33601020304",
      "isPrimary": true,
      "isActive": true,
      "notes": "Interlocutrice principale",
      "createdAt": "2026-03-26T10:00:00.000Z",
      "updatedAt": "2026-03-26T10:00:00.000Z"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

## 14.2 Détail fournisseur enrichi plus tard

Option possible plus tard :

```json
{
  "id": "sup_1",
  "name": "AWS",
  "contacts": [
    {
      "id": "sc_1",
      "fullName": "Julie Martin",
      "role": "Commerciale",
      "email": "julie.martin@example.com",
      "isPrimary": true
    }
  ]
}
```

---

# 15. Audit logs

Actions à créer :

* `supplier_contact.created`
* `supplier_contact.updated`
* `supplier_contact.deactivated`
* `supplier_contact.primary_set` (optionnel ; non implémenté dans ce lot)

Conformément aux conventions d’audit Starium.

Exemple :

```json
{
  "action": "supplier_contact.created",
  "resourceType": "supplier_contact",
  "resourceId": "sc_1",
  "newValue": {
    "supplierId": "sup_1",
    "fullName": "Julie Martin",
    "email": "julie.martin@example.com",
    "role": "Commerciale",
    "isPrimary": true
  }
}
```

---

# 16. Tests attendus

## 16.1 Unit tests SupplierContactsService

* création valide
* conflit sur `normalizedName`
* update avec conflit
* désactivation
* idempotence désactivation si retenue
* recherche paginée / filtrée
* un seul contact principal par supplier

## 16.2 Intégration

* impossible de créer un contact sur un supplier d’un autre client
* impossible de lire un contact hors client
* un nouveau `isPrimary = true` remplace l’ancien principal
* désactivation d’un contact principal retire `isPrimary`

État actuel :

* unit tests service implémentés sur les règles critiques (`fullName`, `normalizedName`, doublon nominal, désactivation principal)
* tests d’intégration backend ci-dessus à finaliser

## 16.3 Non-régression

* aucune régression sur `Supplier`
* aucune régression sur `PurchaseOrder` / `Invoice`
* aucune modification non voulue du contrat API supplier existant

---

# 17. Impact frontend

Cette RFC couvre désormais un MVP frontend opérationnel :

* section Contacts dans la fiche fournisseur (dialog existant)
* affichage de la liste des contacts d’un fournisseur
* création / édition / désactivation d’un contact
* badge visuel du contact principal
* invalidation/refetch des queries après mutation

Reste hors scope :

* affichage du contact principal dans la table liste fournisseurs
* sélection d’un contact dans les flux commande / facture

---

# 18. Ordre d’implémentation recommandé

1. Prisma : `SupplierContact` + relation `Supplier` ✅
2. migration ✅
3. service backend contacts ✅
4. contrôleur backend contacts ✅
5. tests unitaires ✅
6. tests d’intégration ⏳ à finaliser
7. extension détail fournisseur plus tard ✅ (section Contacts dans dialog existant)
8. UI plus tard ✅ (MVP livré)

---

# 19. Critères de succès

La RFC est considérée comme réussie si :

* un contact peut être créé, lu, modifié, désactivé
* un contact est toujours rattaché à un fournisseur du client actif
* les doublons évidents sont bloqués
* un seul contact principal existe par fournisseur
* les audits sont écrits
* aucune régression n’apparaît sur procurement core

---

# 20. Décision finale

Supplier Contacts complète le référentiel fournisseur en apportant la **dimension relationnelle opérationnelle**.

Cette RFC permet de passer :

> d’un fournisseur identifié
> à un fournisseur **joignable, pilotable et exploitable opérationnellement**

---

# 21. Checklist validation manuelle UI MVP

Si aucun test UI automatisé n’est branché sur `suppliers/page.tsx`, valider manuellement :

1. Ouvrir la fiche fournisseur depuis la liste.
2. Dans la section Contacts, créer un contact (avec `firstName`/`lastName` ou `fullName`) et vérifier l’affichage immédiat dans la liste.
3. Éditer le contact créé et vérifier la persistance des modifications après fermeture/réouverture du dialog.
4. Marquer un contact comme principal et vérifier l’unicité visuelle du badge `Principal`.
5. Désactiver le contact principal et vérifier :
   * statut passé à inactif,
   * suppression du badge `Principal`,
   * absence de réassignation automatique d’un autre principal.
6. Vérifier après chaque mutation (create/update/deactivate) que la liste des contacts et la vue fournisseurs sont rafraîchies.
