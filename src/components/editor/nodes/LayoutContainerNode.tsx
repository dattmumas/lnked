/*
 * LayoutContainerNode for Lnked, adapted from Lexical Playground (MIT License)
 * Container node for multi-column layouts with visual guides
 */
import { ElementNode, NodeKey, SerializedElementNode, Spread } from 'lexical';
import type { JSX } from 'react';

// TODO: Implement LayoutContainerNode logic, import/export, and React component
export type SerializedLayoutContainerNode = Spread<
  {
    type: 'layoutcontainer';
    version: 1;
    columns: number;
  },
  SerializedElementNode
>;

export class LayoutContainerNode extends ElementNode {
  __columns: number;

  static getType() {
    return 'layoutcontainer';
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
      type: 'layoutcontainer',
      version: 1,
      columns: this.__columns,
    };
  }

  constructor(columns = 2, key?: NodeKey) {
    super(key);
    this.__columns = columns;
  }

  createDOM(): HTMLElement {
    const container = document.createElement('div');
    container.className =
      'layout-container grid gap-4 my-6 p-4 border-2 border-dashed border-transparent hover:border-border transition-colors duration-200';
    container.style.display = 'grid';
    container.style.gridTemplateColumns = `repeat(${this.__columns}, 1fr)`;
    container.setAttribute('data-layout-columns', this.__columns.toString());

    // Add visual indicator
    const indicator = document.createElement('div');
    indicator.className = 'text-xs text-muted-foreground mb-2 font-medium';
    indicator.textContent = `${this.__columns} Column Layout`;
    container.appendChild(indicator);

    return container;
  }

  updateDOM(prevNode: LayoutContainerNode): boolean {
    // Return true if we need to recreate the DOM element
    return prevNode.__columns !== this.__columns;
  }

  canBeEmpty(): boolean {
    return false;
  }

  canIndent(): boolean {
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
