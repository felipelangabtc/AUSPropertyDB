import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';

/**
 * Looker Analytics Integration Service
 * Manages Looker dashboard creation, embedding, and SSO
 */
export interface LookerConfig {
  apiEndpoint: string;
  clientId: string;
  clientSecret: string;
  instanceUrl: string;
  embedSecret: string;
  redirectUrl: string;
}

export interface LookerDashboard {
  id: string;
  title: string;
  description?: string;
  looks: LookerLook[];
}

export interface LookerLook {
  id: string;
  title: string;
  query: string;
  filters?: Record<string, string>;
}

export interface LookerEmbedSession {
  nonce: string;
  host: string;
  embedUrl: string;
  expiresAt: number;
}

export interface LookerAPIToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

@Injectable()
export class LookerService {
  private readonly logger = new Logger(LookerService.name);
  private config: LookerConfig;
  private apiToken: LookerAPIToken | null = null;
  private tokenExpireTime: number = 0;

  constructor(private configService: ConfigService) {
    this.initializeConfig();
  }

  /**
   * Initialize Looker configuration
   */
  private initializeConfig(): void {
    this.config = {
      apiEndpoint: this.configService.get('LOOKER_API_ENDPOINT') || 'https://looker.example.com/api/3.1',
      clientId: this.configService.get('LOOKER_CLIENT_ID') || '',
      clientSecret: this.configService.get('LOOKER_CLIENT_SECRET') || '',
      instanceUrl: this.configService.get('LOOKER_INSTANCE_URL') || 'https://looker.example.com',
      embedSecret: this.configService.get('LOOKER_EMBED_SECRET') || '',
      redirectUrl: this.configService.get('LOOKER_REDIRECT_URL') || 'http://localhost:3000/auth/looker',
    };

    this.logger.log(`Looker initialized with endpoint: ${this.config.apiEndpoint}`);
  }

  /**
   * Authenticate with Looker API
   */
  private async authenticateAPI(): Promise<boolean> {
    try {
      // Check if token is still valid
      if (this.apiToken && this.tokenExpireTime > Date.now()) {
        return true;
      }

      const response = await this.makeAPIRequest('POST', '/auth/token', {
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      });

      this.apiToken = response;
      this.tokenExpireTime = Date.now() + (response.expires_in * 1000 - 60000); // Refresh 1 min before expiry

      this.logger.log('Looker API authentication successful');
      return true;
    } catch (error) {
      this.logger.error('Failed to authenticate with Looker API', error);
      return false;
    }
  }

  /**
   * Make API request to Looker
   */
  private makeAPIRequest(
    method: string,
    path: string,
    data?: any
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = new URL(this.config.apiEndpoint + path);
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiToken && { Authorization: `Bearer ${this.apiToken.access_token}` }),
        },
      };

      const req = https.request(url, options, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(body || '{}'));
          } else {
            reject(new Error(`API request failed: ${res.statusCode} ${body}`));
          }
        });
      });

      req.on('error', reject);

      if (data) {
        req.write(JSON.stringify(data));
      }
      req.end();
    });
  }

  /**
   * Get all dashboards
   */
  async getDashboards(): Promise<LookerDashboard[]> {
    try {
      await this.authenticateAPI();
      const response = await this.makeAPIRequest('GET', '/dashboards');
      return response;
    } catch (error) {
      this.logger.error('Failed to get dashboards', error);
      return [];
    }
  }

  /**
   * Create analytics dashboard
   */
  async createAnalyticsDashboard(
    title: string,
    description: string,
    looks: LookerLook[]
  ): Promise<LookerDashboard | null> {
    try {
      await this.authenticateAPI();

      const dashboardData = {
        title,
        description,
        elements: looks.map((look, index) => ({
          title: look.title,
          type: 'looker_column',
          query_id: look.id,
          x: (index % 2) * 6,
          y: Math.floor(index / 2) * 8,
          width: 6,
          height: 8,
        })),
      };

      const response = await this.makeAPIRequest('POST', '/dashboards', dashboardData);
      this.logger.log(`Created dashboard: ${title}`);
      return response;
    } catch (error) {
      this.logger.error('Failed to create dashboard', error);
      return null;
    }
  }

  /**
   * Create property analytics dashboard
   */
  async createPropertyAnalyticsDashboard(): Promise<LookerDashboard | null> {
    const looks: LookerLook[] = [
      {
        id: 'property_views',
        title: 'Property Views Over Time',
        query: `SELECT DATE(timestamp) as date, COUNT(*) as views FROM events WHERE eventName='property_viewed' GROUP BY date ORDER BY date DESC`,
      },
      {
        id: 'top_properties',
        title: 'Top 10 Most Viewed Properties',
        query: `SELECT propertyId, COUNT(*) as views FROM events WHERE eventName='property_viewed' GROUP BY propertyId ORDER BY views DESC LIMIT 10`,
      },
      {
        id: 'contact_conversion',
        title: 'View to Contact Conversion Rate',
        query: `SELECT COUNT(DISTINCT CASE WHEN eventName='property_contacted' THEN propertyId END) / COUNT(DISTINCT propertyId) as conversion_rate FROM events`,
      },
      {
        id: 'location_insights',
        title: 'Property Interest by Location',
        query: `SELECT JSON_VALUE(data, '$.location') as location, COUNT(*) as interest FROM events WHERE eventName='property_viewed' GROUP BY location ORDER BY interest DESC`,
      },
    ];

    return this.createAnalyticsDashboard(
      'Property Analytics Dashboard',
      'Key metrics and insights for property listings',
      looks
    );
  }

  /**
   * Create user behavior dashboard
   */
  async createUserBehaviorDashboard(): Promise<LookerDashboard | null> {
    const looks: LookerLook[] = [
      {
        id: 'active_users',
        title: 'Active Users by Day',
        query: `SELECT DATE(timestamp) as date, COUNT(DISTINCT userId) as active_users FROM events GROUP BY date ORDER BY date DESC`,
      },
      {
        id: 'user_segments',
        title: 'User Segments',
        query: `SELECT JSON_VALUE(userProperties, '$.userType') as userType, COUNT(DISTINCT userId) as count FROM events GROUP BY userType`,
      },
      {
        id: 'engagement_funnel',
        title: 'User Engagement Funnel',
        query: `SELECT eventName, COUNT(DISTINCT userId) as users FROM events GROUP BY eventName ORDER BY users DESC LIMIT 10`,
      },
      {
        id: 'retention',
        title: 'User Retention Rate',
        query: `SELECT DATE(TIMESTAMP_TRUNC(timestamp, MONTH)) as month, COUNT(DISTINCT userId) as retained_users FROM events GROUP BY month ORDER BY month DESC`,
      },
    ];

    return this.createAnalyticsDashboard(
      'User Behavior Dashboard',
      'User engagement, retention, and behavior analytics',
      looks
    );
  }

  /**
   * Create market insights dashboard
   */
  async createMarketInsightsDashboard(): Promise<LookerDashboard | null> {
    const looks: LookerLook[] = [
      {
        id: 'market_trends',
        title: 'Market Trends',
        query: `SELECT DATE_TRUNC(timestamp, MONTH) as month, JSON_VALUE(data, '$.location') as location, COUNT(*) as interest FROM events WHERE eventName='property_viewed' GROUP BY month, location ORDER BY month DESC`,
      },
      {
        id: 'price_range_interest',
        title: 'Interest by Price Range',
        query: `SELECT CASE WHEN CAST(JSON_VALUE(data, '$.price') AS INT64) < 500000 THEN '<500k' WHEN CAST(JSON_VALUE(data, '$.price') AS INT64) < 1000000 THEN '500k-1M' ELSE '>1M' END as price_range, COUNT(*) as interest FROM events WHERE eventName='property_viewed' GROUP BY price_range`,
      },
      {
        id: 'bedrooms_popularity',
        title: 'Property Type Popularity',
        query: `SELECT JSON_VALUE(data, '$.bedrooms') as bedrooms, COUNT(*) as interest FROM events WHERE eventName='property_viewed' GROUP BY bedrooms ORDER BY interest DESC`,
      },
      {
        id: 'search_keywords',
        title: 'Top Search Keywords',
        query: `SELECT JSON_VALUE(data, '$.searchQuery') as keyword, COUNT(*) as searches FROM events WHERE eventName='search_performed' GROUP BY keyword ORDER BY searches DESC LIMIT 20`,
      },
    ];

    return this.createAnalyticsDashboard(
      'Market Insights Dashboard',
      'Market trends, demand analysis, and opportunity identification',
      looks
    );
  }

  /**
   * Generate embed session for SSO
   */
  generateEmbedSession(
    userId: string,
    userName: string,
    userEmail: string,
    externalGroupId?: string
  ): LookerEmbedSession {
    try {
      // Generate nonce
      const nonce = this.generateNonce();

      // Create embed URL with SSO
      const embedUrl = this.createEmbedUrl(
        userId,
        userName,
        userEmail,
        externalGroupId,
        nonce
      );

      return {
        nonce,
        host: this.config.instanceUrl,
        embedUrl,
        expiresAt: Date.now() + 60000, // 1 minute
      };
    } catch (error) {
      this.logger.error('Failed to generate embed session', error);
      throw error;
    }
  }

  /**
   * Generate secure nonce
   */
  private generateNonce(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Create embed URL with SSO
   */
  private createEmbedUrl(
    userId: string,
    userName: string,
    userEmail: string,
    externalGroupId: string = 'default',
    nonce: string
  ): string {
    const crypto = require('crypto');

    // Create SSO URL parameters
    const ssoParams = {
      nonce,
      user_id: userId,
      user_attributes: {
        name: userName,
        email: userEmail,
        external_group_id: externalGroupId,
      },
      model: 'dashboards',
      resource: 'property_analytics',
      permission: ['see_lookml_dashboards'],
    };

    // Sign with embed secret
    const signature = crypto
      .createHmac('sha256', this.config.embedSecret)
      .update(JSON.stringify(ssoParams))
      .digest('base64');

    // Construct embed URL
    const queryParams = new URLSearchParams({
      nonce,
      signature,
      src: `dashboards/2`,
      filter_field_1: 'dashboards.user_id',
      filter_value_1: userId,
    });

    return `${this.config.instanceUrl}/embed/dashboards/1?${queryParams.toString()}`;
  }

  /**
   * Get dashboard embed URL
   */
  async getDashboardEmbedUrl(
    dashboardId: string,
    userId: string,
    filters?: Record<string, string>
  ): Promise<string> {
    try {
      const session = this.generateEmbedSession(userId, `User ${userId}`, `user${userId}@example.com`);

      const filterParams = new URLSearchParams();
      Object.entries(filters || {}).forEach(([key, value]) => {
        filterParams.append(`filter_field_${filterParams.size + 1}`, key);
        filterParams.append(`filter_value_${filterParams.size}`, value);
      });

      return `${session.host}/embed/dashboards/${dashboardId}?nonce=${session.nonce}&${filterParams.toString()}`;
    } catch (error) {
      this.logger.error('Failed to get dashboard embed URL', error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.authenticateAPI();
      return !!this.apiToken;
    } catch (error) {
      this.logger.error('Looker health check failed', error);
      return false;
    }
  }
}
