import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { WorkTeamStatus } from '@prisma/client';
import { PaginationQueryDto } from './pagination.query.dto';

export class ListWorkTeamsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(WorkTeamStatus)
  status?: WorkTeamStatus;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  /** Filtre : équipes dont cette Resource HUMAN est responsable (`WorkTeam.leadResourceId`). */
  @IsOptional()
  @IsString()
  leadResourceId?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeArchived?: boolean = false;
}
