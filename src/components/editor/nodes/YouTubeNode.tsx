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
    return <div>[YouTube: {this.__videoUrl}]</div>;
  }
}
