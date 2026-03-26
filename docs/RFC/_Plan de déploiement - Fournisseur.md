Voici la **liste des référentiels à développer dans l’ordre** pour la brique **fournisseurs / procurement**, en restant cohérent avec la vision Starium, l’architecture modulaire, le multi-tenant strict et le couplage futur avec budgets, commandes et factures.  

## Tableau des référentiels à développer

| Ordre | Référentiel                    | Objectif                                                       | Priorité   | Pourquoi en premier / ensuite                                                                         |
| ----- | ------------------------------ | -------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------- |
| 1     | **Suppliers**                  | Référentiel maître des fournisseurs                            | Très haute | C’est la racine métier de tout le flux procurement                                                    |
| 2     | **Supplier Categories**        | Classer les fournisseurs (cloud, télécom, ERP, sécurité, etc.) | Haute      | Permet tri, filtres, reporting et cockpit                                                             |
| 3     | **Supplier Statuses**          | Actif, inactif, en revue, bloqué                               | Haute      | Nécessaire pour gouvernance et contrôle                                                               |
| 4     | **Payment Terms**              | Conditions de paiement standardisées                           | Moyenne    | Utile avant PO / Invoice pour homogénéiser les données                                                |
| 5     | **Currencies**                 | Devise de référence des fournisseurs / documents               | Moyenne    | Cohérence avec budgets et commandes                                                                   |
| 6     | **Purchase Order Statuses**    | Brouillon, envoyé, validé, partiellement reçu, clos            | Haute      | Nécessaire dès qu’on attaque les commandes                                                            |
| 7     | **Invoice Statuses**           | Brouillon, reçue, validée, payée, rejetée                      | Haute      | Nécessaire dès qu’on attaque les factures                                                             |
| 8     | **General Ledger Accounts**    | Comptes comptables généraux                                    | Très haute | Déjà nécessaire côté budget analytique / ventilation                                                  |
| 9     | **Analytical Ledger Accounts** | Comptes analytiques optionnels                                 | Haute      | Nécessaire pour lecture DAF / analytique                                                              |
| 10    | **Cost Centers**               | Centres de coûts                                               | Très haute | Base des ventilations analytiques                                                                     |
| 11    | **Document Types**             | Type de pièce : devis, BC, facture, avoir, contrat             | Moyenne    | Améliore la structuration documentaire                                                                |
| 12    | **Tax Rates**                  | TVA par défaut / taux autorisés                                | Moyenne    | Important si tu veux fiabiliser PO / Invoice                                                          |
| 13    | **Import Mappings Supplier**   | Mappings réutilisables pour import                             | Moyenne    | À développer après stabilisation du modèle fournisseur, en réutilisant la logique d’import existante  |

---

# Règles de gestion et métier

## 1. Règles transverses obligatoires

### 1.1 Scope client

* tout référentiel appartient à un `clientId`
* aucune donnée ne doit être partagée entre clients
* aucune API ne doit accepter `clientId` dans les DTO d’écriture
* toutes les lectures / écritures doivent être filtrées par le client actif

C’est une règle fondatrice du produit Starium.  

### 1.2 Backend source de vérité

* toutes les validations métier critiques sont faites côté backend
* le frontend ne fait que de l’assistance UX
* aucune règle de cohérence métier critique ne doit vivre uniquement dans l’UI

### 1.3 Pas de suppression physique par défaut

* privilégier `isActive = false`
* les référentiels doivent rester traçables
* la désactivation est préférable à la suppression

### 1.4 Audit obligatoire

Toute création / modification / désactivation d’un référentiel important doit produire un audit log selon la convention `<resource>.<action>`. 

---

## 2. Référentiel Suppliers

### Règles métier

* `name` obligatoire
* `normalizedName` calculé automatiquement (`trim + lowercase`)
* unicité recommandée sur `(clientId, normalizedName)`
* `externalId` optionnel mais prioritaire si import externe
* `vatNumber` optionnel mais fortement recommandé
* `isActive` par défaut à `true`

### Anti-doublon

Ordre de matching recommandé :

1. `externalId`
2. `vatNumber`
3. `normalizedName`

### Finalité métier

Le fournisseur est le **référentiel racine** des commandes, factures et futurs contrats fournisseurs.

---

## 3. Référentiel Supplier Categories

### Règles métier

* valeurs paramétrables par client
* unicité du code ou du nom dans le client
* exemples : Cloud, Télécom, ERP, Cybersécurité, Infogérance, Matériel

### Finalité métier

* segmenter le portefeuille fournisseurs
* filtrer les vues cockpit
* faire des KPI par catégorie

---

## 4. Référentiel Supplier Statuses

### Règles métier

* référentiel contrôlé, pas de texte libre
* statuts MVP recommandés :

  * `ACTIVE`
  * `INACTIVE`
  * `UNDER_REVIEW`
  * `BLOCKED`

### Finalité métier

* empêcher l’utilisation d’un fournisseur bloqué
* distinguer les fournisseurs historiques des fournisseurs exploitables

---

## 5. Référentiel Payment Terms

### Règles métier

* référentiel standardisé par client
* exemples :

  * `COMPTANT`
  * `NET_30`
  * `NET_45`
  * `NET_60`
* utilisable comme valeur par défaut sur fournisseur puis héritée par commande / facture

### Finalité métier

* homogénéiser les documents
* préparer les futures vues cash / échéances

---

## 6. Référentiel Currencies

### Règles métier

* référentiel réduit en MVP
* exemple : `EUR`, `USD`, `GBP`
* une devise par document
* pas de conversion monétaire implicite en MVP, comme déjà posé dans la logique de reporting budgetaire si plusieurs devises sont détectées. 

### Finalité métier

* cohérence entre fournisseurs, budgets, PO et factures

---

## 7. Référentiel Purchase Order Statuses

### Règles métier

Statuts MVP recommandés :

* `DRAFT`
* `SUBMITTED`
* `APPROVED`
* `SENT`
* `PARTIALLY_RECEIVED`
* `CLOSED`
* `CANCELLED`

### Finalité métier

* structurer le cycle de vie d’un bon de commande
* éviter les états libres incohérents
* préparer le lien avec engagement budgétaire

---

## 8. Référentiel Invoice Statuses

### Règles métier

Statuts MVP recommandés :

* `DRAFT`
* `RECEIVED`
* `VALIDATED`
* `PAID`
* `REJECTED`
* `CANCELLED`

### Finalité métier

* gouverner la facture
* préparer la lecture des encours et paiements
* brancher proprement la consommation budgétaire

---

## 9. Référentiels comptables et analytiques

Ces référentiels doivent être développés tôt car ils structurent déjà le budget analytique. 

### 9.1 General Ledger Accounts

* compte comptable général
* unicité par `(clientId, code)`
* obligatoire sur les lignes budgétaires si la comptabilité budgétaire est activée

### 9.2 Analytical Ledger Accounts

* compte analytique optionnel
* unicité par `(clientId, code)`

### 9.3 Cost Centers

* centre de coûts par client
* unicité par `(clientId, code)`
* utilisé pour les ventilations analytiques
* si une ligne est `ANALYTICAL`, la somme des ventilations doit être `100%` 

---

## 10. Référentiel Document Types

### Règles métier

Types recommandés :

* `QUOTE`
* `PURCHASE_ORDER`
* `INVOICE`
* `CREDIT_NOTE`
* `CONTRACT`
* `OTHER`

### Finalité métier

* classer les pièces
* rendre la GED future plus exploitable
* faciliter les filtres et exports

---

## 11. Référentiel Tax Rates

### Règles métier

* référentiel des taux autorisés
* exemple : `0`, `5.5`, `10`, `20`
* valeur par défaut possible au niveau client ou fournisseur
* ne pas laisser de saisie libre si tu veux une donnée propre

### Finalité métier

* cohérence PO / Invoice
* meilleure qualité de calcul HT / TTC plus tard

---

## 12. Référentiel Import Mappings Supplier

### Règles métier

* mappings sauvegardés par client
* preview avant exécution
* réutilisation sur imports futurs
* anti-doublon basé sur `externalId` ou clé composite, dans la même philosophie que l’import budget. 

### Finalité métier

* industrialiser l’import fournisseur
* éviter les recréations manuelles
* accélérer l’onboarding client

---

# Ordre de développement recommandé

## Bloc 1 — socle maître

1. `Suppliers`
2. `Supplier Categories`
3. `Supplier Statuses`

## Bloc 2 — socle documentaire et achat

4. `Payment Terms`
5. `Currencies`
6. `Purchase Order Statuses`
7. `Invoice Statuses`

## Bloc 3 — socle analytique / DAF

8. `General Ledger Accounts`
9. `Analytical Ledger Accounts`
10. `Cost Centers`

## Bloc 4 — structuration avancée

11. `Document Types`
12. `Tax Rates`

## Bloc 5 — accélération opérationnelle

13. `Import Mappings Supplier`

---

# Recommandation finale

Si tu veux aller au plus efficace pour Starium :

**commence par**

* Suppliers
* Supplier Categories
* Supplier Statuses
* puis seulement PO / Invoice

Et en parallèle, garde les référentiels comptables / analytiques alignés avec la logique RFC-021 pour éviter de refaire deux fois le modèle. 

Je peux maintenant te transformer ça en **RFC de cadrage complète “Référentiels Procurement”**.
