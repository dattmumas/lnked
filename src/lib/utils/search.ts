export function escapeLike(value: string): string {
  // Escape % and _ which have special meaning in LIKE patterns
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}

/**
 * Build a safe websearch tsquery from raw input. Removes tsquery operator chars
 * and joins tokens with AND logic ("&") suitable for Postgres websearch type.
 */
export function buildWebsearchQuery(input: string): string {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token.replace(/["'&|!:*()<>]/g, ''))
    .join(' '); // websearch syntax handles natural language
} 