import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { BigQueryService, AnalyticsEvent } from './bigquery.service';

/**
 * Event type definitions
 */
export enum EventType {
  // Property events
  PROPERTY_VIEWED = 'property_viewed',
  PROPERTY_CONTACTED = 'property_contacted',
  PROPERTY_SHARED = 'property_shared',
  PROPERTY_SAVED = 'property_saved',
  PROPERTY_UNSAVED = 'property_unsaved',

  // Search events
  SEARCH_PERFORMED = 'search_performed',
  SEARCH_FILTERED = 'search_filtered',
  SEARCH_SORTED = 'search_sorted',

  // Auth events
  USER_SIGNED_UP = 'user_signed_up',
  USER_LOGGED_IN = 'user_logged_in',
  USER_LOGGED_OUT = 'user_logged_out',
  USER_PASSWORD_RESET = 'user_password_reset',

  // Inquiry events
  INQUIRY_SUBMITTED = 'inquiry_submitted',
  INQUIRY_VIEWED = 'inquiry_viewed',
  INQUIRY_RESPONDED = 'inquiry_responded',

  // Page events
  PAGE_VIEWED = 'page_viewed',
  PAGE_SCROLLED = 'page_scrolled',
  BUTTON_CLICKED = 'button_clicked',
  FORM_SUBMITTED = 'form_submitted',

  // Error events
  ERROR_OCCURRED = 'error_occurred',
  API_ERROR = 'api_error',
}

export interface EventContext {
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;
  url?: string;
  viewport?: {
    width: number;
    height: number;
  };
}

export interface UserProperties {
  firstName?: string;
  lastName?: string;
  email?: string;
  userType?: 'buyer' | 'seller' | 'agent';
  accountCreatedAt?: Date;
  lastLoginAt?: Date;
  totalSearches?: number;
  totalContacts?: number;
}

export interface PropertyEventData {
  propertyId: string;
  price?: number;
  bedrooms?: number;
  location?: string;
  viewDuration?: number;
  source?: string;
  contactMethod?: 'phone' | 'email' | 'form';
  agentId?: string;
}

export interface SearchEventData {
  searchQuery?: string;
  filters?: {
    minPrice?: number;
    maxPrice?: number;
    bedrooms?: number;
    location?: string;
    propertyType?: string;
  };
  resultsCount?: number;
  responseTime?: number;
  sortBy?: string;
}

@Injectable()
export class EventTrackingService {
  private readonly logger = new Logger(EventTrackingService.name);
  private eventQueue: AnalyticsEvent[] = [];
  private batchSize = 100;
  private batchTimeout = 30000; // 30 seconds
  private batchTimer: NodeJS.Timeout;

  constructor(private bigqueryService: BigQueryService) {
    this.startBatchProcessor();
  }

  /**
   * Track a single event
   */
  async trackEvent(
    eventType: EventType,
    data: Record<string, any>,
    context: EventContext,
    userProperties?: UserProperties,
    propertyId?: string
  ): Promise<void> {
    try {
      const event: AnalyticsEvent = {
        eventId: uuidv4(),
        eventName: eventType,
        userId: context.userId,
        propertyId,
        timestamp: new Date(),
        data: {
          ...data,
          context: {
            sessionId: context.sessionId,
            userAgent: context.userAgent,
            ipAddress: context.ipAddress,
            referrer: context.referrer,
            url: context.url,
            viewport: context.viewport,
          },
        },
        userProperties,
      };

      this.eventQueue.push(event);

      // Flush if queue is full
      if (this.eventQueue.length >= this.batchSize) {
        await this.flushEvents();
      }
    } catch (error) {
      this.logger.error(`Failed to track event: ${eventType}`, error);
    }
  }

  /**
   * Track property viewed event
   */
  async trackPropertyViewed(
    propertyId: string,
    eventData: PropertyEventData,
    context: EventContext,
    userProperties?: UserProperties
  ): Promise<void> {
    return this.trackEvent(EventType.PROPERTY_VIEWED, eventData, context, userProperties, propertyId);
  }

  /**
   * Track property contacted event
   */
  async trackPropertyContacted(
    propertyId: string,
    eventData: PropertyEventData & { contactMethod: string },
    context: EventContext,
    userProperties?: UserProperties
  ): Promise<void> {
    return this.trackEvent(EventType.PROPERTY_CONTACTED, eventData, context, userProperties, propertyId);
  }

  /**
   * Track search performed event
   */
  async trackSearchPerformed(
    eventData: SearchEventData,
    context: EventContext,
    userProperties?: UserProperties
  ): Promise<void> {
    return this.trackEvent(EventType.SEARCH_PERFORMED, eventData, context, userProperties);
  }

  /**
   * Track user sign up event
   */
  async trackUserSignUp(
    userId: string,
    userType: 'buyer' | 'seller' | 'agent',
    context: EventContext
  ): Promise<void> {
    const userProperties: UserProperties = {
      userType,
      accountCreatedAt: new Date(),
    };

    return this.trackEvent(EventType.USER_SIGNED_UP, { userType }, { ...context, userId }, userProperties);
  }

  /**
   * Track user logged in event
   */
  async trackUserLoggedIn(userId: string, context: EventContext): Promise<void> {
    return this.trackEvent(
      EventType.USER_LOGGED_IN,
      { loginTime: new Date() },
      { ...context, userId }
    );
  }

  /**
   * Track inquiry submitted event
   */
  async trackInquirySubmitted(
    userId: string,
    propertyId: string,
    inquiryData: Record<string, any>,
    context: EventContext
  ): Promise<void> {
    return this.trackEvent(EventType.INQUIRY_SUBMITTED, inquiryData, { ...context, userId }, undefined, propertyId);
  }

  /**
   * Track page viewed event
   */
  async trackPageViewed(
    pageName: string,
    context: EventContext,
    userProperties?: UserProperties
  ): Promise<void> {
    return this.trackEvent(EventType.PAGE_VIEWED, { pageName }, context, userProperties);
  }

  /**
   * Track button clicked event
   */
  async trackButtonClicked(
    buttonName: string,
    context: EventContext,
    customData?: Record<string, any>
  ): Promise<void> {
    return this.trackEvent(EventType.BUTTON_CLICKED, { buttonName, ...customData }, context);
  }

  /**
   * Track error event
   */
  async trackErrorOccurred(
    errorMessage: string,
    errorStack: string,
    context: EventContext,
    errorCode?: string
  ): Promise<void> {
    return this.trackEvent(
      EventType.ERROR_OCCURRED,
      { errorMessage, errorStack, errorCode },
      context
    );
  }

  /**
   * Start batch processor
   */
  private startBatchProcessor(): void {
    this.batchTimer = setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flushEvents().catch((error) => {
          this.logger.error('Batch flush failed', error);
        });
      }
    }, this.batchTimeout);
  }

  /**
   * Flush queued events
   */
  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) {
      return;
    }

    const eventsToFlush = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const result = await this.bigqueryService.insertEvents(eventsToFlush);

      if (result.success) {
        this.logger.debug(`Flushed ${result.rowsInserted} events to BigQuery`);
      } else {
        this.logger.error(`Failed to flush events: ${result.error}`);
        // Re-queue failed events (with retry limit)
        this.eventQueue = [...eventsToFlush, ...this.eventQueue].slice(0, this.batchSize * 2);
      }
    } catch (error) {
      this.logger.error('Error flushing events', error);
      // Re-queue events for retry
      this.eventQueue = [...eventsToFlush, ...this.eventQueue].slice(0, this.batchSize * 2);
    }
  }

  /**
   * Stop batch processor (for graceful shutdown)
   */
  async stopBatchProcessor(): Promise<void> {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    // Flush remaining events
    await this.flushEvents();
    this.logger.log('Event tracking service stopped');
  }

  /**
   * Get event queue statistics
   */
  getQueueStats(): {
    queueSize: number;
    batchSize: number;
    batchesUntilFlush: number;
  } {
    return {
      queueSize: this.eventQueue.length,
      batchSize: this.batchSize,
      batchesUntilFlush: Math.ceil(this.eventQueue.length / this.batchSize),
    };
  }
}
