import { createContext, useContext } from 'react';

import type { Editor } from '@tiptap/core';

// Create a read-only interface to prevent mutations
type ReadOnlyEditor = Pick<
  Editor,
  | 'isActive'
  | 'can'
  | 'getHTML'
  | 'getText'
  | 'getJSON'
  | 'getAttributes'
  | 'chain'
  | 'commands'
> & {
  readonly state: Editor['state'];
  readonly view: Editor['view'];
  // Add commonly used methods as properties
  readonly setContent: (content: string, emitUpdate?: boolean) => void;
  readonly destroy: () => void;
  readonly isFocused: boolean;
  readonly isEmpty: boolean;
  readonly isEditable: boolean;
};

export const EditorContext = createContext<ReadOnlyEditor | null>(null);

/** Access the TipTap Editor instance provided by EditorProvider */
export function useEditorContext(): ReadOnlyEditor | null {
  return useContext(EditorContext);
}

/** Create a read-only wrapper for the editor to prevent external mutations */
export function createReadOnlyEditor(editor: Editor): ReadOnlyEditor {
  return {
    isActive: editor.isActive.bind(editor),
    can: editor.can.bind(editor),
    getHTML: editor.getHTML.bind(editor),
    getText: editor.getText.bind(editor),
    getJSON: editor.getJSON.bind(editor),
    getAttributes: editor.getAttributes.bind(editor),
    chain: editor.chain.bind(editor),
    commands: editor.commands,
    state: editor.state,
    view: editor.view,
    setContent: (content: string, emitUpdate?: boolean) => {
      editor.commands.setContent(content, emitUpdate);
    },
    destroy: () => editor.destroy(),
    get isFocused() {
      return editor.isFocused;
    },
    get isEmpty() {
      return editor.isEmpty;
    },
    get isEditable() {
      return editor.isEditable;
    },
  };
}
