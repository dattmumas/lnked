import { ElementNode, NodeKey, SerializedElementNode, Spread } from "lexical";
import type { JSX } from "react";

export type SerializedCollapsibleContainerNode = Spread<
  {
    type: "collapsible-container";
    version: 1;
    collapsed: boolean;
  },
  SerializedElementNode
>;

export class CollapsibleContainerNode extends ElementNode {
  __collapsed: boolean;

  static getType() {
    return "collapsible-container";
  }
  static clone(node: CollapsibleContainerNode) {
    return new CollapsibleContainerNode(node.__collapsed, node.__key);
  }
  static importJSON(serialized: SerializedCollapsibleContainerNode) {
    return new CollapsibleContainerNode(serialized.collapsed);
  }
  exportJSON(): SerializedCollapsibleContainerNode {
    return {
      ...super.exportJSON(),
      type: "collapsible-container",
      version: 1,
      collapsed: this.__collapsed,
    };
  }
  constructor(collapsed = false, key?: NodeKey) {
    super(key);
    this.__collapsed = collapsed;
  }
  createDOM(): HTMLElement {
    const container = document.createElement("div");
    container.className = "collapsible-container";
    container.setAttribute(
      "data-collapsed",
      this.__collapsed ? "true" : "false"
    );
    // Add toggle button
    const button = document.createElement("button");
    button.className = "collapsible-trigger";
    button.textContent = this.__collapsed ? "▶" : "▼";
    button.onclick = (e) => {
      e.preventDefault();
      this.__collapsed = !this.__collapsed;
      container.setAttribute(
        "data-collapsed",
        this.__collapsed ? "true" : "false"
      );
      button.textContent = this.__collapsed ? "▶" : "▼";
      // Hide/show children
      for (const child of Array.from(container.children)) {
        if (!child.classList.contains("collapsible-trigger")) {
          (child as HTMLElement).style.display = this.__collapsed ? "none" : "";
        }
      }
    };
    container.appendChild(button);
    return container;
  }
  updateDOM(prevNode: CollapsibleContainerNode, dom: HTMLElement): boolean {
    dom.setAttribute("data-collapsed", this.__collapsed ? "true" : "false");
    const button = dom.querySelector(
      ".collapsible-trigger"
    ) as HTMLButtonElement;
    if (button) button.textContent = this.__collapsed ? "▶" : "▼";
    for (const child of Array.from(dom.children)) {
      if (!child.classList.contains("collapsible-trigger")) {
        (child as HTMLElement).style.display = this.__collapsed ? "none" : "";
      }
    }
    return false;
  }
  // Children are rendered as normal Lexical children
  decorate(): JSX.Element | null {
    return null;
  }
}
