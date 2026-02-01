import { Injectable, Logger } from '@nestjs/common';

export interface ImageOptimizationConfig {
  enabled: boolean;
  provider: 'sharp' | 'imgix' | 'cloudinary' | 'none';
  apiKey?: string;
  apiSecret?: string;
  defaultFormats: ('webp' | 'avif' | 'jpeg' | 'png')[];
  qualityLevels: {
    thumbnail: number;
    small: number;
    medium: number;
    large: number;
    original: number;
  };
  sizes: {
    thumbnail: number;
    small: number;
    medium: number;
    large: number;
  };
  cache: {
    enabled: boolean;
    ttl: number;
  };
}

export interface ImageVariant {
  format: 'webp' | 'avif' | 'jpeg' | 'png';
  width: number;
  height: number;
  quality: number;
  size: number;
  url: string;
}

export interface OptimizedImage {
  original: string;
  thumbnail: ImageVariant[];
  small: ImageVariant[];
  medium: ImageVariant[];
  large: ImageVariant[];
  webp: ImageVariant[];
  avif: ImageVariant[];
  lazyLoadPlaceholder: string; // LQIP - Low Quality Image Placeholder
}

/**
 * Image Optimization Service
 *
 * Automatic image optimization for web delivery:
 * - Responsive images (srcset)
 * - Format conversion (WebP, AVIF)
 * - Quality optimization
 * - Lazy loading support
 * - LQIP (Low Quality Image Placeholder)
 *
 * Providers:
 * - Sharp (self-hosted, open-source)
 * - imgix (hosted CDN)
 * - Cloudinary (full-featured SaaS)
 */
@Injectable()
export class ImageOptimizerService {
  private readonly logger = new Logger(ImageOptimizerService.name);
  private config: ImageOptimizationConfig;

  constructor() {
    this.config = this.loadConfiguration();
  }

  /**
   * Load image optimization configuration
   */
  private loadConfiguration(): ImageOptimizationConfig {
    const provider = (process.env.IMAGE_OPTIMIZER_PROVIDER as any) || 'sharp';

    return {
      enabled: process.env.IMAGE_OPTIMIZER_ENABLED !== 'false',
      provider,
      apiKey: process.env.IMAGE_OPTIMIZER_API_KEY,
      apiSecret: process.env.IMAGE_OPTIMIZER_API_SECRET,
      defaultFormats: ['webp', 'jpeg'],
      qualityLevels: {
        thumbnail: 60,
        small: 70,
        medium: 75,
        large: 80,
        original: 95,
      },
      sizes: {
        thumbnail: 150,
        small: 400,
        medium: 800,
        large: 1600,
      },
      cache: {
        enabled: process.env.IMAGE_CACHE_ENABLED !== 'false',
        ttl: parseInt(process.env.IMAGE_CACHE_TTL || '31536000', 10), // 1 year
      },
    };
  }

  /**
   * Optimize image and generate all variants
   *
   * @param imageUrl - Original image URL
   * @param context - Image context (e.g., 'property', 'avatar')
   * @returns Optimized image with all variants
   *
   * @example
   * const optimized = await this.optimizeImage(
   *   'https://example.com/images/property.jpg',
   *   'property'
   * );
   * // Returns variants for thumbnail, small, medium, large, and formats (webp, avif)
   */
  async optimizeImage(imageUrl: string, context: string = 'general'): Promise<OptimizedImage> {
    if (!this.config.enabled) {
      return {
        original: imageUrl,
        thumbnail: [],
        small: [],
        medium: [],
        large: [],
        webp: [],
        avif: [],
        lazyLoadPlaceholder: '',
      };
    }

    this.logger.log(`Optimizing image: ${imageUrl}`);

    switch (this.config.provider) {
      case 'sharp':
        return this.optimizeWithSharp(imageUrl, context);
      case 'imgix':
        return this.optimizeWithImgix(imageUrl, context);
      case 'cloudinary':
        return this.optimizeWithCloudinary(imageUrl, context);
      default:
        return {
          original: imageUrl,
          thumbnail: [],
          small: [],
          medium: [],
          large: [],
          webp: [],
          avif: [],
          lazyLoadPlaceholder: '',
        };
    }
  }

  /**
   * Optimize with Sharp (self-hosted)
   */
  private async optimizeWithSharp(imageUrl: string, context: string): Promise<OptimizedImage> {
    // Sharp implementation would go here
    // This is a placeholder for demonstration
    this.logger.log(`[Sharp] Optimizing ${context} image`);

    return {
      original: imageUrl,
      thumbnail: await this.generateVariants(imageUrl, 'thumbnail'),
      small: await this.generateVariants(imageUrl, 'small'),
      medium: await this.generateVariants(imageUrl, 'medium'),
      large: await this.generateVariants(imageUrl, 'large'),
      webp: await this.generateVariants(imageUrl, 'medium', 'webp'),
      avif: await this.generateVariants(imageUrl, 'medium', 'avif'),
      lazyLoadPlaceholder: await this.generateLQIP(imageUrl),
    };
  }

  /**
   * Optimize with imgix (hosted CDN)
   */
  private async optimizeWithImgix(imageUrl: string, context: string): Promise<OptimizedImage> {
    const baseUrl = new URL(imageUrl).href;

    return {
      original: baseUrl,
      thumbnail: this.generateImgixVariants(baseUrl, 'thumbnail'),
      small: this.generateImgixVariants(baseUrl, 'small'),
      medium: this.generateImgixVariants(baseUrl, 'medium'),
      large: this.generateImgixVariants(baseUrl, 'large'),
      webp: this.generateImgixVariants(baseUrl, 'medium', 'webp'),
      avif: this.generateImgixVariants(baseUrl, 'medium', 'avif'),
      lazyLoadPlaceholder: this.generateImgixLQIP(baseUrl),
    };
  }

  /**
   * Optimize with Cloudinary (full-featured SaaS)
   */
  private async optimizeWithCloudinary(imageUrl: string, context: string): Promise<OptimizedImage> {
    // Cloudinary transformation URL building
    const baseUrl = this.config.apiKey;

    return {
      original: imageUrl,
      thumbnail: this.generateCloudinaryVariants(imageUrl, 'thumbnail'),
      small: this.generateCloudinaryVariants(imageUrl, 'small'),
      medium: this.generateCloudinaryVariants(imageUrl, 'medium'),
      large: this.generateCloudinaryVariants(imageUrl, 'large'),
      webp: this.generateCloudinaryVariants(imageUrl, 'medium', 'webp'),
      avif: this.generateCloudinaryVariants(imageUrl, 'medium', 'avif'),
      lazyLoadPlaceholder: this.generateCloudinaryLQIP(imageUrl),
    };
  }

  /**
   * Generate image variants for Sharp
   */
  private async generateVariants(
    imageUrl: string,
    size: 'thumbnail' | 'small' | 'medium' | 'large',
    format?: 'webp' | 'avif'
  ): Promise<ImageVariant[]> {
    const width = this.config.sizes[size];
    const quality = this.config.qualityLevels[size];
    const formats = format ? [format] : this.config.defaultFormats;

    const variants: ImageVariant[] = [];

    for (const fmt of formats) {
      variants.push({
        format: fmt as any,
        width,
        height: Math.round(width * (9 / 16)), // 16:9 aspect ratio
        quality,
        size: 0, // Would be calculated after optimization
        url: `${imageUrl}?size=${size}&format=${fmt}`, // Placeholder
      });
    }

    return variants;
  }

  /**
   * Generate LQIP (Low Quality Image Placeholder)
   */
  private async generateLQIP(imageUrl: string): Promise<string> {
    // Generate a 10x10 blurred JPEG as data URI
    return 'data:image/jpeg;base64,/9j/...'; // Placeholder
  }

  /**
   * Generate imgix variants
   */
  private generateImgixVariants(
    baseUrl: string,
    size: 'thumbnail' | 'small' | 'medium' | 'large',
    format?: string
  ): ImageVariant[] {
    const width = this.config.sizes[size];
    const quality = this.config.qualityLevels[size];

    const params = new URLSearchParams({
      w: width.toString(),
      q: quality.toString(),
      auto: 'format', // Auto format selection
      fit: 'crop',
      crop: 'faces',
    });

    if (format) {
      params.set('fmt', format);
    }

    return [
      {
        format: (format || 'jpeg') as any,
        width,
        height: Math.round(width * (9 / 16)),
        quality,
        size: 0,
        url: `${baseUrl}?${params.toString()}`,
      },
    ];
  }

  /**
   * Generate imgix LQIP
   */
  private generateImgixLQIP(baseUrl: string): string {
    const params = new URLSearchParams({
      w: '10',
      q: '30',
      blur: '200',
    });

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Generate Cloudinary variants
   */
  private generateCloudinaryVariants(
    imageUrl: string,
    size: 'thumbnail' | 'small' | 'medium' | 'large',
    format?: string
  ): ImageVariant[] {
    const width = this.config.sizes[size];
    const quality = this.config.qualityLevels[size];

    const transformation = [
      `w_${width}`,
      `q_${quality}`,
      format ? `f_${format}` : 'f_auto',
      'c_fill',
      'g_auto',
    ].join('/');

    return [
      {
        format: (format || 'jpeg') as any,
        width,
        height: Math.round(width * (9 / 16)),
        quality,
        size: 0,
        url: `https://res.cloudinary.com/${this.config.apiKey}/image/upload/${transformation}/${imageUrl}`,
      },
    ];
  }

  /**
   * Generate Cloudinary LQIP
   */
  private generateCloudinaryLQIP(imageUrl: string): string {
    const transformation = ['w_10', 'q_30', 'e_blur:300', 'f_auto', 'c_fill', 'g_auto'].join('/');

    return `https://res.cloudinary.com/${this.config.apiKey}/image/upload/${transformation}/${imageUrl}`;
  }

  /**
   * Generate responsive image srcset
   *
   * @example
   * const srcset = this.generateSrcset(optimized);
   * // Returns: "image-sm.webp 400w, image-md.webp 800w, image-lg.webp 1600w"
   */
  generateSrcset(optimized: OptimizedImage): string {
    const srcset: string[] = [];

    // Add different sizes with formats
    optimized.small.forEach((v) => {
      srcset.push(`${v.url} ${v.width}w`);
    });

    optimized.medium.forEach((v) => {
      srcset.push(`${v.url} ${v.width}w`);
    });

    optimized.large.forEach((v) => {
      srcset.push(`${v.url} ${v.width}w`);
    });

    return srcset.join(', ');
  }

  /**
   * Generate picture element HTML
   */
  generatePictureHTML(optimized: OptimizedImage, alt: string): string {
    return `
      <picture>
        <source srcset="${optimized.avif.map((v) => `${v.url} ${v.width}w`).join(', ')}" type="image/avif">
        <source srcset="${optimized.webp.map((v) => `${v.url} ${v.width}w`).join(', ')}" type="image/webp">
        <img
          src="${optimized.original}"
          srcset="${this.generateSrcset(optimized)}"
          alt="${alt}"
          loading="lazy"
          decoding="async"
        >
      </picture>
    `;
  }

  /**
   * Get optimization statistics
   */
  getStatus(): Record<string, any> {
    return {
      enabled: this.config.enabled,
      provider: this.config.provider,
      defaultFormats: this.config.defaultFormats,
      sizes: this.config.sizes,
      qualityLevels: this.config.qualityLevels,
      cache: this.config.cache,
    };
  }
}

/**
 * Image metadata extraction
 */
export class ImageMetadataUtils {
  /**
   * Calculate optimal quality by file size
   */
  static calculateOptimalQuality(originalSize: number, targetSize: number): number {
    if (targetSize >= originalSize) {
      return 95; // No compression needed
    }

    const ratio = targetSize / originalSize;
    const quality = Math.round(ratio * 100);

    return Math.max(40, Math.min(95, quality));
  }

  /**
   * Get image aspect ratio
   */
  static getAspectRatio(width: number, height: number): string {
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const divisor = gcd(width, height);

    return `${width / divisor}:${height / divisor}`;
  }

  /**
   * Calculate optimal dimensions for breakpoint
   */
  static calculateOptimalDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number
  ): { width: number; height: number } {
    if (originalWidth <= maxWidth) {
      return { width: originalWidth, height: originalHeight };
    }

    const ratio = originalHeight / originalWidth;
    return {
      width: maxWidth,
      height: Math.round(maxWidth * ratio),
    };
  }
}
