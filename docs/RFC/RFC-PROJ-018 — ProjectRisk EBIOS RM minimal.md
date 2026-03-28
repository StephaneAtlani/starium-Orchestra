# RFC-PROJ-018 — ProjectRisk — compatibilité EBIOS RM minimale (plan)

> **Statut** : plan de travail — pas d’implémentation dans ce document.  
> **Périmètre** : compléter le modèle `ProjectRisk` et le formulaire associé pour une **compatibilité EBIOS RM simplifiée** (alignée ISO 27005), **audit-ready** au sens « structure et traçabilité de base », sans refonte du module ni matrice multi-scénarios.

---

## Contexte

Le formulaire actuel de gestion des risques est **fonctionnel mais incomplet**. Il est **partiellement aligné** sur les bonnes pratiques EBIOS RM (vraisemblance × impact, stratégies de traitement, résiduel, suivi), mais il **manque d’éléments structurants** (origine, scénario explicite, impact métier, justifications, traitement formalisé obligatoire) pour être présenté comme **cohérent avec une lecture EBIOS** dans un audit léger.

---

## Objectif

Compléter **uniquement** le modèle de données et le **formulaire** (API + UI) pour une **compatibilité EBIOS RM simplifiée**, **sans complexifier** le MVP existant : pas de nouvelle entité métier, pas de workflow EBIOS complet.

---

## Alignement avec le schéma existant

Référence : [`ProjectRisk`](../../apps/api/prisma/schema.prisma) (modèle Prisma).

**Déjà présent** : `title`, `description`, `category`, `probability`, `impact`, `criticalityScore`, `criticalityLevel`, `mitigationPlan`, `contingencyPlan`, `ownerUserId`, `status`, `dueDate`, `detectedAt`, `closedAt`, `reviewDate`, `treatmentStrategy` (optionnel aujourd’hui), `residualRiskLevel` (optionnel), lien conformité optionnel.

**Clarification `title` vs scénario structuré**

- **`title`** : libellé **court** du risque — utilisé dans les **listes, tableaux, navigation** (ligne du registre).
- **`riskScenario`** (rôle métier ; nom de champ cible ou équivalent) : **description structurée** du scénario, format recommandé *« Si X alors Y »*.
- Les deux champs sont **complémentaires** et **non redondants** : le titre résume ; le scénario documente la chaîne causale.

**Décision `description` vs `riskScenario` (choix différé, sans bloquer le MVP fonctionnel)**

- **Soit** le champ existant **`description`** est **conservé** et joue le rôle de scénario structuré (UX + validation / aide alignées sur « Si X alors Y »).
- **Soit** une **migration future** renomme `description` → `riskScenario` pour aligner le nom technique.
- Ce choix est **différé** : il **n’impacte pas** la livrée fonctionnelle du MVP tant que le rôle du champ est clair dans le formulaire et la doc.

**Règles transverses (rappel)**

- **`treatmentStrategy`** : obligatoire à la **création** ; obligatoire à la **mise à jour** lorsque le risque est considéré comme **actif** (non clôturé / hors périmètre « archivé lecture seule » selon règle produit retenue) — à refléter dans les **DTO** create/update avec **validation** explicite (class-validator ou équivalent).
- **`residualRiskLevel`** : règle métier cible — niveau **inférieur ou égal** à la criticité **initiale** attendue **après** traitement (ordre sur l’échelle `ProjectRiskCriticality`). En **MVP** : **validation souple** uniquement (message d’aide, warning, pas de rejet systématique).
- **`closedAt`** : **pas** de saisie libre — **dérivé** du passage au statut **`CLOSED`** côté **backend** ; l’**UI** en **lecture seule**.
- **`ownerUserId`** : **visible et éditable** dans le formulaire ; sélection **limitée aux utilisateurs du client actif** (même périmètre que les autres sélecteurs « responsable » projet).

---

## 1. Structure du formulaire (frontend)

Réorganiser le formulaire en **6 sections** claires et **visuellement distinctes** (cards / en-têtes cohérents avec [FRONTEND_UI-UX.md](../FRONTEND_UI-UX.md) §11) :

1. **Identification du scénario**  
2. **Évaluation du risque**  
3. **Impact métier**  
4. **Traitement du risque**  
5. **Risque résiduel**  
6. **Suivi**

Chaque section : **titre clair** + **texte d’aide** ; **placeholders** recommandés pour guider la rédaction (ex. *« Si X alors Y »* pour le scénario). **Ne pas** recalculer la criticité côté frontend (affichage des valeurs renvoyées par l’API uniquement).

---

## 2. Identification du scénario

| Élément | Décision plan |
|--------|----------------|
| **`title`** | Libellé court (**obligatoire**) — listes, tableaux, navigation ; voir alignement « title vs scénario ». |
| **`threatSource`** | Nouveau champ **obligatoire** (`String`) — origine / source de la menace (ex. cyberattaque, fournisseur, erreur humaine). Libellé UX suggéré : *Source de menace*. |
| **Scénario structuré** | **Obligatoire** — rôle porté par **`riskScenario`** (nouveau champ) **ou** par **`description`** existant selon décision différée ; format recommandé *« Si X alors Y »* (aide + placeholder). |
| **`category`** | Déjà en base — **optionnel** (ex. cybersécurité, migration, fournisseur). Pas de doublon de nom si le rôle reste `category`. |

---

## 3. Évaluation du risque

| Élément | Décision plan |
|--------|----------------|
| **`probability`** | Conserver **1–5** (entier). |
| **`impact`** | Conserver **1–5** (gravité d’impact). |
| **`likelihoodJustification`** | Nouveau champ **optionnel** (`String`) — justification du score de probabilité. |
| **Criticité** | **Aucun changement de logique** : `criticalityScore = probability × impact` ; `criticalityLevel` **dérivé côté backend** uniquement ; pas de duplication de règle côté frontend. |

---

## 4. Impact métier

| Élément | Décision plan |
|--------|----------------|
| **`businessImpact`** | Nouveau champ **obligatoire** (`String`) — description des conséquences pour l’organisation. |
| **`impactCategory`** | Nouveau champ **optionnel** — enum : `FINANCIAL`, `OPERATIONAL`, `LEGAL`, `REPUTATION`. |

---

## 5. Traitement du risque

| Élément | Décision plan |
|--------|----------------|
| **`treatmentStrategy`** | **Obligatoire** — enum : `AVOID`, `REDUCE`, `TRANSFER`, `ACCEPT`. Obligatoire en **création** ; obligatoire en **mise à jour** si le risque est **actif** (voir alignement). Validation **DTO** create/update explicite. |
| **`mitigationPlan`** | Conserver — **optionnel** (`String`). |
| **`contingencyPlan`** | Conserver — **optionnel** (`String`). |

---

## 6. Risque résiduel

| Élément | Décision plan |
|--------|----------------|
| **`residualRiskLevel`** | Déjà en base — **optionnel** ; type `ProjectRiskCriticality` ; sémantique : criticité **résiduelle après traitement**. **Cohérence** : inférieur ou égal au niveau initial attendu après traitement (ordre sur l’échelle) ; en MVP : **validation souple** (aide / warning). Possibilité de **recalcul backend** dans une version future — hors MVP. |
| **`residualJustification`** | Nouveau champ **optionnel** (`String`). |

---

## 7. Suivi

| Élément | Décision plan |
|--------|----------------|
| **`status`** | Conserver — clarifier les libellés en UI si besoin. |
| **`dueDate`**, **`detectedAt`** | Conserver. |
| **`closedAt`** | **Non saisi librement** — **dérivé** du passage au statut **`CLOSED`** côté **backend** ; **affichage lecture seule** dans l’UI. |
| **`ownerUserId`** | **Visible et éditable** ; périmètre **utilisateurs du client actif** (voir alignement). |
| **`reviewDate`** | Conserver si déjà utilisé dans le flux suivi. |

---

## 8. Backend

**Extension du modèle `ProjectRisk`** (champs à ajouter ou contraintes à renforcer) :

| Champ | Type / contrainte |
|--------|-------------------|
| `threatSource` | `String` — **obligatoire** (nouveau) |
| Scénario structuré | `riskScenario` **ou** rôle de `description` — **obligatoire** (voir §2) |
| `businessImpact` | `String` — **obligatoire** (nouveau) |
| `impactCategory` | Enum optionnel — `FINANCIAL`, `OPERATIONAL`, `LEGAL`, `REPUTATION` (nouveau) |
| `likelihoodJustification` | `String` — optionnel (nouveau) |
| `treatmentStrategy` | Enum — **obligatoire** (contrainte création + mise à jour si risque actif) |
| `residualRiskLevel` | `ProjectRiskCriticality` — optionnel (existant ; règle de cohérence §6) |
| `residualJustification` | `String` — optionnel (nouveau) |

**DTO create / update**

- Valider explicitement : **`threatSource`**, **scénario structuré** (ou `description` selon choix), **`businessImpact`**, **`treatmentStrategy`** — **obligatoires** selon règles ci-dessus.
- Aligner les validations avec les règles **actif** / **clôturé** pour `treatmentStrategy`.

**Endpoints**

- **Aucun changement d’URL** des routes existantes (`GET/POST/PATCH/DELETE` sous `/projects/:projectId/risks`).

**Tests**

- Couvrir validations DTO et, si pertinent, règles service (`closedAt`, criticité dérivée).

---

## 9. Frontend (rappel UX)

- Mettre à jour le **formulaire existant** ([`ProjectRiskEbiosDialog`](../../apps/web/src/features/projects/components/project-risk-ebios-dialog.tsx) ou équivalent).
- **Labels explicites** (ex. *Source de menace*, *Impact métier*).
- **Aide** par section + **placeholders** (ex. scénario *« Si X alors Y »*).
- **Pas** de recalcul de criticité côté client.

---

## 10. Non-objectifs (hors périmètre)

- Pas de **workflow EBIOS** complet (ateliers, graphes multi-acteurs, etc.).  
- Pas de **scoring multi-dimensionnel** au-delà de P×I + criticité dérivée backend.  
- Pas de **gestion des actifs** comme entité séparée ni champ **`impactedAsset`** au périmètre de cette RFC (aligné spec : pas de complexité supplémentaire).  
- Pas de **refonte** du module Projets / risques : **extensions ciblées** uniquement.

---

## Conclusion (vision produit)

Après réalisation de ce plan, le modèle **`ProjectRisk`** et le formulaire deviennent **compatibles avec une approche EBIOS RM simplifiée** : **scénario structuré**, **impact métier explicite**, **traitement formalisé** (stratégie obligatoire), **résiduel documenté**, **base exploitable** pour un positionnement **audit** (notamment **ISO 27001**, **NIS2** dans une logique de traçabilité et de pilotage des risques).

Le **modèle** reste compatible avec une **montée en maturité** vers un **EBIOS RM complet** ou un **module conformité** élargi par **extensions et règles avancées** — **sans refonte** du cœur de données (pas de remplacement du modèle, évolution par enrichissement).

---

## Règles d’implémentation (rappel)

- **Uniquement** les champs et règles **nécessaires** listés ci-dessus (+ migration Prisma si nouveaux champs, DTO, validation, tests service, formulaire / liste si affichage synthétique).  
- **Pas** de nouvelle entité métier au-delà de `ProjectRisk` pour cette RFC.
