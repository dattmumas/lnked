/*
 * YouTubeNode for Lnked, adapted from Lexical Playground (MIT License)
 * https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/nodes/YouTubeNode.tsx
 */
import { DecoratorNode, NodeKey } from "lexical";
import type { JSX } from "react";

// TODO: Implement YouTubeNode logic, import/export, and React component
export class YouTubeNode extends DecoratorNode<JSX.Element> {
  __videoUrl: string;

  static getType() {
    return "youtube";
  }
  static clone(node: YouTubeNode) {
    return new YouTubeNode(node.__videoUrl, node.__key);
  }
  static importJSON(serialized: import("lexical").SerializedLexicalNode) {
    const data = serialized as unknown as { videoUrl?: string };
    return new YouTubeNode(data.videoUrl ?? "");
  }
  exportJSON() {
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
    const el = document.createElement("div");
    el.textContent = `[YouTube: ${this.__videoUrl}]`;
    return el;
  }
  updateDOM(): boolean {
    return false;
  }
  decorate(): JSX.Element {
    return <YouTubeEmbed videoUrl={this.__videoUrl} />;
  }
}

function YouTubeEmbed({ videoUrl }: { videoUrl: string }) {
  // Extract YouTube video ID from various URL formats
  const match = videoUrl.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([\w-]{11})/
  );
  const videoId = match ? match[1] : null;
  if (!videoId) {
    return <a href={videoUrl}>{videoUrl}</a>;
  }
  return (
    <div
      style={{
        position: "relative",
        paddingBottom: "56.25%",
        height: 0,
        overflow: "hidden",
        maxWidth: 640,
      }}
    >
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        frameBorder={0}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="YouTube video"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
}
