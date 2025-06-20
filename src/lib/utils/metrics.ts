/**
 * Metrics collection utility for API endpoints
 * Provides observability for performance and error tracking
 */

// Constants for histogram buckets and calculations
const HISTOGRAM_BUCKET_1MS = 1;
const HISTOGRAM_BUCKET_5MS = 5;
const HISTOGRAM_BUCKET_10MS = 10;
const HISTOGRAM_BUCKET_25MS = 25;
const HISTOGRAM_BUCKET_50MS = 50;
const HISTOGRAM_BUCKET_100MS = 100;
const HISTOGRAM_BUCKET_250MS = 250;
const HISTOGRAM_BUCKET_500MS = 500;
const HISTOGRAM_BUCKET_1S = 1000;
const HISTOGRAM_BUCKET_2_5S = 2500;
const HISTOGRAM_BUCKET_5S = 5000;
const HISTOGRAM_BUCKET_10S = 10000;
const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1000;
const HTTP_CLIENT_ERROR_THRESHOLD = 400;
const USER_ID_ANONYMIZATION_LENGTH = 8;

interface MetricData {
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  userId?: string;
  error?: string;
}

interface HistogramBucket {
  le: number; // Less than or equal to
  count: number;
}

interface CounterMetric {
  name: string;
  value: number;
  labels: Record<string, string>;
  timestamp: Date;
}

interface HistogramMetric {
  name: string;
  buckets: HistogramBucket[];
  sum: number;
  count: number;
  labels: Record<string, string>;
  timestamp: Date;
}

/**
 * In-memory metrics store (consider Redis/Prometheus for production)
 */
class MetricsStore {
  private counters = new Map<string, CounterMetric>();
  private histograms = new Map<string, HistogramMetric>();
  
  // Standard histogram buckets (milliseconds)
  private readonly DURATION_BUCKETS = [
    HISTOGRAM_BUCKET_1MS, 
    HISTOGRAM_BUCKET_5MS, 
    HISTOGRAM_BUCKET_10MS, 
    HISTOGRAM_BUCKET_25MS, 
    HISTOGRAM_BUCKET_50MS, 
    HISTOGRAM_BUCKET_100MS, 
    HISTOGRAM_BUCKET_250MS, 
    HISTOGRAM_BUCKET_500MS, 
    HISTOGRAM_BUCKET_1S, 
    HISTOGRAM_BUCKET_2_5S, 
    HISTOGRAM_BUCKET_5S, 
    HISTOGRAM_BUCKET_10S, 
    Infinity
  ];
  
  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, labels: Record<string, string> = {}): void {
    const key = this.getMetricKey(name, labels);
    const existing = this.counters.get(key);
    
    if (existing) {
      existing.value += 1;
      existing.timestamp = new Date();
    } else {
      this.counters.set(key, {
        name,
        value: 1,
        labels,
        timestamp: new Date(),
      });
    }
  }
  
  /**
   * Record a histogram value
   */
  recordHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.getMetricKey(name, labels);
    const existing = this.histograms.get(key);
    
    if (existing) {
      // Update existing histogram
      existing.sum += value;
      existing.count += 1;
      existing.timestamp = new Date();
      
      // Update buckets
      for (const bucket of existing.buckets) {
        if (value <= bucket.le) {
          bucket.count += 1;
        }
      }
    } else {
      // Create new histogram
      const buckets: HistogramBucket[] = this.DURATION_BUCKETS.map(le => ({
        le,
        count: value <= le ? 1 : 0,
      }));
      
      this.histograms.set(key, {
        name,
        buckets,
        sum: value,
        count: 1,
        labels,
        timestamp: new Date(),
      });
    }
  }
  
  /**
   * Get all metrics in Prometheus format
   */
  getMetrics(): string {
    const lines: string[] = [];
    
    // Export counters
    for (const [, metric] of this.counters) {
      const labelStr = this.formatLabels(metric.labels);
      lines.push(`${metric.name}${labelStr} ${metric.value}`);
    }
    
    // Export histograms
    for (const [, metric] of this.histograms) {
      const labelStr = this.formatLabels(metric.labels);
      
      // Histogram buckets
      for (const bucket of metric.buckets) {
        const bucketLabels = { ...metric.labels, le: bucket.le.toString() };
        const bucketLabelStr = this.formatLabels(bucketLabels);
        lines.push(`${metric.name}_bucket${bucketLabelStr} ${bucket.count}`);
      }
      
      // Histogram sum and count
      lines.push(`${metric.name}_sum${labelStr} ${metric.sum}`);
      lines.push(`${metric.name}_count${labelStr} ${metric.count}`);
    }
    
    return lines.join('\n');
  }
  
  /**
   * Clear old metrics (cleanup)
   */
  cleanup(olderThanMs: number = HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND): void {
    const cutoff = new Date(Date.now() - olderThanMs);
    
    for (const [key, metric] of this.counters) {
      if (metric.timestamp < cutoff) {
        this.counters.delete(key);
      }
    }
    
    for (const [key, metric] of this.histograms) {
      if (metric.timestamp < cutoff) {
        this.histograms.delete(key);
      }
    }
  }
  
  private getMetricKey(name: string, labels: Record<string, string>): string {
    const labelPairs = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    
    return `${name}{${labelPairs}}`;
  }
  
  private formatLabels(labels: Record<string, string>): string {
    if (Object.keys(labels).length === 0) return '';
    
    const labelPairs = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    
    return `{${labelPairs}}`;
  }
}

// Global metrics store
const metricsStore = new MetricsStore();

/**
 * Record API request metrics
 */
export function recordAPIMetrics(data: MetricData): void {
  const baseLabels = {
    endpoint: data.endpoint,
    method: data.method,
    status_code: data.statusCode.toString(),
  };
  
  // Record request count
  metricsStore.incrementCounter('notifications_api_requests_total', baseLabels);
  
  // Record duration
  metricsStore.recordHistogram('notifications_api_duration_ms', data.duration, baseLabels);
  
  // Record errors
  if (data.statusCode >= HTTP_CLIENT_ERROR_THRESHOLD) {
    const errorLabels: Record<string, string> = { ...baseLabels };
    if (data.error !== null && data.error !== undefined) {
      errorLabels.error_type = data.error;
    }
    metricsStore.incrementCounter('notifications_api_errors_total', errorLabels);
  }
  
  // User-specific metrics (if available)
  if (data.userId !== null && data.userId !== undefined) {
    metricsStore.incrementCounter('notifications_api_user_requests_total', {
      user_id: data.userId.slice(0, USER_ID_ANONYMIZATION_LENGTH), // Anonymized
    });
  }
}

/**
 * Create a metrics timer
 */
export function createMetricsTimer(): () => number {
  const start = performance.now();
  return () => performance.now() - start;
}

/**
 * Get metrics in Prometheus format
 */
export function getMetrics(): string {
  return metricsStore.getMetrics();
}

/**
 * Cleanup old metrics
 */
export function cleanupMetrics(): void {
  metricsStore.cleanup();
}

/**
 * Middleware to automatically record metrics
 */
export function withMetrics<T extends (...args: unknown[]) => Promise<Response>>(
  handler: T,
  endpoint: string
): T {
  return (async (...args: Parameters<T>): Promise<Response> => {
    const timer = createMetricsTimer();
    const request = args[0] as Request;
    let response: Response;
    let error: string | undefined;
    
    try {
      response = await handler(...args);
    } catch (err) {
      error = err instanceof Error ? err.name : 'UnknownError';
      response = new Response('Internal Server Error', { status: 500 });
    }
    
    const duration = timer();
    
    recordAPIMetrics({
      endpoint,
      method: request.method,
      statusCode: response.status,
      duration,
      error,
    });
    
    return response;
  }) as T;
} 