import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
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

  /** Inclut l’ordre du jour dans le corps HTML du mail. */
  @IsOptional()
  @IsBoolean()
  includeAgenda?: boolean;

  /** Joint / liste les supports de séance de la préparation. */
  @IsOptional()
  @IsBoolean()
  includeDocs?: boolean;

  /** Affiche les boutons Je serai présent / Je décline dans le mail. */
  @IsOptional()
  @IsBoolean()
  includeRsvp?: boolean;

  /** Inclut le brief de préparation (points + consignes) dans le mail. */
  @IsOptional()
  @IsBoolean()
  includeBrief?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  emailSubject?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  emailMessage?: string;

  @IsOptional()
  @IsBoolean()
  forceOverwriteMeetingUrl?: boolean;
}
