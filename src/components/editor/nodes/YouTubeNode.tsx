/*
 * YouTubeNode for Lnked, adapted from Lexical Playground (MIT License)
 * https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/nodes/YouTubeNode.tsx
 */
import { DecoratorNode, NodeKey, SerializedLexicalNode, Spread } from "lexical";
import type { JSX } from "react";
import React, { useState } from "react";

export type SerializedYouTubeNode = Spread<
  {
    type: "youtube";
    version: 1;
    videoUrl: string;
  },
  SerializedLexicalNode
>;

export class YouTubeNode extends DecoratorNode<JSX.Element> {
  __videoUrl: string;

  static getType() {
    return "youtube";
  }

  static clone(node: YouTubeNode) {
    return new YouTubeNode(node.__videoUrl, node.__key);
  }

  static importJSON(serialized: SerializedYouTubeNode) {
    return new YouTubeNode(serialized.videoUrl);
  }

  exportJSON(): SerializedYouTubeNode {
    return {
      ...super.exportJSON(),
      type: "youtube",
      version: 1,
      videoUrl: this.__videoUrl,
    };
  }

  constructor(videoUrl: string = "", key?: NodeKey) {
    super(key);
    this.__videoUrl = videoUrl;
  }

  createDOM(): HTMLElement {
    const container = document.createElement("div");
    container.className = "youtube-node-container";
    return container;
  }

  updateDOM(): boolean {
    return false;
  }

  decorate(): JSX.Element {
    return <YouTubeComponent videoUrl={this.__videoUrl} />;
  }
}

interface YouTubeComponentProps {
  videoUrl: string;
}

function YouTubeComponent({ videoUrl }: YouTubeComponentProps) {
  const [error, setError] = useState(false);

  // Extract YouTube video ID from various URL formats
  const match = videoUrl.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([\w-]{11})/
  );
  const videoId = match ? match[1] : null;

  if (!videoId || error) {
    return (
      <div className="youtube-node-error">
        <p>Invalid YouTube URL: {videoUrl}</p>
        <a href={videoUrl} target="_blank" rel="noopener noreferrer">
          {videoUrl}
        </a>
      </div>
    );
  }

  return (
    <div className="youtube-node">
      <div
        className="youtube-embed-container"
        style={{
          position: "relative",
          paddingBottom: "56.25%", // 16:9 aspect ratio
          height: 0,
          overflow: "hidden",
          maxWidth: "100%",
          borderRadius: "0.5rem",
        }}
      >
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="YouTube video"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            borderRadius: "0.5rem",
          }}
          onError={() => setError(true)}
        />
      </div>
    </div>
  );
}

export function $createYouTubeNode(videoUrl: string): YouTubeNode {
  return new YouTubeNode(videoUrl);
}

export function $isYouTubeNode(node: unknown): node is YouTubeNode {
  return node instanceof YouTubeNode;
}
