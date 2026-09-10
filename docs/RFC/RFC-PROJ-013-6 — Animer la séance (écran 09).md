# RFC-PROJ-013-6 — Animer la séance (écran 09)

| | |
| --- | --- |
| **Statut** | 🚧 En cours (amorce UI livrée) |
| **Date** | 2026-09-10 |
| **Parents** | RFC-PROJ-013-5 (catalogue) ; 013-4 (ODJ-first) |
| **Écran PDF** | **09 — Séance en cours — conduite** |
| **Scope** | Workspace live : présence, ODJ stepper, présentation / décision, timers, clôture séance → À finaliser |

## 1. Analyse de l’existant

| Élément | État |
| --- | --- |
| `project-review-animate-session.tsx` | Shell « Animer la séance » : header Mic, strip EN SÉANCE + timer séance, présence Switch, ODJ, modes Présentation / Décision (Acter, Trancher, Assigner, Consigner), footer Suspendre / Clôturer |
| Brancher éditeur | `editorPhase === 'conduct'` → animate session (013-4 évolué) |
| Manques vs PDF 09 | Minuteur **par point** ; « Point suivant » stepper ; routing décision → action / risque / **sujet à remonter** ; émargement figé au CR ; passage automatique état **À finaliser** |

## 2. Hypothèses

1. Une seule séance `IN_PROGRESS` par projet à la fois (garde-fou liste 03).
2. Suspendre = quitter l’UI sans changer le statut (reprise via 03).
3. « Clôturer & générer le CR » = fin de **conduite** (→ À finaliser / aperçu) ; la **diffusion** reste écran 11 (013-8).
4. Risques consignés en V1 = notes préfixées `Risque :` **ou** création `ProjectRisk` (préférer ProjectRisk dès que API prête — sinon notes + dette 013-8).

## 3. Cible UX (maquette)

- Header : Animer la séance + meta type/horaire/lieu
- Strip : EN SÉANCE · chrono séance · N/M présents · Point i/n · k traités
- Gauche : Présence (toggles) + ODJ numéroté (INFO / DÉC + durée)
- Droite : point actif
  - **Présentation / info** : relevé, documents, CTA « mène à une décision »
  - **Décision / arbitrage** : Décisions (Acter) · Arbitrage Adopté/Rejeté/Reporté (Trancher) · Plan d’action (Assigner) · Risques (Consigner) · lien retour présentation
- Footer : Suspendre · Clôturer & générer le CR
- **Point suivant** : clôture point courant + focus suivant (PDF)

## 4. Fichiers

| Zone | Fichiers |
| --- | --- |
| UI | `apps/web/src/features/projects/components/project-review-animate-session.tsx` |
| Wire | `project-review-editor-dialog.tsx` ; `project-review-conduct-view.tsx` |
| Liste 03 | `project-reviews-tab.tsx` (lien « Reprendre la conduite ») |
| API | mutations agenda / participants / attachments existantes ; évent. `POST …/close-conduct` |

## 5. Implémentation (lots)

| Lot | Contenu | État |
| --- | --- | --- |
| A | Shell + présence + ODJ + modes Présentation / Décision | ✅ Amorce |
| B | Minuteur par point ; Point suivant ; démarrage auto TODO→IN_PROGRESS | ⏳ |
| C | Routing décision → action / risque / sujet à remonter (UI + payload) | ⏳ |
| D | Clôturer conduite → statut/flags À finaliser + ouverture aperçu CR | ⏳ |
| E | Tests vitest (timer, présence, acter/trancher) + RGAA strip | ⏳ |

## 6. Prisma

- Pas de breaking V1 si À finaliser = flag `conductClosedAt` (sinon statut dédié — voir 013-5 §4 / 013-7).
- Remontées (écran 10) : modèle léger `escalationToReviewId` / table pont — **013-8**.

## 7. Tests

- Présence PRESENT/EXPECTED isolée client.
- Acter / Trancher forcent `agendaItemId`.
- Point suivant n’avance que si point courant DONE ou SKIPPED.
- Isolation multi-client inchangée.

## 8. Récapitulatif

RFC d’implémentation de l’écran **09**. Amorce UI présente ; lots B–E pour parité PDF.

## 9. Points de vigilance

- Ne pas réintroduire la barre d’onglets Décisions/Actions en conduite.
- Autosave form décisions/actions (state éditeur) avant finalize.
- Mobile : sidebar présence/ODJ en drawer.

## 10. Conformité by design

- **RGPD** : présence = DCP de séance ; finalité CR ; purge avec rétention projet.
- **RGAA** : Switch labellisés ; timer `aria-live="polite"` ; focus trap si drawer.
- **Design System** : or Starium pour CTA Acter/Trancher/Assigner/Consigner ; `EmptyState`.
- **Sécurité** : `projects.update` ; client scope ; audit clôture conduite.
- **Mobile** : une colonne ; ODJ en select sticky ; cibles ≥ 44px.
