import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateClientResourceTimesheetSettingsDto {
  @IsOptional()
  @IsBoolean()
  timesheetIgnoreWeekendsDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  timesheetAllowFractionAboveOne?: boolean;

  /** Durée d’une journée type (h), ex. 7,5 — utilisée pour convertir fraction → heures côté UI et API. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(4)
  @Max(12)
  timesheetDayReferenceHours?: number;
}
