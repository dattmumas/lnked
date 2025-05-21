import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { CodeNode } from '@lexical/code';
import { $createTextNode, TextNode } from 'lexical';
// @ts-expect-error prismjs has no type definitions
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-swift';
import 'prismjs/components/prism-kotlin';
import 'prismjs/components/prism-sql';

function getLanguageFromNode(node: CodeNode): string {
  return typeof node.getLanguage === 'function'
    ? node.getLanguage() || 'javascript'
    : 'javascript';
}

export default function CodeHighlightPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerNodeTransform(CodeNode, (node) => {
      const language = getLanguageFromNode(node);
      const text = node.getTextContent();
      if (!Prism.languages[language]) return;
      const tokens = Prism.tokenize(text, Prism.languages[language]);

      // Early exit: If the node already has the correct children, do nothing
      const children = node.getChildren();
      let needsUpdate = false;
      if (children.length !== tokens.length) {
        needsUpdate = true;
      } else {
        for (let i = 0; i < tokens.length; i++) {
          const token = tokens[i];
          const child = children[i];
          if (typeof token === 'string') {
            if (
              !(child instanceof TextNode) ||
              child.getTextContent() !== token
            ) {
              needsUpdate = true;
              break;
            }
          } else {
            const content =
              typeof token.content === 'string'
                ? token.content
                : Array.isArray(token.content)
                  ? token.content.join('')
                  : String(token.content);
            if (
              !(child instanceof TextNode) ||
              child.getTextContent() !== content ||
              (child.getLatest() as any).__className !== `token ${token.type}`
            ) {
              needsUpdate = true;
              break;
            }
          }
        }
      }
      if (!needsUpdate) return;

      // Remove all children and re-append
      children.forEach((child) => child.remove());
      tokens.forEach((token: string | Prism.Token) => {
        if (typeof token === 'string') {
          node.append($createTextNode(token));
        } else {
          const content =
            typeof token.content === 'string'
              ? token.content
              : Array.isArray(token.content)
                ? token.content.join('')
                : String(token.content);
          const textNode = $createTextNode(content);
          textNode.setStyle(`token ${token.type}`);
          node.append(textNode);
        }
      });
    });
  }, [editor]);

  return null;
}
