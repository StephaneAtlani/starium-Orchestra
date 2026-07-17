'use client';

import { useEffect, useState } from 'react';
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

type TemplateFormState = {
  displayName: string;
  description: string;
  isPrimary: boolean;
};

const EMPTY_FORM: TemplateFormState = {
  displayName: '',
  description: '',
  isPrimary: false,
};

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
  const [newTemplate, setNewTemplate] = useState<TemplateFormState>(EMPTY_FORM);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<TemplateFormState>(EMPTY_FORM);

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
    mutationFn: () =>
      createMicrosoftTeamsChannelTemplate(authFetch, {
        displayName: newTemplate.displayName,
        description: newTemplate.description,
        isPrimary: newTemplate.isPrimary,
      }),
    onSuccess: async () => {
      setNewTemplate(EMPTY_FORM);
      await refresh();
      toast.success('Canal par défaut ajouté.');
    },
    onError: (error: Error) => toast.error(error.message || 'Création impossible.'),
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: TemplateFormState;
    }) =>
      updateMicrosoftTeamsChannelTemplate(authFetch, id, {
        displayName: body.displayName,
        description: body.description,
        isPrimary: body.isPrimary,
      }),
    onSuccess: async () => {
      setEditingTemplateId(null);
      setEditingTemplate(EMPTY_FORM);
      await refresh();
      toast.success('Template mis à jour.');
    },
    onError: (error: Error) => toast.error(error.message || 'Mise à jour impossible.'),
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

  useEffect(() => {
    const settings = settingsQuery.data;
    if (!settings) return;
    setTeamNameTemplate(settings.teamNameTemplate);
    setTeamDescriptionTemplate(settings.teamDescriptionTemplate ?? '');
    setIsEnabled(settings.isEnabled);
    setOfferOnProjectCreate(settings.offerOnProjectCreate);
  }, [settingsQuery.data]);

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
              tant que la connexion Microsoft 365 n’est pas active.
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
              onChange={(e) => setIsEnabled(e.target.checked)}
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
              <span className="block text-sm font-medium">
                Proposer à la création projet
              </span>
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
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">Canaux par défaut</h3>
            <p className="text-xs text-muted-foreground">
              Un seul canal principal est autorisé. Sans canal principal configuré ici, le canal
              Microsoft “Général” restera la cible du lien Starium.
            </p>
          </div>

          {canEdit ? (
            <div className="grid gap-3 rounded-lg border border-border/70 bg-muted/20 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
              <Input
                value={newTemplate.displayName}
                onChange={(e) =>
                  setNewTemplate((prev) => ({ ...prev, displayName: e.target.value }))
                }
                placeholder="Nom du canal"
              />
              <Input
                value={newTemplate.description}
                onChange={(e) =>
                  setNewTemplate((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Description"
              />
              <label className="flex min-h-10 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 rounded border-input accent-primary"
                  checked={newTemplate.isPrimary}
                  onChange={(e) =>
                    setNewTemplate((prev) => ({ ...prev, isPrimary: e.target.checked }))
                  }
                />
                Principal
              </label>
              <Button
                type="button"
                onClick={() => createTemplateMutation.mutate()}
                disabled={!newTemplate.displayName.trim() || createTemplateMutation.isPending}
              >
                Ajouter
              </Button>
            </div>
          ) : null}

          <div className="space-y-2">
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun canal par défaut configuré. Exemples suggérés : Pilotage, Exécution,
                Documentation.
              </p>
            ) : (
              templates.map((template, index) => {
                const isEditing = editingTemplateId === template.id;
                return (
                  <div
                    key={template.id}
                    className="flex flex-col gap-3 rounded-lg border border-border/70 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>Ordre {template.sortOrder + 1}</span>
                      {template.isPrimary ? <span>Canal principal</span> : null}
                    </div>

                    {isEditing ? (
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                        <Input
                          value={editingTemplate.displayName}
                          onChange={(e) =>
                            setEditingTemplate((prev) => ({
                              ...prev,
                              displayName: e.target.value,
                            }))
                          }
                        />
                        <Input
                          value={editingTemplate.description}
                          onChange={(e) =>
                            setEditingTemplate((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                        />
                        <label className="flex min-h-10 items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="size-4 rounded border-input accent-primary"
                            checked={editingTemplate.isPrimary}
                            onChange={(e) =>
                              setEditingTemplate((prev) => ({
                                ...prev,
                                isPrimary: e.target.checked,
                              }))
                            }
                          />
                          Principal
                        </label>
                      </div>
                    ) : (
                      <div className="grid gap-1">
                        <p className="text-sm font-medium">{template.displayName}</p>
                        <p className="text-sm text-muted-foreground">
                          {template.description || 'Aucune description'}
                        </p>
                      </div>
                    )}

                    {canEdit ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={index === 0 || reorderTemplateMutation.isPending}
                          onClick={() =>
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
                            )
                          }
                        >
                          Monter
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={
                            index === templates.length - 1 || reorderTemplateMutation.isPending
                          }
                          onClick={() =>
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
                            )
                          }
                        >
                          Descendre
                        </Button>
                        {isEditing ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() =>
                                updateTemplateMutation.mutate({
                                  id: template.id,
                                  body: editingTemplate,
                                })
                              }
                              disabled={!editingTemplate.displayName.trim()}
                            >
                              Enregistrer
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingTemplateId(null);
                                setEditingTemplate(EMPTY_FORM);
                              }}
                            >
                              Annuler
                            </Button>
                          </>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingTemplateId(template.id);
                              setEditingTemplate({
                                displayName: template.displayName,
                                description: template.description ?? '',
                                isPrimary: template.isPrimary,
                              });
                            }}
                          >
                            Modifier
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteTemplateMutation.mutate(template.id)}
                        >
                          Supprimer
                        </Button>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
