import { IsBoolean } from 'class-validator';

/** Mise à jour partielle d’une instance client (ex. activer / désactiver). */
export class PatchClientComplianceFrameworkDto {
  @IsBoolean()
  isActive!: boolean;
}
