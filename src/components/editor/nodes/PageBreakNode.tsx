/*
 * PageBreakNode for Lnked, adapted from Lexical Playground (MIT License)
 * https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/nodes/PageBreakNode.tsx
 */
import { DecoratorNode, NodeKey } from "lexical";
import type { JSX } from "react";

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
    el.className = "page-break my-8 relative flex items-center justify-center";
    return el;
  }
  updateDOM(): boolean {
    return false;
  }
  decorate(): JSX.Element {
    return (
      <div className="w-full text-center" style={{ pageBreakAfter: "always" }}>
        <hr className="border-t border-dashed border-border" />
        <span className="absolute bg-background px-1 text-xs text-muted-foreground">
          Page Break
        </span>
      </div>
    );
  }
}

export function $createPageBreakNode(): PageBreakNode {
  return new PageBreakNode();
}

export function $isPageBreakNode(node: unknown): node is PageBreakNode {
  return node instanceof PageBreakNode;
}
