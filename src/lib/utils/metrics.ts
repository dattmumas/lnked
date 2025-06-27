// Browser-compatible performance API (works in both Node.js 16+ and browsers)
const getPerformance = (): Performance => {
  // In browsers, performance is available globally
  if (typeof window !== 'undefined' && window.performance) {
    return window.performance;
  }
  
  // In Node.js 16+, performance is available globally
  if (typeof globalThis !== 'undefined' && globalThis.performance) {
    return globalThis.performance;
  }
  
  // Ultimate fallback using Date.now() for environments without performance API
  return {
    now: () => Date.now(),
    timeOrigin: Date.now(),
    toJSON: () => ({}),
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
    clearMarks: () => {},
    clearMeasures: () => {},
    clearResourceTimings: () => {},
    getEntries: () => [],
    getEntriesByName: () => [],
    getEntriesByType: () => [],
    mark: () => {},
    measure: () => {},
    setResourceTimingBufferSize: () => {},
  } as unknown as Performance;
};

// Centralized interface for API metrics
interface APIMetrics {
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  userId?: string;
  error?: string;
}

// In-memory store for metrics (replace with a real time-series DB in production)
const metricsStore: APIMetrics[] = [];

/**
 * Creates a high-resolution timer.
 * @returns A function that, when called, returns the elapsed time in milliseconds.
 */
export function createMetricsTimer(): () => number {
  const performance = getPerformance();
  const start = performance.now();
  return () => performance.now() - start;
}

/**
 * Records an API metric. In a real application, this would send data
 * to a monitoring service like DataDog, Prometheus, or a time-series database.
 * @param {APIMetrics} metrics - The metric data to record.
 */
export function recordAPIMetrics(metrics: APIMetrics): void {
  // For demonstration, we'll just log it and store it in memory.
  // In production, this should be an async call to a metrics service.
  // eslint-disable-next-line no-console
  console.log(`[METRICS] ${metrics.method} ${metrics.endpoint} - ${metrics.statusCode} in ${metrics.duration.toFixed(2)}ms`);
  metricsStore.push(metrics);

  // Simple store cleanup to prevent memory leaks in a long-running process
  if (metricsStore.length > 10000) {
    metricsStore.splice(0, metricsStore.length - 5000);
  }
}

/**
 * Retrieves the last N recorded metrics. (For debugging/demonstration)
 * @param {number} [limit=100] - The number of recent metrics to retrieve.
 * @returns {APIMetrics[]} An array of the most recent metrics.
 */
export function getRecentMetrics(limit = 100): APIMetrics[] {
  return metricsStore.slice(-limit);
} 