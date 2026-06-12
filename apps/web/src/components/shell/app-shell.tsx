"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { SidebarNavProvider } from './sidebar-nav-context';
import { WorkspaceHeader } from './workspace-header';
import { StariumChatDrawer } from '@/features/chatbot/starium-chat-drawer';

/** Élément DOM pour le plein écran « sans sidebar » : colonne header + main (+ drawer). */
export const STARIUM_APP_WORKSPACE_DOM_ID = 'starium-app-workspace';

/** Classe ciblée par CSS `:fullscreen` pour étaler le contenu sur toute la largeur (ex. Gantt portefeuille). */
const WORKSPACE_INNER = 'starium-workspace-inner';

/** Pleine largeur utile — léger gutter horizontal (ne colle pas aux bords). */
const CONTENT_WRAPPER_GUTTER = `w-full min-w-0 px-4 sm:px-5 ${WORKSPACE_INNER}`;
/** Contenu standard (dashboard, modules) : même gutter que le header. */
const CONTENT_WRAPPER_NARROW = CONTENT_WRAPPER_GUTTER;
/** Présentation comité : pleine largeur, même gutter. */
const CONTENT_WRAPPER_WIDE = CONTENT_WRAPPER_GUTTER;

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const wideMain = pathname?.startsWith('/projects/committee') ?? false;
  const contentWrapper = wideMain ? CONTENT_WRAPPER_WIDE : CONTENT_WRAPPER_NARROW;

  return (
    <SidebarNavProvider>
      <div className="starium-main flex h-[100dvh] min-h-0 w-full flex-row overflow-hidden">
        <Sidebar />
        <div
          id={STARIUM_APP_WORKSPACE_DOM_ID}
          className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        >
          <WorkspaceHeader contentClassName={contentWrapper} />
          <main className="starium-main min-h-0 flex-1 overflow-auto">
            <div className={`${contentWrapper} py-6 sm:py-8`}>{children}</div>
          </main>
          <StariumChatDrawer />
        </div>
      </div>
    </SidebarNavProvider>
  );
}

