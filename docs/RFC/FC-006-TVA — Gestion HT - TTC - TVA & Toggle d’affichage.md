# RFC-006-TVA — Gestion HT - TTC - TVA & Toggle d’affichage

## Statut

Proposé

---

# 1. Objectif

Introduire dans Starium Orchestra :

1. Une gestion **explicite de la fiscalité** (HT / TVA / TTC) pour les objets financiers (commandes, factures, événements).
2. Un **mode d’affichage configurable (HT/TTC)** au niveau client.
3. Un **toggle UI HT/TTC** pour basculer dynamiquement l’affichage.
4. Une **saisie flexible (HT ou TTC)** dans les formulaires.

---

# 2. Principes directeurs

## 2.1 Séparation stricte

| Concept          | Rôle                           |
| ---------------- | ------------------------------ |
| Stockage métier  | Toujours cohérent et explicite |
| Mode d’affichage | Choix utilisateur              |
| Mode de saisie   | Confort utilisateur            |

---

## 2.2 Règle centrale

👉 **Les budgets sont pilotés en HT**

👉 **Les objets financiers (factures, commandes, événements) stockent HT + TVA + TTC**

---

# 3. Périmètre

## Inclus

* Client settings (HT/TTC)
* BudgetLine (ajustement léger)
* FinancialEvent (refonte fiscale)
* futurs modules :

  * commandes
  * factures
* UI (toggle + formulaires)
* API & validation

## Exclu

* multi TVA par ligne
* fiscalité internationale avancée
* moteur comptable

---

# 4. Paramétrage Client

## 4.1 Modèle

```prisma
enum TaxDisplayMode {
  HT
  TTC
}

enum TaxInputMode {
  HT
  TTC
}

model Client {
  id                  String         @id @default(cuid())

  taxDisplayMode      TaxDisplayMode @default(HT)
  taxInputMode        TaxInputMode   @default(HT)
  defaultTaxRate      Decimal?       @db.Decimal(5, 2)
}
```

---

## 4.2 Règles

* `taxDisplayMode` → affichage par défaut
* `taxInputMode` → saisie par défaut
* `defaultTaxRate` → valeur pré-remplie

⚠️ Ces paramètres **n’impactent pas le stockage interne**

---

# 5. Budget (règles simplifiées)

## 5.1 Décision

👉 Tous les montants budget sont **HT**

## 5.2 Implication

Champs existants deviennent implicitement :

* `initialAmount` = HT
* `revisedAmount` = HT
* `forecastAmount` = HT
* etc.

---

## 5.3 Extension

```prisma
model BudgetLine {
  id        String   @id @default(cuid())
  taxRate   Decimal? @db.Decimal(5, 2)
}
```

Usage :

* suggestion TVA
* affichage TTC estimé

---

# 6. FinancialEvent (core fiscal)

## 6.1 Nouveau modèle

```prisma
model FinancialEvent {
  id          String   @id @default(cuid())

  amount      Decimal? @db.Decimal(18, 2) // legacy

  amountHt    Decimal  @db.Decimal(18, 2)
  taxRate     Decimal? @db.Decimal(5, 2)
  taxAmount   Decimal? @db.Decimal(18, 2)
  amountTtc   Decimal? @db.Decimal(18, 2)
}
```

---

## 6.2 Règles

* `amountHt` obligatoire
* `taxRate` optionnel mais recommandé
* `amountTtc` calculé si absent

---

# 7. Commandes & Factures (design futur obligatoire)

Tous les futurs modèles devront inclure :

```prisma
amountHt
taxRate
taxAmount
amountTtc
currency
isTaxIncludedInput
```

---

# 8. Calculs

## 8.1 Saisie HT

```
taxAmount = amountHt * taxRate / 100
amountTtc = amountHt + taxAmount
```

## 8.2 Saisie TTC

```
amountHt = amountTtc / (1 + taxRate / 100)
taxAmount = amountTtc - amountHt
```

---

## 8.3 Règles techniques

* Decimal uniquement (Prisma)
* jamais de float JS
* arrondi à 2 décimales

---

# 9. API Backend

## 9.1 Input accepté

Cas valides :

* `amountHt + taxRate`
* `amountTtc + taxRate`
* `amountHt + taxAmount + amountTtc`

---

## 9.2 Validation

Rejeter :

* montant seul sans TVA
* incohérence HT / TTC

---

## 9.3 Output API

Toujours retourner :

```json
{
  "amountHt": 1000,
  "taxRate": 20,
  "taxAmount": 200,
  "amountTtc": 1200
}
```

---

# 10. UI — Toggle HT / TTC

## 10.1 Composant global

Ajouter un **toggle universel** :

```
[ HT | TTC ]
```

---

## 10.2 Règles

* valeur initiale = `Client.taxDisplayMode`
* override possible localement
* persistance possible (localStorage)

---

## 10.3 Impact

Le toggle agit uniquement sur :

* affichage
* formats
* labels

⚠️ Il ne modifie jamais les données stockées

---

# 11. UI — Affichage

## 11.1 Standard

Toujours afficher le type :

* `10 000 € HT`
* `12 000 € TTC`

---

## 11.2 Double affichage (recommandé)

Exemple :

```
10 000 € HT
≈ 12 000 € TTC
```

---

# 12. UI — Formulaires

## 12.1 Mode de saisie

* hérite de `taxInputMode`
* switch possible :

```
Saisie : [ HT | TTC ]
```

---

## 12.2 Comportement

Si HT :

* user saisit HT + TVA
* TTC calculé

Si TTC :

* user saisit TTC + TVA
* HT calculé

---

## 12.3 UX attendue

* recalcul en temps réel
* champs dérivés verrouillés
* validation immédiate

---

# 13. Import

## 13.1 Colonnes supportées

* amount_ht
* amount_ttc
* tax_rate
* tax_amount

---

## 13.2 Règles

| Input      | Action   |
| ---------- | -------- |
| HT + rate  | calc TTC |
| TTC + rate | calc HT  |
| HT + TVA   | calc TTC |
| incohérent | rejet    |

---

# 14. Reporting

## 14.1 Base

👉 Tous les agrégats = HT

---

## 14.2 Option

* affichage TTC
* colonne TVA

---

## 14.3 Exemple

| KPI          | Valeur |
| ------------ | ------ |
| Budget HT    | 100k   |
| Consommé HT  | 60k    |
| Consommé TTC | 72k    |
| TVA          | 12k    |

---

# 15. Migration

## 15.1 Hypothèse

👉 Tous les montants existants = HT

---

## 15.2 Étapes

1. Ajouter champs Client
2. Ajouter champs FinancialEvent
3. Backfill :

   * amount → amountHt
4. mettre `taxRate = null`
5. mettre `amountTtc = null`
6. update services

---

# 16. Audit logs

Ajouter :

* `financial-event.created`
* `financial-event.updated`
* `client.tax-settings.updated`

---

# 17. Risques

## 17.1 Mauvaise compréhension HT/TTC

→ corriger via UI explicite

## 17.2 Incohérence frontend/backend

→ backend = source de vérité

## 17.3 Dette legacy `amount`

→ marquer deprecated

---

# 18. Plan d’implémentation

## Phase 1 — Backend

* Client config
* FinancialEvent fields
* calcul TVA
* DTO + validation

## Phase 2 — UI

* toggle HT/TTC
* affichage double
* formulaires

## Phase 3 — Migration

* backfill
* compat legacy

## Phase 4 — Extensions

* commandes
* factures

---

# 19. Résultat attendu

Après implémentation :

* plus aucune ambiguïté HT/TTC
* cohérence budget vs factures
* UX moderne et flexible
* base prête pour module DAF
 
---
## 19.1 Note de conformité (vérification)
Lors de la vérification du `18/03/2026`, l’affichage HT/TTC des **événements financiers** dans le `Budget Line Intelligence Drawer` (onglets “Commandes & engagements”, “Factures & consommation”, et bloc “Dernier événement”) consomme encore la valeur legacy `amount` au lieu de `amountHt/amountTtc`.

Conséquence : le toggle `taxDisplayMode` n’est pas reflété par un label HT/TTC explicite côté drawer pour ces événements.

Backend : conforme (persistance `amountHt/taxRate/taxAmount/amountTtc`).
À faire (frontend) : basculer le rendu des événements sur `amountHt/amountTtc` et appliquer la règle transactionnel (TTC réel, pas de `≈`).

# 20. Prompt Cursor (ultra optimisé)

```text
Implémente la RFC HT/TTC/TVA avec ces règles strictes :

1. Les budgets restent en HT (aucun changement structurel).
2. Ajouter sur Client :
   - taxDisplayMode (HT|TTC)
   - taxInputMode (HT|TTC)
   - defaultTaxRate
3. Ajouter sur FinancialEvent :
   - amountHt (required)
   - taxRate
   - taxAmount
   - amountTtc
   - conserver amount en legacy
4. Le backend doit accepter une saisie HT ou TTC et recalculer systématiquement les champs dérivés.
5. Validation stricte des incohérences.
6. Créer un helper de calcul TVA (Decimal only).
7. Ne jamais utiliser de float JS.
8. Ajouter audit logs.
9. Ne pas casser multi-tenant ni permissions.
10. Documenter que les montants existants sont en HT.

Frontend :
11. Ajouter un toggle global HT/TTC.
12. Ajouter un mode de saisie HT/TTC dans les formulaires.
13. Afficher systématiquement HT ou TTC explicitement.
```

