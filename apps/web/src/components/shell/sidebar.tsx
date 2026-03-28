'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { navigation } from '../../config/navigation';
import type { NavigationItem } from '../../config/navigation';
import { useAuth } from '../../context/auth-context';
import { useActiveClient } from '../../hooks/use-active-client';
import { usePermissions } from '../../hooks/use-permissions';
import { PermissionGate } from '../PermissionGate';
import { SidebarSection } from './sidebar-section';
import { SidebarItem } from './sidebar-item';
import {
  SidebarDropdown,
  SidebarDropdownContext,
  SidebarDropdownLayer,
  useSidebarDropdownPanel,
} from './sidebar-dropdown';

function visible(
  item: NavigationItem,
  platformRole: string | null,
  clientRole: string | null,
  has: (code: string) => boolean,
  /** GET /me/permissions a réussi pour le client actif — sans ça on ne montre pas les entrées à permissions. */
  permsSuccess: boolean,
): boolean {
  if (item.platformOnly && platformRole !== 'PLATFORM_ADMIN') return false;
  if (item.clientAdminOnly && clientRole !== 'CLIENT_ADMIN') return false;
  if (item.allowedClientRoles != null) {
    if (clientRole == null || !item.allowedClientRoles.includes(clientRole)) return false;
  }
  if (item.requiredPermissions?.length) {
    if (!permsSuccess) return false;
    for (const code of item.requiredPermissions) {
      if (!has(code)) return false;
    }
  }
  // Fallback de gating module: un item client avec moduleCode
  // n'est visible que si la permission de lecture du module est présente.
  if (item.scope === 'client' && item.moduleCode) {
    if (!permsSuccess) return false;
    if (!has(`${item.moduleCode}.read`)) return false;
  }
  return true;
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { activeClient } = useActiveClient();
  const { panel, contextValue } = useSidebarDropdownPanel();
  const platformRole = user?.platformRole ?? null;
  const clientRole = activeClient?.role ?? null;
  const { has, isSuccess: permsSuccess } = usePermissions();

  return (
    <aside className="starium-sidebar relative z-10 hidden h-full min-h-0 shrink-0 flex-col border-r border-white/10 md:flex">
      <SidebarDropdownContext.Provider value={contextValue}>
        <div className="starium-sidebar-header flex h-14 min-w-0 shrink-0 items-center gap-2 border-b border-white/10 px-4">
          <div className="min-w-0 flex flex-1 flex-col leading-tight">
            <span
              className="starium-sidebar-brand truncate text-sm font-semibold tracking-tight"
              title={activeClient?.name?.trim() || undefined}
            >
              {activeClient?.name?.trim() || 'Starium Orchestra'}
            </span>
            <span className="starium-sidebar-brand-muted text-xs">Cockpit</span>
          </div>
        </div>
        <nav className="starium-sidebar-nav min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {navigation.map((section) => {
          const items = section.items.filter((item) =>
            visible(item, platformRole, clientRole, has, permsSuccess),
          );
          if (items.length === 0) return null;
          return (
            <SidebarSection key={section.section} title={section.section}>
              {items.map((item) => {
                const isBudgets = item.label === 'Budgets';

                if (isBudgets) {
                  const budgetsChildren = [
                    { label: 'Dashboard', href: '/budgets/dashboard' },
                    { label: 'Budget', href: '/budgets' },
                    { label: 'Configuration', href: '/budgets/configuration' },
                  ];

                  const isBudgetChildActive = (href: string) => {
                    if (!pathname) return false;
                    if (href === '/budgets/dashboard') {
                      return pathname === '/budgets/dashboard' || pathname.startsWith('/budgets/dashboard/');
                    }
                    if (href === '/budgets/configuration') {
                      return pathname.startsWith('/budgets/configuration') || pathname.startsWith('/budgets/exercises') || pathname.startsWith('/budgets/imports');
                    }
                    if (href === '/budgets') {
                      if (pathname === '/budgets') return true;
                      if (!pathname.startsWith('/budgets/')) return false;
                      const sub = pathname.slice('/budgets/'.length);
                      const firstSegment = sub.split('/')[0];
                      return !['dashboard', 'configuration', 'exercises', 'imports'].includes(firstSegment);
                    }
                    return false;
                  };

                  return (
                    <SidebarDropdown
                      key="dropdown-budgets"
                      label={item.label}
                      icon={item.icon}
                    >
                      {budgetsChildren.map((child) => {
                        const isActive = isBudgetChildActive(child.href);

                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            role="menuitem"
                            className={cn(
                              'block px-3 py-2 text-sm starium-dropdown-link',
                              isActive && 'starium-dropdown-link-active',
                            )}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </SidebarDropdown>
                  );
                }

                const isProjets = item.label === 'Projets';
                if (isProjets) {
                  const projectsChildren = [
                    { label: 'Portefeuille projet', href: '/projects' },
                    { label: 'Option', href: '/projects/options' },
                  ];

                  const isProjectsChildActive = (href: string) => {
                    if (!pathname) return false;
                    if (href === '/projects/options') {
                      return pathname === '/projects/options' || pathname.startsWith('/projects/options/');
                    }
                    if (href === '/projects') {
                      if (pathname === '/projects') return true;
                      if (pathname.startsWith('/projects/new')) return true;
                      if (pathname.startsWith('/projects/options')) return false;
                      if (pathname.startsWith('/action-plans')) return false;
                      return /^\/projects\/[^/]+/.test(pathname);
                    }
                    return false;
                  };

                  return (
                    <SidebarDropdown
                      key="dropdown-projects"
                      label={item.label}
                      icon={item.icon}
                    >
                      {projectsChildren.map((child) => {
                        const isActive = isProjectsChildActive(child.href);

                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            role="menuitem"
                            className={cn(
                              'block px-3 py-2 text-sm starium-dropdown-link',
                              isActive && 'starium-dropdown-link-active',
                            )}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </SidebarDropdown>
                  );
                }

                const isSuppliers = item.label === 'Fournisseurs';
                if (isSuppliers) {
                  const suppliersChildren = [
                    { label: 'Dashboard', href: '/suppliers/dashboard' },
                    { label: 'Fournisseurs', href: '/suppliers' },
                    { label: 'Contacts', href: '/suppliers/contacts' },
                  ];

                  const isSuppliersChildActive = (href: string) => {
                    if (!pathname) return false;
                    if (href === '/suppliers/dashboard') {
                      return (
                        pathname === '/suppliers/dashboard' ||
                        pathname.startsWith('/suppliers/dashboard/')
                      );
                    }
                    if (href === '/suppliers/contacts') {
                      return (
                        pathname === '/suppliers/contacts' ||
                        pathname.startsWith('/suppliers/contacts/')
                      );
                    }
                    if (href === '/suppliers') {
                      if (pathname === '/suppliers') return true;
                      if (!pathname.startsWith('/suppliers/')) return false;
                      const sub = pathname.slice('/suppliers/'.length);
                      const firstSegment = sub.split('/')[0];
                      return !['dashboard', 'contacts'].includes(firstSegment);
                    }
                    return false;
                  };

                  return (
                    <SidebarDropdown
                      key="dropdown-suppliers"
                      label={item.label}
                      icon={item.icon}
                    >
                      {suppliersChildren.map((child) => {
                        const isActive = isSuppliersChildActive(child.href);

                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            role="menuitem"
                            className={cn(
                              'block px-3 py-2 text-sm starium-dropdown-link',
                              isActive && 'starium-dropdown-link-active',
                            )}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </SidebarDropdown>
                  );
                }

                if (item.href) {
                  const link = (
                    <SidebarItem
                      label={item.label}
                      href={item.href}
                      icon={item.icon}
                    />
                  );
                  if (item.requiredPermissions?.length) {
                    return (
                      <PermissionGate
                        key={item.href}
                        permissions={item.requiredPermissions}
                      >
                        {link}
                      </PermissionGate>
                    );
                  }
                  return (
                    <React.Fragment key={item.href}>
                      {link}
                    </React.Fragment>
                  );
                }

                return null;
              })}
            </SidebarSection>
          );
        })}
        </nav>
        <SidebarDropdownLayer panel={panel} />
      </SidebarDropdownContext.Provider>
    </aside>
  );
}

