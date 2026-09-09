# RFC-PROJ-013-4 — Tenue ODJ-first (Infos, Questions, Suites, Récaps)

| | |
| --- | --- |
| **Statut** | ✅ Implémenté (UI ODJ-first v10/10) |
| **Date** | 2026-09-09 |
| **Parents** | RFC-PROJ-013-2, RFC-PROJ-013-3 (ex-C9) |
| **Scope** | Création + préparation + conduite Point projet — saisie sujet-centrée |

## 1. Analyse de l’existant

Après RFC-PROJ-013-3 (Lots 0–E2) : page-only, sets d’onglets par phase, DocumentView figé, C10/C11/C12/C15.

**Problème UX restant** : silos création / préparation / conduite — meta, ODJ, décisions, actions, participants, docs comme parcours d’onglets ou sections égales. L’utilisateur « fait le tour » au lieu d’enchaîner les sujets.

| Surface | État avant 013-4 |
| --- | --- |
| Create dialog | Sections séparées ; décisions créa standalone ; presets sans `expectedDecision` |
| Phase `prepare` | Onglets `prepare`, `agenda`, `participants`, `attachments` |
| Phase `conduct` | ODJ + quick-add modales + onglets Décisions/Actions égaux (double chemin) |
| Modèle | `AgendaItem.expectedDecision` / `notes` ; `Decision` / `ActionItem` avec `agendaItemId` — OK |

## 2. Hypothèses

- Une question = champ `expectedDecision` (pas de table `questions[]` V1).
- Pas de wizard multi-écrans ni chrome Préparer|Tenir|Clôturer (E2 conserve les sets par statut).
- Pas de migration Prisma breaking.
- RETEX / C16 / DocumentView hors scope structurel.

## 3. Règles dures

1. Création **et** conduite : silos cassés.
2. `reviewEditorTabsForPhase('prepare') === ['agenda']` uniquement. Meta / qui / docs dans le même scroll.
3. Conduct : décisions/actions **uniquement** dans la carte sujet (Suites inline). Onglets Décisions/Actions = récaps sans CTA « Ajouter » primaire.
4. Quick-add modales hors chemin principal conduct.
5. Seed `expectedDecision` obligatoire sur chaque ligne de preset pilotage + fallback par `itemType`.

## 4. Fichiers

| Zone | Fichiers |
| --- | --- |
| Doc | ce fichier ; `docs/RFC/_RFC Liste.md` ; renvoi C9 dans 013-3 |
| Presets | `apps/web/src/features/projects/lib/project-review-agenda-presets.ts` (+ spec) |
| Status tabs | `apps/web/src/features/projects/lib/project-review-status.ts` (+ spec) |
| Création | `apps/web/src/features/projects/components/project-review-create-dialog.tsx` |
| Éditeur | `apps/web/src/features/projects/components/project-review-editor-dialog.tsx` |
| ODJ | `apps/web/src/features/projects/components/review-agenda-section.tsx` ; suites inline (extrait / remplacement quick-add) |
| Récaps | `review-decisions-section.tsx` ; `review-actions-section.tsx` |
| API | DTO create/update agenda item — `expectedDecision` si manquant |

## 5. Implémentation (lots)

- **Lot 1** — presets + create-dialog ODJ-first (0 silo décisions créa).
- **Lot 2a** — prepare single-tab + scroll unifié.
- **Lot 2b** — Suites inline + récaps sans ajout primaire ; purge quick-add conduct.
- **Lot 3** — specs + typecheck + audits.

## 6. Prisma

Aucune migration breaking. Champs existants uniquement.

## 7. Tests

- `reviewEditorTabsForPhase('prepare') === ['agenda']`
- Presets : chaque ligne `expectedDecision` non vide
- Typecheck web ; `audit:ui-ids` ; `audit:modals`

## 8. Récapitulatif

Voir critères de sortie du plan d’implémentation ODJ-first v10/10.

## 9. Points de vigilance

- Double chemin Suites / modales : interdit en revue PR.
- Formation utilisateurs : récaps ≠ lieu de saisie.
- Monolithe editor-dialog : changements bornés ; extraction FE-MEET-001 hors scope.

## 10. Conformité by design

- **RGPD** : pas de nouvelle DCP ; notes/questions = contenu métier séance ; logs sans DCP en clair ; scope client inchangé.
- **RGAA** : un flux principal clavier ; labels « Question à trancher », « Notes de séance », « Suites » ; `aria-live` sur avancement ODJ ; cibles ≥ 44px.
- **Design System** : `StariumModal` création ; tokens ; états loading/empty/error ; empty récap métier (jamais d’ID).
- **Sécurité** : mutations existantes + RBAC `projects.update` ; `clientId` scope auth ; DTO validés.
- **Mobile** : carte sujet scrollable ; récaps listes ; pas de dépendance hover.
