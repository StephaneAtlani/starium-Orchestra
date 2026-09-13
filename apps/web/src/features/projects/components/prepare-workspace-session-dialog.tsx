'use client';

import { useEffect, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/lib/toast';
import { PROJECT_REVIEW_MEETING_MODE_LABEL } from '../constants/project-enum-labels';
import { useProjectReviewMutations } from '../hooks/use-project-review-mutations';
import {
  formatProjectDatetimeLocal,
  normalizeProjectDatetimeLocalValue,
} from '../lib/project-datetime-local';
import type {
  ProjectReviewDetail,
  ProjectReviewMeetingMode,
} from '../types/project.types';
import { ProjectDatetimeLocalInput } from './project-datetime-local-input';

const MEETING_MODES: ProjectReviewMeetingMode[] = ['REMOTE', 'ONSITE', 'HYBRID'];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  detail: ProjectReviewDetail;
  canEdit: boolean;
};

function toLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return formatProjectDatetimeLocal(new Date(iso));
  } catch {
    return '';
  }
}

function fromLocal(local: string): string {
  return new Date(local).toISOString();
}

function apiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function PrepareWorkspaceSessionDialog({
  open,
  onOpenChange,
  projectId,
  detail,
  canEdit,
}: Props) {
  const { update } = useProjectReviewMutations(projectId);
  const [title, setTitle] = useState('');
  const [reviewDate, setReviewDate] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [meetingMode, setMeetingMode] = useState<ProjectReviewMeetingMode | ''>(
    '',
  );
  const [meetingUrl, setMeetingUrl] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(detail.title ?? '');
    setReviewDate(toLocal(detail.reviewDate));
    setDurationMinutes(
      detail.durationMinutes != null ? String(detail.durationMinutes) : '',
    );
    setMeetingMode(detail.meetingMode ?? '');
    setMeetingUrl(detail.meetingUrl ?? '');
    setLocation(detail.location ?? '');
  }, [open, detail]);

  const showUrl = meetingMode === 'REMOTE' || meetingMode === 'HYBRID';
  const showLocation = meetingMode === 'ONSITE' || meetingMode === 'HYBRID';
  const canSubmit = canEdit && !update.isPending;

  const onSave = () => {
    if (!canEdit) return;
    const trimmedTitle = title.trim();
    const normalizedDate = normalizeProjectDatetimeLocalValue(reviewDate);
    if (!normalizedDate) {
      toast.error('Indiquez une date et une heure valides.');
      return;
    }
    const durationRaw = durationMinutes.trim();
    let duration: number | null = null;
    if (durationRaw) {
      const n = Number.parseInt(durationRaw, 10);
      if (!Number.isFinite(n) || n < 1) {
        toast.error('La durée doit être un entier ≥ 1 minute.');
        return;
      }
      duration = n;
    }
    const url = meetingUrl.trim();
    if (showUrl && url && !/^https?:\/\//i.test(url)) {
      toast.error('Le lien de réunion doit commencer par http:// ou https://.');
      return;
    }

    update.mutate(
      {
        reviewId: detail.id,
        body: {
          title: trimmedTitle || null,
          reviewDate: fromLocal(normalizedDate),
          durationMinutes: duration,
          meetingMode: meetingMode || null,
          meetingUrl: showUrl ? url || null : null,
          location: showLocation ? location.trim() || null : null,
        },
      },
      {
        onSuccess: () => {
          toast.success('Session mise à jour.');
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(apiErrorMessage(err, 'Impossible d’enregistrer la session.'));
        },
      },
    );
  };

  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title="Modifier la session"
      description="Date, horaire, titre et modalités de la réunion."
      icon={CalendarClock}
      size="lg"
      overlayClassName="!z-[100] bg-black/55 dark:bg-black/70"
      contentClassName="!z-[101]"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-9"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            type="button"
            className="min-h-11 sm:min-h-9"
            disabled={!canSubmit}
            onClick={onSave}
          >
            {update.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </>
      }
    >
      <div className="starium-form space-y-4">
        <div className="grid gap-1.5">
          <Label htmlFor="pw-session-title">Titre</Label>
          <Input
            id="pw-session-title"
            className="starium-form-input min-h-11"
            value={title}
            disabled={!canEdit}
            maxLength={500}
            placeholder="Ex. Revue risques — cyber"
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="pw-session-datetime">Date et heure</Label>
          <ProjectDatetimeLocalInput
            id="pw-session-datetime"
            value={reviewDate}
            disabled={!canEdit}
            required
            onChange={setReviewDate}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="pw-session-duration">Durée (minutes)</Label>
          <Input
            id="pw-session-duration"
            type="number"
            inputMode="numeric"
            min={1}
            step={5}
            className="starium-form-input min-h-11"
            value={durationMinutes}
            disabled={!canEdit}
            placeholder="Ex. 60"
            onChange={(e) => setDurationMinutes(e.target.value)}
          />
        </div>

        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-foreground">Mode</legend>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {MEETING_MODES.map((mode) => (
              <label
                key={mode}
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
              >
                <input
                  type="radio"
                  name="pw-session-meeting-mode"
                  value={mode}
                  checked={meetingMode === mode}
                  disabled={!canEdit}
                  onChange={() => setMeetingMode(mode)}
                  className="size-4"
                />
                {PROJECT_REVIEW_MEETING_MODE_LABEL[mode] ?? mode}
              </label>
            ))}
          </div>
        </fieldset>

        {showUrl ? (
          <div className="grid gap-1.5">
            <Label htmlFor="pw-session-url">Lien de réunion</Label>
            <Input
              id="pw-session-url"
              type="url"
              className="starium-form-input min-h-11"
              value={meetingUrl}
              disabled={!canEdit}
              placeholder="https://…"
              onChange={(e) => setMeetingUrl(e.target.value)}
            />
          </div>
        ) : null}

        {showLocation ? (
          <div className="grid gap-1.5">
            <Label htmlFor="pw-session-location">Lieu</Label>
            <Input
              id="pw-session-location"
              className="starium-form-input min-h-11"
              value={location}
              disabled={!canEdit}
              maxLength={300}
              placeholder="Salle, adresse…"
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        ) : null}
      </div>
    </StariumModal>
  );
}
