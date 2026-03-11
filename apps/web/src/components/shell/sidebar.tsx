"use client";

import React from 'react';
import { navigation } from '../../config/navigation';
import type { NavigationItem } from '../../config/navigation';
import { useAuth } from '../../context/auth-context';
import { useActiveClient } from '../../hooks/use-active-client';
import { SidebarSection } from './sidebar-section';
import { SidebarItem } from './sidebar-item';

function visible(item: NavigationItem, platformRole: string | null, clientRole: string | null): boolean {
  if (item.platformOnly && platformRole !== 'PLATFORM_ADMIN') return false;
  if (item.clientAdminOnly && clientRole !== 'CLIENT_ADMIN') return false;
  return true;
}

export function Sidebar() {
  const { user } = useAuth();
  const { activeClient } = useActiveClient();
  const platformRole = user?.platformRole ?? null;
  const clientRole = activeClient?.role ?? null;
  const displayName =
    user && (user.firstName || user.lastName)
      ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
      : user?.email ?? 'Non connecté';

  return (
    <aside className="hidden w-24 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
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
              {items.map((item) => (
                <SidebarItem
                  key={item.href}
                  label={item.label}
                  href={item.href}
                  icon={item.icon}
                />
              ))}
            </SidebarSection>
          );
        })}
      </nav>
    </aside>
  );
}

