'use client';

import { AlertTriangle, Save, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SaveDraftModalProps {
  isOpen: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function SaveDraftModal({
  isOpen,
  onSave,
  onDiscard,
  onCancel,
  isLoading = false,
}: SaveDraftModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={() => !isLoading && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <DialogTitle>Save Draft?</DialogTitle>
          </div>
          <DialogDescription>
            You have unsaved changes. Would you like to save your draft before
            leaving?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={isLoading}
            className="order-3 sm:order-1"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>

          <Button
            variant="outline"
            onClick={onDiscard}
            disabled={isLoading}
            className="order-2 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            Don't Save
          </Button>

          <Button
            onClick={onSave}
            disabled={isLoading}
            className="order-1 sm:order-3"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </div>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
