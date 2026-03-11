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

  return (
    <aside
      className="w-72 shrink-0 flex flex-col"
      style={{
        background: 'var(--color-bg-sidebar)',
        color: 'var(--color-text-inverse)',
        borderRight: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div
        className="h-14 flex items-center px-4 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <span className="text-sm font-semibold tracking-tight">
          Starium Orchestra
        </span>
      </div>
      <nav className="flex-1 px-4 py-4 space-y-4 overflow-y-auto min-h-0">
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
                />
              ))}
            </SidebarSection>
          );
        })}
      </nav>
      <div
        className="px-4 py-3 shrink-0 text-xs"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.7)',
        }}
      >
        Profil / version
      </div>
    </aside>
  );
}

