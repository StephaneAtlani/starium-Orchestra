'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useCreateProject } from '../hooks/use-create-project';
import {
  PROJECT_TYPE_LABEL,
  PROJECT_STATUS_LABEL,
  PROJECT_PRIORITY_LABEL,
  PROJECT_CRITICALITY_LABEL,
} from '../constants/project-enum-labels';

export function ProjectCreateForm() {
  const create = useCreateProject();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('TRANSFORMATION');
  const [status, setStatus] = useState('DRAFT');
  const [priority, setPriority] = useState('MEDIUM');
  const [criticality, setCriticality] = useState('MEDIUM');
  const [progressPercent, setProgressPercent] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [targetEndDate, setTargetEndDate] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    const body: Record<string, unknown> = {
      name: name.trim(),
      code: code.trim(),
      type,
      priority,
      criticality,
      status,
    };
    if (description.trim()) body.description = description.trim();
    if (progressPercent !== '') {
      const n = Number(progressPercent);
      if (!Number.isNaN(n)) body.progressPercent = Math.min(100, Math.max(0, Math.round(n)));
    }
    if (startDate) body.startDate = startDate;
    if (targetEndDate) body.targetEndDate = targetEndDate;

    create.mutate(body);
  };

  return (
    <form onSubmit={submit} className="max-w-xl space-y-4">
      <div className="space-y-2">
        <Label htmlFor="p-name">Nom *</Label>
        <Input
          id="p-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoComplete="off"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="p-code">Code *</Label>
        <Input
          id="p-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          autoComplete="off"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="p-desc">Description</Label>
        <Input
          id="p-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <span className="text-sm font-medium">Type</span>
          <Select value={type} onValueChange={(v) => setType(v ?? 'TRANSFORMATION')}>
            <SelectTrigger>
              <SelectValue>{PROJECT_TYPE_LABEL[type]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PROJECT_TYPE_LABEL).map(([k, label]) => (
                <SelectItem key={k} value={k}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <span className="text-sm font-medium">Statut</span>
          <Select value={status} onValueChange={(v) => setStatus(v ?? 'DRAFT')}>
            <SelectTrigger>
              <SelectValue>{PROJECT_STATUS_LABEL[status]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PROJECT_STATUS_LABEL).map(([k, label]) => (
                <SelectItem key={k} value={k}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <span className="text-sm font-medium">Priorité</span>
          <Select value={priority} onValueChange={(v) => setPriority(v ?? 'MEDIUM')}>
            <SelectTrigger>
              <SelectValue>{PROJECT_PRIORITY_LABEL[priority]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PROJECT_PRIORITY_LABEL).map(([k, label]) => (
                <SelectItem key={k} value={k}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <span className="text-sm font-medium">Criticité</span>
          <Select value={criticality} onValueChange={(v) => setCriticality(v ?? 'MEDIUM')}>
            <SelectTrigger>
              <SelectValue>{PROJECT_CRITICALITY_LABEL[criticality]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PROJECT_CRITICALITY_LABEL).map(([k, label]) => (
                <SelectItem key={k} value={k}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="p-start">Début</Label>
          <Input
            id="p-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="p-end">Échéance cible</Label>
          <Input
            id="p-end"
            type="date"
            value={targetEndDate}
            onChange={(e) => setTargetEndDate(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="p-prog">Avancement % (0–100)</Label>
        <Input
          id="p-prog"
          inputMode="numeric"
          value={progressPercent}
          onChange={(e) => setProgressPercent(e.target.value)}
          placeholder="Optionnel"
        />
      </div>
      <Button type="submit" disabled={create.isPending}>
        {create.isPending ? 'Création…' : 'Créer le projet'}
      </Button>
    </form>
  );
}
