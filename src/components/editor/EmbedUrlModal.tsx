// @ts-nocheck
"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface EmbedUrlModalProps {
  open: boolean;
  label: string;
  onSubmit: (url: string) => void;
  onCancel: () => void;
}

export function EmbedUrlModal({
  open,
  label,
  onSubmit,
  onCancel,
}: EmbedUrlModalProps) {
  const [url, setUrl] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect((): void => {
    if (open) {
      setUrl("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded bg-card p-6 shadow-lg focus:outline-none">
          <Dialog.Title className="font-medium mb-1">{label}</Dialog.Title>
          <Input
            id="embed-url-input"
            ref={inputRef}
            type="url"
            placeholder="https://..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && url.trim()) {
                e.preventDefault();
                onSubmit(url.trim());
              }
            }}
          />
          <div className="flex gap-2 justify-end mt-4">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="button" disabled={!url.trim()} onClick={() => onSubmit(url.trim())}>
              Insert
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default EmbedUrlModal;
