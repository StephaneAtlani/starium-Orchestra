import { Allow, IsOptional, IsString, Matches } from 'class-validator';

/**
 * RFC-ORG-002 — champ absent : pas de changement ; `null` : délier ; string : CUID Resource HUMAN.
 */
export class PatchHumanResourceLinkDto {
  @Allow()
  @IsOptional()
  @IsString()
  @Matches(/^c[a-z0-9]{24}$/i, {
    message: 'humanResourceId doit être un identifiant valide (CUID)',
  })
  humanResourceId?: string | null;
}
