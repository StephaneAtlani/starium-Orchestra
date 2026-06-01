import { ArrayMinSize, IsArray, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class InstanceAgendaItemDto {
  @IsString()
  itemId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class ReplaceInstanceAgendaDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InstanceAgendaItemDto)
  items!: InstanceAgendaItemDto[];
}
