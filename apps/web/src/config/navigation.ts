import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Building2,
  Boxes,
  Cloud,
  Handshake,
  FolderKanban,
  LayoutDashboard,
  Settings,
  Shield,
  Users,
  FileText,
  Scale,
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
    section: 'Pilotages',
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
      {
        label: 'Projets',
        icon: FolderKanban,
        scope: 'client',
        moduleCode: 'projects',
        requiredPermissions: ['projects.read'],
        allowedClientRoles: ['CLIENT_ADMIN', 'CLIENT_USER'],
        children: [
          {
            label: 'Portefeuille projet',
            href: '/projects',
            scope: 'client',
            requiredPermissions: ['projects.read'],
          },
          {
            label: 'Option',
            href: '/projects/options',
            scope: 'client',
            requiredPermissions: ['projects.read'],
          },
          {
            label: 'Plans d’action',
            href: '/action-plans',
            scope: 'client',
            requiredPermissions: ['projects.read'],
          },
        ],
      },
      {
        label: 'Risques',
        href: '/risks',
        icon: AlertTriangle,
        scope: 'client',
        moduleCode: 'projects',
        requiredPermissions: ['projects.read'],
        allowedClientRoles: ['CLIENT_ADMIN', 'CLIENT_USER'],
      },
      {
        label: 'Fournisseurs',
        icon: Handshake,
        scope: 'client',
        moduleCode: 'procurement',
        requiredPermissions: ['procurement.read'],
        allowedClientRoles: ['CLIENT_ADMIN', 'CLIENT_USER'],
        children: [
          {
            label: 'Dashboard',
            href: '/suppliers/dashboard',
            scope: 'client',
            requiredPermissions: ['procurement.read'],
          },
          {
            label: 'Fournisseurs',
            href: '/suppliers',
            scope: 'client',
            requiredPermissions: ['procurement.read'],
          },
          {
            label: 'Contacts',
            href: '/suppliers/contacts',
            scope: 'client',
            requiredPermissions: ['procurement.read'],
          },
        ],
      },
    ],
  },
  {
    section: 'Organisation',
    items: [
      {
        label: 'Ressources',
        href: '/resources',
        icon: Boxes,
        scope: 'client',
        moduleCode: 'resources',
        requiredPermissions: ['resources.read'],
        allowedClientRoles: ['CLIENT_ADMIN', 'CLIENT_USER'],
      },
      {
        label: 'Conformité',
        href: '/compliance/dashboard',
        icon: Scale,
        scope: 'client',
        moduleCode: 'compliance',
        requiredPermissions: ['compliance.read'],
        allowedClientRoles: ['CLIENT_ADMIN', 'CLIENT_USER'],
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
        label: 'Rôles système',
        href: '/admin/system-roles',
        icon: Shield,
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
      {
        label: 'Microsoft 365 (plateforme)',
        href: '/admin/microsoft-settings',
        icon: Cloud,
        scope: 'platform',
        platformOnly: true,
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

