import type { Database } from '@/lib/database.types';

type ChainRow = Database['public']['Tables']['chains']['Row'];

/**
 * Safely extract the link preview JSON from a chain row.
 *
 * We support both historical storage locations:
 *  1. Dedicated column `link_preview`
 *  2. Nested JSON key `meta.link_preview` (new canonical spot)
 */
export function getLinkPreview(
  chain: Partial<Pick<ChainRow, 'link_preview' | 'meta'>> | null | undefined,
): ChainRow['link_preview'] {
  if (!chain) return null;
  const metaPreview =
    chain.meta !== undefined &&
    chain.meta !== null &&
    typeof chain.meta === 'object'
      ? ((chain.meta as Record<string, unknown>)[
          'link_preview'
        ] as ChainRow['link_preview'])
      : null;
  return metaPreview ?? chain.link_preview ?? null;
}
