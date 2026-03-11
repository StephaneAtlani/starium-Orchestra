import type { LucideIcon } from 'lucide-react';

export type NavigationItem = {
  label: string;
  href: string;
  icon?: LucideIcon;
  scope: 'platform' | 'client';
  moduleCode?: string;
  requiredPermissions?: string[];
  /** Visible uniquement si user.platformRole === 'PLATFORM_ADMIN'. */
  platformOnly?: boolean;
  /** Visible uniquement si activeClient.role === 'CLIENT_ADMIN'. */
  clientAdminOnly?: boolean;
};

export type NavigationSection = {
  section: string;
  items: NavigationItem[];
};

export const navigation: NavigationSection[] = [
  {
    section: 'Cockpit',
    items: [
      {
        label: 'Dashboard',
        href: '/dashboard',
        scope: 'client',
      },
    ],
  },
  {
    section: 'Administration plateforme',
    items: [
      {
        label: 'Clients',
        href: '/admin/clients',
        scope: 'platform',
        platformOnly: true,
      },
      {
        label: 'Utilisateurs',
        href: '/admin/users',
        scope: 'platform',
        platformOnly: true,
      },
      {
        label: 'Audit logs',
        href: '/admin/audit',
        scope: 'platform',
        platformOnly: true,
      },
    ],
  },
  {
    section: 'Compte',
    items: [
      {
        label: 'Compte',
        href: '/account',
        scope: 'client',
      },
    ],
  },
];

