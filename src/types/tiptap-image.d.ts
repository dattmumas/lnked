import '@tiptap/extension-image';

declare module '@tiptap/extension-image' {
  interface ImageOptions {
    /**
     * Permit custom data-* keys that TipTap doesn't know about yet.
     */
    HTMLAttributes: {
      [key: string]: unknown;
      /** local upload placeholder state */
      'data-uploading'?: 'true' | 'error' | null;
      /** temporary ID for tracking upload progress */
      'data-id'?: string;
    };
  }

  // Extend node attributes too
  interface ImageAttrs {
    [key: string]: unknown;
    'data-uploading'?: 'true' | 'error' | null;
    'data-id'?: string;
  }
}
