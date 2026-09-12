import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Invitation RH externe depuis l’éditeur d’équipes (RFC-PROJ-023). */
export class InviteProjectTeamDirectoryPersonDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string | null;

  @IsEmail()
  @MaxLength(320)
  email!: string;
}
