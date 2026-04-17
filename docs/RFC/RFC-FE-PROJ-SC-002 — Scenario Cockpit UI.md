# RFC-FE-PROJ-SC-002 — Scenario Cockpit UI

## Statut

🟢 **Implémenté (MVP FE)** — comparaison **deux scénarios** (baseline / comparé), deltas sur agrégats API, pas de page détail scénario dédiée ni comparaison « réalisé projet » dans ce lot.

## Priorité

Moyenne à haute

## Dépendances

- `RFC-FE-PROJ-SC-001`
- `RFC-PROJ-SC-002`
- `RFC-PROJ-SC-003`
- `RFC-PROJ-SC-004`
- `RFC-PROJ-SC-005`
- `RFC-PROJ-SC-006`

---

# 1. Objectif

Créer un **cockpit de décision** au niveau **projet** pour comparer **deux scénarios** (baseline et scénario comparé) sur les axes couverts par les synthèses API :

- budget (`budgetSummary`)
- ressources (`resourceSummary`)
- délais (`timelineSummary`)
- capacité (`capacitySummary`)
- risques (`riskSummary`)

**Périmètre MVP livré** : comparaison **scénario vs scénario** (pas de vue « réalisé projet » / exécution dans ce lot).

---

# 2. UX attendue

- vue synthèse multi-cartes (écarts sur champs numériques des summaries)
- comparateur **baseline + comparé** (sélecteurs modifiables, scénarios non archivés uniquement)
- indicateurs de variance (delta absolu, delta % si baseline métrique non nulle, pas de % si baseline = 0)
- alertes surcharge (capacité) et criticité (risques) sur le **scénario comparé**
- navigation explicite vers fiche décisionnelle (budget), planning, risques, liste scénarios ; capacité : texte inline + lien retour liste scénarios

---

# 3. Données attendues

Le cockpit consomme les champs déjà agrégés sur **`GET /api/projects/:projectId/scenarios/:scenarioId`** (détail scénario) :

- `budgetSummary`
- `resourceSummary`
- `timelineSummary`
- `riskSummary`
- `capacitySummary`

La **liste** `GET /api/projects/:projectId/scenarios` sert à résoudre la baseline (`status === SELECTED`) et le comparé par défaut (tri canonique frontend documenté dans le plan d’implémentation produit).

Le frontend ne calcule que le **rendu**, les **deltas** (comparé − baseline) et le **formatage** ; pas de règle métier backend dupliquée.

---

# 4. Structure implémentée

```text
apps/web/src/features/projects/scenario-cockpit/
```

| Composant | Rôle |
|-----------|------|
| `ScenarioCockpitPage` | Orchestration queries, états, résolution baseline / comparé |
| `ScenarioComparisonSelector` | Sélection baseline et comparé (libellés métier, pas d’ID visibles) |
| `ScenarioVarianceCards` | Écarts par bloc summary |
| `ScenarioCapacityAlertPanel` | Alertes capacité + lien retour liste scénarios |
| `ScenarioRiskPanel` | Synthèse risque + lien registre risques projet |

Utilitaires : `sort-scenarios-cockpit.ts`, `scenario-delta-utils.ts`, `scenario-scenario-label.ts`.

**Route App Router** : `apps/web/src/app/(protected)/projects/[projectId]/scenarios/cockpit/page.tsx`  
**URL** : `/projects/:projectId/scenarios/cockpit`  
**Entrée** : CTA « Ouvrir le cockpit » depuis `/projects/:projectId/scenarios` (pas d’onglet workspace « Cockpit »).

**React Query** : clés existantes `projectQueryKeys.scenarios` + `projectQueryKeys.scenarioDetail(clientId, projectId, scenarioId)` — pas de cache agrégé « cockpit ».

---

# 5. Tests

- tri / résolution du comparé par défaut (`sort-scenarios-cockpit.spec.ts`)
- deltas numériques (`scenario-delta-utils.spec.ts`)
- onglet Scénarios actif sur la route cockpit (`project-scenarios-view.spec.ts`)

---

# 6. Plan d’implémentation

1. ~~Introduire les contrats API de synthèse.~~ — **Déjà exposés** par le détail scénario backend.
2. ~~Créer page/section cockpit.~~ — Route `.../scenarios/cockpit` + feature `scenario-cockpit/`.
3. ~~Ajouter comparaison baseline vs option.~~ — MVP : baseline `SELECTED` + comparé par défaut, modifiables.
4. ~~Ajouter panneaux d’alertes et drill-down.~~ — Panneaux capacité / risques + liens accès rapides.

---

# 7. Points de vigilance

- Les agrégats backend doivent rester la source de vérité ; le cockpit ne fait qu’afficher et comparer.
- Attention au bruit visuel : le but est la décision, pas l’exhaustivité.
- Préférer des indicateurs métier lisibles à des structures brutes ; **aucun UUID de scénario** en libellé UI (règle workspace « valeur, pas ID »).

---

# 8. Hors périmètre MVP (documenté)

- Page détail scénario dédiée (`/projects/:projectId/scenarios/:scenarioId` comme écran cockpit).
- Comparaison « réalisé projet » / multi-scénarios avancée.
- Refactor global du module projets.
