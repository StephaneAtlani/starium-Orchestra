# Plan — PROC-005 Lot B — Assets médias image/PDF

**RFC** : RFC-PROC-005 · **Feature** : `proc-005-lot-b-assets-media`  
**US** : US-PROC-11  
**Commit cible** : `feat(procedures): procedure assets upload and media nodes`

## Objectif

Upload / liste / download / delete d’assets procédure (image + PDF), nodes TipTap `procedureImage` / `procedureFile`, whitelist API alignée.

## Décisions figées

1. Réutiliser `ProcurementObjectStorageService.putObject` domaine **`procedures`** (même pattern que `strategie`).
2. Endpoints sous `/api/procedures/:id/assets` (+ `upload`, `:assetId`, `:assetId` download via GET stream).
3. MIME allowlist : `image/png|jpeg|jpg|webp|gif`, `application/pdf`. Taille = `PlatformMaxFileInterceptor`.
4. Nodes :
   - `procedureImage` : `{ assetId, alt }` — **alt** string non vide obligatoire
   - `procedureFile` : `{ assetId, label }` — label métier non vide
5. DELETE asset : **400** si `assetId` encore référencé dans le draft `contentJson` (walk).
6. Image dans éditeur : URL = `/api/procedures/:id/assets/:assetId` (auth cookie/header via img fetch ou blob — **hypothèse** : endpoint stream + FE charge via `authFetch` → object URL pour `src`).
7. Pas de migration Prisma (`ProcedureAsset` existe).
8. **Hors scope** : Mermaid (C), liens internes/modale (D), vidéo embed.

## Fichiers

### API
- `procedures.module.ts` — import storage module
- `procedure-assets.service.ts` (+ tests)
- `procedures.controller.ts` — routes assets **avant** routes ambiguës si besoin
- `procedure-content.util.ts` — nodes + validation assetId format cuid-ish + alt/label
- Audit `procedure.asset.uploaded` / `procedure.asset.deleted`

### Web
- `procedures.api.ts` — upload/list/delete + download blob helper
- TipTap node extensions image/file
- `procedure-media-insert.tsx` + bouton toolbar
- Brancher dans `procedure-rich-editor` / toolbar

## Critères d’acceptation

1. Upload image/PDF OK ; MIME refusé → 422 ; cross-client → 404.
2. Insert image avec alt ; save draft ; reload affiche image.
3. Delete bloqué si référencé.
4. Libellés `label` / `alt` métier ; pas d’ID en UI.
5. Tests service + whitelist ; tsc ; audits UI.

## By design

RGPD : pas de binaire en logs · RGAA : alt obligatoire · DS : toolbar/modale insert · Sécurité : scope client + MIME · Mobile : CTA ≥ 44px

## Verdict review-plan

**GO**
