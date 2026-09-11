import { IsDateString } from 'class-validator';

/** RFC-PROJ-013-9 C1 — fenêtre calendrier transverse. */
export class ListGovernanceCalendarEventsQueryDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;
}
