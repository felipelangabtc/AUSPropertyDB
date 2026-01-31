import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PropertyService } from './property.service';
import { PropertyFilterDto } from './dto/property-filter.dto';

@ApiTags('properties')
@Controller('properties')
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @Get()
  @ApiOperation({ summary: 'Search properties with filters' })
  @ApiQuery({ name: 'address', required: false })
  @ApiQuery({ name: 'minPrice', required: false })
  @ApiQuery({ name: 'maxPrice', required: false })
  @ApiQuery({ name: 'minConvenience', required: false })
  @ApiQuery({ name: 'latitude', required: false })
  @ApiQuery({ name: 'longitude', required: false })
  @ApiQuery({ name: 'radiusKm', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  async searchProperties(@Query() filters: PropertyFilterDto) {
    return this.propertyService.searchProperties(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get property details' })
  async getPropertyById(@Param('id') id: string) {
    return this.propertyService.getPropertyById(id);
  }

  @Get(':id/listings')
  @ApiOperation({ summary: 'Get all listings for a property' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  async getListings(
    @Param('id') id: string,
    @Query('limit') limit = 20,
    @Query('offset') offset = 0
  ) {
    return this.propertyService.getListings(
      id,
      parseInt(limit as string),
      parseInt(offset as string)
    );
  }

  @Get(':id/price-history')
  @ApiOperation({ summary: 'Get price history for a property' })
  @ApiQuery({ name: 'days', required: false })
  async getPriceHistory(@Param('id') id: string, @Query('days') days = 90) {
    return this.propertyService.getPriceHistory(id, parseInt(days as string));
  }
}
