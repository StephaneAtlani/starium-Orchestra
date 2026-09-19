'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, GripVertical, Plus, Trash2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingState } from '@/components/feedback/loading-state';
import { ErrorState } from '@/components/feedback/error-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import {
  deleteProcedureTemplate,
  getProcedureTemplate,
  listProcedureCategories,
  transitionProcedureTemplate,
  updateProcedureTemplate,
} from '../api/procedures.api';
import { procedureQueryKeys } from '../lib/procedure-query-keys';
import { procedureTemplateStatusLabel } from '../lib/procedure-labels';
import { outlineHierarchyWarnings } from '../lib/procedure-template-outline';
import { displayLabel } from '@/lib/display-label';
import type { ProcedureTemplateOutlineItem } from '../types/procedure.types';

const NONE_CATEGORY = '__none__';

type Props = { templateId: string };

export function ProcedureTemplateEditor({ templateId }: Props) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();
  const router = useRouter();

  const detailQ = useQuery({
    queryKey: procedureQueryKeys.template(clientId, templateId),
    queryFn: () => getProcedureTemplate(authFetch, templateId),
    enabled: Boolean(clientId && templateId),
  });

  const categoriesQ = useQuery({
    queryKey: procedureQueryKeys.categories(clientId, true),
    queryFn: () => listProcedureCategories(authFetch, { activeOnly: true }),
    enabled: Boolean(clientId),
  });

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [outline, setOutline] = useState<ProcedureTemplateOutlineItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!detailQ.data) return;
    setName(detailQ.data.name);
    setCategoryId(detailQ.data.categoryId);
    setOutline(detailQ.data.outline);
    setHydrated(true);
  }, [detailQ.data]);

  const warnings = useMemo(
    () => outlineHierarchyWarnings(outline),
    [outline],
  );

  const saveMut = useMutation({
    mutationFn: () =>
      updateProcedureTemplate(authFetch, templateId, {
        name: name.trim(),
        categoryId,
        outline: outline.filter((o) => o.title.trim()),
      }),
    onSuccess: async (tpl) => {
      toast.success('Modèle enregistré');
      setOutline(tpl.outline);
      await queryClient.invalidateQueries({
        queryKey: procedureQueryKeys.templates(clientId),
      });
      await queryClient.invalidateQueries({
        queryKey: procedureQueryKeys.template(clientId, templateId),
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const transitionMut = useMutation({
    mutationFn: (status: 'ACTIVE' | 'ARCHIVED' | 'DRAFT') =>
      transitionProcedureTemplate(authFetch, templateId, status),
    onSuccess: async (tpl) => {
      toast.success(
        tpl.status === 'ACTIVE'
          ? 'Modèle activé'
          : tpl.status === 'ARCHIVED'
            ? 'Modèle archivé'
            : 'Modèle repassé en brouillon',
      );
      await queryClient.invalidateQueries({
        queryKey: procedureQueryKeys.templates(clientId),
      });
      await queryClient.invalidateQueries({
        queryKey: procedureQueryKeys.template(clientId, templateId),
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteProcedureTemplate(authFetch, templateId),
    onSuccess: async (res) => {
      toast.success(res.message);
      await queryClient.invalidateQueries({
        queryKey: procedureQueryKeys.templates(clientId),
      });
      if (res.deleted) {
        router.push('/procedures/templates');
      } else {
        await queryClient.invalidateQueries({
          queryKey: procedureQueryKeys.template(clientId, templateId),
        });
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (detailQ.isLoading || !hydrated) {
    return <LoadingState />;
  }

  if (detailQ.isError || !detailQ.data) {
    return (
      <ErrorState
        message={
          detailQ.error instanceof Error
            ? detailQ.error.message
            : 'Ce modèle n’existe pas ou vous n’y avez pas accès.'
        }
        onRetry={() => void detailQ.refetch()}
      />
    );
  }

  const tpl = detailQ.data;
  const readOnly = tpl.status === 'ARCHIVED';
  const categories = categoriesQ.data ?? [];
  const hasH1 = outline.some((o) => o.level === 1 && o.title.trim());

  function updateRow(index: number, patch: Partial<ProcedureTemplateOutlineItem>) {
    setOutline((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function removeRow(index: number) {
    setOutline((prev) => prev.filter((_, i) => i !== index));
  }

  function addRow(level: 1 | 2 | 3) {
    setOutline((prev) => [...prev, { level, title: '' }]);
  }

  function moveRow(index: number, dir: -1 | 1) {
    setOutline((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      const tmp = next[index]!;
      next[index] = next[target]!;
      next[target] = tmp;
      return next;
    });
  }

  return (
    <div className="starium-stack gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/procedures/templates"
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'min-h-11 sm:min-h-9',
          )}
        >
          <ArrowLeft className="size-4" aria-hidden />
          Retour aux modèles
        </Link>
        <span className="text-sm text-muted-foreground" aria-live="polite">
          {procedureTemplateStatusLabel(tpl.status)}
        </span>
      </div>

      {readOnly ? (
        <Alert>
          <AlertTitle>Modèle archivé</AlertTitle>
          <AlertDescription>
            Réactivez le modèle (brouillon) pour pouvoir le modifier à nouveau.
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="starium-section space-y-4 p-4 sm:p-6">
        <div className="starium-form-field">
          <Label htmlFor="tpl-edit-name">Nom</Label>
          <Input
            id="tpl-edit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
            disabled={readOnly}
          />
        </div>

        <div className="starium-form-field">
          <Label htmlFor="tpl-edit-category">Catégorie (optionnelle)</Label>
          <Select
            value={categoryId ?? NONE_CATEGORY}
            onValueChange={(v) =>
              setCategoryId(!v || v === NONE_CATEGORY ? null : v)
            }
            disabled={readOnly || categoriesQ.isLoading}
          >
            <SelectTrigger id="tpl-edit-category" className="min-h-11 sm:min-h-9">
              <SelectValue placeholder="Sans catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_CATEGORY}>Sans catégorie</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {displayLabel(c.label, 'Catégorie')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="starium-section space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-foreground">Outline</h2>
            <p className="text-sm text-muted-foreground">
              Titres H1, H2, H3 dans l’ordre d’apparition du document.
            </p>
          </div>
          {!readOnly ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 sm:min-h-9"
                onClick={() => addRow(1)}
              >
                <Plus className="size-4" aria-hidden />
                H1
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 sm:min-h-9"
                onClick={() => addRow(2)}
              >
                <Plus className="size-4" aria-hidden />
                H2
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 sm:min-h-9"
                onClick={() => addRow(3)}
              >
                <Plus className="size-4" aria-hidden />
                H3
              </Button>
            </div>
          ) : null}
        </div>

        {warnings.length > 0 ? (
          <Alert aria-live="polite">
            <AlertTitle>Imbrication à vérifier</AlertTitle>
            <AlertDescription>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
              <p className="mt-2">
                Vous pouvez tout de même enregistrer — ce n’est pas bloquant.
              </p>
            </AlertDescription>
          </Alert>
        ) : null}

        {outline.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun titre pour l’instant. Ajoutez au moins un H1 avant d’activer le
            modèle.
          </p>
        ) : (
          <ul className="space-y-2" aria-label="Outline du modèle">
            {outline.map((row, index) => (
              <li
                key={`${index}-${row.level}`}
                className="flex flex-col gap-2 rounded-lg border border-border/70 bg-muted/30 p-3 sm:flex-row sm:items-center"
              >
                <span className="flex items-center gap-2">
                  <GripVertical
                    className="size-4 text-muted-foreground"
                    aria-hidden
                  />
                  <Select
                    value={String(row.level)}
                    onValueChange={(v) =>
                      updateRow(index, {
                        level: Number(v) as 1 | 2 | 3,
                      })
                    }
                    disabled={readOnly}
                  >
                    <SelectTrigger
                      className="min-h-11 w-24 sm:min-h-9"
                      aria-label={`Niveau du titre ${index + 1}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">H1</SelectItem>
                      <SelectItem value="2">H2</SelectItem>
                      <SelectItem value="3">H3</SelectItem>
                    </SelectContent>
                  </Select>
                </span>
                <Input
                  className={cn(
                    'min-h-11 flex-1 sm:min-h-9',
                    row.level === 2 && 'sm:pl-6',
                    row.level === 3 && 'sm:pl-10',
                  )}
                  value={row.title}
                  onChange={(e) => updateRow(index, { title: e.target.value })}
                  placeholder="Libellé du titre"
                  aria-label={`Libellé du titre ${index + 1}`}
                  disabled={readOnly}
                />
                {!readOnly ? (
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9"
                      aria-label="Monter"
                      disabled={index === 0}
                      onClick={() => moveRow(index, -1)}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9"
                      aria-label="Descendre"
                      disabled={index === outline.length - 1}
                      onClick={() => moveRow(index, 1)}
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9"
                      aria-label="Supprimer le titre"
                      onClick={() => removeRow(index)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {tpl.status === 'DRAFT' ? (
            <Button
              type="button"
              className="min-h-11 sm:min-h-9"
              disabled={
                transitionMut.isPending ||
                !name.trim() ||
                !hasH1 ||
                saveMut.isPending
              }
              onClick={() => {
                saveMut.mutate(undefined, {
                  onSuccess: () => transitionMut.mutate('ACTIVE'),
                });
              }}
            >
              Activer
            </Button>
          ) : null}
          {tpl.status === 'ACTIVE' ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-11 sm:min-h-9"
              disabled={transitionMut.isPending}
              onClick={() => transitionMut.mutate('ARCHIVED')}
            >
              Archiver
            </Button>
          ) : null}
          {tpl.status === 'ARCHIVED' ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-11 sm:min-h-9"
              disabled={transitionMut.isPending}
              onClick={() => transitionMut.mutate('DRAFT')}
            >
              Repasser en brouillon
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-9 text-destructive"
            disabled={deleteMut.isPending}
            onClick={() => {
              if (
                typeof window !== 'undefined' &&
                !window.confirm(
                  'Supprimer ce modèle ? S’il est référencé par des procédures, il sera archivé.',
                )
              ) {
                return;
              }
              deleteMut.mutate();
            }}
          >
            Supprimer
          </Button>
        </div>
        {!readOnly ? (
          <Button
            type="button"
            className="min-h-11 sm:min-h-9"
            disabled={saveMut.isPending || !name.trim()}
            onClick={() => saveMut.mutate()}
          >
            {saveMut.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
