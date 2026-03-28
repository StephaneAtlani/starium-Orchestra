import { Allow, IsOptional } from 'class-validator';
import { UpdateProjectRiskDto } from './update-project-risk.dto';

/** Mise à jour via `PATCH /api/risks/:riskId` — peut rattacher / détacher un projet (`null` explicite). */
export class UpdateClientScopedRiskDto extends UpdateProjectRiskDto {
  @IsOptional()
  @Allow()
  projectId?: string | null;
}
