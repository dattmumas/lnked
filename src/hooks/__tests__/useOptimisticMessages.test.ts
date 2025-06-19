import { renderHook, act } from '@testing-library/react';

import { useOptimisticMessages } from '../useOptimisticMessages';

import type { MessageWithSender } from '@/lib/chat/types';
import type { OptimisticMessage } from '../useOptimisticMessages';

const createMockMessage = (overrides: Partial<MessageWithSender> = {}): MessageWithSender => ({
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

const createOptimisticMessage = (overrides: Partial<OptimisticMessage> = {}): OptimisticMessage => ({
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
    const mockMessage = createOptimisticMessage();

    act(() => {
      result.current.addOptimisticMessage(mockMessage);
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].tempId).toBe('temp-1');
    expect(result.current.messages[0].sendStatus).toBe('sending');
    expect(result.current.hasOptimisticMessages).toBe(true);
  });

  it('should mark message as sent with actual message', () => {
    const { result } = renderHook(() => useOptimisticMessages());
    const optimisticMessage = createOptimisticMessage();
    const actualMessage = createMockMessage({ id: 'real-msg-1' });

    act(() => {
      result.current.addOptimisticMessage(optimisticMessage);
    });

    act(() => {
      result.current.markMessageSent('temp-1', actualMessage);
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].id).toBe('real-msg-1');
    expect(result.current.messages[0].sendStatus).toBe('sent');
    expect(result.current.messages[0].isOptimistic).toBe(false);
  });

  it('should mark message as failed and allow retry', () => {
    const { result } = renderHook(() => useOptimisticMessages());
    const optimisticMessage = createOptimisticMessage();
    const mockRetry = jest.fn();

    act(() => {
      result.current.addOptimisticMessage(optimisticMessage, mockRetry);
    });

    act(() => {
      result.current.markMessageFailed('temp-1', 'Network error');
    });

    expect(result.current.messages[0].sendStatus).toBe('failed');
    expect(result.current.messages[0].metadata?.error).toBe('Network error');

    act(() => {
      result.current.retryMessage('temp-1');
    });

    expect(mockRetry).toHaveBeenCalledTimes(1);
    expect(result.current.messages[0].sendStatus).toBe('sending');
  });

  it('should prevent duplicates using canonical IDs', () => {
    const realMessage = createMockMessage({ id: 'msg-1' });
    const optimisticMessage = createOptimisticMessage({ 
      id: 'msg-1', // Same ID as real message
      tempId: 'temp-1' 
    });

    const { result } = renderHook(() => 
      useOptimisticMessages([realMessage])
    );

    act(() => {
      result.current.addOptimisticMessage(optimisticMessage);
    });

    // Should only have the optimistic message (since it has same ID)
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].isOptimistic).toBe(true);
  });

  it('should enforce max queue limit', () => {
    const { result } = renderHook(() => 
      useOptimisticMessages([], { maxOptimisticMessages: 2 })
    );

    const message1 = createOptimisticMessage({ tempId: 'temp-1' });
    const message2 = createOptimisticMessage({ tempId: 'temp-2' });
    const message3 = createOptimisticMessage({ tempId: 'temp-3' });

    act(() => {
      result.current.addOptimisticMessage(message1);
      result.current.addOptimisticMessage(message2);
      result.current.addOptimisticMessage(message3);
    });

    // Should only have 2 messages (oldest evicted)
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages.find(m => m.tempId === 'temp-1')).toBeUndefined();
  });

  it('should clear all optimistic messages', () => {
    const { result } = renderHook(() => useOptimisticMessages());
    const optimisticMessage = createOptimisticMessage();

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

  it('should sort messages by timestamp correctly', () => {
    const oldMessage = createMockMessage({ 
      id: 'old-msg',
      created_at: '2024-01-01T10:00:00Z' 
    });
    const newMessage = createOptimisticMessage({ 
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
    expect(result.current.messages[0].id).toBe('old-msg'); // Older first
    expect(result.current.messages[1].tempId).toBe('new-temp'); // Newer last
  });

  it('should handle onRetry callback from options', () => {
    const mockOnRetry = jest.fn();
    const { result } = renderHook(() => 
      useOptimisticMessages([], { onRetry: mockOnRetry })
    );

    const optimisticMessage = createOptimisticMessage();

    act(() => {
      result.current.addOptimisticMessage(optimisticMessage);
    });

    act(() => {
      result.current.retryMessage('temp-1');
    });

    expect(mockOnRetry).toHaveBeenCalledWith('temp-1');
  });
}); 