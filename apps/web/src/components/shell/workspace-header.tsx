'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { useActiveClient } from '../../hooks/use-active-client';
import { useActiveClientEmailDisplay } from '../../hooks/use-active-client-email-display';
import { useMeClientsQuery } from '@/features/account/hooks/use-me-email-queries';
import { ClientSwitcher } from '../ClientSwitcher';
import { Button } from '../ui/button';
import { RegistryBadge } from '@/lib/ui/registry-badge';
import { Search } from 'lucide-react';
import { useSidebarNav } from './sidebar-nav-context';
import { NotificationBell } from '@/features/notifications/components/notification-bell';
import { GlobalSearchDialog } from '@/features/global-search/global-search-dialog';
import { MobileWorkspaceHeaderBar } from './mobile-workspace-header-bar';
import { AccountMenuDropdown } from './account-menu-dropdown';

interface WorkspaceHeaderProps {
  contentClassName?: string;
}

export function WorkspaceHeader({ contentClassName }: WorkspaceHeaderProps) {
  const { mobileOpen, toggleMobile } = useSidebarNav();
  const router = useRouter();
  const { user, accessToken, logout } = useAuth();
  const { activeClient, setActiveClient } = useActiveClient();
  const { data: meClients } = useMeClientsQuery();
  const { identity: defaultEmail, clientsLoaded: emailClientsLoaded } =
    useActiveClientEmailDisplay();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

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
        <div className="flex h-14 min-h-14 items-center justify-between gap-3">
          <nav
            aria-label="Fil d’Ariane"
            className="flex min-w-0 max-w-[55%] flex-1 items-center gap-2 overflow-hidden text-sm starium-text"
          >
            <a href="/dashboard" className="shrink-0 starium-text hover:underline">
              Home
            </a>
            <span className="shrink-0 starium-text-muted">/</span>
            {activeClient ? (
              <>
                <span className="min-w-0 truncate starium-text" title={activeClient.name}>
                  {activeClient.name}
                </span>
                {emailClientsLoaded ? (
                  defaultEmail ? (
                    <span
                      className="hidden max-w-[min(18rem,40vw)] truncate text-xs text-muted-foreground lg:inline"
                      title={
                        defaultEmail.displayName
                          ? `${defaultEmail.email} (${defaultEmail.displayName})`
                          : defaultEmail.email
                      }
                    >
                      ·{' '}
                      {defaultEmail.displayName?.trim()
                        ? `${defaultEmail.email} (${defaultEmail.displayName})`
                        : defaultEmail.email}
                      {!defaultEmail.isVerified ? (
                        <span className="font-medium text-accent-foreground/90">
                          {' '}
                          (non vérifié)
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    <span className="hidden text-xs text-muted-foreground lg:inline">
                      · <span className="italic">e-mail client non défini</span>
                    </span>
                  )
                ) : null}
                <span className="shrink-0 starium-text-muted">/</span>
              </>
            ) : null}
            <span className="shrink-0 font-medium starium-text">Dashboard</span>
            {user?.platformRole === 'PLATFORM_ADMIN' && (
              <RegistryBadge className="ml-1 shrink-0 border border-border px-2 py-0.5 text-[0.65rem] starium-border starium-primary">
                Admin
              </RegistryBadge>
            )}
          </nav>

          <div className="flex min-w-0 shrink items-center justify-end gap-2 pl-2">
            <div className="flex shrink-0 items-center gap-0.5">
              {accessToken && activeClient ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="starium-text hover:starium-bg-muted"
                  aria-label="Recherche globale"
                  onClick={() => setSearchOpen(true)}
                >
                  <Search className="h-4 w-4" />
                </Button>
              ) : null}
              <NotificationBell />
            </div>
            {accessToken && (
              <div className="min-w-0 max-w-[16rem]">
                <ClientSwitcher accessToken={accessToken} className="w-full min-w-0" />
              </div>
            )}
            {user && (
              <AccountMenuDropdown
                avatarPreview={avatarPreview}
                avatarInitials={avatarInitials}
                onLogout={() => void handleLogout()}
                triggerClassName="justify-start gap-0.5"
                showChevron
              />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
