'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Users, User, Hash, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDisplayName } from '@/lib/chat/utils';
import { chatService } from '@/lib/chat/chat-service';

interface CreateConversationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateConversation: (data: {
    title?: string;
    type: 'direct' | 'group' | 'channel';
    description?: string;
    is_private?: boolean;
    participant_ids: string[];
  }) => Promise<void>;
  currentUserId: string;
}

export function CreateConversationModal({
  open,
  onOpenChange,
  onCreateConversation,
  currentUserId,
}: CreateConversationModalProps) {
  const [type, setType] = useState<'direct' | 'group' | 'channel'>('direct');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [participantQuery, setParticipantQuery] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [searchResults, setSearchResults] = useState<
    Array<{ id: string; full_name: string | null; username: string | null }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (query: string) => {
    setParticipantQuery(query);
    setError(null);

    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await chatService.searchUsers(query.trim());

      if (error) {
        setError(error.message);
        setSearchResults([]);
      } else {
        // Filter out current user
        const filteredResults = (data || []).filter(
          (user) => user.id !== currentUserId,
        );
        setSearchResults(filteredResults);
      }
    } catch {
      setError('Failed to search users');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const addParticipant = (user: {
    id: string;
    full_name: string | null;
    username: string | null;
  }) => {
    if (!selectedParticipants.find((p) => p.id === user.id)) {
      setSelectedParticipants((prev) => [
        ...prev,
        {
          id: user.id,
          name: getDisplayName(user),
        },
      ]);
      setParticipantQuery('');
      setSearchResults([]);
    }
  };

  const removeParticipant = (userId: string) => {
    setSelectedParticipants((prev) => prev.filter((p) => p.id !== userId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    console.info('Form submitted with data:', {
      type,
      title: title.trim(),
      description: description.trim(),
      selectedParticipants,
    });

    // Simple validation
    if (type !== 'direct' && !title.trim()) {
      setError('Please enter a title for the conversation');
      return;
    }

    if (selectedParticipants.length === 0) {
      setError('Please select at least one participant');
      return;
    }

    const conversationData = {
      title: title.trim() || undefined,
      type,
      description: description.trim() || undefined,
      is_private: true,
      participant_ids: selectedParticipants.map((p) => p.id),
    };

    console.info('Creating conversation with data:', conversationData);

    setIsCreating(true);
    try {
      await onCreateConversation(conversationData);

      console.info('Conversation created successfully');

      // Reset form on success
      setTitle('');
      setDescription('');
      setParticipantQuery('');
      setSelectedParticipants([]);
      setSearchResults([]);
    } catch (error) {
      console.error('Error creating conversation:', error);
      setError(
        error instanceof Error
          ? error.message
          : 'Failed to create conversation',
      );
    } finally {
      setIsCreating(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop - completely opaque */}
      <div
        className="absolute inset-0 bg-white dark:bg-gray-900"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal content */}
      <div className="relative bg-background border shadow-xl rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">Create New Conversation</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 p-0"
            disabled={isCreating}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error display */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          {/* Type selector */}
          <div>
            <div className="text-sm font-medium mb-2 block">
              Conversation Type
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'direct', label: 'Direct', icon: User },
                { value: 'group', label: 'Group', icon: Users },
                { value: 'channel', label: 'Channel', icon: Hash },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setType(value as 'direct' | 'group' | 'channel')
                  }
                  disabled={isCreating}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors',
                    type === value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-muted/50',
                    isCreating && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          {type !== 'direct' && (
            <div>
              <label htmlFor="title" className="text-sm font-medium mb-2 block">
                Title
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter conversation title"
                disabled={isCreating}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
            </div>
          )}

          {/* Description */}
          {type !== 'direct' && (
            <div>
              <label
                htmlFor="description"
                className="text-sm font-medium mb-2 block"
              >
                Description (optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter conversation description"
                rows={3}
                disabled={isCreating}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none disabled:opacity-50"
              />
            </div>
          )}

          {/* Participants */}
          <div>
            <label
              htmlFor="participant"
              className="text-sm font-medium mb-2 block"
            >
              {type === 'direct' ? 'Find User' : 'Add Participants'}
            </label>

            {/* Selected participants */}
            {selectedParticipants.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {selectedParticipants.map((participant) => (
                  <div
                    key={participant.id}
                    className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded text-xs"
                  >
                    <span>{participant.name}</span>
                    <button
                      type="button"
                      onClick={() => removeParticipant(participant.id)}
                      disabled={isCreating}
                      className="hover:bg-primary/20 rounded p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Search input */}
            <div className="relative">
              <input
                id="participant"
                type="text"
                value={participantQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search by name or username..."
                disabled={isCreating}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="mt-2 border border-input rounded-lg max-h-32 overflow-y-auto">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => addParticipant(user)}
                    disabled={isCreating}
                    className="w-full text-left px-3 py-2 hover:bg-muted/50 first:rounded-t-lg last:rounded-b-lg disabled:opacity-50"
                  >
                    <div className="font-medium text-sm">
                      {getDisplayName(user)}
                    </div>
                    {user.username && user.full_name && (
                      <div className="text-xs text-muted-foreground">
                        @{user.username}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-1">
              Search for users to add to the conversation
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || selectedParticipants.length === 0}
              className="flex-1"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
