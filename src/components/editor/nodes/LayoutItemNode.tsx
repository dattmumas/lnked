/*
 * LayoutItemNode for Lnked, adapted from Lexical Playground (MIT License)
 * https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/nodes/LayoutItemNode.tsx
 */
import {
  ElementNode,
  NodeKey,
  SerializedElementNode,
  Spread,
} from "lexical";
import type { JSX } from "react";

// TODO: Implement LayoutItemNode logic, import/export, and React component
export type SerializedLayoutItemNode = Spread<
  {
    type: "layoutitem";
    version: 1;
  },
  SerializedElementNode
>;

export class LayoutItemNode extends ElementNode {
  static getType() {
    return "layoutitem";
  }
  static clone(node: LayoutItemNode) {
    return new LayoutItemNode(node.__key);
  }
  static importJSON(): LayoutItemNode {
    return new LayoutItemNode();
  }
  exportJSON(): SerializedLayoutItemNode {
    return { ...super.exportJSON(), type: "layoutitem", version: 1 };
  }
  constructor(key?: NodeKey) {
    super(key);
  }
  createDOM(): HTMLElement {
    const el = document.createElement("div");
    el.className = "flex flex-col";
    return el;
  }
  updateDOM(): boolean {
    return false;
  }
  decorate(): JSX.Element | null {
    return null;
  }
}

export function $createLayoutItemNode(): LayoutItemNode {
  return new LayoutItemNode();
}

export function $isLayoutItemNode(node: unknown): node is LayoutItemNode {
  return node instanceof LayoutItemNode;
}

