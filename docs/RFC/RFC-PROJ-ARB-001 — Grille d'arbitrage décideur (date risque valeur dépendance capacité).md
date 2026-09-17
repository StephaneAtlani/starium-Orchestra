# RFC-PROJ-ARB-001 — Grille d’arbitrage décideur (date, risque, valeur, dépendance, capacité)

Version : 1.0 — 17 septembre 2026

| Métadonnée | Valeur |
| --- | --- |
| **Statut** | 📝 Draft — cadrage produit + backlog user stories |
| **Priorité** | Haute (gouvernance portefeuille / CODIR) |
| **Persona** | Décideur (DSI à temps partagé, sponsor, comité d’arbitrage) |
| **Socle** | [RFC-PROJ-CYCLE-001](./RFC-PROJ-CYCLE-001%20%E2%80%94%20Governance%20Cycles%20Core%20Backend.md) · [RFC-FE-PROJ-CYCLE-001](./RFC-FE-PROJ-CYCLE-001%20%E2%80%94%20Governance%20Cycles%20Frontend%20UI.md) · [RFC-PROJ-INTAKE-001](./RFC-PROJ-INTAKE-001%20%E2%80%94%20Demandes%20projet%20et%20workflow%20de%20validation%20configurable.md) · [RFC-PROJ-INTAKE-002](./RFC-PROJ-INTAKE-002%20—%20CDC%20Demandes%20de%20projet%20(circuit%20configurable%20et%20fidélité%20visuelle).md) |
| **Remplace / précise** | [RFC-PROJ-INTAKE-005](./RFC-PROJ-INTAKE-005%20—%20Scoring%20multicrit%C3%A8re%20demandes.md) (stub P8) — la grille fixe **ces** critères ; pas d’axes libres « au cas où » en V1 |
| **Liens** | Capacité scénario [RFC-PROJ-SC-005](./RFC-PROJ-SC-005%20%E2%80%94%20Scenario%20Capacity%20Engine.md) · `CapacityAllocation` · Fiche [RFC-PROJ-012](./RFC-PROJ-012%20%E2%80%94%20Project%20Sheet.md) |
| **Hors scope V1** | Auto-décision ML · ranking magique · remplacement du workflow demande · mutation de `Project.status` hors propagation cycle déjà prévue |

---

## 1. Analyse de l’existant

| Élément | Constat |
| --- | --- |
| Cycles de pilotage | ✅ `GovernanceCycle` / `GovernanceCycleItem` — matrice d’arbitrage, décisions `CANDIDATE` → `TO_ARBITRATE` → retenus / rejetés / reportés |
| Scoring item cycle | ✅ Scores 1–5 : `valueScore`, `riskScore`, `budgetScore`, `capacityScore`, `alignmentScore` → `priorityScore` = formule pondérée générique |
| Demandes | ✅ `ProjectRequest` : `desiredDeadline`, `deadlineRationale`, `riskIfNotDone`, `expectedOutcome` / `expectedBenefits`, `estimatedEffortDays`, `effortUnknown` — **pas** de distinction « date imposée externe » vs « date souhaitée » |
| Fiche projet | ✅ `/projects/[id]/sheet` — décisionnelle ; règles d’arbitrage fiche (RFC-PROJ-012 suite) encore ❌ |
| Dépendances | ❌ Aucune dépendance **inter-projets / inter-demandes** au niveau portefeuille (seulement `ProjectTask.dependsOnTaskId` intra-projet) |
| Capacité | ✅ `CapacityAllocation` (+ scénarios SC-005) — **pas** branchée à la matrice d’arbitrage cycle ; `capacityScore` reste un jugement 1–5, pas des JH nommément affectés |
| INTAKE-005 | 📝 Stub : axes configurables génériques — **trop ouvert** pour le besoin décideur décrit ici |

**Verdict** : ne pas créer un 3ᵉ silo. Étendre le **contrat d’instruction** (demande + fiche → item de cycle) avec une **grille d’arbitrage métier fixe**, et faire porter la matrice cycle sur ces signaux (pas sur cinq scores génériques sans sémantique).

---

## 2. Problème à résoudre

En tant que **décideur**, je dois arbitrer un portefeuille (demandes et/ou fiches projets) sous enveloppe budgétaire **et** sous capacité réelle.

Aujourd’hui :

- une date « urgente » et une échéance contractuelle se ressemblent dans l’UI ;
- le risque d’inaction et la « valeur stratégique » se confondent dans un score opaque ;
- un projet bloqué peut être retenu avant celui qui le débloque ;
- le comité tient le budget et oublie les jours-homme.

L’outil doit **forcer les bonnes questions**, signaler l’instruction incomplète, et **sortir d’office** les projets à date imposée — sans décider à la place du comité pour le reste.

---

## 3. Objectif produit

**Grille d’arbitrage** — quatre questions qui changent l’arbitrage (les autres critères se discutent ; ceux-là se **vérifient**), plus la **capacité** comme contrainte de portefeuille que les comités oublient le plus souvent.

| # | Question | Formulation produit | Effet sur l’arbitrage |
| --- | --- | --- | --- |
| 1 | **La date** | Y a-t-il une date imposée **de l’extérieur** ? | Oui → **retenu d’office** (`MUST_DO`), hors pool d’arbitrage libre ; consomme enveloppe + capacité des autres. Une demande insistante ≠ date imposée. |
| 2 | **Le risque** | Que risque-t-on de **ne rien faire cette année** ? | Remonte les sujets invisibles (sécurité, conformité, obsolescence). Projet sans risque **et** sans valeur qui passe quand même → **alerte contestabilité**. |
| 3 | **La valeur** | Qu’est-ce qui serait **différent dans dix-huit mois** ? | Interdit « c’est stratégique ». Exige un **effet observable**. Absence de réponse → instruction incomplète, pas « mauvais projet ». |
| 4 | **La dépendance** | Est-il **bloqué par** un autre projet / demande ? | Empêche de retenir un projet avant son prérequis ; signal d’ordre dans le portefeuille. |
| — | **La capacité** | Combien de **jours-homme**, et **pris sur qui** ? | Contrainte transverse : un portefeuille qui tient financièrement et déborde en capacité **n’est pas tenable** ; l’outil le montre avant la direction. |

Règle non négociable : **aucune auto-décision** `APPROVED` / `REJECTED` sur la seule base des scores. L’outil **classe, alerte, exclut du pool libre** ; le décideur **tranche**.

---

## 4. Hypothèses structurantes (à valider)

1. **Sources d’items** V1 : `ProjectRequest` (amont) et `Project` (fiche / brouillon issu conversion) via `GovernanceCycleItem` existant (`sourceType` PROJECT / MANUAL ; extension éventuelle `PROJECT_REQUEST` si pas déjà couverte par le routage intake).
2. **Date imposée** = enum de nature + date + justification obligatoire. Natures V1 : `CONTRACTUAL`, `REGULATORY`, `AUDIT`, `EXTERNAL_COMMITMENT`. Hors V1 : « priorité direction » (ce n’est **pas** une date imposée).
3. **Valeur** = texte libre **effet observable à 18 mois** (min. N caractères) + optionnellement un score 1–5 dérivé **après** instruction (pas l’inverse).
4. **Risque d’inaction** = texte + score 1–5 (sévérité si on ne fait rien) — sémantique **inversée** par rapport à un « risque projet d’exécution » classique ; ne pas confondre avec `ProjectRisk`.
5. **Dépendance** = liste ordonnée de références métier (`projectId` / `projectRequestId`) côté client actif, affichées par **libellé / code**, jamais UUID.
6. **Capacité** V1 : total JH + ventilation optionnelle par `workTeamId` et/ou `resourceId` (libellés) ; agrégat portefeuille = somme des retenus + MUST_DO vs capacité disponible période (lecture `CapacityAllocation` / SC-005 si projet scénarisé).
7. **Formule `priorityScore` actuelle** : à **remplacer ou coexister** — hypothèse retenue : **grille ARB en V1** comme source de vérité d’aide à l’arbitrage ; mapping explicite vers les anciens champs score pour compat UI cycles (voir §7) ; pas de double saisie utilisateur.
8. **Client scope** strict ; permissions : lecture grille = `governance_cycles.read` ; instruction / saisie = `project_requests.instruct` ou `governance_cycles.update` ; décision = `governance_cycles.arbitrate`.

---

## 5. Backlog user stories

| ID | User story | Priorité |
| --- | --- | --- |
| **US-ARB-01** | Instruire la grille sur une demande ou une fiche projet | P0 |
| **US-ARB-02** | Date imposée → sortie d’office du pool d’arbitrage | P0 |
| **US-ARB-03** | Signaler instruction incomplète (valeur / risque) | P0 |
| **US-ARB-04** | Dépendances inter-projets / demandes et ordre de rétention | P0 |
| **US-ARB-05** | Capacité JH nommément affectée + débordement portefeuille | P0 |
| **US-ARB-06** | Matrice d’arbitrage décideur (vue cycle / séance) | P0 |
| **US-ARB-07** | Alerte contestabilité (retenu sans risque ni valeur) | P1 |
| **US-ARB-08** | Snapshot d’arbitrage à la clôture d’instance / cycle | P1 |
| **US-ARB-09** | Propagation des champs grille demande → projet à la conversion | P1 |

Critères d’acceptation ci-dessous.

---

### US-ARB-01 — Instruire la grille

**En tant qu’** instructeur PMO / DSI (permissions instruct / update),  
**je veux** renseigner la grille d’arbitrage sur une demande ou une fiche projet,  
**afin que** le comité arbitre sur des faits vérifiables, pas sur des slogans.

#### Critères d’acceptation

1. Section « Grille d’arbitrage » sur `/projects/requests/[id]` (instruction) et sur fiche projet (équivalent).
2. Champs (libellés FR sentence case) :
   - Date imposée ? (oui/non) + si oui : nature (select **libellés métier**), date, justification.
   - Risque de ne rien faire cette année (texte obligatoire si score ≥ 1 ; score 1–5).
   - Effet observable à 18 mois (texte ; placeholder qui interdit « stratégique » comme seule réponse).
   - Bloqué par… (multi-select entités du client actif, libellés).
   - Charge : JH total + ventilation optionnelle (équipe / ressource — libellés).
3. Persistance côté source (`ProjectRequest` / projet) **et** copie / synchro vers `GovernanceCycleItem` à l’inscription ODJ (comme prévu INTAKE → cycle).
4. États loading / empty (grille non commencée) / error ; `aria-invalid` + messages liés.
5. Aucun ID technique visible (`pnpm audit:ui-ids`).
6. Audit `arbitration_grid.updated` (résumé : quels axes touchés, pas les DCP).

---

### US-ARB-02 — Date imposée → retenu d’office

**En tant que** décideur,  
**je veux** que les projets à date imposée externe sortent du pool d’arbitrage libre,  
**afin de** ne pas « rediscuter » une contrainte et de voir ce qu’ils consomment sur l’enveloppe des autres.

#### Critères d’acceptation

1. Si `hasImposedDeadline = true` **et** nature ∈ catalogue V1 **et** date + justification présentes → statut d’aide `MUST_DO` (ou `decisionStatus` dédié / flag `arbitrationClass = MUST_DO`).
2. Ces items apparaissent dans un bandeau / section **« Retenus d’office »**, pas dans le tri du pool libre.
3. Ils **entrent** dans les totaux enveloppe budget + JH consommés du portefeuille candidat.
4. Refus de passer `hasImposedDeadline = true` sans nature/date/justification (`400`).
5. Une `desiredDeadline` seule (demande insistante) **ne** déclenche **pas** MUST_DO.
6. Le décideur peut toujours **reporter / refuser** explicitement un MUST_DO (cas exceptionnel) avec `decisionReason` obligatoire + audit — l’outil n’interdit pas l’humain, il le force à assumer.

---

### US-ARB-03 — Instruction incomplète

**En tant que** décideur,  
**je veux** voir clairement ce qui n’est pas instruit,  
**afin de** renvoyer le sujet plutôt que d’arbitrer dans le flou.

#### Critères d’acceptation

1. Badge / colonne « Instruction » : `COMPLETE` | `PARTIAL` | `EMPTY`.
2. `COMPLETE` exige au minimum : réponse date (oui ou non explicite) ; texte risque **ou** score risque ; texte valeur ≥ seuil (hypothèse : 40 caractères, configurable client plus tard) ; réponse dépendance (oui liste / « aucune ») ; charge JH **ou** `effortUnknown` assumé.
3. Filtre matrice : masquer / mettre en bas les `EMPTY`.
4. Passage en séance d’arbitrage : warning non bloquant si item `PARTIAL` encore dans le pool (hypothèse V1 : **warning** ; bloquant = option client V1.1).

---

### US-ARB-04 — Dépendances et ordre

**En tant que** décideur,  
**je veux** voir si un candidat est bloqué par un autre,  
**afin de** ne pas consommer d’enveloppe sur un projet qui ne pourra pas produire de résultat.

#### Critères d’acceptation

1. Liens `blockedBy` vers projet et/ou demande du **même client** ; validation d’appartenance scope.
2. UI : libellés + statut d’arbitrage du prérequis (retenu / MUST_DO / rejeté / hors cycle).
3. Alerte si item retenu alors qu’un prérequis n’est **pas** retenu / MUST_DO dans le même cycle (ou pas livré).
4. Cycles dans le graphe → `400` (pas d’auto-résolution magique).
5. Ordre suggéré (lecture seule) : topological rough order des candidats non MUST_DO.

---

### US-ARB-05 — Capacité JH et débordement

**En tant que** décideur,  
**je veux** voir combien de JH et sur quelles équipes / personnes,  
**afin qu’** un portefeuille « qui tient en budget » mais impossible en charge soit visible **avant** le CODIR.

#### Critères d’acceptation

1. Saisie JH + ventilation optionnelle (équipe / ressource — `displayLabel`).
2. Agrégat cycle / instance : Σ JH des `MUST_DO` + retenus (et optionnellement candidats) vs capacité disponible sur la période du cycle (`CapacityAllocation` filtrée client + période ; sinon empty explicite « Capacité non paramétrée »).
3. Indicateur débordement : total / par équipe — info **jamais** portée par la couleur seule (texte + icône).
4. `capacityScore` 1–5 legacy : dérivé ou masqué — **pas** de double saisie (hypothèse : dérivé V1 depuis ratio charge/capacité, sinon null).
5. Mobile : totaux empilés, tableau dense en scroll contenu.

---

### US-ARB-06 — Matrice d’arbitrage décideur

**En tant que** décideur,  
**je veux** une vue unique pour arbitrer le pool libre,  
**afin de** trancher vite avec les quatre questions sous les yeux.

#### Critères d’acceptation

1. Étend `/cycles/[cycleId]` (et préparation instance) : colonnes Date | Risque | Valeur (extrait) | Dépendance | JH | Enveloppe | Décision.
2. Tri défaut : MUST_DO figés en tête de section séparée ; pool libre trié par risque d’inaction ↓ puis valeur (texte présent) ; jamais un score opaque sans légende.
3. Actions décision existantes (`governance_cycles.arbitrate`) inchangées en permissions.
4. Empty : « Aucun candidat à arbitrer » ; loading skeleton ; error + retry.
5. RGAA : tableau sémantique ou cartes &lt; `md` ; focus visible ; libellés pas IDs.

---

### US-ARB-07 — Alerte contestabilité (P1)

**En tant que** décideur,  
**je veux** être prévenu avant ma direction si un projet **sans risque d’inaction et sans valeur instruite** est quand même retenu,  
**afin de** anticiper la contestation.

#### Critères d’acceptation

1. À la décision « retenu » : si risque score ≤ 1 (ou vide) **et** valeur absente / sous seuil → `aria-live` + confirmation modale `StariumModal`.
2. Audit `arbitration.contestable_retention` si confirmé.
3. N’empêche pas la décision après confirmation.

---

### US-ARB-08 — Snapshot d’arbitrage (P1)

**En tant que** décideur / auditeur,  
**je veux** figer la grille au moment de la clôture,  
**afin de** retracer pourquoi le portefeuille a été tranché ainsi.

#### Critères d’acceptation

1. À la clôture d’instance / cycle : snapshot JSON des champs grille + décisions (pas de DCP inutiles).
2. Lecture historique en libellés métier.
3. Immuable après clôture.

---

### US-ARB-09 — Propagation demande → projet (P1)

**En tant qu’** instructeur,  
**je veux** que la grille saisie sur la demande survive à la conversion projet,  
**afin de** ne pas ré-instruire.

#### Critères d’acceptation

1. Conversion `ProjectRequest` → `Project` : copie des champs grille.
2. Item de cycle déjà lié : conserve / met à jour sans doublon.
3. Test d’isolation client sur la copie.

---

## 6. Modèle de données (proposition)

```prisma
enum ArbitrationImposedDeadlineKind {
  CONTRACTUAL
  REGULATORY
  AUDIT
  EXTERNAL_COMMITMENT
}

enum ArbitrationInstructionStatus {
  EMPTY
  PARTIAL
  COMPLETE
}

enum ArbitrationClass {
  POOL          // arbitrage libre
  MUST_DO       // date imposée — retenu d’office (aide)
}

/// Embarqué sur ProjectRequest + Project (ou table 1–1 ArbitrationGrid)
/// Hypothèse V1 : colonnes sur ProjectRequest + Project pour éviter jointure ; table dédiée si volumétrie JSON préférée.
model /* champs à ajouter */ {
  // Date
  hasImposedDeadline     Boolean @default(false)
  imposedDeadlineKind    ArbitrationImposedDeadlineKind?
  imposedDeadlineAt      DateTime?
  imposedDeadlineRationale String?

  // Risque d'inaction (≠ ProjectRisk)
  inactionRiskSummary    String?
  inactionRiskScore      Int?    // 1..5

  // Valeur — effet observable 18 mois
  valueOutcome18m        String?

  // Dépendances — JSON [{ targetType, targetId, labelSnapshot }] ou table fille
  // blockedByJson        Json?

  // Capacité
  effortDaysTotal        Decimal? @db.Decimal(10, 2)
  // effortBreakdownJson  Json? // [{ workTeamId?, resourceId?, days, labelSnapshot }]

  arbitrationClass       ArbitrationClass @default(POOL)
  instructionStatus      ArbitrationInstructionStatus @default(EMPTY)
}
```

**Table fille recommandée** (dépendances + ventilation) :

```prisma
model ArbitrationDependency {
  id           String @id @default(cuid())
  clientId     String
  // owner: projectRequestId XOR projectId XOR cycleItemId
  targetType   ArbitrationDependencyTarget // PROJECT | PROJECT_REQUEST
  targetId     String
  labelSnapshot String
  sortOrder    Int @default(0)
  @@index([clientId])
}

model ArbitrationEffortLine {
  id           String @id @default(cuid())
  clientId     String
  workTeamId   String?
  resourceId   String?
  days         Decimal @db.Decimal(10, 2)
  labelSnapshot String
  @@index([clientId])
}
```

Sur `GovernanceCycleItem` : colonnes miroir **ou** FK vers la grille source + champs dénormalisés pour la matrice (perf lecture). Recalcul `arbitrationClass` / `instructionStatus` côté service à chaque write.

**Mapping legacy scores** (compat) :

| Grille ARB | Score cycle historique |
| --- | --- |
| `inactionRiskScore` | `riskScore` (même borne 1–5 ; doc UI : « risque de ne rien faire ») |
| Présence / qualité `valueOutcome18m` → score dérivé optionnel | `valueScore` |
| Ratio charge / capacité période | `capacityScore` |
| — | `alignmentScore` / `budgetScore` : **hors grille 4 questions** ; restent saisie libre optionnelle V1 ou report V1.1 |

Formule `priorityScore` : **ne plus être le tri principal** de la matrice ARB ; conservation API pour ne pas casser les clients ; doc « legacy / secondaire ».

---

## 7. API (proposition)

| Méthode | Route | Intention |
| --- | --- | --- |
| `GET` | `/api/project-requests/:id/arbitration-grid` | Lecture grille + instructionStatus |
| `PUT` | `/api/project-requests/:id/arbitration-grid` | Upsert grille (DTO validé) |
| `GET` | `/api/projects/:id/arbitration-grid` | Idem fiche |
| `PUT` | `/api/projects/:id/arbitration-grid` | Idem |
| `GET` | `/api/governance-cycles/:id/arbitration-matrix` | Vue agrégée pool + MUST_DO + totaux enveloppe/JH + alertes dépendance / capacité |

Pas de `clientId` en body. Guards existants. Réponses enrichies (`title`, `referenceCode`, `workTeam.name`, …).

---

## 8. UX / Design System

- Réutiliser matrice cycles (`/cycles/...`) — **étendre**, ne pas inventer un écran parallèle.
- Section grille = `.starium-section` ; KPI totaux = `KpiCard` hors cadre dans cadre.
- Modales confirmation contestabilité = `StariumModal`.
- Placeholders / textes d’aide qui **nomment** les formulations produit (date externe, 18 mois, ne rien faire cette année).
- Mobile-first : &lt; `md` → cartes par candidat avec les 4 questions empilées ; cibles ≥ 44px.

---

## 9. Permissions & isolation

- Lecture : `governance_cycles.read` + droit lecture source (demande / projet).
- Écriture grille : `project_requests.instruct` **ou** `projects.update` / `governance_cycles.update` selon surface.
- Décision : `governance_cycles.arbitrate` uniquement.
- Toute dépendance / effort line : vérif `clientId` cible = client actif.
- Tests obligatoires : fuite inter-client sur `blockedBy` et sur agrégat matrice.

---

## 10. Tests

| Zone | Cas |
| --- | --- |
| Service grille | Complete / partial / empty ; MUST_DO garde-fous ; refus nature hors enum |
| Dépendances | Scope client ; cycle détecté ; alerte prérequis non retenu |
| Capacité | Σ MUST_DO+retenus ; empty si pas d’allocations ; débordement |
| Matrice | Tri sections ; pas d’ID en DTO UI |
| Contestabilité | Modale si retenu sans risque/valeur |
| Isolation | `blockedBy` autre client → 404/400 |
| Régression cycles | CRUD item + arbitrate inchangés pour items sans grille |

---

## 11. Conformité by design

### RGPD
- Grille = données métier projet, pas DCP nouvelle ; `resourceId` déjà scopé.
- Logs audit : ids techniques + axes touchés, **pas** collage des textes complets si volumineux ; jamais email en clair.
- Rétention : suit le cycle de vie demande / projet / snapshot clôture.
- Minimisation : pas de champ « commentaire libre politique » hors finalité arbitrage.

### RGAA
- Labels explicites sur chaque question ; `aria-describedby` pour l’aide « ce n’est pas une date imposée ».
- Alertes dépendance / capacité / contestabilité via `aria-live="polite"` (assertive si débordement critique en séance).
- Tableau ou liste de cartes équivalente au clavier.

### Design System
- Tokens uniquement ; états loading / empty / error ; `displayLabel` partout.
- Pas de score coloré sans légende textuelle.

### Sécurité
- Authz + isolation client ; DTO class-validator ; audit décisions et MUST_DO exceptionnels.
- Pas de sur-exposition (whitelist champs matrice).

### Mobile
- Matrice exploitable dès 320px (cartes) ; totaux JH/budget accessibles sans scroll horizontal de page.

---

## 12. Plan de livraison suggéré

| Lot | Contenu | Dépend |
| --- | --- | --- |
| **A** | Prisma + API grille demande/projet + calcul instructionStatus / MUST_DO | — |
| **B** | Dépendances + effort lines + synchro item cycle | A |
| **C** | UI instruction (demande + fiche) | A–B |
| **D** | `GET …/arbitration-matrix` + UI matrice cycle | B–C |
| **E** | Capacité agrégée + alertes débordement | D + CapacityAllocation |
| **F** | Contestabilité + snapshot clôture + propagation conversion | D–E |

---

## 13. Points de vigilance

1. Ne pas confondre **risque d’inaction** et **risque d’exécution** (`ProjectRisk`) — libellés UI distincts.
2. Ne pas laisser `desiredDeadline` polluer MUST_DO.
3. Éviter deux grilles divergentes demande vs item cycle — synchro unidirectionnelle claire (source = demande/projet ; item = projection).
4. La formule `priorityScore` legacy ne doit plus piloter le tri décideur sans légende.
5. Capacité « prise sur qui » sans `CapacityAllocation` paramétrée → empty honnête, pas de faux jauge.
6. INTAKE-005 : stub **reddirigé** vers cette RFC ; pas d’axes configurables libres en V1.

---

## 14. Décisions produit à trancher (oui/non)

1. Passage en séance **bloquant** si `PARTIAL` — ou warning seulement (hypothèse actuelle : warning) ?
2. MUST_DO exceptionnellement rejeté : autorisé avec motif (hypothèse : oui) ?
3. Score valeur 1–5 dérivé auto du texte vs saisie manuelle séparée ?
4. `sourceType` dédié `PROJECT_REQUEST` sur `GovernanceCycleItem` si le routage actuel ne suffit pas ?
5. Remplacer purement les 5 scores cycle ou les garder en lecture seule dérivée ?

---

## 15. Récapitulatif

RFC de cadrage : **grille d’arbitrage décideur** à quatre questions vérifiables + contrainte capacité, branchée sur demandes / fiches / cycles existants, sans auto-décision. Prochaine étape après validation des hypothèses §4 et décisions §14 : lot A (Prisma + API).
