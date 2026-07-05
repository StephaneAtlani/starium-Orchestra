'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/lib/toast';
import { formatProjectDateTimeFr } from '../lib/projects-list-display';
import { useProjectReviewMutations } from '../hooks/use-project-review-mutations';
import { useProjectMicrosoftLinkQuery } from '../options/hooks/use-project-microsoft-link-query';
import type {
  InviteProjectReviewPayload,
  ProjectReviewMeetingMode,
  ProjectReviewParticipantApi,
  ProjectReviewStatus,
} from '../types/project.types';
import { Calendar, Mail, Users, Video } from 'lucide-react';

type Props = {
  projectId: string;
  reviewId: string;
  status: ProjectReviewStatus;
  meetingMode: ProjectReviewMeetingMode | null;
  meetingUrl: string | null;
  microsoftOnlineMeetingId?: string | null;
  participants: ProjectReviewParticipantApi[];
  canEdit: boolean;
};

function countInviteStats(participants: ProjectReviewParticipantApi[]) {
  let internal = 0;
  let external = 0;
  let emailable = 0;
  for (const p of participants) {
    if (p.userId) internal += 1;
    else {
      external += 1;
      if (p.externalEmail?.trim()) emailable += 1;
    }
  }
  return { internal, external, emailable };
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

function isVisioMode(mode: ProjectReviewMeetingMode | null): boolean {
  return mode === 'REMOTE' || mode === 'HYBRID';
}

export function ReviewInvitationsSection({
  projectId,
  reviewId,
  status,
  meetingMode,
  meetingUrl,
  microsoftOnlineMeetingId,
  participants,
  canEdit,
}: Props) {
  const { inviteReview } = useProjectReviewMutations(projectId);
  const linkQuery = useProjectMicrosoftLinkQuery(projectId);
  const [notifyInApp, setNotifyInApp] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [createTeamsMeeting, setCreateTeamsMeeting] = useState(false);
  const [createCalendarEvent, setCreateCalendarEvent] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const liveRef = useRef<HTMLDivElement>(null);

  const visible = status === 'PLANNED' && canEdit;
  const { internal, external, emailable } = useMemo(
    () => countInviteStats(participants),
    [participants],
  );
  const lastSentAt = useMemo(() => latestInviteAt(participants), [participants]);

  const microsoftReady =
    Boolean(linkQuery.data?.isEnabled && linkQuery.data?.microsoftConnectionId);

  const teamsAvailable = microsoftReady && isVisioMode(meetingMode);
  const calendarAvailable = microsoftReady;

  useEffect(() => {
    if (feedback && liveRef.current) {
      liveRef.current.focus();
    }
  }, [feedback]);

  if (!visible) return null;

  const buildPayload = (
    forceOverwriteMeetingUrl?: boolean,
  ): InviteProjectReviewPayload => {
    const channels: ('in_app' | 'email')[] = [];
    if (notifyInApp) channels.push('in_app');
    if (notifyEmail) channels.push('email');
    return {
      channels: channels.length ? channels : ['in_app'],
      createTeamsMeeting,
      createCalendarEvent,
      forceOverwriteMeetingUrl,
    };
  };

  const formatResult = (result: Awaited<ReturnType<typeof inviteReview.mutateAsync>>) => {
    const parts: string[] = [];
    if (result.notifiedInApp > 0) {
      parts.push(`${result.notifiedInApp} notifié(s) in-app`);
    }
    if (result.emailed > 0) parts.push(`${result.emailed} e-mail(s) envoyé(s)`);
    if (result.skippedNoEmail > 0) {
      parts.push(`${result.skippedNoEmail} sans adresse e-mail`);
    }
    if (result.skippedExternal > 0 && notifyInApp) {
      parts.push(`${result.skippedExternal} externe(s) ignoré(s) in-app`);
    }
    if (result.teamsMeetingCreated || result.teamsMeetingUpdated) {
      parts.push('Réunion Teams mise à jour');
    }
    if (result.calendarEventCreated || result.calendarEventUpdated) {
      parts.push('Événement calendrier mis à jour');
    }
    if (result.emailDisabled) parts.push('Canal e-mail indisponible');
    return parts.length ? parts.join(' · ') : 'Aucune action effectuée';
  };

  const runInvite = async (forceOverwriteMeetingUrl?: boolean) => {
    setFeedback(null);
    try {
      const result = await inviteReview.mutateAsync({
        reviewId,
        body: buildPayload(forceOverwriteMeetingUrl),
      });
      const message = formatResult(result);
      setFeedback(message);
      toast.success(message);
    } catch {
      setFeedback('Impossible d’envoyer les invitations.');
      toast.error('Impossible d’envoyer les invitations.');
    }
  };

  const onSubmit = async () => {
    const manualUrl = meetingUrl?.trim();
    const needsOverwrite =
      createTeamsMeeting &&
      manualUrl &&
      !microsoftOnlineMeetingId;

    if (needsOverwrite) {
      const ok = window.confirm(
        'Un lien de réunion existe déjà. Voulez-vous le remplacer par une réunion Teams Microsoft ?',
      );
      if (!ok) return;
      await runInvite(true);
      return;
    }

    await runInvite();
  };

  const canSubmit =
    notifyInApp ||
    notifyEmail ||
    createTeamsMeeting ||
    createCalendarEvent;

  return (
    <section className="starium-form-section border-border/60" aria-labelledby="review-invitations-title">
      <h3 id="review-invitations-title" className="starium-form-section-title">
        <Mail aria-hidden />
        Invitations et réunion
      </h3>
      <p className="starium-form-hint mb-4">
        Notifications et actions Microsoft sont indépendantes. Le calendrier peut envoyer une
        invitation externe aux participants.
      </p>
      {microsoftOnlineMeetingId ? (
        <p className="mb-3 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          Réunion Teams créée
        </p>
      ) : null}

      <div className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
        <p className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2">
          <Users className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span>
            <span className="font-medium">{internal}</span> interne(s) ·{' '}
            <span className="font-medium">{external}</span> externe(s)
          </span>
        </p>
        <p className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-muted-foreground">
          <span className="font-medium text-foreground">{emailable}</span> externe(s) avec
          e-mail
        </p>
      </div>

      <fieldset className="mb-4 space-y-3">
        <legend className="text-sm font-medium">Notifications</legend>
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <Checkbox
            checked={notifyInApp}
            onCheckedChange={(v) => setNotifyInApp(v === true)}
            aria-describedby="review-invite-in-app-hint"
          />
          <span className="text-sm">Notifier dans Starium</span>
        </label>
        <p id="review-invite-in-app-hint" className="sr-only">
          Envoie une notification in-app aux participants internes actifs
        </p>
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <Checkbox
            checked={notifyEmail}
            onCheckedChange={(v) => setNotifyEmail(v === true)}
          />
          <span className="text-sm">Envoyer par e-mail</span>
        </label>
      </fieldset>

      <fieldset className="mb-4 space-y-3">
        <legend className="text-sm font-medium">Actions Microsoft</legend>
        <label
          className={`flex min-h-11 items-center gap-3 ${teamsAvailable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
        >
          <Checkbox
            checked={createTeamsMeeting}
            disabled={!teamsAvailable}
            onCheckedChange={(v) => setCreateTeamsMeeting(v === true)}
            aria-describedby="review-teams-hint"
          />
          <span className="inline-flex items-center gap-2 text-sm">
            <Video className="size-4" aria-hidden />
            Créer une réunion Teams
          </span>
        </label>
        <p id="review-teams-hint" className="text-xs text-muted-foreground">
          {teamsAvailable
            ? 'Génère un lien de réunion officiel Microsoft'
            : 'Nécessite Microsoft connecté et un mode visio (REMOTE ou HYBRID)'}
        </p>
        <label
          className={`flex min-h-11 items-center gap-3 ${calendarAvailable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
        >
          <Checkbox
            checked={createCalendarEvent}
            disabled={!calendarAvailable}
            onCheckedChange={(v) => setCreateCalendarEvent(v === true)}
            aria-describedby="review-calendar-hint"
          />
          <span className="inline-flex items-center gap-2 text-sm">
            <Calendar className="size-4" aria-hidden />
            Créer un événement calendrier
          </span>
        </label>
        <p id="review-calendar-hint" className="text-xs text-muted-foreground">
          {calendarAvailable
            ? 'Peut envoyer une invitation Outlook aux participants avec une adresse e-mail'
            : 'Nécessite une connexion Microsoft active sur le projet'}
        </p>
      </fieldset>

      {lastSentAt ? (
        <p className="mb-3 text-xs text-muted-foreground">
          Dernière notification in-app : {formatProjectDateTimeFr(lastSentAt)}
        </p>
      ) : (
        <p className="mb-3 text-xs text-muted-foreground">
          Aucune notification in-app envoyée.
        </p>
      )}

      <div ref={liveRef} tabIndex={-1} aria-live="polite" className="sr-only">
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
        disabled={inviteReview.isPending || !canSubmit}
        onClick={() => void onSubmit()}
      >
        {inviteReview.isPending ? 'Envoi…' : 'Lancer les actions sélectionnées'}
      </Button>
    </section>
  );
}
