'use client';

import { HardDrive, KeyRound, User } from 'lucide-react';
import {
  PortfolioEntityCard,
  TableToneBadge,
  type StatusTone,
} from '@/components/portfolio';
import {
  RESOURCE_AFFILIATION_LABEL,
  RESOURCE_TYPE_LABEL,
  formatResourceDisplayName,
} from '@/lib/resource-labels';
import type { ResourceListItem, ResourceType } from '@/services/resources';

function typeTone(type: ResourceType): StatusTone {
  switch (type) {
    case 'HUMAN':
      return 'info';
    case 'MATERIAL':
      return 'brand';
    case 'LICENSE':
      return 'warn';
    default:
      return 'muted';
  }
}

function TypeIcon({ type }: { type: ResourceType }) {
  if (type === 'HUMAN') return <User className="size-5" aria-hidden />;
  if (type === 'LICENSE') return <KeyRound className="size-5" aria-hidden />;
  return <HardDrive className="size-5" aria-hidden />;
}

export function ResourcesPortfolioCards({
  items,
  onOpen,
}: {
  items: ResourceListItem[];
  onOpen?: (id: string) => void;
}) {
  return (
    <div
      className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
      data-testid="resources-portfolio-cards"
    >
      {items.map((resource) => {
        const tone = typeTone(resource.type);
        const name = formatResourceDisplayName(resource);
        return (
          <PortfolioEntityCard
            key={resource.id}
            tone={tone}
            icon={<TypeIcon type={resource.type} />}
            title={<span className="line-clamp-2">{name}</span>}
            badges={
              <>
                <TableToneBadge tone={tone}>{RESOURCE_TYPE_LABEL[resource.type]}</TableToneBadge>
                {resource.affiliation ? (
                  <TableToneBadge tone="muted">
                    {RESOURCE_AFFILIATION_LABEL[
                      resource.affiliation as keyof typeof RESOURCE_AFFILIATION_LABEL
                    ] ?? resource.affiliation}
                  </TableToneBadge>
                ) : null}
              </>
            }
            subtitle={resource.email ?? resource.companyName ?? undefined}
            footer={
              onOpen ? (
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center font-semibold text-[color:var(--brand-gold-700)]"
                  onClick={() => onOpen(resource.id)}
                >
                  Ouvrir
                </button>
              ) : null
            }
            onClick={onOpen ? () => onOpen(resource.id) : undefined}
            className={onOpen ? 'cursor-pointer' : undefined}
          />
        );
      })}
    </div>
  );
}
