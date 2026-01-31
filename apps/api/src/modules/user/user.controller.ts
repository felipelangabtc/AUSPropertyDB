import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtGuard } from '../../common/guards/jwt.guard';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Req() req: any) {
    return this.userService.getUserById(req.user.sub);
  }

  @Put('me')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(@Req() req: any, @Body() dto: UpdateUserDto) {
    return this.userService.updateUser(req.user.sub, dto);
  }

  @Post('watchlist/:propertyId')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add property to watchlist' })
  async addToWatchlist(@Req() req: any, @Param('propertyId') propertyId: string) {
    return this.userService.addToWatchlist(req.user.sub, propertyId);
  }

  @Delete('watchlist/:propertyId')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove property from watchlist' })
  async removeFromWatchlist(@Req() req: any, @Param('propertyId') propertyId: string) {
    return this.userService.removeFromWatchlist(req.user.sub, propertyId);
  }

  @Get('watchlist')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user watchlist' })
  async getWatchlist(@Req() req: any, @Query('skip') skip = 0, @Query('take') take = 20) {
    return this.userService.getWatchlist(
      req.user.sub,
      parseInt(skip as string),
      parseInt(take as string)
    );
  }

  @Post('alerts')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create alert' })
  async createAlert(@Req() req: any, @Body() dto: any) {
    return this.userService.createAlert(req.user.sub, dto);
  }

  @Get('alerts')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user alerts' })
  async getAlerts(@Req() req: any, @Query('skip') skip = 0, @Query('take') take = 20) {
    return this.userService.getAlerts(
      req.user.sub,
      parseInt(skip as string),
      parseInt(take as string)
    );
  }

  @Delete('alerts/:alertId')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete alert' })
  async deleteAlert(@Req() req: any, @Param('alertId') alertId: string) {
    return this.userService.deleteAlert(req.user.sub, alertId);
  }
}
