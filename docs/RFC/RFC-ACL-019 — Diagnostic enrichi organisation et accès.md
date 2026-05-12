# RFC-ACL-019 — Diagnostic enrichi (organisation + propriété + politique)

## Statut

**Draft** — non implémentée. Dépend de [RFC-ACL-011](./RFC-ACL-011%20%E2%80%94%20Matrice%20des%20droits%20effectifs.md) (matrice droits effectifs), [RFC-ACL-014](./RFC-ACL-014%20%E2%80%94%20Conformit%C3%A9%20mod%C3%A8le%20R%C3%B4les%2C%20Groupes%20et%20ACL.md) (registre diagnostic) et [RFC-ACL-018](./RFC-ACL-018%20%E2%80%94%20Moteur%20de%20d%C3%A9cision%20d%27acc%C3%A8s%20unifi%C3%A9.md).

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

- Les nouveaux contrôles sont **optionnels** dans la réponse tant que feature flag désactivé (RFC-ACL-022).
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
