'use client';

import React, { useRef, useState, useCallback, useContext } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const OPEN_DELAY_MS = 50;
const CLOSE_DELAY_MS = 150;

export type SidebarDropdownPanelState = {
  content: React.ReactNode;
  position: { top: number; left: number };
  onPanelEnter: () => void;
  onPanelLeave: () => void;
};

export const SidebarDropdownContext = React.createContext<{
  setPanel: (state: SidebarDropdownPanelState | null) => void;
  /** Libellé du dernier dropdown qui a posé le panneau — évite qu’un mouseLeave tardif efface le menu du suivant. */
  panelOwnerLabelRef: React.MutableRefObject<string | null>;
} | null>(null);

function useSidebarDropdownContext() {
  const ctx = useContext(SidebarDropdownContext);
  if (!ctx) throw new Error('SidebarDropdown must be used inside Sidebar');
  return ctx;
}

interface SidebarDropdownProps {
  label: string;
  icon?: LucideIcon;
  /** Met en évidence le trigger comme la route courante correspond à un sous-lien */
  triggerActive?: boolean;
  children: React.ReactNode;
}

export function SidebarDropdown({ label, icon: Icon, triggerActive, children }: SidebarDropdownProps) {
  const { setPanel, panelOwnerLabelRef } = useSidebarDropdownContext();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const openT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeT = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (openT.current) {
      clearTimeout(openT.current);
      openT.current = null;
    }
    if (closeT.current) {
      clearTimeout(closeT.current);
      closeT.current = null;
    }
  }, []);

  const keepOpen = useCallback(() => {
    clear();
    setOpen(true);
  }, [clear]);

  const scheduleClose = useCallback(() => {
    clear();
    closeT.current = setTimeout(() => {
      setOpen(false);
      // Ne pas vider le panneau global si un autre dropdown a pris la main entre-temps.
      if (panelOwnerLabelRef.current === label) {
        setPanel(null);
        panelOwnerLabelRef.current = null;
      }
    }, CLOSE_DELAY_MS);
  }, [clear, label, panelOwnerLabelRef, setPanel]);

  const openDropdown = useCallback(() => {
    clear();
    openT.current = setTimeout(() => {
      if (!triggerRef.current) return;
      const r = triggerRef.current.getBoundingClientRect();
      setOpen(true);
      panelOwnerLabelRef.current = label;
      setPanel({
        content: children,
        position: { top: r.top, left: r.right + 6 },
        onPanelEnter: keepOpen,
        onPanelLeave: scheduleClose,
      });
    }, OPEN_DELAY_MS);
  }, [children, clear, keepOpen, label, panelOwnerLabelRef, scheduleClose, setPanel]);

  const closeDropdown = useCallback(() => {
    scheduleClose();
  }, [scheduleClose]);

  return (
    <div
      className="relative"
      onMouseEnter={openDropdown}
      onMouseLeave={closeDropdown}
    >
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          'group flex w-full flex-row items-center gap-2 rounded-md rounded-r-md px-2.5 py-2 text-xs font-medium transition-colors starium-sidebar-item',
          (open || triggerActive) && 'starium-sidebar-item-active',
        )}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0 opacity-90 text-inherit" />}
        <span className="truncate flex-1 text-left">{label}</span>
        <ChevronRight className={cn('h-3 w-3 shrink-0 starium-sidebar-chevron transition-transform', open && 'rotate-90')} aria-hidden />
      </button>
    </div>
  );
}

export function SidebarDropdownLayer({ panel }: { panel: SidebarDropdownPanelState | null }) {
  if (!panel) return null;
  return (
    <div
      role="menu"
      className="starium-dropdown-panel starium-dropdown-panel--sidebar min-w-[10rem] rounded-md py-0.5 shadow-lg"
      style={{
        position: 'fixed',
        top: panel.position.top,
        left: panel.position.left,
        zIndex: 99999,
      }}
      onMouseEnter={panel.onPanelEnter}
      onMouseLeave={panel.onPanelLeave}
    >
      {panel.content}
    </div>
  );
}

export function useSidebarDropdownPanel() {
  const [panel, setPanel] = useState<SidebarDropdownPanelState | null>(null);
  const panelOwnerLabelRef = useRef<string | null>(null);
  const value = React.useMemo(
    () => ({ setPanel, panelOwnerLabelRef }),
    [],
  );
  return { panel, setPanel, contextValue: value };
}
