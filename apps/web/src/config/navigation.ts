import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  LayoutDashboard,
  Settings,
  Shield,
  Users,
  FileText,
  UserCircle,
  Wallet,
} from 'lucide-react';

export type NavigationItem = {
  label: string;
  /** Lien direct ; absent si l’item a des children (dropdown). */
  href?: string;
  icon?: LucideIcon;
  scope: 'platform' | 'client';
  moduleCode?: string;
  requiredPermissions?: string[];
  /** Visible uniquement si user.platformRole === 'PLATFORM_ADMIN'. */
  platformOnly?: boolean;
  /** Visible uniquement si activeClient.role === 'CLIENT_ADMIN'. */
  clientAdminOnly?: boolean;
  /** Visible uniquement si activeClient.role est dans cette liste (ex. CLIENT_ADMIN, CLIENT_USER). */
  allowedClientRoles?: string[];
  /** Sous-entrées : affichées en dropdown au clic sur l’item. */
  children?: NavigationItem[];
};

export type NavigationSection = {
  section: string;
  items: NavigationItem[];
};

export const navigation: NavigationSection[] = [
  {
    section: 'Home',
    items: [
      {
        label: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        scope: 'client',
      },
    ],
  },
  {
    section: 'Finance',
    items: [
      {
        label: 'Budgets',
        icon: Wallet,
        scope: 'client',
        moduleCode: 'budgets',
        requiredPermissions: ['budgets.read'],
        allowedClientRoles: ['CLIENT_ADMIN', 'CLIENT_USER'],
        children: [
          { label: 'Dashboard', href: '/budgets/dashboard', scope: 'client', requiredPermissions: ['budgets.read'] },
          { label: 'Budget', href: '/budgets', scope: 'client', requiredPermissions: ['budgets.read'] },
          { label: 'Configuration', href: '/budgets/configuration', scope: 'client', requiredPermissions: ['budgets.read'] },
        ],
      },
    ],
  },
  {
    section: 'Platform',
    items: [
      {
        label: 'Clients',
        href: '/admin/clients',
        icon: Building2,
        scope: 'platform',
        platformOnly: true,
      },
      {
        label: 'Utilisateurs',
        href: '/admin/users',
        icon: Users,
        scope: 'platform',
        platformOnly: true,
      },
      {
        label: 'Audit logs',
        href: '/admin/audit',
        icon: FileText,
        scope: 'platform',
        platformOnly: true,
      },
    ],
  },
  {
    section: 'Account',
    items: [
      {
        label: 'Compte',
        href: '/account',
        icon: UserCircle,
        scope: 'client',
      },
    ],
  },
  {
    section: 'Administration client',
    items: [
      {
        label: 'Administration',
        href: '/client/administration',
        icon: Settings,
        scope: 'client',
        clientAdminOnly: true,
      },
    ],
  },
  {
    section: 'Security',
    items: [
      {
        label: 'RBAC test',
        href: '/rbac-test',
        icon: Shield,
        scope: 'client',
        platformOnly: true,
      },
    ],
  },
];

