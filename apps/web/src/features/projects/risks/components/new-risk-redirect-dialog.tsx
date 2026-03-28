'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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

  /** Clé stable (ids) pour ne pas réinitialiser la sélection à chaque nouvelle référence de tableau. */
  const projectListKey = projectItems.map((p) => p.id).join('|');

  useEffect(() => {
    if (!open) {
      setProjectId('');
      return;
    }
    if (projectItems.length === 1) {
      setProjectId(projectItems[0].id);
    } else {
      setProjectId((prev) =>
        prev && projectItems.some((p) => p.id === prev) ? prev : '',
      );
    }
  }, [open, projectListKey, projectItems]);

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
          <DialogDescription className="text-pretty">
            <span className="font-medium text-foreground">Pourquoi un projet ?</span> Dans Starium, la
            création d’une fiche risque passe par l’API projet : chaque enregistrement a un{' '}
            <span className="whitespace-nowrap">projet parent</span> obligatoire (modèle technique), pas un
            choix UX arbitraire. Sujet transverse ou « hors projet » métier : rattachez à un projet porteur
            existant, ou créez un projet dédié / fourre-tout dans le portefeuille si votre organisation le
            prévoit.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="new-risk-project">Projet parent</Label>
          <Select value={projectId} onValueChange={(v) => setProjectId(v ?? '')}>
            <SelectTrigger id="new-risk-project">
              <SelectValue
                placeholder={projectItems.length ? 'Choisir un projet…' : 'Aucun projet chargé'}
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
