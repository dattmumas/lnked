/*
 * TweetNode for Lnked, adapted from Lexical Playground (MIT License)
 * https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/nodes/TweetNode.tsx
 */
import { DecoratorNode, NodeKey, SerializedLexicalNode, Spread } from "lexical";
import type { JSX } from "react";
import React, { useEffect, useRef } from "react";

// Declare window.twttr for TypeScript
declare global {
  interface Window {
    twttr?: {
      widgets?: {
        load: (container?: HTMLElement) => void;
        createTweet: (
          tweetId: string,
          container: HTMLElement,
          options?: Record<string, unknown>
        ) => Promise<HTMLElement>;
      };
    };
  }
}

export type SerializedTweetNode = Spread<
  {
    type: "tweet";
    version: 1;
    tweetUrl: string;
  },
  SerializedLexicalNode
>;

export class TweetNode extends DecoratorNode<JSX.Element> {
  __tweetUrl: string;

  static getType() {
    return "tweet";
  }

  static clone(node: TweetNode) {
    return new TweetNode(node.__tweetUrl, node.__key);
  }

  static importJSON(serialized: SerializedTweetNode) {
    return new TweetNode(serialized.tweetUrl);
  }

  exportJSON(): SerializedTweetNode {
    return {
      ...super.exportJSON(),
      type: "tweet",
      version: 1,
      tweetUrl: this.__tweetUrl,
    };
  }

  constructor(tweetUrl: string = "", key?: NodeKey) {
    super(key);
    this.__tweetUrl = tweetUrl;
  }

  createDOM(): HTMLElement {
    const div = document.createElement("div");
    div.className = "tweet-node";
    return div;
  }

  updateDOM(): boolean {
    return false;
  }

  decorate(): JSX.Element {
    return <TweetComponent tweetUrl={this.__tweetUrl} />;
  }
}

function TweetComponent({ tweetUrl }: { tweetUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Skip if no URL or container
    if (!tweetUrl || !containerRef.current) return;

    // Extract tweet ID from URL
    const match = tweetUrl.match(/twitter\.com\/[^/]+\/status\/(\d+)/);
    const tweetId = match ? match[1] : null;

    if (!tweetId) {
      console.error("Invalid Tweet URL format:", tweetUrl);
      return;
    }

    // Function to load the tweet
    const loadTweet = () => {
      if (window.twttr && window.twttr.widgets && containerRef.current) {
        // Clear previous content
        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }

        // Create tweet in container
        window.twttr.widgets
          .createTweet(tweetId, containerRef.current, {
            theme: document.documentElement.classList.contains("dark")
              ? "dark"
              : "light",
            dnt: true,
            align: "center",
          })
          .catch((error) => {
            console.error("Error embedding tweet:", error);
            if (containerRef.current) {
              containerRef.current.innerHTML = `<div class="tweet-error">Could not load tweet. <a href="${tweetUrl}" target="_blank" rel="noopener noreferrer">View on Twitter</a></div>`;
            }
          });
      }
    };

    // Load Twitter script if not already loaded
    if (!window.twttr) {
      const script = document.createElement("script");
      script.src = "https://platform.twitter.com/widgets.js";
      script.async = true;
      script.onload = loadTweet;
      document.body.appendChild(script);
    } else {
      loadTweet();
    }

    // Cleanup function
    return () => {
      // Nothing to clean up
    };
  }, [tweetUrl]);

  return (
    <div className="tweet-container">
      <div ref={containerRef} className="tweet-embed">
        <div className="tweet-loading">Loading tweet...</div>
      </div>
    </div>
  );
}

export function $createTweetNode(tweetUrl: string): TweetNode {
  return new TweetNode(tweetUrl);
}

export function $isTweetNode(node: unknown): node is TweetNode {
  return node instanceof TweetNode;
}
