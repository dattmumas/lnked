declare module '@lexical/headless' {
  // Minimal typing for the createHeadlessEditor utility used in tests.
  export function createHeadlessEditor(config: Record<string, unknown>): unknown;
}
