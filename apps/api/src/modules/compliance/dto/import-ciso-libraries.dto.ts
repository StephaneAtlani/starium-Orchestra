import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from 'class-validator';

export class ImportCisoLibrariesDto {
  /** Chemins relatifs GitHub, ex. `backend/library/libraries/iso27001-2022.yaml`. */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @IsString({ each: true })
  paths!: string[];
}
