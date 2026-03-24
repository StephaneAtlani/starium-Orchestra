import { ArrayMaxSize, ArrayUnique, IsArray, IsString } from 'class-validator';

export class ReplaceProjectTagsDto {
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  tagIds!: string[];
}
