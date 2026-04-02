/**
 * Indique si l’URL courante correspond à une entrée du menu Équipes (sidebar).
 * Utilisé pour le surlignage actif et les tests de non-régression.
 */
export function isEquipesDropdownChildActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === '/teams/skills') {
    return pathname === '/teams/skills' || pathname.startsWith('/teams/skills/');
  }
  if (href === '/teams/collaborators') {
    return pathname === '/teams/collaborators' || pathname.startsWith('/teams/collaborators/');
  }
  if (href === '/teams/assignments') {
    return pathname === '/teams/assignments' || pathname.startsWith('/teams/assignments/');
  }
  if (href === '/teams/structure/teams') {
    return (
      pathname.startsWith('/teams/structure') &&
      !pathname.startsWith('/teams/collaborators') &&
      !pathname.startsWith('/teams/skills')
    );
  }
  return false;
}
