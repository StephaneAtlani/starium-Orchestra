import { IsEnum } from 'class-validator';
import { WorkTeamMemberRole } from '@prisma/client';

export class UpdateWorkTeamMemberDto {
  @IsEnum(WorkTeamMemberRole)
  role!: WorkTeamMemberRole;
}
