-- Défauts plateforme badges UI — alignés sur apps/web/src/lib/ui/badge-registry.ts et prisma/default-platform-ui-badge-config.json
UPDATE "PlatformUiBadgeSettings"
SET
  "badgeConfig" = '{"projectTaskStatus":{"DRAFT":{"label":"Brouillon","palette":"stone","surface":"pastel","textColor":"auto"},"TODO":{"label":"À faire","palette":"indigo","surface":"pastel","textColor":"auto"},"IN_PROGRESS":{"label":"En cours","palette":"sky","surface":"pastel","textColor":"auto"},"BLOCKED":{"label":"Bloquée","palette":"red","surface":"pastel","textColor":"auto"},"DONE":{"label":"Terminée","palette":"emerald","surface":"pastel","textColor":"auto"},"CANCELLED":{"label":"Annulée","palette":"stone","surface":"pastel","textColor":"auto"}},"projectTaskPriority":{"LOW":{"label":"Basse","palette":"neutral","surface":"pastel","textColor":"auto"},"MEDIUM":{"label":"Moyenne","palette":"indigo","surface":"pastel","textColor":"auto"},"HIGH":{"label":"Haute","palette":"amber","surface":"pastel","textColor":"auto"},"CRITICAL":{"label":"Critique","palette":"red","surface":"pastel","textColor":"auto"}}}'::jsonb,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'default';
