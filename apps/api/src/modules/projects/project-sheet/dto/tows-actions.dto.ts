import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
} from 'class-validator';

function trimTowsQuad() {
  return Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (!Array.isArray(value)) return value;
    return value
      .map((s: unknown) => (typeof s === 'string' ? s.trim() : ''))
      .filter((s: string) => s.length > 0);
  });
}

/** Quadrants TOWS — max 2 chaînes par clé si la clé est fournie dans le PATCH */
export class TowsActionsPatchDto {
  @IsOptional()
  @trimTowsQuad()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @IsString({ each: true })
  SO?: string[];

  @IsOptional()
  @trimTowsQuad()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @IsString({ each: true })
  ST?: string[];

  @IsOptional()
  @trimTowsQuad()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @IsString({ each: true })
  WO?: string[];

  @IsOptional()
  @trimTowsQuad()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @IsString({ each: true })
  WT?: string[];
}
