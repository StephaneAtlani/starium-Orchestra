'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/lib/toast';
import { formatProjectDateTimeFr } from '../lib/projects-list-display';
import { useProjectReviewMutations } from '../hooks/use-project-review-mutations';
import type {
  ProjectReviewParticipantApi,
  ProjectReviewStatus,
} from '../types/project.types';
import { Mail, Users } from 'lucide-react';

type Props = {
  projectId: string;
  reviewId: string;
  status: ProjectReviewStatus;
  participants: ProjectReviewParticipantApi[];
  canEdit: boolean;
};

function countInviteStats(participants: ProjectReviewParticipantApi[]) {
  let notifiable = 0;
  let external = 0;
  for (const p of participants) {
    if (p.userId) notifiable += 1;
    else external += 1;
  }
  return { notifiable, external };
}

function latestInviteAt(participants: ProjectReviewParticipantApi[]): string | null {
  let latest: string | null = null;
  for (const p of participants) {
    if (!p.lastInvitedAt) continue;
    if (!latest || new Date(p.lastInvitedAt).getTime() > new Date(latest).getTime()) {
      latest = p.lastInvitedAt;
    }
  }
  return latest;
}

export function ReviewInvitationsSection({
  projectId,
  reviewId,
  status,
  participants,
  canEdit,
}: Props) {
  const { inviteReview } = useProjectReviewMutations(projectId);
  const [feedback, setFeedback] = useState<string | null>(null);
  const liveRef = useRef<HTMLDivElement>(null);

  const visible = status === 'PLANNED' && canEdit;
  const { notifiable, external } = useMemo(
    () => countInviteStats(participants),
    [participants],
  );
  const lastSentAt = useMemo(() => latestInviteAt(participants), [participants]);

  useEffect(() => {
    if (feedback && liveRef.current) {
      liveRef.current.focus();
    }
  }, [feedback]);

  if (!visible) return null;

  const onInvite = async () => {
    setFeedback(null);
    try {
      const result = await inviteReview.mutateAsync({ reviewId });
      const message = `${result.notified} participant(s) notifié(s)${
        result.skippedExternal > 0
          ? ` · ${result.skippedExternal} externe(s) non notifiable(s) in-app`
          : ''
      }${
        result.skippedInactive > 0
          ? ` · ${result.skippedInactive} inactif(s) ignoré(s)`
          : ''
      }`;
      setFeedback(message);
      toast.success(message);
    } catch {
      setFeedback('Impossible d’envoyer les invitations.');
      toast.error('Impossible d’envoyer les invitations.');
    }
  };

  return (
    <section
      className="starium-form-section rounded-xl border border-border/70 bg-card p-4"
      aria-labelledby="review-invitations-title"
    >
      <div className="mb-3 flex items-start gap-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-sky-700 dark:text-sky-400"
          aria-hidden
        >
          <Mail className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 id="review-invitations-title" className="text-sm font-semibold">
            Invitations
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Notification in-app pour les participants internes. Les externes recevront une
            invitation par e-mail dans une phase ultérieure.
          </p>
        </div>
      </div>

      <div className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
        <p className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2">
          <Users className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span>
            <span className="font-medium">{notifiable}</span> participant(s) interne(s)
            notifiable(s)
          </span>
        </p>
        <p className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-muted-foreground">
          <span className="font-medium text-foreground">{external}</span> externe(s) non
          notifiable(s) in-app
        </p>
      </div>

      {lastSentAt ? (
        <p className="mb-3 text-xs text-muted-foreground">
          Dernier envoi : {formatProjectDateTimeFr(lastSentAt)}
        </p>
      ) : (
        <p className="mb-3 text-xs text-muted-foreground">Aucune invitation envoyée.</p>
      )}

      <div
        ref={liveRef}
        tabIndex={-1}
        aria-live="polite"
        className="sr-only"
      >
        {feedback}
      </div>

      {feedback ? (
        <p className="mb-3 text-sm text-foreground" aria-hidden>
          {feedback}
        </p>
      ) : null}

      <Button
        type="button"
        className="starium-btn min-h-11 w-full sm:w-auto"
        disabled={inviteReview.isPending || notifiable === 0}
        onClick={() => void onInvite()}
      >
        {inviteReview.isPending ? 'Envoi…' : 'Inviter les participants'}
      </Button>
    </section>
  );
}
