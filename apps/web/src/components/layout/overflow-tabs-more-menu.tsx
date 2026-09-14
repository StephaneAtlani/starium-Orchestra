'use client';

import Link from 'next/link';
import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

export type OverflowTabsMoreItem = {
  id: string;
  label: string;
  href?: string;
  ariaLabel?: string;
  icon?: ComponentType<{ className?: string }>;
  trailing?: ReactNode;
  onSelect?: () => void;
};

type Props = {
  items: readonly OverflowTabsMoreItem[];
  activeOverflowId?: string | null;
  triggerClassName?: string;
  triggerActiveClassName?: string;
  menuItemClassName?: (active: boolean) => string;
  align?: 'start' | 'end';
  measureRef?: React.Ref<HTMLElement | null>;
};

/**
 * Burger + menu des onglets hors largeur (portal body, pas de truncate).
 */
export function OverflowTabsMoreMenu({
  items,
  activeOverflowId = null,
  triggerClassName,
  triggerActiveClassName,
  menuItemClassName,
  align = 'start',
  measureRef,
}: Props) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({
    position: 'fixed',
    zIndex: 500,
  });
  const activeItem = items.find((item) => item.id === activeOverflowId);
  const hasActive = Boolean(activeItem);

  const setSummaryRefs = (node: HTMLElement | null) => {
    summaryRef.current = node;
    if (typeof measureRef === 'function') measureRef(node);
    else if (measureRef && 'current' in measureRef) {
      (measureRef as React.MutableRefObject<HTMLElement | null>).current = node;
    }
  };

  const updatePanelPosition = () => {
    const summary = summaryRef.current;
    const panel = panelRef.current;
    if (!summary) return;
    const rect = summary.getBoundingClientRect();
    const margin = 8;
    const panelW = panel?.offsetWidth ?? 240;
    let left =
      align === 'end' ? rect.right - panelW : rect.left;
    left = Math.min(
      Math.max(margin, left),
      window.innerWidth - panelW - margin,
    );
    let top = rect.bottom + 4;
    const panelH = panel?.offsetHeight ?? 200;
    if (top + panelH > window.innerHeight - margin) {
      top = Math.max(margin, rect.top - panelH - 4);
    }
    setPanelStyle({
      position: 'fixed',
      top,
      left,
      zIndex: 500,
      width: 'max-content',
      minWidth: 12 * 16,
      maxWidth: `min(22rem, calc(100vw - ${margin * 2}px))`,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePanelPosition();
    const onWin = () => updatePanelPosition();
    window.addEventListener('resize', onWin);
    window.addEventListener('scroll', onWin, true);
    return () => {
      window.removeEventListener('resize', onWin);
      window.removeEventListener('scroll', onWin, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, align, items]);

  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;

    const syncOpen = () => setOpen(el.open);
    el.addEventListener('toggle', syncOpen);
    syncOpen();

    const closeIfOpen = () => {
      if (el.open) el.open = false;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!el.open) return;
      const target = e.target as Node | null;
      if (
        target &&
        (el.contains(target) ||
          (target as Element).closest?.('[data-overflow-tabs-panel]'))
      ) {
        return;
      }
      closeIfOpen();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !el.open) return;
      closeIfOpen();
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      el.removeEventListener('toggle', syncOpen);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const closeMenu = () => {
    const el = menuRef.current;
    if (el) el.open = false;
  };

  const panel = open
    ? createPortal(
        <div
          ref={panelRef}
          data-overflow-tabs-panel
          role="menu"
          style={panelStyle}
          className="starium-dropdown-panel starium-dropdown-panel--floating rounded-xl py-1.5 text-sm shadow-lg"
        >
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeOverflowId;
            const className = cn(
              'flex min-h-11 w-full items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-accent',
              isActive && 'font-semibold text-[color:var(--brand-gold-700)]',
              menuItemClassName?.(isActive),
            );
            const content = (
              <>
                {Icon ? (
                  <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
                ) : null}
                <span className="whitespace-nowrap">{item.label}</span>
                {item.trailing}
              </>
            );

            if (item.href) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  role="menuitem"
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={item.ariaLabel ?? item.label}
                  className={className}
                  onClick={closeMenu}
                >
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                aria-current={isActive ? 'true' : undefined}
                aria-label={item.ariaLabel ?? item.label}
                className={className}
                onClick={() => {
                  item.onSelect?.();
                  closeMenu();
                }}
              >
                {content}
              </button>
            );
          })}
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <details ref={menuRef} className="relative shrink-0">
        <summary
          ref={setSummaryRefs}
          className={cn(
            'inline-flex size-11 min-h-11 min-w-11 cursor-pointer list-none items-center justify-center [&::-webkit-details-marker]:hidden',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            triggerClassName,
            hasActive && triggerActiveClassName,
          )}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={
            activeItem
              ? `Menu des onglets, actif : ${activeItem.label}`
              : 'Menu des onglets supplémentaires'
          }
        >
          <Menu className="size-4 shrink-0" aria-hidden />
          <span className="sr-only">
            {activeItem
              ? `Onglets supplémentaires, actif : ${activeItem.label}`
              : 'Onglets supplémentaires'}
          </span>
        </summary>
      </details>
      {panel}
    </>
  );
}

export const OverflowTabsMoreMeasureProbe = forwardRef<
  HTMLSpanElement,
  { className?: string }
>(function OverflowTabsMoreMeasureProbe({ className }, ref) {
  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex size-11 min-h-11 min-w-11 shrink-0 items-center justify-center',
        className,
      )}
    >
      <Menu className="size-4" aria-hidden />
    </span>
  );
});
