'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { useActiveClient } from '../../hooks/use-active-client';
import { useActiveClientEmailDisplay } from '../../hooks/use-active-client-email-display';
import { ClientSwitcher } from '../ClientSwitcher';
import { Button } from '../ui/button';
import { RegistryBadge } from '@/lib/ui/registry-badge';
import { ChevronDown, Menu, Search, UserCircle, X } from 'lucide-react';
import { useSidebarNav } from './sidebar-nav-context';
import { NotificationBell } from '@/features/notifications/components/notification-bell';

interface WorkspaceHeaderProps {
  contentClassName?: string;
}

export function WorkspaceHeader({ contentClassName }: WorkspaceHeaderProps) {
  const { mobileOpen, toggleMobile } = useSidebarNav();
  const router = useRouter();
  const { user, accessToken, logout } = useAuth();
  const { activeClient, setActiveClient } = useActiveClient();
  const { identity: defaultEmail, clientsLoaded: emailClientsLoaded } =
    useActiveClientEmailDisplay();
  const accountMenuRef = useRef<HTMLDetailsElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

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
    const el = accountMenuRef.current;
    if (!el) return;

    const closeIfOpen = () => {
      if (el.open) el.open = false;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!el.open) return;
      const target = e.target as Node | null;
      if (target && el.contains(target)) return;
      closeIfOpen();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !el.open) return;
      closeIfOpen();
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
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
    <header className="starium-header sticky top-0 z-10 shrink-0 border-b border-border">
      <div
        className={`flex min-h-14 flex-col gap-2 py-2 sm:h-14 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:py-0 ${contentClassName ?? 'mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-8'}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 md:hidden starium-text hover:starium-bg-muted"
            aria-label={mobileOpen ? 'Fermer le menu de navigation' : 'Ouvrir le menu de navigation'}
            aria-expanded={mobileOpen}
            aria-controls="starium-app-sidebar"
            onClick={toggleMobile}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <nav
            aria-label="Fil d’Ariane"
            className="flex min-w-0 flex-1 items-center gap-1 text-xs starium-text sm:gap-2 sm:text-sm"
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
              <RegistryBadge className="ml-1 hidden shrink-0 border border-border px-2 py-0.5 text-[0.65rem] sm:inline-flex starium-border starium-primary">
                Admin
              </RegistryBadge>
            )}
          </nav>
        </div>

        <div className="flex min-w-0 shrink-0 items-center justify-end gap-1 sm:gap-2 md:pl-2">
          <div className="flex items-center gap-0.5">
            <div className="hidden items-center gap-0.5 md:flex">
              <Button variant="ghost" size="icon-sm" className="starium-text hover:starium-bg-muted" aria-label="Rechercher">
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <NotificationBell />
          </div>
          {accessToken && (
            <div className="min-w-0 max-w-[min(11rem,calc(100vw-8rem))] sm:max-w-[16rem]">
              <ClientSwitcher accessToken={accessToken} className="w-full min-w-0" />
            </div>
          )}
          {user && (
            <details ref={accountMenuRef} className="group/details relative shrink-0">
              <summary className="list-none flex cursor-pointer items-center gap-0.5 sm:gap-1">
                <span className="starium-avatar flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-medium">
                  {avatarPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element -- URL objet blob
                    <img
                      src={avatarPreview}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    avatarInitials
                  )}
                </span>
                <ChevronDown className="hidden h-4 w-4 starium-text sm:block" aria-hidden />
              </summary>
              <div className="starium-dropdown-panel absolute right-0 mt-1 min-w-[180px] rounded-lg py-1 text-sm shadow-lg pointer-events-none opacity-0 translate-y-1 scale-95 transition-all duration-150 ease-out group-open/details:pointer-events-auto group-open/details:opacity-100 group-open/details:translate-y-0 group-open/details:scale-100">
                <Link
                  href="/account"
                  onClick={() => {
                    const d = accountMenuRef.current;
                    if (d) d.open = false;
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm starium-text hover:bg-accent"
                >
                  <UserCircle className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                  Compte
                </Link>
                <button
                  type="button"
                  className="flex w-full items-center px-3 py-2 text-left text-sm starium-text hover:bg-accent"
                  onClick={() => {
                    const d = accountMenuRef.current;
                    if (d) d.open = false;
                    void handleLogout();
                  }}
                >
                  Déconnexion
                </button>
              </div>
            </details>
          )}
        </div>
      </div>
    </header>
  );
}

