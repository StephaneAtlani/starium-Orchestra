'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { useActiveClient } from '../../hooks/use-active-client';
import { ClientSwitcher } from '../ClientSwitcher';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Bell, Calendar, ChevronDown, FileText, Search } from 'lucide-react';

interface WorkspaceHeaderProps {
  contentClassName?: string;
}

export function WorkspaceHeader({ contentClassName }: WorkspaceHeaderProps) {
  const router = useRouter();
  const { user, accessToken, logout } = useAuth();
  const { activeClient } = useActiveClient();
  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <header className="starium-header sticky top-0 z-10 shrink-0 border-b border-border">
      <div className={`flex h-14 items-center justify-between gap-4 ${contentClassName ?? 'mx-auto max-w-7xl px-6 sm:px-8'}`}>
      <nav className="flex min-w-0 flex-1 items-center gap-2 text-sm starium-text">
        <a href="/dashboard" className="starium-text hover:underline">Home</a>
        <span className="starium-text-muted">/</span>
        {activeClient ? (
          <>
            <span className="truncate starium-text">{activeClient.name}</span>
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
          <details className="group/details relative">
            <summary className="list-none flex cursor-pointer items-center gap-1">
              <span className="starium-avatar flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium">
                {user.platformRole === 'PLATFORM_ADMIN'
                  ? 'PA'
                  : (user.firstName || user.lastName || user.email || 'C')
                      .toString()
                      .trim()
                      .split(' ')
                      .filter(Boolean)
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
              </span>
              <ChevronDown className="h-4 w-4 starium-text" />
            </summary>
            <div className="starium-dropdown-panel absolute right-0 mt-1 min-w-[160px] rounded-lg py-1 text-sm shadow-lg pointer-events-none opacity-0 translate-y-1 scale-95 transition-all duration-150 ease-out group-open/details:pointer-events-auto group-open/details:opacity-100 group-open/details:translate-y-0 group-open/details:scale-100">
              <button
                type="button"
                className="flex w-full items-center px-3 py-2 text-left text-sm starium-text hover:starium-bg-muted"
                onClick={handleLogout}
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

