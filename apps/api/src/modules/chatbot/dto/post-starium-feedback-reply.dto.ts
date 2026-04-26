import { IsString, MaxLength, MinLength } from 'class-validator';

export class PostStariumFeedbackReplyDto {
  @IsString()
  @MinLength(1, { message: 'Le message ne peut pas être vide.' })
  @MaxLength(8000)
  message!: string;
}
