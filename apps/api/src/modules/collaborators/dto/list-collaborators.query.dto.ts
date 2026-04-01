import { Transform } from 'class-transformer';
import { CollaboratorSource, CollaboratorStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

function parseStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const raw = Array.isArray(value) ? value : [value];
  const parts = raw
    .flatMap((entry) =>
      String(entry)
        .split(',')
        .map((item) => item.trim()),
    )
    .filter((item) => item.length > 0);
  return Array.from(new Set(parts));
}

export class ListCollaboratorsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @Transform(({ value }) => parseStringArray(value))
  @IsEnum(CollaboratorStatus, { each: true })
  status?: CollaboratorStatus[];

  @IsOptional()
  @Transform(({ value }) => parseStringArray(value))
  @IsEnum(CollaboratorSource, { each: true })
  source?: CollaboratorSource[];

  @IsOptional()
  @Transform(({ value }) => parseStringArray(value))
  @IsString({ each: true })
  tag?: string[];

  @IsOptional()
  @IsString()
  managerId?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
