import type { LucideIcon } from 'lucide-react';

export type NavigationItem = {
  label: string;
  href: string;
  icon?: LucideIcon;
  scope: 'platform' | 'client';
  moduleCode?: string;
  requiredPermissions?: string[];
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
      },
      {
        label: 'Utilisateurs',
        href: '/admin/users',
        scope: 'platform',
      },
      {
        label: 'Audit logs',
        href: '/admin/audit',
        scope: 'platform',
      },
    ],
  },
];

