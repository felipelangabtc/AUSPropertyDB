import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchDto, SaveSearchDto } from './dto/search.dto';
import { JwtGuard } from '../../common/guards/jwt.guard';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Search properties' })
  @ApiQuery({ name: 'query', required: true })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  async search(@Query() dto: SearchDto) {
    return this.searchService.search(undefined, dto);
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get search suggestions' })
  @ApiQuery({ name: 'query', required: true })
  async getSuggestions(@Query('query') query: string) {
    return this.searchService.searchSuggestions(query);
  }

  @Post('saved')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save a search' })
  async saveSearch(@Req() req: any, @Body() dto: SaveSearchDto) {
    return this.searchService.saveSearch(req.user.sub, dto);
  }

  @Get('saved')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get saved searches' })
  async getSavedSearches(@Req() req: any) {
    return this.searchService.getSavedSearches(req.user.sub);
  }

  @Delete('saved/:id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a saved search' })
  async deleteSavedSearch(@Req() req: any, @Param('id') id: string) {
    return this.searchService.deleteSavedSearch(req.user.sub, id);
  }
}
