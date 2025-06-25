// Shared time-unit helpers
export const MILLISECOND = 1;
export const SECOND_MS   = 1_000 * MILLISECOND;
export const MINUTE_MS   = 60   * SECOND_MS;
export const HOUR_MS     = 60   * MINUTE_MS;

export const seconds = (n: number): number => n * SECOND_MS;
export const minutes = (n: number): number => n * MINUTE_MS; 