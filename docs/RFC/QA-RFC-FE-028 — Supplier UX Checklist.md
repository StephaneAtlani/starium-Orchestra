# QA Checklist — RFC-FE-028 Supplier UX

## Préconditions
- Utilisateur authentifié avec permissions `procurement.read` et `procurement.create`.
- Au moins 2 clients accessibles pour vérifier l’isolation cache multi-client.
- Dialogs à tester:
  - `create-order-dialog`
  - `create-invoice-dialog`

## Scénarios Must
- **Seuil recherche**
  - Ouvrir la liste fournisseur, taper 0/1 caractère.
  - Attendu: message “Tapez au moins 2 caractères”, aucune requête fournisseur.
- **Recherche + clavier**
  - Taper 2+ caractères.
  - Attendu: chargement puis résultats.
  - Flèches haut/bas changent l’item actif, Enter sélectionne, Escape ferme.
- **Anti-doublons**
  - Taper un nom proche d’un fournisseur existant (ex. casse différente / espaces multiples).
  - Attendu: bloc “Fournisseur similaire trouvé” (max 1-3 suggestions).
  - “Utiliser ce fournisseur” sélectionne l’existant.
  - “Créer quand même” ouvre le quick-create avec nom prérempli.
- **Quick-create succès**
  - Créer un nouveau fournisseur depuis le dialog quick-create.
  - Attendu: fournisseur auto-sélectionné dans le formulaire; cohérence texte + sélection.
  - Rouvrir la liste: le nouveau fournisseur apparaît (invalidation cache OK).
- **Quick-create erreur**
  - Soumettre un nom invalide/forcé en erreur backend.
  - Attendu: message d’erreur visible, dialog conservé ouvert, pas de sélection incohérente.

## Multi-client / cache
- Créer un fournisseur dans Client A.
- Basculer vers Client B.
- Attendu: aucun fournisseur de A visible dans B.
- Revenir à A: fournisseur créé visible dans A.

## Edge cases UI
- Taper rapidement, ouvrir/fermer la liste, retaper.
  - Attendu: pas de sélection fantôme, pas de hint incohérent avec la saisie courante.
- Enter alors qu’un hint est visible.
  - Attendu: Enter agit sur l’option active de la listbox (pas sur un bouton du hint).

