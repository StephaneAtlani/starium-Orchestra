'use client';

import Link from 'next/link';
import type { ComponentType, ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type WorkspaceTabBarItem = {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  ariaLabel?: string;
  /** Si défini, l’onglet desktop est un lien ; sinon bouton (état local). */
  href?: string;
};

export function workspaceTabClass(active: boolean) {
  return cn(
    'starium-project-workspace-tab',
    active && 'starium-project-workspace-tab--active',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  );
}

function WorkspaceTabBarDesktopItem({
  item,
  active,
  onSelect,
}: {
  item: WorkspaceTabBarItem;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const Icon = item.icon;
  const className = workspaceTabClass(active);
  const content = (
    <>
      <Icon className="shrink-0" aria-hidden />
      <span className="max-w-full truncate">{item.label}</span>
    </>
  );

  if (item.href) {
    return (
      <Link
        href={item.href}
        role="tab"
        aria-current={active ? 'page' : undefined}
        aria-label={item.ariaLabel ?? item.label}
        className={className}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-current={active ? 'page' : undefined}
      aria-label={item.ariaLabel ?? item.label}
      className={className}
      onClick={() => onSelect(item.id)}
    >
      {content}
    </button>
  );
}

function WorkspaceTabBarMobileSelect({
  items,
  activeId,
  onSelect,
  selectId,
  mobileEyebrow,
  mobileAriaLabel,
}: {
  items: readonly WorkspaceTabBarItem[];
  activeId: string;
  onSelect: (id: string) => void;
  selectId: string;
  mobileEyebrow: string;
  mobileAriaLabel: string;
}) {
  const activeItem = items.find((item) => item.id === activeId) ?? items[0];
  const ActiveIcon = activeItem.icon;

  return (
    <div className="starium-project-workspace-tabs-mobile max-md:block md:hidden">
      <Label htmlFor={selectId} className="sr-only">
        {mobileEyebrow}
      </Label>
      <Select
        value={activeId}
        onValueChange={(value) => {
          if (value) onSelect(value);
        }}
      >
        <SelectTrigger
          id={selectId}
          className="starium-project-workspace-tabs-mobile__trigger"
          aria-label={mobileAriaLabel}
        >
          <SelectValue>
            <span className="flex min-w-0 flex-1 items-center gap-3">
              <span
                className="starium-synthesis-icon-well starium-project-workspace-tabs-mobile__icon-well"
                aria-hidden
              >
                <ActiveIcon className="size-[18px] shrink-0" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
                <span className="starium-project-workspace-tabs-mobile__eyebrow">
                  {mobileEyebrow}
                </span>
                <span className="starium-project-workspace-tabs-mobile__value truncate">
                  {activeItem.label}
                </span>
              </span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="start" sideOffset={6}>
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeId;
            return (
              <SelectItem
                key={item.id}
                value={item.id}
                className={cn(
                  'min-h-11 py-2.5 text-sm',
                  isActive && 'starium-project-workspace-tabs-mobile__item--active',
                )}
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-md',
                      isActive
                        ? 'starium-synthesis-icon-well'
                        : 'bg-muted/60 text-muted-foreground',
                    )}
                    aria-hidden
                  >
                    <Icon className="size-4 shrink-0" />
                  </span>
                  <span className="truncate">{item.label}</span>
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Bandeau d’onglets Starium (design system) — conteneur blanc, icône + libellé,
 * soulignement or à l’état actif. Mobile : sélecteur dans le même habillage visuel.
 *
 * Réf. CSS : `.starium-project-workspace-tabs` dans `globals.css`.
 * Usage : navigation projet (`ProjectWorkspaceTabs`), vision stratégique, etc.
 */
export function WorkspaceTabBar({
  items,
  activeId,
  onSelect,
  ariaLabel,
  mobileEyebrow = 'Section',
  selectId = 'workspace-tab-select',
  mobileAriaLabel,
  'data-testid': dataTestId,
}: {
  items: readonly WorkspaceTabBarItem[];
  activeId: string;
  onSelect: (id: string) => void;
  ariaLabel: string;
  mobileEyebrow?: string;
  selectId?: string;
  mobileAriaLabel?: string;
  'data-testid'?: string;
}) {
  return (
    <div data-testid={dataTestId}>
      <WorkspaceTabBarMobileSelect
        items={items}
        activeId={activeId}
        onSelect={onSelect}
        selectId={selectId}
        mobileEyebrow={mobileEyebrow}
        mobileAriaLabel={mobileAriaLabel ?? ariaLabel}
      />
      <nav
        className="starium-project-workspace-tabs relative z-0 hidden min-w-0 md:flex"
        role="tablist"
        aria-label={ariaLabel}
      >
        {items.map((item) => (
          <WorkspaceTabBarDesktopItem
            key={item.id}
            item={item}
            active={item.id === activeId}
            onSelect={onSelect}
          />
        ))}
      </nav>
    </div>
  );
}

/** Enveloppe optionnelle autour du contenu d’un onglet (espacement cohérent). */
export function WorkspaceTabBarPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('space-y-4', className)}>{children}</div>;
}
