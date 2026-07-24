import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, Matches } from 'class-validator';

const YEAR_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export class DashboardQueryDto {
  @Matches(YEAR_MONTH, { message: 'from must be YYYY-MM' })
  from!: string;

  @Matches(YEAR_MONTH, { message: 'to must be YYYY-MM' })
  to!: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  includeArchivedWorkTeams?: boolean;
}
