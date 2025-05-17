/*
 * ImageNode for Lnked, adapted from Lexical Playground (MIT License)
 * https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/nodes/ImageNode.tsx
 */
import { DecoratorNode, NodeKey } from "lexical";
import type { JSX } from "react";

// TODO: Implement ImageNode logic, import/export, and React component
export class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __alt: string;

  static getType() {
    return "image";
  }
  static clone(node: ImageNode) {
    return new ImageNode(node.__src, node.__alt, node.__key);
  }
  static importJSON(serialized: import("lexical").SerializedLexicalNode) {
    const data = serialized as unknown as { src?: string; alt?: string };
    return new ImageNode(data.src ?? "", data.alt ?? "Image");
  }
  exportJSON() {
    return {
      ...super.exportJSON(),
      type: "image",
      version: 1,
      src: this.__src,
      alt: this.__alt,
    };
  }
  constructor(src: string = "", alt: string = "Image", key?: NodeKey) {
    super(key);
    this.__src = src;
    this.__alt = alt;
  }
  createDOM(): HTMLElement {
    const el = document.createElement("img");
    el.src = this.__src;
    el.alt = this.__alt;
    el.style.maxWidth = "100%";
    return el;
  }
  updateDOM(): boolean {
    return false;
  }
  decorate(): JSX.Element {
    return (
      <img src={this.__src} alt={this.__alt} style={{ maxWidth: "100%" }} />
    );
  }
}
