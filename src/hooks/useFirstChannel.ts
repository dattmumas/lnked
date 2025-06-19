import { useEffect, useState, useRef, useCallback } from 'react';
import { z } from 'zod';

import { API_ROUTES } from '@/lib/constants/api-routes';

// Constants
const RELOAD_TIMEOUT_MS = 30000;

const ChannelSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  type: z.string(),
});

type Channel = z.infer<typeof ChannelSchema>;

interface UseFirstChannelOptions {
  fetchFn?: typeof fetch;
}

interface UseFirstChannelReturn {
  channel: Channel | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useFirstChannel(
  collectiveId: string | null,
  options: UseFirstChannelOptions = {},
): UseFirstChannelReturn {
  const { fetchFn = fetch } = options;
  
  const [channel, setChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const cacheRef = useRef<Map<string, Channel>>(new Map());
  
  // Reload function for caller-controlled refetch
  const reload = useCallback((): void => {
    if (collectiveId === null || collectiveId === undefined || collectiveId === '') return;
    
    // Clear cache for this collective to force refetch
    cacheRef.current.delete(collectiveId);
    
    // Trigger re-fetch by updating a dependency or directly fetching
    setError(null);
    setLoading(true);
    
    // Create a new controller for the reload
    const controller = new AbortController();
    let active = true;
    
    const performReload = async (): Promise<void> => {
      try {
        const response = await fetchFn(
          API_ROUTES.COLLECTIVE_CHANNELS(collectiveId, 1),
          {
            cache: 'no-store',
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch channels: ${response.status}`);
        }

        const data: unknown = await response.json();
        
        if (!Array.isArray(data)) {
          throw new Error('Invalid response format');
        }

        if (data.length > 0) {
          const validatedChannel = ChannelSchema.parse(data[0]);
          
          // Cache the result
          cacheRef.current.set(collectiveId, validatedChannel);
          
          if (active) {
            setChannel(validatedChannel);
          }
        } else if (active) {
          setChannel(null);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }

        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('Failed to reload first channel:', errorMessage);
        
        if (active) {
          setError(errorMessage);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    
    void performReload();
    
    // Setup cleanup for this reload operation
    const cleanup = (): void => {
      active = false;
      controller.abort();
    };
    
    // Note: cleanup function is managed internally, not returned
    // This allows the async operation to be cancelled if needed
    setTimeout(cleanup, RELOAD_TIMEOUT_MS); // 30 second timeout fallback
  }, [collectiveId, fetchFn]);

  useEffect((): (() => void) | undefined => {
    if (collectiveId === null || collectiveId === undefined || collectiveId === '') {
      setChannel(null);
      setError(null);
      return undefined;
    }

    // Check cache first
    const cached = cacheRef.current.get(collectiveId);
    if (cached) {
      setChannel(cached);
      return undefined;
    }

    const controller = new AbortController();
    let active = true;
    
    const fetchFirstChannel = async (): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchFn(
          API_ROUTES.COLLECTIVE_CHANNELS(collectiveId, 1),
          {
            cache: 'no-store',
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch channels: ${response.status}`);
        }

        const data: unknown = await response.json();
        
        if (!Array.isArray(data)) {
          throw new Error('Invalid response format');
        }

        if (data.length > 0) {
          const validatedChannel = ChannelSchema.parse(data[0]);
          
          // Cache the result
          cacheRef.current.set(collectiveId, validatedChannel);
          
          if (active) {
            setChannel(validatedChannel);
          }
        } else if (active) {
          setChannel(null);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }

        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('Failed to load first channel:', errorMessage);
        
        if (active) {
          setError(errorMessage);
        }
      } finally {
        // Always set loading to false - safe even if component unmounted
        setLoading(false);
      }
    };
    
    void fetchFirstChannel();

    return (): void => {
      active = false;
      controller.abort();
    };
    // Removed dependencies that cause unnecessary refetches
     
  }, [collectiveId, fetchFn]);

  return { channel, loading, error, reload };
} 