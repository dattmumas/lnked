/*
 * InlineImageNode for Lnked, adapted from Lexical Playground (MIT License)
 * https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/nodes/InlineImageNode.tsx
 */
import { DecoratorNode, NodeKey, SerializedLexicalNode, Spread } from "lexical";
import type { JSX } from "react";
import Image from "next/image";

export type SerializedInlineImageNode = Spread<
  {
    type: "inlineimage";
    version: 1;
    src?: string;
    alt?: string;
  },
  SerializedLexicalNode
>;

export class InlineImageNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __alt: string;

  static getType() {
    return "inlineimage";
  }
  static clone(node: InlineImageNode) {
    return new InlineImageNode(node.__src, node.__alt, node.__key);
  }
  static importJSON(serialized: SerializedInlineImageNode) {
    return new InlineImageNode(
      serialized.src ?? "",
      serialized.alt ?? "Inline Image",
    );
  }
  exportJSON() {
    return {
      ...super.exportJSON(),
      type: "inlineimage",
      version: 1,
      src: this.__src,
      alt: this.__alt,
    };
  }
  constructor(src: string = "", alt: string = "Inline Image", key?: NodeKey) {
    super(key);
    this.__src = src;
    this.__alt = alt;
  }
  createDOM(): HTMLElement {
    const el = document.createElement("img");
    el.src = this.__src;
    el.alt = this.__alt;
    el.style.maxWidth = "100%";
    el.style.display = "inline-block";
    return el;
  }
  updateDOM(): boolean {
    return false;
  }
  decorate(): JSX.Element {
    return (
      <Image
        src={this.__src}
        alt={this.__alt}
        style={{ maxWidth: "100%", display: "inline-block" }}
        width={300}
        height={300}
        unoptimized={true}
        loading="lazy"
      />
    );
  }
}
