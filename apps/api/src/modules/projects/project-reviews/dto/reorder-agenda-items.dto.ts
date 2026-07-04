import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

class ReorderAgendaItemEntryDto {
  @IsString()
  id!: string;

  @IsInt()
  @Min(0)
  orderIndex!: number;
}

export class ReorderProjectReviewAgendaItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReorderAgendaItemEntryDto)
  items!: ReorderAgendaItemEntryDto[];
}
