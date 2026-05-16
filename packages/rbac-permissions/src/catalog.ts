export const SCOPED_READ_MODULES = [
  'budgets',
  'projects',
  'contracts',
  'procurement',
  'strategic_vision',
] as const;

export type ScopedReadModule = (typeof SCOPED_READ_MODULES)[number];

export const MANAGE_ALL_IMPLIES_DELETE_MODULES = ['projects', 'contracts'] as const;

export function satisfiesPermission(
  userCodes: ReadonlySet<string>,
  requiredCode: string,
  _context?: unknown,
): boolean {
  if (userCodes.has(requiredCode)) return true;

  for (const m of SCOPED_READ_MODULES) {
    if (requiredCode === `${m}.read` && userCodes.has(`${m}.read_all`)) {
      return true;
    }
  }

  for (const m of MANAGE_ALL_IMPLIES_DELETE_MODULES) {
    if (requiredCode === `${m}.delete` && userCodes.has(`${m}.manage_all`)) {
      return true;
    }
  }

  return false;
}
