'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/feedback/loading-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { toast } from '@/lib/toast';
import {
  createMicrosoftTeamsChannelTemplate,
  deleteMicrosoftTeamsChannelTemplate,
  getMicrosoftTeamsProvisioningSettings,
  listMicrosoftTeamsChannelTemplates,
  reorderMicrosoftTeamsChannelTemplates,
  updateMicrosoftTeamsChannelTemplate,
  updateMicrosoftTeamsProvisioningSettings,
} from '../api/microsoft-teams-provisioning-settings.api';
import { projectOptionsKeys } from '../lib/project-options-query-keys';
import type { ProjectMicrosoftTeamsChannelTemplateDto } from '../types/project-options.types';
import {
  EMPTY_TEAMS_CHANNEL_TEMPLATE_FORM,
  MicrosoftTeamsChannelTemplateFormDialog,
  type TeamsChannelTemplateFormValues,
} from './microsoft-teams-channel-template-form-dialog';
import { MicrosoftTeamsChannelTemplatesTable } from './microsoft-teams-channel-templates-table';

export function MicrosoftTeamsProvisioningSettings() {
  const { has } = usePermissions();
  const canEdit = has('projects.update');
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const [teamNameTemplate, setTeamNameTemplate] = useState('{{code}} - {{name}}');
  const [teamDescriptionTemplate, setTeamDescriptionTemplate] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [offerOnProjectCreate, setOfferOnProjectCreate] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingTemplate, setEditingTemplate] =
    useState<TeamsChannelTemplateFormValues>(EMPTY_TEAMS_CHANNEL_TEMPLATE_FORM);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const settingsQuery = useQuery({
    queryKey: projectOptionsKeys.microsoftTeamsProvisioningSettings(clientId),
    queryFn: () => getMicrosoftTeamsProvisioningSettings(authFetch),
    enabled: Boolean(clientId),
    retry: false,
  });
  const templatesQuery = useQuery({
    queryKey: projectOptionsKeys.microsoftTeamsChannelTemplates(clientId),
    queryFn: () => listMicrosoftTeamsChannelTemplates(authFetch),
    enabled: Boolean(clientId),
    retry: false,
  });
  const connectionQuery = useQuery({
    queryKey: ['microsoft-connection', clientId],
    queryFn: async () => {
      const res = await authFetch('/api/microsoft/connection');
      if (!res.ok) {
        throw new Error('Impossible de charger la connexion Microsoft.');
      }
      return res.json() as Promise<{ connection: { status: string } | null }>;
    },
    enabled: Boolean(clientId),
    retry: false,
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: projectOptionsKeys.microsoftTeamsProvisioningSettings(clientId),
      }),
      queryClient.invalidateQueries({
        queryKey: projectOptionsKeys.microsoftTeamsChannelTemplates(clientId),
      }),
    ]);
  };

  const settingsMutation = useMutation({
    mutationFn: () =>
      updateMicrosoftTeamsProvisioningSettings(authFetch, {
        isEnabled,
        offerOnProjectCreate,
        teamNameTemplate,
        teamDescriptionTemplate,
      }),
    onSuccess: async (data) => {
      setTeamNameTemplate(data.teamNameTemplate);
      setTeamDescriptionTemplate(data.teamDescriptionTemplate ?? '');
      setIsEnabled(data.isEnabled);
      setOfferOnProjectCreate(data.offerOnProjectCreate);
      await refresh();
      toast.success('Paramètres Teams enregistrés.');
    },
    onError: (error: Error) => toast.error(error.message || 'Enregistrement impossible.'),
  });

  const createTemplateMutation = useMutation({
    mutationFn: (body: TeamsChannelTemplateFormValues) =>
      createMicrosoftTeamsChannelTemplate(authFetch, {
        displayName: body.displayName,
        description: body.description,
        isPrimary: body.isPrimary,
      }),
    onSuccess: async () => {
      await refresh();
      toast.success('Canal par défaut ajouté.');
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: TeamsChannelTemplateFormValues;
    }) =>
      updateMicrosoftTeamsChannelTemplate(authFetch, id, {
        displayName: body.displayName,
        description: body.description,
        isPrimary: body.isPrimary,
      }),
    onSuccess: async () => {
      await refresh();
      toast.success('Template mis à jour.');
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => deleteMicrosoftTeamsChannelTemplate(authFetch, id),
    onSuccess: async () => {
      await refresh();
      toast.success('Template supprimé.');
    },
    onError: (error: Error) => toast.error(error.message || 'Suppression impossible.'),
  });

  const reorderTemplateMutation = useMutation({
    mutationFn: (items: Array<{ id: string; sortOrder: number }>) =>
      reorderMicrosoftTeamsChannelTemplates(authFetch, { items }),
    onSuccess: async () => {
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message || 'Réordonnancement impossible.'),
  });

  const templates = templatesQuery.data?.items ?? [];
  const connectionActive = connectionQuery.data?.connection?.status === 'ACTIVE';

  const dialogPending = createTemplateMutation.isPending || updateTemplateMutation.isPending;

  useEffect(() => {
    const settings = settingsQuery.data;
    if (!settings) return;
    setTeamNameTemplate(settings.teamNameTemplate);
    setTeamDescriptionTemplate(settings.teamDescriptionTemplate ?? '');
    setIsEnabled(settings.isEnabled);
    setOfferOnProjectCreate(settings.offerOnProjectCreate);
  }, [settingsQuery.data]);

  const openCreateDialog = () => {
    setDialogMode('create');
    setEditingTemplateId(null);
    setEditingTemplate(EMPTY_TEAMS_CHANNEL_TEMPLATE_FORM);
    setSubmitError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (template: ProjectMicrosoftTeamsChannelTemplateDto) => {
    setDialogMode('edit');
    setEditingTemplateId(template.id);
    setEditingTemplate({
      displayName: template.displayName,
      description: template.description ?? '',
      isPrimary: template.isPrimary,
    });
    setSubmitError(null);
    setDialogOpen(true);
  };

  const handleDialogSubmit = async (body: TeamsChannelTemplateFormValues) => {
    setSubmitError(null);
    try {
      if (dialogMode === 'create') {
        await createTemplateMutation.mutateAsync(body);
      } else if (editingTemplateId) {
        await updateTemplateMutation.mutateAsync({ id: editingTemplateId, body });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Enregistrement impossible.';
      setSubmitError(message);
      throw error;
    }
  };

  const handleMoveUp = (index: number) => {
    reorderTemplateMutation.mutate(
      templates.map((item, currentIndex) => {
        if (currentIndex === index - 1) {
          return { id: item.id, sortOrder: currentIndex + 1 };
        }
        if (currentIndex === index) {
          return { id: item.id, sortOrder: currentIndex - 1 };
        }
        return { id: item.id, sortOrder: currentIndex };
      }),
    );
  };

  const handleMoveDown = (index: number) => {
    reorderTemplateMutation.mutate(
      templates.map((item, currentIndex) => {
        if (currentIndex === index) {
          return { id: item.id, sortOrder: currentIndex + 1 };
        }
        if (currentIndex === index + 1) {
          return { id: item.id, sortOrder: currentIndex - 1 };
        }
        return { id: item.id, sortOrder: currentIndex };
      }),
    );
  };

  const handleIsEnabledChange = (checked: boolean) => {
    setIsEnabled(checked);
    if (!checked) {
      setOfferOnProjectCreate(false);
    }
  };

  if (settingsQuery.isLoading || templatesQuery.isLoading || connectionQuery.isLoading) {
    return <LoadingState rows={6} />;
  }

  if (settingsQuery.isError || templatesQuery.isError || connectionQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Erreur Microsoft Teams</AlertTitle>
        <AlertDescription>
          Impossible de charger les paramètres ou les templates Teams.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Équipes Microsoft</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!connectionActive ? (
          <Alert>
            <AlertTitle>Connexion Microsoft inactive</AlertTitle>
            <AlertDescription>
              Le flux manuel INT-007 reste disponible, mais le provisioning Teams restera inactif
              tant que la connexion Microsoft 365 n’est pas active. Connectez le client dans{' '}
              <Link className="underline" href="/client/administration/microsoft-365">
                Microsoft 365
              </Link>
              .
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="teams-name-template">Template nom d’équipe</Label>
            <Input
              id="teams-name-template"
              value={teamNameTemplate}
              onChange={(e) => setTeamNameTemplate(e.target.value)}
              placeholder="{{code}} - {{name}}"
              disabled={!canEdit}
            />
            <p className="text-xs text-muted-foreground">
              Variables supportées : <code>{'{{code}}'}</code>, <code>{'{{name}}'}</code>,{' '}
              <code>{'{{ownerName}}'}</code>.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="teams-description-template">Description d’équipe</Label>
            <Input
              id="teams-description-template"
              value={teamDescriptionTemplate}
              onChange={(e) => setTeamDescriptionTemplate(e.target.value)}
              placeholder="Optionnel"
              disabled={!canEdit}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-start gap-3 rounded-lg border border-border/70 bg-muted/20 p-3">
            <input
              type="checkbox"
              className="mt-1 size-4 rounded border-input accent-primary"
              checked={isEnabled}
              onChange={(e) => handleIsEnabledChange(e.target.checked)}
              disabled={!canEdit}
            />
            <span className="space-y-1">
              <span className="block text-sm font-medium">Activer le provisioning Teams</span>
              <span className="block text-xs text-muted-foreground">
                Désactivé par défaut. Aucun provisioning automatique sans activation explicite.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-lg border border-border/70 bg-muted/20 p-3">
            <input
              type="checkbox"
              className="mt-1 size-4 rounded border-input accent-primary"
              checked={offerOnProjectCreate}
              onChange={(e) => setOfferOnProjectCreate(e.target.checked)}
              disabled={!canEdit || !isEnabled}
            />
            <span className="space-y-1">
              <span className="block text-sm font-medium">Proposer à la création projet</span>
              <span className="block text-xs text-muted-foreground">
                La case restera décochée par défaut sur l’écran “Nouveau projet”.
              </span>
            </span>
          </label>
        </div>

        {canEdit ? (
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => settingsMutation.mutate()}
              disabled={settingsMutation.isPending}
            >
              {settingsMutation.isPending ? 'Enregistrement…' : 'Enregistrer les paramètres'}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Lecture seule — pas de modification.</p>
        )}

        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Canaux par défaut</h3>
              <p className="text-xs text-muted-foreground">
                Un seul canal principal est autorisé. Sans canal principal configuré ici, le canal
                Microsoft “Général” restera la cible du lien Starium.
              </p>
            </div>
            {canEdit ? (
              <Button type="button" onClick={openCreateDialog}>
                Ajouter
              </Button>
            ) : null}
          </div>

          <MicrosoftTeamsChannelTemplatesTable
            templates={templates}
            canEdit={canEdit}
            isReordering={reorderTemplateMutation.isPending}
            onEdit={openEditDialog}
            onDelete={(id) => deleteTemplateMutation.mutate(id)}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
          />
        </div>

        <MicrosoftTeamsChannelTemplateFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          mode={dialogMode}
          initialValues={editingTemplate}
          onSubmit={handleDialogSubmit}
          isPending={dialogPending}
          canEdit={canEdit}
          errorMessage={submitError}
        />
      </CardContent>
    </Card>
  );
}
