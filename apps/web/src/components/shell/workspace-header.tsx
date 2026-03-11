'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { useActiveClient } from '../../hooks/use-active-client';
import { useTheme } from '../../context/theme-context';
import { ClientSwitcher } from '../ClientSwitcher';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Moon, Sun } from 'lucide-react';

export function WorkspaceHeader() {
  const router = useRouter();
  const { user, accessToken, logout } = useAuth();
  const { activeClient } = useActiveClient();
  const { theme, toggleTheme } = useTheme();

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-4 border-b bg-card/90 px-6 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="min-w-0">
          <div className="truncate text-xs text-muted-foreground">
            {activeClient ? (
              <span className="inline-flex items-center gap-2">
                <Badge variant="secondary">Client</Badge>
                <span className="truncate">{activeClient.name}</span>
              </span>
            ) : (
              <span>Contexte plateforme / multi-clients</span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <div className="truncate text-sm font-medium">Dashboard</div>
            {user?.platformRole === 'PLATFORM_ADMIN' && (
              <Badge
                variant="outline"
                className="px-2 py-0.5 text-[0.65rem]"
              >
                Admin
              </Badge>
            )}
          </div>
        </div>
        <div className="hidden max-w-md flex-1 md:block">
          <Input placeholder="Search" aria-label="Search" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Toggle theme"
          onClick={toggleTheme}
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
        {accessToken && <ClientSwitcher accessToken={accessToken} />}
        {user && (
          <details className="group/details relative">
            <summary className="list-none">
              <Badge
                variant="outline"
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full p-0 text-[0.65rem]"
              >
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
              </Badge>
            </summary>
            <div className="absolute right-0 mt-1 min-w-[160px] rounded-md border border-border bg-card py-1 text-sm shadow-lg pointer-events-none opacity-0 translate-y-1 scale-95 transition-all duration-150 ease-out group-open/details:pointer-events-auto group-open/details:opacity-100 group-open/details:translate-y-0 group-open/details:scale-100">
              <button
                type="button"
                className="flex w-full items-center px-3 py-1.5 text-left text-sm hover:bg-muted"
                onClick={handleLogout}
              >
                Déconnexion
              </button>
            </div>
          </details>
        )}
      </div>
    </header>
  );
}

