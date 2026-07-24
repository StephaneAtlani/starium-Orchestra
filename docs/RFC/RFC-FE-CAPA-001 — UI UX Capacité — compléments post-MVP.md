# RFC-FE-CAPA-001 — UI/UX Capacité — page unique & compléments post-MVP

**Statut :** 🟡 En cours (IA page unique livrée ; polish lots restants)  
**Priorité :** Haute  
**Module :** Capacity (frontend) — **une seule route** `/teams/capacity` + encarts métier  
**Dépendances :**
- [RFC-CAPA-001](./RFC-CAPA-001%20%E2%80%94%20Gestion%20de%20la%20capacit%C3%A9%20des%20%C3%A9quipes%20et%20des%20collaborateurs) (socle API / Prisma / perms)
- [RFC-FE-TEAM-001](./RFC-FE-TEAM-001%20%E2%80%94%20Frontend%20Foundation%20%E2%80%94%20%C3%89quipes.md)
- [docs/FRONTEND_UI-UX.md](../FRONTEND_UI-UX.md) + [RFC-014-1](./RFC-014-1%20%E2%80%94%20UX-UI%20et%20Design%20System%20de%20l%E2%80%99application.md)

**Hors scope :** charge réelle TEAM-012+, Orion, ACL AccessDecision RISK/PLAN.

## Cible UX (simplicité)

Parcours manager en 3 gestes :

1. **Réglages** — (a) initialiser le calendrier J/H de l’année en 1 clic ; (b) rattacher chaque personne à **une** équipe. Exceptions mensuelles **repliées** (optionnel).
2. **Affectations** — poser de la charge sur équipe ou personne.
3. **Pilotage** — lire dispo / surcharge du mois.

Pas de 4 menus. Pas de matrices visibles par défaut. Vocabulaire métier (« équipe de capacité ») plutôt que jargon technique.

---

# 0. Décision UX — une seule page (non négociable)

## Problème

Le MVP exposait **4 entrées de menu** (paramètres / membres / affectations / pilotage). Parcours fragmenté, non user-friendly pour un manager / CODIR.

## Cible

| Avant | Après |
|-------|--------|
| 4 routes + 4 liens nav | **1 route** `/teams/capacity` + **1 lien** « Capacité » |
| Navigation mentale multi-écrans | `WorkspaceTabBar` : **Pilotage** \| **Affectations** \| **Réglages** |
| Réglages éclatés | Onglet Réglages = calendrier client **+** collaborateurs (exceptions / WorkTeam primaire) |

Deep-link : `?tab=pilotage|affectations|reglages`.  
Anciennes URLs → **redirect** vers la page unique (compat favoris).

Composant : `CapacityWorkspace` (`apps/web/src/features/capacity/components/capacity-workspace.tsx`).

---

# 1. Analyse de l’existant

## 1.1 Backend

Module `apps/api/src/modules/capacity/` livré (CAPA-001).

## 1.2 Frontend (après refonte IA)

| Zone | État |
|------|------|
| Route canonique | `/teams/capacity` |
| Onglets | Pilotage / Affectations / Réglages (`WorkspaceTabBar`) |
| Redirects | `/settings`, `/members`, `/allocations`, `/dashboard` → `?tab=…` |
| Nav | Une entrée « Capacité » |
| Contrat FE | Types nested `workTeam` / `resource` ; J/H string ; route Sources sur encart |
| Fiche projet | `EntityCapacityPanel` (lien vers `?tab=affectations`) |

## 1.3 Écarts restants

| ID | Écart | Lot |
|----|-------|-----|
| E6b | Dashboard KPI basiques (pas encore KpiCard DS) | C polish |
| E7 | Encarts risque / plan d’actions | D |
| E5b | Tables encore HTML (pas DataTable) | B polish |
| E8 | Couverture toasts partielle | A/B |

---

# 2. Hypothèses

1. Alignement FE sur contrat API documenté (pas d’aplatissement backend).
2. Permissions miroir backend ; UI ne contourne pas l’authz.
3. Patterns : `PageContainer` + `WorkspaceTabBar` (comme vision stratégique / workspace projet).
4. Pas de nouveau modèle Prisma.

---

# 3. Objectifs produit

* **Une** surface Capacité pour le client actif.
* Libellés métier partout ; écritures J/H fiables.
* Pilotage lisible (mois + KPI + mobile cartes).
* Encarts métier projet → puis risque / plan.

---

# 4. Lots

## Lot A — Contrat & écritures — ✅ partiel (livré avec la page unique)

* Types nested + helpers `allocationTargetLabel` / `toDaysString`.
* Create/put en string.
* Encart → `listAllocationsBySource`.
* Toasts sur mutations principales.

Reste : revue exhaustive de tous les paths d’erreur.

## Lot B — Fondations UX — ✅ partiel

* `PageContainer` + page unique + redirects + nav 1 lien — **fait**.
* Select WorkTeam DS — **fait** sur affectations / membres.
* DataTable / polish densité — **reste**.

## Lot C — Dashboard — ✅ partiel

* Sélecteur de mois + KPI strip + cartes mobile — **fait**.
* Alignement `KpiCard` inventaire / forecast-committed badges — **reste**.

## Lot D — Encarts risque & plan — ❌ à faire

## Lot E — Tests / doc statut — 🟡

* Test nav capacité — ajouté.
* Tests helpers mapping — à compléter.

---

# 5. Fichiers

## Créés / modifiés (IA page unique)

* `apps/web/src/app/(protected)/teams/capacity/page.tsx`
* `apps/web/src/features/capacity/components/capacity-workspace.tsx`
* `capacity-dashboard-panel.tsx`, `capacity-allocations-panel.tsx`, `capacity-settings-panel.tsx`, `capacity-members-panel.tsx`
* Redirects sous `capacity/{settings,members,allocations,dashboard}/page.tsx`
* `navigation-menu-body.tsx`, `equipes-nav-helpers.ts`
* `types/capacity.types.ts`, `api/capacity.api.ts`, `lib/allocation-display.ts`, `entity-capacity-panel.tsx`

## Doc

* Ce fichier ; CAPA-001 §0 ; `_RFC Liste` ; plan Équipes.

---

# 6. Prisma

Aucune.

---

# 7. Tests

* Nav : `equipes-nav-helpers.spec.ts` (capacité).
* À ajouter : unit `allocation-display`, smoke tabs.

---

# 8. Récapitulatif

| Lot | Statut |
|-----|--------|
| IA 1 page + redirects + nav | ✅ |
| A contrat FE | ✅ partiel |
| B DS polish | 🟡 |
| C dashboard | 🟡 |
| D encarts risque/plan | ❌ |
| E tests | 🟡 |

---

# 9. Vigilance

* Ne pas réintroduire 4 liens menu.
* Preférer `?tab=` pour deep-links (encarts métier, docs).
* Seed module `capacity` toujours requis sur envs existants.

---

# 10. Conformité by design

## RGPD
Minimisation libellés ; scope client actif ; pas de DCP dans toasts.

## RGAA
`WorkspaceTabBar` clavier + select mobile ; labels ; `aria-live` sur listes / KPI ; focus visible.

## Design System
`PageContainer`, `PageHeader`, `WorkspaceTabBar`, `Select`, `Switch`, feedback states ; **valeur pas ID**.

## Sécurité
Permissions UI = masquage ; route Sources pour encarts.

## Mobile
Tab bar mobile (select) ; dashboard cartes `< md` ; cibles ≥ 44px.

---

# 11. DoD

- [x] Une seule entrée nav Capacité
- [x] Page `/teams/capacity` avec 3 onglets
- [x] Redirects anciennes URLs
- [x] Libellés allocations via nested API
- [x] J/H string sur create/put
- [ ] Encarts risque + plan
- [ ] Polish DataTable / KpiCard inventaire
- [ ] CAPA-001 §0 + listes à jour (cette itération)
