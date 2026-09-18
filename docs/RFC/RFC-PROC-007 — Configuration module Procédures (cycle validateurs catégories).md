# RFC-PROC-007 — Configuration module Procédures (cycle, validateurs, catégories)

Version : 0.1 — 18 septembre 2026

| Métadonnée | Valeur |
| --- | --- |
| **Statut** | 🟡 F1–F2 ✅ · F3 pending |
| **Priorité** | Haute (gouvernance publication) |
| **Parent** | [RFC-PROC-001](./RFC-PROC-001%20—%20Module%20Procédures%20(cadrage%20et%20backlog%20user%20stories).md) |
| **S’appuie sur** | [RFC-PROC-006](./RFC-PROC-006%20—%20CDC%20Procédures%20fidélité%20mock%20design%20handoff.md) (cycle `DRAFT` → `IN_REVIEW` → `PUBLISHED`) · [RFC-PROC-002](./RFC-PROC-002%20—%20Créer%20éditer%20archiver%20procédures%20et%20contenu%20riche.md) |
| **Pattern UI** | Hub config client comme `/budgets/configuration` (cartes → sous-écrans) |

---

## 1. Analyse de l’existant

| Élément | Constat |
| --- | --- |
| Nav | Entrée plate `Procédures` → `/procedures` (`navigation.ts`) — **pas** d’enfant Configuration |
| Cycle publish | Fixé PROC-006 : `DRAFT` → `IN_REVIEW` → `PUBLISHED` ; libellé bouton « Publier » en 2 étapes |
| Catégories | Enum Prisma figé `PILOTAGE \| COMPLIANCE \| FINANCE \| ORGANISATION \| SECURITY` — **pas** configurable par client |
| Validateurs / relecteurs | Mock : owner only ; « Relecteurs » UI partielle — **pas** de liste de validateurs configurable |
| Config module | Pattern Budgets : children + `/budgets/configuration` |

**Verdict** : ajouter un **espace Configuration** client-scopé pour piloter le mode de validation et les référentiels (catégories), sans casser le socle blocs v2.

---

## 2. Hypothèses

1. Config = **1 enregistrement par client** (`ProcedureModuleSettings`) + référentiel catégories client (`ProcedureCategory`).
2. **Deux modes de publication** (mutuellement exclusifs) :
   - **Cycle de pilotage = oui** (`usePilotageCycle: true`) : `DRAFT` → `IN_REVIEW` → `PUBLISHED` (PROC-006, inchangé côté acteurs : `update` / `publish`).
   - **Cycle de pilotage = non** (`usePilotageCycle: false`) : même enchaînement d’états **`DRAFT` → `IN_REVIEW` → `PUBLISHED`** (décision **B1=B**), mais acteurs distincts (**B2=B**) :
     - l’**auteur** (ou `procedures.update`) **soumet** → `IN_REVIEW` ;
     - un **validateur** de la liste configurée **approuve** → `PUBLISHED` (ou refuse → retour `DRAFT`) ;
     - `procedures.publish` seul ne suffit pas : l’acteur doit être dans `validatorUserIds` (sauf CLIENT_ADMIN / platform — à confirmer en plan : admin client peut forcer).
3. Si cycle = non : liste de validateurs **obligatoire** (≥ 1 utilisateur membre du client) ; libellés métier, **jamais d’ID** en UI.
4. Catégories (**B3=A**) : table `ProcedureCategory` (code + libellé + ordre + actif) + FK sur `Procedure` ; seed = 5 valeurs actuelles ; soft-disable si utilisées.
5. Permission (**B4=A**) : `procedures.configure` pour l’écran / API settings & catégories.
6. Isolation : toute lecture/écriture filtrée `clientId` scope ; audit des changements de config.

### Décisions figées (GO 2026-09-18)

| ID | Décision |
| --- | --- |
| B1 | États : toujours `DRAFT` → `IN_REVIEW` → `PUBLISHED` (pas de statut nouveau). |
| B2 | Mode Non : **2 actions** — soumission auteur, approbation validateur. |
| B3 | Table `ProcedureCategory` + migration remap. |
| B4 | Permission `procedures.configure`. |
| Découpage | F1 settings+nav+UI cycle/validateurs · F2 catégories · F3 brancher `transition` mode Non. |

---

## 3. User story

### US-PROC-31 — Configurer le module Procédures

**En tant qu’** administrateur / responsable gouvernance du **client actif** (permission configure),  
**je veux** un espace **Configuration** sous Procédures,  
**afin de** définir si les publications passent par le cycle de pilotage, qui valide sinon, et quels libellés de catégories sont disponibles.

#### Navigation

1. Sidebar : groupe **Procédures** (comme Budgets) avec enfants :
   - **Catalogue** → `/procedures` (liste actuelle)
   - **Configuration** → `/procedures/configuration`
2. Entrée active selon pathname ; cibles tactiles ≥ 44 px ; mobile : enfants accessibles (menu replié existant).

#### Écran hub `/procedures/configuration`

3. `PageHeader` : titre « Configuration », sous-titre métier (ex. « Cycle de publication, validateurs et catégories »).
4. Cartes (pattern budgets) menant aux sections (même page ancres **ou** sous-routes — hypothèse V1 = **une page sections** pour limiter le scope) :
   - **Cycle de publication**
   - **Validateurs**
   - **Catégories**
5. États loading / empty / error ; `aria-live` sur sauvegarde.

#### Section Cycle de publication

6. Contrôle Oui / Non (switch ou segmented) : « Passer par le cycle de pilotage (`En revue`) ».
7. Aide courte : Oui = brouillon → en revue → publiée ; Non = validation par la liste de validateurs puis publication.
8. Si **Oui** : section Validateurs en lecture seule / masquée avec message « Non applicable — cycle de pilotage actif ».
9. Si **Non** : section Validateurs **requise** ; impossible d’enregistrer la config Non sans ≥ 1 validateur actif.

#### Section Validateurs (si cycle = Non)

10. Liste ordonnée des validateurs du client (utilisateurs / client_users actifs).
11. Ajouter : combobox / select **libellé métier** (nom affiché), valeur interne = userId non affichée.
12. Retirer ; empêcher doublons ; min 1 si mode Non.
13. Affichage : avatar initiales + nom ; pas d’UUID.

#### Section Catégories

14. Table ou liste réordonnable : code (lecture seule après création), libellé éditable, actif Oui/Non, ordre.
15. Créer catégorie (libellé obligatoire, code dérivé slug unique par client).
16. Désactiver (pas supprimer si des procédures l’utilisent) → refus ou soft-disable avec message métier.
17. Les selects création / édition / filtres catalogue consomment **uniquement** les catégories actives du client (plus l’enum figé seul).

#### Persistance & API (esquisse)

18. `GET /api/procedures/settings` — settings + catégories + validateurs (labels).
19. `PATCH /api/procedures/settings` — `{ usePilotageCycle, validatorUserIds? }` + DTO validés.
20. `GET/POST/PATCH /api/procedures/categories` — CRUD référentiel (ou nested dans settings V1).
21. Audit `procedure.settings.updated` / `procedure.category.*` (sans DCP en clair dans logs).
22. Transition publish (PROC-006) **respecte** le mode configuré (implémentation liée — hors pure UI config).

#### Critères d’acceptation (checklist)

| ID | Critère |
| --- | --- |
| CA-C1 | Nav Procédures → Catalogue + Configuration ; routes isolées client. |
| CA-C2 | Hub config DS (PageHeader, cartes/sections, loading/empty/error). |
| CA-C3 | Toggle cycle Oui/Non persisté par client. |
| CA-C4 | Mode Non : ≥ 1 validateur obligatoire ; libellés métier only. |
| CA-C5 | Mode Oui : validateurs non exigés / section inactive. |
| CA-C6 | Catégories CRUD soft (actif/ordre/libellé) ; seed 5 valeurs. |
| CA-C7 | Catalogue + create dialog utilisent catégories actives API. |
| CA-C8 | RBAC + isolation client ; audit changements. |
| CA-C9 | `pnpm audit:ui-ids` vert ; mobile ≥ 320 px. |
| CA-C10 | Docs `API.md` + `_RFC Liste` mis à jour à l’implémentation. |

---

## 4. Hors scope (cette US)

- Workflow graphique multi-étapes type BPMN
- Validateurs externes (hors utilisateurs du client)
- ACL fine par procédure (Droits / Partager mock)
- Migration automatique des procédures si catégorie désactivée au-delà du soft-disable
- Notification e-mail validateurs (V1.1 — in-app possible en bonus)

---

## 5. Conformité by design

### RGPD
- Validateurs = DCP (identité utilisateur) : finalité = validation documentaire ; minimisation (id + display name) ; pas d’email complet en logs ; effacement = retrait de la liste + règles user offboarding client.

### RGAA
- Switch / selects labellés ; erreurs `aria-invalid` + texte ; clavier complet ; `aria-live` sauvegarde.

### Design System
- `PageHeader`, `PageContainer`, cartes / `starium-section`, `StariumModal` si create catégorie, tokens only, libellés métier.

### Sécurité
- `clientId` scope ; DTO class-validator ; permission configure ; audit ; pas de sur-exposition userId seuls sans label en API liste si destinée UI.

### Mobile
- Hub empilé dès 320 px ; cibles ≥ 44 px ; table catégories → cartes sur petit écran.

---

## 6. Dépendances d’implémentation

- Adapter `transition` PROC-006 selon `usePilotageCycle` (story technique liée ou même RFC lot B).
- Remplacer enum catégorie Prisma → table `ProcedureCategory` (migration + remap).
- Seed permissions `procedures.configure` + profils admin client.

---

## 7. Récapitulatif

| Livrable | Statut |
| --- | --- |
| US-PROC-31 + CA-C1…C10 | ✅ Rédigé |
| Décisions B1–B4 figées | ✅ GO 2026-09-18 |
| F1 settings + nav + UI cycle/validateurs | ✅ |
| F2 catégories table | ❌ |
| F3 transition mode Non | ❌ |

**Suite** : plan F2 catégories.
