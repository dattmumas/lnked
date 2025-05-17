/*
 * StickyNode for Lnked, adapted from Lexical Playground (MIT License)
 * https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/nodes/StickyNode.tsx
 */
import { DecoratorNode, NodeKey } from "lexical";
import type { JSX } from "react";
import React, { useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

export const STICKY_COLORS = [
  "#fff475", // yellow
  "#fbbc04", // orange
  "#ccff90", // green
  "#a7ffeb", // teal
  "#cbf0f8", // blue
  "#d7aefb", // purple
  "#fdcfe8", // pink
  "#e6c9a8", // brown
  "#e8eaed", // gray
];

export interface StickyNodeSerialized {
  type: "sticky";
  version: 1;
  text?: string;
  color?: string;
}

export class StickyNode extends DecoratorNode<JSX.Element> {
  __text: string;
  __color: string;

  static getType() {
    return "sticky";
  }
  static clone(node: StickyNode) {
    return new StickyNode(node.__text, node.__color, node.__key);
  }
  static importJSON(serialized: StickyNodeSerialized) {
    return new StickyNode(
      serialized.text ?? "",
      serialized.color ?? STICKY_COLORS[0]
    );
  }
  exportJSON() {
    return {
      ...super.exportJSON(),
      type: "sticky",
      version: 1,
      text: this.__text,
      color: this.__color,
    };
  }
  constructor(
    text: string = "",
    color: string = STICKY_COLORS[0],
    key?: NodeKey
  ) {
    super(key);
    this.__text = text;
    this.__color = color;
  }
  createDOM(): HTMLElement {
    const el = document.createElement("div");
    el.textContent = this.__text;
    el.style.background = this.__color;
    el.style.padding = "1em";
    el.style.borderRadius = "0.5em";
    el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
    return el;
  }
  updateDOM(): boolean {
    return false;
  }
  decorate(): JSX.Element {
    return (
      <StickyComponent
        text={this.__text}
        color={this.__color}
        nodeKey={this.getKey()}
      />
    );
  }
}

function StickyComponent({
  text,
  color,
  nodeKey,
}: {
  text: string;
  color: string;
  nodeKey: NodeKey;
}) {
  const [editor] = useLexicalComposerContext();
  const [localText, setLocalText] = useState(text);
  const [localColor, setLocalColor] = useState(color);

  const updateNode = (newText: string, newColor: string) => {
    editor.update(() => {
      editor.getEditorState().read(() => {
        const stickyNode = editor._editorState._nodeMap.get(nodeKey) as
          | StickyNode
          | undefined;
        if (stickyNode) {
          stickyNode.__text = newText;
          stickyNode.__color = newColor;
        }
      });
    });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalText(e.target.value);
    updateNode(e.target.value, localColor);
  };

  const handleColorChange = (newColor: string) => {
    setLocalColor(newColor);
    updateNode(localText, newColor);
  };

  return (
    <div
      className="rounded shadow p-3 mb-2"
      style={{
        background: localColor,
        minHeight: 80,
        minWidth: 180,
        maxWidth: 320,
      }}
    >
      <textarea
        className="w-full bg-transparent outline-none resize-none font-medium text-base"
        value={localText}
        onChange={handleTextChange}
        rows={3}
        placeholder="Sticky note..."
        style={{ background: "transparent" }}
      />
      <div className="flex gap-1 mt-2">
        {STICKY_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className={`w-5 h-5 rounded-full border-2 ${
              localColor === c ? "border-blue-500" : "border-transparent"
            }`}
            style={{ background: c }}
            onClick={() => handleColorChange(c)}
            aria-label={`Set color ${c}`}
          />
        ))}
      </div>
    </div>
  );
}
