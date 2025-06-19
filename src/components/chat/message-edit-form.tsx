import { useState, useRef, useEffect, useCallback } from 'react';

import { Button } from '@/components/ui/button';

interface MessageEditFormProps {
  messageId: string;
  initialContent: string;
  onSave: (messageId: string, content: string) => void;
  onCancel: () => void;
}

const EDIT_FORM_ROWS = 3;

export function MessageEditForm({
  messageId,
  initialContent,
  onSave,
  onCancel,
}: MessageEditFormProps): React.JSX.Element {
  const [editText, setEditText] = useState(initialContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus textarea when component mounts
  useEffect(() => {
    if (textareaRef.current !== null) {
      textareaRef.current.focus();
      // Place cursor at end
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length,
      );
    }
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent): void => {
      e.preventDefault();
      if (editText.trim() && editText !== initialContent) {
        onSave(messageId, editText.trim());
      } else {
        onCancel();
      }
    },
    [messageId, editText, initialContent, onSave, onCancel],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSubmit(e);
      }
    },
    [onCancel, handleSubmit],
  );

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
      setEditText(e.target.value);
    },
    [],
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full">
      <label htmlFor={`edit-message-${messageId}`} className="sr-only">
        Edit message
      </label>
      <textarea
        ref={textareaRef}
        id={`edit-message-${messageId}`}
        value={editText}
        onChange={handleTextChange}
        className="w-full p-2 text-sm bg-muted rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        rows={EDIT_FORM_ROWS}
        onKeyDown={handleKeyDown}
        aria-live="polite"
      />
      <div className="flex gap-2">
        <Button
          type="submit"
          className="text-sm bg-primary text-primary-foreground px-4 py-1.5 rounded-md hover:bg-primary/90 transition-colors font-medium"
          disabled={!editText.trim() || editText === initialContent}
        >
          Save
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          variant="ghost"
          className="text-sm text-muted-foreground px-4 py-1.5 rounded-md hover:bg-muted transition-colors"
        >
          Cancel
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Press Escape to cancel, Ctrl+Enter to save
      </p>
    </form>
  );
}
