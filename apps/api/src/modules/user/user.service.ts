import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@aus-prop/db';
import { nanoid } from 'nanoid';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        avatar: true,
        preferences: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...dto,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        preferences: true,
      },
    });

    this.logger.log(`User updated: ${id}`);
    return user;
  }

  async addToWatchlist(userId: string, propertyId: string) {
    // Check if property exists
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    // Check if already in watchlist
    const existing = await this.prisma.watchlist.findFirst({
      where: { userId, propertyId },
    });

    if (existing) {
      throw new BadRequestException('Property already in watchlist');
    }

    const watchlist = await this.prisma.watchlist.create({
      data: {
        id: nanoid(),
        userId,
        propertyId,
      },
    });

    this.logger.log(`Property ${propertyId} added to watchlist for user ${userId}`);
    return watchlist;
  }

  async removeFromWatchlist(userId: string, propertyId: string) {
    await this.prisma.watchlist.deleteMany({
      where: { userId, propertyId },
    });

    this.logger.log(`Property ${propertyId} removed from watchlist for user ${userId}`);
    return { message: 'Property removed from watchlist' };
  }

  async getWatchlist(userId: string, skip = 0, take = 20) {
    const watchlist = await this.prisma.watchlist.findMany({
      where: { userId },
      include: {
        property: {
          include: {
            listings: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
            priceHistory: {
              orderBy: { capturedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });

    const total = await this.prisma.watchlist.count({
      where: { userId },
    });

    return {
      data: watchlist.map((w) => ({
        ...w.property,
        currentPrice: w.property.priceHistory[0]?.price,
        listings: w.property.listings.length > 0 ? w.property.listings[0] : null,
      })),
      pagination: {
        total,
        skip,
        take,
        hasMore: skip + take < total,
      },
    };
  }

  async createAlert(userId: string, alert: any) {
    const newAlert = await this.prisma.alert.create({
      data: {
        id: nanoid(),
        userId,
        ...alert,
      },
    });

    this.logger.log(`Alert created for user ${userId}: ${newAlert.id}`);
    return newAlert;
  }

  async getAlerts(userId: string, skip = 0, take = 20) {
    const alerts = await this.prisma.alert.findMany({
      where: { userId },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });

    const total = await this.prisma.alert.count({
      where: { userId },
    });

    return {
      data: alerts,
      pagination: {
        total,
        skip,
        take,
        hasMore: skip + take < total,
      },
    };
  }

  async deleteAlert(userId: string, alertId: string) {
    const alert = await this.prisma.alert.findUnique({
      where: { id: alertId },
    });

    if (!alert || alert.userId !== userId) {
      throw new NotFoundException('Alert not found');
    }

    await this.prisma.alert.delete({
      where: { id: alertId },
    });

    this.logger.log(`Alert deleted: ${alertId}`);
    return { message: 'Alert deleted' };
  }
}
