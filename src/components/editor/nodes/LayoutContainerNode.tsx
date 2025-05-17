/*
 * LayoutContainerNode for Lnked, adapted from Lexical Playground (MIT License)
 * https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/nodes/LayoutContainerNode.tsx
 */
import { DecoratorNode, NodeKey } from "lexical";
import type { JSX } from "react";

// TODO: Implement LayoutContainerNode logic, import/export, and React component
export class LayoutContainerNode extends DecoratorNode<JSX.Element> {
  static getType() {
    return "layoutcontainer";
  }
  static clone(node: LayoutContainerNode) {
    return new LayoutContainerNode(node.__key);
  }
  static importJSON() {
    return new LayoutContainerNode();
  }
  exportJSON() {
    return { ...super.exportJSON(), type: "layoutcontainer", version: 1 };
  }
  constructor(key?: NodeKey) {
    super(key);
  }
  createDOM(): HTMLElement {
    const el = document.createElement("div");
    el.textContent = "[Layout Container]";
    return el;
  }
  updateDOM(): boolean {
    return false;
  }
  decorate(): JSX.Element {
    return <div>[Layout Container]</div>;
  }
}
