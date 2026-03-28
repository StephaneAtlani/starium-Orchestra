import { IsOptional, IsString } from 'class-validator';
import { CreateProjectRiskDto } from './create-project-risk.dto';

/** Création via `POST /api/risks` — projet facultatif (sinon risque hors projet). */
export class CreateClientScopedRiskDto extends CreateProjectRiskDto {
  @IsOptional()
  @IsString()
  projectId?: string;
}
