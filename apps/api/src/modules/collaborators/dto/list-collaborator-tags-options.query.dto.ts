import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { ListCollaboratorOptionsQueryDto } from './list-collaborator-options.query.dto';

export class ListCollaboratorTagsOptionsQueryDto extends ListCollaboratorOptionsQueryDto {
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  limit?: number = 50;
}
