'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AlertTriangle,
  CircleAlert,
  FolderKanban,
  LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { useChatDrawer } from '@/features/chatbot/chat-drawer-context';
import { OrionAvatar } from '@/features/chatbot/orion-avatar';
import { navigationItemVisible } from '@/components/shell/navigation-visibility';
import { useSidebarNav } from '@/components/shell/sidebar-nav-context';
import type { NavigationItem } from '@/config/navigation';
import { resolveOrionPersonality } from '@/lib/orion-assets';
import { cn } from '@/lib/utils';

type TabId = 'dashboard' | 'vision' | 'projects' | 'risks' | 'orion';

type MobileNavTab = {
  id: TabId;
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  navItem?: NavigationItem;
};

const TABS: MobileNavTab[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'vision',
    label: 'Vision',
    href: '/strategic-vision',
    icon: CircleAlert,
    navItem: {
      label: 'Vision stratégique',
      href: '/strategic-vision',
      scope: 'client',
      requiredPermissions: ['strategic_vision.read'],
      allowedClientRoles: ['CLIENT_ADMIN', 'CLIENT_USER'],
    },
  },
  {
    id: 'projects',
    label: 'Projets',
    href: '/projects',
    icon: FolderKanban,
    navItem: {
      label: 'Projets',
      href: '/projects',
      scope: 'client',
      moduleCode: 'projects',
      requiredPermissions: ['projects.read'],
      allowedClientRoles: ['CLIENT_ADMIN', 'CLIENT_USER'],
    },
  },
  {
    id: 'risks',
    label: 'Risques',
    href: '/risks',
    icon: AlertTriangle,
    navItem: {
      label: 'Risques',
      href: '/risks',
      scope: 'client',
      moduleCode: 'projects',
      requiredPermissions: ['projects.read'],
      allowedClientRoles: ['CLIENT_ADMIN', 'CLIENT_USER'],
    },
  },
];

function resolveActiveTab(pathname: string, drawerOpen: boolean): TabId | null {
  if (drawerOpen) return 'orion';
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) return 'dashboard';
  if (
    pathname.startsWith('/strategic-vision') ||
    pathname.startsWith('/strategic-direction-strategy')
  ) {
    return 'vision';
  }
  if (pathname.startsWith('/projects')) return 'projects';
  if (pathname.startsWith('/risks')) return 'risks';
  return null;
}

function TabIconWrap({
  children,
  badge,
}: {
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <span className="starium-mobile-tab__icon-wrap relative">
      {children}
      {badge != null && badge > 0 ? (
        <span className="starium-mobile-tab__badge" aria-hidden>
          {badge > 9 ? '9+' : badge}
        </span>
      ) : null}
    </span>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname() ?? '';
  const { user } = useAuth();
  const { activeClient } = useActiveClient();
  const { has, isSuccess: permsSuccess, isModuleVisible } = usePermissions();
  const { open: drawerOpen, toggleDrawer, closeDrawer, unreadCount } = useChatDrawer();
  const { mobileOpen: navMenuOpen } = useSidebarNav();

  const activeTab = resolveActiveTab(pathname, drawerOpen);
  const hideBar = drawerOpen || navMenuOpen;

  const visibilityCtx = {
    platformRole: user?.platformRole ?? null,
    clientRole: activeClient?.role ?? null,
    has,
    permsSuccess,
    isModuleVisible,
  };

  const visibleTabs = TABS.filter((tab) => {
    if (!tab.navItem) return true;
    return navigationItemVisible(tab.navItem, visibilityCtx);
  });

  const orionLauncherPersonality = useMemo(
    () =>
      resolveOrionPersonality({
        tab: 'home',
        status: 'idle',
        hasUnread: unreadCount > 0,
        launcher: true,
      }),
    [unreadCount],
  );

  if (!activeClient) return null;

  return (
    <nav
      className={cn(
        'starium-mobile-bottom-nav shrink-0 md:hidden',
        hideBar && 'max-md:hidden',
      )}
      aria-label="Navigation principale mobile"
      aria-hidden={hideBar ? true : undefined}
    >
      <ul className="starium-mobile-bottom-nav__list">
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <li key={tab.id} className="flex min-w-0 flex-1">
              <Link
                href={tab.href!}
                onClick={() => {
                  if (drawerOpen) closeDrawer();
                }}
                className={cn('starium-mobile-tab', isActive && 'starium-mobile-tab--active')}
                aria-current={isActive ? 'page' : undefined}
              >
                <TabIconWrap>
                  <Icon className="starium-mobile-tab__icon" aria-hidden />
                </TabIconWrap>
                <span className="starium-mobile-tab__label">{tab.label}</span>
              </Link>
            </li>
          );
        })}
        <li className="flex min-w-0 flex-1">
          <button
            type="button"
            onClick={toggleDrawer}
            disabled={!activeClient}
            className={cn(
              'starium-mobile-tab starium-mobile-tab--orion w-full',
              activeTab === 'orion' && 'starium-mobile-tab--active',
              !activeClient && 'pointer-events-none opacity-50',
            )}
            aria-label={
              unreadCount > 0
                ? `Orion, ${unreadCount} nouveau${unreadCount > 1 ? 'x' : ''} message${unreadCount > 1 ? 's' : ''}`
                : 'Orion — aide et assistant'
            }
            aria-expanded={drawerOpen}
            aria-controls="starium-orion-drawer"
          >
            <TabIconWrap badge={unreadCount}>
              <OrionAvatar
                personality={orionLauncherPersonality}
                size="sm"
                className="starium-mobile-tab__orion"
              />
            </TabIconWrap>
            <span className="starium-mobile-tab__label">Orion</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
