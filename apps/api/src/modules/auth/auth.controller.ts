import { Controller, Post, Body, UseGuards, Request, Get, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthSignupDto, RequestMagicLinkDto, VerifyMagicLinkDto, RefreshTokenDto } from './dto';
import { JwtGuard } from '../../common/guards/jwt.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({ summary: 'Sign up with email and name' })
  async signup(@Body() dto: AuthSignupDto) {
    return this.authService.signup(dto.email, dto.name, dto.password);
  }

  @Post('magic-link')
  @ApiOperation({ summary: 'Request a magic link for passwordless login' })
  async requestMagicLink(@Body() dto: RequestMagicLinkDto) {
    return this.authService.requestMagicLink(dto.email);
  }

  @Post('verify-magic-link')
  @ApiOperation({ summary: 'Verify magic link token' })
  async verifyMagicLink(@Body() dto: VerifyMagicLinkDto) {
    return this.authService.verifyMagicLink(dto.token);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user information' })
  async getCurrentUser(@Req() req: any) {
    const user = await this.authService.validateUser(req.user.sub);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified,
    };
  }
}
