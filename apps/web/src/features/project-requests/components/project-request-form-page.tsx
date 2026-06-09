'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  createProjectRequest,
  fetchValidatorOptions,
  fetchWorkflowSettings,
} from '../api/project-requests.api';

export function ProjectRequestFormPage() {
  const router = useRouter();
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [validatorUserId, setValidatorUserId] = useState('');

  const { data: settings } = useQuery({
    queryKey: ['project-request-workflow-settings', clientId],
    queryFn: () => fetchWorkflowSettings(authFetch),
    enabled: !!clientId,
  });

  const { data: validators, isLoading: validatorsLoading } = useQuery({
    queryKey: ['project-request-validator-options', clientId],
    queryFn: () => fetchValidatorOptions(authFetch),
    enabled: !!clientId && settings?.resolved.allowRequesterToSelectValidator !== false,
  });

  const mutation = useMutation({
    mutationFn: () =>
      createProjectRequest(authFetch, {
        title,
        description,
        validatorUserId: validatorUserId || undefined,
      }),
    onSuccess: (row) => {
      router.push(`/projects/requests/${row.id}`);
    },
  });

  const canPickValidator = settings?.resolved.allowRequesterToSelectValidator !== false;

  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader title="Nouvelle demande projet" />
        <form
          className="max-w-xl space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="title">Titre</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
            />
          </div>
          {canPickValidator ? (
            <div className="space-y-2">
              <Label>Validateur</Label>
              {validatorsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Select value={validatorUserId} onValueChange={(v) => setValidatorUserId(v ?? '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un validateur" />
                  </SelectTrigger>
                  <SelectContent>
                    {(validators ?? []).map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ) : null}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Enregistrement…' : 'Créer le brouillon'}
          </Button>
        </form>
      </PageContainer>
    </RequireActiveClient>
  );
}
