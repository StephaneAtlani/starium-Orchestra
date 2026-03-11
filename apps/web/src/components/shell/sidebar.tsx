"use client";

import React from 'react';
import { navigation } from '../../config/navigation';
import type { NavigationItem } from '../../config/navigation';
import { useAuth } from '../../context/auth-context';
import { useActiveClient } from '../../hooks/use-active-client';
import { SidebarSection } from './sidebar-section';
import { SidebarItem } from './sidebar-item';
import { Badge } from '../ui/badge';

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
      <div
        className="shrink-0 border-t border-sidebar-border px-4 py-3 text-xs text-sidebar-foreground/70"
        data-slot="sidebar-footer"
        data-sidebar="footer"
      >
        <div className="flex items-center gap-3">
          <div
            data-slot="avatar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-[0.7rem] font-semibold uppercase"
          >
            {(displayName || 'U')
              .split(' ')
              .filter(Boolean)
              .map((part) => part[0])
              .slice(0, 2)
              .join('')}
          </div>
          <div className="min-w-0 flex-1 text-left leading-tight">
            <div className="truncate text-sm font-medium">{displayName}</div>
            <div className="truncate text-[0.7rem] text-sidebar-foreground/70">
              {user?.email ?? 'Non connecté'}
            </div>
          </div>
          {platformRole === 'PLATFORM_ADMIN' && (
            <Badge
              variant="outline"
              className="ml-auto text-[0.7rem] px-2 py-0.5 text-sidebar-foreground"
            >
              Admin
            </Badge>
          )}
        </div>
      </div>
    </aside>
  );
}

