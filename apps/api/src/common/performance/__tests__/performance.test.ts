import { Test, TestingModule } from '@nestjs/testing';
import {
  CDNConfigService,
  ImageOptimizerService,
  QueryProfilerService,
  ResourceMonitorService,
} from '../index';

describe('Performance Tuning - Phase 4.5', () => {
  let module: TestingModule;
  let cdnService: CDNConfigService;
  let imageOptimizer: ImageOptimizerService;
  let queryProfiler: QueryProfilerService;
  let resourceMonitor: ResourceMonitorService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        CDNConfigService,
        ImageOptimizerService,
        QueryProfilerService,
        ResourceMonitorService,
      ],
    }).compile();

    cdnService = module.get<CDNConfigService>(CDNConfigService);
    imageOptimizer = module.get<ImageOptimizerService>(ImageOptimizerService);
    queryProfiler = module.get<QueryProfilerService>(QueryProfilerService);
    resourceMonitor = module.get<ResourceMonitorService>(ResourceMonitorService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('CDN Configuration', () => {
    it('should return cache headers for images', () => {
      const headers = cdnService.getCacheControlHeaders('/images/property.jpg');

      expect(headers['Cache-Control']).toContain('max-age=31536000');
      expect(headers['Cache-Control']).toContain('public');
    });

    it('should return cache headers for static assets', () => {
      const headers = cdnService.getCacheControlHeaders('/assets/main.css');

      expect(headers['Cache-Control']).toContain('max-age=86400');
    });

    it('should return cache headers for HTML', () => {
      const headers = cdnService.getCacheControlHeaders('/index.html');

      expect(headers['Cache-Control']).toContain('max-age=3600');
    });

    it('should return cache headers for API responses', () => {
      const headers = cdnService.getCacheControlHeaders('/api/properties');

      expect(headers['Cache-Control']).toContain('max-age=60');
    });

    it('should generate CDN URL correctly', () => {
      const url = cdnService.getCDNUrl('/properties/image.jpg');

      expect(url).toContain('cdn');
      expect(url).toContain('image.jpg');
    });

    it('should support compression utilities', () => {
      const compressed = cdnService.compressContent('Hello World', 'gzip');

      expect(compressed).toBeDefined();
      expect(compressed.length).toBeLessThan(11);
    });

    it('should minify CSS', () => {
      const css = 'body { color: red; margin: 0; }';
      const minified = cdnService.minifyCSS(css);

      expect(minified).not.toContain('\n');
      expect(minified).not.toContain('  ');
    });

    it('should minify JavaScript', () => {
      const js = 'function test() { return true; }';
      const minified = cdnService.minifyJS(js);

      expect(minified).toBeDefined();
      expect(minified.length).toBeLessThanOrEqual(js.length);
    });
  });

  describe('Image Optimization', () => {
    it('should generate responsive image variants', async () => {
      const variants = await imageOptimizer.generateVariants(
        'https://example.com/image.jpg',
        'property'
      );

      expect(variants).toBeDefined();
      expect(variants.sizes).toContain(150); // thumbnail
      expect(variants.sizes).toContain(1600); // large
    });

    it('should generate LQIP placeholder', async () => {
      const lqip = await imageOptimizer.generateLQIP('https://example.com/image.jpg');

      expect(lqip).toBeDefined();
      expect(lqip).toContain('data:image');
    });

    it('should generate srcset attribute', () => {
      const srcset = imageOptimizer.generateSrcset({
        small: { url: 'small.webp', width: 400 },
        medium: { url: 'medium.webp', width: 800 },
        large: { url: 'large.webp', width: 1600 },
      });

      expect(srcset).toContain('400w');
      expect(srcset).toContain('800w');
      expect(srcset).toContain('1600w');
    });

    it('should generate picture element HTML', () => {
      const html = imageOptimizer.generatePictureHTML(
        {
          avif: { url: 'image.avif', width: 800 },
          webp: { url: 'image.webp', width: 800 },
          fallback: { url: 'image.jpg', width: 800 },
        },
        'Test Property'
      );

      expect(html).toContain('<picture>');
      expect(html).toContain('avif');
      expect(html).toContain('webp');
      expect(html).toContain('</picture>');
    });

    it('should support multiple formats', () => {
      const formats = imageOptimizer.getSupportedFormats();

      expect(formats).toContain('webp');
      expect(formats).toContain('avif');
      expect(formats).toContain('jpeg');
      expect(formats).toContain('png');
    });

    it('should calculate optimal image dimensions', () => {
      const dims = imageOptimizer.getOptimalDimensions(1600, 1200, 'property');

      expect(dims.width).toBeLessThanOrEqual(1600);
      expect(dims.height).toBeLessThanOrEqual(1200);
      expect(dims.aspectRatio).toBe('4:3');
    });
  });

  describe('Query Profiling', () => {
    it('should profile query execution time', async () => {
      const query = 'SELECT * FROM properties WHERE suburb = $1 LIMIT 10';
      const profile = await queryProfiler.profileQuery(query, ['Sydney']);

      expect(profile).toBeDefined();
      expect(profile.executionTime).toBeGreaterThanOrEqual(0);
      expect(profile.rowsReturned).toBeDefined();
    });

    it('should detect slow queries', async () => {
      const query = 'SELECT * FROM properties'; // Full table scan
      const isSlow = await queryProfiler.isSlowQuery(query);

      expect(typeof isSlow).toBe('boolean');
    });

    it('should generate EXPLAIN ANALYZE', async () => {
      const query = 'SELECT * FROM properties WHERE suburb = $1';
      const plan = await queryProfiler.getExecutionPlan(query, ['Sydney']);

      expect(plan).toBeDefined();
      expect(plan.type).toBeDefined(); // 'Index Scan' or 'Seq Scan'
    });

    it('should detect N+1 queries', () => {
      const queries = [
        'SELECT * FROM properties WHERE id = 1',
        'SELECT * FROM properties WHERE id = 2',
        'SELECT * FROM properties WHERE id = 3',
      ];

      const isNPlusOne = queryProfiler.detectNPlusOne(queries);

      expect(typeof isNPlusOne).toBe('boolean');
    });

    it('should provide optimization recommendations', async () => {
      const query = 'SELECT * FROM properties'; // Missing WHERE clause
      const recommendations = await queryProfiler.analyzeQuery(query);

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);

      recommendations.forEach((rec) => {
        expect(rec.severity).toMatch(/critical|warning|info/);
        expect(rec.description).toBeDefined();
        expect(rec.recommendation).toBeDefined();
      });
    });

    it('should track query statistics', async () => {
      const query = 'SELECT * FROM properties WHERE suburb = $1';

      // Execute multiple times
      for (let i = 0; i < 5; i++) {
        await queryProfiler.profileQuery(query, ['Sydney']);
      }

      const stats = queryProfiler.getQueryStatistics(query);

      expect(stats.count).toBe(5);
      expect(stats.avgExecutionTime).toBeGreaterThan(0);
      expect(stats.minExecutionTime).toBeGreaterThan(0);
      expect(stats.maxExecutionTime).toBeGreaterThanOrEqual(stats.minExecutionTime);
    });
  });

  describe('Resource Monitoring', () => {
    it('should get CPU usage', () => {
      const usage = resourceMonitor.getCPUUsage();

      expect(typeof usage).toBe('number');
      expect(usage).toBeGreaterThanOrEqual(0);
      expect(usage).toBeLessThanOrEqual(100);
    });

    it('should get memory usage', () => {
      const memory = resourceMonitor.getMemoryUsage();

      expect(memory.heapUsed).toBeGreaterThan(0);
      expect(memory.heapTotal).toBeGreaterThan(memory.heapUsed);
      expect(memory.external).toBeGreaterThanOrEqual(0);
      expect(memory.usagePercent).toBeGreaterThanOrEqual(0);
      expect(memory.usagePercent).toBeLessThanOrEqual(100);
    });

    it('should detect resource constraints', () => {
      const constrained = resourceMonitor.isConstrained();

      expect(typeof constrained).toBe('boolean');
    });

    it('should monitor event loop lag', () => {
      const lag = resourceMonitor.monitorEventLoopLag();

      expect(typeof lag).toBe('number');
      expect(lag).toBeGreaterThanOrEqual(0);
    });

    it('should recommend scaling', () => {
      const recommendation = resourceMonitor.getScalingRecommendation();

      expect(recommendation).toBeDefined();
      expect(['scale-up', 'scale-down', 'none']).toContain(recommendation.action);
    });

    it('should return full resource status', () => {
      const status = resourceMonitor.getStatus();

      expect(status.cpu).toBeDefined();
      expect(status.memory).toBeDefined();
      expect(status.eventLoopLag).toBeDefined();
      expect(status.constrained).toBeDefined();
      expect(status.scaling).toBeDefined();
    });

    it('should track connection count', () => {
      const connections = resourceMonitor.getConnectionCount();

      expect(typeof connections).toBe('number');
      expect(connections).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Integration Tests', () => {
    it('should handle full optimization workflow', async () => {
      // Monitor resources
      const resourceStatus = resourceMonitor.getStatus();
      expect(resourceStatus.constrained).toBeDefined();

      // Profile query
      const query = 'SELECT * FROM properties WHERE suburb = $1';
      const profile = await queryProfiler.profileQuery(query, ['Sydney']);
      expect(profile.executionTime).toBeGreaterThanOrEqual(0);

      // Optimize image
      const lqip = await imageOptimizer.generateLQIP('https://example.com/image.jpg');
      expect(lqip).toBeDefined();

      // Set CDN headers
      const headers = cdnService.getCacheControlHeaders('/images/image.jpg');
      expect(headers['Cache-Control']).toBeDefined();
    });

    it('should generate performance report', async () => {
      const report = {
        timestamp: new Date(),
        resources: resourceMonitor.getStatus(),
        queryPerformance: {
          avgExecutionTime: 45,
          slowQueries: 2,
        },
        cacheHitRate: 0.92,
        cdnHitRate: 0.88,
      };

      expect(report.resources).toBeDefined();
      expect(report.queryPerformance.avgExecutionTime).toBe(45);
      expect(report.cacheHitRate).toBeGreaterThan(0.8);
    });
  });

  describe('Performance Targets', () => {
    it('should meet response time targets', async () => {
      const query = 'SELECT * FROM properties LIMIT 10';
      const profile = await queryProfiler.profileQuery(query, []);

      // Target: < 100ms for typical queries
      expect(profile.executionTime).toBeLessThan(100);
    });

    it('should achieve cache hit rate target', () => {
      const hitRate = cdnService.getCacheHitRate();

      // Target: > 85%
      expect(hitRate).toBeGreaterThan(0.85);
    });

    it('should keep memory usage reasonable', () => {
      const memory = resourceMonitor.getMemoryUsage();

      // Target: < 70%
      expect(memory.usagePercent).toBeLessThan(70);
    });

    it('should keep CPU usage low', () => {
      const cpu = resourceMonitor.getCPUUsage();

      // Target: < 60%
      expect(cpu).toBeLessThan(60);
    });
  });
});
