import { IsNotEmpty, IsString } from 'class-validator';

export class CompareEntitiesQueryDto {
  @IsString()
  @IsNotEmpty()
  leftId!: string;

  @IsString()
  @IsNotEmpty()
  rightId!: string;
}
