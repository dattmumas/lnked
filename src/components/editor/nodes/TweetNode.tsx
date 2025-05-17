/*
 * TweetNode for Lnked, adapted from Lexical Playground (MIT License)
 * https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/nodes/TweetNode.tsx
 */
import { DecoratorNode, NodeKey } from "lexical";
import type { JSX } from "react";

// TODO: Implement TweetNode logic, import/export, and React component
export class TweetNode extends DecoratorNode<JSX.Element> {
  __tweetUrl: string;

  static getType() {
    return "tweet";
  }
  static clone(node: TweetNode) {
    return new TweetNode(node.__tweetUrl, node.__key);
  }
  static importJSON(serialized: import("lexical").SerializedLexicalNode) {
    const data = serialized as unknown as { tweetUrl?: string };
    return new TweetNode(data.tweetUrl ?? "");
  }
  exportJSON() {
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
    const el = document.createElement("div");
    el.textContent = `[Tweet: ${this.__tweetUrl}]`;
    return el;
  }
  updateDOM(): boolean {
    return false;
  }
  decorate(): JSX.Element {
    return <div>[Tweet: {this.__tweetUrl}]</div>;
  }
}
