import { renderHook, waitFor } from '@testing-library/react';

import { useFirstChannel } from '../useFirstChannel';

describe('useFirstChannel', () => {
  const mockChannel = {
    id: 'channel-1',
    title: 'General',
    type: 'channel',
  };

  const mockFetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return cached channel without making network request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([mockChannel]),
    });

    const { result, rerender } = renderHook(
      ({ collectiveId }) => useFirstChannel(collectiveId, { fetchFn: mockFetch }),
      {
        initialProps: { collectiveId: 'collective-1' },
      },
    );

    // Wait for initial fetch to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.channel).toEqual(mockChannel);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Rerender with same collectiveId - should use cache
    rerender({ collectiveId: 'collective-1' });

    expect(result.current.channel).toEqual(mockChannel);
    expect(mockFetch).toHaveBeenCalledTimes(1); // No additional fetch
  });

  it('should handle fetch errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(
      () => useFirstChannel('collective-1', { fetchFn: mockFetch }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.channel).toBeNull();
  });

  it('should provide reload functionality', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockChannel]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ ...mockChannel, title: 'Updated' }]),
      });

    const { result } = renderHook(
      () => useFirstChannel('collective-1', { fetchFn: mockFetch }),
    );

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.channel?.title).toBe('General');

    // Trigger reload
    result.current.reload();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.channel?.title).toBe('Updated');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should handle invalid response format', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve('invalid response'), // Not an array
    });

    const { result } = renderHook(
      () => useFirstChannel('collective-1', { fetchFn: mockFetch }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Invalid response format');
    expect(result.current.channel).toBeNull();
  });

  it('should reset state when collectiveId becomes null', () => {
    const { result, rerender } = renderHook(
      ({ collectiveId }: { collectiveId: string | null }) => 
        useFirstChannel(collectiveId, { fetchFn: mockFetch }),
      {
        initialProps: { collectiveId: 'collective-1' as string | null },
      },
    );

    // Rerender with null collectiveId
    rerender({ collectiveId: null });

    expect(result.current.channel).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });
}); 