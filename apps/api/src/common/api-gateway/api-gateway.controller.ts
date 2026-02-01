import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, Logger } from '@nestjs/common';
import { KongGatewayService, KongService, KongRoute, RateLimitConfig } from './kong.gateway';
import { TraefikGatewayService, AdvancedRateLimiter } from './traefik.gateway';
import { AdvancedRateLimiterService, RateLimitRule } from './advanced-rate-limiter';

@Controller('api-gateway')
export class ApiGatewayController {
  private readonly logger = new Logger(ApiGatewayController.name);

  constructor(
    private kongGateway: KongGatewayService,
    private traefikGateway: TraefikGatewayService,
    private rateLimiter: AdvancedRateLimiterService,
  ) {}

  // Kong Gateway Endpoints
  @Post('kong/services')
  async registerKongService(@Body() service: KongService) {
    this.logger.log(`Registering Kong service: ${service.name}`);
    return this.kongGateway.registerService(service);
  }

  @Post('kong/routes')
  async createKongRoute(@Body() route: KongRoute) {
    this.logger.log(`Creating Kong route: ${route.name}`);
    return this.kongGateway.createRoute(route);
  }

  @Get('kong/services/:name')
  async getKongService(@Param('name') name: string) {
    return this.kongGateway.getService(name);
  }

  @Get('kong/routes')
  async getKongRoutes() {
    return this.kongGateway.getAllRoutes();
  }

  @Delete('kong/services/:name')
  async deleteKongService(@Param('name') name: string) {
    return this.kongGateway.deleteService(name);
  }

  @Post('kong/rate-limit')
  async applyKongRateLimit(@Body() config: RateLimitConfig) {
    this.logger.log(`Applying Kong rate limiting: ${config.service}`);
    return this.kongGateway.applyRateLimiting(config);
  }

  @Post('kong/auth/:type')
  async applyKongAuth(
    @Param('type') authType: 'jwt' | 'oauth2' | 'key-auth',
    @Body() body: { service: string }
  ) {
    this.logger.log(`Applying Kong authentication: ${authType} for ${body.service}`);
    return this.kongGateway.applyAuthentication(body.service, authType);
  }

  @Post('kong/cors')
  async applyKongCORS(@Body() body: { service: string; origins: string[] }) {
    this.logger.log(`Applying Kong CORS for ${body.service}`);
    return this.kongGateway.applyCORS(body.service, body.origins);
  }

  @Get('kong/health')
  async getKongHealth() {
    return this.kongGateway.checkHealth();
  }

  // Traefik Gateway Endpoints
  @Get('traefik/services')
  async getTraefikServices() {
    return this.traefikGateway.getAllServices();
  }

  @Get('traefik/services/:name')
  async getTraefikService(@Param('name') name: string) {
    return this.traefikGateway.getService(name);
  }

  @Get('traefik/routers')
  async getTraefikRouters() {
    return this.traefikGateway.getAllRouters();
  }

  @Get('traefik/routers/:name')
  async getTraefikRouter(@Param('name') name: string) {
    return this.traefikGateway.getRouter(name);
  }

  @Get('traefik/middlewares')
  async getTraefikMiddlewares() {
    return this.traefikGateway.getAllMiddlewares();
  }

  @Get('traefik/health')
  async getTraefikHealth() {
    return this.traefikGateway.checkHealth();
  }

  @Get('traefik/entrypoints')
  async getTraefikEntrypoints() {
    return this.traefikGateway.getEntrypoints();
  }

  // Advanced Rate Limiter Endpoints
  @Get('rate-limiting/rules')
  async getRateLimitRules() {
    return {
      success: true,
      data: this.rateLimiter.getRules(),
      count: this.rateLimiter.getRules().length,
    };
  }

  @Get('rate-limiting/rules/:id')
  async getRateLimitRule(@Param('id') ruleId: string) {
    const rule = this.rateLimiter.getRule(ruleId);
    return {
      success: !!rule,
      data: rule,
    };
  }

  @Post('rate-limiting/rules')
  @HttpCode(201)
  async createRateLimitRule(@Body() rule: RateLimitRule) {
    this.logger.log(`Creating rate limit rule: ${rule.name}`);
    this.rateLimiter.addRule(rule);
    return {
      success: true,
      message: `Rate limit rule '${rule.name}' created`,
      data: rule,
    };
  }

  @Put('rate-limiting/rules/:id')
  async updateRateLimitRule(
    @Param('id') ruleId: string,
    @Body() updates: Partial<RateLimitRule>
  ) {
    this.logger.log(`Updating rate limit rule: ${ruleId}`);
    this.rateLimiter.updateRule(ruleId, updates);
    return {
      success: true,
      message: `Rate limit rule '${ruleId}' updated`,
      data: this.rateLimiter.getRule(ruleId),
    };
  }

  @Delete('rate-limiting/rules/:id')
  async deleteRateLimitRule(@Param('id') ruleId: string) {
    this.logger.log(`Deleting rate limit rule: ${ruleId}`);
    this.rateLimiter.removeRule(ruleId);
    return {
      success: true,
      message: `Rate limit rule '${ruleId}' deleted`,
    };
  }

  @Post('rate-limiting/reset/:ruleId/:key')
  async resetRateLimit(@Param('ruleId') ruleId: string, @Param('key') key: string) {
    this.rateLimiter.reset(ruleId, key);
    return {
      success: true,
      message: `Rate limit reset for ${ruleId}/${key}`,
    };
  }

  @Post('rate-limiting/reset-all')
  async resetAllRateLimits() {
    this.rateLimiter.resetAll();
    return {
      success: true,
      message: 'All rate limits reset',
    };
  }

  // Gateway Status Endpoints
  @Get('status')
  async getGatewayStatus() {
    const [kongHealth, traefikHealth] = await Promise.all([
      this.kongGateway.checkHealth(),
      this.traefikGateway.checkHealth(),
    ]);

    return {
      timestamp: new Date().toISOString(),
      kong: kongHealth,
      traefik: traefikHealth,
      status: kongHealth.success && traefikHealth.status === 'healthy' ? 'healthy' : 'degraded',
    };
  }

  @Get('config')
  async getGatewayConfig() {
    const [traefikStatic, traefikDynamic] = await Promise.all([
      this.traefikGateway.loadStaticConfig(),
      this.traefikGateway.loadDynamicConfig(),
    ]);

    return {
      traefik: {
        static: traefikStatic,
        dynamic: traefikDynamic,
      },
      rateLimiting: {
        rules: this.rateLimiter.getRules().length,
        strategies: ['fixed-window', 'sliding-window', 'token-bucket', 'leaky-bucket'],
      },
    };
  }
}
