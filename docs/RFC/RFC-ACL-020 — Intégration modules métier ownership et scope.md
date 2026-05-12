# RFC-ACL-020 — Intégration modules métier (ownership + scope + moteur)

## Statut

**Draft** — non implémentée. Dépend de [RFC-ACL-018](./RFC-ACL-018%20%E2%80%94%20Moteur%20de%20d%C3%A9cision%20d%27acc%C3%A8s%20unifi%C3%A9.md) et [RFC-ORG-003](./RFC-ORG-003%20%E2%80%94%20Propri%C3%A9t%C3%A9%20organisationnelle%20des%20ressources.md).

## Alignement plan

Référence : [_Plan de déploement Orgnisation et licences](./_Plan%20de%20déploement%20Orgnisation%20et%20licences.md) (§ *Ordre prioritaire recommandé* : couplage explicite **020 ↔ 022**).

| Élément | Valeur |
| --- | --- |
| **Priorité** | **P1** |
| **Ordre recommandé** | **8** |
| **Dépendances (plan)** | RFC-ACL-018, RFC-ORG-003 |
| **Livrables (plan)** | Ownership affiché, filtrage par scope, contrôle détail, contrôle mutation, tests anti-fuite |

### Couplage obligatoire avec RFC-ACL-022

Pour **chaque module métier** (Projets, Budgets, Contrats, etc.), livrer dans **la même tranche** :

- [RFC-ACL-022](./RFC-ACL-022%20%E2%80%94%20Migration%20backfill%20et%20feature%20flags.md) : flags, migrations, backfill, rapports d’écarts applicables à ce module ;
- **RFC-ACL-020** : branchement ownership, guards, filtrage liste / détail sur ce module.

**Interdit (plan)** : activer en production le nouveau comportement **020** sur un module **sans** le socle **022** correspondant (flags + données) sur **ce même module** — sinon états intermédiaires incohérents.

## Objectif

Appliquer **progressivement** le modèle cible (propriété organisationnelle + permissions `OWN`/`SCOPE`/`ALL` + moteur RFC-ACL-018) aux modules :

- Budgets (+ lignes si pertinent)
- Projets
- Contrats
- Fournisseurs
- Vision stratégique (objectifs / axes — aligner champs existants)
- Documents métier concernés

Pour chaque module : **ownership affiché** en UI, **filtrage liste** cohérent avec le détail, **mutations** protégées, **tests anti-fuite** inter-clients.

---

## 1. Analyse de l’existant

- [RFC-ACL-006](./RFC-ACL-006%20%E2%80%94%20Int%C3%A9gration%20ACL%20dans%20les%20modules%20m%C3%A9tier.md) : ACL + `filterReadableResourceIds` déjà branchés sur plusieurs types.
- UI : éditeur ACL [RFC-ACL-013](./RFC-ACL-013%20%E2%80%94%20%C3%89diteur%20ACL%20par%20ressource.md) intégré aux fiches.

---

## 2. Hypothèses

- Livraison par **tranches** (feature flags par `moduleCode` dans RFC-ACL-022).
- Chaque tranche inclut : migration Prisma si colonnes manquantes, services, contrôleurs, queries FE, tests e2e/API ciblés.
- Les modules déjà dotés d’un champ « direction » métier spécifique migrent vers le **modèle unifié** RFC-ORG-003 (pas de double filtre contradictoire).

---

## 3. Checklist par module (à cocher en delivery)

Pour chaque ressource :

- [ ] Colonne / lien `ownerOrgUnitId` + affichage UI (sélecteur arbre / combobox unités).
- [ ] Liste : application du filtre SCOPE/OWN via helper commun (wrap du moteur ou pré-filtre IDs).
- [ ] Détail : même verdict que liste.
- [ ] Mutations : guard unifié ou équivalent.
- [ ] Tests : utilisateur A d’une direction ne voit pas les entités d’une autre (client identique).
- [ ] Diagnostic RFC-ACL-019 branché sur l’intention représentative du module.

---

## 4. Hors périmètre

- Cockpit transverse RFC-ACL-021 (s’appuie sur les données produites ici).

---

## 5. Tests

- Suite **paramétrée** par `resourceType` / module (au minimum un test par module livré).
- Régression ACL stricte + policy (RFC-ACL-017).

---

## 6. Récapitulatif

RFC-ACL-020 est le **plan de portage opérationnel** : elle ne redéfinit pas le moteur, elle **matérialise** les branchements réels sur le code existant.

---

## 7. Points de vigilance

- **Budget lines** : héritage direction du budget parent vs override — à trancher (recommandation : héritage par défaut, override optionnel seulement si besoin CODIR).
- **Performance** des portefeuilles (projets, budgets) après filtrage scope : indexer et mesurer.
