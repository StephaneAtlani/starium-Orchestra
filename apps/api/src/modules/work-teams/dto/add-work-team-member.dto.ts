import { IsEnum, IsString } from 'class-validator';
import { WorkTeamMemberRole } from '@prisma/client';

export class AddWorkTeamMemberDto {
  @IsString()
  /** Resource catalogue `type = HUMAN`. */
  resourceId!: string;

  @IsEnum(WorkTeamMemberRole)
  role!: WorkTeamMemberRole;
}
