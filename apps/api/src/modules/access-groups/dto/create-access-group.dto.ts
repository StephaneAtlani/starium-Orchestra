import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAccessGroupDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(200)
  name!: string;
}
