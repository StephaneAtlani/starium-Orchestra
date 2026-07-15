import { Allow, ArrayUnique, IsArray, IsString } from 'class-validator';

export class UpdateProjectTeamMemberCirclesDto {
  @Allow()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  circleIds!: string[];
}
