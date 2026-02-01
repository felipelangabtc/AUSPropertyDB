/**
 * Disaster Recovery Module Index
 *
 * Exports all disaster recovery services and utilities
 */

export { BackupService, BackupConfig, BackupMetadata } from './backup.service';
export {
  FailoverService,
  FailoverConfig,
  FailoverRegion,
  FailoverStatus,
} from './failover.service';
export {
  IncidentResponseService,
  Runbook,
  RunbookStep,
  RollbackPlan,
} from './incident-response.service';

/**
 * Disaster Recovery Services Registry
 */
export const DISASTER_RECOVERY_SERVICES = [
  'BackupService',
  'FailoverService',
  'IncidentResponseService',
];

/**
 * RTO/RPO Targets
 */
export const RTO_RPO_TARGETS = {
  applicationCrash: { rto: 1, rpo: 0 }, // minutes
  databaseFailover: { rto: 1, rpo: 0 },
  regionalOutage: { rto: 1, rpo: 5 },
  backupRestore: { rto: 60, rpo: 60 },
  fullRecovery: { rto: 120, rpo: 60 },
};

/**
 * Backup Configuration Defaults
 */
export const BACKUP_DEFAULTS = {
  strategy: 'daily' as const,
  retention: 30, // days
  compression: 'gzip' as const,
  encryption: true,
  destination: 's3' as const,
};

/**
 * Failover Configuration Defaults
 */
export const FAILOVER_DEFAULTS = {
  enabled: true,
  strategy: 'active-passive' as const,
  healthCheckInterval: 30000, // ms
  failoverThreshold: 3, // failed checks
  loadBalancingStrategy: 'latency-based' as const,
};

/**
 * Runbook Categories
 */
export const RUNBOOK_CATEGORIES = ['Database', 'Cache', 'API', 'Data', 'Security', 'Network'];

/**
 * Incident Severities
 */
export const INCIDENT_SEVERITIES = ['low', 'medium', 'high', 'critical'];
