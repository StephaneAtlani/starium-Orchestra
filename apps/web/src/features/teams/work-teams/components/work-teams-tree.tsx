'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useWorkTeamsTree } from '../hooks/use-work-teams-tree';
import { WorkTeamStatusBadge } from './work-team-status-badge';
import type { WorkTeamTreeNode } from '../types/work-team.types';

function TreeRow({
  node,
  depth,
  includeArchived,
}: {
  node: WorkTeamTreeNode;
  depth: number;
  includeArchived: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const childrenQuery = useWorkTeamsTree(
    { parentId: node.id, includeArchived },
    { enabled: expanded && node.hasChildren },
  );

  return (
    <div>
      <div
        className="flex items-center gap-1 border-b border-border/60 py-2"
        style={{ paddingLeft: depth * 16 }}
      >
        {node.hasChildren ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7 shrink-0"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            <ChevronRight
              className={cn('size-4 transition-transform', expanded && 'rotate-90')}
            />
          </Button>
        ) : (
          <span className="inline-flex size-7 shrink-0" aria-hidden />
        )}
        <div className="min-w-0 flex flex-1 flex-wrap items-center gap-2">
          <Link
            href={`/teams/structure/teams/${node.id}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {node.name}
          </Link>
          {node.code ? (
            <span className="text-xs text-muted-foreground">({node.code})</span>
          ) : null}
          <WorkTeamStatusBadge status={node.status} />
          {node.leadDisplayName ? (
            <span className="text-xs text-muted-foreground">· {node.leadDisplayName}</span>
          ) : null}
        </div>
      </div>
      {expanded && node.hasChildren && childrenQuery.data?.nodes?.length ? (
        <div>
          {childrenQuery.data.nodes.map((ch) => (
            <TreeRow
              key={ch.id}
              node={ch}
              depth={depth + 1}
              includeArchived={includeArchived}
            />
          ))}
        </div>
      ) : null}
      {expanded && node.hasChildren && childrenQuery.isLoading ? (
        <p className="py-2 text-sm text-muted-foreground" style={{ paddingLeft: (depth + 1) * 16 }}>
          Chargement…
        </p>
      ) : null}
    </div>
  );
}

export function WorkTeamsTreePanel({ includeArchived }: { includeArchived: boolean }) {
  const rootQuery = useWorkTeamsTree({ includeArchived });

  if (rootQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Chargement de l’arborescence…</p>;
  }
  if (rootQuery.error) {
    return (
      <p className="text-sm text-destructive">{(rootQuery.error as Error).message}</p>
    );
  }
  const nodes = rootQuery.data?.nodes ?? [];
  if (nodes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Aucune équipe à la racine.</p>
    );
  }

  return (
    <div className="rounded-lg border border-border/60">
      {nodes.map((n: WorkTeamTreeNode) => (
        <TreeRow key={n.id} node={n} depth={0} includeArchived={includeArchived} />
      ))}
    </div>
  );
}
