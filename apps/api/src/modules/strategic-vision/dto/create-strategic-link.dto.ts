import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { StrategicLinkType } from '@prisma/client';

export class CreateStrategicLinkDto {
  @IsEnum(StrategicLinkType)
  linkType!: StrategicLinkType;

  @IsString()
  @IsNotEmpty()
  targetId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  targetLabelSnapshot!: string;
}
