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
    <aside className="relative z-10 hidden w-24 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <SidebarDropdownContext.Provider value={contextValue}>
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-4">
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">
              Starium Orchestra
            </span>
            <span className="text-xs text-sidebar-foreground/60">
              Cockpit
            </span>
          </div>
        </div>
        <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4">
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
                    { label: 'Cockpit', href: '/budgets' },
                    { label: 'Dashboard', href: '/budgets/dashboard' },
                    { label: 'Exercices', href: '/budgets/exercises' },
                    { label: 'Imports', href: '/budgets/imports' },
                  ];

                  return (
                    <SidebarDropdown
                      key="dropdown-budgets"
                      label={item.label}
                      icon={item.icon}
                    >
                      {budgetsChildren.map((child) => {
                        const isActive =
                          pathname === child.href ||
                          (child.href !== '/' && pathname?.startsWith(child.href));

                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            role="menuitem"
                            className={cn(
                              'block px-3 py-2 text-sm text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                              isActive && 'bg-sidebar-accent font-medium text-sidebar-primary',
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

