/*
 * LayoutItemNode for Lnked, adapted from Lexical Playground (MIT License)
 * Individual column item within a layout container
 */
import { ElementNode, NodeKey, SerializedElementNode, Spread } from 'lexical';
import type { JSX } from 'react';

// TODO: Implement LayoutItemNode logic, import/export, and React component
export type SerializedLayoutItemNode = Spread<
  {
    type: 'layoutitem';
    version: 1;
  },
  SerializedElementNode
>;

export class LayoutItemNode extends ElementNode {
  static getType() {
    return 'layoutitem';
  }
  static clone(node: LayoutItemNode) {
    return new LayoutItemNode(node.__key);
  }
  static importJSON(): LayoutItemNode {
    return new LayoutItemNode();
  }
  exportJSON(): SerializedLayoutItemNode {
    return { ...super.exportJSON(), type: 'layoutitem', version: 1 };
  }
  constructor(key?: NodeKey) {
    super(key);
  }
  createDOM(): HTMLElement {
    const el = document.createElement('div');
    el.className =
      'layout-item min-h-[100px] p-4 border border-dashed border-transparent hover:border-border hover:bg-muted/30 transition-all duration-200 rounded-md';

    // Add empty state indicator
    const emptyIndicator = document.createElement('div');
    emptyIndicator.className =
      'empty-indicator text-muted-foreground text-sm italic opacity-0 pointer-events-none';
    emptyIndicator.textContent = 'Click to add content...';
    el.appendChild(emptyIndicator);

    return el;
  }
  updateDOM(): boolean {
    return false;
  }
  decorate(): JSX.Element | null {
    return null;
  }
  canBeEmpty(): boolean {
    return true;
  }
  isShadowRoot(): boolean {
    return false;
  }
  canInsertTextBefore(): boolean {
    return false;
  }
  canInsertTextAfter(): boolean {
    return false;
  }
}

export function $createLayoutItemNode(): LayoutItemNode {
  return new LayoutItemNode();
}

export function $isLayoutItemNode(node: unknown): node is LayoutItemNode {
  return node instanceof LayoutItemNode;
}
