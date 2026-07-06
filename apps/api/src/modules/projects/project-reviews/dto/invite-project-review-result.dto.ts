export class InviteProjectReviewResultDto {
  notifiedInApp!: number;
  skippedExternal!: number;
  skippedInactive!: number;
  participantIds!: string[];
  emailed!: number;
  skippedNoEmail!: number;
  emailFailed!: number;
  emailDisabled?: boolean;
  teamsMeetingCreated!: boolean;
  teamsMeetingUpdated!: boolean;
  teamsMeetingSkipped!: boolean;
  calendarEventCreated!: boolean;
  calendarEventUpdated!: boolean;
  calendarEventSkipped!: boolean;
}
