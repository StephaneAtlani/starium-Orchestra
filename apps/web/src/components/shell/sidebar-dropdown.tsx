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
} | null>(null);

function useSidebarDropdownContext() {
  const ctx = useContext(SidebarDropdownContext);
  if (!ctx) throw new Error('SidebarDropdown must be used inside Sidebar');
  return ctx;
}

interface SidebarDropdownProps {
  label: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}

export function SidebarDropdown({ label, icon: Icon, children }: SidebarDropdownProps) {
  const { setPanel } = useSidebarDropdownContext();
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
      setPanel(null);
    }, CLOSE_DELAY_MS);
  }, [clear, setPanel]);

  const openDropdown = useCallback(() => {
    clear();
    openT.current = setTimeout(() => {
      if (!triggerRef.current) return;
      const r = triggerRef.current.getBoundingClientRect();
      setOpen(true);
      setPanel({
        content: children,
        position: { top: r.top, left: r.right + 6 },
        onPanelEnter: keepOpen,
        onPanelLeave: scheduleClose,
      });
    }, OPEN_DELAY_MS);
  }, [children, clear, keepOpen, scheduleClose, setPanel]);

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
          'group flex w-full flex-col items-center gap-1 rounded-lg px-2.5 py-2 text-[0.72rem] font-medium transition-colors',
          'text-sidebar-foreground/80 hover:bg-sidebar-accent',
          open && 'bg-sidebar-accent text-sidebar-primary',
        )}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {Icon && <Icon className="h-4 w-4 shrink-0 text-sidebar-foreground" />}
        <span className="truncate text-[0.7rem] leading-tight text-sidebar-foreground/80">{label}</span>
        <ChevronRight
          className={cn('h-3 w-3 shrink-0 text-sidebar-foreground/60 transition-transform', open && 'rotate-90')}
        />
      </button>
    </div>
  );
}

export function SidebarDropdownLayer({ panel }: { panel: SidebarDropdownPanelState | null }) {
  if (!panel) return null;
  return (
    <div
      role="menu"
      className="min-w-[10rem] rounded-md border border-sidebar-border bg-sidebar py-1 shadow-lg text-sidebar-foreground"
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
  const value = React.useMemo(() => ({ setPanel }), []);
  return { panel, setPanel, contextValue: value };
}
