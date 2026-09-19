import { ArrayUnique, IsArray, IsString } from 'class-validator';

/** Remplacement atomique des trois listes de gouvernance. */
export class UpdateProcedureStakeholdersDto {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  editors!: string[];

  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  reviewers!: string[];

  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  validators!: string[];
}
