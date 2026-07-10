'use client';

import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { createActionPlan } from '../api/action-plans.api';
import { projectQueryKeys } from '../lib/project-query-keys';
import {
  ACTION_PLAN_PRIORITY_OPTIONS,
  ACTION_PLAN_STATUS_OPTIONS,
  suggestActionPlanCodeFromTitle,
} from '../lib/action-plan-display';

export function ActionPlanCreateDialog({
  open,
  onOpenChange,
  clientId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
}) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formCode, setFormCode] = useState('');
  const [codeFollowsTitle, setCodeFollowsTitle] = useState(true);
  const [formStatus, setFormStatus] = useState('DRAFT');
  const [formPriority, setFormPriority] = useState('MEDIUM');

  function resetCreateForm() {
    setFormTitle('');
    setFormCode('');
    setCodeFollowsTitle(true);
    setFormStatus('DRAFT');
    setFormPriority('MEDIUM');
  }

  function onTitleChange(value: string) {
    setFormTitle(value);
    if (codeFollowsTitle) {
      const t = value.trim();
      setFormCode(t ? suggestActionPlanCodeFromTitle(t) : '');
    }
  }

  function onCodeChange(value: string) {
    setCodeFollowsTitle(false);
    setFormCode(value);
  }

  async function onCreate() {
    const title = formTitle.trim();
    if (!title) return;
    const code = (formCode.trim() || suggestActionPlanCodeFromTitle(title)).toUpperCase();
    setCreating(true);
    try {
      await createActionPlan(authFetch, {
        title,
        code,
        status: formStatus,
        priority: formPriority,
      });
      await queryClient.invalidateQueries({
        queryKey: [...projectQueryKeys.all, 'action-plans', clientId],
      });
      onOpenChange(false);
      resetCreateForm();
    } finally {
      setCreating(false);
    }
  }

  return (
    <StariumModal
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) resetCreateForm();
      }}
      title="Nouveau plan d'action"
      icon={ClipboardList}
      accent="emerald"
      size="md"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            disabled={creating || !formTitle.trim()}
            onClick={() => void onCreate()}
          >
            {creating ? 'Création…' : 'Créer'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="ap-titre">Titre</Label>
          <Input
            id="ap-titre"
            value={formTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Ex. Plan conformité Q2"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ap-code">Code</Label>
          <Input
            id="ap-code"
            value={formCode}
            onChange={(e) => onCodeChange(e.target.value)}
            placeholder="Rempli automatiquement depuis le titre"
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Généré à partir du titre (préfixe PA-) ; vous pouvez le modifier.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ap-create-status">Statut</Label>
            <Select
              value={formStatus}
              onValueChange={(v) => setFormStatus(v ?? 'DRAFT')}
            >
              <SelectTrigger id="ap-create-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTION_PLAN_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ap-create-priority">Priorité</Label>
            <Select
              value={formPriority}
              onValueChange={(v) => setFormPriority(v ?? 'MEDIUM')}
            >
              <SelectTrigger id="ap-create-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTION_PLAN_PRIORITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </StariumModal>
  );
}
