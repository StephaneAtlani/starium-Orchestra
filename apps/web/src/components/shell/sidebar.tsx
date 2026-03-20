'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { navigation } from '../../config/navigation';
import type { NavigationItem } from '../../config/navigation';
import { useAuth } from '../../context/auth-context';
import { useActiveClient } from '../../hooks/use-active-client';
import { SidebarSection } from './sidebar-section';
import { SidebarItem } from './sidebar-item';
import {
  SidebarDropdown,
  SidebarDropdownContext,
  SidebarDropdownLayer,
  useSidebarDropdownPanel,
} from './sidebar-dropdown';

function visible(item: NavigationItem, platformRole: string | null, clientRole: string | null): boolean {
  if (item.platformOnly && platformRole !== 'PLATFORM_ADMIN') return false;
  if (item.clientAdminOnly && clientRole !== 'CLIENT_ADMIN') return false;
  if (item.allowedClientRoles != null) {
    if (clientRole == null || !item.allowedClientRoles.includes(clientRole)) return false;
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

  return (
    <aside className="starium-sidebar relative z-10 hidden h-full min-h-screen shrink-0 flex-col self-stretch border-r border-white/10 md:flex">
      <SidebarDropdownContext.Provider value={contextValue}>
        <div className="starium-sidebar-header flex h-14 shrink-0 items-center gap-2 border-b border-white/10 px-4">
          <div className="flex flex-col leading-tight">
            <span className="starium-sidebar-brand text-sm font-semibold tracking-tight">Starium Orchestra</span>
            <span className="starium-sidebar-brand-muted text-xs">Cockpit</span>
          </div>
        </div>
        <nav className="starium-sidebar-nav min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {navigation.map((section) => {
          const items = section.items.filter((item) =>
            visible(item, platformRole, clientRole),
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

                if (item.href) {
                  return (
                    <SidebarItem
                      key={item.href}
                      label={item.label}
                      href={item.href}
                      icon={item.icon}
                    />
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

