import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ImportCisoLibrariesDto {
  /** Chemins relatifs GitHub, ex. `backend/library/libraries/iso27001-2022.yaml`. */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @IsString({ each: true })
  paths!: string[];

  /**
   * Locale d’affichage / contenu à matérialiser (ex. `fr`, `en`, `de`).
   * Si absente ou inconnue pour une biblio, repli sur la locale native du YAML.
   */
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(12)
  locale?: string;
}
