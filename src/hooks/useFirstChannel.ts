import { useEffect, useState } from 'react';
import { z } from 'zod';

import { useToast } from './useToast';

const ChannelSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  type: z.string().default('channel'),
});

type Channel = z.infer<typeof ChannelSchema>;

export function useFirstChannel(collectiveId: string | null): {
  channel: Channel | null;
  loading: boolean;
  error: string | null;
} {
  const [channel, setChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!collectiveId) {
      setChannel(null);
      setError(null);
      return;
    }

    let active = true;
    const controller = new AbortController();

    const fetchFirstChannel = async (): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/collectives/${collectiveId}/channels?limit=1`,
          {
            cache: 'no-store',
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch channels: ${response.status}`);
        }

        const data = await response.json();
        
        if (!Array.isArray(data)) {
          throw new Error('Invalid response format');
        }

        if (data.length > 0) {
          const validatedChannel = ChannelSchema.parse(data[0]);
          if (active) {
            setChannel(validatedChannel);
          }
        } else if (active) {
          setChannel(null);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return; // Fetch was cancelled, don't update state
        }

        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('Failed to load first channel:', errorMessage);
        
        if (active) {
          setError(errorMessage);
          toast('Could not load channel list', { type: 'error' });
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void fetchFirstChannel();

    return () => {
      active = false;
      controller.abort();
    };
  }, [collectiveId, toast]);

  return { channel, loading, error };
} 