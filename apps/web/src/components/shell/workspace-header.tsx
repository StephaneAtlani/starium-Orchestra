'use client';

import React, { useEffect, useState } from 'react';
import { WorkspaceBreadcrumb } from './workspace-breadcrumb';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { useActiveClient } from '../../hooks/use-active-client';
import { useMeClientsQuery } from '@/features/account/hooks/use-me-email-queries';
import { Search } from 'lucide-react';
import { useSidebarNav } from './sidebar-nav-context';
import { NotificationBell } from '@/features/notifications/components/notification-bell';
import { GlobalSearchDialog } from '@/features/global-search/global-search-dialog';
import { MobileWorkspaceHeaderBar } from './mobile-workspace-header-bar';
import { AccountMenuDropdown } from './account-menu-dropdown';
import { Button } from '../ui/button';

interface WorkspaceHeaderProps {
  contentClassName?: string;
}

export function WorkspaceHeader({ contentClassName }: WorkspaceHeaderProps) {
  const { mobileOpen, toggleMobile } = useSidebarNav();
  const router = useRouter();
  const { user, accessToken, logout } = useAuth();
  const { activeClient, setActiveClient } = useActiveClient();
  const { data: meClients } = useMeClientsQuery();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchShortcutLabel, setSearchShortcutLabel] = useState('⌘K');

  const activeClientCount =
    meClients?.filter((client) => client.status === 'ACTIVE').length ?? 0;
  const multiClient = activeClientCount > 1;

  useEffect(() => {
    if (!accessToken || !user?.hasAvatar) {
      setAvatarPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    (async () => {
      const res = await fetch('/api/me/avatar', {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      if (!res.ok || cancelled) return;
      const blob = await res.blob();
      objectUrl = URL.createObjectURL(blob);
      if (!cancelled) {
        setAvatarPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return objectUrl;
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, user?.hasAvatar, user]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (accessToken && activeClient) setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [accessToken, activeClient]);

  useEffect(() => {
    const isApple =
      typeof navigator !== 'undefined' &&
      /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
    setSearchShortcutLabel(isApple ? '⌘K' : 'Ctrl+K');
  }, []);

  async function handleLogout() {
    await logout();
    setActiveClient(null);
    router.replace('/login');
  }

  const avatarInitials =
    user?.platformRole === 'PLATFORM_ADMIN'
      ? 'PA'
      : user
        ? (user.firstName || user.lastName || user.email || 'C')
            .toString()
            .trim()
            .split(' ')
            .filter(Boolean)
            .map((part) => part[0])
            .slice(0, 2)
            .join('')
            .toUpperCase()
        : '';

  return (
    <header className="starium-header sticky top-0 z-10 shrink-0">
      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />

      <MobileWorkspaceHeaderBar
        mobileOpen={mobileOpen}
        onToggleMenu={toggleMobile}
        accessToken={accessToken}
        activeClient={activeClient}
        multiClient={multiClient}
        user={user}
        avatarPreview={avatarPreview}
        avatarInitials={avatarInitials}
        onLogout={() => void handleLogout()}
      />

      <div
        className={`starium-header-desktop hidden border-b border-border md:block ${contentClassName ?? 'mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-8'}`}
      >
        <div className="starium-topbar flex items-center gap-3">
          <WorkspaceBreadcrumb />

          {accessToken && activeClient ? (
            <button
              type="button"
              className="starium-topbar-search"
              aria-label="Ouvrir la recherche globale"
              onClick={() => setSearchOpen(true)}
            >
              <Search aria-hidden />
              <span className="starium-topbar-search__placeholder">
                Rechercher un projet, propriétaire…
              </span>
              <kbd>{searchShortcutLabel}</kbd>
            </button>
          ) : null}

          <div className="starium-topbar-actions">
            {accessToken && activeClient ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="starium-text hover:starium-bg-muted lg:hidden"
                aria-label="Recherche globale"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="h-4 w-4" />
              </Button>
            ) : null}
            <div className="starium-topbar-icon">
              <NotificationBell />
            </div>
            {user ? (
              <AccountMenuDropdown
                avatarPreview={avatarPreview}
                avatarInitials={avatarInitials}
                onLogout={() => void handleLogout()}
                variant="topbar"
                showChevron
                accessToken={accessToken}
                activeClient={activeClient}
                multiClient={multiClient}
              />
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
