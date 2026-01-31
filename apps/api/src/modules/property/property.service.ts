import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@aus-prop/db';
import { PropertyFilterDto } from './dto/property-filter.dto';

@Injectable()
export class PropertyService {
  private readonly logger = new Logger(PropertyService.name);

  constructor(private readonly prisma: PrismaService) {}

  async searchProperties(filters: PropertyFilterDto) {
    const {
      address,
      minPrice,
      maxPrice,
      minConvenience,
      latitude,
      longitude,
      radiusKm = 5,
      limit = 20,
      offset = 0,
      sortBy = 'recency',
      sortOrder = 'desc',
    } = filters;

    // Build where clause
    const where: any = {
      isActive: true,
    };

    if (address) {
      where.canonicalAddress = {
        contains: address,
        mode: 'insensitive',
      };
    }

    if (minConvenience !== undefined) {
      where.convenienceScore = {
        gte: minConvenience,
      };
    }

    // Build geographic query if latitude and longitude provided
    if (latitude !== undefined && longitude !== undefined) {
      // Use PostGIS ST_DWithin for distance-based search
      // This requires raw Prisma query
      const result = await this.prisma.$queryRaw`
        SELECT p.*,
               ST_Distance(
                 ST_MakePoint(${longitude}, ${latitude})::geography,
                 ST_MakePoint(p.longitude, p.latitude)::geography
               ) as distance_meters
        FROM "Property" p
        WHERE ST_DWithin(
          ST_MakePoint(p.longitude, p.latitude)::geography,
          ST_MakePoint(${longitude}, ${latitude})::geography,
          ${radiusKm * 1000}
        )
        AND p."isActive" = true
        ${address ? `AND p."canonicalAddress" ILIKE ${'%' + address + '%'}` : ''}
        ${minConvenience !== undefined ? `AND p."convenienceScore" >= ${minConvenience}` : ''}
        ORDER BY distance_meters ${sortOrder === 'asc' ? 'ASC' : 'DESC'}
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      const total = await this.prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM "Property" p
        WHERE ST_DWithin(
          ST_MakePoint(p.longitude, p.latitude)::geography,
          ST_MakePoint(${longitude}, ${latitude})::geography,
          ${radiusKm * 1000}
        )
        AND p."isActive" = true
        ${address ? `AND p."canonicalAddress" ILIKE ${'%' + address + '%'}` : ''}
        ${minConvenience !== undefined ? `AND p."convenienceScore" >= ${minConvenience}` : ''}
      `;

      return {
        data: result,
        pagination: {
          total: (total as any)[0]?.count || 0,
          limit,
          offset,
          hasMore: offset + limit < (total as any)[0]?.count,
        },
      };
    }

    // Standard Prisma query without geo
    const properties = await this.prisma.property.findMany({
      where,
      include: {
        listings: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
        priceHistory: {
          orderBy: { capturedAt: 'desc' },
          take: 1,
        },
        propertyPois: {
          include: {
            poi: true,
          },
          take: 5,
        },
      },
      orderBy: this.getOrderBy(sortBy, sortOrder),
      skip: offset,
      take: limit,
    });

    const total = await this.prisma.property.count({ where });

    return {
      data: properties.map((p) => ({
        ...p,
        currentPrice: p.priceHistory[0]?.price,
        recentListings: p.listings,
        nearbyPois: p.propertyPois.map((pp) => pp.poi),
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async getPropertyById(id: string) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: {
        listings: {
          orderBy: { createdAt: 'desc' },
        },
        priceHistory: {
          orderBy: { capturedAt: 'desc' },
          take: 30,
        },
        propertyPois: {
          include: {
            poi: true,
          },
        },
        mergeReviews: true,
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    return {
      ...property,
      currentPrice: property.priceHistory[0]?.price,
      priceHistory: property.priceHistory.reverse(),
    };
  }

  async getListings(propertyId: string, limit = 20, offset = 0) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const listings = await this.prisma.listing.findMany({
      where: { propertyId },
      include: {
        events: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    const total = await this.prisma.listing.count({
      where: { propertyId },
    });

    return {
      data: listings,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async getPriceHistory(propertyId: string, days = 90) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    const history = await this.prisma.priceHistory.findMany({
      where: {
        propertyId,
        capturedAt: {
          gte: since,
        },
      },
      orderBy: { capturedAt: 'asc' },
    });

    return {
      data: history,
      statistics: {
        minPrice: Math.min(...history.map((h) => h.price)),
        maxPrice: Math.max(...history.map((h) => h.price)),
        avgPrice: history.reduce((sum, h) => sum + h.price, 0) / history.length,
        priceChange: history[history.length - 1]?.price - history[0]?.price || 0,
      },
    };
  }

  private getOrderBy(sortBy: string, sortOrder: string): any {
    const order = sortOrder === 'asc' ? 'asc' : 'desc';

    switch (sortBy) {
      case 'price':
        return { priceHistory: { _count: order } };
      case 'convenience':
        return { convenienceScore: order };
      case 'recency':
      default:
        return { updatedAt: order };
    }
  }
}
