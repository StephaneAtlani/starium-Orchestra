import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';

const INVITE_NOTIFICATION_CHANNELS = ['in_app', 'email'] as const;

export class InviteProjectReviewDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  participantIds?: string[];

  @IsOptional()
  @IsArray()
  @IsIn(INVITE_NOTIFICATION_CHANNELS, { each: true })
  channels?: ('in_app' | 'email')[];

  @IsOptional()
  @IsBoolean()
  createTeamsMeeting?: boolean;

  @IsOptional()
  @IsBoolean()
  createCalendarEvent?: boolean;

  /**
   * Joint un fichier .ics (METHOD:REQUEST) au mail de convocation.
   * Ne crée pas d’événement dans un calendrier Microsoft Graph.
   */
  @IsOptional()
  @IsBoolean()
  attachIcs?: boolean;

  @IsOptional()
  @IsBoolean()
  forceOverwriteMeetingUrl?: boolean;
}
