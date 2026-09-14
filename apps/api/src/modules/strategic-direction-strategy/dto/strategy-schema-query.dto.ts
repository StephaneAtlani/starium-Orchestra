import { IsOptional, IsString, MaxLength } from 'class-validator';

export class StrategicDirectionStrategyPortfolioQueryDto {
  @IsOptional()
  @IsString()
  alignedVisionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}

export class StrategicDirectionStrategyConsolidationQueryDto {
  @IsOptional()
  @IsString()
  alignedVisionId?: string;
}
