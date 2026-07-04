'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PROJECT_REVIEW_PARTICIPANT_ATTENDANCE_LABEL } from '../constants/project-enum-labels';
import { useProjectAssignableUsers } from '../hooks/use-project-assignable-users';
import { useProjectReviewMutations } from '../hooks/use-project-review-mutations';
import type {
  ProjectReviewParticipantApi,
  ProjectReviewParticipantAttendanceStatus,
  ProjectReviewStatus,
} from '../types/project.types';
import { toast } from '@/lib/toast';
import { Trash2, UserPlus, Users } from 'lucide-react';

type Props = {
  projectId: string;
  reviewId: string;
  status: ProjectReviewStatus;
  participants: ProjectReviewParticipantApi[];
  canEdit: boolean;
};

const ATTENDANCE_OPTIONS: ProjectReviewParticipantAttendanceStatus[] = [
  'EXPECTED',
  'PRESENT',
  'ABSENT',
  'EXCUSED',
];

function formatAssignableUser(u: {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return name || u.email;
}

export function ReviewParticipantsSection({
  projectId,
  reviewId,
  status,
  participants,
  canEdit,
}: Props) {
  const { createParticipant, updateParticipant, deleteParticipant } =
    useProjectReviewMutations(projectId);
  const assignable = useProjectAssignableUsers();

  const [userId, setUserId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [roleLabel, setRoleLabel] = useState('');

  const editable =
    canEdit && (status === 'PLANNED' || status === 'IN_REVIEW');
  const markAttendance = canEdit && status === 'IN_REVIEW';

  const onAdd = async () => {
    if (!userId.trim() && !displayName.trim()) {
      toast.error('Sélectionnez un utilisateur ou saisissez un nom.');
      return;
    }
    try {
      await createParticipant.mutateAsync({
        reviewId,
        body: {
          userId: userId.trim() || null,
          displayName: displayName.trim() || null,
          roleLabel: roleLabel.trim() || null,
        },
      });
      setUserId('');
      setDisplayName('');
      setRoleLabel('');
    } catch {
      toast.error('Ajout du participant impossible.');
    }
  };

  return (
    <section className="starium-form-section" aria-labelledby="review-participants-title">
      <h3 id="review-participants-title" className="starium-form-section-title">
        <Users aria-hidden />
        Participants
      </h3>

      {participants.length === 0 ? (
        <p className="starium-form-hint">Aucun participant.</p>
      ) : (
        <ul className="space-y-2" aria-live="polite">
          {participants.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 p-3"
            >
              <div className="min-w-0">
                <p className="font-medium">{p.displayName ?? 'Participant'}</p>
                {p.roleLabel ? (
                  <p className="text-sm text-muted-foreground">{p.roleLabel}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="starium-ds-badge starium-ds-badge--neutral">
                  {PROJECT_REVIEW_PARTICIPANT_ATTENDANCE_LABEL[p.attendanceStatus] ??
                    p.attendanceStatus}
                </span>
                {markAttendance ? (
                  <select
                    className="starium-form-select min-h-11"
                    aria-label={`Présence de ${p.displayName ?? 'participant'}`}
                    value={p.attendanceStatus}
                    onChange={(e) => {
                      void updateParticipant.mutateAsync({
                        reviewId,
                        participantId: p.id,
                        body: {
                          attendanceStatus: e.target
                            .value as ProjectReviewParticipantAttendanceStatus,
                        },
                      });
                    }}
                  >
                    {ATTENDANCE_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {PROJECT_REVIEW_PARTICIPANT_ATTENDANCE_LABEL[s]}
                      </option>
                    ))}
                  </select>
                ) : null}
                {editable ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11 text-destructive"
                    aria-label={`Retirer ${p.displayName ?? 'participant'}`}
                    onClick={() =>
                      void deleteParticipant.mutateAsync({
                        reviewId,
                        participantId: p.id,
                      })
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {editable ? (
        <div className="mt-4 space-y-3 rounded-lg border border-dashed border-border/80 p-3">
          <p className="text-sm font-medium flex items-center gap-2">
            <UserPlus className="size-4" aria-hidden />
            Ajouter un participant
          </p>
          <div className="starium-form-grid starium-form-grid--2">
            <div className="starium-form-field">
              <label htmlFor="rp-user" className="starium-form-label">
                Membre interne
              </label>
              <select
                id="rp-user"
                className="starium-form-select min-h-11"
                value={userId}
                onChange={(e) => {
                  const id = e.target.value;
                  setUserId(id);
                  const u = assignable.data?.users.find((x) => x.id === id);
                  if (u) setDisplayName(formatAssignableUser(u));
                }}
              >
                <option value="">— Externe ou libre —</option>
                {assignable.data?.users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {formatAssignableUser(u)}
                  </option>
                ))}
              </select>
            </div>
            <div className="starium-form-field">
              <label htmlFor="rp-name" className="starium-form-label">
                Nom affiché (externe)
              </label>
              <Input
                id="rp-name"
                className="starium-form-input min-h-11"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={!!userId.trim()}
              />
            </div>
            <div className="starium-form-field starium-form-grid--span-2">
              <label htmlFor="rp-role" className="starium-form-label">
                Rôle (optionnel)
              </label>
              <Input
                id="rp-role"
                className="starium-form-input min-h-11"
                value={roleLabel}
                onChange={(e) => setRoleLabel(e.target.value)}
              />
            </div>
          </div>
          <Button type="button" className="min-h-11" onClick={() => void onAdd()}>
            Ajouter
          </Button>
        </div>
      ) : null}
    </section>
  );
}
