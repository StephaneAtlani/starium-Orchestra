# RFC-021-CORR — Compte comptable optionnel par client

## Statut

Draft

## Type

**Correction d’architecture**

## Corrige

RFC-021 — Analytical Dimensions & Budget Allocation Splits

---

# 1. Contexte

Dans la RFC-021 actuelle, une **BudgetLine** doit obligatoirement avoir un :

```
generalLedgerAccountId
```

Cela signifie qu’une ligne budgétaire **ne peut pas être créée sans compte comptable**.

Cette règle est pertinente pour les organisations qui pilotent leur budget **en lien direct avec la comptabilité ou la DAF**.

Cependant, dans la réalité :

* beaucoup de **DSI ne pilotent pas par compte comptable**
* ils pilotent par :

  * application
  * projet
  * fournisseur
  * domaine IT
  * service

Starium Orchestra étant un **cockpit de pilotage du SI**, cette contrainte devient trop rigide.

---

# 2. Problème

L’obligation actuelle entraîne plusieurs problèmes.

### Blocage fonctionnel

Un client qui n’utilise pas les comptes comptables **ne peut pas créer de ligne budgétaire**.

### Mauvaise abstraction

Le **compte comptable est une dimension financière**, pas une dimension universelle.

### Mauvaise flexibilité SaaS

Dans un produit **multi-client**, certaines dimensions doivent être **configurables**, pas imposées.

---

# 3. Décision

Le **compte comptable devient optionnel dans le modèle**.

Mais il peut être **rendu obligatoire via une configuration client**.

---

# 4. Nouvelle règle métier

La règle devient :

```
Si la comptabilité budgétaire est activée pour le client
    → le compte comptable est obligatoire

Sinon
    → le compte comptable est optionnel
```

---

# 5. Modification du modèle de données

Actuellement :

```prisma
generalLedgerAccountId String
```

Devient :

```prisma
generalLedgerAccountId String?
```

Relation Prisma :

```prisma
generalLedgerAccount GeneralLedgerAccount?
```

Ainsi :

* une ligne peut exister sans compte comptable
* la contrainte devient **métier**, pas **structurelle**

---

# 6. Configuration client

Ajouter une configuration côté client.

Exemple :

```
budgetAccountingEnabled: boolean
```

Valeur recommandée par défaut :

```
false
```

Justification :

* plus adapté aux DSI
* activation possible pour les clients finance

---

# 7. Validation backend

La validation ne se fait plus au niveau du schéma mais dans le service.

Pseudo-code :

```
si client.budgetAccountingEnabled = true
    et generalLedgerAccountId absent

alors
    erreur : compte comptable obligatoire
```

Sinon la création est autorisée.

---

# 8. Impact API

Les DTO deviennent :

```
generalLedgerAccountId?: string
```

Le champ devient optionnel côté API.

La validation finale dépendra de la configuration client.

---

# 9. Impact frontend

Le formulaire de création de **BudgetLine** doit s’adapter.

### Si la comptabilité est activée

* champ **Compte comptable**
* obligatoire

### Si la comptabilité est désactivée

* champ optionnel
* ou invisible

---

# 10. Migration

Migration Prisma :

```
generalLedgerAccountId → nullable
```

Aucune migration de données nécessaire.

---

# 11. Compatibilité

### Clients utilisant déjà les comptes comptables

Aucun changement.

Ils peuvent activer :

```
budgetAccountingEnabled = true
```

### Clients ne les utilisant pas

Ils pourront désormais créer des lignes budgétaires sans compte comptable.

---

# 12. Bénéfices

Cette correction apporte :

* flexibilité multi-client
* meilleure adoption par les DSI
* suppression d’un blocage produit
* architecture SaaS plus propre

---

# 13. Résumé

Le compte comptable reste une **dimension financière importante**, mais il ne doit pas être imposé universellement.

Il devient donc :

```
dimension optionnelle
activable par client
```

Cette correction rend le modèle budgétaire **plus flexible et plus aligné avec les usages réels des DSI**.

