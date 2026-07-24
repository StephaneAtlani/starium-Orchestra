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
import { SidebarDropdown } from './sidebar-dropdown';
import { navigationItemVisible } from './navigation-visibility';
import { isEquipesDropdownChildActive } from './equipes-nav-helpers';
import { useNavMenuLink } from './nav-menu-link-context';

function visible(
  item: NavigationItem,
  platformRole: string | null,
  clientRole: string | null,
  has: (code: string) => boolean,
  permsSuccess: boolean,
  isModuleVisible: (moduleCode: string) => boolean,
): boolean {
  return navigationItemVisible(item, {
    platformRole,
    clientRole,
    has,
    permsSuccess,
    isModuleVisible,
  });
}

function NavSubMenuLink({
  href,
  isActive,
  children,
}: {
  href: string;
  isActive: boolean;
  children: React.ReactNode;
}) {
  const { onLinkClick } = useNavMenuLink();

  return (
    <Link
      href={href}
      role="menuitem"
      onClick={() => onLinkClick?.()}
      className={cn(
        'block px-3 py-1.5 text-xs starium-dropdown-link',
        isActive && 'starium-dropdown-link-active',
      )}
    >
      {children}
    </Link>
  );
}

interface NavigationMenuBodyProps {
  className?: string;
}

export function NavigationMenuBody({ className }: NavigationMenuBodyProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { activeClient } = useActiveClient();
  const platformRole = user?.platformRole ?? null;
  const clientRole = activeClient?.role ?? null;
  const { has, isSuccess: permsSuccess, isModuleVisible } = usePermissions();

  return (
    <nav
      className={cn(
        'starium-sidebar-nav min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4 md:space-y-4 md:px-3 md:py-3',
        className,
      )}
    >
      {navigation.map((section) => {
        const items = section.items.filter((item) =>
          visible(
            item,
            platformRole,
            clientRole,
            has,
            permsSuccess,
            isModuleVisible,
          ),
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
                    {budgetsChildren.map((child) => (
                      <NavSubMenuLink
                        key={child.href}
                        href={child.href}
                        isActive={isBudgetChildActive(child.href)}
                      >
                        {child.label}
                      </NavSubMenuLink>
                    ))}
                  </SidebarDropdown>
                );
              }

              const isStrategicVision = item.label === 'Vision stratégique' && (item.children?.length ?? 0) > 0;
              if (isStrategicVision) {
                const strategicChildren: { label: string; href: string }[] = [];
                if (
                  permsSuccess &&
                  has('strategic_vision.read') &&
                  isModuleVisible('strategic_vision')
                ) {
                  strategicChildren.push({
                    label: 'Vision stratégique',
                    href: '/strategic-vision',
                  });
                }
                if (
                  permsSuccess &&
                  has('strategic_direction_strategy.read') &&
                  isModuleVisible('strategic_direction_strategy')
                ) {
                  strategicChildren.push({
                    label: 'Stratégie',
                    href: '/strategic-direction-strategy',
                  });
                }
                if (strategicChildren.length === 0) {
                  return null;
                }

                const isStrategicVisionActive = pathname === '/strategic-vision';
                const isStrategyActive =
                  pathname === '/strategic-direction-strategy' ||
                  (pathname ?? '').startsWith('/strategic-direction-strategy/');

                const strategicTriggerActive =
                  isStrategicVisionActive || isStrategyActive;

                return (
                  <SidebarDropdown
                    key="dropdown-strategic-vision"
                    label={item.label}
                    icon={item.icon}
                    triggerActive={strategicTriggerActive}
                  >
                    {strategicChildren.map((child) => {
                      const isActive =
                        child.href === '/strategic-vision'
                          ? isStrategicVisionActive
                          : isStrategyActive;

                      return (
                        <NavSubMenuLink
                          key={child.href}
                          href={child.href}
                          isActive={isActive}
                        >
                          {child.label}
                        </NavSubMenuLink>
                      );
                    })}
                  </SidebarDropdown>
                );
              }

              const isProjets = item.label === 'Projets';
              if (isProjets) {
                const projectsChildren = [
                  { label: 'Portefeuille projet', href: '/projects' },
                  { label: 'Demandes projet', href: '/projects/requests' },
                  { label: 'Option', href: '/projects/options' },
                ];

                const isProjectsChildActive = (href: string) => {
                  if (!pathname) return false;
                  if (href === '/projects/requests') {
                    return (
                      pathname === '/projects/requests' ||
                      pathname.startsWith('/projects/requests/')
                    );
                  }
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
                    if (pathname.startsWith('/projects/requests')) return false;
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
                    {projectsChildren.map((child) => (
                      <NavSubMenuLink
                        key={child.href}
                        href={child.href}
                        isActive={isProjectsChildActive(child.href)}
                      >
                        {child.label}
                      </NavSubMenuLink>
                    ))}
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
                    {suppliersChildren.map((child) => (
                      <NavSubMenuLink
                        key={child.href}
                        href={child.href}
                        isActive={isSuppliersChildActive(child.href)}
                      >
                        {child.label}
                      </NavSubMenuLink>
                    ))}
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
                    {contractsChildren.map((child) => (
                      <NavSubMenuLink
                        key={child.href}
                        href={child.href}
                        isActive={isContractsChildActive(child.href)}
                      >
                        {child.label}
                      </NavSubMenuLink>
                    ))}
                  </SidebarDropdown>
                );
              }

              const isEquipes = item.label === 'Équipes';
              if (isEquipes) {
                const teamsChildren: { label: string; href: string }[] = [];
                if (
                  permsSuccess &&
                  has('skills.read') &&
                  isModuleVisible('skills')
                ) {
                  teamsChildren.push({
                    label: 'Catalogue compétences',
                    href: '/teams/skills',
                  });
                }
                if (
                  permsSuccess &&
                  has('teams.read') &&
                  isModuleVisible('teams')
                ) {
                  teamsChildren.push({
                    label: 'Structure & équipes',
                    href: '/teams/structure/teams',
                  });
                }
                if (
                  permsSuccess &&
                  has('resources.read') &&
                  isModuleVisible('resources')
                ) {
                  teamsChildren.push({
                    label: 'Temps réalisé',
                    href: '/teams/time-entries',
                  });
                  teamsChildren.push({
                    label: 'Options temps',
                    href: '/teams/time-entries/options',
                  });
                }
                if (
                  permsSuccess &&
                  has('capacity.read') &&
                  isModuleVisible('capacity')
                ) {
                  teamsChildren.push({
                    label: 'Capacité',
                    href: '/teams/capacity',
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
                    {teamsChildren.map((child) => (
                      <NavSubMenuLink
                        key={child.href}
                        href={child.href}
                        isActive={isTeamsChildActive(child.href)}
                      >
                        {child.label}
                      </NavSubMenuLink>
                    ))}
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
  );
}
