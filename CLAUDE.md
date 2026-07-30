# CLAUDE.md — Starium Orchestra

Mémoire projet chargée à chaque session. Règles opérationnelles obligatoires + carte de la
documentation. En cas de doute, **lire le doc pointé avant de coder**.

> Les fichiers `.cursor/rules/*.mdc` et `.cursorrules` restent dans le repo : ils sont référencés
> par de nombreuses RFC (`docs/RFC/`) et par `docs/FRONTEND_UI-UX.md`. Ils servent désormais de
> **documents de référence**, pas de configuration active. La config active est `.claude/`.

---

## 1. Produit

SaaS **multi-tenant / multi-client**, **API-first**, de gouvernance opérationnelle (projets,
budgets, ressources, achats, conformité). Cas d'usage principal : un **DSI à temps partagé** pilote
plusieurs organisations clientes depuis la même plateforme. Audience : CODIR / COMEX.

Périmètre actuel : Orchestra IT, noyau financier partagé, admin studio configurable.
Vision : `docs/VISION_PRODUIT.md` · Architecture : `docs/ARCHITECTURE.md`.

---

## 2. Stack & commandes

| Couche | Stack |
|---|---|
| Backend | NestJS 10 + TypeScript + Prisma 6 + PostgreSQL + BullMQ/Redis |
| Frontend | Next.js (App Router) + TypeScript + Tailwind v4 + shadcn / **Base UI** (`@base-ui/react`) + TanStack Query |
| Auth | JWT + refresh token + RBAC client-aware |
| Monorepo | pnpm workspaces (`apps/api`, `apps/web`, `packages/*`) |

```bash
# Racine (tous les workspaces)
pnpm lint                 # eslint -r
pnpm typecheck            # tsc --noEmit -r
pnpm build
pnpm test                 # scripts/run-tests-with-recap.mjs (jest api + vitest web)
pnpm audit:modals         # 0 DialogContent direct hors socle — doit passer
pnpm audit:ui-ids         # 0 identifiant technique visible en UI — doit passer

# API (apps/api)
pnpm --filter @starium-orchestra/api start:dev
pnpm --filter @starium-orchestra/api test           # jest
pnpm --filter @starium-orchestra/api prisma:generate
pnpm --filter @starium-orchestra/api prisma:migrate  # migrate deploy

# Web (apps/web) — port 3002
pnpm --filter @starium-orchestra/web dev
pnpm --filter @starium-orchestra/web test           # vitest
pnpm --filter @starium-orchestra/web typecheck
```

Node ≥ 20, pnpm 9.14.2. Docker : `docker-compose.dev.yml`.

---

## 3. Structure

```
apps/api/src/
  modules/<module>/   <module>.module.ts · .controller.ts · .service.ts · dto/ · guards/ · tests/
  common/  config/  prisma/  auth/  worker/
apps/web/src/
  app/(protected)/…   routes App Router
  features/<domaine>/ components/ · hooks/ · lib/ · api · *-query-keys
  components/  ui/ (socle) · layout/ · feedback/ · shell/ · data-table/
  services/  hooks/  context/  providers/  styles/  types/
packages/  types · rbac-permissions · budget-exercise-calendar · config
docs/      ARCHITECTURE · FRONTEND_* · design-system/ · RFC/ · modules/ · runbooks/ · security/
```

---

## 4. Règles non négociables

### 4.1 Isolation multi-client (priorité absolue)

- Toute donnée métier porte un **scope client**. Toute requête filtre sur les clients autorisés.
- `clientId` **jamais** pris du payload brut : toujours dérivé/validé depuis le scope authentifié.
- Toute écriture valide le client cible contre le scope de l'utilisateur.
- Frontend : `clientId` **dans les query keys** TanStack Query ; jamais de données mélangées entre
  clients hors écran plateforme explicitement autorisé.
- **Ne jamais** retirer un filtre client ni affaiblir une permission « pour que ça marche ».

### 4.2 Les 5 standards « by design »

Appliqués dès la conception (PRD/RFC), pas en correctif. Détail complet :
`.cursor/rules/by-design-standards.mdc`.

1. **RGPD** — minimisation, finalité documentée, DCP identifiées dans le schéma, droits
   (accès/rectification/effacement/portabilité), rétention + purge, chiffrement, **jamais de DCP en
   clair dans les logs**, scope client.
2. **RGAA / WCAG 2.1 AA** — HTML sémantique, clavier complet + `focus-visible`, `<label>` sur chaque
   champ, erreurs via `aria-invalid` + `aria-describedby`, contraste ≥ 4.5:1, info jamais portée par
   la couleur seule, `aria-live` sur le dynamique, `prefers-reduced-motion`, `lang="fr"`.
3. **Design System** — voir §5.
4. **Sécurité** — authz + RBAC client-aware sur chaque endpoint, DTO + `class-validator` sur tous les
   écrits, secrets en env, audit log des actions sensibles, pas de sur-exposition de champs.
5. **Mobile-first** — testé dès 320px, layouts fluides, cibles tactiles ≥ 44×44px, stratégie mobile
   pour les tableaux denses, pas d'interaction dépendant du hover.

### 4.3 Inputs et référentiels : **valeur, jamais l'ID**

Tout champ où l'utilisateur choisit ou voit une donnée référencée (select, combobox, autocomplete,
colonne de table, badge, chip, résultat de recherche, fil d'Ariane, résumé de formulaire) affiche un
**libellé métier** (nom, code, titre, libellé configuré). **Jamais** un UUID / CUID / entier interne
comme texte visible. L'ID reste la valeur soumise au backend ; l'UI mappe ID → libellé. Prévoir dans
les DTO / réponses API les champs de libellé (`name`, `title`, `code`, `label`) quand une relation
est affichée.

**Anti-pattern interdit — le repli sur l'ID.** Jamais `entity.name ?? entity.id`,
`map.get(id) ?? id`, `` `Budget ${budgetId}` ``. Un libellé absent se remplace par un texte métier
(« Ligne supprimée », « Compte supprimé »), via `displayLabel()` / `firstDisplayLabel()` de
`apps/web/src/lib/display-label.ts`.

Vérification : **`pnpm audit:ui-ids`** (joué aussi par `pnpm test`) — doit passer. Exceptions
justifiées uniquement dans `scripts/audit-ui-ids.allowlist.json` ou via un commentaire
`audit-ui-ids:ignore` quand la valeur n'est réellement jamais affichée.

### 4.4 Backend (NestJS)

- Controller mince : HTTP uniquement, DTO en entrée, formes de réponse explicites.
- Service : logique métier + **validation du scope client avant tout accès Prisma**.
- Prisma seul ORM ; pas de SQL brut sauf nécessité isolée et documentée.
- Audit log sur toute action sensible (qui, quoi, quand, entité, client, avant/après).
- Tests unitaires service + cas d'isolation inter-clients et de refus d'accès.

### 4.5 Frontend (Next.js)

- Aucune logique métier dans l'UI : elle consomme l'API.
- Accès données via les fonctions API / `authenticated-fetch` de la feature.
- **États loading / empty / error explicites** sur chaque écran de données (§5.3).
- L'UI ne remplace jamais l'authz backend (elle masque/désactive seulement).

### 4.6 Ne jamais faire

- Refactorer des zones non demandées.
- Retirer un filtre tenant/client ou contourner un guard.
- Coder en dur une logique spécifique à un client dans du code partagé.
- Introduire une couleur / un espacement en dur au lieu d'un token.
- Afficher un identifiant technique en UI.

---

## 5. Design System Starium (obligatoire)

Sources de vérité, dans l'ordre :
`docs/design-system/README.md` (charte, tokens) → `docs/FRONTEND_UI-UX.md` (patterns + code réel) →
`docs/design-system/MODALES.md` (modales) → `docs/INVENTAIRE-COMPOSANTS.md` (ce qui existe déjà).
Implémentation : `apps/web/src/styles/tokens.css` + `apps/web/src/app/globals.css`.

Détail opérationnel : **skill `starium-design-system`** (invoquée automatiquement sur tout travail UI).

### 5.1 Identité

Esthétique **Apple-inspired** — sobre, premium — réchauffée par une **signature dorée**
(`--brand-gold` `#E8A317`). Fond d'app **jamais blanc pur** : `--neutral-50` `#FAF9F7`. Neutres
« papier » chauds, jamais de gris bleutés. Police **Manrope**. Icônes **Lucide** uniquement.
Langue **française**, sentence case, vouvoiement, **aucun emoji dans l'UI**.

### 5.2 Règles express

- **Couleurs / espacements / rayons / ombres** : tokens uniquement (`bg-background`, `bg-card`,
  `text-muted-foreground`, `border-border`, `--ds-*`, `--brand-*`). **Aucun hex ni px arbitraire**
  dans une feature. Pour changer la charte : modifier `tokens.css` / `globals.css`, pas les chaînes
  Tailwind répétées.
- **Texte secondaire** : `text-muted-foreground` ou `.starium-text-muted` (→ `neutral-900`).
  **Ne pas** utiliser `neutral-500`→`neutral-800` pour du corps de texte.
- **Bordures** : jamais la classe `border` seule (rendu quasi noir) — toujours `border-border`,
  `border-border/60|70`, `border-input`, ou `border-dashed border-border/80`.
- **Pas de cadre dans cadre** : une grille de KPI ne va **jamais** dans une `Card` /
  `.starium-section`. Pattern : `.starium-module` (titre + actions, fond app visible) + N ×
  `KpiCard` / `.starium-kpi-card`.
- **Rayons** : cards `--radius-lg` (14px) · boutons/chips/segmented `--control-radius` (pilule) ·
 inputs `--radius-md` (10px) · badges `--radius-pill` · modales `--radius-xl` (20px).
- **Contrôles interactifs** : charte « pilule » via tokens `--control-*` (`tokens.css`) — CTA
 primaire / état actif = encre (`--control-active-bg`) texte blanc, secondaires blancs bordés
 (`--control-border`). Ne pas restyler un bouton/chip/segmented à la main dans une feature.
- **Tableaux** : bordures **horizontales uniquement**, max 8 colonnes (au-delà → drawer de détail),
  `tabular-nums` sur les numériques, troncature + tooltip.
- **Animations** : fade + translate 4–8px ; jamais de scale 0→1 ; durées `--duration-*`.

### 5.3 Composants imposés (ne rien réinventer)

| Besoin | Composant | Fichier |
|---|---|---|
| Chargement | `LoadingState` / `Skeleton` | `components/feedback/loading-state.tsx`, `ui/skeleton.tsx` |
| Vide | `EmptyState` | `components/feedback/empty-state.tsx` |
| Erreur | `ErrorState` / `Alert` (`variant="destructive"` + icône) | `components/feedback/error-state.tsx`, `ui/alert.tsx` |
| Titre de page | `PageHeader` (carte blanche, `h1` `text-xl sm:text-2xl`) | `components/layout/page-header.tsx` |
| Espacement page | `PageContainer` / `.starium-stack` | `components/layout/page-container.tsx` |
| KPI | `KpiCard` (`variant="default" \| "dense"`) | `components/ui/kpi-card.tsx` |
| Tableau | `Table` (+ `noWrapper` si en-tête sticky), `StariumTableWrap` | `components/ui/table.tsx`, `ui/starium-table-wrap.tsx` |
| Bouton icône | `Button size="icon*"` ou `IconButton` | `components/ui/icon-button.tsx` |
| Lien stylé bouton | `Link` + `buttonVariants` (**jamais** `asChild`, ignoré par Base UI) | `components/ui/button.tsx` |
| Filtres liste | `FilterBar` / `FilterBarField` | `components/layout/filter-bar.tsx` |
| **Modale** | **`StariumModal`** | `components/layout/form-dialog-shell.tsx` |

Avant de créer un composant : vérifier `docs/INVENTAIRE-COMPOSANTS.md`.

### 5.4 Classes structurelles `.starium-*`

`.starium-module` (groupe de page, **sans cadre**) · `.starium-kpi-card` · `.starium-section` (bloc
cartonné unique) · `.starium-panel` (panneau données) · `.starium-stack` · `.starium-filter-bar` /
`.starium-filter-chip` · `.starium-tab-group` / `.starium-tab-btn` · `.starium-projects-table` ·
`.starium-table-footer` · `.starium-overline` · `.starium-text-muted` · `.starium-form-*` (champs de
modale) · `.starium-modal-seg-title`.

### 5.5 Modales — norme stricte

Toute modale passe par **`StariumModal`**. **Interdit** d'importer `Dialog*` depuis
`@/components/ui/dialog` dans une feature (socle uniquement). Panneau **centré tous viewports**,
`bg-card`, pas de glass/blur, header = icône Lucide or + titre + sous-titre + **croix en haut à
droite** (`aria-label="Fermer"`), pied = **Annuler** (`outline`) + action primaire à droite.
`layout="legacy"` (bottom-sheet) interdit sur du neuf. Vérification : `pnpm audit:modals`.
Détail : `docs/design-system/MODALES.md` et la skill `starium-modales`.

---

## 6. Workflow attendu

1. Lire la RFC / spec / doc module concernée (`docs/RFC/`, `docs/modules/`) — et
   `docs/ARCHITECTURE.md` pour toute question de structure, multi-client ou nouveau module.
2. Lire uniquement les fichiers nécessaires.
3. Planifier pour un changement moyen ou large.
4. Implémenter **un changement borné à la fois**.
5. Créer / mettre à jour les tests.
6. `pnpm typecheck` + tests du workspace touché (+ `pnpm audit:modals` si modale, `pnpm audit:ui-ids`
 si UI).
7. Relire le diff.
8. Mettre à jour la doc si le comportement documenté change (skill `starium-documentation`).

### Definition of Done

- [ ] Compile (`typecheck`) et tests passent
- [ ] Isolation client + permissions enforcées ; DTO validés
- [ ] RGPD : DCP minimisées, rétention/effacement prévus, rien en clair dans les logs
- [ ] RGAA : clavier, labels, contrastes AA, focus visible, dynamique annoncé
- [ ] Design System : composants/tokens existants, aucune valeur en dur, loading/empty/error
- [ ] Mobile : validé dès 320px, cibles ≥ 44px, tableaux exploitables
- [ ] Libellés métier partout, aucun ID technique visible (`pnpm audit:ui-ids` vert)
- [ ] Aucun fichier hors périmètre modifié

---

## 7. Carte de la documentation

| Sujet | Fichier |
|---|---|
| Architecture technique, multi-client, guards, données | `docs/ARCHITECTURE.md` |
| Vision produit | `docs/VISION_PRODUIT.md` |
| API (routes, contrats) | `docs/API.md` |
| Frontend — routing, features, query keys | `docs/FRONTEND_ARCHITECTURE.md` |
| Frontend — patterns UI/UX + extraits de code | `docs/FRONTEND_UI-UX.md` |
| Charte DS (tokens, couleurs, typo, composants) | `docs/design-system/README.md`, `tokens.css` |
| Norme modales | `docs/design-system/MODALES.md` |
| Composants existants | `docs/INVENTAIRE-COMPOSANTS.md` |
| Modèle d'accès / rôles | `docs/ACCESS-MODEL.md`, `docs/default-profiles.md` |
| RFC (une par feature) + index | `docs/RFC/`, `docs/RFC/_RFC Liste.md` |
| Specs modules | `docs/modules/` |
| Exploitation | `docs/runbooks/`, `docs/security/` |
| Manuels utilisateur | `docs/MANUEL-*.md` |

---

## 8. Outillage Claude Code de ce repo

**Skills** (`.claude/skills/`) — invoquées automatiquement selon le contexte :

| Skill | Quand |
|---|---|
| `starium-design-system` | Tout travail UI dans `apps/web` |
| `starium-modales` | Création / refonte de modale ou dialog |
| `starium-conformite` | Revue avant commit / PR, contrôle multi-client & sécurité |
| `starium-release-gate` | Passage préprod/prod — checklist go/no-go (lint, build, env, Prisma, smoke) |
| `starium-rfc` | Rédaction ou implémentation d'une RFC |
| `starium-documentation` | Mise à jour / synchronisation de `docs/` |

**Commandes** (`.claude/commands/`) : `/rfc`, `/conformite`, `/audit-ui`, `/doc-sync`, `/nouveau-module`.

**Agent** (`.claude/agents/`) : `starium-ui-reviewer` — revue DS + RGAA + mobile d'un diff frontend.
