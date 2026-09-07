# Note d’arbitrage — RFC-PROJ-013-3

**Objet** : décisions D1–D7 pour le module Point projet.  
**Date** : 2026-09-07 · **RFC** : [RFC-PROJ-013-3](./RFC-PROJ-013-3%20—%20Cohérence%20Point%20projet%20(CR,%20snapshot,%20lecture,%20UX).md)

---

## Ce qui démarre sans vous

| Lot | Contenu | Prérequis |
| --- | --- | --- |
| **0** | Golden HTML normalisé du CR actuel + procédure dump | Aucun |
| **A** | Fix type RETEX, libellé budget FULL, indicateurs en clair | Aucun comité |
| **A seed** | Mapping projet↔ligne budgétaire cohérent | **Dump ops** avant le script — owner : responsable préprod / DSI produit |

→ Démo visuelle propre possible **sans réunion**, sauf antivirus e-commerce (dump requis).

---

## Décisions

| # | Question | Options | Recommandation | Impact si silence |
| --- | --- | --- | --- | --- |
| **D1** | Routes `/reviews/` → `/points/` ? | (a) Labels FR seuls (b) Alias + redirect (c) Rename breaking | **(a)** | Lot D labels seuls |
| **D2** | Contexte projet dans le mail CR ? | (a) Annexe (b) Lien app seul (c) En tête | **(a)** | Lot B démarre ; réordre gratuit plus tard |
| **D3** | Statut « À valider » avant finalisé ? | (a) Non — preview obligatoire (b) Oui, nouvel enum | **(a)** | Lot E |
| **D4** | Types visibles en UI ? | (a) Enum large (b) COPIL / Ad hoc / RETEX seulement | **(a)** | C5 n’attend pas |
| **D5** | Présence obligatoire à finalize ? | (a) Warning (b) Block | **(a)** | Lot D |
| **D6** | Stocker le HTML exact envoyé ? | (a) Oui (b) Non | **(a)** | Lot B livre le stockage + rétention/purge RGPD |
| **D7** | Météo obligatoire à finalize ? | (a) Oblig. COPIL/CODIR, facult. ad hoc (b) Oblig. partout (c) Facultative ; CR « non renseignée » | **(c)** | Lot C = retrait overlay, **pas** de hard-block (cohérent D5=a) |

---

## Points durs à trancher en séance

1. **D7** — seul vrai débat produit. (c) = honnête et court. (a) = discipline COPIL sans casser l’ad hoc. (b) = casse le point 10 minutes.
2. **D2** — cosmétique ; valider (a) en 30 secondes.
3. **D6** — (a) recommandé : l’aperçu doit pouvoir montrer *ce qui a été envoyé*, pas un hash.

Le reste peut être noté « défaut RFC » sans discussion.

---

## Après le comité

| Décision | Lot débloqué / ajusté |
| --- | --- |
| D2, D6 (défauts OK) | Lot B tel quel |
| D7=c | C7b = 10 lignes (fin overlay) |
| D7=a ou b | + gate météo typé ou global |
| D1, D5 | Lot D |
| D3, D4 | Lot E / C5 déjà couvert |

**Ne pas attendre le comité pour Lot 0.**
