import type { LucideIcon } from 'lucide-react';
import { Eye, ShieldCheck, Users, UsersRound } from 'lucide-react';

export interface AccessCockpitShortcut {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

/**
 * Raccourcis canoniques RFC-ACL-010.
 *
 * Les routes ci-dessous sont la SEULE source officielle d'accès aux écrans
 * CRUD existants. Aucune ancienne URL legacy (ex. `/client/access-groups`)
 * n'est exposée comme lien utilisateur ; elle peut survivre uniquement comme
 * `redirect()` Next.js.
 */
export const ACCESS_COCKPIT_SHORTCUTS: AccessCockpitShortcut[] = [
  {
    href: '/client/administration/access-groups',
    title: "Groupes d'accès",
    description: 'Créer, renommer, gérer les membres des groupes',
    icon: UsersRound,
  },
  {
    href: '/client/administration/module-visibility',
    title: 'Visibilité des modules',
    description: 'Masquer un module pour le client, un groupe, un utilisateur',
    icon: Eye,
  },
  {
    href: '/client/members',
    title: 'Membres',
    description: 'Gérer les utilisateurs rattachés et leurs rôles',
    icon: Users,
  },
  {
    href: '/client/roles',
    title: 'Rôles',
    description: 'Définir les rôles métier et permissions',
    icon: ShieldCheck,
  },
];
