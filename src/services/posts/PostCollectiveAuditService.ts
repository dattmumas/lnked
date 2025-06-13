import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import type { Database } from '@/lib/database.types';
import { 
  PostCollectiveError
} from '@/types/enhanced-database.types';

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
  async logOperation(
    operation: string,
    postId: string,
    collectiveIds: string[],
    userId: string,
    success: boolean,
    error?: PostCollectiveError,
    metadata?: Record<string, unknown>
  ): Promise<void> {
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
      } : null,
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
      user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server',
      session_id: this.generateSessionId()
    };

    try {
      // Store in local storage for immediate access
      this.storeLocalLog(logEntry);

      // Send to analytics if operation was successful
      if (success) {
        await this.trackSuccessMetrics(operation, collectiveIds.length, userId);
      } else {
        await this.trackErrorMetrics(operation, error, userId);
      }

      console.info(`[PostCollectiveAudit] ${operation}:`, logEntry);
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
      if (duration > 2000) { // Operations taking more than 2 seconds
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

      return (auditEntries as unknown) as PostCollectiveAuditEntry[] || [];
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
        .limit(100); // Limit to recent entries

      if (error) {
        console.error('Error fetching collective audit log:', error);
        return [];
      }

      return (auditEntries as unknown) as PostCollectiveAuditEntry[] || [];
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
    const slowOperations = this.performanceMetrics.filter(m => m.duration_ms > 2000).length;

    const errorsByType: Record<string, number> = {};
    this.performanceMetrics
      .filter(m => !m.success && m.error)
      .forEach(m => {
        const errorType = m.error!.split(':')[0]; // Get error type from message
        errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
      });

    return {
      averageDuration: Math.round(totalDuration / total),
      successRate: Math.round((successful / total) * 100),
      totalOperations: total,
      slowOperations,
      errorsByType
    };
  }

  /**
   * Generate analytics report for post-collective usage
   */
  async generateAnalyticsReport(): Promise<PostCollectiveAnalytics | null> {
    try {
      // Note: These queries will work once the post_collectives table exists
      const [multiCollectivePostsResult, collectivePopularityResult] = await Promise.allSettled([
        this.supabase
          .from('post_collectives')
          .select('post_id')
          .not('post_id', 'is', null),
        
        this.supabase
          .from('post_collectives')
          .select(`
            collective_id,
            collectives!inner(name)
          `)
          .not('collective_id', 'is', null)
      ]);

      const analytics: PostCollectiveAnalytics = {
        total_multi_collective_posts: 0,
        avg_collectives_per_post: 0,
        most_popular_collectives: [],
        user_activity: []
      };

      // Process multi-collective posts data
      if (multiCollectivePostsResult.status === 'fulfilled' && multiCollectivePostsResult.value.data) {
        const postCollectiveData = multiCollectivePostsResult.value.data as unknown as DBPostCollectiveRow[];
        const uniquePosts = new Set(postCollectiveData.map((pc) => pc.post_id));
        analytics.total_multi_collective_posts = uniquePosts.size;
        analytics.avg_collectives_per_post = uniquePosts.size > 0 
          ? Math.round((postCollectiveData.length / uniquePosts.size) * 100) / 100 
          : 0;
      }

      // Process collective popularity data
      if (collectivePopularityResult.status === 'fulfilled' && collectivePopularityResult.value.data) {
        const collectiveData = collectivePopularityResult.value.data as unknown as (DBPostCollectiveRow & { collectives?: { name?: string } })[];
        const collectiveCounts = new Map<string, { name: string; count: number }>();

        collectiveData.forEach((pc) => {
          const existing = collectiveCounts.get(pc.collective_id);
          if (existing) {
            existing.count++;
          } else {
            collectiveCounts.set(pc.collective_id, {
              name: pc.collectives?.name || 'Unknown',
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
          .slice(0, 10); // Top 10
      }

      return analytics;
    } catch (error) {
      console.error('Error generating analytics report:', error);
      return null;
    }
  }

  /**
   * Track successful operation metrics
   */
  private async trackSuccessMetrics(
    operation: string,
    collectiveCount: number,
    userId: string
  ): Promise<void> {
    // Store success metrics (could be sent to analytics service)
    const successMetric = {
      operation,
      collective_count: collectiveCount,
      user_id: userId,
      timestamp: new Date().toISOString(),
      success: true
    };

    // In a real application, this might be sent to an analytics service
    console.info(`[PostCollectiveMetrics] Success:`, successMetric);
  }

  /**
   * Track error metrics
   */
  private async trackErrorMetrics(
    operation: string,
    error?: PostCollectiveError,
    userId?: string
  ): Promise<void> {
    const errorMetric = {
      operation,
      error_type: error?.type,
      error_message: error?.message,
      collective_id: error?.collective_id,
      user_id: userId,
      timestamp: new Date().toISOString(),
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
      const existingLogs = JSON.parse(
        localStorage.getItem('post_collective_logs') || '[]'
      );
      
      existingLogs.unshift(logEntry);
      
      // Keep only the most recent 100 entries
      const trimmedLogs = existingLogs.slice(0, 100);
      
      localStorage.setItem('post_collective_logs', JSON.stringify(trimmedLogs));
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
      return JSON.parse(localStorage.getItem('post_collective_logs') || '[]');
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
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up old performance metrics to prevent memory leaks
   */
  private cleanupOldMetrics(): void {
    const maxMetrics = 1000;
    if (this.performanceMetrics.length > maxMetrics) {
      this.performanceMetrics = this.performanceMetrics.slice(0, maxMetrics);
    }
  }

  /**
   * Export performance metrics for analysis
   */
  exportMetrics(): string {
    return JSON.stringify({
      summary: this.getPerformanceMetrics(),
      detailed_metrics: this.performanceMetrics,
      local_logs: this.getLocalLogs(),
      export_timestamp: new Date().toISOString()
    }, null, 2);
  }

  /**
   * Monitor system health and alert on issues
   */
  async checkSystemHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  }> {
    const metrics = this.getPerformanceMetrics();
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check success rate
    if (metrics.successRate < 95) {
      issues.push(`Low success rate: ${metrics.successRate}%`);
      recommendations.push('Review error logs and fix common failure points');
    }

    // Check average performance
    if (metrics.averageDuration > 1500) {
      issues.push(`Slow average response: ${metrics.averageDuration}ms`);
      recommendations.push('Optimize database queries and consider caching');
    }

    // Check for high error rates
    const totalErrors = Object.values(metrics.errorsByType).reduce((sum, count) => sum + count, 0);
    if (totalErrors > metrics.totalOperations * 0.1) {
      issues.push(`High error rate: ${totalErrors} errors in ${metrics.totalOperations} operations`);
      recommendations.push('Investigate most common error types and implement fixes');
    }

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (issues.length > 0) {
      status = issues.length > 2 ? 'critical' : 'warning';
    }

    return { status, issues, recommendations };
  }
}

// Export singleton instance
export const postCollectiveAuditService = new PostCollectiveAuditService(); 