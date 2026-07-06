'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlignLeft,
  CheckSquare,
  Columns2,
  ListTodo,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/use-permissions';
import { projectTasks } from '../constants/project-routes';
import { ProjectWorkspaceShell } from './project-workspace-shell';
import { ProjectTasksStatStrip } from './project-tasks-stat-strip';
import {
  ProjectTasksListTab,
  type ProjectTasksListTabHandle,
} from './project-tasks-list-tab';
import {
  ProjectPlanningKanbanTab,
  type ProjectPlanningKanbanTabHandle,
} from './project-planning-kanban-tab';

const KANBAN_CHECKLISTS_STORAGE_KEY = 'starium-proj-tasks-kanban-checklists';
const KANBAN_DESCRIPTIONS_STORAGE_KEY = 'starium-proj-tasks-kanban-descriptions';

function readKanbanPref(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeKanbanPref(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    /* stockage indisponible */
  }
}

export function ProjectTasksView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subRaw = searchParams.get('sub');
  const sub: 'tasks' | 'kanban' = subRaw === 'kanban' ? 'kanban' : 'tasks';

  const listRef = useRef<ProjectTasksListTabHandle>(null);
  const kanbanRef = useRef<ProjectPlanningKanbanTabHandle>(null);
  const { has } = usePermissions();
  const canEdit = has('projects.update');

  const [showKanbanChecklists, setShowKanbanChecklists] = useState(false);
  const [showKanbanDescriptions, setShowKanbanDescriptions] = useState(false);
  useEffect(() => {
    setShowKanbanChecklists(readKanbanPref(KANBAN_CHECKLISTS_STORAGE_KEY));
    setShowKanbanDescriptions(readKanbanPref(KANBAN_DESCRIPTIONS_STORAGE_KEY));
  }, []);

  const toggleKanbanChecklists = useCallback(() => {
    setShowKanbanChecklists((prev) => {
      const next = !prev;
      writeKanbanPref(KANBAN_CHECKLISTS_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const toggleKanbanDescriptions = useCallback(() => {
    setShowKanbanDescriptions((prev) => {
      const next = !prev;
      writeKanbanPref(KANBAN_DESCRIPTIONS_STORAGE_KEY, next);
      return next;
    });
  }, []);

  if (!projectId) {
    return (
      <p className="text-sm text-destructive">Identifiant de projet manquant.</p>
    );
  }

  const setSub = (next: 'tasks' | 'kanban') => {
    router.push(projectTasks(projectId, next));
  };

  const openCreate = () => {
    if (sub === 'kanban') {
      kanbanRef.current?.openCreate();
    } else {
      listRef.current?.openCreate();
    }
  };

  return (
    <ProjectWorkspaceShell projectId={projectId}>
      <div className="starium-proj-tasks flex flex-col gap-[18px] pt-4 md:pt-5">
        <ProjectTasksStatStrip projectId={projectId} />

        <div className="starium-toolbar">
          <div
            className="starium-seg-toggle"
            role="tablist"
            aria-label="Mode d'affichage des tâches"
          >
            <Link
              href={projectTasks(projectId, 'tasks')}
              role="tab"
              aria-selected={sub === 'tasks'}
              className={cn('starium-seg-btn', sub === 'tasks' && 'starium-seg-btn--active')}
              onClick={(event) => {
                event.preventDefault();
                setSub('tasks');
              }}
            >
              <ListTodo strokeWidth={1.75} width={14} height={14} aria-hidden />
              Liste
            </Link>
            <Link
              href={projectTasks(projectId, 'kanban')}
              role="tab"
              aria-selected={sub === 'kanban'}
              className={cn('starium-seg-btn', sub === 'kanban' && 'starium-seg-btn--active')}
              onClick={(event) => {
                event.preventDefault();
                setSub('kanban');
              }}
            >
              <Columns2 strokeWidth={1.75} width={14} height={14} aria-hidden />
              Kanban
            </Link>
          </div>

          <div className="starium-toolbar-spacer" aria-hidden />

          {sub === 'kanban' ? (
            <>
              <button
                type="button"
                role="switch"
                aria-checked={showKanbanDescriptions}
                aria-label="Afficher la description sur les cartes Kanban"
                className={cn(
                  'starium-btn starium-btn-secondary',
                  showKanbanDescriptions &&
                    'ring-2 ring-[color-mix(in_srgb,var(--brand-gold)_35%,transparent)]',
                )}
                onClick={toggleKanbanDescriptions}
              >
                <AlignLeft strokeWidth={1.75} aria-hidden />
                Description
              </button>
              <button
                type="button"
                role="switch"
                aria-checked={showKanbanChecklists}
                aria-label="Afficher la liste de contrôle sur les cartes Kanban"
                className={cn(
                  'starium-btn starium-btn-secondary',
                  showKanbanChecklists &&
                    'ring-2 ring-[color-mix(in_srgb,var(--brand-gold)_35%,transparent)]',
                )}
                onClick={toggleKanbanChecklists}
              >
                <CheckSquare strokeWidth={1.75} aria-hidden />
                Liste de contrôle
              </button>
            </>
          ) : null}

          {canEdit ? (
            <button type="button" className="starium-btn starium-btn-primary" onClick={openCreate}>
              <Plus strokeWidth={2.5} aria-hidden />
              Nouvelle tâche
            </button>
          ) : null}
        </div>

        {sub === 'tasks' ? (
          <ProjectTasksListTab ref={listRef} projectId={projectId} />
        ) : (
          <ProjectPlanningKanbanTab
            ref={kanbanRef}
            projectId={projectId}
            showChecklists={showKanbanChecklists}
            showDescriptions={showKanbanDescriptions}
          />
        )}
      </div>
    </ProjectWorkspaceShell>
  );
}
