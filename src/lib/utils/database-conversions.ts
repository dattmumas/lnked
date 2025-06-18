/**
 * Database Conversion Utilities
 * 
 * These utilities handle the conversion between database null values 
 * and application undefined values at the data access boundary.
 */

/**
 * Converts null values to undefined in an object.
 * Used when reading from database to convert to app types.
 */
export function nullToUndefined<T extends Record<string, unknown>>(
  obj: T | null
): { [K in keyof T]: T[K] extends null ? undefined : T[K] } | undefined {
  if (obj === null) {
    return undefined;
  }

  return Object.fromEntries(
    (Object.entries(obj) as Array<[keyof T, T[keyof T]]>).map(([key, value]) => [
      key,
      value === null ? undefined : value
    ])
  ) as { [K in keyof T]: T[K] extends null ? undefined : T[K] };
}

/**
 * Converts undefined values to null in an object.
 * Used when writing to database to convert from app types.
 */
export function undefinedToNull<T extends Record<string, unknown>>(
  obj: T | undefined
): { [K in keyof T]: T[K] extends undefined ? null : T[K] } | null {
  if (obj === undefined) {
    return null;
  }

  return Object.fromEntries(
    (Object.entries(obj) as Array<[keyof T, T[keyof T]]>).map(([key, value]) => [
      key,
      value === undefined ? null : value
    ])
  ) as { [K in keyof T]: T[K] extends undefined ? null : T[K] };
}

/**
 * Type helper for nullable database fields
 */
export type DatabaseNullable<T> = T | null;

/**
 * Type helper for optional application fields  
 */
export type AppOptional<T> = T | undefined;

/**
 * Converts a database record type to application type
 */
export type DatabaseToApp<T> = {
  [K in keyof T]: T[K] extends null ? undefined : T[K] extends DatabaseNullable<infer U> ? AppOptional<U> : T[K];
};

/**
 * Converts an application record type to database type
 */
export type AppToDatabase<T> = {
  [K in keyof T]: T[K] extends undefined ? null : T[K] extends AppOptional<infer U> ? DatabaseNullable<U> : T[K];
};