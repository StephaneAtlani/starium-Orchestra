import { IsString } from 'class-validator';

export class AddProjectTeamMemberDto {
  @IsString()
  roleId!: string;

  @IsString()
  userId!: string;
}
