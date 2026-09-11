export type GovernanceCalendarEventKind =
  | 'PROJECT_REVIEW'
  | 'CYCLE_INSTANCE';

export type GovernanceCalendarEventDto = {
  id: string;
  kind: GovernanceCalendarEventKind;
  title: string;
  date: string;
  projectId?: string | null;
  projectName?: string | null;
  reviewType?: string | null;
  reviewTypeLabel?: string | null;
  cycleId?: string | null;
  cycleName?: string | null;
  href?: string | null;
};

export type GovernanceCalendarEventsResponseDto = {
  items: GovernanceCalendarEventDto[];
};
