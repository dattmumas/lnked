/*
 * LayoutItemNode for Lnked, adapted from Lexical Playground (MIT License)
 * https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/nodes/LayoutItemNode.tsx
 */
import { DecoratorNode, NodeKey } from "lexical";
import type { JSX } from "react";

// TODO: Implement LayoutItemNode logic, import/export, and React component
export class LayoutItemNode extends DecoratorNode<JSX.Element> {
  static getType() {
    return "layoutitem";
  }
  static clone(node: LayoutItemNode) {
    return new LayoutItemNode(node.__key);
  }
  static importJSON() {
    return new LayoutItemNode();
  }
  exportJSON() {
    return { ...super.exportJSON(), type: "layoutitem", version: 1 };
  }
  constructor(key?: NodeKey) {
    super(key);
  }
  createDOM(): HTMLElement {
    const el = document.createElement("div");
    el.textContent = "[Layout Item]";
    return el;
  }
  updateDOM(): boolean {
    return false;
  }
  decorate(): JSX.Element {
    return <div>[Layout Item]</div>;
  }
}
