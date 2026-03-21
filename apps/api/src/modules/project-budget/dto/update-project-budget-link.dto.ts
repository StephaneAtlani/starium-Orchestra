import { Type } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';

/** PATCH — uniquement pourcentage ou montant selon le mode existant du lien. */
export class UpdateProjectBudgetLinkDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  percentage?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  amount?: number;
}
