---
name: starium-rfc-pipeline
description: >-
  Orchestrateur du pipeline RFC Starium — enchaîne plan → review-plan →
  implement → conformite → docs → commit selon l'étape courante. À utiliser
  quand l'utilisateur demande un développement autonome de RFC, autopilot
  conformité, pipeline RFC, « go sur COMP-* », ou commit entre chaque feature.
---

# Pipeline RFC Starium — orchestrateur

## Rôle

Piloter **une feature à la fois** jusqu'au commit, puis passer à la suivante.
Ne pas tout coder d'un coup.

## Fichier d'état (obligatoire)

Créer / mettre à jour `.claude/rfc-pipeline-state.json` (gitignoré si besoin ; sinon
commitable uniquement si l'équipe le souhaite — par défaut **ne pas committer** ce fichier) :

```json
{
  "rfcId": "RFC-COMP-002",
  "rfcPath": "docs/RFC/RFC-COMP-002 — ….md",
  "featureIndex": 0,
  "featureSlug": "campaigns-crud",
  "stage": "plan",
  "planPath": null,
  "commitPerFeature": true,
  "backlog": ["campaigns-crud", "campaign-run", "audit-export"],
  "notes": ""
}
```

`stage` ∈ `plan` | `review-plan` | `implement` | `conformite` | `docs` | `commit` | `done` | `blocked`

## Dispatch (lire la skill d'étape puis l'exécuter)

| `stage` | Skill à lire et appliquer |
|---|---|
| `plan` | `.claude/skills/starium-step-plan/SKILL.md` |
| `review-plan` | `.claude/skills/starium-step-review-plan/SKILL.md` |
| `implement` | `.claude/skills/starium-step-implement/SKILL.md` |
| `conformite` | `.claude/skills/starium-step-conformite/SKILL.md` |
| `docs` | `.claude/skills/starium-step-docs/SKILL.md` |
| `commit` | `.claude/skills/starium-step-commit/SKILL.md` |
| `done` | Stop — récap backlog + commits |
| `blocked` | Stop — exposer le blocage ; attendre l'utilisateur |

**À chaque tour** :

1. Lire l'état JSON (ou l'initialiser si absent).
2. `Read` le `SKILL.md` de l'étape courante.
3. Exécuter l'étape jusqu'à sa sortie.
4. Mettre à jour `stage` selon la sortie de l'étape.
5. Si `commitPerFeature` et stage repasse à `plan` : enchaîner **sauf** si l'utilisateur a demandé pause.
6. Si décision produit ambiguë → `stage: "blocked"` (ne pas inventer).

## Initialisation

Quand l'utilisateur lance le pipeline sur une RFC :

1. Lire `docs/RFC/_RFC Liste.md` + la RFC.
2. Déduire un **backlog de features** bornées (ordre de dépendance).
3. Écrire l'état avec `stage: "plan"`, `featureIndex: 0`.
4. Annoncer le backlog en 3–8 puces, puis démarrer l'étape `plan`.

Ordre recommandé conformité ouvert :

1. Reste **RFC-COMP-003** (V2 ouvert)
2. **RFC-COMP-002** (campagnes) par tranches
3. Seulement ensuite morceaux ciblés de **RFC-COMP-001** (jamais toute la cible GRC d'un coup)

## Skills transverses (rappels)

- UI : `starium-design-system` / `starium-modales`
- Gate release : `starium-release-gate` (hors pipeline feature ; fin de vague)

## Communication

- Français, concis, expert
- En fin d'étape : 2–4 lignes max (stage suivant + résultat)
- Ne pas redemander confirmation entre étapes **sauf** `blocked` ou décision produit

## Commit / push

- Commits autorisés **uniquement** via `starium-step-commit` quand `commitPerFeature: true`
  ou demande user
- **Pas de push** sauf demande explicite
