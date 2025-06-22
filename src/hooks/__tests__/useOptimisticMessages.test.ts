import { renderHook, act } from '@testing-library/react';

import { useOptimisticMessages } from '../useOptimisticMessages';

const createMockMessage = (overrides = {}): any => ({
  id: 'msg-1',
  content: 'Test message',
  created_at: new Date().toISOString(),
  sender_id: 'user-1',
  conversation_id: 'conv-1',
  message_type: 'text',
  sender: {
    id: 'user-1',
    username: 'testuser',
    full_name: 'Test User',
    avatar_url: null,
    email: 'test@example.com'
  },
  reply_to_id: null,
  metadata: null,
  edited_at: null,
  deleted_at: null,
  reactions: [],
  ...overrides,
});

const createOptimisticMessage = (overrides = {}): any => ({
  ...createMockMessage(),
  tempId: 'temp-1',
  isOptimistic: true,
  sendStatus: 'sending',
  ...overrides,
});

describe('useOptimisticMessages', () => {
  it('should initialize with empty messages', () => {
    const { result } = renderHook(() => useOptimisticMessages());
    
    expect(result.current.messages).toEqual([]);
    expect(result.current.hasOptimisticMessages).toBe(false);
  });

  it('should add optimistic message', () => {
    const { result } = renderHook(() => useOptimisticMessages());
    const mockMessage = createOptimisticMessage({ id: '', tempId: 'temp-1' });

    act(() => {
      result.current.addOptimisticMessage(mockMessage);
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].tempId).toBe('temp-1');
    expect(result.current.messages[0].sendStatus).toBe('sending');
    expect(result.current.hasOptimisticMessages).toBe(true);
  });

  it('should clear all optimistic messages', () => {
    const { result } = renderHook(() => useOptimisticMessages());
    const optimisticMessage = createOptimisticMessage({ id: '', tempId: 'temp-1' });

    act(() => {
      result.current.addOptimisticMessage(optimisticMessage);
    });

    expect(result.current.hasOptimisticMessages).toBe(true);

    act(() => {
      result.current.clearOptimisticMessages();
    });

    expect(result.current.messages).toHaveLength(0);
    expect(result.current.hasOptimisticMessages).toBe(false);
  });

  it('should handle onRetry callback from options', () => {
    const mockOnRetry = jest.fn();
    const { result } = renderHook(() => 
      useOptimisticMessages([], { onRetry: mockOnRetry })
    );

    const optimisticMessage = createOptimisticMessage({ id: '', tempId: 'temp-1' });

    act(() => {
      result.current.addOptimisticMessage(optimisticMessage);
    });

    act(() => {
      result.current.retryMessage('temp-1');
    });

    expect(mockOnRetry).toHaveBeenCalledWith('temp-1');
  });

  it('should sort messages by timestamp correctly', () => {
    const oldMessage = createMockMessage({ 
      id: 'old-msg',
      created_at: '2024-01-01T10:00:00Z' 
    });
    const newMessage = createOptimisticMessage({ 
      id: '',
      tempId: 'new-temp',
      created_at: '2024-01-01T11:00:00Z' 
    });

    const { result } = renderHook(() => 
      useOptimisticMessages([oldMessage])
    );

    act(() => {
      result.current.addOptimisticMessage(newMessage);
    });

    expect(result.current.messages).toHaveLength(2);
    expect((result.current.messages[0] as any).id).toBe('old-msg'); // Older first
    expect(result.current.messages[1].tempId).toBe('new-temp'); // Newer last
  });
}); 