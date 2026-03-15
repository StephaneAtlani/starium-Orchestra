import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  LayoutDashboard,
  Shield,
  Users,
  FileText,
  UserCircle,
  Wallet,
} from 'lucide-react';

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
        href: '/budgets',
        icon: Wallet,
        scope: 'client',
        moduleCode: 'budgets',
        requiredPermissions: ['budgets.read'],
      },
      {
        label: 'Dashboard Budgets',
        href: '/budgets/dashboard',
        icon: Wallet,
        scope: 'client',
        requiredPermissions: ['budgets.read'],
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

