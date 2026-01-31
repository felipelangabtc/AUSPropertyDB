import { IsString, IsUrl, IsObject, IsNotEmpty } from 'class-validator';

export class CreateWebhookDto {
  @IsString()
  @IsNotEmpty()
  event: string;

  @IsObject()
  payload: Record<string, any>;

  @IsString()
  @IsUrl()
  targetUrl: string;
}
