import { IsOptional, IsString, MaxLength } from 'class-validator';

/** RFC-PROJ-013-8 F3 — création d’une remontée depuis un COPRO. */
export class CreateProjectReviewEscalationDto {
  @IsOptional()
  @IsString()
  sourceAgendaItemId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  summary?: string | null;

  @IsOptional()
  @IsString()
  ownerUserId?: string | null;
}
