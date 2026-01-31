import { IsOptional, Min, Max, IsNumber, IsString } from 'class-validator';

export class PropertyFilterDto {
  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  maxPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minConvenience?: number;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsNumber()
  radiusKm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  limit?: number = 20;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @IsString()
  sortBy?: 'price' | 'convenience' | 'recency';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
