# RFC-PROJ-013-5 — Spécification fonctionnelle écrans Points projet (catalogue 01–20)

| | |
| --- | --- |
| **Statut** | 📝 Draft |
| **Date** | 2026-09-10 |
| **Parents** | RFC-PROJ-013 → 013-4 ; RFC-PROJ-CYCLE-* (vue transverse) |
| **Source produit** | [*Spec fonctionnelle écrans Points projet* (PDF, 10 sept. 2026)](./_sources/Spec-fonctionnelle-ecrans-Points-projet-2026-09-10.pdf) — 23 p. / 20 écrans |
| **Scope** | Cadre produit unique : inventaire des écrans, états UI, sorties, écarts vs code, découpage en RFC filles |

## 1. Analyse de l’existant

| Couche | État |
| --- | --- |
| API / Prisma | `ProjectReview` + agenda / décisions / actions / participants / snapshot / CR (013-2) |
| Cohérence CR / URL / DocumentView | 013-3 (Lots 0–E) |
| ODJ-first + Animer (amorce) | 013-4 + `project-review-animate-session.tsx` |
| Cycles de pilotage (transverse) | RFC-PROJ-CYCLE-001…003 |

**Écart majeur** : le PDF décrit un **parcours à 6 états UI** et **20 écrans** (listes filtrées, séries, préparation avec ODJ figé, conduite live, remontées COPROJ↔COPIL, finalisation, calendrier). Le code actuel mappe surtout des **statuts API** (`PREPARING` / `SCHEDULED` / `IN_PROGRESS` / `FINALIZED` / `CANCELLED`) sans les sous-onglets métier ni les séries.

## 2. Hypothèses

1. Les **états UI** du PDF sont une **projection** des statuts API (+ éventuellement `agendaLocked` / `reportDistributed`) — pas forcément 6 valeurs Prisma nouvelles.
2. Types d’instance PDF : COPROJ · COPIL · COTECH · CODIR · Revue · Ad hoc — aligner / étendre `ProjectReviewType` (COTECH manquant aujourd’hui ; POST_MORTEM reste REX hors cadence).
3. « Cycles de pilotage » (écrans 12–20) réutilise le module CYCLE existant **ou** une vue agrégée `ProjectReview` multi-projets — arbitrage dans RFC-PROJ-013-7 / CYCLE (pas de doublon Meeting MEET).
4. Source de vérité UX = ce RFC + maquettes associées ; 013-3/013-4 restent l’historique d’implémentation.

## 3. Catalogue des écrans (source PDF)

### Partie A — Onglet « Points projet » (fiche projet)

| # | Écran | Nature | Rôle | Sortie |
| --- | --- | --- | --- | --- |
| 01 | À préparer | Liste | Entrée + 4 KPI ; ODJ non figé | 08 / 07 |
| 02 | À venir | Liste | Planifié ; consolidation COPIL↔COPROJ | 08 ; auto → En cours |
| 03 | En cours | Liste | Séance live ; reprise conduite | **09** |
| 04 | À finaliser | Liste | CR non diffusé ; décisions non opposables | **11** |
| 05 | Historique | Liste | Archive | **19** |
| 06 | Séries | Config | Cadences récurrentes | séances « À venir » |
| 07 | Créer un point | Modale | Création unitaire | 08 |
| 08 | Préparation | Travail | ODJ qualité ; figer → À venir | 02 |
| 09 | Séance en cours | Travail | Animation live | 04 |
| 10 | Sujets à remonter | Travail | Articulation niveaux | ODJ COPIL |
| 11 | Finalisation CR | Travail | Relecture + diffusion | 05 |

### Partie B — Transverse « Cycles de pilotage »

| # | Écran | Nature | Rôle |
| --- | --- | --- | --- |
| 12 | Cycles de pilotage | Liste | Multi-projets + KPI |
| 13 | Nouveau point (split) | Composant | Défaut COPROJ + menu typé |
| 14 | Modale COPROJ | Modale | Defaults COPROJ |
| 15 | Modale COPIL | Modale | Defaults COPIL + consolidation |
| 16 | Modale Ad hoc | Modale | Ponctuel hors série |
| 17 | Point créé | Retour | Flash liste + toast |
| 18 | Préparation depuis cycles | Travail | = 08 + consolidation |
| 19 | CR consulté | Lecture | Verrouillé |
| 20 | Calendrier | Modale | Mois / collisions / créer à date |

### Flux états UI

```text
À préparer → (figer ODJ) → À venir → (démarrage) → En cours
  → (dernier point clos) → À finaliser → (CR diffusé) → Historique
```

## 4. Mapping statut API (proposition)

| État UI PDF | Condition proposée (V1) |
| --- | --- |
| À préparer | `PREPARING` ou `SCHEDULED` **et** ODJ non figé (`agendaLockedAt = null`) |
| À venir | `SCHEDULED` **et** ODJ figé |
| En cours | `IN_PROGRESS` (aliases `IN_REVIEW`) |
| À finaliser | `IN_PROGRESS` avec conduite terminée **ou** nouveau statut `AWAITING_REPORT` — **à arbitrer** (défaut recommandé : `AWAITING_REPORT` après « Clôturer séance » avant diffusion) |
| Historique | `FINALIZED` (et éventuellement `CANCELLED` en sous-filtre) |

Champ Prisma minimal à prévoir si retenu : `agendaLockedAt DateTime?`, éventuellement `conductClosedAt`, `reportDistributedAt` — détail dans RFC-PROJ-013-7.

## 5. Découpage RFC filles

| RFC | Périmètre écrans | Priorité |
| --- | --- | --- |
| **RFC-PROJ-013-6** | **09** Animer la séance (+ amorce 10 routing) | P0 |
| **RFC-PROJ-013-7** | **01–08**, **06** Séries, création typée **07/13–17** | P0 |
| **RFC-PROJ-013-8** | **10** Remontées COPROJ↔COPIL ; **11/19** Finalisation & CR ; pont actions/risques projet | P1 |
| **RFC-PROJ-013-9** | **12, 18, 20** Vue transverse / calendrier (lien CYCLE) | P2 |

## 6. Fichiers (doc)

| Action | Fichier |
| --- | --- |
| Créer | ce RFC ; 013-6 ; 013-7 ; 013-8 ; 013-9 |
| Modifier | `docs/RFC/_RFC Liste.md` ; renvois 013-3 / 013-4 |
| Source | PDF *Documentation projet* (spécification écrans) — conserver côté produit / `docs/` si versionné |

## 7. Implémentation

Hors scope de **ce** document (cadre uniquement). Chaque RFC fille porte lots, Prisma, API, UI, tests.

## 8. Prisma

Aucune migration dans 013-5. Les champs d’état UI sont proposés §4 et tranchés dans 013-7.

## 9. Tests

- Mapping état UI ↔ statut (table de vérité) dès 013-7.
- Pas de test code dans 013-5.

## 10. Récapitulatif

Catalogue officiel des **20 écrans** Points projet + découpage en 4 RFC d’implémentation. Remplace le flou « lots E / ODJ-first » comme boussole produit.

## 11. Points de vigilance

- Ne pas dupliquer `GovernanceCycleInstance` vs `ProjectReview` (LIAISONS / MEET).
- COTECH / CODIR vs types existants : inventaire enum avant migration.
- « À finaliser » : éviter de surcharger `IN_PROGRESS` sans signal métier clair.

## 12. Conformité by design

- **RGPD** : présence, notes, décisions = données de séance ; rétention alignée CR ; pas de DCP en logs ; scope client.
- **RGAA** : listes et modales clavier ; états annoncés (`aria-live` timer / présence) ; contrastes AA.
- **Design System** : tokens Starium (or, pilules) ; `StariumModal` création ; jamais d’ID brut.
- **Sécurité** : RBAC `projects.*` ; isolation client ; audit diffusion CR / figer ODJ.
- **Mobile** : listes en cartes ; conduite 09 en colonne unique sous `lg` ; cibles ≥ 44px.
