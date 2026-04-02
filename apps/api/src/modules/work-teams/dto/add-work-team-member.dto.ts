import { IsEnum, IsString } from 'class-validator';
import { WorkTeamMemberRole } from '@prisma/client';

export class AddWorkTeamMemberDto {
  @IsString()
  collaboratorId!: string;

  @IsEnum(WorkTeamMemberRole)
  role!: WorkTeamMemberRole;
}
