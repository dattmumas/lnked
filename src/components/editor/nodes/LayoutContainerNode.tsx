/*
 * LayoutContainerNode for Lnked, adapted from Lexical Playground (MIT License)
 * https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/nodes/LayoutContainerNode.tsx
 */
import {
  ElementNode,
  NodeKey,
  SerializedElementNode,
  Spread,
} from "lexical";
import type { JSX } from "react";

// TODO: Implement LayoutContainerNode logic, import/export, and React component
export type SerializedLayoutContainerNode = Spread<
  {
    type: "layoutcontainer";
    version: 1;
    columns: number;
  },
  SerializedElementNode
>;

export class LayoutContainerNode extends ElementNode {
  __columns: number;
  static getType() {
    return "layoutcontainer";
  }
  static clone(node: LayoutContainerNode) {
    return new LayoutContainerNode(node.__columns, node.__key);
  }
  static importJSON(serialized: SerializedLayoutContainerNode) {
    return new LayoutContainerNode(serialized.columns);
  }
  exportJSON(): SerializedLayoutContainerNode {
    return {
      ...super.exportJSON(),
      type: "layoutcontainer",
      version: 1,
      columns: this.__columns,
    };
  }
  constructor(columns = 2, key?: NodeKey) {
    super(key);
    this.__columns = columns;
  }
  createDOM(): HTMLElement {
    const container = document.createElement("div");
    container.className = "grid gap-4";
    container.style.display = "grid";
    container.style.gridTemplateColumns = `repeat(${this.__columns}, 1fr)`;
    return container;
  }
  updateDOM(): boolean {
    return false;
  }
  decorate(): JSX.Element | null {
    return null;
  }
}

export function $createLayoutContainerNode(columns = 2): LayoutContainerNode {
  return new LayoutContainerNode(columns);
}

export function $isLayoutContainerNode(
  node: unknown,
): node is LayoutContainerNode {
  return node instanceof LayoutContainerNode;
}

