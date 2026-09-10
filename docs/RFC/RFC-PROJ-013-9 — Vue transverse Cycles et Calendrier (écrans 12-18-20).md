# RFC-PROJ-013-9 — Vue transverse Cycles / Calendrier (écrans 12, 18, 20)

| | |
| --- | --- |
| **Statut** | 📝 Draft |
| **Date** | 2026-09-10 |
| **Parents** | RFC-PROJ-013-5 ; RFC-PROJ-CYCLE-001…003 |
| **Écrans PDF** | **12** Cycles de pilotage · **18** Préparation depuis cycles · **20** Calendrier |
| **Scope** | Vue multi-projets des instances, préparation consolidée, calendrier mensuel — **sans dupliquer** le cœur métier Review |

## 1. Analyse de l’existant

- Module **Governance Cycles** (CYCLE-001…003) : cycles, instances, agenda candidats, préparation séance FE.
- Points projet : `ProjectReview` scopé **par projet** (013-x).
- PDF Partie B : liste unifiée instances + KPI + calendrier + création typée (déjà 013-7 pour 13–17).

## 2. Hypothèses

1. L’écran **12** est une **coquille UX** qui agrège : instances CYCLE + reviews projet (filtre client) — pas un troisième modèle « Meeting » (MEET hors scope sauf pont).
2. **18** = réutiliser préparation 08 avec source de consolidation = instances inférieures / escalades 013-8.
3. **20** = calendrier des `reviewDate` + dates d’instances CYCLE ; clic jour → créer point (013-7).

## 3. Cible fonctionnelle

### 12
- KPI : prochaine instance, cycles actifs, décisions en attente, taux de présence.
- Segment À venir / Historique.
- Rail : décisions en attente d’arbitrage + cadence.
- Actions : calendrier (20) ; nouveau point (13).

### 18
- Même UX que 08 ; ODJ consolidé niveaux inférieurs ; décisions en attente ; docs par point ; brief.

### 20
- Mois ; couleurs par type ; collisions / semaines vides ; créer à la date.

## 4. Fichiers

| Zone | Exemples |
| --- | --- |
| FE | routes cycles / calendrier ; widgets KPI |
| API | agrégats cross-project reviews (client-scoped) ; reuse CYCLE summary |
| Doc | `docs/LIAISONS-MODULES.md` — pont Review ↔ Cycle |

## 5. Lots

| Lot | Contenu |
| --- | --- |
| T1 | Shell 12 + segment + lien création |
| T2 | KPI / rail décisions en attente |
| T3 | Calendrier 20 |
| T4 | Préparation 18 branchée consolidation |

## 6. Prisma

Aucun modèle nouveau si agrégation suffit. Sinon vues matérialisées / tables de cache — justifier.

## 7. Tests

- Aucune fuite inter-client sur agrégats.
- Permissions : utilisateur multi-projets ne voit que projets autorisés.

## 8. Récapitulatif

Couche transverse du PDF ; s’appuie sur CYCLE + 013-7/013-8.

## 9. Points de vigilance

- Risque de double UI « séance » CYCLE vs Review — message produit clair.
- Perf calendrier multi-projets.

## 10. Conformité by design

- **RGPD** : agrégats sans sur-exposition nominative hors besoin.
- **RGAA** : calendrier clavier ; légende couleurs ≠ seule info.
- **Design System** : mêmes patterns listes/KPI que fiche projet.
- **Sécurité** : filtre `clientId` + projets du scope user.
- **Mobile** : calendrier agenda list fallback.
