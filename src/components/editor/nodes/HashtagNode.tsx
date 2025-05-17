import { TextNode, SerializedTextNode, Spread } from "lexical";
import type { EditorConfig } from "lexical";

export type SerializedHashtagNode = Spread<
  {
    type: "hashtag";
    version: 1;
  },
  SerializedTextNode
>;

export class HashtagNode extends TextNode {
  static getType() {
    return "hashtag";
  }
  static clone(node: HashtagNode) {
    return new HashtagNode(node.__text);
  }
  static importJSON(serialized: SerializedHashtagNode) {
    return new HashtagNode(serialized.text);
  }
  exportJSON(): SerializedHashtagNode {
    return {
      ...super.exportJSON(),
      type: "hashtag",
      version: 1,
    };
  }
  createDOM(config: EditorConfig): HTMLElement {
    const el = super.createDOM(config);
    el.classList.add("hashtag");
    return el;
  }
}
