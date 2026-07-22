import { IsUUID } from 'class-validator';

export class LinkPlatformUserDto {
  @IsUUID()
  userId!: string;
}
