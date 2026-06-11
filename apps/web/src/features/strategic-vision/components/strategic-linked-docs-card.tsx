'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FolderKanban,
  Wallet,
  ShieldAlert,
  RefreshCw,
  Link2,
} from 'lucide-react';
import type {
  StrategicLinkType,
  StrategicObjectiveDto,
} from '../types/strategic-vision.types';

const LINK_TYPE_LABEL: Record<StrategicLinkType, string> = {
  PROJECT: 'Projet',
  BUDGET: 'Budget',
  BUDGET_LINE: 'Ligne budgétaire',
  RISK: 'Risque',
  GOVERNANCE_CYCLE: 'Cycle de gouvernance',
  MANUAL: 'Lien manuel',
};

const LINK_TYPE_ICON: Record<
  StrategicLinkType,
  React.ComponentType<{ className?: string }>
> = {
  PROJECT: FolderKanban,
  BUDGET: Wallet,
  BUDGET_LINE: Wallet,
  RISK: ShieldAlert,
  GOVERNANCE_CYCLE: RefreshCw,
  MANUAL: Link2,
};

export function StrategicLinkedDocsCard({
  objectives,
}: {
  objectives: StrategicObjectiveDto[];
}) {
  const links = objectives.flatMap((objective) =>
    objective.links.map((link) => ({ ...link, objectiveTitle: objective.title })),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents &amp; éléments liés</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {links.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            Aucun élément lié pour ce périmètre.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {links.map((link) => {
              const Icon = LINK_TYPE_ICON[link.linkType];
              return (
                <li key={link.id} className="flex items-center gap-3 py-3 first:pt-0">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--brand-gold-100)] text-[color:var(--brand-gold-700)]">
                    <Icon className="size-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {link.targetLabelSnapshot}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {LINK_TYPE_LABEL[link.linkType]} · {link.objectiveTitle}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
