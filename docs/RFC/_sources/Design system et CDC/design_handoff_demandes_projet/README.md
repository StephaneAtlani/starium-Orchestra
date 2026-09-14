# Handoff : Demandes de projet (module amont du portefeuille — Starium)

> Les fichiers de ce dossier sont des **références design** réalisées en HTML/CSS/JS : des prototypes qui montrent l'apparence et le comportement attendus, **pas du code de production à copier**. La tâche est de **recréer ces écrans dans l'environnement du codebase cible** (React, Vue, Angular, SwiftUI, natif…) avec ses patterns et ses librairies existants. Si aucun environnement n'existe encore, choisir le framework le plus adapté et y implémenter les designs.

## Fidélité

**Haute fidélité (hifi).** Couleurs, typographie, espacements, densité, libellés et messages sont définitifs. L'implémentation doit être fidèle au pixel, en s'appuyant sur les composants existants du codebase (tableau, modale, badge, champ de formulaire, toast) plutôt que sur du CSS ad hoc.

## Vue d'ensemble

Le module est le **point d'entrée unique des besoins métiers** dans un portail de pilotage de portefeuille projets. Un demandeur décrit un besoin ; la demande suit un circuit de validation **configurable** ; elle passe — ou non — en **cycle de pilotage** (comité) selon des seuils budgétaires ; une fois validée elle **devient un projet** du portefeuille, sans ressaisie.

Objectifs produits :
1. Aucune demande perdue : liste exhaustive, historique complet, statuts terminaux visibles.
2. Routage automatique : le circuit est **calculé**, jamais choisi à la main.
3. Traçabilité d'audit : journal en append seul (qui a décidé quoi, quand).

## Source de vérité

| Fichier | Contenu |
|---|---|
| `Demandes de projet - Cahier des charges.html` | **Le document de spécification** : 13 pages (A4 paysage) — circuit, statuts, 7 écrans annotés zone par zone sur captures réelles, liaisons inter-modules, modèle de données, messages, 24 critères de recette. À lire en premier. |
| `screenshots/dp/*.png` | Captures de référence des 7 écrans (les mêmes que celles annotées dans le cahier des charges). |
| `reference-code/demandes.js` | Prototype fonctionnel complet : données de démo, règles de routage, transitions d'état, rendu des écrans. **Lire la logique, pas la copier** (rendu par concaténation de chaînes, adapté au prototype). |
| `reference-code/demandes.css` | Styles spécifiques du module (classes `dem-*`), à retranscrire dans le système de styles du codebase. |
| `reference-code/tokens.css` | Tokens du design system Starium (couleurs, typo, espacements, rayons, ombres). |

Le design system complet (composants, charte, logos, fonte) est livré séparément dans `design_handoff_starium/`.

## Écrans

### A1 — Liste des demandes (`screenshots/dp/list.png`)
**But :** répondre en un regard à « qu'est-ce qui attend une action de ma part », « qu'est-ce qui part en comité », « combien est engagé dans l'entonnoir ».

**Layout :** page pleine largeur, conteneur max 1440 px centré, padding 28px 32px.
- En-tête : titre `h1` 28px/700 + sous-titre 13.5px `--neutral-600` (max 62ch) à gauche ; à droite deux boutons (secondaire « Configuration du circuit », primaire « Nouvelle demande »), gap 12px.
- Rangée de 4 cartes KPI : `grid-template-columns: repeat(4,1fr)`, gap 16px. Chaque carte : icône 40×40 rayon 11px sur fond teinté + label 11px/700 uppercase `--neutral-500`, valeur 26px/800 tabular-nums, sous-ligne 11.5px colorée dans la teinte de la carte.
- Carte tableau : barre d'outils (recherche 320px max avec icône loupe à gauche, segments Toutes / En circuit / Terminées, rappel du seuil aligné à droite, 12px `--neutral-500`), puis tableau.
- Colonnes : Réf. · Demande · Type · Demandeur · Budget estimé (aligné à droite) · Circuit · Statut · chevron.
- Ligne : hauteur ~64px, `padding: 13px 14px`, séparateur 1px `--neutral-100`, hover `--neutral-50`, curseur pointer.
- Sous la carte : 3 encarts de règles (`repeat(3,1fr)`, gap 14px) — seuil de passage, étapes actives, exemptions.

**Composants :**
- *Badge de type* : pilule 4px 9px, rayon 999px, 11.5px/700, paires fond/texte : Transformation `#FBEAB5`/`#A06800`, Infrastructure `#E8F0FC`/`#2A6FDB`, Réglementaire `#E6F4EE`/`#1F8A5B`, Produit & innovation `#F0E9FB`/`#6B2FB2`, Évolution applicative `#E3F4F1`/`#0F7D72`.
- *Badge de circuit* : icône horloge + « COPIL »/« CODIR » sur `--brand-gold-050`, ou icône coche + « Hors cycle » sur `--neutral-100`/`--neutral-600`.
- *Badge de statut* : pastille 6px + libellé, palette d'état du DS (neutral, info, gold, success, warn, danger).
- *Badge collaborateur* : cercle 26px (`av-sm`), initiales 9.5px/800 uppercase, couleur de fond dérivée du nom, **photo en `object-fit: cover` si connue**, suivi du nom 12.5px/600.

**États :** liste vide filtrée → « Aucune demande ne correspond à ce filtre. » centré, 40px de padding, 13px `--neutral-500`.

### A2 — Nouvelle demande / formulaire (`screenshots/dp/form.png`)
**But :** faire décrire un besoin en langage métier, et **montrer** le circuit qui s'appliquera.

**Layout :** `grid-template-columns: minmax(0,1fr) 320px`, gap 16px ; sous 1180px → une colonne.
- Colonne principale, sections séparées par 1px `--neutral-100` (padding 20px, titre de section 11px/800 uppercase `--neutral-500`) :
  1. **Nature de la demande** — 5 cartes de type sur 2 colonnes : icône 40×40 teintée, nom 13.5px/700, description 11.5px `--neutral-500`, pastille de sélection à droite ; sélection = bordure `--brand-gold` + fond `--brand-gold-050`.
  2. **Identification** — Intitulé* (pleine largeur), Direction demandeuse* + Demandeur (2 colonnes), Sponsor pressenti.
  3. **Besoin & objectifs** — Situation actuelle et besoin* (textarea 4 lignes), Objectifs visés (textarea 3 lignes, une ligne = un objectif), Bénéfices attendus (2 lignes).
  4. **Cadrage estimatif** — Budget estimé (€)* + Charge interne (j·h) + Échéance (date) sur 3 colonnes, puis Priorité demandée en 3 pilules (Haute / Moyenne / Basse, défaut Moyenne).
  - Pied : « Enregistrer en brouillon » (secondaire) et « Soumettre la demande » (primaire), alignés à droite, gap 12px.
- Colonne de droite, **carte sticky** « Circuit qui sera appliqué » : timeline verticale des étapes (puce 17px, ligne de liaison 1.5px `--neutral-100`, libellé 12.5px/700 + acteur 11.5px `--neutral-500`), puis 3 lignes clé/valeur (Type, Budget estimé, Cycle de pilotage : « Requis · COPIL » en `--brand-gold-700` ou « Non requis » en `--neutral-600`), puis une note explicative 11.5px avec icône info.

**Validation :** Intitulé et Direction demandeuse bloquants (toast d'erreur, aucune création). Budget vide = 0 (routage hors cycle). Lignes d'objectifs vides ignorées. Initiales du demandeur déduites du nom.

**Comportement clé :** le panneau de droite se recalcule **à chaque frappe** sur le type et le budget — franchir le seuil ajoute visiblement l'étape d'arbitrage.

### A3 — Fiche d'une demande (`screenshots/dp/fiche.png`)
**But :** le dossier lu en comité, et l'unique endroit d'où l'on fait avancer la demande.

**Layout :**
- Barre de retour : bouton secondaire « Toutes les demandes » + référence et date de dépôt 12.5px `--neutral-500`.
- **Hero** (carte, padding 22px 24px, flex, wrap) : icône de type 50×50 rayon 13px ; bloc central `flex: 1 1 340px; min-width: 0` (titre 21px/800, ligne de méta : badge de statut, badge de type, direction, badge demandeur, badge sponsor) ; actions à droite (`margin-left:auto`, passent à la ligne sous 1100px) — **jamais plus de deux boutons**.
- **Stepper de circuit** : bande `--neutral-50`, rayon `--radius-lg`, padding 6px, étapes `flex:1; min-width:132px`, gap 6px, scroll horizontal si besoin. Étape franchie = fond `--state-success-bg` + puce verte à coche ; étape courante = fond blanc, bordure 1.5px `--brand-gold`, ombre 1, puce or numérotée ; étape restante = neutre ; étape sautée = opacité .5 + libellé barré ; étape en échec = fond `--state-danger-bg` + puce rouge à croix.
- **Corps** : `grid-template-columns: minmax(0,1.55fr) minmax(0,1fr)`, gap 16px (une colonne sous 1180px).
  - Gauche : Besoin exprimé (13.5px/1.65), Objectifs visés (liste à coches vertes 15px), Bénéfices attendus, Cadrage estimatif (4 tuiles `--neutral-50` rayon md : label 11px/700 + valeur 15px/800 tabular-nums).
  - Droite : **panneau de décision** (titre = où l'on en est, sous-titre explicatif, 4 lignes clé/valeur : circuit appliqué, validation N+1, instruction PMO, séance d'arbitrage ; note avec lien vers la configuration) puis **journal** (timeline inversée : libellé 12.5px/700, auteur + date 11.5px `--neutral-500` précédés du badge de la personne ; **pas de badge quand l'auteur est un comité**).

**Actions par statut :** Brouillon → Modifier / Soumettre · Soumise → Refuser / Valider (N+1) · En instruction → Conclure l'instruction · En cycle sans séance → Inscrire à l'ordre du jour · En cycle avec séance → Voir le cycle / Enregistrer la décision · Validée → Créer le projet · Projet créé → Ouvrir le projet · Refusée / Ajournée → Rouvrir la demande.

### A4 — Configuration du circuit (modale, `screenshots/dp/config.png`)
Modale 660px. Trois champs numériques (Seuil COPIL, Seuil CODIR, Délai d'instruction en jours) ; trois interrupteurs (Validation N+1, Instruction PMO, Création automatique du projet) avec libellé 13px/700 + explication 11.5px ; pilules de types exemptés (multi-sélection) ; note de portée. Pied : Annuler / Enregistrer la configuration. **Rien n'est appliqué avant l'enregistrement.**

Interrupteur : 42×24px, rayon 999px, `--neutral-200` → `--brand-gold` actif, pastille blanche 18px translatée de 18px, transition 140ms.

### A5 — Conclusion de l'instruction (modale, `screenshots/dp/instruction.png`)
Avis du PMO en 3 pilules (Favorable / Réservé / Défavorable) ; Budget retenu (€) + Charge retenue (j·h) sur 2 colonnes, préremplis avec l'estimation ; Synthèse d'instruction (textarea) ; **bandeau de routage recalculé à chaque frappe** sur le budget : « Avec 260 k€, la demande passera en arbitrage **CODIR** (seuil 50 k€ / CODIR 250 k€) » ou « …sera **validée hors cycle de pilotage** ». Avis défavorable → le bandeau annonce le refus.

### A6 — Inscription à l'ordre du jour (modale, `screenshots/dp/odj.png`)
Séance (select alimenté par les séances à venir des modules Cycles de pilotage et Réunions, celles de l'instance requise en tête) ; Type de point (Décision Go / No Go, Arbitrage budgétaire, Information) ; Temps demandé (10/15/20/30 min, défaut 15). Sans séance planifiée : option unique « Aucune séance planifiée », inscription impossible.

### A7 — Décision du comité (modale, `screenshots/dp/decision.png`)
Sous-titre = libellé de la séance. Issue en 3 pilules (Validée / Ajournée / Refusée) ; Motivation / conditions (textarea, attendue pour un ajournement ou un refus). L'enregistrement écrit la décision au journal **et** dans le registre de décisions de la séance.

## Règles métier — le cœur du module

```
needsCycle(demande) = !exempt.includes(demande.type) && demande.budget >= seuilCopil
instance(demande)   = !needsCycle ? null : (budget >= seuilCodir ? 'CODIR' : 'COPIL')

étapes = [Soumission]
       + (n1    ? [Validation N+1] : [])
       + (instr ? [Instruction PMO] : [])
       + [ needsCycle ? Arbitrage <instance> : Validation PMO (hors cycle) ]
       + [Création du projet]
```

- Le circuit n'est **jamais stocké** : il est recalculé à partir du type, du budget et de la configuration en vigueur. Changer un seuil ne réécrit aucun historique ; seul le **circuit restant** change.
- Soumission et Création du projet ne sont pas désactivables (circuit minimal : soumission → validation PMO → création).
- Un avis d'instruction défavorable refuse la demande et marque l'étape d'instruction en échec (`koAt`).
- Création automatique activée : un arbitrage (ou une validation hors cycle) favorable crée le projet sans action manuelle.

### Machine à états

| Statut | Acteur | Transition |
|---|---|---|
| `brouillon` | Demandeur | Soumettre → `soumise` (si N+1) sinon `instruction` sinon `cycle` |
| `soumise` | Responsable de direction | Valider → `instruction` ou `cycle` · Refuser → `refusee` |
| `instruction` | PMO | Avis favorable/réservé → `cycle` ou `validee` · Défavorable → `refusee` |
| `cycle` | PMO puis comité | Inscrire (séance) · Décision → `validee` / `ajournee` / `refusee` |
| `validee` | PMO | Créer le projet → `projet` |
| `projet` | — | Terminal (lecture seule, renvoi vers la fiche projet) |
| `ajournee` / `refusee` | PMO | Rouvrir → `brouillon` (séance détachée, journal conservé) |

## Modèle de données

```ts
type Demande = {
  id: string;            // "DP-2026-018", jamais réutilisé
  t: string;             // intitulé (obligatoire)
  type: 'transformation' | 'infra' | 'reglementaire' | 'produit' | 'evolution';
  dir: string;           // direction demandeuse (obligatoire)
  who: string;           // demandeur
  sponsor: string;       // "Marc Delaunay — DSI"
  date: string;          // ISO, date de dépôt
  need: string;          // situation actuelle et besoin
  obj: string[];         // objectifs visés
  benef: string;         // bénéfices attendus
  budget: number;        // € — variable de routage
  charge: number;        // jours·homme
  deadline: string;      // ISO
  prio: 'haute' | 'moyenne' | 'basse';
  st: 'brouillon'|'soumise'|'instruction'|'cycle'|'validee'|'projet'|'ajournee'|'refusee';
  koAt?: 'sub'|'n1'|'ins'|'arb';   // étape d'échec
  instance?: 'COPIL' | 'CODIR' | null;
  seance?: string | null;          // libellé de la séance
  seanceRef?: string | null;       // identifiant du point créé dans le module cible
  proj?: string;                   // projet créé
  jrn: Array<[libelle: string, auteur: string, date: string]>;  // append seul
};

type CircuitConfig = {   // objet unique, portée organisation
  seuilCopil: number;    // défaut 50_000
  seuilCodir: number;    // défaut 250_000  (> seuilCopil)
  delai: number;         // jours ouvrés d'instruction, défaut 10
  n1: boolean;           // validation hiérarchique, défaut true
  instr: boolean;        // instruction PMO, défaut true
  autoProj: boolean;     // création automatique du projet, défaut false
  exempt: string[];      // types exemptés, défaut ['reglementaire']
};
```

Toute modification de la configuration doit être datée et attribuée (pour expliquer un routage passé).

## Liaisons inter-modules

| Module | Sens | Contenu |
|---|---|---|
| Cycles de pilotage | lecture | Instances et séances à venir avec leur type (COPIL / CODIR / COPROJ) |
| Cycles de pilotage | écriture | Point ajouté à l'ordre du jour (type de point + minutage) ; arbitrage rendu ajouté au relevé |
| Réunions | écriture | Point d'ordre du jour et décision rattachés à la réunion choisie |
| Portefeuille projets | écriture | Ligne projet à l'état « Cadrage », progression 0 %, sous-ligne « Issu de la demande DP-… » |
| Plans d'action | écriture | Plan du projet + action « Cadrer le projet et désigner le chef de projet » |
| Budget | écriture | Budget retenu transmis comme enveloppe à engager (aucune ligne de dépense) |
| Ressources / annuaire | lecture | Nom, direction, photo des collaborateurs pour les badges |

Chaînage d'audit obligatoire : le projet garde la référence de sa demande, la demande garde le lien vers son projet.

## État applicatif

- `demandes: Demande[]` — liste, filtres dérivés (`all` / `circuit` / `done`), recherche plein texte sur intitulé + direction + demandeur + référence.
- `config: CircuitConfig` — chargée au niveau organisation.
- `selection: id | null` — liste vs fiche.
- `form` — brouillon en cours d'édition ; l'aperçu du circuit est **dérivé** (aucune duplication d'état).
- `modales` — configuration, ordre du jour, instruction, décision (une seule ouverte à la fois, fermeture par croix / Annuler / clic sur le fond, sans effet).
- Notifications : toast unique en bas, messages exacts listés dans le cahier des charges (page « Comportements et messages »).

## Tokens utilisés

Couleurs (voir `reference-code/tokens.css` pour l'ensemble) : `--brand-gold #E8A317`, `--brand-gold-700`, `--brand-gold-050 #FBEAB5`, `--brand-ink #0E0E10`, `--neutral-0/50/100/200/500/600/700`, `--state-success #1F8A5B`, `--state-warning #C77A00`, `--state-danger #B42318`, `--state-info #2A6FDB`, plus les variantes `-bg`.

Typographie : **Manrope** (variable) pour l'UI — 11px/800 uppercase pour les labels de section, 12.5–13.5px/600–700 pour le corps, 15px/800 pour les valeurs, 21–28px/800 pour les titres. Rayons : `--radius-md` 10px, `--radius-lg` 14px, pilules 999px. Ombres : `--shadow-1` pour les cartes actives. Transitions : 120–140ms.

Accessibilité : contraste ≥ 4.5:1 pour tout texte (les badges utilisent l'encre pleine sur fond teinté, jamais du texte translucide) ; cibles tactiles ≥ 44px sur mobile ; le tableau doit rester utilisable au clavier (ligne focusable, Entrée = ouvrir la fiche).

## Recette

24 critères vérifiables sont listés en dernière page du cahier des charges (circuit & configuration, parcours, création du projet & affichage). Jeu de démonstration de référence fourni dans `reference-code/demandes.js` : 8 demandes couvrant les 8 statuts, dont une réglementaire exemptée à 40 k€, une transformation à 180 k€ inscrite au COPIL, une produit à 260 k€ en instruction (bascule CODIR) et une infrastructure à 310 k€ déjà convertie en projet.

## Assets

Aucune image propre au module : toutes les icônes sont des SVG au trait 1.75 (jeu type Feather) inlinés, à remplacer par la librairie d'icônes du codebase. Logos et fonte Manrope : voir `design_handoff_starium/`.
