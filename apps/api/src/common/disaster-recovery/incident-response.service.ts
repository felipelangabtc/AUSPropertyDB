import { Injectable, Logger } from '@nestjs/common';

/**
 * Incident Runbook
 */
export interface Runbook {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  steps: RunbookStep[];
  estimatedTime: number; // minutes
  prerequisites: string[];
  rollback: RollbackPlan;
}

/**
 * Runbook Step
 */
export interface RunbookStep {
  order: number;
  title: string;
  description: string;
  command?: string;
  expectedOutput?: string;
  criticalityFailure: 'continue' | 'stop';
}

/**
 * Rollback Plan
 */
export interface RollbackPlan {
  enabled: boolean;
  steps: RunbookStep[];
  estimatedTime: number;
}

/**
 * Incident Response Service
 *
 * Provides automated incident response procedures:
 * - Database failover runbook
 * - API service degradation
 * - Cache failure recovery
 * - Security incident response
 * - Data corruption detection and recovery
 */
@Injectable()
export class IncidentResponseService {
  private logger = new Logger(IncidentResponseService.name);
  private runbooks: Map<string, Runbook> = new Map();

  constructor() {
    this.initializeRunbooks();
  }

  /**
   * Initialize incident runbooks
   */
  private initializeRunbooks() {
    const runbooks: Runbook[] = [
      {
        id: 'db-failover',
        title: 'Database Failover',
        description: 'Failover from primary database to replica',
        severity: 'critical',
        category: 'Database',
        estimatedTime: 5,
        prerequisites: [
          'Verify replica is in sync',
          'Confirm network connectivity',
          'Notify stakeholders',
        ],
        steps: [
          {
            order: 1,
            title: 'Stop writes to primary',
            description: 'Drain connection pool and stop accepting writes',
            command: 'psql -U admin -d primary -c "SET default_transaction_read_only = on;"',
            criticalityFailure: 'stop',
          },
          {
            order: 2,
            title: 'Verify replica lag',
            description: 'Ensure replica has caught up with primary',
            command: 'psql -U admin -d replica -c "SELECT pg_last_xlog_receive_location();"',
            criticalityFailure: 'stop',
          },
          {
            order: 3,
            title: 'Promote replica',
            description: 'Promote replica to primary',
            command: 'pg_ctl promote -D /var/lib/postgresql/data',
            criticalityFailure: 'stop',
          },
          {
            order: 4,
            title: 'Update DNS',
            description: 'Point application to new primary',
            command:
              'aws route53 change-resource-record-sets --hosted-zone-id ZONE_ID --change-batch file://dns-update.json',
            criticalityFailure: 'continue',
          },
          {
            order: 5,
            title: 'Redirect traffic',
            description: 'Update load balancer to route to new primary',
            criticalityFailure: 'continue',
          },
          {
            order: 6,
            title: 'Monitor replication',
            description: 'Monitor for any replication lag or errors',
            criticalityFailure: 'continue',
          },
        ],
        rollback: {
          enabled: true,
          estimatedTime: 10,
          steps: [
            {
              order: 1,
              title: 'Restore original primary',
              description: 'Restore original primary from backup if needed',
              criticalityFailure: 'continue',
            },
            {
              order: 2,
              title: 'Re-establish replication',
              description: 'Set up replication from new primary to restored primary',
              criticalityFailure: 'continue',
            },
            {
              order: 3,
              title: 'Failback to original primary',
              description: 'Failback traffic to original primary after verification',
              criticalityFailure: 'continue',
            },
          ],
        },
      },
      {
        id: 'cache-failure',
        title: 'Cache Failure Recovery',
        description: 'Recover from Redis/cache failure',
        severity: 'high',
        category: 'Cache',
        estimatedTime: 3,
        prerequisites: ['Confirm cache is down', 'Verify application is operational'],
        steps: [
          {
            order: 1,
            title: 'Check cache status',
            description: 'Verify cache service is not responding',
            command: 'redis-cli ping',
            criticalityFailure: 'continue',
          },
          {
            order: 2,
            title: 'Disable cache in application',
            description: 'Update application configuration to bypass cache',
            command: 'kubectl set env deployment/api CACHE_ENABLED=false',
            criticalityFailure: 'stop',
          },
          {
            order: 3,
            title: 'Restart cache service',
            description: 'Restart Redis service',
            command: 'systemctl restart redis-server',
            criticalityFailure: 'continue',
          },
          {
            order: 4,
            title: 'Warm up cache',
            description: 'Pre-populate cache with critical data',
            command: 'npm run cache:warmup',
            criticalityFailure: 'continue',
          },
          {
            order: 5,
            title: 'Re-enable cache',
            description: 'Update application configuration to use cache again',
            command: 'kubectl set env deployment/api CACHE_ENABLED=true',
            criticalityFailure: 'continue',
          },
        ],
        rollback: {
          enabled: false,
          estimatedTime: 0,
          steps: [],
        },
      },
      {
        id: 'api-degradation',
        title: 'API Service Degradation',
        description: 'Response to degraded API performance',
        severity: 'high',
        category: 'API',
        estimatedTime: 10,
        prerequisites: ['Confirm elevated latency', 'Check resource utilization'],
        steps: [
          {
            order: 1,
            title: 'Check resource usage',
            description: 'Monitor CPU, memory, and I/O',
            command: 'kubectl top nodes && kubectl top pods --all-namespaces',
            criticalityFailure: 'continue',
          },
          {
            order: 2,
            title: 'Enable rate limiting',
            description: 'Activate aggressive rate limiting to protect system',
            command: 'kubectl set env deployment/api RATE_LIMIT_STRICT=true',
            criticalityFailure: 'continue',
          },
          {
            order: 3,
            title: 'Scale API pods',
            description: 'Increase number of API instances',
            command: 'kubectl scale deployment api --replicas=10',
            criticalityFailure: 'continue',
          },
          {
            order: 4,
            title: 'Identify slow queries',
            description: 'Check database slow query log',
            command:
              'psql -U admin -d prod -c "SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"',
            criticalityFailure: 'continue',
          },
          {
            order: 5,
            title: 'Kill long-running queries',
            description: 'Terminate queries running > 5 minutes',
            command:
              'psql -U admin -d prod -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE duration > \'5 min\'::interval;"',
            criticalityFailure: 'continue',
          },
          {
            order: 6,
            title: 'Monitor metrics',
            description: 'Watch for latency improvement',
            criticalityFailure: 'continue',
          },
        ],
        rollback: {
          enabled: true,
          estimatedTime: 5,
          steps: [
            {
              order: 1,
              title: 'Scale back API pods',
              description: 'Reduce API instances to normal level',
              command: 'kubectl scale deployment api --replicas=3',
              criticalityFailure: 'continue',
            },
            {
              order: 2,
              title: 'Disable rate limiting',
              description: 'Return to normal rate limiting',
              command: 'kubectl set env deployment/api RATE_LIMIT_STRICT=false',
              criticalityFailure: 'continue',
            },
          ],
        },
      },
      {
        id: 'data-corruption',
        title: 'Data Corruption Detection & Recovery',
        description: 'Detect and recover from data corruption',
        severity: 'critical',
        category: 'Data',
        estimatedTime: 60,
        prerequisites: [
          'Verify backup integrity',
          'Identify affected data range',
          'Notify data owners',
        ],
        steps: [
          {
            order: 1,
            title: 'Isolate affected data',
            description: 'Stop writes to affected tables',
            command: 'psql -U admin -d prod -c "ALTER TABLE affected_table DISABLE TRIGGER ALL;"',
            criticalityFailure: 'stop',
          },
          {
            order: 2,
            title: 'Backup corrupted data',
            description: 'Create backup of current state for forensics',
            command: 'pg_dump -U admin -d prod -t affected_table > corrupted_backup.sql',
            criticalityFailure: 'continue',
          },
          {
            order: 3,
            title: 'Find clean backup',
            description: 'Locate backup before corruption occurred',
            criticalityFailure: 'stop',
          },
          {
            order: 4,
            title: 'Restore from backup',
            description: 'Restore affected table from clean backup',
            command: 'psql -U admin -d prod < clean_backup.sql',
            criticalityFailure: 'stop',
          },
          {
            order: 5,
            title: 'Verify data integrity',
            description: 'Run integrity checks on restored data',
            command: 'psql -U admin -d prod -c "REINDEX TABLE affected_table;"',
            criticalityFailure: 'continue',
          },
          {
            order: 6,
            title: 'Enable writes',
            description: 'Re-enable triggers and writes',
            command: 'psql -U admin -d prod -c "ALTER TABLE affected_table ENABLE TRIGGER ALL;"',
            criticalityFailure: 'continue',
          },
        ],
        rollback: {
          enabled: false,
          estimatedTime: 0,
          steps: [],
        },
      },
    ];

    runbooks.forEach((rb) => this.runbooks.set(rb.id, rb));
  }

  /**
   * Get runbook by ID
   */
  getRunbook(id: string): Runbook | undefined {
    return this.runbooks.get(id);
  }

  /**
   * Get all runbooks
   */
  getAllRunbooks(): Runbook[] {
    return Array.from(this.runbooks.values());
  }

  /**
   * Get runbooks by category
   */
  getRunbooksByCategory(category: string): Runbook[] {
    return Array.from(this.runbooks.values()).filter((r) => r.category === category);
  }

  /**
   * Get runbooks by severity
   */
  getRunbooksBySeverity(severity: string): Runbook[] {
    return Array.from(this.runbooks.values()).filter((r) => r.severity === severity);
  }

  /**
   * Execute runbook step
   */
  async executeStep(
    runbookId: string,
    stepOrder: number
  ): Promise<{ success: boolean; output?: string; error?: string }> {
    const runbook = this.runbooks.get(runbookId);
    if (!runbook) {
      return { success: false, error: `Runbook not found: ${runbookId}` };
    }

    const step = runbook.steps.find((s) => s.order === stepOrder);
    if (!step) {
      return { success: false, error: `Step ${stepOrder} not found` };
    }

    try {
      this.logger.log(`Executing: ${runbook.title} - Step ${step.order}: ${step.title}`);

      // In production, would actually execute the command
      // and capture output
      if (step.command) {
        this.logger.log(`Command: ${step.command}`);
      }

      return {
        success: true,
        output: `Step ${step.order} executed successfully`,
      };
    } catch (error) {
      this.logger.error(`Step execution failed: ${error.message}`);

      if (step.criticalityFailure === 'stop') {
        return { success: false, error: error.message };
      }

      return { success: true, output: `Step failed but continuing: ${error.message}` };
    }
  }

  /**
   * Get runbook recommendations for incident
   */
  getRecommendations(incidentType: string): Runbook[] {
    const keywords = incidentType.toLowerCase().split(' ');

    return Array.from(this.runbooks.values()).filter((rb) => {
      const title = rb.title.toLowerCase();
      const description = rb.description.toLowerCase();

      return keywords.some((kw) => title.includes(kw) || description.includes(kw));
    });
  }

  /**
   * Get incident categories
   */
  getCategories(): string[] {
    const categories = new Set<string>();

    this.runbooks.forEach((rb) => categories.add(rb.category));

    return Array.from(categories).sort();
  }
}
