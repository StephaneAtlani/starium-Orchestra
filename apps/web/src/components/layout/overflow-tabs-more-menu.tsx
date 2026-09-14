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
 * Burger + menu des onglets hors largeur.
 * Trigger collé au dernier visible ; panneau en portal (au-dessus du contenu).
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
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
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
    if (!summary) return;
    const rect = summary.getBoundingClientRect();
    const style: CSSProperties = {
      position: 'fixed',
      top: rect.bottom + 4,
      zIndex: 400,
      minWidth: Math.max(12 * 16, rect.width),
    };
    if (align === 'end') {
      style.right = Math.max(8, window.innerWidth - rect.right);
      style.left = 'auto';
    } else {
      style.left = Math.max(8, rect.left);
      style.right = 'auto';
    }
    setPanelStyle(style);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- align/open only
  }, [open, align]);

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
      if (target && (el.contains(target) || (target as Element).closest?.('[data-overflow-tabs-panel]'))) {
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
          data-overflow-tabs-panel
          role="menu"
          style={panelStyle}
          className={cn(
            'starium-dropdown-panel starium-dropdown-panel--floating rounded-xl py-1.5 text-sm shadow-lg',
          )}
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
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
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
      <details ref={menuRef} className="relative ml-0 shrink-0">
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
        'inline-flex size-11 min-h-11 min-w-11 items-center justify-center',
        className,
      )}
    >
      <Menu className="size-4" aria-hidden />
    </span>
  );
});
