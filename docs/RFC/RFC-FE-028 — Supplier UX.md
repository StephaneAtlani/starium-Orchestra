# RFC-FE-028 — Supplier UX

## Statut

Draft

## Titre

**Supplier UX — Autocomplete, quick-create, anti-doublons**

---

# 1. Objectif

Améliorer l’expérience utilisateur autour de la sélection et de la création des **fournisseurs** dans le frontend Starium Orchestra.

Cette RFC introduit une UX standardisée pour :

* rechercher rapidement un fournisseur existant
* le sélectionner via **autocomplete**
* créer un fournisseur à la volée via **quick-create**
* limiter les doublons visibles côté UX avant validation backend
* réutiliser ce pattern dans les formulaires métier dépendants des fournisseurs

L’objectif est de rendre la saisie plus fluide dans les modules qui manipulent des objets liés aux fournisseurs, tout en respectant le principe fondamental du projet : **le backend reste la source de vérité métier**.  

---

# 2. Problème résolu

Dans un cockpit de gouvernance comme Starium Orchestra, les fournisseurs sont des objets transverses utilisés par plusieurs domaines, notamment :

* gouvernance IT
* contrats
* licences
* commandes
* potentiellement budget / import / reporting plus tard. 

Sans UX dédiée, la création et la sélection d’un fournisseur posent plusieurs problèmes :

* recherche lente dans de longues listes
* ressaisie répétitive du même fournisseur
* création de doublons typographiques
* rupture de flux quand l’utilisateur doit quitter son formulaire pour créer un fournisseur
* incohérence d’expérience entre modules

Cette RFC apporte un pattern frontend unique pour fiabiliser cette interaction.

---

# 3. Périmètre

## Inclus

* composant **SupplierAutocomplete**
* composant **SupplierQuickCreateDialog** ou drawer léger
* logique UX d’anti-doublons côté frontend
* hooks React Query dédiés aux fournisseurs
* intégration dans les formulaires consommateurs
* états loading / empty / error cohérents
* pattern réutilisable feature-first dans `features/suppliers/`

## Exclus

* refonte backend fournisseur
* fusion de doublons
* matching intelligent avancé type fuzzy server-side
* import fournisseur
* enrichissement externe (SIREN, TVA, API INSEE, etc.)
* workflow de validation fournisseur
* règles métier critiques de déduplication côté frontend

---

# 4. Principes d’architecture

Cette RFC respecte explicitement les principes projet :

## 4.1 API-first

Le frontend consomme l’API existante ; aucune logique métier critique n’est déplacée côté UI.  

## 4.2 Multi-client

Toutes les requêtes fournisseur sont exécutées dans le contexte du **client actif** via `X-Client-Id`. Aucun mélange inter-client n’est autorisé.   

## 4.3 Backend source de vérité

Le frontend peut :

* suggérer un doublon probable
* empêcher une erreur évidente
* améliorer le confort de saisie

Mais seul le backend décide :

* si un fournisseur existe réellement
* si la création est autorisée
* si un doublon doit être refusé.  

## 4.4 Feature-first

L’implémentation doit vivre dans `features/suppliers/`, cohérente avec l’architecture frontend projet. 

---

# 5. Cas d’usage

## 5.1 Sélection simple

Dans un formulaire Contrat, Licence ou Commande, l’utilisateur clique sur “Fournisseur”, tape `Soph`, voit apparaître `Sophos`, le sélectionne, et poursuit sa saisie.

## 5.2 Quick-create

L’utilisateur tape un nom qui n’existe pas. L’autocomplete propose :

> Créer “Nouveau Fournisseur X”

Il peut ouvrir un quick-create, saisir les champs minimum, créer le fournisseur sans quitter son écran, puis ce fournisseur est automatiquement sélectionné.

## 5.3 Prévention de doublon

L’utilisateur tape `Microsoft France` alors qu’un `MICROSOFT FRANCE` existe déjà. L’UI signale immédiatement :

> Un fournisseur similaire existe déjà

et propose la fiche existante avant toute création.

---

# 6. UX cible

## 6.1 Champ fournisseur standard

Le champ fournisseur devient un **combobox/autocomplete** avec :

* recherche par texte
* résultats paginés ou limités
* affichage du nom principal
* affichage secondaire utile : email, code, ville, SIREN, selon données disponibles
* action “Créer ce fournisseur”

## 6.2 États UX

Le composant doit gérer explicitement :

* `idle`
* `loading`
* `success`
* `empty`
* `error`

Conformément aux règles frontend du projet, aucun écran vide implicite. 

## 6.3 Comportement de recherche

* recherche déclenchée avec debounce
* seuil recommandé : 2 caractères minimum
* fermeture propre du menu au blur / escape
* navigation clavier complète
* accessibilité ARIA compatible combobox

## 6.4 Affichage des doublons probables

Quand la saisie courante ressemble fortement à un fournisseur existant, l’UI affiche un bloc léger :

* “Fournisseur similaire trouvé”
* liste de 1 à 3 correspondances probables
* bouton “Utiliser ce fournisseur”
* bouton “Créer quand même”

Le ton doit être assistif, pas bloquant.

---

# 7. Anti-doublons UX

## 7.1 Objectif

Réduire les doublons évidents **sans transformer le frontend en moteur métier**.

## 7.2 Normalisation frontend légère

La détection UX peut s’appuyer sur une normalisation non critique :

* trim
* lowercase
* suppression espaces multiples
* suppression des accents si simple à implémenter
* comparaison tolérante sur le nom affiché

Exemple :

* `Orange Business`
* `orange business`
* `Orange   Business`

doivent être considérés comme similaires côté UX.

## 7.3 Règle

Cette détection est :

* informative
* non souveraine
* contournable si le backend accepte la création

Le backend reste l’arbitre final.

## 7.4 Cas minimum couverts

* égalité stricte après normalisation
* préfixe proche
* inclusion forte du libellé

Pas de fuzzy matching complexe dans cette RFC.

---

# 8. Quick-create fournisseur

## 8.1 Objectif

Permettre une création minimale sans quitter le formulaire courant.

## 8.2 Champs minimum

Le quick-create doit rester court.

Proposition MVP :

* `name` obligatoire
* `contactEmail` optionnel
* `website` optionnel
* `phone` optionnel
* `notes` optionnel

Si le backend exige d’autres champs, le frontend s’aligne strictement sur son DTO.

## 8.3 Règles UX

* ouverture depuis l’autocomplete
* préremplissage du nom avec la saisie utilisateur
* validation via React Hook Form + Zod
* mutation API dédiée
* fermeture automatique en cas de succès
* sélection automatique du fournisseur créé dans le champ appelant
* toast de confirmation

## 8.4 Erreurs

En cas de conflit backend type 409 ou validation 400 :

* afficher le message métier
* conserver le formulaire ouvert
* proposer, si possible, d’utiliser le fournisseur existant

---

# 9. API frontend attendue

Cette RFC ne crée pas le backend, mais elle suppose un contrat frontend cohérent.

## 9.1 Lecture / recherche

Fonctions API attendues côté frontend :

* `listSuppliers(params)`
* `getSupplier(id)`

Paramètres de recherche recommandés :

* `search`
* `offset`
* `limit`

## 9.2 Création rapide

Fonction API :

* `createSupplier(payload)`

## 9.3 Contrat de pagination

Les listes doivent respecter le format standard projet :

```ts
{
  items: [],
  total: number,
  limit: number,
  offset: number
}
```

par cohérence avec les autres modules frontend/backend.  

---

# 10. Structure frontend

Implémentation cible :

```text
apps/web/src/features/suppliers/
├── api/
│   └── suppliers.api.ts
├── hooks/
│   ├── use-suppliers.ts
│   ├── use-supplier-search.ts
│   └── use-create-supplier.ts
├── components/
│   ├── supplier-autocomplete.tsx
│   ├── supplier-option.tsx
│   ├── supplier-quick-create-dialog.tsx
│   ├── supplier-duplicate-hint.tsx
│   └── supplier-field.tsx
├── schemas/
│   └── supplier-quick-create.schema.ts
├── types/
│   └── supplier.types.ts
└── utils/
    └── normalize-supplier-name.ts
```

Architecture cohérente avec la stratégie feature-first du frontend. 

---

# 11. Hooks

## 11.1 `useSupplierSearch(query, options)`

Responsable de :

* debounce
* appel API de recherche
* cache React Query tenant-aware
* limitation du volume affiché

Clé de query obligatoire :

```ts
["suppliers", clientId, "search", normalizedQuery, limit]
```

Jamais sans `clientId`, pour éviter toute collision inter-tenant. 

## 11.2 `useCreateSupplier()`

Responsable de :

* mutation POST
* invalidation des queries fournisseurs du client actif
* retour du fournisseur créé

## 11.3 `useSupplierDuplicateHint(name)`

Hook purement UX qui :

* normalise la saisie
* compare avec les résultats courants
* expose une liste restreinte de correspondances probables

---

# 12. Composants

## 12.1 `SupplierAutocomplete`

Props proposées :

```ts
type SupplierAutocompleteProps = {
  value: string | null
  onChange: (supplier: SupplierSummary | null) => void
  disabled?: boolean
  placeholder?: string
  allowQuickCreate?: boolean
  required?: boolean
}
```

Responsabilités :

* afficher l’input
* déclencher la recherche
* lister les résultats
* permettre la sélection
* exposer l’action quick-create

## 12.2 `SupplierQuickCreateDialog`

Responsabilités :

* préremplir `name`
* afficher le mini-formulaire
* gérer submit / cancel
* renvoyer le fournisseur créé au parent

## 12.3 `SupplierField`

Wrapper métier prêt à l’emploi pour les formulaires RH/IT/finance si besoin, branché avec RHF.

---

# 13. Intégration formulaires

Cette RFC doit standardiser l’usage du fournisseur dans les écrans consommateurs.

Exemples futurs :

* contrats
* licences
* commandes
* imports manuels
* événements financiers liés à des sources fournisseurs

Le pattern recommandé est :

* un `supplierId` stocké comme valeur formulaire
* une représentation riche côté UI
* aucune duplication d’implémentation d’un écran à l’autre

---

# 14. Validation frontend

## 14.1 Recherche

* pas d’appel serveur en dessous du seuil minimum
* trim automatique
* nettoyage des espaces parasites

## 14.2 Quick-create

Validation Zod minimale sur les champs saisis.

Exemple :

```ts
name: string().trim().min(2).max(120)
contactEmail?: email
website?: url
phone?: string().max(30)
notes?: string().max(1000)
```

## 14.3 Important

Aucune validation frontend n’a de valeur métier souveraine.
Toute décision définitive reste côté backend.  

---

# 15. Feedback utilisateur

## 15.1 Toasts

Prévoir :

* création réussie
* erreur de création
* doublon probable détecté

## 15.2 Messages inline

Prévoir :

* “Aucun fournisseur trouvé”
* “Tapez au moins 2 caractères”
* “Un fournisseur similaire existe déjà”
* “Impossible de charger les fournisseurs”

---

# 16. Accessibilité

Le composant doit être exploitable :

* au clavier
* avec focus visible
* avec navigation flèches haut/bas
* avec entrée pour sélectionner
* avec escape pour fermer
* avec attributs ARIA adaptés au pattern combobox

---

# 17. Performance

## 17.1 Debounce

Debounce recommandé : `250ms` à `350ms`.

## 17.2 Volume

Limiter les résultats affichés à un petit nombre utile, par exemple :

* 8 à 10 suggestions max

## 17.3 Cache

Utiliser React Query pour éviter les recherches répétitives sur une même saisie.

## 17.4 Invalidation

Après création d’un fournisseur :

* invalider les queries `suppliers` du `clientId` actif
* réinjecter le fournisseur créé dans la sélection courante

---

# 18. Sécurité

Toutes les routes fournisseurs appelées par le frontend doivent respecter :

* `Authorization: Bearer <accessToken>`
* `X-Client-Id`
* les guards backend standards du projet pour les routes métier.  

Le frontend ne doit jamais :

* appeler une route métier sans client actif
* conserver en cache des résultats d’un autre client
* exposer une logique de droit en substitution du backend

---

# 19. Audit et traçabilité

La création fournisseur côté backend devra continuer à générer les audit logs métier conformément au pattern projet :

```text
<resource>.<action>
```

exemple attendu :

```text
supplier.created
supplier.updated
```

Le frontend n’implémente pas l’audit mais doit préserver des flux clairs pour ces actions. 

---

# 20. Critères d’acceptation

## Fonctionnels

* l’utilisateur peut rechercher un fournisseur depuis un champ unique
* l’utilisateur peut sélectionner un fournisseur existant
* l’utilisateur peut créer un fournisseur sans quitter son formulaire
* le fournisseur créé est automatiquement sélectionné
* les doublons évidents sont signalés côté UX avant création
* les erreurs backend sont affichées proprement

## Techniques

* implémentation dans `features/suppliers/`
* hooks React Query tenant-aware
* aucun `fetch` direct hors client API central
* aucun calcul métier critique côté frontend
* intégration compatible RHF + Zod
* états loading / error / empty explicites

---

# 21. Hors périmètre futur

Peuvent faire l’objet d’une RFC ultérieure :

* fusion de fournisseurs en doublon
* score de similarité avancé
* enrichissement SIREN / TVA / annuaire
* vue détail fournisseur enrichie
* badges de qualité de donnée
* détection serveur de doublons plus robuste

---

# 22. Résumé de décision

Cette RFC introduit un **pattern UX transverse** pour les fournisseurs :

* **autocomplete**
* **quick-create**
* **anti-doublons UX**
* **réutilisable dans tous les formulaires**

Elle améliore fortement la fluidité de saisie, tout en restant strictement compatible avec les principes de Starium Orchestra : **cockpit, multi-client, API-first, backend source de vérité**.  
