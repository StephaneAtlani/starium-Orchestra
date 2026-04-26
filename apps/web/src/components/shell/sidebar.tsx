'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
import { useSidebarNav } from './sidebar-nav-context';
import { navigationItemVisible } from './navigation-visibility';
import { isEquipesDropdownChildActive } from './equipes-nav-helpers';

function visible(
  item: NavigationItem,
  platformRole: string | null,
  clientRole: string | null,
  has: (code: string) => boolean,
  /** GET /me/permissions a réussi pour le client actif — sans ça on ne montre pas les entrées à permissions. */
  permsSuccess: boolean,
): boolean {
  return navigationItemVisible(item, {
    platformRole,
    clientRole,
    has,
    permsSuccess,
  });
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { activeClient } = useActiveClient();
  const { panel, contextValue } = useSidebarDropdownPanel();
  const { mobileOpen, closeMobile } = useSidebarNav();
  const platformRole = user?.platformRole ?? null;
  const clientRole = activeClient?.role ?? null;
  const { has, isSuccess: permsSuccess } = usePermissions();

  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobile();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen, closeMobile]);

  return (
    <div className="min-w-0 w-0 shrink-0 overflow-visible md:flex md:h-full md:w-44 md:shrink-0 md:flex-col">
      <button
        type="button"
        aria-hidden={!mobileOpen}
        className={cn(
          'fixed inset-0 z-[55] bg-black/45 transition-opacity md:hidden',
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={closeMobile}
        tabIndex={mobileOpen ? 0 : -1}
      />
      <aside
        id="starium-app-sidebar"
        className={cn(
          'starium-sidebar flex h-full min-h-0 w-44 flex-col border-r border-white/10 bg-background',
          'fixed inset-y-0 left-0 z-[60] transition-transform duration-200 ease-out',
          'md:relative md:z-10 md:translate-x-0',
          mobileOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full md:translate-x-0',
        )}
      >
      <SidebarDropdownContext.Provider value={contextValue}>
        <div className="starium-sidebar-header flex h-12 min-w-0 shrink-0 items-center gap-1.5 border-b border-white/10 px-3 md:px-3.5">
          <div className="min-w-0 flex flex-1 flex-col leading-snug">
            <span
              className="starium-sidebar-brand truncate text-xs font-semibold tracking-tight"
              title={activeClient?.name?.trim() || undefined}
            >
              {activeClient?.name?.trim() || 'Starium Orchestra'}
            </span>
            <span className="starium-sidebar-brand-muted text-[10px] leading-tight">Cockpit</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 md:hidden"
            aria-label="Fermer le menu"
            onClick={closeMobile}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <nav className="starium-sidebar-nav min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3">
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
                              'block px-3 py-1.5 text-xs starium-dropdown-link',
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
                    if (href === '/projects/committee/codir') {
                      return (
                        pathname === '/projects/committee/codir' ||
                        pathname.startsWith('/projects/committee/codir/')
                      );
                    }
                    if (href === '/projects') {
                      if (pathname === '/projects') return true;
                      if (pathname.startsWith('/projects/new')) return true;
                      if (pathname.startsWith('/projects/options')) return false;
                      if (pathname.startsWith('/projects/committee')) return false;
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
                              'block px-3 py-1.5 text-xs starium-dropdown-link',
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
                  const suppliersChildren: { label: string; href: string }[] = [
                    { label: 'Dashboard', href: '/suppliers/dashboard' },
                    { label: 'Fournisseurs', href: '/suppliers' },
                  ];
                  suppliersChildren.push(
                    { label: 'Contacts', href: '/suppliers/contacts' },
                  );

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
                              'block px-3 py-1.5 text-xs starium-dropdown-link',
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

                const isContrats = item.label === 'Contrats';
                if (isContrats) {
                  const contractsChildren = [
                    { label: 'Registre', href: '/contracts' },
                    { label: 'Types de contrat', href: '/contracts/kind-types' },
                  ];

                  const isContractsChildActive = (href: string) => {
                    if (!pathname) return false;
                    if (href === '/contracts/kind-types') {
                      return (
                        pathname === '/contracts/kind-types' ||
                        pathname.startsWith('/contracts/kind-types/')
                      );
                    }
                    if (href === '/contracts') {
                      if (pathname.startsWith('/contracts/kind-types')) return false;
                      if (pathname === '/contracts') return true;
                      if (!pathname.startsWith('/contracts/')) return false;
                      return true;
                    }
                    return false;
                  };

                  return (
                    <SidebarDropdown
                      key="dropdown-contracts"
                      label={item.label}
                      icon={item.icon}
                    >
                      {contractsChildren.map((child) => {
                        const isActive = isContractsChildActive(child.href);

                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            role="menuitem"
                            className={cn(
                              'block px-3 py-1.5 text-xs starium-dropdown-link',
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

                const isEquipes = item.label === 'Équipes';
                if (isEquipes) {
                  const teamsChildren: { label: string; href: string }[] = [];
                  if (permsSuccess && has('skills.read')) {
                    teamsChildren.push({
                      label: 'Catalogue compétences',
                      href: '/teams/skills',
                    });
                  }
                  if (permsSuccess && has('teams.read')) {
                    teamsChildren.push({
                      label: 'Structure & équipes',
                      href: '/teams/structure/teams',
                    });
                  }
                  if (permsSuccess && has('resources.read')) {
                    teamsChildren.push({
                      label: 'Temps réalisé',
                      href: '/teams/time-entries',
                    });
                    teamsChildren.push({
                      label: 'Options temps',
                      href: '/teams/time-entries/options',
                    });
                  }

                  if (teamsChildren.length === 0) {
                    return null;
                  }

                  const isTeamsChildActive = (href: string) =>
                    isEquipesDropdownChildActive(pathname, href);

                  return (
                    <SidebarDropdown
                      key="dropdown-equipes"
                      label={item.label}
                      icon={item.icon}
                    >
                      {teamsChildren.map((child) => {
                        const isActive = isTeamsChildActive(child.href);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            role="menuitem"
                            className={cn(
                              'block px-3 py-1.5 text-xs starium-dropdown-link',
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
    </div>
  );
}

