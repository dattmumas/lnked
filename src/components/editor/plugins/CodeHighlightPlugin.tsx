import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { CodeNode } from "@lexical/code";
import { $createTextNode } from "lexical";
// @ts-expect-error prismjs has no type definitions
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-css";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-json";
import "prismjs/components/prism-python";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-java";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-go";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-php";
import "prismjs/components/prism-ruby";
import "prismjs/components/prism-swift";
import "prismjs/components/prism-kotlin";
import "prismjs/components/prism-sql";

function getLanguageFromNode(node: CodeNode): string {
  return typeof node.getLanguage === "function"
    ? node.getLanguage() || "javascript"
    : "javascript";
}

export default function CodeHighlightPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerNodeTransform(CodeNode, (node) => {
      const language = getLanguageFromNode(node);
      const text = node.getTextContent();
      if (!Prism.languages[language]) return;
      const tokens = Prism.tokenize(text, Prism.languages[language]);
      // Remove all children
      node.getChildren().forEach((child) => child.remove());
      // Convert Prism tokens to Lexical TextNodes
      tokens.forEach((token: string | Prism.Token) => {
        if (typeof token === "string") {
          node.append($createTextNode(token));
        } else {
          // Prism token: { type, content }
          const content =
            typeof token.content === "string"
              ? token.content
              : Array.isArray(token.content)
              ? token.content.join("")
              : String(token.content);
          const textNode = $createTextNode(content);
          // Set style/class for Prism token type
          // Lexical theme should style .token.<type>
          textNode.setStyle(`token ${token.type}`);
          node.append(textNode);
        }
      });
    });
  }, [editor]);

  return null;
}
