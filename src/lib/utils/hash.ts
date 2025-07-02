export function fastHash(input: string): string {
  // Simple DJB2 hash converted to 8-char hex for brevity
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  // Convert to unsigned 32-bit hex
  return (hash >>> 0).toString(16);
}
