# RFC-CORE-SEARCH-001 — Global Search Engine (Starium)

## Statut

* Proposé (V1)

---

## 1) Objectif produit

Mettre en place une **recherche globale transverse sur tout Starium** : depuis une **loupe unique**, l’utilisateur interroge **l’ensemble des objets indexables** de la plateforme (tous modules métier concernés), avec une **architecture extensible module par module** (ajout d’un **SearchAdapter** par nouveau domaine sans casser le contrat d’API).

Le **périmètre fonctionnel V1** peut rester volontairement limité (socle minimal livré en premier), mais la **cible produit et technique** est **« tout Starium »** : la RFC décrit le socle commun, les limites de déploiement initial, et la voie d’extension continue.

La recherche doit être :

* rapide
* sécurisée (RBAC + multi-tenant)
* unifiée (un point d’entrée, une expérience)
* extensible (nouveaux modules = nouveaux adapters)

---

## 2) Vision produit

```text
Utilisateur
   ↓
Loupe globale
   ↓
Recherche unique
   ↓
Résultats **groupés par module**
   ↓
Navigation directe vers entités
```

👉 Objectif : **remplacer la navigation par menus**

---

## 3) Périmètre V1

### Socle V1 (obligatoire)

* **Projects**
* **Budgets**
* **ChatbotKnowledgeEntry** (FAQ / Articles — « Articles d’aide » côté UX)

### Extension module par module (hors V1 initial, même architecture)

Exemples d’objets / domaines **indexables ensuite** via **SearchAdapter** dédié : Fournisseurs, Contrats, Licences, Applications, Collaborateurs, Documents, Alertes, Décisions, Commandes, Factures, etc.

👉 Chaque nouveau module **ajoute son propre SearchAdapter** ; le **SearchService** et le **format de réponse groupé** restent stables.

---

## 4) Architecture cible

### Principe

```text
Frontend (loupe)
   ↓
GET /api/search
   ↓
SearchService (NestJS)
   ↓
SearchAdapters (par module)
   ↓
Base de données (Prisma)
```

---

## 5) Modèle technique

### 5.1 Formats unifiés

**Élément de résultat** (dans un groupe ; pas de liste plate seule côté API — voir §7) :

```ts
type GlobalSearchHit = {
  type: string; // PROJECT | BUDGET | ARTICLE | … (type métier du hit)
  title: string;
  subtitle?: string;
  slug?: string;
  route: string;
  icon?: string;
  score: number;
};
```

**Groupe par module** (unité d’affichage UX et de sérialisation API) :

```ts
type GlobalSearchGroup = {
  moduleCode: string;   // ex. "projects", "budgets"
  moduleLabel: string;  // ex. "Projets", "Budgets" — libellé i18n côté API ou clé stable
  type: string;       // type principal du groupe (ex. PROJECT) — aligné listing
  total: number;      // nombre de hits dans ce groupe (après filtre sécurité)
  results: GlobalSearchHit[];
};
```

---

### 5.2 Indexation (par module)

Chaque module doit exposer :

```ts
interface SearchableEntity {
  id: string;
  searchText: string;
  clientId: string;
  moduleCode: string;
}
```

---

### 5.3 Ajout searchText

Exemple :

#### Project

```prisma
model Project {
  // ...
  searchText String?
}
```

#### Budget

```prisma
model Budget {
  searchText String?
}
```

#### ChatbotKnowledgeEntry

déjà présent

---

## 6) Indexation

### Construction searchText

Concaténer :

* nom
* description
* champs clés
* relations utiles (optionnel)

### Normalisation

* lowercase
* suppression accents
* suppression ponctuation

---

## 7) API

### Endpoint

```http
GET /api/search?q=
```

---

### Paramètres

| Paramètre | Description     |
| --------- | --------------- |
| q         | texte recherché |

---

### Format de réponse (groupé par module)

La réponse **n’est pas** une liste plate unique : elle expose des **`groups`**, chacun correspondant à un module métier avec ses résultats. Un **module pour lequel l’utilisateur n’a aucune permission / module désactivé** ne produit **aucun groupe** (pas de groupe vide exposé).

```json
{
  "groups": [
    {
      "moduleCode": "projects",
      "moduleLabel": "Projets",
      "type": "PROJECT",
      "total": 2,
      "results": [
        {
          "title": "…",
          "subtitle": "…",
          "route": "/projects/…",
          "icon": "…",
          "score": 0
        }
      ]
    }
  ],
  "total": 0
}
```

* **`total`** (racine) : nombre total de hits renvoyés dans tous les groupes (après limites globales — voir §8).
* **`title` / `subtitle`** : **aucun ID technique** (UUID, etc.) ; uniquement libellés métier (nom, code, titre article, etc.).
* **`route`** : peut contenir un **identifiant technique** si la route applicative existante l’exige ; cet identifiant **ne doit jamais** être affiché comme texte dans l’UI (seule la navigation utilise `route`).

---

## 8) Algorithme

### Étapes (SearchService + adapters)

1. Normaliser la query
2. Pour chaque **SearchAdapter** enregistré (un par module / domaine indexable) : si l’utilisateur **n’a pas** les droits ou le **module n’est pas actif** pour le client → **ne pas appeler** l’adapter (aucun groupe pour ce module)
3. Sinon : l’adapter interroge ses données, applique le **filtrage sécurité**, calcule un **score** par hit, renvoie chaque hit avec **`moduleCode`** et **`moduleLabel`** (métadonnées de groupe fournies par l’adapter)
4. **Fusion** de tous les hits autorisés
5. **Limiter par module** (ex. **top 5** hits par `moduleCode` après tri par score dans le module)
6. **Regrouper** par `moduleCode` → construire les objets **`GlobalSearchGroup`** (les groupes sans aucun hit **ne sont pas** inclus dans la réponse)
7. **Trier les groupes** selon : (a) **pertinence maximale** du groupe (meilleur score parmi ses hits), (b) **ordre fonctionnel** configurable (liste de priorités produit / modules), (c) **nombre de résultats** en tie-break si besoin
8. Appliquer une **limite globale** sur le nombre total de hits renseignés (ex. **top 30** au total dans toute la réponse), en respectant autant que possible l’ordre des groupes et les priorités internes

---

## 9) Scoring

```text
Exact match → très fort
Title match → fort
searchText → moyen
priority → bonus
```

---

## 10) Sécurité

Obligatoire :

* clientId actif
* permissions utilisateur
* module actif

👉 Aucun résultat interdit ne doit remonter

---

## 11) Frontend

### Loupe globale

Dans le header :

* icône 🔍
* ouverture modal

---

### Comportement

* debounce 300ms
* recherche live

---

### Affichage (groupé par module)

Les résultats **ne sont pas** une liste mélangée brute : l’UI affiche des **sections par module**, dans l’ordre renvoyé par l’API (déjà ordonné — voir §8), par exemple :

* **Projets**
* **Budgets**
* **Contrats** (quand l’adapter existe)
* **Fournisseurs**
* **Articles d’aide** (ChatbotKnowledgeEntry / FAQ & articles)
* etc.

Chaque **groupe** affiche :

* un **titre de module** (libellé lisible, ex. « Articles d’aide » pour le chatbot)
* une **icône** de section (cohérente avec le design system)
* la **liste des hits** du groupe (titre, sous-titre, icône optionnelle par ligne)

**Aucun ID technique** dans les libellés visibles ; le clic utilise uniquement **`route`** pour la navigation.

---

### État vide

* **« Aucun résultat »** : message clair ; **suggestions** (raccourcis, requêtes populaires, liens modules) prévues en évolution UX (V1 peut se limiter au message + piste d’aide courte).

---

## 12) Navigation

* clic → redirection vers route
* aucune logique métier frontend

---

## 13) UX avancée

Ajouter :

* “Récents”
* “Populaires”
* “Aucun résultat” → suggestions

---

## 14) Contraintes

* **aucun ID technique** dans `title` / `subtitle` (ni ailleurs comme texte affiché utilisateur)
* **routes** : la navigation repose sur `route` ; celle-ci peut contenir un ID si la route applicative l’impose
* multi-tenant strict
* API source de vérité
* **extensibilité** : ajouter un module = ajouter un **SearchAdapter** + enregistrement ; le **contrat** `groups` / `total` reste inchangé

---

## 15) Critères d’acceptation

* la recherche affiche les résultats **groupés par module** (pas une seule liste plate mélangée)
* un résultat projet apparaît dans le **groupe Projets**
* un résultat budget apparaît dans le **groupe Budgets**
* un résultat article / FAQ apparaît dans le **groupe Articles d’aide** (ou libellé équivalent aligné produit)
* les **modules non autorisés** ne remontent **aucun groupe** (et ne sont pas interrogés côté API de manière à fuiter des données)
* un **groupe vide** n’est **pas** affiché et n’apparaît **pas** dans le JSON (`groups` sans entrées à 0 résultat)
* **aucun ID technique** dans les libellés (`title` / `subtitle` / texte UI)
* l’**architecture** permet d’ajouter un nouveau module via un **SearchAdapter** sans modifier le **contrat global** de réponse (`groups`, structure des hits)
* recherche respecte permissions ; aucun résultat interdit
* UX fluide (cible inférieure à 300 ms côté perception utilisateur)

### Tests automatisés (recommandés)

* **groupement** : la réponse contient des `groups` distincts par `moduleCode` avec les hits attendus
* **absence de groupe** : module sans résultat autorisé → aucun objet groupe pour ce module
* **limite par module** : respect du plafond par module (ex. top 5)
* **limite globale** : respect du plafond total (ex. top 30)
* **ordre des groupes** : conforme aux règles §8 (pertinence max, ordre configuré, nombre de résultats)

---

## 16) Plan d’implémentation

### Étape 1 — Core

* créer SearchService
* créer interface SearchAdapter

---

### Étape 2 — Chatbot

* brancher ChatbotKnowledgeEntry

---

### Étape 3 — Projects

* ajouter searchText
* créer adapter

---

### Étape 4 — Front

* loupe
* modal
* affichage **par groupes de modules** (titres, icônes, listes de hits)
* état **« Aucun résultat »** (base + place pour suggestions futures)

---

### Étape 5 — Optimisation

* limiter les résultats **par module** (ex. top 5) et **globalement** (ex. top 30)
* ordonner les groupes (pertinence, ordre fonctionnel, nombre de hits)
* ajouter cache (optionnel Redis)

---

## 17) Évolution future

* IA search
* semantic search
* auto-complete
* recent history

---

## Conclusion

👉 Cette RFC crée une **brique centrale du produit**
👉 Elle transforme Starium en **outil pilotable par recherche**
👉 Elle prépare parfaitement l’IA ensuite

