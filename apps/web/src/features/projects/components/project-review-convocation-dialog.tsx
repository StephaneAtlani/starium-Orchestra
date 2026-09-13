'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  FileText,
  Globe,
  Paperclip,
  Send,
  X,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { UserInitialsAvatar } from '@/components/ui/user-initials-avatar';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { useAuth } from '@/context/auth-context';
import { displayLabel, firstDisplayLabel } from '@/lib/display-label';
import { toast } from '@/lib/toast';
import { PROJECT_REVIEW_TYPE_BADGE } from '../constants/project-enum-labels';
import { useProjectReviewMutations } from '../hooks/use-project-review-mutations';
import { formatProjectDateLong } from '../lib/projects-list-display';
import type { ProjectReviewDetail } from '../types/project.types';
import './project-review-convocation.css';

export type ProjectReviewConvocationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  detail: ProjectReviewDetail;
  /** datetime ISO already resolved for schedule if PREPARING */
  scheduleReviewDateIso: string | null;
  onSent?: () => void;
};

type MailOpts = {
  ics: boolean;
  odj: boolean;
  docs: boolean;
  rsvp: boolean;
  relance: boolean;
  brief: boolean;
};

/** Aligné kit `MOPTS` (Refonte Portail / mail modal). */
const OPT_DEFS: Array<{
  id: keyof MailOpts;
  title: string;
  hint: string;
  defaultOn: boolean;
}> = [
  {
    id: 'ics',
    title: 'Invitation calendrier (.ics)',
    hint: 'Fichier .ics joint au mail — le rendez-vous s’ajoute à l’agenda du participant (lieu + lien visio).',
    defaultOn: true,
  },
  {
    id: 'odj',
    title: 'Ordre du jour',
    hint: 'Les points, leur porteur et leur durée cible, tels que préparés.',
    defaultOn: true,
  },
  {
    id: 'docs',
    title: 'Supports de séance',
    hint: 'Les fichiers joints à la préparation, en pièce jointe.',
    defaultOn: true,
  },
  {
    id: 'rsvp',
    title: 'Demander confirmation de présence',
    hint: 'Boutons Accepter / Décliner dans le message, suivi des réponses.',
    defaultOn: true,
  },
  {
    id: 'relance',
    title: 'Rappel automatique 24 h avant',
    hint: 'Relance uniquement les destinataires sans réponse.',
    defaultOn: false,
  },
  {
    id: 'brief',
    title: 'Brief de préparation',
    hint: 'Ce que chaque participant doit préparer avant la séance.',
    defaultOn: false,
  },
];

function defaultOpts(): MailOpts {
  return OPT_DEFS.reduce((acc, o) => {
    acc[o.id] = o.defaultOn;
    return acc;
  }, {} as MailOpts);
}

function senderLabel(user: {
  firstName: string | null;
  lastName: string | null;
  email: string;
  jobTitle: string | null;
}): { name: string; meta: string; email: string } {
  const name = firstDisplayLabel(
    [[user.firstName, user.lastName].filter(Boolean).join(' ').trim(), user.email],
    'Vous',
  );
  const role = user.jobTitle?.trim() || null;
  return {
    name: role ? `${name} — ${role}` : name,
    meta: user.email,
    email: user.email,
  };
}

function defaultSubject(detail: ProjectReviewDetail, badge: string): string {
  const title = displayLabel(detail.title, badge);
  const when = detail.reviewDate
    ? new Date(detail.reviewDate).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
      })
    : 'Date à définir';
  return `${badge} — ${title} · ${when}`;
}

function defaultMessage(detail: ProjectReviewDetail, badge: string): string {
  const title = displayLabel(detail.title, badge);
  return `Bonjour,\n\nVous êtes convié au ${badge} « ${title} ». Vous trouverez ci-dessous l'ordre du jour arrêté ainsi que les supports de séance.\n\nMerci de confirmer votre présence et de préparer les points dont vous êtes porteur.`;
}

function formatWhenLine(detail: ProjectReviewDetail): string {
  const datePart = detail.reviewDate
    ? formatProjectDateLong(detail.reviewDate)
    : 'Date à définir';
  const timePart = detail.reviewDate
    ? new Date(detail.reviewDate).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;
  const duration =
    detail.durationMinutes && detail.durationMinutes > 0
      ? `${detail.durationMinutes} min`
      : null;
  const place =
    detail.location?.trim() ||
    (detail.meetingUrl ? 'Visio' : null) ||
    'Lieu à préciser';
  return [datePart, timePart, duration, place].filter(Boolean).join(' · ');
}

function agendaDurationLabel(mins: number | null | undefined): string {
  if (mins == null || mins <= 0) return '—';
  return `${mins} min`;
}

export function ProjectReviewConvocationDialog({
  open,
  onOpenChange,
  projectId,
  detail,
  scheduleReviewDateIso,
  onSent,
}: ProjectReviewConvocationDialogProps) {
  const { user } = useAuth();
  const { scheduleReview, lockAgenda, inviteReview, createParticipant } =
    useProjectReviewMutations(projectId);

  const participants = detail.participants ?? [];
  const badge = PROJECT_REVIEW_TYPE_BADGE[detail.reviewType] ?? 'Point';

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [opts, setOpts] = useState<MailOpts>(defaultOpts);
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedIds(participants.map((p) => p.id));
    setSubject(defaultSubject(detail, badge));
    setMessage(defaultMessage(detail, badge));
    setOpts(defaultOpts());
    setError(null);
    setSubmitting(false);
    setTesting(false);
  }, [open, detail.id]); // eslint-disable-line react-hooks/exhaustive-deps -- reset on open

  const sender = useMemo(
    () =>
      user
        ? senderLabel(user)
        : { name: 'Expéditeur', meta: 'Compte connecté', email: '' },
    [user],
  );

  const subtitle = useMemo(() => {
    const title = displayLabel(detail.title, badge);
    return `${title} · ${formatWhenLine(detail)}`;
  }, [detail, badge]);

  const selected = useMemo(
    () => participants.filter((p) => selectedIds.includes(p.id)),
    [participants, selectedIds],
  );
  const availableToAdd = useMemo(
    () => participants.filter((p) => !selectedIds.includes(p.id)),
    [participants, selectedIds],
  );

  const agendaItems = useMemo(() => {
    const items = [...(detail.agendaItems ?? [])];
    items.sort(
      (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0),
    );
    return items;
  }, [detail.agendaItems]);

  const attachments = useMemo(() => {
    const files: Array<{ name: string; hint: string }> = [];
    if (opts.ics) {
      files.push({
        name: `invitation-${badge.toLowerCase().replace(/\s+/g, '-')}.ics`,
        hint: 'Invitation calendrier',
      });
    }
    if (opts.docs) {
      for (const a of detail.attachments ?? []) {
        const name = displayLabel(a.fileName, 'Pièce jointe');
        files.push({ name, hint: 'Support de séance' });
      }
    }
    if (opts.brief) {
      files.push({
        name: 'brief-preparation.pdf',
        hint: 'Brief de préparation',
      });
    }
    return files;
  }, [opts.ics, opts.docs, opts.brief, detail.attachments, badge]);

  const canSend = selectedIds.length > 0 && !submitting && !testing;
  const canTest = Boolean(user?.email) && !submitting && !testing;

  const removeRecipient = (id: string) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  };

  const addNextRecipient = () => {
    const next = availableToAdd[0];
    if (!next) return;
    setSelectedIds((prev) => [...prev, next.id]);
  };

  const toggleOpt = (id: keyof MailOpts) => {
    setOpts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const ensureSelfParticipantId = async (): Promise<string> => {
    if (!user) throw new Error('Session utilisateur absente');
    const existing = participants.find((p) => p.userId === user.id);
    if (existing) return existing.id;
    const name = firstDisplayLabel(
      [
        [user.firstName, user.lastName].filter(Boolean).join(' ').trim(),
        user.email,
      ],
      'Vous',
    );
    const created = await createParticipant.mutateAsync({
      reviewId: detail.id,
      body: {
        userId: user.id,
        displayName: name,
        roleLabel: user.jobTitle?.trim() || null,
        externalEmail: null,
      },
    });
    return created.id;
  };

  const runInvite = async (mode: 'send' | 'test') => {
    if (mode === 'send' && selectedIds.length === 0) {
      setError('Ajoutez au moins un destinataire.');
      return;
    }
    if (mode === 'send') setSubmitting(true);
    else setTesting(true);
    setError(null);
    try {
      if (mode === 'test') {
        if (!user?.email) {
          setError('Compte sans e-mail — impossible d’envoyer un test.');
          return;
        }
        const selfParticipantId = await ensureSelfParticipantId();
        if (detail.status === 'PREPARING') {
          const iso = scheduleReviewDateIso ?? detail.reviewDate;
          if (!iso) {
            setError(
              'Renseignez la date de séance avant d’envoyer un test.',
            );
            return;
          }
          await scheduleReview.mutateAsync({
            reviewId: detail.id,
            reviewDate: iso,
          });
        }
        await inviteReview.mutateAsync({
          reviewId: detail.id,
          body: {
            participantIds: [selfParticipantId],
            channels: ['email'],
            createCalendarEvent: false,
            attachIcs: opts.ics,
            includeAgenda: opts.odj,
            includeRsvp: opts.rsvp,
            emailSubject: subject.trim() || undefined,
            emailMessage: message.trim() || undefined,
          },
        });
        toast.success(`E-mail de test envoyé à ${user.email}`);
        return;
      }

      if (detail.status === 'PREPARING') {
        const iso = scheduleReviewDateIso ?? detail.reviewDate;
        if (!iso) {
          setError(
            'Renseignez la date de séance avant d’envoyer les convocations.',
          );
          return;
        }
        await scheduleReview.mutateAsync({
          reviewId: detail.id,
          reviewDate: iso,
        });
      }
      if (!detail.agendaLockedAt) {
        await lockAgenda.mutateAsync(detail.id);
      }

      const result = await inviteReview.mutateAsync({
        reviewId: detail.id,
        body: {
          participantIds: selectedIds,
          channels: ['in_app', 'email'],
          createCalendarEvent: false,
          attachIcs: opts.ics,
          includeAgenda: opts.odj,
          includeRsvp: opts.rsvp,
          emailSubject: subject.trim() || undefined,
          emailMessage: message.trim() || undefined,
        },
      });
      const count = Math.max(
        result.emailed ?? 0,
        result.notifiedInApp ?? 0,
        selectedIds.length,
      );
      toast.success(
        `${count} convocation${count > 1 ? 's' : ''} envoyée${count > 1 ? 's' : ''}.`,
      );
      onOpenChange(false);
      onSent?.();
    } catch (err) {
      setError(
        (err as { message?: string })?.message ??
          (mode === 'test'
            ? 'Envoi du test impossible.'
            : 'Envoi des convocations impossible.'),
      );
    } finally {
      setSubmitting(false);
      setTesting(false);
    }
  };

  const meetingTitle = displayLabel(detail.title, badge);

  return (
    <StariumModal
      open={open}
      onOpenChange={(next) => {
        if (submitting || testing) return;
        onOpenChange(next);
      }}
      title="Envoyer les convocations"
      description={subtitle}
      icon={Send}
      size="xl"
      overlayClassName="!z-[100] bg-black/55 dark:bg-black/70"
      contentClassName="!z-[101] sm:max-w-[min(1080px,96vw)] h-[min(92dvh,calc(100dvh-2rem))]"
      bodyClassName="!p-0 !overflow-hidden flex min-h-0 flex-1 flex-col"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-9"
            disabled={submitting || testing}
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-9"
            disabled={!canTest}
            onClick={() => void runInvite('test')}
          >
            <Globe className="size-4" aria-hidden />
            {testing ? 'Envoi…' : "M'envoyer un test"}
          </Button>
          <Button
            type="button"
            className="min-h-11 sm:min-h-9"
            disabled={!canSend}
            onClick={() => void runInvite('send')}
          >
            <Send className="size-4" aria-hidden />
            {submitting ? 'Envoi…' : 'Envoyer les convocations'}
          </Button>
        </>
      }
    >
      <div className="convoc-mail">
        {error ? (
          <div className="convoc-mail__alert">
            <Alert variant="destructive" role="alert">
              <AlertTitle>Envoi impossible</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        ) : null}

        <div className="convoc-mail__grid">
          <div className="convoc-mail__comp">
            <div className="convoc-mail__fld">
              <div className="convoc-mail__lbl">Expéditeur</div>
              <div className="convoc-mail__from">
                <UserInitialsAvatar
                  displayName={sender.name}
                  seed={user?.id ?? sender.email}
                  size="sm"
                />
                <div className="min-w-0">
                  <div className="convoc-mail__from-n">{sender.name}</div>
                  <div className="convoc-mail__from-m">{sender.meta}</div>
                </div>
              </div>
            </div>

            <div className="convoc-mail__fld">
              <div className="convoc-mail__lbl" id="convoc-dest-label">
                Destinataires · {selected.length} personne
                {selected.length > 1 ? 's' : ''}
              </div>
              {participants.length === 0 ? (
                <p className="text-sm text-destructive" role="alert">
                  Aucun participant — ajoutez-en dans la préparation.
                </p>
              ) : (
                <div
                  className="convoc-mail__rcpts"
                  aria-labelledby="convoc-dest-label"
                >
                  {selected.map((p) => {
                    const name = displayLabel(p.displayName, 'Participant');
                    return (
                      <span key={p.id} className="convoc-mail__rcpt">
                        <UserInitialsAvatar
                          displayName={name}
                          seed={p.userId ?? p.id}
                          size="sm"
                          className="!size-6 !text-[9px]"
                        />
                        <span className="truncate">{name}</span>
                        <button
                          type="button"
                          className="convoc-mail__rcpt-x"
                          aria-label={`Retirer ${name}`}
                          onClick={() => removeRecipient(p.id)}
                        >
                          <X className="size-2.5" aria-hidden strokeWidth={3} />
                        </button>
                      </span>
                    );
                  })}
                  {availableToAdd.length > 0 ? (
                    <button
                      type="button"
                      className="convoc-mail__rcpt-add"
                      onClick={addNextRecipient}
                    >
                      + Ajouter
                    </button>
                  ) : null}
                </div>
              )}
              {selectedIds.length === 0 ? (
                <p className="mt-2 text-xs text-destructive" role="alert">
                  Ajoutez au moins un destinataire.
                </p>
              ) : null}
            </div>

            <div className="convoc-mail__fld">
              <label className="convoc-mail__lbl" htmlFor="convoc-subj">
                Objet
              </label>
              <Input
                id="convoc-subj"
                className="min-h-11"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="convoc-mail__fld">
              <label className="convoc-mail__lbl" htmlFor="convoc-msg">
                Message d&apos;introduction
              </label>
              <Textarea
                id="convoc-msg"
                className="min-h-[92px]"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <div className="convoc-mail__fld !mb-0">
              <div className="convoc-mail__lbl">Contenu de l&apos;envoi</div>
              <div className="convoc-mail__opts" role="group">
                {OPT_DEFS.map((o) => {
                  const on = opts[o.id];
                  return (
                    <button
                      key={o.id}
                      type="button"
                      className={`convoc-mail__opt${on ? ' is-on' : ''}`}
                      aria-pressed={on}
                      onClick={() => toggleOpt(o.id)}
                    >
                      <span className="convoc-mail__opt-box" aria-hidden>
                        <Check className="size-2.5" strokeWidth={4} />
                      </span>
                      <span className="min-w-0 text-left">
                        <span className="convoc-mail__opt-t">{o.title}</span>
                        <span className="convoc-mail__opt-m">{o.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="convoc-mail__prev">
            <div className="convoc-mail__lbl">
              Aperçu reçu par le participant
            </div>
            <div className="convoc-mail__card">
              <div className="convoc-mail__band">
                <div className="convoc-mail__kick">
                  {badge} · convocation
                </div>
                <div className="convoc-mail__h">{meetingTitle}</div>
                <div className="convoc-mail__when">
                  <Calendar className="size-3.5 shrink-0" aria-hidden />
                  <span>{formatWhenLine(detail)}</span>
                </div>
              </div>
              <div className="convoc-mail__body">
                <p className="convoc-mail__p">{message}</p>

                {opts.odj ? (
                  <div className="convoc-mail__sec">
                    <div className="convoc-mail__st">Ordre du jour</div>
                    {agendaItems.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Aucun point à l&apos;ordre du jour
                      </p>
                    ) : (
                      <div className="convoc-mail__odj">
                        {agendaItems.map((item, i) => {
                          const owner = item.ownerDisplayName?.trim() || null;
                          return (
                            <div key={item.id} className="convoc-mail__odj-r">
                              <span className="convoc-mail__odj-n">{i + 1}</span>
                              <span className="convoc-mail__odj-t">
                                {displayLabel(item.title, 'Point')}
                                {owner ? (
                                  <span className="convoc-mail__odj-owner">
                                    {' '}
                                    · {owner}
                                  </span>
                                ) : null}
                              </span>
                              <span className="convoc-mail__odj-d">
                                {agendaDurationLabel(
                                  item.plannedDurationMinutes,
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}

                {attachments.length > 0 ? (
                  <div className="convoc-mail__sec">
                    <div className="convoc-mail__st">
                      Pièces jointes ({attachments.length})
                    </div>
                    {attachments.map((a) => (
                      <div key={a.name + a.hint} className="convoc-mail__att">
                        {a.hint.includes('calendrier') ? (
                          <Calendar className="size-3.5 shrink-0" aria-hidden />
                        ) : a.hint.includes('Support') ||
                          a.hint.includes('Brief') ? (
                          <Paperclip className="size-3.5 shrink-0" aria-hidden />
                        ) : (
                          <FileText className="size-3.5 shrink-0" aria-hidden />
                        )}
                        <span className="truncate">{a.name}</span>
                      </div>
                    ))}
                  </div>
                ) : null}

                {opts.rsvp ? (
                  <div className="convoc-mail__cta" aria-hidden>
                    <span className="convoc-mail__btn-y">Je serai présent</span>
                    <span className="convoc-mail__btn-n">Je décline</span>
                  </div>
                ) : null}
              </div>
              <div className="convoc-mail__foot">
                Envoyé depuis Starium Orchestra. Les réponses sont enregistrées
                dans la préparation de la séance.
                {opts.relance
                  ? ' Un rappel sera envoyé 24 h avant aux personnes sans réponse.'
                  : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
    </StariumModal>
  );
}
