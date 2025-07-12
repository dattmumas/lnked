'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Send, Paperclip, Smile, Loader2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useCallback, useRef, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import supabase from '@/lib/supabase/browser';
import { cn } from '@/lib/utils';
import { useUser } from '@/providers/UserContext';
import { useTenantStore } from '@/stores/tenant-store';
import { ChatMessage, MessagesResponse } from '@/types/chat-v2';

const messageSchema = z.object({
  content: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message too long'),
});

type MessageFormData = z.infer<typeof messageSchema>;

// Type for the messages cache structure
interface MessagesCacheData {
  pages: MessagesResponse[];
  pageParams: (string | undefined)[];
}

interface MessageComposerProps {
  conversationId: string;
  tenantId: string;
  onMessageSent?: (message: ChatMessage) => void;
  onTypingChange?: (isTyping: boolean) => void;
}

export function MessageComposer({
  conversationId,
  tenantId,
  onMessageSent,
  onTypingChange,
}: MessageComposerProps): React.JSX.Element {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { user, profile } = useUser();
  const { currentTenant } = useTenantStore();

  const form = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      content: '',
    },
  });

  const watchedContent = form.watch('content');

  // Handle typing indicators with throttling
  const handleTypingThrottle = useCallback(
    (content: string) => {
      const hasContent = Boolean(content?.trim());

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      if (hasContent) {
        // Start typing immediately if not already typing (leading)
        setIsTyping((prev) => {
          if (!prev) {
            onTypingChange?.(true);
            return true;
          }
          return prev;
        });

        // Set timeout to stop typing indicator after inactivity (trailing)
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
          onTypingChange?.(false);
        }, 2000); // Stop typing after 2 seconds of inactivity
      } else {
        // Stop typing immediately when content is cleared
        setIsTyping(false);
        onTypingChange?.(false);
      }
    },
    [onTypingChange],
  );

  // Auto-resize textarea and handle typing indicators
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }

    handleTypingThrottle(watchedContent);
  }, [watchedContent, handleTypingThrottle]);

  // Mutation for sending messages
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: {
      content: string;
      optimisticId: string;
    }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Validate tenant context exists
      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content: messageData.content,
          message_type: 'text',
          sender_id: user.id,
          tenant_id: tenantId || null,
        })
        .select(
          `
          *,
          sender:users(
            id,
            username,
            full_name,
            avatar_url
          )
        `,
        )
        .single();

      if (error) throw error;
      return { ...data, optimisticId: messageData.optimisticId };
    },
    onMutate: async (messageData) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ['conversations', conversationId, 'messages'],
      });

      // Create optimistic message
      const optimisticMessage: ChatMessage = {
        id: `optimistic-${messageData.optimisticId}`,
        optimistic_id: messageData.optimisticId,
        conversation_id: conversationId,
        sender_id: user.id,
        content: messageData.content,
        message_type: 'text',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        edited_at: null,
        deleted_at: null,
        reply_to_id: null,
        metadata: null,
        tenant_id: tenantId || null,
        sender: {
          id: user.id,
          username: profile?.username || null,
          full_name: profile?.full_name || null,
          avatar_url: profile?.avatar_url || null,
        },
        reply_to: null,
      };

      // Optimistically update the cache
      queryClient.setQueryData(
        ['conversations', conversationId, 'messages'],
        (old: InfiniteData<MessagesResponse> | undefined) => {
          // Handle race condition - seed cache if it doesn't exist yet
          if (!old) {
            return {
              pages: [
                {
                  messages: [optimisticMessage],
                  has_more: false,
                  next_cursor: undefined,
                },
              ],
              pageParams: [undefined],
            };
          }

          const newPages = [...old.pages];
          if (newPages.length > 0) {
            const lastPageIndex = newPages.length - 1;
            const lastPage = newPages[lastPageIndex];
            if (lastPage) {
              newPages[lastPageIndex] = {
                ...lastPage,
                messages: [...lastPage.messages, optimisticMessage],
              };
            }
          }

          return {
            ...old,
            pages: newPages,
          };
        },
      );

      return { optimisticMessage };
    },
    onSuccess: (data, variables, context) => {
      // Replace optimistic message with real message
      queryClient.setQueryData(
        ['conversations', conversationId, 'messages'],
        (old: InfiniteData<MessagesResponse> | undefined) => {
          if (!old) return old;

          const newPages = old.pages.map((page: MessagesResponse) => ({
            ...page,
            messages: page.messages.map((msg: ChatMessage) =>
              msg.optimistic_id === data.optimisticId
                ? { ...data, optimistic_id: undefined }
                : msg,
            ),
          }));

          return {
            ...old,
            pages: newPages,
          };
        },
      );

      // Broadcast the real message to other users
      if (onMessageSent && data.id) {
        onMessageSent(data as ChatMessage);
      }
    },
    onError: (error, variables, context) => {
      // Remove optimistic message on error
      queryClient.setQueryData(
        ['conversations', conversationId, 'messages'],
        (old: InfiniteData<MessagesResponse> | undefined) => {
          if (!old) return old;

          const newPages = old.pages.map((page: MessagesResponse) => ({
            ...page,
            messages: page.messages.filter(
              (msg: ChatMessage) =>
                msg.optimistic_id !== variables.optimisticId,
            ),
          }));

          return {
            ...old,
            pages: newPages,
          };
        },
      );

      toast.error('Failed to send message. Please try again.');
    },
    retry: false,
  });

  // Keep focus once the message is actually sent
  useEffect(() => {
    if (sendMessageMutation.isSuccess) {
      textareaRef.current?.focus();
      sendMessageMutation.reset(); // ready for the next send
    }
  }, [sendMessageMutation]);

  const onSubmit = useCallback(
    (data: MessageFormData) => {
      if (!data.content.trim()) return;

      const optimisticId = nanoid();

      // Send the message
      sendMessageMutation.mutate({
        content: data.content.trim(),
        optimisticId,
      });

      // Clear the form
      form.reset({ content: '' });

      // Don't focus here; we do it after mutation succeeds

      // Stop typing indicator
      setIsTyping(false);
      onTypingChange?.(false);
    },
    [sendMessageMutation, form, onTypingChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        form.handleSubmit(onSubmit)();
      }
    },
    [form, onSubmit],
  );

  const isLoading = sendMessageMutation.isPending;
  const hasContent = Boolean(watchedContent?.trim());
  const characterCount = watchedContent?.length || 0;
  const isNearLimit = characterCount > 1800;

  return (
    <div className="border-t border-border bg-background">
      <div className="p-4">
        {/* Tenant Context Indicator */}
        {currentTenant && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 px-1">
            <div className="w-2 h-2 bg-primary rounded-full" />
            <span>
              <span className="font-medium">{currentTenant.name}</span>
              {currentTenant.type === 'collective' &&
                currentTenant.user_role && (
                  <span className="text-muted-foreground/70">
                    {' '}
                    • {currentTenant.user_role}
                  </span>
                )}
              {' - '}
              <span className="font-medium">
                {profile?.full_name || profile?.username || 'You'}
              </span>
            </span>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <div className="flex items-end gap-3">
              {/* Attachment button (placeholder) */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 text-muted-foreground hover:text-foreground"
                disabled={isLoading}
                onClick={() => {
                  // TODO: Implement file attachments
                  toast('File attachments coming soon!');
                }}
              >
                <Paperclip className="h-4 w-4" />
              </Button>

              {/* Message input */}
              <div className="flex-1 relative">
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          {...field}
                          ref={textareaRef}
                          placeholder="Type a message..."
                          className={cn(
                            'min-h-[44px] max-h-[120px] resize-none transition-all',
                            'focus:ring-2 focus:ring-primary/20',
                            fieldState.error &&
                              'border-destructive focus:ring-destructive/20',
                          )}
                          onKeyDown={handleKeyDown}
                          disabled={isLoading}
                          rows={1}
                        />
                      </FormControl>

                      {/* Character count */}
                      {isNearLimit && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute -top-6 right-2 text-xs text-muted-foreground"
                        >
                          <span
                            className={cn(
                              characterCount > 2000 && 'text-destructive',
                            )}
                          >
                            {characterCount}/2000
                          </span>
                        </motion.div>
                      )}

                      {/* Error message */}
                      {fieldState.error && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-xs text-destructive mt-1"
                        >
                          {fieldState.error.message}
                        </motion.p>
                      )}
                    </FormItem>
                  )}
                />
              </div>

              {/* Emoji button (placeholder) */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 text-muted-foreground hover:text-foreground"
                disabled={isLoading}
                onClick={() => {
                  // TODO: Implement emoji picker
                  toast('Emoji picker coming soon!');
                }}
              >
                <Smile className="h-4 w-4" />
              </Button>

              {/* Send button */}
              <Button
                type="submit"
                size="sm"
                className={cn(
                  'h-10 w-10 p-0 transition-all duration-200',
                  hasContent
                    ? 'bg-primary hover:bg-primary/90 scale-100'
                    : 'bg-muted text-muted-foreground scale-95',
                )}
                disabled={isLoading || !hasContent}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
