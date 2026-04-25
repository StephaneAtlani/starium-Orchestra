/**
 * Préfixes de routes internes autorisées pour `structuredLinks` type INTERNAL_PAGE (RFC-AI-001).
 * Toute `route` doit commencer par l’un de ces préfixes (comparaison sensible à la casse : paths en minuscules attendus).
 */
export const CHATBOT_INTERNAL_ROUTE_PREFIXES: readonly string[] = [
  '/dashboard',
  '/budgets',
  '/projects',
  '/action-plans',
  '/strategic-vision',
  '/risks',
  '/contracts',
  '/procurement',
  '/teams',
  '/collaborators',
  '/compliance',
  '/resources',
  '/activity-types',
  '/admin',
  '/select-client',
  '/chatbot',
  '/rbac-test',
  '/notifications',
];

export function isAllowedInternalPageRoute(route: string): boolean {
  if (!route.startsWith('/')) return false;
  if (route.includes('://')) return false;
  return CHATBOT_INTERNAL_ROUTE_PREFIXES.some(
    (p) => route === p || route.startsWith(`${p}/`),
  );
}
