---
name: starium-help
description: >
  Affiche le pipeline Starium Orchestra — cadrage (une fois) + cycle (par feature),
  commandes et règle unique. À utiliser quand l'utilisateur lance /starium-help,
  demande l'ordre des étapes, ou « aide pipeline ».
---

# starium-help — Pipeline Starium

Quand cette skill / commande est invoquée : **affiche le contenu ci-dessous tel quel**
(visuel + listes). Ne code pas. Ne lance pas le pipeline. Pointe vers le mode opératoire
si on demande le détail d’exécution.

---

## À afficher

### Titre

**Cinq étapes pour cadrer. Six qui se répètent.**

*(Mettre « répètent » en emphase / accent.)*

### Schéma (rendu obligatoire)

Reproduire ce layout en Markdown (tableaux ou blocs) — **deux rangées**, pas une liste plate :

```text
CADRAGE · UNE FOIS POUR LA RFC
┌──────────┐ ┌──────────────┐ ┌───────────────┐ ┌─────┐ ┌─────────┐
│  Vision  │ │ Architecture │ │ Design System │ │ RFC │ │ Backlog │
│    1     │ │      2       │ │       3       │ │  4  │ │    5    │
└──────────┘ └──────────────┘ └───────────────┘ └─────┘ └─────────┘

CYCLE · POUR CHAQUE FEATURE
┌──────┐ ┌─────────────┐ ┌───────────┐ ┌────────────┐ ┌──────┐ ┌────────┐
│ Plan │ │ Review-plan │ │ Implement │ │ Conformité │ │ Docs │ │ Commit │
│  6   │ │      7      │ │     8     │ │     9      │ │  10  │ │   11   │
└──────┘ └─────────────┘ └───────────┘ └────────────┘ └──────┘ └────────┘
```

Préférer un rendu HTML compact si le client le permet (cartes crème, numéros accent) ;
sinon le schéma ASCII ci-dessus.

### Règle unique

Interdit de coder une feature hors pipeline. Une feature = un cycle 6→11 (commit local,
**jamais de push** automatique).

### Cadrage — une fois pour la RFC

| # | Étape | Où / commande |
|---|---|---|
| 1 | **Vision** | `docs/VISION_PRODUIT.md` |
| 2 | **Architecture** | `docs/ARCHITECTURE.md` (+ `docs/LIAISONS-MODULES.md` si pont) |
| 3 | **Design System** | `docs/design-system/` · skill `starium-design-system` |
| 4 | **RFC** | `/rfc` · `docs/RFC/` · index `docs/RFC/_RFC Liste.md` |
| 5 | **Backlog** | découpe features (3–8) au bootstrap `/rfc-pipeline` |

### Cycle — pour chaque feature

| # | Étape | Skill / commande |
|---|---|---|
| 6 | **Plan** | `starium-step-plan` |
| 7 | **Review-plan** | `starium-step-review-plan` |
| 8 | **Implement** | `starium-step-implement` |
| 9 | **Conformité** | `starium-step-conformite` (+ `/conformite` hors boucle) |
| 10 | **Docs** | `starium-step-docs` (+ `/doc-sync` hors boucle) |
| 11 | **Commit** | `starium-step-commit` — commit isolé, **pas de push** |

Après succès d’une étape → enchaîner immédiatement dans le même run.

Fin de backlog → `starium-release-gate` (préprod, checks only). Features `blocked` → pipeline `blocked`, pas `done`.

### Orchestrateur

```text
/rfc-pipeline RFC-XXXX
```

Équivalent : skill directe `starium-rfc-pipeline`. Arguments : `RFC-XXXX` | `conformité` | `suite`.

Pilotage : « Suite pipeline » · « Pause pipeline » · « Reprends » · « Refais la conformité de `<featureId>` ».

### Commandes hors boucle

| Commande | Rôle |
|---|---|
| `/rfc` | Rédaction / implémentation manuelle (méthode 9 points) |
| `/conformite` | Audit ponctuel d’un diff |
| `/doc-sync` | Sync docs ponctuelle |
| `/audit-ui` | Audits UI (IDs / modales) |
| `/nouveau-module` | Scaffold module |
| `/starium-help` | Ce rappel pipeline |

### Où lire le détail

Mode opératoire complet : `docs/runbooks/mode-operatoire-pipeline-rfc.md`
