# Mode opératoire — Pipeline RFC Starium

Guide d’utilisation de l’autopilot RFC : une feature à la fois jusqu’au commit, puis la suivante.

**Sources de vérité**

| Élément | Chemin |
|---|---|
| Orchestrateur | `.claude/skills/starium-rfc-pipeline/SKILL.md` |
| Commande | `/rfc-pipeline` → `.claude/commands/rfc-pipeline.md` |
| État local (gitignoré) | `.claude/rfc-pipeline-state.json` |
| Template d’état | `.claude/rfc-pipeline-state.example.json` |
| Étapes | `.claude/skills/starium-step-*/SKILL.md` |

---

## 1. Objectif

Enchaîner automatiquement :

```
plan → review-plan → implement → conformite → docs → commit
```

puis sélectionner la feature suivante, jusqu’à fin de backlog + release-gate préprod.

Intervention humaine limitée à :

- arbitrages métier non déductibles ;
- autorisations manquantes ;
- échecs techniques après 3 retries ;
- pause / reprise explicites ;
- push / PR (jamais faits par le pipeline).

---

## 2. Prérequis

- [ ] Repo cloné, Node ≥ 20, pnpm, `git` opérationnels
- [ ] Branche de travail dédiée (recommandé)
- [ ] RFC présente dans `docs/RFC/` et listée dans `docs/RFC/_RFC Liste.md`
- [ ] Skills présentes sous `.claude/skills/` (orchestrateur + 6 steps + transverses)
- [ ] Dirty tree **connu** : le pipeline capture le dirty préexistant et ne l’embarque pas ; éviter les conflits sur les mêmes fichiers

Skills transverses attendues au bootstrap : `starium-rfc`, `starium-conformite`, `starium-documentation`, `starium-design-system`, `starium-modales`, `starium-release-gate`.

---

## 3. Lancer un run

### 3.1 Commande (recommandée)

```text
/rfc-pipeline RFC-COMP-002
```

Arguments utiles : `RFC-COMP-002` | `conformité` | `suite`.

### 3.2 Langage naturel (équivalent)

Exemples :

- « Go pipeline sur RFC-COMP-002 »
- « Autopilot conformité COMP-003 »
- « Suite pipeline » / « Reprends le pipeline »

`/rfc-pipeline` et le lancement direct de la skill `starium-rfc-pipeline` sont **équivalents**. La commande n’est pas obligatoire.

### 3.3 Ne pas confondre

| Outil | Rôle |
|---|---|
| `/rfc-pipeline` | Boucle autonome feature par feature |
| `/rfc` | Rédaction / implémentation manuelle (méthode 9 points `starium-rfc`) |
| `/conformite` | Audit ponctuel d’un diff, hors boucle |
| `/doc-sync` | Sync docs ponctuelle |
| `/audit-ui` | Audits UI (IDs / modales) |
| `/nouveau-module` | Scaffold module |

### 3.4 Options d’init

- `commitPerFeature: true` (défaut) → un commit git par feature, **pas de push**
- `commitPerFeature: false` → stop avant commit sauf autorisation explicite

---

## 4. Boucle d’exécution

### 4.1 Étapes par feature

| Stage | Skill | Action |
|---|---|---|
| `plan` | `starium-step-plan` | Plan borné (1 feature), critères d’acceptation, hors-scope |
| `review-plan` | `starium-step-review-plan` | Challenge scope / isolation / DoD |
| `implement` | `starium-step-implement` | Code API + UI + tests ; Prisma si besoin |
| `conformite` | `starium-step-conformite` | Revue + `featureControls` (`codeRef` = tree id) |
| `docs` | `starium-step-docs` | RFC, `_RFC Liste`, API.md, docs liées |
| `commit` | `starium-step-commit` | Commit isolé si autorisé ; tree = `validatedTreeId` |

Après succès d’une étape, l’agent **enchaîne immédiatement** dans le même run. Interdit de s’arrêter « pour confirmation » entre étapes techniques.

### 4.2 Fin de backlog

Quand plus aucune feature `pending` / `in_progress` :

1. Exécuter `starium-release-gate` en mode **préprod** (checks only)
2. Pas de push, pas de déploiement, pas de migration distante implicite
3. Jusqu’à 3 tentatives ; corrections → commits complémentaires (`followUpCommitHashes`)
4. `done` seulement si toutes les features sont `completed` **et** `backlogControls` OK

S’il reste des features `blocked` → statut pipeline `blocked` (pas `done`).

### 4.3 Arrêts autorisés

| Condition | Comportement |
|---|---|
| `pauseRequested` | Stop — attendre message user |
| `blocked` qualifié | Stop — diagnostic + **une** question précise |
| `done` | Stop — récap + liste des commits |

---

## 5. Phrases de pilotage

| Intention | Message type |
|---|---|
| Démarrer | `/rfc-pipeline RFC-XXXX` |
| Reprendre | « Suite pipeline » / « Reprends » |
| Pause | « Pause pipeline » |
| Reprendre après pause | « Reprends le pipeline » |
| Sans commit auto | Indiquer `commitPerFeature: false` |
| Débloquer | Répondre à la question posée, puis « Reprends sur `<featureId>` » |
| Rejouer une étape | « Refais la conformité de `<featureId>` » |

---

## 6. Fichier d’état

Créé / mis à jour automatiquement : `.claude/rfc-pipeline-state.json` (**ne pas committer**).

Champs clés :

- `rfcId` / `rfcPath` — RFC cible
- `commitPerFeature` / `pauseRequested`
- `baseline` + `preExistingDirty` — capturés **une fois** au bootstrap, **immuables**
- `resumeObserved` — peuplé à chaque reprise (sans écraser la baseline)
- `activeFeatureId` + `features[]`
- Par feature : `status`, `stage`, `planPath`, `commitHash`, `followUpCommitHashes`, `validatedTreeId`, `attempts`, `featureControls`, `blockReason`
- `backlogControls` — contrôles de fin de backlog

**Source de vérité des stages** : `features[active].stage`. Le `stage` global est un miroir. En cas de divergence à la reprise → reconcilier depuis `features[active].stage`.

Statuts feature : `pending` | `in_progress` | `completed` | `blocked`.

---

## 7. Isolation Git

Dès le bootstrap :

1. Capturer branche, HEAD, dirty/staged (`baseline` / `preExistingDirty`)
2. Ne jamais les écraser en reprise
3. Ne jamais embarquer ni modifier le travail préexistant
4. Jamais `git add -A` — uniquement les chemins de la feature
5. Worktree / stash temporaire si collision dirty préexistant ∩ fichiers feature

Règles commit :

- via `starium-step-commit` seulement si `commitPerFeature === true` **ou** demande user explicite ;
- `commit^{tree}` doit égaler `validatedTreeId` ;
- **pas de push** sauf demande explicite hors pipeline.

---

## 8. Contrôles qualité

### 8.1 Par feature (`featureControls`, étape `conformite`)

Chaque entrée : `command`, `result` (`pass`|`fail`), `codeRef` (id d’**arbre** Git, pas le seul SHA commit), `at`.

| Périmètre touché | Contrôle obligatoire |
|---|---|
| `apps/api` | tests ciblés + typecheck api |
| `apps/web` | typecheck web + `pnpm audit:ui-ids` |
| Modale | `pnpm audit:modals` |
| Prisma | `prisma generate` ; migration SQL **seulement si** schéma DB modifié |
| Toujours | critères d’acceptation du plan GO |

Invalidation : nouvel arbre ≠ `validatedTreeId` → revalidation avant `completed`.

L’agent lance lui-même migrate / tests / audits dans le run — ne pas déléguer ces commandes à l’humain en fin de feature.

### 8.2 Politique d’échec

- Blocage technique : max **3** tentatives sur `attempts.<stage>`
- Après chaque fix → revalider les contrôles de l’étape
- Solliciter l’utilisateur seulement si : arbitrage métier, auth manquante, ou 3 échecs

---

## 9. Recette type (jour 1)

1. Checkout d’une branche feature
2. Lancer `/rfc-pipeline RFC-XXXX`
3. Relire le backlog annoncé (3–8 puces) — corriger l’ordre **immédiatement** si faux
4. Laisser tourner jusqu’à `pause` / `blocked` / `done`
5. Sur `blocked` : répondre court → « Reprends »
6. Sur `done` : relire les commits locaux → **toi** qui push / ouvre la PR

Ordre recommandé (conformité ouvert, hint skill) : reste COMP-003 V2 → COMP-002 par tranches → morceaux ciblés COMP-001 (jamais toute la cible GRC d’un coup).

---

## 10. Debug rapide

| Symptôme | Action |
|---|---|
| Reprend au mauvais endroit | Lire `features[active].stage` dans l’état |
| Veut recommitter le même contenu | Vérifier `validatedTreeId` / `commitHash` — ne pas forcer `implement` |
| Dirty mélangé | Comparer `preExistingDirty` vs `resumeObserved` |
| Gate finale rouge | Inspecter `backlogControls.failed` ; retries release-gate (max 3) |
| Feature bloquée sans question claire | Relancer avec « Diagnostic blocked `<featureId>` » |

Ne pas marquer `completed` sur la seule existence d’un objet git : exiger commits reachables + validations `passed` pour le tree livré.

---

## 11. Outils hors boucle

| Besoin | Commande / skill |
|---|---|
| Rédiger une RFC sans autopilot | `/rfc RFC-XXXX` |
| Audit conformité d’un diff | `/conformite` |
| Sync documentation | `/doc-sync` |
| Audit UI | `/audit-ui` |
| Nouveau module | `/nouveau-module` |
| Travail UI / modale seul | `starium-design-system` / `starium-modales` |
| Revue visuelle frontend | agent `starium-ui-reviewer` |

---

## 12. Checklist go / no-go avant lancement

- [ ] RFC et index à jour
- [ ] Branche dédiée
- [ ] Dirty hors scope accepté / isolé
- [ ] `commitPerFeature` décidé
- [ ] Capacité à répondre aux blocages métier dans la session
- [ ] Push / PR prévus **après** `done`, pas pendant

---

## Références

- Orchestrateur : `.claude/skills/starium-rfc-pipeline/SKILL.md`
- Méthode RFC : `.claude/skills/starium-rfc/SKILL.md` et `.cursor/rules/rfc.mdc`
- Conformité : `.claude/skills/starium-conformite/SKILL.md`
- Release : `.claude/skills/starium-release-gate/SKILL.md`
- Carte outillage : `CLAUDE.md` §8
