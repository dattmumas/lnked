/*
 * ExcalidrawNode for Lnked, adapted from Lexical Playground (MIT License)
 * https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/nodes/ExcalidrawNode.tsx
 */
import { DecoratorNode, NodeKey } from "lexical";
import type { JSX } from "react";
import React, { useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getNodeByKey } from "lexical";

// Dynamically import Excalidraw to avoid SSR issues
const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((mod) => mod.Excalidraw),
  { ssr: false }
);

export type SerializedExcalidrawNode = {
  type: "excalidraw";
  version: 1;
  data: string; // JSON string of drawing data
};

// Workaround: ExcalidrawImperativeAPI type cannot be imported due to package export issues
// https://github.com/excalidraw/excalidraw/issues/4867
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalidrawImperativeAPI = any;

// TODO: Implement ExcalidrawNode logic, import/export, and React component
export class ExcalidrawNode extends DecoratorNode<JSX.Element> {
  __data: string;

  static getType() {
    return "excalidraw";
  }
  static clone(node: ExcalidrawNode) {
    return new ExcalidrawNode(node.__data, node.__key);
  }
  static importJSON(serialized: SerializedExcalidrawNode) {
    return new ExcalidrawNode(serialized.data);
  }
  exportJSON(): SerializedExcalidrawNode {
    return {
      type: "excalidraw",
      version: 1,
      data: this.__data,
    };
  }
  constructor(data: string = "", key?: NodeKey) {
    super(key);
    this.__data = data;
  }
  createDOM(): HTMLElement {
    const el = document.createElement("div");
    el.className = "excalidraw-node";
    el.style.minHeight = "300px";
    el.style.width = "100%";
    el.style.background = "hsl(var(--muted))";
    el.style.border = "1px solid hsl(var(--border))";
    el.style.display = "block";
    return el;
  }
  updateDOM(): boolean {
    return false;
  }
  decorate(): JSX.Element {
    return <ExcalidrawComponent data={this.__data} nodeKey={this.getKey()} />;
  }
}

interface ExcalidrawComponentProps {
  data: string;
  nodeKey: NodeKey;
}

function ExcalidrawComponent({ data, nodeKey }: ExcalidrawComponentProps) {
  const initialData = data ? JSON.parse(data) : undefined;
  const [editor] = useLexicalComposerContext();
  const excalidrawRef = useRef<ExcalidrawImperativeAPI>(null);

  // Save drawing data to node
  const handleChange = useCallback(
    (elements: readonly unknown[], appState: unknown, files: unknown) => {
      const newData = JSON.stringify({ elements, appState, files });
      // Only update if data is different
      if (newData !== data) {
        editor.update(() => {
          const node = $getNodeByKey(nodeKey);
          if (node && typeof node.getWritable === "function") {
            (node.getWritable() as ExcalidrawNode).__data = newData;
          }
        });
      }
    },
    [editor, nodeKey, data]
  );

  const excalidrawProps = {
    ref: excalidrawRef,
    initialData,
    onChange: handleChange,
    style: {
      minHeight: 300,
      width: "100%",
      background: "hsl(var(--muted))",
      border: "1px solid hsl(var(--border))",
      display: "block",
    },
  };

  return (
    <div style={{ minHeight: 300, width: "100%" }}>
      <Excalidraw {...excalidrawProps} />
    </div>
  );
}

// Helper for slash menu/toolbar
export function $createExcalidrawNode(data: string): ExcalidrawNode {
  return new ExcalidrawNode(data);
}
export function $isExcalidrawNode(node: unknown): node is ExcalidrawNode {
  return node instanceof ExcalidrawNode;
}
