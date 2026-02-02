import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@aus-prop/db';
import { nanoid } from 'nanoid';
import { SearchDto, SaveSearchDto } from './dto/search.dto';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  async search(userId: string | undefined, dto: SearchDto) {
    const { query, limit = 20, offset = 0, ...filters } = dto;

    const where: any = {
      isActive: true,
    };

    if (query) {
      where.OR = [
        { canonicalAddress: { contains: query, mode: 'insensitive' } },
        { suburb: { contains: query, mode: 'insensitive' } },
        { state: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (filters.minPrice) {
      where.priceHistory = { ...where.priceHistory, some: { price: { gte: filters.minPrice } } };
    }

    if (filters.maxPrice) {
      where.priceHistory = { ...where.priceHistory, some: { price: { lte: filters.maxPrice } } };
    }

    if (filters.minBeds) {
      where.bedrooms = { gte: filters.minBeds };
    }

    if (filters.minBaths) {
      where.bathrooms = { gte: filters.minBaths };
    }

    if (filters.type) {
      where.propertyType = filters.type;
    }

    let orderBy: any = { convenienceScore: 'desc' };
    if (filters.sortBy === 'price_asc') {
      orderBy = { priceHistory: { _min: { price: 'asc' } } };
    } else if (filters.sortBy === 'price_desc') {
      orderBy = { priceHistory: { _min: { price: 'desc' } } };
    } else if (filters.sortBy === 'date_new') {
      orderBy = { createdAt: 'desc' };
    } else if (filters.sortBy === 'date_old') {
      orderBy = { createdAt: 'asc' };
    }

    const properties = await this.prisma.property.findMany({
      where,
      include: {
        listings: { take: 1, orderBy: { createdAt: 'desc' } },
        priceHistory: { take: 1, orderBy: { capturedAt: 'desc' } },
      },
      skip: offset,
      take: limit,
      orderBy,
    });

    const total = await this.prisma.property.count({ where });

    this.logger.log(`Search performed: "${query}" - found ${total} results`);

    return {
      data: properties.map((p) => ({
        ...p,
        currentPrice: p.priceHistory[0]?.price,
      })),
      pagination: {
        query,
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async searchSuggestions(query: string, limit = 10) {
    const suburbs = await this.prisma.property.findMany({
      where: {
        suburb: { contains: query, mode: 'insensitive' },
        isActive: true,
      },
      select: { suburb: true },
      distinct: ['suburb'],
      take: limit,
    });

    const addresses = await this.prisma.property.findMany({
      where: {
        canonicalAddress: { contains: query, mode: 'insensitive' },
        isActive: true,
      },
      select: { canonicalAddress: true },
      take: limit,
    });

    return {
      suburbs: suburbs.map((s) => ({ type: 'suburb', value: s.suburb })),
      addresses: addresses.map((a) => ({ type: 'address', value: a.canonicalAddress })),
    };
  }

  async saveSearch(userId: string, dto: SaveSearchDto) {
    const savedSearch = await this.prisma.savedSearch.create({
      data: {
        id: nanoid(),
        userId,
        name: dto.name,
        query: dto.query,
        filters: dto.filters,
      },
    });

    this.logger.log(`Search saved: ${dto.name} for user ${userId}`);
    return savedSearch;
  }

  async getSavedSearches(userId: string) {
    return this.prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteSavedSearch(userId: string, searchId: string) {
    await this.prisma.savedSearch.delete({
      where: { id: searchId },
    });

    this.logger.log(`Saved search deleted: ${searchId}`);
    return { message: 'Search deleted' };
  }
}
