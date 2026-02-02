import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';

export class SearchDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsNumber()
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  maxPrice?: number;

  @IsOptional()
  @IsNumber()
  minBeds?: number;

  @IsOptional()
  @IsNumber()
  minBaths?: number;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  sortBy?: 'price_asc' | 'price_desc' | 'date_new' | 'date_old';

  @IsOptional()
  @IsNumber()
  limit?: number = 20;

  @IsOptional()
  @IsNumber()
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
