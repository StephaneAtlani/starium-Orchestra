# RFC-COMP-003 — CDC Conformité (fidélité mock)

| | |
| --- | --- |
| **Statut** | ✅ COMP.UX.0–3 livrés · **COMP.V2 launch** (Lancer une revue) + pont remédiation ↔ plans d’actions (2026-09-18) |
| **Date** | 2026-09-17 · amendé 2026-09-18 |
| **Parents** | [RFC-COMP-001](./RFC-COMP-001%20—%20Pilotage%20de%20la%20conformité.md) · [RFC-COMP-001-A](./RFC-COMP-001-A%20—%20Évaluation%20opérationnelle%20(V1).md) · [RFC-COMP-002](./RFC-COMP-002%20—%20Campagnes%20et%20dossier%20d'audit.md) · [écarts MVP](./RFC-COMP-001-ecarts-mvp.md) |
| **Source design** | Export autonome *Conformité* + module portail |
| **Code mock** | [`ui_kits/app/exports/conformite/`](./_sources/Design%20system%20et%20CDC/ui_kits/app/exports/conformite/) · [`modules/conformite.js`](./_sources/Design%20system%20et%20CDC/ui_kits/app/modules/conformite.js) (identique à l’export) · `Conformite.html` |
| **Règle UX** | Classes `.refcard-*` / `.cd-*` / `.dw-*` / `.lib-*` / `.rem-*` → tokens DS ; **`StariumModal`** (pas de drawer custom hors shell) ; **jamais d’ID brut** ; graphiques **100 % API** (pas de jauges démo). |

---

## 1. Analyse de l’existant

### 1.1 Ce que le mock livre

| Vue mock | Contenu |
| --- | --- |
| **Accueil** `#conformite-home` | 4 KPI · grille cartes référentiels actifs (logo, anneau %, ok/wip/ko, badge, échéance) · tableau « Contrôles & exigences » |
| **Bibliothèque** `#conformite-library` | Catalogue groupé par domaine · switch activer/désactiver |
| **Détail référentiel** `#conformite-detail` | Hero (logo, version, périmètre, owner, modalité, échéance, anneau) · barre répartition · onglets switch FW · **arbre domaine → exigence** · rail (donut, maturité domaine, CTA remédiation) |
| **Tiroir évaluation** `#dw-panel` | 5 pastilles statut · maturité 1–5 · responsable · note · preuves (fichier/lien/réf/note) · bloc écart si Partiel/Écart · **prev/next** |
| **Modales** | Nouveau contrôle · **Lancer une revue** (campagne) · **Plan de remédiation** (écarts/partiels) |

**Formule score mock** (`cdCompliance`) : Σ poids / n pondérables × 100 avec `conf=1`, `part=0.5`, `ecart=0` ; `todo` et `na` **exclus** du dénominateur. Si dénominateur 0 → **0 %** (pas « Non calculable »).

### 1.2 Produit Orchestra (post COMP-001-A + COMP.V2 2026-09-18)

| Couche | État |
| --- | --- |
| API | `PUT …/requirements/:id/status`, preuves `kind`, dashboard `A` / `C/A` ; campagnes + snapshot scopé ; `…/remediation-plan` |
| UI | `/compliance/dashboard` · `/frameworks` · `/frameworks/[id]` · `/campaigns/[id]` · modale évaluer + remédiation + plan d’actions |
| Arbre domaine | groupement UI sur `category` |
| Campagne / Lancer une revue | ✅ COMP.V2 |
| Remédiation → ActionPlan | ✅ `ProjectTask.complianceGapId` |
| Maturité 1–5 | Optionnel / partiel UI |
| Owner par exigence | Optionnel UI (statut) |

### 1.3 Glossaire mock ↔ API

| Mock (`CD_ST`) | Prisma / API | Libellé UI cible (fidélité) |
| --- | --- | --- |
| `conf` | `COMPLIANT` | Conforme |
| `part` | `PARTIALLY_COMPLIANT` | **Partiel** |
| `ecart` | `NON_COMPLIANT` | **Écart** |
| `todo` | absence de status / `NOT_ASSESSED` | **À évaluer** |
| `na` | `NOT_APPLICABLE` | Non applicable |

### 1.4 Navigation mock ↔ routes

| Mock | Produit |
| --- | --- |
| Accueil conformité | `/compliance/dashboard` (+ cartes = `frameworks/summary`) |
| Bibliothèque | `/compliance/frameworks` (catalogue + activate) |
| Détail référentiel | `/compliance/frameworks/[id]` ✅ |
| Tiroir évaluation | `ComplianceRequirementDetailModal` (pastilles + prev/next) |
| Lancer une revue | Modale → `/compliance/campaigns/[id]` ✅ |
| Plan de remédiation | Modale filtre + CTA **Plan d’actions** ✅ |

---

## 2. Hypothèses figées

| # | Décision |
| --- | --- |
| H1 | **Pas de rewrite** schéma campagnes pour coller au mock : COMP-001-A reste la vérité V1. |
| H2 | Score produit V1 = **`C/A`** (`A = N−NA−U`), `null` si `A=0` (« Non calculable »). Le score **pondéré** mock (`part=0.5`) = option COMP.UX / COMP-002 — **pas** imposé en V1. |
| H3 | Tiroir mock → **`StariumModal`** (norme DS) ; prev/next dans le footer = OK. |
| H4 | Arbre domaine = groupement UI sur `category` (ou code préfixe) **sans** nouvelle entité Prisma en COMP.UX. |
| H5 | Plan de remédiation = vue filtrée écarts/partiels + **CTA plan d’actions** (`ensureOpenGap` → CREATE/LINK `ActionPlan`) — **pas** d’entité `RemediationPlan`. |
| H6 | Maturité 1–5 et owner exigence = champs optionnels futurs (JSON ou colonnes) — hors lot immédiat sauf demande explicite. |
| H7 | Anneaux / donuts : uniquement données API réelles (règle charts-dynamic-only). |
| H8 | Source mock versionnée dans le repo sous `exports/conformite/` (+ `modules/conformite.js` déjà présent). |

---

## 3. Mapping capacités → lots backlog

| Capacité mock | Lot | Horizon |
| --- | --- | --- |
| Libellés Partiel / Écart / À évaluer | **COMP.UX.0** | Immédiat (avec cette RFC) |
| Pastilles statut + prev/next dans modale | **COMP.UX.0** | Immédiat |
| Fiche détail référentiel (hero + répartition + liste groupée) | **COMP.UX.1** | V1.1 court |
| Rail donut + maturité par domaine (API) | **COMP.UX.2** | V1.1 |
| Plan remédiation (filtre écarts + actions) | **COMP.UX.3** | Avant ou dans COMP-002 |
| Lancer une revue / campagne | **COMP.V2** | ✅ Modale + campagne OPEN + snapshot scopé + write-scope |
| Remédiation → plan d’actions | **COMP.V2** | ✅ `ProjectTask.complianceGapId` + POST remediation-plan |
| Score pondéré optionnel | Décision produit | Ouvert |
| Preuve fichier GED | `fut-evidence-ged` | 2027 — voir aussi [RFC-COMP-004](./RFC-COMP-004%20—%20Gestion%20des%20preuves%20de%20conformité.md) (cycle de vie UI) |

---

## 4. Fichiers

### Sources (référence)

| Chemin | Rôle |
| --- | --- |
| `docs/RFC/_sources/.../ui_kits/app/exports/conformite/` | Export autonome (HTML, JS, CSS, README) |
| `…/ui_kits/app/modules/conformite.js` | Même logique (portail complet) |

### Produit (COMP.UX.0 — immédiat)

| Fichier | Changement |
| --- | --- |
| `compliance-status-display.tsx` | Libellés alignés mock |
| `compliance-requirement-detail-modal.tsx` | Pastilles statut + navigation prev/next |
| `compliance-requirements-list.tsx` | Passer la liste filtrée ordonnée à la modale |
| Specs labels | Adapter assertions |

### Doc

| Fichier | Changement |
| --- | --- |
| `_RFC Liste.md` | Entrée COMP-003 |
| `RFC-COMP-001` / `001-A` / `002` / `ecarts` | Lien source mock + H2 score |
| `BACKLOG.md` | Items `COMP.UX.*` |
| `MANUEL-70` | Mention pastilles / navigation |

---

## 5. Critères de recette COMP.UX.0

| ID | Scénario | Attendu | État |
| --- | --- | --- | --- |
| U-01 | Liste / filtres | Libellés Partiel, Écart, À évaluer | ✅ |
| U-02 | Modale | 5 pastilles cliquables (gated `compliance.update`) | ✅ (4 pastilles évaluables ; « À évaluer » = état lecture seule) |
| U-03 | Prev/next | Parcourt la liste **filtrée** sans fermer la modale | ✅ |
| U-04 | KPI | Toujours `C/A` ou « Non calculable » (pas de score pondéré silencieux) | ✅ |

---

## 5b. Critères de recette COMP.V2 launch + remédiation (2026-09-18)

| ID | Scénario | Attendu | État |
| --- | --- | --- | --- |
| V2-01 | Lancer une revue (domaines cochés) | Campagne OPEN + redirect workspace | ✅ |
| V2-02 | Snapshot initial | Exigences ⊆ `scopeDomainKeys` | ✅ |
| V2-03 | Bandeau périmètre | Libellés domaines (pas seulement compteur) | ✅ |
| V2-04 | Write hors scope | `PUT status` / `POST gap` → 400 si revue OPEN scopée | ✅ |
| V2-05 | Plan d’actions depuis remédiation | ensure gap + CREATE/LINK + lien `/action-plans/[id]` | ✅ |
| V2-06 | Permissions | `compliance.update` + `projects.update` sur remediation-plan | ✅ |
| V2-07 | Audits UI | `audit:modals` / `audit:ui-ids` verts | ✅ |

---

## 6. Conformité by design

- **RGPD** : pas de nouveau DCP ; owner mock = hors scope immédiat.
- **RGAA** : pastilles = `role="radiogroup"` / boutons focusables ; prev/next `aria-label` ; `aria-live` après save (existant).
- **DS** : tokens état ; `StariumModal` ; pas de hex mock (`#F2D9A8`).
- **Sécurité** : authz inchangée (`compliance.*` / `projects.update`).
- **Mobile** : pastilles wrap ; cibles ≥ 44px ; prev/next en footer.

---

## 7. Ordre d’implémentation

1. ~~COMP.UX.0~~ ✅ (libellés + pastilles + prev/next)  
2. ~~COMP.UX.1–3~~ ✅ (fiche `/frameworks/[id]`, overview API, remédiation)  
3. COMP-002 (campagnes / revue mock)  

Ne pas démarrer COMP-002 uniquement pour coller au bouton « Lancer une revue » du mock.
