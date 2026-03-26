import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsString, MinLength, ValidateNested } from 'class-validator';

class ReorderProjectTaskPhaseItemDto {
  @IsString()
  @MinLength(1)
  id!: string;

  @Type(() => Number)
  @IsInt()
  sortOrder!: number;
}

export class ReorderProjectTaskPhasesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReorderProjectTaskPhaseItemDto)
  items!: ReorderProjectTaskPhaseItemDto[];
}
