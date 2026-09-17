---
name: starium-step-docs
description: >-
  Étape DOCS du pipeline RFC Starium — synchronise RFC, _RFC Liste, API.md et
  docs liées après une feature. À utiliser quand l'étape pipeline est « docs »,
  ou après une feature RFC avant le commit.
---

# Étape 5 — Documentation

## Entrée

- Code conforme (étape 4 OK, `validatedTreeId` renseigné)
- RFC / plan de la feature
- Feature `stage: "docs"`

## Action principale

**Lire et appliquer** `.claude/skills/starium-documentation/SKILL.md`.

Minimum pipeline :

1. Mettre à jour la RFC concernée (statut / critères clos / API réelle).
2. Aligner `docs/RFC/_RFC Liste.md` si statut/titre change.
3. Aligner `docs/API.md` si endpoints ou contrats changent.
4. Toucher `ARCHITECTURE.md` / `LIAISONS-MODULES.md` seulement si structure ou pont change.

Si la doc de **comportement** change le contenu livré à contrôler (rare) :
invalider `validatedTreeId` / contrôles et revenir en `conformite` via
orchestrateur.

## Sortie

- Doc alignée sur le **code réel**
- Feature `stage: "commit"` + miroir global

## Interdit

- Inventer des endpoints non implémentés
- Documenter des secrets / DCP
- Commit (étape suivante)
