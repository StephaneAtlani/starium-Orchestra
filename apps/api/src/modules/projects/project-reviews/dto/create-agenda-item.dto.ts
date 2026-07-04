import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateProjectReviewAgendaItemDto {
  @IsString()
  @MaxLength(500)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  description?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  plannedDurationMinutes?: number | null;

  @IsOptional()
  @IsString()
  ownerUserId?: string | null;
}
