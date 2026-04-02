import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { CreateCollaboratorSkillDto } from './create-collaborator-skill.dto';

export class BulkCreateCollaboratorSkillsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateCollaboratorSkillDto)
  items!: CreateCollaboratorSkillDto[];
}
