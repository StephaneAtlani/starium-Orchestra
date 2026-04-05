/**
 * Indique si l’URL courante correspond à une entrée du menu Équipes (sidebar).
 * Utilisé pour le surlignage actif et les tests de non-régression.
 */
export function isEquipesDropdownChildActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === '/teams/skills') {
    return pathname === '/teams/skills' || pathname.startsWith('/teams/skills/');
  }
  if (href === '/teams/time-entries/options') {
    return (
      pathname === '/teams/time-entries/options' ||
      pathname.startsWith('/teams/time-entries/options/')
    );
  }
  if (href === '/teams/time-entries') {
    const onTimeEntries =
      pathname === '/teams/time-entries' || pathname.startsWith('/teams/time-entries/');
    if (!onTimeEntries) return false;
    return !pathname.startsWith('/teams/time-entries/options');
  }
  if (href === '/teams/structure/teams') {
    return (
      pathname.startsWith('/teams/structure') &&
      !pathname.startsWith('/teams/skills')
    );
  }
  return false;
}
