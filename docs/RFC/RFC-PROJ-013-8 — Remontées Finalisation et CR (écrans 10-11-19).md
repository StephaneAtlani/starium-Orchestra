# RFC-PROJ-013-8 — Remontées, Finalisation et CR (écrans 10, 11, 19)

| | |
| --- | --- |
| **Statut** | 📝 Draft |
| **Date** | 2026-09-10 |
| **Parents** | RFC-PROJ-013-5 ; 013-3 (CR/snapshot) ; 013-6 (conduite) |
| **Écrans PDF** | **10** Sujets à remonter · **11** Finalisation · **19** CR consulté |
| **Scope** | Articulation COPROJ↔COPIL ; contrôles de complétude ; diffusion & verrouillage ; pont plan d’action / registre risques |

## 1. Analyse de l’existant

- Snapshot + DocumentView + preview/send CR : 013-3.
- Finalize API : `FINALIZED` + snapshot ; pas d’étape « À finaliser » distincte ni checklist arbitrages/actions.
- Remontées inter-niveaux : absentes (pas de lien review→review / cycle item).
- Actions review → tâches projet / risques : partiel ou manuel.

## 2. Hypothèses

1. Un sujet « à remonter » = agenda item (ou décision) tagué `escalation` vers un `ProjectReview` COPIL cible (ou instance CYCLE).
2. Finalisation 11 = relecture du snapshot live + gates soft (arbitrages sans verdict, actions sans porteur/échéance) puis diffusion (email existant 013-2).
3. Après diffusion : contenu immutable (déjà DocumentView) ; actions poussées plan d’action ; risques vers registre.
4. Descente COPIL → COPROJ = reprise décisions non appliquées (déjà partiel en création / C10).

## 3. Cible fonctionnelle

### 10 — Sujets à remonter
- Qualifier depuis conduite (09) ou écran dédié.
- Alimente ODJ du prochain COPIL (préparation 08/18).
- Conserve contexte : point d’origine, séance, date, porteur.

### 11 — Finalisation
- CR généré depuis saisie live (pas de retape).
- Contrôles complétude signalés (bloquants configurables V2).
- Diffusion → notifie participants + verrouille + archive Historique.
- Side-effects : actions → plan projet ; risques → registre.

### 19 — CR consulté
- Synthèse chiffrée ; décisions ; actions ; présence ; docs.
- Lecture seule (DocumentView actuel à enrichir KPI tête).

## 4. Fichiers

| Zone | Exemples |
| --- | --- |
| FE | DocumentView ; écran finalisation ; UI remontées |
| API | finalize / distribute ; escalate ; push actions/risks |
| Prisma | `escalation` fields / table pont ; flags diffusion |

## 5. Lots

| Lot | Contenu |
| --- | --- |
| F1 | État/flags À finaliser + UI 04/11 minimale |
| F2 | Checklist complétude (arbitrages / actions) |
| F3 | Remontées 10 (modèle + ODJ COPIL) |
| F4 | Pont actions → tâches / risques → ProjectRisk |
| F5 | Enrichir 19 (KPI tête CR) |

## 6. Prisma

- Pont remontée : `ProjectReviewEscalation` (`fromReviewId`, `fromAgendaItemId`, `toReviewId?`, `toCycleInstanceId?`, `status`) — détail à trancher vs CYCLE.
- `reportDistributedAt` si distinct de `FINALIZED`.

## 7. Tests

- Escalade isolée client ; pas de fuite inter-projets non autorisée.
- Finalize refuse si gates hard activés.
- DocumentView readonly post-diffusion.

## 8. Récapitulatif

Ferme la boucle gouvernance après la conduite : opposabilité des décisions + continuité COPROJ/COPIL.

## 9. Points de vigilance

- Double écriture Meeting / CYCLE / Review — lire `docs/LIAISONS-MODULES.md`.
- Idempotence diffusion email.
- RGPD : listes de diffusion.

## 10. Conformité by design

- **RGPD** : CR = export ; droit d’accès ; pas d’emails en clair dans logs.
- **RGAA** : checklist erreurs liées champs ; lecture CR structurée titres.
- **Design System** : DocumentView ; Alert destructive pour gaps.
- **Sécurité** : permission diffusion ; audit who/when.
- **Mobile** : finalisation en sections empilées.
