import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateReallocationDto {
  @IsString()
  @IsNotEmpty()
  sourceLineId!: string;

  @IsString()
  @IsNotEmpty()
  targetLineId!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
