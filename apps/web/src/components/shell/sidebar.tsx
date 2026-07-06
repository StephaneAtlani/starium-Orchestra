'use client';

import React from 'react';
import Image from 'next/image';
import { useActiveClient } from '../../hooks/use-active-client';
import {
  SidebarDropdownContext,
  SidebarDropdownLayer,
  useSidebarDropdownPanel,
} from './sidebar-dropdown';
import { NavigationMenuBody } from './navigation-menu-body';

export function Sidebar() {
  const { activeClient } = useActiveClient();
  const { panel, contextValue } = useSidebarDropdownPanel();

  return (
    <div className="hidden min-w-0 shrink-0 md:flex md:h-full md:w-44 md:flex-col">
      <aside
        id="starium-app-sidebar"
        className="starium-sidebar relative z-10 flex h-full min-h-0 w-44 flex-col border-r border-white/10 bg-background"
      >
        <SidebarDropdownContext.Provider value={contextValue}>
          <div className="starium-sidebar-header flex h-12 min-h-12 min-w-0 shrink-0 items-center gap-2 border-b border-white/10 px-3.5">
            <Image
              src="/brand/icon-starium-white.png"
              alt="Starium"
              width={20}
              height={20}
              priority
              className="h-5 w-5 shrink-0 object-contain"
            />
            <div className="min-w-0 flex flex-1 flex-col leading-snug">
              <span
                className="starium-sidebar-brand truncate text-xs font-semibold tracking-tight"
                title={activeClient?.name?.trim() || undefined}
              >
                {activeClient?.name?.trim() || 'Starium Orchestra'}
              </span>
              <span className="starium-sidebar-brand-muted text-[10px] leading-tight">
                Cockpit
              </span>
            </div>
          </div>
          <NavigationMenuBody />
          <SidebarDropdownLayer panel={panel} />
        </SidebarDropdownContext.Provider>
      </aside>
    </div>
  );
}
