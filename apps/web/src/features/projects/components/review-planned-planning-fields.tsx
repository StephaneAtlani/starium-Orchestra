'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PROJECT_REVIEW_MEETING_MODE_LABEL } from '../constants/project-enum-labels';
import { useProjectReviewMutations } from '../hooks/use-project-review-mutations';
import type { ProjectReviewDetail, ProjectReviewMeetingMode } from '../types/project.types';
import { Video } from 'lucide-react';

const MEETING_MODES: ProjectReviewMeetingMode[] = ['REMOTE', 'ONSITE', 'HYBRID'];

type Props = {
  projectId: string;
  reviewId: string;
  detail: Pick<
    ProjectReviewDetail,
    'meetingMode' | 'meetingUrl' | 'location'
  >;
  canEdit: boolean;
};

export function ReviewPlannedPlanningFields({
  projectId,
  reviewId,
  detail,
  canEdit,
}: Props) {
  const { update } = useProjectReviewMutations(projectId);
  const [meetingMode, setMeetingMode] = useState<ProjectReviewMeetingMode | ''>('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [location, setLocation] = useState('');
  const lastSavedRef = useRef<string | null>(null);
  const initRef = useRef<string | null>(null);

  useEffect(() => {
    if (initRef.current === reviewId) return;
    setMeetingMode(detail.meetingMode ?? '');
    setMeetingUrl(detail.meetingUrl ?? '');
    setLocation(detail.location ?? '');
    initRef.current = reviewId;
    lastSavedRef.current = null;
  }, [detail, reviewId]);

  const buildBody = useCallback(
    () => ({
      meetingMode: meetingMode || null,
      meetingUrl: meetingUrl.trim() || null,
      location: location.trim() || null,
    }),
    [meetingMode, meetingUrl, location],
  );

  useEffect(() => {
    if (!canEdit || initRef.current !== reviewId) return;

    const timer = window.setTimeout(() => {
      const body = buildBody();
      const serialized = JSON.stringify(body);
      if (lastSavedRef.current === null) {
        lastSavedRef.current = serialized;
        return;
      }
      if (serialized === lastSavedRef.current) return;
      update.mutate(
        { reviewId, body },
        {
          onSuccess: () => {
            lastSavedRef.current = serialized;
          },
        },
      );
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [canEdit, reviewId, buildBody, update]);

  if (!canEdit) return null;

  const showUrl = meetingMode === 'REMOTE' || meetingMode === 'HYBRID';
  const showLocation = meetingMode === 'ONSITE' || meetingMode === 'HYBRID';

  return (
    <section className="starium-form-section border-border/60" aria-labelledby="review-planned-meeting-title">
      <h3 id="review-planned-meeting-title" className="starium-form-section-title">
        <Video className="size-3.5" aria-hidden />
        Tenue de la réunion
      </h3>

      <fieldset className="mb-4 space-y-2">
        <legend className="text-xs font-medium text-foreground">Mode</legend>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {MEETING_MODES.map((mode) => (
            <label
              key={mode}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
            >
              <input
                type="radio"
                name={`review-meeting-mode-${reviewId}`}
                value={mode}
                checked={meetingMode === mode}
                onChange={() => setMeetingMode(mode)}
                className="size-4"
              />
              {PROJECT_REVIEW_MEETING_MODE_LABEL[mode] ?? mode}
            </label>
          ))}
        </div>
      </fieldset>

      {showUrl ? (
        <div className="mb-3 grid gap-1.5">
          <Label htmlFor={`review-meeting-url-${reviewId}`} className="text-xs font-medium">
            Lien de réunion
          </Label>
          <Input
            id={`review-meeting-url-${reviewId}`}
            type="url"
            value={meetingUrl}
            onChange={(e) => setMeetingUrl(e.target.value)}
            placeholder="https://…"
            className="border-border/70"
          />
        </div>
      ) : null}

      {showLocation ? (
        <div className="grid gap-1.5">
          <Label htmlFor={`review-meeting-location-${reviewId}`} className="text-xs font-medium">
            Lieu
          </Label>
          <Input
            id={`review-meeting-location-${reviewId}`}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={300}
            placeholder="Salle, adresse…"
            className="border-border/70"
          />
        </div>
      ) : null}
    </section>
  );
}
