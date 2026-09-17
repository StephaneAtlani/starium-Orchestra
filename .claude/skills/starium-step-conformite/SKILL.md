---
name: starium-step-conformite
description: >-
  Étape CONFORMITE du pipeline RFC Starium — revue qualité multi-client, RBAC,
  by-design, audits et featureControls (codeRef = tree id). À utiliser juste
  après l'implémentation d'une feature RFC, avant doc/commit, ou quand l'étape
  pipeline est « conformite ».
---

# Étape 4 — Conformité

## Entrée

- Diff / arbre de l'espace isolé de la feature
- Feature `stage: "conformite"`
- Plan GO + critères d'acceptation

## Action principale

**Lire et appliquer intégralement** `.claude/skills/starium-conformite/SKILL.md`.

### featureControls (obligatoire)

Exécuter la matrice orchestrateur selon le périmètre touché. Pour chaque check :

```text
{ command, result: "pass"|"fail", codeRef: "<tree-id>", at: "<iso>" }
```

**`codeRef`** = arbre Git exact de l'espace isolé vérifié
(`git rev-parse HEAD^{tree}` ou arbre de l'index isolé) — uniforme.

Compléments :

1. UI : checklist DS/RGAA/mobile (`starium-design-system`) ; agent
   `starium-ui-reviewer` si disponible.
2. Modale : `pnpm audit:modals` + `starium-modales`.
3. `apps/web` : `pnpm audit:ui-ids`.
4. Prisma : `prisma generate` ; migration seulement si schéma DB modifié —
   **exécuter migrate/generate soi-même** (voir `starium-step-implement`).
5. Critères d'acceptation du plan GO.

Si OK : renseigner `featureControls.passed`, `validatedTreeId = codeRef`.
Si fail : `failed` + corriger ; incrémenter `attempts.conformite` (max 3 via
orchestrateur) ; **rejouer** les contrôles invalidés.

**Invalidation** : nouveau contenu (arbre ≠ `validatedTreeId`) → revalidation
obligatoire. Changement de SHA commit sans delta d'arbre → ne pas invalider.

## Échec

Remonter à l'orchestrateur (retry ≤ 3) ; ne pas s'arrêter en silence.

## Sortie

- Verdict : `OK` | `ÉCARTS` (`fichier:ligne` + fix)
- Si OK : feature `stage: "docs"` + miroir global
- Si écarts bloquants non résolus après retries → `blocked`

## Interdit

- Commit tant qu'il reste un écart bloquant (isolation, authz, ID en UI, secret)
- Déclarer OK sans `codeRef` tree enregistré
