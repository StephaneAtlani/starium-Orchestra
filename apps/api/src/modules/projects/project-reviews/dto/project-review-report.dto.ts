export class ProjectReviewReportPreviewDto {
  subject!: string;
  title!: string;
  text!: string;
  html!: string;
}

export class SendProjectReviewReportResultDto {
  emailed!: number;
  skippedNoEmail!: number;
  emailFailed!: number;
  emailDisabled?: boolean;
  emailedParticipantIds!: string[];
}
