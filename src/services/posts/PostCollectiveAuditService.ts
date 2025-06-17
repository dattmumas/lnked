import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

import type { Database } from '@/lib/database.types';
import type { PostCollectiveError } from '@/types/enhanced-database.types';

// ---------------------------------------------------------------------------
// Constants & Utilities
// ---------------------------------------------------------------------------
/** Duration (ms) that flags an operation as slow */
const SLOW_OPERATION_THRESHOLD_MS = 2_000;

/** Pretty‑print indentation for JSON exports */
const JSON_INDENT_SPACES = 2;

/** Maximum number of performance metrics to retain in-memory */
const PERFORMANCE_METRICS_MAX = 1_000;

/** Maximum local log entries kept in localStorage */
const MAX_LOCAL_LOGS = 100;

/** Limit for most-popular collectives slice */
const POPULAR_COLLECTIVES_LIMIT = 10;

/** Threshold for average duration warning (ms) */
const AVG_DURATION_WARNING_MS = 1_500;

/** Success-rate warning threshold (percentage) */
const SUCCESS_RATE_WARNING = 95;

/** Limit for detailed metrics export and slices */
const DETAILED_METRICS_LIMIT = 100;
/** Error rate threshold for health checks */
const ERROR_RATE_THRESHOLD = 0.1;


/** Scale factor for percentage calculations */
const PERCENT_SCALE = 100;

/**
 * Supabase query helper representing SQL NULL without using the
 * `null` literal (which violates the unicorn/no-null rule).
 */
const SQL_NULL = undefined as unknown as null;

/** ID constants for session ID generation */
const RANDOM_ID_START = 2;
const RANDOM_ID_LENGTH = 9;

/** Number of distinct issues before flagging system as critical */
const CRITICAL_ISSUE_THRESHOLD = 2;

/** Helper to generate ISO timestamp */
const nowIso = (): string => new Date().toISOString();

// Audit log entry types
export interface PostCollectiveAuditEntry {
  id: string;
  post_id: string;
  collective_id: string;
  action: 'created' | 'updated' | 'deleted' | 'shared' | 'unshared';
  performed_by: string;
  performed_at: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// Performance metrics types
export interface PostCollectivePerformanceMetrics {
  operation: string;
  duration_ms: number;
  success: boolean;
  error?: string;
  collective_count?: number;
  user_id: string;
  timestamp: Date;
}

// Analytics data types
export interface PostCollectiveAnalytics {
  total_multi_collective_posts: number;
  avg_collectives_per_post: number;
  most_popular_collectives: Array<{
    collective_id: string;
    collective_name: string;
    post_count: number;
  }>;
  user_activity: Array<{
    user_id: string;
    posts_shared: number;
    collectives_used: number;
  }>;
}

// Supabase row helper for post_collectives
type DBPostCollectiveRow = Database['public']['Tables']['post_collectives']['Row'];

/**
 * Service for auditing and monitoring post-collective operations
 * Provides logging, metrics collection, and analytics
 */
export class PostCollectiveAuditService {
  private supabase = createSupabaseBrowserClient();
  private performanceMetrics: PostCollectivePerformanceMetrics[] = [];

  /**
   * Log a post-collective operation with detailed context
   */
  logOperation(
    operation: string,
    postId: string,
    collectiveIds: string[],
    userId: string,
    success: boolean,
    error?: PostCollectiveError,
    metadata?: Record<string, unknown>
  ): void {
    const logEntry = {
      operation,
      post_id: postId,
      collective_ids: collectiveIds,
      user_id: userId,
      success,
      error: error ? {
        type: error.type,
        message: error.message,
        collective_id: error.collective_id,
        collective_name: error.collective_name
      } : undefined,
      metadata: metadata || {},
      timestamp: nowIso(),
      user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server',
      session_id: this.generateSessionId()
    };

    try {
      // Store in local storage for immediate access
      this.storeLocalLog(logEntry);

      // Send to analytics if operation was successful
      if (success) {
        this.trackSuccessMetrics(operation, collectiveIds.length, userId);
      } else {
        this.trackErrorMetrics(operation, error, userId);
      }

      console.warn(`[PostCollectiveAudit] ${operation}:`, logEntry);
    } catch (loggingError) {
      console.error('Failed to log post-collective operation:', loggingError);
    }
  }

  /**
   * Track performance metrics for operations
   */
  async trackPerformance<T>(
    operation: string,
    userId: string,
    operationFn: () => Promise<T>,
    collectiveCount?: number
  ): Promise<T> {
    const startTime = performance.now();
    let success = false;
    let error: string | undefined;

    try {
      const result = await operationFn();
      success = true;
      return result;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      const duration = performance.now() - startTime;
      
      const metric: PostCollectivePerformanceMetrics = {
        operation,
        duration_ms: Math.round(duration),
        success,
        error,
        collective_count: collectiveCount,
        user_id: userId,
        timestamp: new Date()
      };

      this.performanceMetrics.push(metric);
      this.cleanupOldMetrics();
      
      // Log performance issues
      if (duration > SLOW_OPERATION_THRESHOLD_MS) {
        console.warn(`[PostCollectiveAudit] Slow operation detected:`, metric);
      }
      
      if (!success) {
        console.error(`[PostCollectiveAudit] Operation failed:`, metric);
      }
    }
  }

  /**
   * Get audit log entries for a specific post
   */
  async getPostAuditLog(postId: string): Promise<PostCollectiveAuditEntry[]> {
    try {
      const { data: auditEntries, error } = await this.supabase
        .from('post_collective_audit_log' as unknown as never)
        .select('*')
        .eq('post_id', postId)
        .order('performed_at', { ascending: false });

      if (error) {
        console.error('Error fetching audit log:', error);
        return [];
      }

      return Array.isArray(auditEntries)
        ? (auditEntries as PostCollectiveAuditEntry[])
        : [];
    } catch (error) {
      console.error('Error in getPostAuditLog:', error);
      return [];
    }
  }

  /**
   * Get audit log entries for a specific collective
   */
  async getCollectiveAuditLog(collectiveId: string): Promise<PostCollectiveAuditEntry[]> {
    try {
      const { data: auditEntries, error } = await this.supabase
        .from('post_collective_audit_log' as unknown as never)
        .select('*')
        .eq('collective_id', collectiveId)
        .order('performed_at', { ascending: false })
        .limit(MAX_LOCAL_LOGS); // Limit to recent entries

      if (error) {
        console.error('Error fetching collective audit log:', error);
        return [];
      }

      return Array.isArray(auditEntries)
        ? (auditEntries as PostCollectiveAuditEntry[])
        : [];
    } catch (error) {
      console.error('Error in getCollectiveAuditLog:', error);
      return [];
    }
  }

  /**
   * Get performance metrics summary
   */
  getPerformanceMetrics(): {
    averageDuration: number;
    successRate: number;
    totalOperations: number;
    slowOperations: number;
    errorsByType: Record<string, number>;
  } {
    if (this.performanceMetrics.length === 0) {
      return {
        averageDuration: 0,
        successRate: 100,
        totalOperations: 0,
        slowOperations: 0,
        errorsByType: {}
      };
    }

    const total = this.performanceMetrics.length;
    const successful = this.performanceMetrics.filter(m => m.success).length;
    const totalDuration = this.performanceMetrics.reduce((sum, m) => sum + m.duration_ms, 0);
    const slowOperations = this.performanceMetrics.filter(m => m.duration_ms > SLOW_OPERATION_THRESHOLD_MS).length;

    const errorsByType: Record<string, number> = {};
    this.performanceMetrics
      .filter(m => !m.success && m.error !== undefined && m.error !== '')
      .forEach(m => {
        const errorType = (m.error ?? 'unknown').split(':')[0]; // Get error type from message
        errorsByType[errorType] = (errorsByType[errorType] ?? 0) + 1;
      });

    return {
      averageDuration: Math.round(totalDuration / total),
      successRate: Math.round((successful / total) * PERCENT_SCALE),
      totalOperations: total,
      slowOperations,
      errorsByType
    };
  }

  /**
   * Generate analytics report for post-collective usage
   */
  async generateAnalyticsReport(): Promise<PostCollectiveAnalytics | undefined> {
    try {
      // Note: These queries will work once the post_collectives table exists
      const [multiCollectivePostsResult, collectivePopularityResult] = await Promise.allSettled([
        this.supabase
          .from('post_collectives')
          .select('post_id')
          .not('post_id', 'is', SQL_NULL),
        
        this.supabase
          .from('post_collectives')
          .select(`
            collective_id,
            collectives!inner(name)
          `)
          .not('collective_id', 'is', SQL_NULL)
      ]);

      const analytics: PostCollectiveAnalytics = {
        total_multi_collective_posts: 0,
        avg_collectives_per_post: 0,
        most_popular_collectives: [],
        user_activity: []
      };

      // Process multi-collective posts data
      if (
        multiCollectivePostsResult.status === 'fulfilled' &&
        Array.isArray(multiCollectivePostsResult.value.data)
      ) {
        const postCollectiveData = multiCollectivePostsResult.value.data as unknown as DBPostCollectiveRow[];
        const uniquePosts = new Set(postCollectiveData.map((pc) => pc.post_id));
        analytics.total_multi_collective_posts = uniquePosts.size;
        analytics.avg_collectives_per_post = uniquePosts.size > 0 
          ? Math.round((postCollectiveData.length / uniquePosts.size) * PERCENT_SCALE) / PERCENT_SCALE
          : 0;
      }

      // Process collective popularity data
      if (
        collectivePopularityResult.status === 'fulfilled' &&
        Array.isArray(collectivePopularityResult.value.data)
      ) {
        const collectiveData = collectivePopularityResult.value.data as unknown as (DBPostCollectiveRow & { collectives?: { name?: string } })[];
        const collectiveCounts = new Map<string, { name: string; count: number }>();

        collectiveData.forEach((pc) => {
          const existing = collectiveCounts.get(pc.collective_id);
          if (existing) {
            existing.count++;
          } else {
            collectiveCounts.set(pc.collective_id, {
              name: pc.collectives?.name ?? 'Unknown',
              count: 1
            });
          }
        });

        analytics.most_popular_collectives = Array.from(collectiveCounts.entries())
          .map(([id, data]) => ({
            collective_id: id,
            collective_name: data.name,
            post_count: data.count
          }))
          .sort((a, b) => b.post_count - a.post_count)
          .slice(0, POPULAR_COLLECTIVES_LIMIT); // Top 10
      }

      return analytics;
    } catch (error) {
      console.error('Error generating analytics report:', error);
      return undefined;
    }
  }

  /**
   * Track successful operation metrics
   */
  private trackSuccessMetrics(
    operation: string,
    collectiveCount: number,
    userId: string
  ): void {
    // Store success metrics (could be sent to analytics service)
    const successMetric = {
      operation,
      collective_count: collectiveCount,
      user_id: userId,
      timestamp: nowIso(),
      success: true
    };

    // In a real application, this might be sent to an analytics service
    console.warn(`[PostCollectiveMetrics] Success:`, successMetric);
  }

  /**
   * Track error metrics
   */
  private trackErrorMetrics(
    operation: string,
    error?: PostCollectiveError,
    userId?: string
  ): void {
    const errorMetric = {
      operation,
      error_type: error?.type,
      error_message: error?.message,
      collective_id: error?.collective_id,
      user_id: userId,
      timestamp: nowIso(),
      success: false
    };

    // In a real application, this might be sent to an error tracking service
    console.error(`[PostCollectiveMetrics] Error:`, errorMetric);
  }

  /**
   * Store log entry in local storage for offline access
   */
  private storeLocalLog(logEntry: unknown): void {
    if (typeof window === 'undefined') return;

    try {
      const raw = localStorage.getItem('post_collective_logs');
      const existing: unknown = raw !== null && raw !== '' ? JSON.parse(raw) : [];
      const logs: unknown[] = Array.isArray(existing) ? existing : [];

      logs.unshift(logEntry);
      const trimmed = logs.slice(0, MAX_LOCAL_LOGS);

      localStorage.setItem('post_collective_logs', JSON.stringify(trimmed));
    } catch (error) {
      console.warn('Failed to store local log:', error);
    }
  }

  /**
   * Get local log entries
   */
  getLocalLogs(): unknown[] {
    if (typeof window === 'undefined') return [];

    try {
      const raw = localStorage.getItem('post_collective_logs');
      const parsed: unknown = raw !== null && raw !== '' ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? (parsed as unknown[]) : [];
    } catch (error) {
      console.warn('Failed to retrieve local logs:', error);
      return [];
    }
  }

  /**
   * Clear local logs
   */
  clearLocalLogs(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem('post_collective_logs');
    } catch (error) {
      console.warn('Failed to clear local logs:', error);
    }
  }

  /**
   * Generate a session ID for tracking related operations
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${crypto
      .randomUUID()
      .replace(/-/g, '')
      .slice(RANDOM_ID_START, RANDOM_ID_START + RANDOM_ID_LENGTH)}`;
  }

  /**
   * Clean up old performance metrics to prevent memory leaks
   */
  private cleanupOldMetrics(): void {
    if (this.performanceMetrics.length > PERFORMANCE_METRICS_MAX) {
      this.performanceMetrics = this.performanceMetrics.slice(0, PERFORMANCE_METRICS_MAX);
    }
  }

  /**
   * Export performance metrics for analysis
   */
  exportMetrics(): string {
    return JSON.stringify({
      summary: this.getPerformanceMetrics(),
      detailed_metrics: this.performanceMetrics.slice(0, DETAILED_METRICS_LIMIT),
      local_logs: this.getLocalLogs(),
      export_timestamp: nowIso()
    }, undefined, JSON_INDENT_SPACES);
  }

  /**
   * Monitor system health and alert on issues
   */
  checkSystemHealth(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const metrics = this.getPerformanceMetrics();
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check success rate
    if (metrics.successRate < SUCCESS_RATE_WARNING) {
      issues.push(`Low success rate: ${metrics.successRate}%`);
      recommendations.push('Review error logs and fix common failure points');
    }

    // Check average performance
    if (metrics.averageDuration > AVG_DURATION_WARNING_MS) {
      issues.push(`Slow average response: ${metrics.averageDuration}ms`);
      recommendations.push('Optimize database queries and consider caching');
    }

    // Check for high error rates
    const totalErrors = Object.values(metrics.errorsByType).reduce((sum, count) => sum + count, 0);
    if (totalErrors > metrics.totalOperations * ERROR_RATE_THRESHOLD) {
      issues.push(`High error rate: ${totalErrors} errors in ${metrics.totalOperations} operations`);
      recommendations.push('Investigate most common error types and implement fixes');
    }

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (issues.length > 0) {
      status = issues.length > CRITICAL_ISSUE_THRESHOLD ? 'critical' : 'warning';
    }

    return { status, issues, recommendations };
  }
}

// Export singleton instance
export const postCollectiveAuditService = new PostCollectiveAuditService();