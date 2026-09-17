# RFC-PROC-004 — Export Word / PDF des procédures avec logo entreprise

Version : 1.0 — 17 septembre 2026

| Métadonnée | Valeur |
| --- | --- |
| **Statut** | 📝 Draft |
| **Parent** | [RFC-PROC-001](./RFC-PROC-001%20—%20Module%20Procédures%20(cadrage%20et%20backlog%20user%20stories).md) |
| **Dépend de** | [RFC-PROC-002](./RFC-PROC-002%20—%20Créer%20éditer%20archiver%20procédures%20et%20contenu%20riche.md) · [RFC-PROC-003](./RFC-PROC-003%20—%20Versioning%20des%20procédures.md) |

---

## 1. Analyse de l'existant

| Capacité | Existant | Écart |
| --- | --- | --- |
| PDF maison | `codir-minimal-pdf.ts` / exports réunions (FE) | Orienté slides paysage ; procédures = document **portrait** A4 |
| Branding report | `project-review-report-branding.helpers.ts` | Réutilise résolution `logoUrl` + couleurs Starium |
| Logo client | Type `ClientBranding.logoUrl` ; pas de stockage unitaire Client systématique | **À créer** : asset logo client + API lecture |
| DOCX | Aucun générateur procédure | Introduire génération serveur (ex. `docx`) |

**Décision d’architecture** : export **côté API** (vérité métier + logo + isolation), téléchargement authentifié. Évite divergence FE et fuites d’assets.

---

## 2. User stories

### US-PROC-07 — Exporter en PDF avec logo client

**En tant qu’** utilisateur avec `procedures.export`,  
**je veux** télécharger la procédure (version choisie) en PDF brandé,  
**afin de** la diffuser en CODIR / audit / impression.

#### Critères d’acceptation

1. Action **Exporter → PDF** depuis fiche ou historique versions.
2. Paramètre : `versionId` (défaut = version publiée courante ; sinon draft si `update` + confirmation « brouillon non publié »).
3. En-tête document :
   - logo client (si configuré) ;
   - nom du client (libellé) ;
   - titre procédure + code ;
   - « Version N » + date de publication (ou « Brouillon »).
4. Corps : rendu fidèle du contenu riche (titres, listes, images inline redimensionnées, liens cliquables).
5. Pied de page : n° de page, confidentialité courte configurable (hypothèse texte fixe V1 : « Document interne — [Nom client] »).
6. Fichier : `Procedure-{code}-v{N}.pdf` (code sanitizé).
7. Si logo absent : en-tête texte seul + message non bloquant en UI (« Logo non configuré ») ; export quand même OK.
8. Audit `procedure.exported` (`format=PDF`, versionNumber).
9. Refus cross-client / sans perm → 403.

### US-PROC-08 — Exporter en Word (.docx) avec logo client

**En tant qu’** utilisateur avec `procedures.export`,  
**je veux** télécharger un `.docx` éditable brandé,  
**afin de** retravailler hors ligne ou annexer à un dossier audit Word.

#### Critères d’acceptation

1. Même règles de version / en-tête / nommage que le PDF (`…docx`).
2. Styles : Titre 1/2, Normal, listes ; logo en header.
3. Images embarquées dans le docx.
4. Liens hypertexte conservés (internes → URL app absolue si résolvable, sinon libellé + mention « lien Orchestra »).
5. Audit `procedure.exported` (`format=DOCX`).
6. Parité fonctionnelle minimale PDF/DOCX sur le même `contentJson` (tests de smoke).

---

## 3. Hypothèses

1. **Logo client** : nouvelle capacité minimale — `Client` (ou `ClientBrandingSettings`) stocke fichier logo (même driver que RFC-035) + `GET/PATCH` admin client. Réutilisé par exports procédures (et futur autres modules).
2. Formats V1 : `PDF` | `DOCX` uniquement (pas PPTX, pas HTML zip).
3. Synchrone si &lt; seuil (ex. 5 Mo contenu + images) ; sinon job BullMQ + notification RFC-038 (P1 si besoin).
4. Pas de watermark dynamique par utilisateur en V1.
5. Rendu PDF serveur : lib adaptée (ex. Playwright/Chromium ou pipeline HTML→PDF **ou** constructeur PDF programmatique). **Hypothèse retenue pour spec** : pipeline **HTML brandé → PDF** côté worker API (qualité typo) ; DOCX via lib `docx`. Choix exact figé à l’implémentation après spike technique ≤ 1 jour.
6. Polices : Manrope ou fallback système embarqué pour PDF (licence OK).

---

## 4. Prérequis logo entreprise

### US support (inclus dans cette RFC)

**En tant qu’** CLIENT_ADMIN,  
**je veux** déposer le logo de mon organisation,  
**afin que** les exports procédures (et futurs exports) soient brandés.

#### Critères

1. UI : Administration client → Branding → upload logo (PNG/SVG/JPEG, max taille).
2. API : `POST /api/clients/active/branding/logo` + `DELETE` + lecture authentifiée.
3. Scope strict client actif ; pas d’URL publique non authentifiée sans signed URL courte durée.
4. RGPD : logo = donnée organisationnelle, pas DCP.

---

## 5. API export

```
POST /api/procedures/:id/export
Permission: procedures.export
Body: {
  "format": "PDF" | "DOCX",
  "versionId": "<optional>"
}
Response: 200 application/pdf | application/vnd.openxmlformats-officedocument.wordprocessingml.document
Headers: Content-Disposition: attachment; filename="..."
```

Erreurs :

- `404` procédure / version hors client
- `400` format invalide / version vide
- `403` perm
- `409` procédure archivée **n’interdit pas** l’export (hypothèse : export autorisé en lecture archive)

---

## 6. Contenu exporté — mapping

| Node éditeur | PDF | DOCX |
| --- | --- | --- |
| heading | styles H1–H3 | Heading 1–3 |
| paragraph / marks | texte | texte |
| bullet / ordered | listes | listes |
| image (asset) | embed | embed |
| link external | URI | hyperlink |
| link internal | URI app + label | hyperlink + label |
| attachment non-image | mention + nom fichier | mention + nom |

Éléments non rendus : ignorer proprement + log debug sans DCP.

---

## 7. Fichiers cibles

### Backend

- `apps/api/src/modules/procedures/procedure-export.service.ts`
- `apps/api/src/modules/procedures/procedure-export.renderer.ts` (HTML/PDF)
- `apps/api/src/modules/procedures/procedure-export.docx.ts`
- `apps/api/src/modules/clients/client-branding-logo.*` (ou sous-module branding)
- tests : `procedure-export.service.spec.ts` (logo present/absent, isolation, formats)

### Frontend

- CTA export sur fiche + versions (`Dropdown` PDF / Word)
- page admin branding logo
- toasts succès / erreur (`aria-live`)

---

## 8. Tests

- Export PDF/DOCX version published OK.
- Export draft uniquement si autorisé.
- Logo injecté quand présent ; absent → pas de 500.
- Isolation : version d’un autre client → 404.
- Nom fichier dérivé du **code** métier, pas de l’id.
- Audit émis une fois par export réussi.

---

## 9. Conformité by design

| Axe | Exigence |
| --- | --- |
| **RGPD** | Export = copie contrôlée dans le tenant ; pas de tracking externe ; logs sans corps ni email |
| **RGAA** | Boutons export labellisés (« Exporter en PDF ») ; progression annoncée si async |
| **DS** | Menu actions cohérent fiches Starium ; pas de styles export hardcodés hors tokens branding report |
| **Sécurité** | Authz export ; assets logo/procédure jamais publics ; validation format ; taille max |
| **Mobile** | CTA export dans menu actions (cible 44px) ; téléchargement géré navigateur |

---

## 10. Points de vigilance

- Spike PDF serveur (dépendance Chromium vs PDF kit) avant lock technique.
- SVG logo : rasteriser pour PDF/DOCX si besoin.
- Liens internes cassés (entité supprimée) : exporter le **label snapshot** + mention « ressource indisponible ».
- Performance images haute résolution : downscale à l’export.

---

## 11. Récapitulatif

Couvre **US-PROC-07 / 08** + prérequis **logo client**. Dépend du contenu riche et du versioning pour exporter une version figée brandée.
