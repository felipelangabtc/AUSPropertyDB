import { IsString, IsOptional } from 'class-validator';

export class SearchDto {
  @IsString()
  query: string;

  @IsOptional()
  filters?: Record<string, any>;

  @IsOptional()
  limit?: number = 20;

  @IsOptional()
  offset?: number = 0;
}

export class SaveSearchDto {
  @IsString()
  name: string;

  @IsString()
  query: string;

  @IsOptional()
  filters?: Record<string, any>;
}
