import type { AccessModelIssueCategory } from '../api/access-model.api';

export function categoryLabel(category: AccessModelIssueCategory): string {
  switch (category) {
    case 'missing_owner':
      return 'Sans Direction propriétaire';
    case 'missing_human':
      return 'Membre sans ressource HUMAN';
    case 'atypical_acl':
      return 'Partages ACL atypiques';
    case 'policy_review':
      return 'Politiques à revoir';
    default:
      return category;
  }
}

export function moduleLabel(module: string): string {
  const map: Record<string, string> = {
    projects: 'Projets',
    budgets: 'Budgets',
    contracts: 'Contrats',
    procurement: 'Achats / fournisseurs',
    strategic_vision: 'Vision stratégique',
    organization: 'Organisation',
  };
  return map[module] ?? module;
}
