import * as React from "react";

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

  React.useEffect(() => {
    if (open) {
      setUrl("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
    >
      <div className="bg-card rounded shadow-lg p-6 w-full max-w-md flex flex-col gap-4">
        <label htmlFor="embed-url-input" className="font-medium mb-1">
          {label}
        </label>
        <input
          id="embed-url-input"
          ref={inputRef}
          type="url"
          className="input input-bordered w-full"
          placeholder="https://..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && url.trim()) {
              e.preventDefault();
              onSubmit(url.trim());
            } else if (e.key === "Escape") {
              e.preventDefault();
              onCancel();
            }
          }}
        />
        <div className="flex gap-2 justify-end mt-2">
          <button
            type="button"
            className="px-4 py-2 rounded bg-muted text-foreground hover:bg-muted/80"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded bg-accent text-accent-foreground disabled:opacity-50"
            disabled={!url.trim()}
            onClick={() => onSubmit(url.trim())}
          >
            Insert
          </button>
        </div>
      </div>
    </div>
  );
}

export default EmbedUrlModal;
