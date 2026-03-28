# RFC-PROJ-018 — ProjectRisk — compatibilité EBIOS RM minimale (plan)

> **Statut** : plan de travail — pas d’implémentation dans ce document.  
> **Périmètre** : compléter le modèle `ProjectRisk` et le formulaire associé pour une **compatibilité EBIOS RM minimale**, **audit-ready** au sens « structure et traçabilité de base », sans refonte du module ni matrice multi-scénarios.

---

## Contexte

Le formulaire actuel de gestion des risques est **partiellement aligné** sur les bonnes pratiques EBIOS RM (vraisemblance × impact, stratégies de traitement, résiduel, suivi), mais il **manque d’éléments structurants** (origine, scénario explicite, impact métier, justifications) pour être présenté comme **cohérent avec une lecture EBIOS** dans un audit léger.

---

## Objectif

Compléter **uniquement** le modèle de données et le **formulaire** (API + UI) pour une **compatibilité EBIOS RM simplifiée**, sans complexifier excessivement le MVP.

---

## 1. Identification du risque

| Élément | Décision plan |
|--------|----------------|
| **Origine** | Nouveau champ obligatoire **`threatSource`** (`String`) — libellé métier : origine / source de la menace (ex. cyberattaque, fournisseur, erreur humaine). |
| **Scénario structuré** | **Renommer ou clarifier** le champ actuel de description longue : cible **`riskScenario`** (ou équivalent documenté), rôle = **description structurée du scénario** ; **format conseillé** affiché en aide : *« si X alors Y »*. Si le renommage Prisma/API est trop coûteux en court terme, **conserver le nom technique** mais imposer le libellé UX + validation / placeholder sur ce format. |

---

## 2. Impact métier

| Élément | Décision plan |
|--------|----------------|
| **Impact métier** | Nouveau champ **`businessImpact`** (`String`) — synthèse des conséquences pour l’organisation (**obligatoire** au sens du plan). |
| **Catégorie d’impact** | Nouveau champ optionnel **`impactCategory`** — enum : `FINANCIAL`, `OPERATIONAL`, `LEGAL`, `REPUTATION`. |

---

## 3. Vraisemblance

| Élément | Décision plan |
|--------|----------------|
| **Score** | Conserver **`probability`** sur l’échelle **1–5**. |
| **Justification** | Nouveau champ optionnel **`likelihoodJustification`** (`String`) — texte court expliquant le score (alignement méthode EBIOS : le score n’est pas une opinion non sourcée). |

---

## 4. Traitement du risque

| Élément | Décision plan |
|--------|----------------|
| **Stratégie** | Rendre **`treatmentStrategy`** **obligatoire** — enum : `AVOID`, `REDUCE`, `TRANSFER`, `ACCEPT` (déjà dans le modèle logique ; contrainte création / mise à jour + formulaire). |
| **Plans** | Conserver **`mitigationPlan`** et **`contingencyPlan`**. |

---

## 5. Risque résiduel

| Élément | Décision plan |
|--------|----------------|
| **Niveau résiduel** | Rendre **explicite** que **`residualRiskLevel`** est la **criticité résiduelle après traitement** (documenté dans le modèle / API / aide UI) ; règle de calcul ou de saisie : **alignée sur le service existant** (score dérivé vs saisie guidée) — à préciser à l’implémentation sans introduire un second référentiel de criticité. |
| **Justification** | Nouveau champ optionnel **`residualJustification`** (`String`) — pourquoi ce niveau résiduel est accepté ou encore élevé. |

---

## 6. Lien avec le périmètre

| Élément | Décision plan |
|--------|----------------|
| **Actif / périmètre** | Nouveau champ optionnel **`impactedAsset`** (`String`) — biens supports, périmètre technique ou organisationnel impacté ; **ou** lien vers une **référence projet** déjà existante si le produit expose un identifiant stable réutilisable (sans nouvelle entité au MVP). |

---

## 7. Frontend — structure du formulaire

Ordre des sections (remplace la granularité actuelle « EBIOS » par une lecture plus standard) :

1. **Scénario** — titre, `threatSource`, `riskScenario` (format conseillé), `impactedAsset` / lien périmètre si présent.  
2. **Évaluation** — `probability`, `likelihoodJustification`, `impact` (gravité 1–5 inchangée), criticité dérivée affichée comme aujourd’hui.  
3. **Impact métier** — `businessImpact`, `impactCategory`.  
4. **Traitement** — `treatmentStrategy` (obligatoire), `mitigationPlan`, `contingencyPlan`.  
5. **Résiduel** — `residualRiskLevel`, `residualJustification`.  
6. **Suivi** — statut, dates, échéances (champs existants du suivi).

---

## 8. Non-objectifs (hors périmètre)

- Pas d’implémentation **complète** EBIOS RM (ateliers, graphes de dépendance, scénarios multiples liés, etc.).  
- Pas de **matrices multi-scénarios** ni cartographie menaces avancée.  
- Pas de **scoring avancé** au-delà de la grille P×I / criticité déjà en place + champs de justification.  
- **Pas de refonte** du module Projets / risques : **ajouts ciblés** seulement.

---

## Conclusion (vision produit)

Après réalisation de ce plan, le modèle **`ProjectRisk`** devient **compatible avec une approche EBIOS RM simplifiée** : champs minimums pour **identifier**, **évaluer**, **traiter** et **documenter le résiduel** avec des **justifications traçables**. Cela prépare une **évolution future** vers un **module conformité** plus complet (exigences, preuves, cartographie) **sans bloquer** le MVP actuel.

---

## Règles d’implémentation (rappel)

- **Uniquement** les champs **nécessaires** listés ci-dessus (+ migrations Prisma, DTO, validation, tests service, formulaire).  
- **Pas** de refonte du module au-delà de l’extension du modèle et du parcours formulaire / liste si besoin d’affichage synthétique.
