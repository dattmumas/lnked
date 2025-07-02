import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';

interface SlashSuggestionConfig {
  char: string;
  items?: (args: { query: string }) => unknown[];
  command: (params: {
    editor: unknown;
    range: unknown;
    props: { command: (params: { editor: unknown; range: unknown }) => void };
  }) => void;
  render?: () => {
    onStart?: (...args: unknown[]) => void;
    onUpdate?: (...args: unknown[]) => void;
    onKeyDown?: (...args: unknown[]) => boolean;
    onExit?: () => void;
  };
}

interface SlashCommandOptions {
  suggestion: SlashSuggestionConfig;
}

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({
          editor,
          range,
          props,
        }: {
          editor: unknown;
          range: unknown;
          props: {
            command: (params: { editor: unknown; range: unknown }) => void;
          };
        }) => {
          props.command({ editor, range });
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
