import { IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class EnvelopeSummaryQueryDto {
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeChildren?: boolean;
}
