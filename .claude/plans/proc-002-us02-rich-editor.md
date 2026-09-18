# Plan — US-PROC-02 Éditeur riche + brouillon

**RFC** : RFC-PROC-002 · **Feature** : `proc-002-us02-rich-editor`  
**Commit cible** : `feat(procedures): TipTap draft editor with content save`

## Objectif

Rédiger le corps de procédure (brouillon) avec éditeur riche TipTap, persistance `contentJson`, lecture seule si ARCHIVED.

## Décisions figées

1. TipTap (`@tiptap/react` + starter-kit + link) — JSON ProseMirror.
2. `PATCH /api/procedures/:id/draft` body `{ contentJson, expectedUpdatedAt? }` ; 409 si optimistic lock.
3. Nodes whitelist V1 : `doc`, `paragraph`, `heading` (1–3), `bulletList`, `orderedList`, `listItem`, `blockquote`, `text` + marks `bold`/`italic`/`link` (https only).
4. CTA **Enregistrer** + `aria-live` « Enregistré » / erreur (pas d’autosave).
5. ARCHIVED → éditeur `editable={false}`.
6. **Hors scope ce lot** : upload `ProcedureAsset` / images embarquées ; liens internes Orchestra (picker) — reportés en follow-up `proc-002-us02b-assets-links` (sera ajouté au backlog pipeline).

## Fichiers

### API
- `dto/update-procedure-draft.dto.ts`
- `procedures.service.ts` — `updateDraft`
- `procedures.controller.ts` — PATCH `:id/draft`
- validation contentJson (helper)
- tests service

### Web
- deps TipTap dans `apps/web/package.json`
- `features/procedures/components/procedure-rich-editor.tsx`
- `features/procedures/lib/procedure-content.ts` (empty doc, types)
- `app/(protected)/procedures/[id]/edit/page.tsx` — brancher éditeur
- API client `updateProcedureDraft`

## Critères d’acceptation

1. Save draft OK ; rechargement conserve contenu.
2. Permission `procedures.update` ; isolation client.
3. ARCHIVED = lecture seule.
4. Lien externe https only côté marks.
5. Libellés métier UI ; `audit:ui-ids` / `audit:modals` verts.
6. Audit `procedure.draft.updated` (versionId, taille, pas le corps entier).

## By design

RGPD : pas de contenu full en logs · RGAA : toolbar clavier, aria-live save · DS : tokens, bouton Enregistrer · Sécurité : DTO + sanitize nodes · Mobile : toolbar scrollable, CTA ≥ 44px
