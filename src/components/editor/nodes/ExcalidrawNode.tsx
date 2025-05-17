/*
 * ExcalidrawNode for Lnked, adapted from Lexical Playground (MIT License)
 * https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/nodes/ExcalidrawNode.tsx
 */
import { DecoratorNode, NodeKey } from "lexical";
import type { JSX } from "react";

// TODO: Implement ExcalidrawNode logic, import/export, and React component
export class ExcalidrawNode extends DecoratorNode<JSX.Element> {
  static getType() {
    return "excalidraw";
  }
  static clone(node: ExcalidrawNode) {
    return new ExcalidrawNode(node.__key);
  }
  static importJSON() {
    return new ExcalidrawNode();
  }
  exportJSON() {
    return { ...super.exportJSON(), type: "excalidraw", version: 1 };
  }
  constructor(key?: NodeKey) {
    super(key);
  }
  createDOM(): HTMLElement {
    const el = document.createElement("div");
    el.textContent = "[Excalidraw]";
    return el;
  }
  updateDOM(): boolean {
    return false;
  }
  decorate(): JSX.Element {
    return <div>[Excalidraw drawing]</div>;
  }
}
