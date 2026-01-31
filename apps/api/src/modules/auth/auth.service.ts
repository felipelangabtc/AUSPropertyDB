import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@aus-prop/db';
import { nanoid } from 'nanoid';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {
    // Initialize email transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'localhost',
      port: parseInt(process.env.EMAIL_PORT || '1025'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: process.env.EMAIL_USER
        ? {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
          }
        : undefined,
    });
  }

  async signup(email: string, name: string, password?: string): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    // Create new user
    const user = await this.prisma.user.create({
      data: {
        id: nanoid(),
        email,
        name,
        role: 'user',
        emailVerified: false,
        isActive: true,
      },
    });

    this.logger.log(`New user created: ${user.id}`);

    // Generate tokens
    const { accessToken, refreshToken } = this.generateTokens(user.id, email, 'user');

    // Store refresh token in database
    await this.prisma.session.create({
      data: {
        id: nanoid(),
        userId: user.id,
        refreshToken: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async requestMagicLink(email: string): Promise<{ message: string }> {
    // Find or create user
    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          id: nanoid(),
          email,
          name: email.split('@')[0],
          role: 'user',
          emailVerified: false,
          isActive: true,
        },
      });
    }

    // Generate magic link token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);

    // Store token in database
    await this.prisma.session.create({
      data: {
        id: nanoid(),
        userId: user.id,
        refreshToken: tokenHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      },
    });

    // Send email with magic link
    const magicLink = `${process.env.WEB_URL}/auth/magic-link?token=${token}`;

    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@ausproperty.io',
        to: email,
        subject: 'Your Magic Link - AUS Property Intelligence',
        html: `
          <h1>Welcome to AUS Property Intelligence</h1>
          <p>Click the link below to sign in:</p>
          <a href="${magicLink}">${magicLink}</a>
          <p>This link expires in 15 minutes.</p>
        `,
      });

      this.logger.log(`Magic link sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send magic link: ${error.message}`);
      throw new BadRequestException('Failed to send magic link');
    }

    return { message: 'Magic link sent to your email' };
  }

  async verifyMagicLink(token: string): Promise<AuthResponse> {
    const tokenHash = this.hashToken(token);

    // Find session by token hash
    const session = await this.prisma.session.findFirst({
      where: {
        refreshToken: tokenHash,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Update user as verified
    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });

    // Delete used token
    await this.prisma.session.delete({
      where: { id: session.id },
    });

    // Generate new tokens
    const { accessToken, refreshToken } = this.generateTokens(user.id, user.email, user.role);

    // Store new refresh token
    await this.prisma.session.create({
      data: {
        id: nanoid(),
        userId: user.id,
        refreshToken: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    this.logger.log(`User verified via magic link: ${user.id}`);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    const tokenHash = this.hashToken(refreshToken);

    // Find session
    const session = await this.prisma.session.findFirst({
      where: {
        refreshToken: tokenHash,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Generate new access token
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      { expiresIn: '1h' }
    );

    return { accessToken };
  }

  async validateUser(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  }

  private generateTokens(
    userId: string,
    email: string,
    role: string
  ): { accessToken: string; refreshToken: string } {
    const accessToken = this.jwtService.sign(
      {
        sub: userId,
        email,
        role,
      },
      { expiresIn: '1h' }
    );

    const refreshToken = crypto.randomBytes(32).toString('hex');

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
