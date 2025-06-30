import { LexicalEditor } from 'lexical';
import { $convertFromMarkdownString, TRANSFORMERS } from '@lexical/markdown';
import { PLAYGROUND_TRANSFORMERS } from '../plugins/formatting/MarkdownTransformers';

export type ContentFormat = 'json' | 'markdown' | 'auto';

export interface LoadContentOptions {
  content: string;
  format?: ContentFormat;
  transformers?: typeof TRANSFORMERS;
}

/**
 * Detects if content is Lexical JSON format
 */
export function isLexicalJSON(content: string): boolean {
  try {
    const parsed = JSON.parse(content);
    return Boolean(
      parsed &&
        typeof parsed === 'object' &&
        'root' in parsed &&
        parsed.root !== null &&
        parsed.root !== undefined,
    );
  } catch {
    return false;
  }
}

/**
 * Loads content into Lexical editor with format detection
 */
export function loadContentIntoEditor(
  editor: LexicalEditor,
  options: LoadContentOptions,
): Promise<void> {
  const {
    content,
    format = 'auto',
    transformers = PLAYGROUND_TRANSFORMERS,
  } = options;

  return new Promise((resolve, reject) => {
    if (!content || content.trim() === '') {
      resolve();
      return;
    }

    // Determine content format
    let isJson = false;
    if (format === 'auto') {
      isJson = isLexicalJSON(content);
    } else {
      isJson = format === 'json';
    }

    try {
      if (isJson) {
        // Parse as Lexical JSON
        const editorState = editor.parseEditorState(content);
        editor.setEditorState(editorState);
        resolve();
      } else {
        // Parse as Markdown
        editor.update(() => {
          $convertFromMarkdownString(content, transformers);
          resolve();
        });
      }
    } catch (error) {
      console.error('Failed to load content:', error);
      reject(error);
    }
  });
}

/**
 * Validates Lexical JSON content
 */
export function validateLexicalJSON(content: string): string | undefined {
  if (!content || content.trim() === '') {
    return undefined;
  }

  try {
    const parsed = JSON.parse(content);
    if (
      parsed &&
      typeof parsed === 'object' &&
      'root' in parsed &&
      parsed.root !== null &&
      parsed.root !== undefined
    ) {
      return content;
    }
  } catch {
    // Not valid JSON
  }

  return undefined;
}
