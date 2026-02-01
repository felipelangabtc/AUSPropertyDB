import { Injectable, Logger } from '@nestjs/common';

export interface RLSPolicy {
  name: string;
  table: string;
  role: string;
  action: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL';
  expression: string;
  description: string;
}

export interface TenantContext {
  userId: string;
  organizationId: string;
  roles: string[];
  permissions: string[];
}

/**
 * Row-Level Security (RLS) Policy Manager
 * 
 * Implements PostgreSQL Row-Level Security policies to enforce:
 * - Tenant isolation (users see only their data)
 * - User-based access control (RBAC)
 * - Organization boundaries
 * 
 * Features:
 * - Automatic tenant filtering
 * - Role-based row access
 * - Dynamic policy generation
 * - Policy validation
 * - Audit logging
 */
@Injectable()
export class RLSPolicyService {
  private readonly logger = new Logger(RLSPolicyService.name);

  /**
   * PostgreSQL RLS policies for tenant and user isolation
   * 
   * These policies ensure that:
   * 1. Users can only see their own organization's data
   * 2. Users can only modify their own organization's data
   * 3. Only authorized users can access sensitive data
   * 4. Audit trails are maintained
   */
  private readonly rlsPolicies: RLSPolicy[] = [
    // ============ USERS TABLE ============
    {
      name: 'users_select_own_or_same_org',
      table: 'users',
      role: 'authenticated',
      action: 'SELECT',
      expression: `
        organization_id = current_setting('app.current_organization_id')::uuid
        OR id = current_setting('app.current_user_id')::uuid
      `,
      description: 'Users can see users in their organization or themselves',
    },
    {
      name: 'users_update_own',
      table: 'users',
      role: 'authenticated',
      action: 'UPDATE',
      expression: `id = current_setting('app.current_user_id')::uuid OR
                   (organization_id = current_setting('app.current_organization_id')::uuid 
                    AND current_setting('app.current_user_role') = 'admin')`,
      description: 'Users can update their own profile or org admins can update org users',
    },

    // ============ PROPERTIES TABLE ============
    {
      name: 'properties_select_org',
      table: 'properties',
      role: 'authenticated',
      action: 'SELECT',
      expression: `
        organization_id = current_setting('app.current_organization_id')::uuid
        OR (visibility = 'public' AND organization_id IN (
          SELECT id FROM organizations WHERE subscription_tier != 'free'
        ))
      `,
      description: 'Users see org properties; public properties from paid orgs',
    },
    {
      name: 'properties_insert_own_org',
      table: 'properties',
      role: 'authenticated',
      action: 'INSERT',
      expression: `organization_id = current_setting('app.current_organization_id')::uuid`,
      description: 'Users can only create properties in their organization',
    },
    {
      name: 'properties_update_own_org',
      table: 'properties',
      role: 'authenticated',
      action: 'UPDATE',
      expression: `organization_id = current_setting('app.current_organization_id')::uuid`,
      description: 'Users can only update properties in their organization',
    },
    {
      name: 'properties_delete_own_org',
      table: 'properties',
      role: 'authenticated',
      action: 'DELETE',
      expression: `organization_id = current_setting('app.current_organization_id')::uuid`,
      description: 'Users can only delete properties in their organization',
    },

    // ============ PRICE HISTORY TABLE ============
    {
      name: 'price_history_select',
      table: 'price_history',
      role: 'authenticated',
      action: 'SELECT',
      expression: `
        property_id IN (
          SELECT id FROM properties 
          WHERE organization_id = current_setting('app.current_organization_id')::uuid
        )
      `,
      description: 'Users can see price history for their org properties',
    },

    // ============ SEARCHES TABLE ============
    {
      name: 'searches_select_own_or_shared',
      table: 'searches',
      role: 'authenticated',
      action: 'SELECT',
      expression: `
        user_id = current_setting('app.current_user_id')::uuid
        OR (
          shared_with && ARRAY[current_setting('app.current_user_id')::uuid]::uuid[]
        )
      `,
      description: 'Users see their searches or searches shared with them',
    },
    {
      name: 'searches_update_own',
      table: 'searches',
      role: 'authenticated',
      action: 'UPDATE',
      expression: `user_id = current_setting('app.current_user_id')::uuid`,
      description: 'Users can only update their own searches',
    },
    {
      name: 'searches_delete_own',
      table: 'searches',
      role: 'authenticated',
      action: 'DELETE',
      expression: `user_id = current_setting('app.current_user_id')::uuid`,
      description: 'Users can only delete their own searches',
    },

    // ============ ALERTS TABLE ============
    {
      name: 'alerts_select_own',
      table: 'user_alerts',
      role: 'authenticated',
      action: 'SELECT',
      expression: `user_id = current_setting('app.current_user_id')::uuid`,
      description: 'Users can only see their own alerts',
    },
    {
      name: 'alerts_insert_own',
      table: 'user_alerts',
      role: 'authenticated',
      action: 'INSERT',
      expression: `user_id = current_setting('app.current_user_id')::uuid`,
      description: 'Users can only create alerts for themselves',
    },
    {
      name: 'alerts_update_own',
      table: 'user_alerts',
      role: 'authenticated',
      action: 'UPDATE',
      expression: `user_id = current_setting('app.current_user_id')::uuid`,
      description: 'Users can only update their own alerts',
    },
    {
      name: 'alerts_delete_own',
      table: 'user_alerts',
      role: 'authenticated',
      action: 'DELETE',
      expression: `user_id = current_setting('app.current_user_id')::uuid`,
      description: 'Users can only delete their own alerts',
    },

    // ============ LISTINGS TABLE ============
    {
      name: 'listings_select_org',
      table: 'listings',
      role: 'authenticated',
      action: 'SELECT',
      expression: `
        property_id IN (
          SELECT id FROM properties 
          WHERE organization_id = current_setting('app.current_organization_id')::uuid
        )
      `,
      description: 'Users see listings for their org properties',
    },
    {
      name: 'listings_insert_org',
      table: 'listings',
      role: 'authenticated',
      action: 'INSERT',
      expression: `
        property_id IN (
          SELECT id FROM properties 
          WHERE organization_id = current_setting('app.current_organization_id')::uuid
        )
      `,
      description: 'Users can create listings for their org properties',
    },
  ];

  /**
   * Generate SQL to enable RLS on a table
   *
   * @example
   * const sql = this.generateEnableRLSSQL('properties');
   * // Outputs: ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
   */
  generateEnableRLSSQL(tableName: string): string {
    return `ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;`;
  }

  /**
   * Generate SQL to disable RLS on a table (for migrations/testing)
   */
  generateDisableRLSSQL(tableName: string): string {
    return `ALTER TABLE ${tableName} DISABLE ROW LEVEL SECURITY;`;
  }

  /**
   * Generate SQL to create a single RLS policy
   *
   * @example
   * const sql = this.generateCreatePolicySQL(policy);
   * // Outputs full CREATE POLICY statement
   */
  generateCreatePolicySQL(policy: RLSPolicy): string {
    return `
      CREATE POLICY ${policy.name} ON ${policy.table}
      FOR ${policy.action}
      TO ${policy.role}
      USING (${policy.expression})
      ${policy.action === 'INSERT' || policy.action === 'ALL' ? `WITH CHECK (${policy.expression})` : ''}
    `.trim();
  }

  /**
   * Generate SQL to drop a policy
   */
  generateDropPolicySQL(policyName: string, tableName: string): string {
    return `DROP POLICY IF EXISTS ${policyName} ON ${tableName};`;
  }

  /**
   * Generate all RLS setup SQL commands
   * This creates all policies for the application
   *
   * @returns Array of SQL commands to execute
   */
  generateAllRLSSetupSQL(): string[] {
    const commands: string[] = [];

    // Get unique tables
    const tables = [...new Set(this.rlsPolicies.map((p) => p.table))];

    // Enable RLS on all tables
    for (const table of tables) {
      commands.push(this.generateEnableRLSSQL(table));
    }

    // Create all policies
    for (const policy of this.rlsPolicies) {
      commands.push(this.generateCreatePolicySQL(policy));
    }

    return commands;
  }

  /**
   * Generate migration SQL for enabling RLS
   * Creates a Prisma migration file
   *
   * @returns Migration SQL as string
   */
  generateMigrationSQL(): string {
    const commands = this.generateAllRLSSetupSQL();

    return `-- Enable Row-Level Security on all tables
-- This ensures users only see their organization's data

${commands.join('\n\n')}

-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
`;
  }

  /**
   * Get policies for a specific table
   */
  getPoliciesForTable(tableName: string): RLSPolicy[] {
    return this.rlsPolicies.filter((p) => p.table === tableName);
  }

  /**
   * Get all RLS policies
   */
  getAllPolicies(): RLSPolicy[] {
    return this.rlsPolicies;
  }

  /**
   * Get detailed policy documentation
   */
  getPolicyDocumentation(): Record<string, RLSPolicy[]> {
    const grouped: Record<string, RLSPolicy[]> = {};

    for (const policy of this.rlsPolicies) {
      if (!grouped[policy.table]) {
        grouped[policy.table] = [];
      }
      grouped[policy.table].push(policy);
    }

    return grouped;
  }

  /**
   * Validate RLS context (check if all required settings are present)
   */
  validateRLSContext(context: TenantContext): boolean {
    return (
      !!context.userId &&
      !!context.organizationId &&
      context.roles.length > 0
    );
  }

  /**
   * Generate SQL to set RLS context variables
   * Should be called at the start of each request
   *
   * @example
   * const sql = this.generateSetContextSQL(context);
   * // Returns: SET app.current_user_id = '...'; SET app.current_organization_id = '...';
   */
  generateSetContextSQL(context: TenantContext): string[] {
    return [
      `SET app.current_user_id = '${context.userId}'`,
      `SET app.current_organization_id = '${context.organizationId}'`,
      `SET app.current_user_role = '${context.roles[0]}'`,
    ];
  }

  /**
   * Generate SQL to reset RLS context
   * Should be called at the end of each request
   */
  generateResetContextSQL(): string[] {
    return [
      `RESET app.current_user_id`,
      `RESET app.current_organization_id`,
      `RESET app.current_user_role`,
    ];
  }

  /**
   * Log RLS policy information for debugging/auditing
   */
  logPolicyInfo(tableName: string): void {
    const policies = this.getPoliciesForTable(tableName);

    this.logger.log(`RLS Policies for table '${tableName}':`);
    policies.forEach((policy) => {
      this.logger.debug(
        `  - [${policy.action}] ${policy.name}: ${policy.description}`
      );
    });
  }

  /**
   * Get RLS status summary
   */
  getStatus(): Record<string, any> {
    const tables = [...new Set(this.rlsPolicies.map((p) => p.table))];

    return {
      totalPolicies: this.rlsPolicies.length,
      protectedTables: tables.length,
      tables: tables,
      policyCount: {
        SELECT: this.rlsPolicies.filter((p) => p.action === 'SELECT').length,
        INSERT: this.rlsPolicies.filter((p) => p.action === 'INSERT').length,
        UPDATE: this.rlsPolicies.filter((p) => p.action === 'UPDATE').length,
        DELETE: this.rlsPolicies.filter((p) => p.action === 'DELETE').length,
      },
    };
  }
}

/**
 * Tenant context holder for current request
 * Thread-safe context for RLS
 */
export class TenantContextHolder {
  private static context: TenantContext | null = null;

  static setContext(context: TenantContext): void {
    this.context = context;
  }

  static getContext(): TenantContext | null {
    return this.context;
  }

  static clear(): void {
    this.context = null;
  }

  static isSet(): boolean {
    return this.context !== null;
  }
}
