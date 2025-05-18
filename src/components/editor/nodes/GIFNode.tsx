import { DecoratorNode, NodeKey } from "lexical";
import type { JSX } from "react";
import React, { useState } from "react";
import Image from "next/image";

export type SerializedGIFNode = {
  type: "gif";
  version: 1;
  url: string;
  alt: string;
};

export class GIFNode extends DecoratorNode<JSX.Element> {
  __url: string;
  __alt: string;

  static getType() {
    return "gif";
  }
  static clone(node: GIFNode) {
    return new GIFNode(node.__url, node.__alt, node.__key);
  }
  static importJSON(serialized: SerializedGIFNode) {
    return new GIFNode(serialized.url, serialized.alt);
  }
  exportJSON(): SerializedGIFNode {
    return {
      type: "gif",
      version: 1,
      url: this.__url,
      alt: this.__alt,
    };
  }
  constructor(url: string = "", alt: string = "GIF", key?: NodeKey) {
    super(key);
    this.__url = url;
    this.__alt = alt;
  }
  createDOM(): HTMLElement {
    const el = document.createElement("img");
    el.src = this.__url;
    el.alt = this.__alt;
    el.style.maxWidth = "100%";
    el.style.display = "block";
    return el;
  }
  updateDOM(): boolean {
    return false;
  }
  decorate(): JSX.Element {
    return <GIFComponent url={this.__url} alt={this.__alt} />;
  }
}

function GIFComponent({ url, alt }: { url: string; alt: string }) {
  return (
    <Image
      src={url}
      alt={alt}
      style={{ maxWidth: "100%", display: "block" }}
      width={500}
      height={500}
      unoptimized={true}
      loading="lazy"
    />
  );
}

// Giphy Picker Modal
export function GifPicker({
  onSelect,
  onClose,
}: {
  onSelect: (url: string, alt: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  type GiphyGif = {
    id: string;
    title: string;
    images: {
      fixed_width: {
        url: string;
      };
    };
  };
  const [results, setResults] = useState<GiphyGif[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchGiphy = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const apiKey = "dc6zaTOxFJmzC"; // Public beta key
    const res = await fetch(
      `https://api.giphy.com/v1/gifs/search?q=${encodeURIComponent(
        query
      )}&api_key=${apiKey}&limit=24`
    );
    const data = await res.json();
    setResults(data.data);
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background bg-opacity-40">
      <div className="bg-card rounded shadow-lg p-4 w-full max-w-lg">
        <form onSubmit={searchGiphy} className="flex mb-4">
          <input
            className="flex-1 border rounded-l px-2 py-1 border-border"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search GIFs..."
            autoFocus
          />
          <button
            type="submit"
            className="bg-primary text-primary-foreground px-4 py-1 rounded-r"
            disabled={isLoading}
          >
            {isLoading ? "Searching..." : "Search"}
          </button>
        </form>
        <div className="grid grid-cols-4 gap-2 max-h-80 overflow-y-auto">
          {results.map((gif) => (
            <button
              key={gif.id}
              className="focus:outline-none"
              onClick={() =>
                onSelect(gif.images.fixed_width.url, gif.title || "GIF")
              }
            >
              <Image
                src={gif.images.fixed_width.url}
                alt={gif.title || "GIF"}
                className="rounded w-full h-auto"
                width={200}
                height={200}
                unoptimized={true}
                loading="lazy"
              />
            </button>
          ))}
        </div>
        <button className="mt-4 w-full bg-muted rounded py-2" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

// Helper for slash menu/toolbar
export function $createGIFNode(url: string, alt: string): GIFNode {
  return new GIFNode(url, alt);
}
export function $isGIFNode(node: unknown): node is GIFNode {
  return node instanceof GIFNode;
}
