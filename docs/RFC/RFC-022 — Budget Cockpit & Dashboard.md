# RFC-022 — Budget Cockpit & Dashboard (Configurable)

## Statut

Draft

## Priorité

Haute

## Dépendances

* RFC-015-2 — Budget Management Backend
* RFC-015-1B — Financial Core
* RFC-016 — Budget Reporting API
* RFC-013 — Audit logs

---

# 1. Objectif

Mettre en place un **cockpit budgétaire configurable** permettant :

* une **lecture immédiate de la santé financière**
* l’identification rapide des anomalies
* un accès direct aux actions (drill-down)
* une **adaptation par client (DSI / DAF / DG)**

👉 Le cockpit est un **outil de pilotage**, pas de saisie.

---

# 2. Problème adressé

Aujourd’hui :

* données disponibles (RFC-016) mais **non exploitables rapidement**
* dashboards figés → **non adaptés aux besoins métiers**
* absence de personnalisation → **faible adoption**

👉 Besoin d’un cockpit :

* simple
* rapide
* configurable
* orienté décision

---

# 3. Périmètre MVP

## Inclus

* widgets cockpit configurables
* layout personnalisable
* filtres par défaut
* seuils simples d’alerte
* navigation drill-down
* configuration par client

## Exclus

* moteur d’alerting avancé
* IA
* dashboard multi-clients (phase suivante)
* personnalisation par utilisateur (MVP = client only)

---

# 4. Concepts clés

## 4.1 Cockpit

Vue synthétique composée de widgets.

## 4.2 Widget

Bloc affichant :

* KPI
* liste
* graphique
* alerte

## 4.3 Configuration cockpit

Paramétrage stocké en base, propre à un client.

---

# 5. Modèle de données (Prisma)

## 5.1 BudgetDashboardConfig

```prisma
model BudgetDashboardConfig {
  id            String   @id @default(cuid())
  clientId      String

  name          String
  isDefault     Boolean  @default(true)

  defaultExerciseId String?
  defaultBudgetId   String?

  layoutConfig  Json
  filtersConfig Json?
  thresholdsConfig Json?

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  client        Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@index([clientId])
}
```

---

## 5.2 BudgetDashboardWidget

```prisma
model BudgetDashboardWidget {
  id           String   @id @default(cuid())
  clientId     String

  configId     String
  type         BudgetDashboardWidgetType

  title        String
  position     Int
  size         String

  settings     Json?

  isActive     Boolean @default(true)

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  config       BudgetDashboardConfig @relation(fields: [configId], references: [id], onDelete: Cascade)

  @@index([clientId, configId])
}
```

---

## 5.3 Enum

```prisma
enum BudgetDashboardWidgetType {
  KPI
  ALERT_LIST
  ENVELOPE_LIST
  LINE_LIST
  CHART
}
```

---

# 6. Configuration cockpit

## 6.1 Layout

```json
{
  "columns": 2,
  "widgets": [
    { "id": "w1", "position": 1 },
    { "id": "w2", "position": 2 }
  ]
}
```

---

## 6.2 Filters

```json
{
  "exerciseId": "xxx",
  "budgetId": "xxx",
  "expenseType": "OPEX"
}
```

---

## 6.3 Thresholds

```json
{
  "consumptionRateWarning": 0.8,
  "consumptionRateCritical": 1,
  "negativeRemaining": true
}
```

---

# 7. Types de widgets MVP

## KPI

* total budget
* consumed
* committed
* remaining
* forecast

## Alert list

* lignes en dépassement
* remaining négatif

## Envelope list

* enveloppes critiques

## Line list

* lignes problématiques

## Chart

* RUN / BUILD
* consommation dans le temps

---

# 8. API Backend

Préfixe : `/api/budget-dashboard`

## 8.1 GET cockpit

```
GET /api/budget-dashboard
```

Retour :

```json
{
  "config": {},
  "widgets": [
    {
      "id": "w1",
      "type": "KPI",
      "data": {}
    }
  ]
}
```

---

## 8.2 GET configs

```
GET /api/budget-dashboard/configs
```

---

## 8.3 POST config

```
POST /api/budget-dashboard/configs
```

---

## 8.4 PATCH config

```
PATCH /api/budget-dashboard/configs/:id
```

---

## 8.5 DELETE config (optionnel MVP)

---

# 9. Règles métier

### 1 — Scope client strict

* toujours basé sur `X-Client-Id`
* aucune fuite inter-client

---

### 2 — Backend source de vérité

* tous les KPI viennent de RFC-016
* aucun calcul critique côté frontend

---

### 3 — Configuration client uniquement (MVP)

* pas de config utilisateur
* une config active par client

---

### 4 — Widgets dynamiques

* activables / désactivables
* ordonnables
* configurables

---

### 5 — Navigation

Chaque widget peut définir :

```json
{
  "route": "/budgets/:id/envelopes",
  "filters": {
    "onlyOverrun": true
  }
}
```

---

# 10. Sécurité

Guards standards :

```
JwtAuthGuard
ActiveClientGuard
ModuleAccessGuard
PermissionsGuard
```

Permissions :

```
budgets.read → lecture cockpit
budgets.update → config cockpit
```

---

# 11. Audit logs

Actions :

```
budget_dashboard_config.created
budget_dashboard_config.updated
budget_dashboard_config.deleted
```

---

# 12. Frontend (Next.js)

## Structure

```
features/budget-dashboard/
```

### Pages

```
/budgets/dashboard
```

---

## Composants

* DashboardContainer
* WidgetRenderer
* KPIWidget
* AlertListWidget
* ChartWidget

---

## Règles

* aucun calcul métier
* uniquement affichage des données API
* gestion loading / error / empty

---

# 13. Performance

MVP :

* appels API par widget
* pas de cache

V2 :

* agrégation côté backend (endpoint unique optimisé)
* cache Redis possible

---

# 14. Évolution future

* vue multi-clients
* personnalisation utilisateur
* alerting avancé
* IA prédictive
* recommandations automatiques

---

# 15. Résultat attendu

👉 Un cockpit :

* lisible en 5 secondes
* orienté décision
* configurable par client
* connecté directement aux données financières

---

# 16. Résumé

```
Cockpit = lecture rapide + anomalies + navigation + configuration
```
