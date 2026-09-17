---
name: starium-rfc-pipeline
description: >-
  Orchestrateur du pipeline RFC Starium — enchaîne plan → review-plan →
  implement → conformite → docs → commit en boucle continue selon l'étape
  courante. À utiliser pour développement autonome de RFC, autopilot
  conformité, pipeline RFC, « go sur COMP-* », ou commit entre chaque feature.
  Lancement par skill directe ou commande /rfc-pipeline (équivalents).
---

# Pipeline RFC Starium — orchestrateur

## Rôle

Piloter **une feature à la fois** jusqu'au commit, puis la suivante.
Ne pas tout coder d'un coup. Intervention humaine limitée aux arbitrages métier
non déductibles, autorisations manquantes, et échecs techniques persistants.

## Boucle continue

Après succès d'une étape, **enchaîner immédiatement** l'étape suivante dans le
**même run** agent (re-`Read` du skill d'étape + exécution), **sans** attendre
un nouveau message utilisateur.

Boucle feature : `plan → review-plan → implement → conformite → docs → commit`
puis sélection de la feature suivante → `plan`, jusqu'à fin ou stop.

**Arrêts autorisés uniquement** :

- `pauseRequested` (demande explicite utilisateur)
- `blocked` qualifié (métier / auth manquante / échec technique après retries)
- `done` après contrôles de fin réussis

**Interdit** : s'arrêter entre deux étapes techniques « pour confirmation ».

## Fichier d'état

Créer / mettre à jour `.claude/rfc-pipeline-state.json` (**gitignoré** — ne pas
le committer). Schéma :

```json
{
  "rfcId": "RFC-COMP-002",
  "rfcPath": "docs/RFC/…",
  "stage": "plan",
  "commitPerFeature": true,
  "pauseRequested": false,
  "baseline": { "branch": null, "headCommit": null, "capturedAt": null },
  "preExistingDirty": null,
  "resumeObserved": null,
  "activeFeatureId": "campaigns-crud",
  "features": [
    {
      "id": "campaigns-crud",
      "title": "CRUD campagnes",
      "status": "pending",
      "stage": null,
      "planPath": null,
      "commitHash": null,
      "followUpCommitHashes": [],
      "validatedTreeId": null,
      "attempts": {
        "implement": 0,
        "conformite": 0,
        "commit": 0,
        "releaseGate": 0
      },
      "blockReason": null,
      "featureControls": { "required": [], "passed": [], "failed": [] }
    }
  ],
  "backlogControls": { "required": [], "passed": [], "failed": [] },
  "notes": ""
}
```

- Feature `status` ∈ `pending` | `in_progress` | `completed` | `blocked`
- Étapes ∈ `plan` | `review-plan` | `implement` | `conformite` | `docs` |
  `commit` | `done` | `blocked`

### Source de vérité des stages

- `features[i].stage` = étape réelle de la feature (source de vérité du travail)
- `stage` global = miroir de `features[active].stage`, ou `done` / `blocked`
  au niveau pipeline ; si `pauseRequested`, ne pas avancer
- À chaque transition : écrire les **deux** ; en cas de divergence à la reprise,
  **reconcilier depuis `features[active].stage`** (sauf pipeline déjà
  `done` / `blocked` / pause)

## Bootstrap (début de run)

Avant backlog / écriture :

1. Vérifier présence des 7 skills pipeline + transverses :
   `starium-rfc`, `starium-conformite`, `starium-documentation`,
   `starium-design-system`, `starium-modales`, `starium-release-gate`.
   `/rfc-pipeline` est un **raccourci** — **non obligatoire** si skill directe.
2. Prérequis : `git`, `pnpm`, Node, working tree lisible. Échec → `blocked`.
3. Capturer **une seule fois** (immuable ensuite) :
   - `baseline.branch` / `baseline.headCommit` / `baseline.capturedAt`
   - `preExistingDirty` (chemins dirty, staged vs unstaged, index rempli)
4. **Ne jamais** écraser `baseline` / `preExistingDirty` à la reprise.

## État initial immuable & reprise

À la reprise : peupler `resumeObserved` (branche, HEAD, dirty/index) et
**comparer** à `baseline` / `preExistingDirty` **et** aux changements connus
de la pipeline (plans, commits feature, `followUpCommitHashes`, espace isolé).

**Ne pas** reclasser automatiquement les modifications pipeline comme travail
préexistant.

### Sélection feature suivante

1. Première `in_progress`, sinon première `pending` (ordre du tableau).
2. Ignorer `completed` et `blocked` (sauf reprise manuelle user sur un `blocked`).
3. Fin de backlog = plus aucune `pending` ni `in_progress` ; s'il reste des
   `blocked` → pipeline `blocked` (pas `done`).
4. `done` seulement si toutes les features sont `completed` **et**
   `backlogControls` OK (dont release-gate).

### Reprise fiable

1. Lire l'état ; écrire `resumeObserved` (sans toucher baseline / preExistingDirty).
2. Si `commitHash` / `followUpCommitHashes` renseignés, **ne pas** marquer
   `completed` sur la seule existence d'un objet git. Exiger :
   - commit(s) reachables sur la branche courante ;
   - dernier état livré (arbre du commit + follow-ups) correspond à la feature ;
   - validations `passed` pour `codeRef` = **tree id** de cet état — sinon
     rejouer `conformite` (puis docs si besoin) avant `completed`.
3. Code feature sans commit satisfaisant : critères du plan →
   incomplet → `implement` ; complet → `conformite` ; puis `docs` / `commit`
   seulement après validation OK.
4. Ne jamais recommitter un état déjà validé ; ne jamais re-coder un plan GO
   déjà matérialisé.

## Dispatch

| `stage` (feature active) | Skill |
|---|---|
| `plan` | `.claude/skills/starium-step-plan/SKILL.md` |
| `review-plan` | `.claude/skills/starium-step-review-plan/SKILL.md` |
| `implement` | `.claude/skills/starium-step-implement/SKILL.md` |
| `conformite` | `.claude/skills/starium-step-conformite/SKILL.md` |
| `docs` | `.claude/skills/starium-step-docs/SKILL.md` |
| `commit` | `.claude/skills/starium-step-commit/SKILL.md` |
| `done` | Stop — récap + commits |
| `blocked` | Stop — diagnostic + question précise |

**Chaque étape** :

1. Lire l'état ; résoudre stage depuis `features[active].stage`.
2. `Read` le SKILL d'étape ; exécuter jusqu'à sortie.
3. Mettre à jour `features[active].stage` + `stage` global.
4. Enchaîner immédiatement (boucle continue).

## Politique d'échec (autocorrection)

- Blocage **technique** : jusqu'à **3** tentatives sur `attempts.<stage>` ;
  après chaque fix → **revalider** les contrôles de l'étape.
- Choix techniques courants : conventions repo / skills transverses, **sans**
  question user.
- Solliciter l'utilisateur **uniquement** si : arbitrage métier non déductible ;
  autorisation manquante (`commitPerFeature: false` sans OK, secret, accès) ;
  3 échecs techniques sur la même étape.
- Message : diagnostic court + **une** question ; feature + pipeline → `blocked`.

## Contrôles

### Feature (`featureControls`, étape conformite)

Chaque entrée : `command`, `result` (`pass`|`fail`), `codeRef` (tree id), `at`.

**`codeRef` (uniforme)** : id de l'**arbre Git exact** vérifié dans l'**espace
isolé** (`git rev-parse <commit>^{tree}` ou équivalent) — jamais le seul SHA
commit comme proxy de contenu.

Stocker `validatedTreeId` quand les contrôles feature passent.

| Touché | Obligatoire |
|---|---|
| `apps/api` | tests ciblés + typecheck api |
| `apps/web` | typecheck web + `pnpm audit:ui-ids` |
| modale | `pnpm audit:modals` |
| Prisma | `prisma generate` ; **migration SQL seulement si** schéma DB modifié |
| toujours | critères d'acceptation du plan GO |

**Invalidation** : seulement si correction **modifie le contenu** (nouvel arbre ≠
`validatedTreeId`) → revalidation avant `completed` / `done`. SHA commit seul
sans delta d'arbre → contrôles conservés.

Après commit : `commit^{tree}` doit égaler `validatedTreeId`. Après follow-up :
référence = dernier arbre via `followUpCommitHashes` ; ré-aligner
`validatedTreeId` après revalidation si contenu changé.

### Fin de backlog (`backlogControls`)

Exécuter `starium-release-gate` en mode **préprod** (prod seulement sur demande).

- Vérifications autorisées uniquement — **pas** de push, déploiement, ni
  migration distante implicites.
- Jusqu'à **3** tentatives ; corrections post-commit feature → valider puis
  commit complémentaire (`followUpCommitHashes`).
- Échec après 3 → `blocked`.

`done` interdit si contrôle requis échoué, invalidé non rejoué, ou feature non
`completed`.

## Isolation Git (dès le bootstrap)

Voir aussi `starium-step-commit`. Capture initiale immuable avant toute écriture.
Mécanisme d'isolation (worktree dédié ou stash/index temporaire documenté) si
mêmes fichiers dirty préexistant + feature. Ne jamais embarquer ni modifier le
travail préexistant. Jamais `git add -A`.

Commits : via `starium-step-commit` ssi `commitPerFeature === true` **ou**
demande user explicite. **Pas de push** sauf demande explicite.

## Initialisation

1. Lire `docs/RFC/_RFC Liste.md` + la RFC.
2. Déduire `features[]` bornées (ordre de dépendance).
3. Bootstrap (skills, prérequis, baseline, preExistingDirty).
4. `activeFeatureId` = première pending ; `status: in_progress` ; `stage: plan`.
5. Annoncer le backlog (3–8 puces), démarrer `plan` immédiatement.

Ordre recommandé conformité ouvert : reste COMP-003 V2 → COMP-002 par tranches
→ morceaux ciblés COMP-001 (jamais toute la cible GRC).

## Skills transverses

- UI : `starium-design-system` / `starium-modales`
- Release-gate : **obligatoire en fin de backlog** (hors boucle feature)

## Communication

- Français, concis, expert
- Fin d'étape : 2–4 lignes (stage suivant + résultat)
- Pas de confirmation entre étapes techniques
