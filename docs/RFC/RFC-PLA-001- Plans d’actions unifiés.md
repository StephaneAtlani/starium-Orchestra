# RFC — Plans d’actions unifiés (basés sur le modèle de tâche)

## Statut

Draft

## Priorité

Haute

## Domaine

Pilotage / Projets / Risques

---

# 1. Objectif

Mettre en place un **module de plans d’actions** permettant de piloter l’exécution opérationnelle dans Starium avec une règle structurante :

> **Toute action est une tâche au sens métier.**

Cela implique :

* aucune duplication de modèle d’exécution
* un **socle unique basé sur la structure de ProjectTask**
* un plan d’actions comme **agrégateur de tâches**, pas comme moteur parallèle

---

# 2. Problème adressé

Aujourd’hui :

* les **tâches projet** sont dans `ProjectTask`
* les **réponses aux risques** sont textuelles ou peu structurées
* les **actions transverses** n’ont pas de cadre

Conséquences :

* dispersion des actions
* difficulté de pilotage global
* duplication potentielle
* absence de cockpit exécution

---

# 3. Décision structurante

## 3.1 Principe fondamental

> **Une action = une tâche**

Il n’existe **qu’un seul modèle d’exécution** :

* pas de “ManualAction”
* pas de “Action métier spécifique”
* pas de “Task-like object parallèle”

Toutes les actions reposent sur :

* une structure équivalente à `ProjectTask`
* mêmes champs
* mêmes statuts
* mêmes règles

---

## 3.2 Conséquence

Le système devient :

```text
ActionPlan
  → contient des tâches
```

Et non :

```text
ActionPlan
  → contient des objets hétérogènes
```

---

# 4. Vision fonctionnelle

Un plan d’actions est :

* un **cadre de pilotage**
* qui regroupe des **tâches exécutables**
* issues de différentes sources :

### 4.1 Types de tâches dans un plan

1. **Tâches projet existantes**

   * issues de `ProjectTask`

2. **Tâches de réponse aux risques**

   * créées pour traiter un risque

3. **Tâches libres (transverses)**

   * sans projet obligatoire
   * créées directement dans le plan

---

# 5. Modèle de données

## 5.1 Principe

On **réutilise ProjectTask comme modèle d’exécution universel**.

Deux options possibles :

### Option retenue (MVP recommandé)

> **Étendre ProjectTask pour couvrir tous les cas**

---

## 5.2 Évolution ProjectTask

Ajouter :

```prisma
model ProjectTask {
  id             String @id @default(cuid())
  clientId       String

  projectId      String?   // devient optionnel
  actionPlanId   String?   // nouveau

  riskId         String?   // lien vers ProjectRisk (optionnel)

  title          String
  description    String?

  status         ProjectTaskStatus
  priority       ProjectTaskPriority

  ownerUserId    String?
  dueDate        DateTime?

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // relations
  actionPlan     ActionPlan? @relation(fields: [actionPlanId], references: [id], onDelete: SetNull)
  risk           ProjectRisk? @relation(fields: [riskId], references: [id], onDelete: SetNull)
}
```

---

## 5.3 Modèle ActionPlan

```prisma
model ActionPlan {
  id              String @id @default(cuid())
  clientId        String

  title           String
  code            String

  description     String?

  status          ActionPlanStatus
  priority        ActionPlanPriority

  ownerUserId     String?

  startDate       DateTime?
  targetDate      DateTime?

  progressPercent Int @default(0)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  tasks           ProjectTask[]

  @@unique([clientId, code])
}
```

---

# 6. Relations clés

```text
ActionPlan
  → ProjectTask (action)

ProjectTask
  → Project (optionnel)
  → ProjectRisk (optionnel)
  → ActionPlan (optionnel)
```

---

# 7. Cas métier

## 7.1 Tâche projet classique

```text
ProjectTask
  projectId = X
  actionPlanId = null
```

## 7.2 Action de plan transverse

```text
ProjectTask
  projectId = null
  actionPlanId = Y
```

## 7.3 Action liée à un risque

```text
ProjectTask
  riskId = R
  actionPlanId = Y
```

## 7.4 Tâche projet intégrée dans un plan

```text
ProjectTask
  projectId = X
  actionPlanId = Y
```

---

# 8. Règles métier

## 8.1 Unicité du modèle

* une seule structure : `ProjectTask`
* aucune duplication

## 8.2 Liens autorisés

Une tâche peut :

* appartenir à un projet
* appartenir à un plan
* être liée à un risque

Mais :

* aucun de ces liens n’est obligatoire

## 8.3 Contraintes

* `clientId` identique partout
* pas de lien cross-client

## 8.4 Suppression

* suppression d’un plan → `actionPlanId = null`
* suppression d’un projet → `projectId = null`
* suppression d’un risque → `riskId = null`

---

# 9. API backend

## 9.1 Plans

* GET /api/action-plans
* POST /api/action-plans
* GET /api/action-plans/:id
* PATCH /api/action-plans/:id

## 9.2 Tâches dans un plan

Pas de nouveau modèle :

* utiliser les endpoints existants de `ProjectTask`

Ajout :

* PATCH task → assigner `actionPlanId`
* POST task → avec `actionPlanId`

---

# 10. Calculs

## 10.1 Progression

```text
progress = tâches DONE / tâches actives
```

## 10.2 Scope

* uniquement tâches avec `actionPlanId = plan.id`

---

# 11. UI

## 11.1 Vue plan

* liste de tâches
* filtres :

  * statut
  * priorité
  * projet
  * risque

## 11.2 Création

* créer une tâche :

  * avec ou sans projet
  * avec ou sans risque
  * avec plan pré-rempli

## 11.3 Réutilisation

* aucune UI spécifique “action”
* reuse total des composants tâche

---

# 12. Avantages

## Simplicité

* un seul modèle
* zéro duplication

## Cohérence

* même logique partout

## Puissance

* permet :

  * gestion des risques
  * gestion projet
  * pilotage transverse

## Scalabilité

* prêt pour :

  * conformité
  * audit
  * gouvernance

---

# 13. Non-objectifs

* pas de Gantt spécifique au plan
* pas de dépendances avancées
* pas de workflow complexe
* pas de duplication des tâches
* pas de moteur BPM

---

# 14. Résultat attendu

Un système où :

* toute action = une tâche
* les plans d’actions = cockpit d’exécution
* les risques = alimentent des tâches
* les projets = fournissent des tâches
* tout converge dans un modèle unique

---

# Conclusion

Cette RFC transforme Starium en :

> **un système d’exécution unifié**

où :

* projet
* risque
* action

partagent **le même moteur opérationnel : la tâche** 🚀
