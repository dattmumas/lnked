import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { CodeNode, CodeHighlightNode } from "@lexical/code";
// @ts-expect-error: No types for prismjs
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

function getLanguageFromNode(node: CodeNode | CodeHighlightNode): string {
  if (node instanceof CodeNode) {
    return typeof node.getLanguage === "function"
      ? node.getLanguage() || "javascript"
      : "javascript";
  }
  // CodeHighlightNode does not have getLanguage; fallback
  return "javascript";
}

export default function CodeHighlightPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerNodeTransform(CodeHighlightNode, (node) => {
      const language = getLanguageFromNode(node);
      const text = node.getTextContent();
      if (Prism.languages[language]) {
        const html = Prism.highlight(text, Prism.languages[language], language);
        // @ts-expect-error: __highlighted and setHighlight are not typed
        if (node.getLatest().__highlighted !== html) {
          // @ts-expect-error: setHighlight may not exist on CodeHighlightNode
          node.setHighlight(html);
        }
      }
    });
  }, [editor]);

  useEffect(() => {
    return editor.registerNodeTransform(CodeNode, (node) => {
      const language = getLanguageFromNode(node);
      const text = node.getTextContent();
      if (Prism.languages[language]) {
        const html = Prism.highlight(text, Prism.languages[language], language);
        // @ts-expect-error: __highlighted and setHighlight are not typed
        if (node.getLatest().__highlighted !== html) {
          // @ts-expect-error: setHighlight may not exist on CodeNode
          node.setHighlight?.(html);
        }
      }
    });
  }, [editor]);

  return null;
}
