# RFC-ADM-001 — Référentiels plateforme (Admin Studio)

## Statut

❌ **Abandonnée** (2026-09)

Le livrable (moteur générique `AdminReferenceList` / `AdminReferenceValue`, UI `/admin/reference-lists`) **ne correspondait pas** au besoin métier.

**Remplacement** : [RFC-ADM-002 — Catalogue référentiels conformité (plateforme)](./RFC-ADM-002%20%E2%80%94%20Catalogue%20r%C3%A9f%C3%A9rentiels%20conformit%C3%A9%20(plateforme).md).

### Retrait technique

| Élément | Action |
| --- | --- |
| Module Nest `platform-reference-lists` | Supprimé |
| UI `/admin/reference-lists` | Supprimée |
| Tables `AdminReferenceList` / `AdminReferenceValue` | Drop — migration `20260916213000_drop_platform_reference_lists` |
| API `/api/platform/reference-lists`, `/api/reference-lists/:code` | Plus exposées |

Ne pas réimplémenter ce moteur sans nouvelle RFC.
