# RFC-ACL-012 — Commercialisation et reporting licences

## Statut

📝 Draft

## 1. Analyse de l’existant

Le modèle licences/abonnements produit des données commerciales critiques (consommation, modes non facturables, essais, support), mais aucun reporting unifié n’est encore défini.

## 2. Hypothèses éventuelles

- Les indicateurs s’appuient sur les données consolidées des RFC-ACL-001/002/009.
- Le reporting plateforme est multi-client et réservé aux rôles plateforme.
- Les exports sont nécessaires pour finance/revenue ops.

## 3. Liste des fichiers à créer / modifier

- `apps/api/src/modules/license-reporting/*`
- `apps/api/src/modules/licenses/*`
- `apps/web/src/features/license-reporting/*`
- `docs/API.md`

## 4. Implémentation complète

- Exposer KPIs commerciaux :
  - licences consommées par client ;
  - abonnements actifs/suspendus/expirés ;
  - évaluations actives/expirées ;
  - licences non facturables et support interne.
- Ajouter vues temporelles (mensuel) pour suivre trajectoire de consommation.
- Ajouter exports CSV/JSON pour pilotage commercial.
- Ajouter filtres par client, période, mode de licence.

## 5. Modifications Prisma si nécessaire

- Aucune structure obligatoire initiale.
- Optionnel : table d’agrégats journaliers si la volumétrie rend les requêtes temps réel coûteuses.

## 6. Tests

- cohérence des agrégats avec données sources.
- filtres client/période corrects.
- exclusion des clients hors scope autorisé.
- export retourne les mêmes chiffres que l’UI.

## 7. Récapitulatif final

Cette RFC transforme la couche licences en capacité business mesurable, exploitable pour facturation et pilotage de la croissance.

## 8. Points de vigilance

- Définir un dictionnaire KPI canonique pour éviter des divergences de calcul.
- Aligner la sémantique “actif/expiré/en grâce” entre produit et finance.
- Prévoir des indexes ou pré-agrégations si dataset large.
