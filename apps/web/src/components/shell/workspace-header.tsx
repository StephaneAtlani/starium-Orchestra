'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { useActiveClient } from '../../hooks/use-active-client';
import { useActiveClientEmailDisplay } from '../../hooks/use-active-client-email-display';
import { ClientSwitcher } from '../ClientSwitcher';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Bell, Calendar, ChevronDown, FileText, Search, UserCircle } from 'lucide-react';

interface WorkspaceHeaderProps {
  contentClassName?: string;
}

export function WorkspaceHeader({ contentClassName }: WorkspaceHeaderProps) {
  const router = useRouter();
  const { user, accessToken, logout } = useAuth();
  const { activeClient } = useActiveClient();
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

  function handleLogout() {
    logout();
    router.push('/login');
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
      <div className={`flex h-14 items-center justify-between gap-4 ${contentClassName ?? 'mx-auto max-w-7xl px-6 sm:px-8'}`}>
      <nav className="flex min-w-0 flex-1 items-center gap-2 text-sm starium-text">
        <a href="/dashboard" className="starium-text hover:underline">Home</a>
        <span className="starium-text-muted">/</span>
        {activeClient ? (
          <>
            <span className="truncate starium-text">{activeClient.name}</span>
            {emailClientsLoaded ? (
              defaultEmail ? (
                <span
                  className="hidden max-w-[min(18rem,40vw)] truncate text-xs text-muted-foreground md:inline"
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
                <span className="hidden text-xs text-muted-foreground md:inline">
                  · <span className="italic">e-mail client non défini</span>
                </span>
              )
            ) : null}
            <span className="starium-text-muted">/</span>
          </>
        ) : null}
        <span className="font-medium starium-text">Dashboard</span>
        {user?.platformRole === 'PLATFORM_ADMIN' && (
          <Badge variant="outline" className="ml-2 px-2 py-0.5 text-[0.65rem] starium-border starium-primary">
            Admin
          </Badge>
        )}
      </nav>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" className="starium-text hover:starium-bg-muted" aria-label="Rechercher">
          <Search className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" className="starium-text hover:starium-bg-muted" aria-label="Document">
          <FileText className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" className="starium-text hover:starium-bg-muted" aria-label="Calendrier">
          <Calendar className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" className="starium-text hover:starium-bg-muted" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>
        {accessToken && <ClientSwitcher accessToken={accessToken} />}
        {user && (
          <details ref={accountMenuRef} className="group/details relative">
            <summary className="list-none flex cursor-pointer items-center gap-1">
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
              <ChevronDown className="h-4 w-4 starium-text" />
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
                  handleLogout();
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

