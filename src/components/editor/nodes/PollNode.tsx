/*
 * PollNode for Lnked, adapted from Lexical Playground (MIT License)
 * https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/nodes/PollNode.tsx
 */
import { DecoratorNode, NodeKey, SerializedLexicalNode, Spread } from 'lexical';
import React, { useState } from 'react';
import type { JSX } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

export type PollOption = { text: string; uid: string; votes: number[] };

export type SerializedPollNode = Spread<
  {
    type: 'poll';
    version: 1;
    question: string;
    options: PollOption[];
  },
  SerializedLexicalNode
>;

export class PollNode extends DecoratorNode<JSX.Element> {
  __question: string;
  __options: PollOption[];

  static getType() {
    return 'poll';
  }
  static clone(node: PollNode) {
    return new PollNode(node.__question, [...node.__options], node.__key);
  }
  static importJSON(serialized: SerializedPollNode) {
    return new PollNode(serialized.question, serialized.options);
  }
  exportJSON(): SerializedPollNode {
    return {
      ...super.exportJSON(),
      type: 'poll',
      version: 1,
      question: this.__question,
      options: this.__options,
    };
  }
  constructor(
    question: string = '',
    options: PollOption[] = [],
    key?: NodeKey,
  ) {
    super(key);
    this.__question = question;
    this.__options = options;
  }
  createDOM(): HTMLElement {
    const container = document.createElement('div');
    container.setAttribute('data-lexical-poll-question', this.__question);
    container.setAttribute(
      'data-lexical-poll-options',
      JSON.stringify(this.__options),
    );
    return container;
  }
  updateDOM(): boolean {
    return false;
  }
  decorate(): JSX.Element {
    return (
      <PollComponent
        question={this.__question}
        options={this.__options}
        nodeKey={this.getKey()}
      />
    );
  }
}

export function $createPollNode(
  question: string,
  options: PollOption[],
): PollNode {
  return new PollNode(question, options);
}
export function $isPollNode(node: unknown): node is PollNode {
  return node instanceof PollNode;
}

function PollComponent({
  question,
  options,
  nodeKey,
}: {
  question: string;
  options: PollOption[];
  nodeKey: NodeKey;
}) {
  const [editor] = useLexicalComposerContext();
  const [localQuestion, setLocalQuestion] = useState(question);
  const [localOptions, setLocalOptions] = useState(options);

  // Update node in editor
  const updateNode = (newQuestion: string, newOptions: PollOption[]) => {
    editor.update(() => {
      const pollNode = editor._editorState._nodeMap.get(nodeKey) as
        | PollNode
        | undefined;
      if (pollNode) {
        const writable = pollNode.getWritable();
        writable.__question = newQuestion;
        writable.__options = newOptions;
      }
    });
  };

  const handleQuestionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalQuestion(e.target.value);
    updateNode(e.target.value, localOptions);
  };

  const handleOptionChange = (idx: number, value: string) => {
    const newOptions = localOptions.map((opt, i) =>
      i === idx ? { ...opt, text: value } : opt,
    );
    setLocalOptions(newOptions);
    updateNode(localQuestion, newOptions);
  };

  const handleAddOption = () => {
    const newOption = {
      text: '',
      uid: Math.random().toString(36).slice(2),
      votes: [],
    };
    const newOptions = [...localOptions, newOption];
    setLocalOptions(newOptions);
    updateNode(localQuestion, newOptions);
  };

  const handleRemoveOption = (idx: number) => {
    const newOptions = localOptions.filter((_, i) => i !== idx);
    setLocalOptions(newOptions);
    updateNode(localQuestion, newOptions);
  };

  return (
    <div className="border rounded p-3 bg-muted">
      <input
        className="font-semibold mb-2 w-full border-b bg-transparent outline-none"
        value={localQuestion}
        onChange={handleQuestionChange}
        placeholder="Poll question..."
      />
      <ul className="list-disc ml-5 mt-2">
        {localOptions.map((opt, idx) => (
          <li key={opt.uid} className="flex items-center mb-1">
            <input
              className="border-b bg-transparent outline-none flex-1 mr-2"
              value={opt.text}
              onChange={(e) => handleOptionChange(idx, e.target.value)}
              placeholder={`Option ${idx + 1}`}
            />
            <button
              type="button"
              className="text-xs text-destructive ml-1"
              onClick={() => handleRemoveOption(idx)}
              disabled={localOptions.length <= 2}
              title="Remove option"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="mt-2 px-2 py-1 bg-accent text-accent-foreground rounded text-xs"
        onClick={handleAddOption}
      >
        + Add Option
      </button>
    </div>
  );
}
