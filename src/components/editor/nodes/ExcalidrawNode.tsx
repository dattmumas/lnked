/*
 * ExcalidrawNode for Lnked, adapted from Lexical Playground (MIT License)
 * https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/nodes/ExcalidrawNode.tsx
 */
import { DecoratorNode, NodeKey, SerializedLexicalNode, Spread } from "lexical";
import type { JSX } from "react";
import React, { useCallback, useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getNodeByKey } from "lexical";

// Dynamically import Excalidraw to avoid SSR issues
const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((mod) => mod.Excalidraw),
  {
    ssr: false,
    loading: () => (
      <div className="excalidraw-placeholder">Loading drawing canvas...</div>
    ),
  }
);

export type SerializedExcalidrawNode = Spread<
  {
    type: "excalidraw";
    version: 1;
    data: string; // JSON string of drawing data
  },
  SerializedLexicalNode
>;

// Workaround: ExcalidrawImperativeAPI type cannot be imported due to package export issues
// https://github.com/excalidraw/excalidraw/issues/4867
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalidrawImperativeAPI = any;

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
      ...super.exportJSON(),
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
    el.style.borderRadius = "0.5rem";
    el.style.display = "block";
    el.style.position = "relative";
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
  const [editor] = useLexicalComposerContext();
  const excalidrawRef = useRef<ExcalidrawImperativeAPI>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [parsedData, setParsedData] =
    useState<Record<string, unknown>>(undefined);

  // Parse initial data
  useEffect(() => {
    if (data) {
      try {
        const parsed = JSON.parse(data);
        setParsedData(parsed);
      } catch (error) {
        console.error("Error parsing Excalidraw data:", error);
        setParsedData(undefined);
      }
    }
  }, [data]);

  // Handle component load
  useEffect(() => {
    setIsLoaded(true);
    return () => {
      setIsLoaded(false);
    };
  }, []);

  // Save drawing data to node
  const handleChange = useCallback(
    (elements: readonly unknown[], appState: unknown, files: unknown) => {
      try {
        const newData = JSON.stringify({ elements, appState, files });
        // Only update if data is different
        if (newData !== data) {
          editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            if (node instanceof ExcalidrawNode) {
              node.getWritable().__data = newData;
            }
          });
        }
      } catch (error) {
        console.error("Error saving Excalidraw data:", error);
      }
    },
    [editor, nodeKey, data]
  );

  return (
    <div
      className="excalidraw-wrapper"
      style={{ minHeight: 300, width: "100%" }}
    >
      {isLoaded ? (
        <Excalidraw
          ref={excalidrawRef}
          initialData={parsedData}
          onChange={handleChange}
          viewModeEnabled={false}
          zenModeEnabled={false}
          gridModeEnabled={false}
          theme="light"
        />
      ) : (
        <div className="excalidraw-loading">Loading drawing canvas...</div>
      )}
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
