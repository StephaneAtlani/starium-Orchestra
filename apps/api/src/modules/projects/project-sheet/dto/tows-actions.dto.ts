import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
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

/** Quadrants TOWS — liste libre par clé si la clé est fournie dans le PATCH */
export class TowsActionsPatchDto {
  @IsOptional()
  @trimTowsQuad()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(5000, { each: true })
  SO?: string[];

  @IsOptional()
  @trimTowsQuad()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(5000, { each: true })
  ST?: string[];

  @IsOptional()
  @trimTowsQuad()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(5000, { each: true })
  WO?: string[];

  @IsOptional()
  @trimTowsQuad()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(5000, { each: true })
  WT?: string[];
}
