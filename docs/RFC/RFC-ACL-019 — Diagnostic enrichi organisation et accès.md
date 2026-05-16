# RFC-ACL-019 — Diagnostic enrichi (organisation + propriété + politique)

## Statut

**Implémentée (V1)** — activation **opt-in** via variable d’environnement **`ACCESS_DIAGNOSTICS_ENRICHED`** : seules les valeurs normalisées `true` et `1` activent le mode enrichi ; toute autre valeur ou l’absence de variable laissent le contrat JSON **strictement identique** aux endpoints [RFC-ACL-011](./RFC-ACL-011%20%E2%80%94%20Matrice%20des%20droits%20effectifs.md) / [RFC-ACL-014](./RFC-ACL-014%20%E2%80%94%20Conformit%C3%A9%20mod%C3%A8le%20R%C3%B4les%2C%20Groupes%20et%20ACL.md). Dépend toujours du moteur [RFC-ACL-018](./RFC-ACL-018%20%E2%80%94%20Moteur%20de%20d%C3%A9cision%20d%27acc%C3%A8s%20unifi%C3%A9.md) pour la source de vérité **lecture** (`operation=read`, types supportés par `AccessDecisionService`, garde-fous anti-fuite respectés).

### Implémentation (référentiel)

- **API** : `apps/api/src/modules/access-diagnostics/` — `access-diagnostics.service.ts` (fusion `finalDecision` **read** ↔ `decide`, harmonisation des six couches avec `evaluationMode`, blocs enrichis, audit self), `access-diagnostics.types.ts`, `access-diagnostics-enriched.config.ts`, `access-diagnostics-reason-messages.fr.ts`, `forwardRef` vers `AccessDecisionModule` ; contrôleurs passent la requête HTTP réelle à `compute*` quand elle existe (**pas** de `request` falsifié pour le cache org).
- **Web** : `apps/web/src/features/access-diagnostics/` — matrice `effective-rights-matrix.tsx`, `access-explainer-popover.tsx`, types `api/access-diagnostics.ts`.
- **RFC-ACL-020** : intents **write** / **admin** via `canUseWriteAdminEngine` (flag enrichi + flag module `ACCESS_DECISION_V2_*`, pas d’override ACL) ; registre diagnostic **`BUDGET_LINE`**.

## Alignement plan

Référence : [_Plan de déploement Orgnisation et licences](./_Plan%20de%20déploement%20Orgnisation%20et%20licences.md).

| Élément | Valeur |
| --- | --- |
| **Priorité** | **P1** |
| **Ordre recommandé** | **7** |
| **Dépendances (plan)** | RFC-ACL-011, RFC-ACL-018 |
| **Livrables (plan)** | Flag `ACCESS_DIAGNOSTICS_ENRICHED` ; `organizationScopeCheck`, `resourceOwnershipCheck`, `resourceAccessPolicyCheck` ; `evaluationMode` sur les six couches + contrôles self ; UI matrice + `AccessExplainerPopover` |

**Chaîne 017 → 018 → 019** : le diagnostic doit refléter les décisions du moteur (018) et les entrées policy (017) + scope (016), avec les mêmes `reasonCodes` que possible.

## Objectif

Étendre la **matrice des droits effectifs** et le **self-diagnostic** (`GET /api/access-diagnostics/effective-rights/me`, popover explainer) avec des contrôles explicites :

| Contrôle (indicatif) | Rôle |
| --- | --- |
| `organizationScopeCheck` | Expose le verdict RFC-ACL-016 (`OWN` / `SCOPE` / `ALL` / `NONE`) + `reasonCodes`. |
| `resourceOwnershipCheck` | Présence / absence de `ownerOrgUnitId` (RFC-ORG-003), cohérence avec unité archivée. |
| `resourceAccessPolicyCheck` | Mode `DEFAULT` / `RESTRICTIVE` / `SHARING` (RFC-ACL-017) et impact sur la branche ACL. |

L’UI doit afficher des **libellés** (codes de raison → message FR), pas des identifiants bruts.

---

## 1. Analyse de l’existant

- `RESOURCE_ACCESS_DIAGNOSTIC_REGISTRY` ([RFC-ACL-014](./RFC-ACL-014%20%E2%80%94%20Conformit%C3%A9%20mod%C3%A8le%20R%C3%B4les%2C%20Groupes%20et%20ACL.md)) : pattern d’extension par **intentions** (`intent` query param).
- `AccessExplainerPopover` côté web : consommation lazy du endpoint self.

---

## 2. Hypothèses

- Les nouveaux contrôles et champs (`evaluationMode`, blocs org / ownership / policy, contrôles self supplémentaires) sont **absents** de la réponse tant que **`ACCESS_DIAGNOSTICS_ENRICHED`** n’est pas actif (aligné avec l’esprit RFC-ACL-022 — activation progressive sans casser les consommateurs existants).
- Pas de fuite d’informations sur les **autres** utilisateurs : le self-diagnostic ne montre que ce qui concerne **l’utilisateur courant** + métadonnées non sensibles sur la ressource (ex. « ACL restrictive active » sans lister les sujets).

---

## 3. Fichiers à créer / modifier (indicatif)

- Extension DTO réponse `effective-rights` / matrice plateforme.
- Registre diagnostic : nouvelles entrées + ordre d’exécution aligné sur RFC-ACL-018.
- Frontend : enrichissement `AccessExplainerPopover` + pages matrice RFC-ACL-011.
- Audit : conserver / étendre `access_diagnostic.self_outcome` avec granularité raison organisationnelle.

---

## 4. Hors périmètre

- Cockpit agrégé KPI (RFC-ACL-021) — ici uniquement **explication par intention** sur une ressource / contexte donné.

---

## 5. Tests

- Snapshot JSON des réponses pour un jeu de fixtures (user avec/sans `resourceId`, ressource avec/sans `ownerOrgUnitId`, modes policy).
- Régression RFC-ACL-014 : lockout ACL, `UNSAFE_CONTEXT`, etc.

---

## 6. Récapitulatif

RFC-ACL-019 rend le modèle **pédagogique** pour les admins client et réduit le coût support des refus « mystère » après introduction du scope.

---

## 7. Points de vigilance

- Taille des payloads JSON : paginer ou résumer les listes de raisons.
- Ne pas exposer d’énumération d’utilisateurs ayant accès via ACL dans le endpoint **self** public.
