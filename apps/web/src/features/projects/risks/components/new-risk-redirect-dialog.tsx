'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ProjectListItem } from '../../types/project.types';
import { projectRisks } from '../../constants/project-routes';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectItems: ProjectListItem[];
};

export function NewRiskRedirectDialog({ open, onOpenChange, projectItems }: Props) {
  const router = useRouter();
  const [projectId, setProjectId] = useState<string>('');

  const canSubmit = projectId.length > 0;

  const handleContinue = () => {
    if (!canSubmit) return;
    onOpenChange(false);
    router.push(projectRisks(projectId));
    setProjectId('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau risque</DialogTitle>
          <DialogDescription>
            Rattachez le risque à une initiative pour l’enregistrer. Vous serez guidé vers la fiche de
            suivi pour la saisie détaillée (traitements, criticité, etc.).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="new-risk-project">Initiative</Label>
          <Select value={projectId} onValueChange={(v) => setProjectId(v ?? '')}>
            <SelectTrigger id="new-risk-project">
              <SelectValue
                placeholder={projectItems.length ? 'Choisir une initiative…' : 'Aucune initiative chargée'}
              />
            </SelectTrigger>
            <SelectContent>
              {projectItems.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="button" onClick={handleContinue} disabled={!canSubmit}>
            Continuer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
