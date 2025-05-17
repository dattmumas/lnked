/*
 * PageBreakNode for Lnked, adapted from Lexical Playground (MIT License)
 * https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/nodes/PageBreakNode.tsx
 */
import { DecoratorNode, NodeKey } from "lexical";
import type { JSX } from "react";

// TODO: Implement PageBreakNode logic, import/export, and React component
export class PageBreakNode extends DecoratorNode<JSX.Element> {
  static getType() {
    return "pagebreak";
  }
  static clone(node: PageBreakNode) {
    return new PageBreakNode(node.__key);
  }
  static importJSON() {
    return new PageBreakNode();
  }
  exportJSON() {
    return { ...super.exportJSON(), type: "pagebreak", version: 1 };
  }
  constructor(key?: NodeKey) {
    super(key);
  }
  createDOM(): HTMLElement {
    const el = document.createElement("div");
    el.textContent = "[Page Break]";
    return el;
  }
  updateDOM(): boolean {
    return false;
  }
  decorate(): JSX.Element {
    return <div>[Page Break]</div>;
  }
}
