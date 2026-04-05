'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { LoadingState } from '@/components/feedback/loading-state';
import {
  getClientResourceTimesheetSettings,
  patchClientResourceTimesheetSettings,
} from '@/features/teams/resource-time-entries/api/client-resource-timesheet-settings.api';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { toast } from '@/lib/toast';

const DEFAULT_SETTINGS: {
  ignoreWeekendsDefault: boolean;
  allowFractionAboveOne: boolean;
  dayReferenceHours: number;
} = {
  ignoreWeekendsDefault: true,
  allowFractionAboveOne: false,
  dayReferenceHours: 7.5,
};

export default function ResourceTimesheetOptionsPage() {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const isClientAdmin = activeClient?.role === 'CLIENT_ADMIN';
  const { has, isLoading: permsLoading, isSuccess: permsOk } = usePermissions();
  const canRead = has('resources.read');
  const canWrite = has('resources.update');

  const settingsQuery = useQuery({
    queryKey: ['client-resource-timesheet-settings', clientId],
    queryFn: () => getClientResourceTimesheetSettings(authFetch),
    enabled: permsOk && canRead && !!clientId,
  });

  const [ignoreWeekendsDefault, setIgnoreWeekendsDefault] = useState(
    DEFAULT_SETTINGS.ignoreWeekendsDefault,
  );
  const [allowFractionAboveOne, setAllowFractionAboveOne] = useState(
    DEFAULT_SETTINGS.allowFractionAboveOne,
  );
  const [dayReferenceHours, setDayReferenceHours] = useState(DEFAULT_SETTINGS.dayReferenceHours);

  useEffect(() => {
    if (!settingsQuery.data) return;
    setIgnoreWeekendsDefault(settingsQuery.data.ignoreWeekendsDefault);
    setAllowFractionAboveOne(settingsQuery.data.allowFractionAboveOne);
    setDayReferenceHours(settingsQuery.data.dayReferenceHours);
  }, [settingsQuery.data]);

  const saveMut = useMutation({
    mutationFn: () =>
      patchClientResourceTimesheetSettings(authFetch, {
        timesheetIgnoreWeekendsDefault: ignoreWeekendsDefault,
        timesheetAllowFractionAboveOne: allowFractionAboveOne,
        timesheetDayReferenceHours: dayReferenceHours,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['client-resource-timesheet-settings', clientId], data);
      void queryClient.invalidateQueries({
        queryKey: ['client-resource-timesheet-settings', clientId],
      });
      toast.success('Paramètres enregistrés.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canEdit = isClientAdmin && canWrite;
  const dayHValid = Number.isFinite(dayReferenceHours) && dayReferenceHours >= 4 && dayReferenceHours <= 12;

  return (
    <RequireActiveClient>
      <PageContainer>
        <div className="mb-4">
          <Button variant="ghost" size="sm" className="-ml-2 gap-1" asChild>
            <Link href="/teams/time-entries">
              <ChevronLeft className="size-4" />
              Temps réalisé
            </Link>
          </Button>
        </div>

        <PageHeader
          title="Options — temps réalisé"
          description="Règles par défaut et contraintes de saisie pour la grille mensuelle (ressources humaines)."
        />

        {permsLoading && <LoadingState rows={2} />}
        {permsOk && !canRead && (
          <Alert className="border-amber-500/35">
            <AlertTitle>Accès refusé</AlertTitle>
            <AlertDescription>
              Permission requise : <code>resources.read</code>.
            </AlertDescription>
          </Alert>
        )}

        {permsOk && canRead && !isClientAdmin && (
          <Alert className="mb-4">
            <AlertTitle>Consultation</AlertTitle>
            <AlertDescription>
              Seuls les administrateurs client peuvent enregistrer des changements. Les valeurs affichées
              reflètent le paramétrage courant lorsque le chargement réussit.
            </AlertDescription>
          </Alert>
        )}

        {permsOk && canRead && settingsQuery.isLoading && (
          <LoadingState rows={2} className="mb-4 max-w-xl" />
        )}
        {settingsQuery.isError && (
          <Alert variant="destructive" className="mb-4 max-w-xl">
            <AlertTitle>Impossible de charger les paramètres serveur</AlertTitle>
            <AlertDescription className="space-y-1">
              <span className="block">
                {(settingsQuery.error as Error)?.message?.trim() ||
                  'Vérifiez que l’API est à jour (migration Prisma `client_resource_timesheet_settings`) et que le backend tourne.'}
              </span>
              <span className="block text-xs">
                Les champs ci-dessous utilisent des valeurs par défaut locales ; l’enregistrement peut
                échouer tant que l’API ne répond pas correctement.
              </span>
            </AlertDescription>
          </Alert>
        )}

        {permsOk && canRead && (
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle>Paramètres</CardTitle>
              <CardDescription>
                S’appliquent à tous les utilisateurs du client sur la page Temps réalisé. La durée de
                référence sert à convertir les fractions de journée en heures enregistrées côté API.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-sm font-medium leading-none">Sans week-ends par défaut</span>
                  <p className="text-sm text-muted-foreground">
                    Case cochée à l’ouverture de la grille ; l’utilisateur peut la décocher.
                  </p>
                </div>
                <Switch
                  aria-label="Sans week-ends par défaut"
                  checked={ignoreWeekendsDefault}
                  onCheckedChange={setIgnoreWeekendsDefault}
                  disabled={!canEdit || saveMut.isPending}
                />
              </div>

              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-sm font-medium leading-none">
                    Autoriser plus d’une journée par cellule
                  </span>
                  <p className="text-sm text-muted-foreground">
                    Si désactivé, une cellule ne peut pas dépasser une journée type (voir ci-dessous),
                    côté interface et côté API.
                  </p>
                </div>
                <Switch
                  aria-label="Autoriser plus d’une journée par cellule"
                  checked={allowFractionAboveOne}
                  onCheckedChange={setAllowFractionAboveOne}
                  disabled={!canEdit || saveMut.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="opt-day-h">Durée d’une journée type (heures)</Label>
                <Input
                  id="opt-day-h"
                  type="number"
                  min={4}
                  max={12}
                  step={0.25}
                  value={Number.isFinite(dayReferenceHours) ? dayReferenceHours : ''}
                  onChange={(e) => setDayReferenceHours(Number(e.target.value))}
                  disabled={!canEdit || saveMut.isPending}
                  className="max-w-[10rem]"
                />
                <p className="text-sm text-muted-foreground">
                  Entre 4 et 12 h (ex. 7,5). Utilisée pour convertir la fraction affichée (ex. 0,5) en
                  heures enregistrées.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={!canEdit || !dayHValid || saveMut.isPending}
                  onClick={() => saveMut.mutate()}
                >
                  {saveMut.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    'Enregistrer'
                  )}
                </Button>
                {!canEdit && isClientAdmin && (
                  <span className="self-center text-sm text-muted-foreground">
                    Permission requise pour enregistrer : <code>resources.update</code>
                  </span>
                )}
                {!canEdit && !isClientAdmin && (
                  <span className="self-center text-sm text-muted-foreground">
                    Réservé aux administrateurs client pour l’enregistrement.
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </PageContainer>
    </RequireActiveClient>
  );
}
