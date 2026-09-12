# RFC-PROJ-023 — Équipes projet (groupes de pilotage convocables)

| | |
| --- | --- |
| **Statut** | 📝 Draft — **source produit active** pour l’onglet Équipes + convocation |
| **Date** | 2026-09-12 |
| **Parents** | RFC-PROJ-012 (fiche / roster / RASCI) ; RFC-PROJ-013-2 / **013-10** (points projet) |
| **Source produit** | **CDC** (= *cahier des charges*) HTML [*Équipes projet*](./_sources/Design%20system%20et%20CDC/Equipes%20projet%20-%20Cahier%20des%20charges.html) (règles métier + recette) |
| **Source visuelle** | Maquettes Design System (sept. 2026) — **prioritaires pour le rendu UI** : [`docs/design-system/maquettes/equipes-projet/`](../design-system/maquettes/equipes-projet/) |
| **Règle UX** | **Fidélité visuelle = maquettes DS**. Comportements / messages / recette R01–R03 = CDC HTML, sauf divergences tranchées §6.0. Modales via `StariumModal`. |
| **Glossaire** | **CDC** = cahier des charges. **Équipe** (cette RFC) = groupe de pilotage convocable. **Roster** = membres / rôles fiche. **RASCI** = matrice R/A/S/C/I de la fiche (à adapter, §5.4). |

---

## 0. Objet

Les **instances de pilotage** d’un projet (COPIL, COPROJ, COTECH, groupes de travail) sont décrites **une fois au niveau projet**, puis **consommées** partout où l’on a besoin de personnes : préparation d’un point, convocation, émargement, diffusion du CR.

Cette RFC spécifie :

1. l’**onglet Équipes** du workspace projet (maquette 01) ;
2. l’**éditeur d’équipes** — modale liste / détail (maquettes 02–03) ;
3. la **convocation d’une équipe** depuis la préparation d’un point projet (CDC écran 03 — pas encore dans le lot de captures DS fourni).

**Hors confusion de vocabulaire** : « Équipe » ici ≠ `WorkTeam` / capacité (RFC-TEAM-*).  
Le **roster** fiche (`ProjectTeamMember`) et la **matrice RASCI** restent sur la fiche, mais **doivent être adaptés** pour rester cohérents avec les équipes convocables et le pilote (voir §5.4) — ce n’est plus un silo indépendant.

---

## 1. Analyse de l’existant

### 1.1 Ce que le CDC / DS appellent « équipe »

| Concept | Définition |
| --- | --- |
| Équipe | Groupe **nommé** de personnes (couleur + libellé), **sans droits d’accès** |
| Convoquer | **Copie** des membres vers les participants du point (pas de lien vivant) |
| Annuaire projet | Personnes du projet (comptes + ajouts manuels), partagé entre équipes |
| Pilote (DS) | Affiché sur la carte équipe — **écart vs annexe CDC** (voir §6.0 / H9) |

### 1.2 Socle déjà en place

| Couche | État | Écart vs CDC |
| --- | --- | --- |
| `ProjectTeamMember` + rôles + RASCI | ✅ Fiche projet | Autre objet métier (droits / gouvernance fiche) |
| `ProjectGovernanceCircle` + `ProjectTeamGovernanceMembership` | ✅ API + UI matrice | Cercle = nom + memberships via `identityKey` ; **pas** de `label` / `color` / ordre membres / onglet dédié / compteur points / éditeur CDC |
| `ProjectReviewParticipant` | ✅ | Pas d’origine « convoqué depuis équipe X » ; pas d’action « convoquer équipe » CDC |
| Onglet workspace « Équipes » | ❌ | Absents de `project-workspace-tabs` (équipe = bloc fiche) |
| Clés `starium.teams.v1` / `starium.dir.v1` du CDC | Prototype localStorage | **Interdit en prod** — API + Prisma + scope client |

### 1.3 Décision d’architecture (recommandée)

**Évolution** de `ProjectGovernanceCircle` vers le modèle CDC (champs + membres ordonnés + API CRUD + UI), plutôt qu’un troisième modèle parallèle.

| Option | Verdict |
| --- | --- |
| A — Enrichir `ProjectGovernanceCircle` | **Retenue** : même sémantique COPIL/COPROJ ; migration additive |
| B — Nouveau `ProjectPilotTeam` | Doublon sémantique avec cercles déjà seedés |
| C — Réutiliser seulement `ProjectTeamMember` | Contredit le CDC (« pas de rôles dans l’équipe ») |

Renommage API UX : libellés UI = **« Équipe »** ; code / Prisma peut conserver `GovernanceCircle` en V1 (alias documenté) ou introduire un rename Prisma dans un lot ultérieur.

---

## 2. Hypothèses

1. **H1 — Persistance API** : le localStorage du CDC est une maquette ; V1 = endpoints client-scopés + audit.
2. **H2 — Identité membre** : `userId` (compte client) **ou** personne libre projet (`identityKey` `n:…` / entrée annuaire), aligné roster actuel.
3. **H3 — Couleur** : 6 jetons Design System (tokens), jamais hex libre en feature.
4. **H4 — Seed projet neuf** : 3 équipes `COPROJ`, `COPIL`, `COTECH` (ordinaires, renommables / supprimables) ; `systemKind` optionnel pour COPIL/COPROJ existants ; COTECH sans `systemKind` ou nouveau kind.
5. **H5 — Trace de convocation** : table de liaison `ProjectReviewTeamConvocation` (`reviewId`, `teamId`, `convenedAt`) pour le **compteur de points** ; suppression d’équipe → `ON DELETE SET NULL` ou soft-keep du compteur via snapshot `teamName` — **pas** de cascade participants.
6. **H6 — Permissions** : `projects.read` / `projects.update` (comme roster) ; pas de permission dédiée V1.
7. **H7 — Animateur de point** : reste un attribut du **point**, distinct du **pilote d’équipe** (H9).
8. **H8 — Suppression COPIL/COPROJ seed** : CDC = ordinaires / supprimables ; modèle actuel cercles système — à trancher avant P0.
9. **H9 — Pilote d’équipe (DS)** : les cartes maquette affichent `Pilote : {Nom}`. **V1 DS** : un membre optionnel désigné `pilotIdentityKey` (libellé uniquement, **aucun droit**). Contredit l’annexe CDC « pas de rôles » — **maquette DS gagne** pour l’affichage.
10. **H10 — RASCI R1** : colonnes = **personnes** (`identityKey`), plus `roleId` comme axe principal. Migration depuis les cellules actuelles. Confirmé produit.
---

## 3. Fichiers à créer / modifier (implémentation)

### Backend

| Fichier | Action |
| --- | --- |
| `apps/api/prisma/schema.prisma` | Enrichir `ProjectGovernanceCircle` (`label`, `colorToken`, …) ; membres ordonnés ; `ProjectReviewTeamConvocation` |
| Migration Prisma | Additive, client-scoped indexes |
| `project-governance-circles.service.ts` / controller | CRUD complet + seed défauts + unicité nom case-insensitive |
| `project-reviews.service.ts` | `POST …/participants/convene-team` (fusion sans doublon) |
| DTOs + tests isolation client | Obligatoires |

### Frontend

| Fichier | Action |
| --- | --- |
| `project-workspace-tabs.tsx` + route onglet | Onglet **Équipes** |
| `features/projects/components/project-teams-*` | Grille onglet (01) ; modale liste/détail `StariumModal` (02) |
| Préparation point (013-10 écran 03) | Carte Participants + sélecteur « Convoquer une équipe » (03) |
| Query keys / API client | `clientId` dans les keys |

### Doc

| Fichier | Action |
| --- | --- |
| `docs/API.md` | Routes équipes + convene |
| `docs/LIAISONS-MODULES.md` | Pont Équipes → Points projet |
| `docs/RFC/_RFC Liste.md` | Entrée 14d¹¹ |

---

## 4. Modèle de données

### 4.1 Équipe (évolution cercle)

| Champ CDC | Proposition Prisma | Règle |
| --- | --- | --- |
| `id` | `cuid()` | Technique, jamais affiché |
| `name` | `VarChar(24)` | 2–24 car. ; **unique par projet**, case-insensitive |
| `label` | `VarChar(200)?` | Intitulé long sous le nom |
| `color` | `colorToken` enum / string contrôlée | 6 jetons DS ; défaut auto à la création |
| `members` | relation ordonnée | Liste d’identités ; vide autorisé ; **ordre d’ajout** = ordre avatars / émargement |
| — | `clientId`, `projectId` | Isolation multi-client |
| — | `systemKind?` | COPIL / COPROJ historiques ; non bloquant pour rename/delete CDC (« ordinaires ») — **trancher** : CDC dit supprimables ; aujourd’hui cercles système non supprimables → **H8** : en V1 CDC, supprimer autorisé même systemKind **ou** soft-hide |

**Membres** (proposition) : table `ProjectGovernanceCircleMember` :

- `circleId`, `clientId`, `projectId`
- `userId?` / `displayName?` / `identityKey`
- `sortOrder` (ordre d’ajout)
- unique `(circleId, identityKey)`

Alternative courte V1 : conserver `ProjectTeamGovernanceMembership` + ajouter `sortOrder` (et exiger que toute identité membre soit aussi dans l’annuaire projet).

### 4.2 Annuaire projet

Réutiliser les personnes déjà connues du projet :

- utilisateurs assignables (`assignable-users`) ;
- free labels / `identityKey` `n:…` déjà utilisés par le roster ;
- **ajout manuel** dans l’éditeur : crée une identité projet (même pipeline que free person roster), **sans** créer de compte plateforme ; dédoublonnage par nom normalisé.

Pas d’import AD / Entra en V1 (CDC hors périmètre).

### 4.3 Trace convocation

```text
ProjectReviewTeamConvocation
  id, clientId, projectReviewId, teamId?, teamNameSnapshot, convenedAt
```

- Compteur carte = `COUNT(DISTINCT projectReviewId)` où `teamId = …` **ou** `teamNameSnapshot` si équipe supprimée.
- Supprimer équipe : participants **inchangés** ; convocations conservées avec snapshot nom.

### 4.4 Seed projet neuf

À la création projet (ou premier GET équipes si vide) :

| Nom | Label suggéré |
| --- | --- |
| COPROJ | Comité projet — pilotage hebdomadaire |
| COPIL | Comité de pilotage — mensuel |
| COTECH | Architecture & SSI |

Membres initiaux : vides **ou** préremplis depuis templates de point s’ils existent — **ne plus rejouer** dès qu’une équipe a été modifiée.

### 4.5 Pilote d’équipe (H9)

Sur l’équipe : `pilotIdentityKey` (ou `pilotUserId`) optionnel — **un** membre de la liste, libellé carte `Pilote : {displayLabel}`.  
Aucun droit ACL. Distinct de l’animateur d’un point projet.

---

## 5. API (contrats)

Toutes les routes : auth JWT + RBAC + `clientId` dérivé du scope (jamais du body brut).

### 5.1 Équipes

| Méthode | Route | Perm | Rôle |
| --- | --- | --- | --- |
| `GET` | `/api/projects/:projectId/teams` | `projects.read` | Liste + `memberCount` + `reviewConvocationCount` (calculé) |
| `POST` | `/api/projects/:projectId/teams` | `projects.update` | Création |
| `PATCH` | `/api/projects/:projectId/teams/:teamId` | `projects.update` | Nom, label, couleur, membres ordonnés |
| `DELETE` | `/api/projects/:projectId/teams/:teamId` | `projects.update` | Suppression sans cascade participants |

Alias acceptable V1 : conserver `/governance-circles` et exposer `/teams` comme façade.

**Validations** :

- nom 2–24, unique CI ;
- équipe vide OK ;
- membres = IDs / identityKeys du client + projet.

### 5.2 Convoquer

| Méthode | Route | Perm | Rôle |
| --- | --- | --- | --- |
| `POST` | `/api/projects/:projectId/reviews/:reviewId/participants/convene-team` | `projects.update` | Body `{ teamId }` — ajoute membres absents en fin de liste ; enregistre `ProjectReviewTeamConvocation` |

Règles :

- refuse si équipe vide (422) ;
- pas de doublon participant (`userId` / `identityKey`) ;
- ne retire jamais personne ;
- ne réécrit pas les points déjà convoqués lors d’un PATCH équipe.

### 5.3 Audit

Actions sensibles : create / update / delete team ; convene-team ; mutations RASCI liées.  
Logs : **pas** d’email / nom complet en clair si évitable — ids + `teamName` + counts.

### 5.4 Adaptation RASCI (dans le périmètre de cette RFC)

**État actuel (RFC-PROJ-012)** : matrice **actions × rôles catalogue** (`ProjectRaciCell.roleId` → `ProjectTeamRole`). Les colonnes = Sponsor / Responsable / rôles custom — **pas** les personnes, **pas** les équipes convocables. Les cercles COPIL/COPROJ ne sont qu’un tag membership sur le roster.

**Problème** : avec l’onglet Équipes + pilote DS, le chef de projet compose des **instances nominatives**. Une RASCI qui ignore ces instances et ne parle qu’en rôles abstraits devient **illisible** et déconnectée du terrain (qui est A du COPIL ? le rôle « Sponsor » ou Marc Dubois, pilote COPIL ?).

**Cible produit** : une seule vérité gouvernance fiche —

| Couche | Rôle |
| --- | --- |
| Onglet **Équipes** | Qui siège où (+ pilote) ; source pour convoquer |
| Roster **fiche** | Qui porte les rôles formels projet (Sponsor, Responsable…) |
| **RASCI** | Qui (personne) porte R/A/S/C/I sur quelles **actions** — alimentée / alignée avec roster **et** pilotes d’équipes |

#### Décision technique proposée (à figer en P0bis)

| Option | Description | Verdict |
| --- | --- | --- |
| **R1** | Colonnes RASCI = **personnes** (`identityKey`) au lieu de `roleId` | **Retenue** — alignée DS (noms + fonctions) ; 1 A / action inchangé |
| R2 | Garder colonnes = rôles ; sync auto rôle ← pilote | Fragile (1 pilote ≠ 1 rôle catalogue) |
| R3 | Colonnes = équipes (COPIL…) | Anti-pattern RASCI classique (lettre sur un comité entier) |

**Migration R1** :

1. Nouveau modèle (ou évolution) : `ProjectRaciCell` porte `identityKey` (+ `userId?`) ; `roleId` devient optionnel / legacy.
2. Script de migration : pour chaque cellule `(action, role)`, éclater vers les **membres** de ce rôle sur le roster (si 0 membre → cellule orpheline droppée ou warning admin).
3. UI `ProjectRaciMatrix` : colonnes = personnes de l’annuaire projet (roster ∪ membres d’équipes), libellés métier — **jamais** d’id.
4. **Pont pilote** : à la désignation / changement de pilote d’équipe, suggestion UI (non forcée) « Poser A / R sur les actions liées à {équipe} » — pas de réécriture silencieuse des points / cellules sans confirmation.
5. Cercles / memberships roster : l’appartenance à une équipe convocable **n’écrit pas** automatiquement une lettre RASCI (convoquer ≠ accountable).

**API** : `PATCH …/team-raci` évolue (DTO personnes) ; compat lecture temporaire si cellules legacy `roleId` encore présentes.

**Tests** : 1 A max / action (personnes) ; isolation client ; migration idempotente ; UI `audit:ui-ids`.

---

## 6. Spécification UX

### 6.0 Hiérarchie des sources + divergences CDC HTML ↔ Design System

| Sujet | CDC HTML | Maquette DS | Décision V1 |
| --- | --- | --- | --- |
| Création depuis l’onglet | Carte pointillée seule | **+ Créer une équipe** (header) **et** carte pointillée | **Les deux** (DS) |
| Éditeur | Modale **une** équipe | Modale **liste gauche / détail droite** (toutes les équipes) | **DS** |
| Membres UI | Jetons cochables annuaire | Chips sélectionnés + suggestions grisées + champ « Ajouter une personne… » | **DS** |
| Pied modale | Supprimer en texte | Bouton outline « Supprimer l’équipe » + Annuler + Enregistrer | **DS** (toujours `StariumModal`) |
| Pilote sur carte | Hors périmètre | Affiché (`Pilote : …`) | **DS** (H9 — libellé, pas ACL) |
| Fonction / titre sous le nom | Non | Oui (ex. « Directeur de projet ») | **DS** si dispo API (`jobTitle` / display métier) |
| Convocation préparation | Spécifiée (écran 03) | Pas dans ce lot de captures | **CDC** inchangé |

Maquettes versionnées sous [`docs/design-system/maquettes/equipes-projet/`](../design-system/maquettes/equipes-projet/) :

| Fichier | Contenu |
| --- | --- |
| `01-onglet-equipes.png` | Onglet grille + CTA Créer |
| `02-editeur-nouvelle-equipe.png` | Modale liste/détail — création |
| `03-editeur-coproj.png` | Modale liste/détail — édition COPROJ |
### 01 — Onglet « Équipes » (maquette 01)

- **Route** : onglet workspace `Équipes` (icône users, pastille or active)
- **Header** : `Équipes du projet` + phrase d’aide CDC/DS + CTA **`+ Créer une équipe`**
- **Grille** : cartes `starium` (fond card, ombre légère, **liseré couleur** à gauche)
- **Carte** : nom · libellé · pile avatars (initiales) · `N membres | M points projet | Pilote : {libellé}` · empty points = `Aucun point rattaché`
- **Carte dashed** : `+ Nouvelle équipe` + sous-texte d’exemples
- Clic carte / CTA / dashed → ouvre modale éditeur (02) sur l’équipe ou en création
- Pas de delete sur la grille
- Recette CDC **R01.*** adaptée (CTA header autorisé)

### 02 — Éditeur d’équipes — modale liste / détail (maquettes 02–03)

Pattern : **`StariumModal` large** (pas une modale mono-équipe).

**Gauche — liste**

- Lignes : pastille couleur · nom · `N membres · {libellé}`
- Sélection visuelle (fond encre / contraste)
- Bouton dashed `+ Nouvelle équipe` en bas de liste

**Droite — détail**

1. Nom de l’équipe (obligatoire)
2. Libellé (placeholder type « Comité de pilotage »)
3. Couleur — **6 jetons** ; sélection = anneau (pas teinte seule)
4. Membres — chips actifs (avatar + nom + fonction) ; suggestions grisées cliquables ; champ `Ajouter une personne…` + bouton or **Ajouter**
5. Phrase d’aide : équipe proposée à la préparation des points (un clic convoque tous)

**Pied**

- Gauche : `Supprimer l’équipe` (outline ; absent ou disabled en création pure non enregistrée)
- Droite : `Annuler` · `Enregistrer` (primaire encre)

Comportements CDC conservés : unicité nom CI ; vide OK ; abandon sans write ; delete avec confirmation + points non modifiés. Recette **R02.***

### 03 — Convoquer (préparation point)

Inchangé vs CDC HTML (écran Participants) — **à maquetter DS** si besoin ; contrat métier R03.* reste la référence.
---

## 7. Plan d’implémentation

| Lot | Contenu | DoD |
| --- | --- | --- |
| **P0** | Schéma équipes + pilote + migration + CRUD + tests isolation | API équipes verte |
| **P0bis** | Schéma RASCI personnes (R1) + migration cellules rôles → personnes + tests | API RASCI verte ; 1 A / action |
| **P1** | Onglet 01 + éditeur liste/détail 02 (`StariumModal`) | R01.* R02.* ; maquettes DS |
| **P2** | `convene-team` + UI préparation 03 | R03.* ; pont 013-10 |
| **P3** | Seed 3 équipes ; compteur points ; toasts ; pont UI pilote → suggestion RASCI | Recette + H9 |
| **P4** | UI matrice RASCI adaptée (colonnes personnes) + doc API / LIAISONS / fiche | `audit:ui-ids` ; index RFC |

Ordre : **P0 → P0bis** (données) puis **P1 → P2 → P3 → P4** (UX). L’éditeur équipes est aussi appelé depuis la préparation (03).
---

## 8. Tests

### Backend

- Unicité nom CI ; vide OK ; delete sans toucher participants
- `convene-team` : fusion, anti-doublon, refus équipe vide, isolation client
- Compteur convocations distinctes (série 12× = 12)
- RASCI R1 : 1 A / action sur `identityKey` ; migration depuis `roleId` ; isolation client

### Frontend

- Grille empty / nominal ; pilote affiché
- Modale liste/détail + validations + abandon sans write
- Sélecteur + Compléter + Gérer
- Matrice RASCI : colonnes personnes, libellés métier, pas d’id brut

### Critères de recette CDC (annexe)

Couvrir **R01.1–5**, **R02.1–7**, **R03.1–6** (18 critères) + checklist RASCI (1 A, migration, affichage).

---

## 9. Hors périmètre (V1)

- Rôles riches dans l’équipe au-delà du **pilote** (membre / observateur / quorum)
- Droits / ACL dérivés de l’appartenance ou du pilote
- Validation de composition d’équipe
- Équipes partagées multi-projets
- Import annuaire entreprise
- Lien permanent équipe ↔ modèle de point
- Historique des compositions / archivage
- Propagation rétroactive vers points déjà convoqués
- Écriture **automatique silencieuse** des cellules RASCI au changement de pilote (suggestion UI seulement)

**V2 candidate** : rôles additionnels (signature CR / relances) ; templates RASCI par type d’équipe.---

## 10. Récapitulatif

| | |
| --- | --- |
| Produit | Source de vérité **projet** pour groupes convocables ; RASCI recentrée sur les **personnes** |
| Technique | Enrichir cercles + API teams + convene ; RASCI R1 (`identityKey`) ; UI onglet + modale DS + matrice |
| Statut | Draft — à implémenter |
---

## 11. Points de vigilance

1. **Vocabulaire** : CDC = cahier des charges ; « Équipe projet » ≠ WorkTeam ≠ roster formel.
2. **Cercles système** vs suppression CDC — trancher H8 avant P0.
3. **Pilote (H9)** : libellé sans ACL ; ≠ animateur de point ; suggestion RASCI seulement.
4. **RASCI R1** : migration `roleId` → personnes — risque de perte de cellules sans membre de rôle ; prévoir rapport / dry-run.
5. **Doublon UI** : onglet Équipes = source UX instances ; fiche garde roster + RASCI adaptée.
6. **013-10** : Préparer / Participants consomme les équipes (pas de liste hardcodée).
7. **RGPD** : free persons (nom, email dérivé, fonction) = DCP scopées client.
8. **Prototype localStorage** : jamais `starium.teams.v1` en prod.
9. **Modale large liste/détail** : `StariumModal` + DS ; pas de `Dialog*` feature.---

## 12. Conformité by design

### RGPD

- **DCP** : nom affiché, email (compte ou dérivé), appartenance équipes / participants.
- **Finalité** : organisation des instances de pilotage et convocation aux points projet.
- **Minimisation** : pas d’ACL / historique composition en V1 ; pilote = désignation affichée seulement.
- **Droits** : effacement via retrait membre / suppression équipe / suppression projet ; participants de points déjà convoqués conservés pour traçabilité réunion (base légale intérêt légitime / obligation pilotage) — anonymiser displayName si demande d’effacement personne.
- **Logs** : pas d’email en clair ; ids + libellés équipe.
- **Scope** : tout filtré `clientId` + `projectId` autorisé.

### RGAA

- Onglet dans la nav projet (un `h1` page) ; cartes en `article` / boutons natifs.
- Modale : focus trap `StariumModal`, Échap = abandon, labels sur Nom / Libellé / Couleur.
- Jetons membres : `aria-pressed` ; messages toast / `aria-live="polite"`.
- Contraste AA ; info pas seulement par la couleur (nom + coche).

### Design System

- Tokens couleur équipe (6 jetons) ; `StariumModal` ; `EmptyState` / loading skeleton grille ; libellés métier (**jamais** d’id technique en UI) via `displayLabel`.
- Pied modale : Annuler + Enregistrer ; supprimer en texte (norme CDC + MODALES.md).

### Sécurité

- Authz `projects.*` ; isolation client ; DTO class-validator ; audit create/update/delete/convene ; whitelist champs réponse.

### Interface mobile

- Grille 1 col &lt; `sm`, 2 `sm`, 3 `md+` ; cibles ≥ 44px ; modale centrée (pas `layout="legacy"`) ; liste participants scrollable sur petit écran.

---

## 13. Références

- Source : [`docs/RFC/_sources/Design system et CDC/Equipes projet - Cahier des charges.html`](./_sources/Design%20system%20et%20CDC/Equipes%20projet%20-%20Cahier%20des%20charges.html)
- Points projet parcours : [RFC-PROJ-013-10](./RFC-PROJ-013-10%20—%20CDC%20parcours%208%20écrans%20Points%20projet%20(fidélité%20visuelle).md)
- Fiche / roster : [RFC-PROJ-012](./RFC-PROJ-012%20—%20Project%20Sheet.md)
- Architecture multi-client : `docs/ARCHITECTURE.md`
- UX : `docs/FRONTEND_UI-UX.md`, `docs/design-system/MODALES.md`
