/*
 * ExcalidrawNode for Lnked, adapted from Lexical Playground (MIT License)
 * https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/nodes/ExcalidrawNode.tsx
 */
import { DecoratorNode, NodeKey } from "lexical";
import type { JSX } from "react";
import React, { useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type {
  ExcalidrawImperativeAPI,
  AppState,
  BinaryFiles,
} from "@excalidraw/excalidraw/dist/types/excalidraw/types";
import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/dist/types/excalidraw/element/types";
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
    el.style.background = "#f8fafc";
    el.style.border = "1px solid #e5e7eb";
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
    (
      elements: readonly OrderedExcalidrawElement[],
      appState: AppState,
      files: BinaryFiles
    ) => {
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
      background: "#f8fafc",
      border: "1px solid #e5e7eb",
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
