import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import type { ProjectReviewParticipantAttendanceStatus } from '@prisma/client';

export class UpdateProjectReviewParticipantDto {
  @IsOptional()
  @IsString()
  userId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  displayName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  roleLabel?: string | null;

  @IsOptional()
  @IsIn(['EXPECTED', 'PRESENT', 'ABSENT', 'EXCUSED'])
  attendanceStatus?: ProjectReviewParticipantAttendanceStatus;
}
