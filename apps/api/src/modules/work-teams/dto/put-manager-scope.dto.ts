import { IsArray, IsBoolean, IsEnum, IsString } from 'class-validator';
import { ManagerScopeMode } from '@prisma/client';

export class PutManagerScopeDto {
  @IsEnum(ManagerScopeMode)
  mode!: ManagerScopeMode;

  @IsBoolean()
  includeDirectReports!: boolean;

  @IsBoolean()
  includeTeamSubtree!: boolean;

  @IsArray()
  @IsString({ each: true })
  rootTeamIds!: string[];
}
