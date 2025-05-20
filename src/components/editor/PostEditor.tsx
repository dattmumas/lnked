"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import {
  LexicalComposer,
  type InitialConfigType,
} from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { TRANSFORMERS } from "@lexical/markdown";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { $getSelection, createCommand } from "lexical";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { CodeNode, CodeHighlightNode } from "@lexical/code";
import { TableNode, TableRowNode, TableCellNode } from "@lexical/table";
import { LinkNode, AutoLinkNode } from "@lexical/link";
import {
  AutoLinkPlugin,
  createLinkMatcherWithRegExp,
} from "@lexical/react/LexicalAutoLinkPlugin";
// Import custom nodes
import { PollNode, $createPollNode } from "./nodes/PollNode";
import { ExcalidrawNode, $createExcalidrawNode } from "./nodes/ExcalidrawNode";
import { STICKY_COLORS, StickyNode } from "./nodes/StickyNode";
import { ImageNode } from "./nodes/ImageNode";
import { InlineImageNode } from "./nodes/InlineImageNode";
import { TweetNode } from "./nodes/TweetNode";
import { YouTubeNode } from "./nodes/YouTubeNode";
import { PageBreakNode } from "./nodes/PageBreakNode";
import { LayoutContainerNode } from "./nodes/LayoutContainerNode";
import { LayoutItemNode } from "./nodes/LayoutItemNode";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import Toolbar from "./Toolbar";
import FloatingLinkEditorPlugin from "./plugins/FloatingLinkEditorPlugin";
import CodeHighlightPlugin from "./plugins/CodeHighlightPlugin";
import { CollapsibleContainerNode } from "./nodes/CollapsibleContainerNode";
import { HashtagNode } from "./nodes/HashtagNode";
import EmbedUrlModal from "./EmbedUrlModal";
import {
  LexicalTypeaheadMenuPlugin,
  useBasicTypeaheadTriggerMatch,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";
import type { LexicalEditor } from "lexical";
import { $insertNodeToNearestRoot } from "@lexical/utils";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";

const editorNodes = [
  HeadingNode,
  ListNode,
  ListItemNode,
  QuoteNode,
  CodeNode,
  CodeHighlightNode,
  TableNode,
  TableRowNode,
  TableCellNode,
  HorizontalRuleNode,
  LinkNode,
  AutoLinkNode,
  // Custom nodes
  PollNode, // Poll block
  ExcalidrawNode, // Excalidraw drawing
  StickyNode, // Sticky note
  ImageNode, // Block image
  InlineImageNode, // Inline image
  TweetNode, // Tweet embed
  YouTubeNode, // YouTube embed
  PageBreakNode, // Page break
  LayoutContainerNode, // Columns container
  LayoutItemNode, // Column item
  CollapsibleContainerNode, // Collapsible section
  HashtagNode, // Hashtag text
];

// Custom insert commands
export const INSERT_POLL_COMMAND = createCommand("INSERT_POLL_COMMAND");
export const INSERT_EXCALIDRAW_COMMAND = createCommand(
  "INSERT_EXCALIDRAW_COMMAND"
);
export const INSERT_STICKY_COMMAND = createCommand("INSERT_STICKY_COMMAND");
export const INSERT_IMAGE_COMMAND = createCommand("INSERT_IMAGE_COMMAND");
export const INSERT_INLINE_IMAGE_COMMAND = createCommand(
  "INSERT_INLINE_IMAGE_COMMAND"
);
export const INSERT_TWEET_COMMAND = createCommand("INSERT_TWEET_COMMAND");
export const INSERT_YOUTUBE_COMMAND = createCommand("INSERT_YOUTUBE_COMMAND");
export const INSERT_PAGE_BREAK_COMMAND = createCommand(
  "INSERT_PAGE_BREAK_COMMAND"
);
export const INSERT_LAYOUT_COMMAND = createCommand("INSERT_LAYOUT_COMMAND");
export const INSERT_HEADING_COMMAND = createCommand("INSERT_HEADING_COMMAND");
export const INSERT_PARAGRAPH_COMMAND = createCommand(
  "INSERT_PARAGRAPH_COMMAND"
);
export const INSERT_QUOTE_COMMAND = createCommand("INSERT_QUOTE_COMMAND");
export const INSERT_CODE_COMMAND = createCommand("INSERT_CODE_COMMAND");
export const INSERT_TABLE_COMMAND = createCommand("INSERT_TABLE_COMMAND");
export const INSERT_HR_COMMAND = createCommand("INSERT_HR_COMMAND");

// URL and email matchers for AutoLinkPlugin
const URL_MATCHER = createLinkMatcherWithRegExp(
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi
);
const EMAIL_MATCHER = createLinkMatcherWithRegExp(
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
  (text: string) => `mailto:${text}`
);
const MATCHERS = [URL_MATCHER, EMAIL_MATCHER];

function lexicalEditorOnError(error: Error) {
  console.error("Lexical editor error:", error);
}

interface PostEditorProps {
  initialContentJSON?: string;
  placeholder?: string;
  onContentChange?: (json: string) => void;
}

function LoadInitialJsonPlugin({ json }: { json: string }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (!json) return;
    // Defer setEditorState to avoid flushSync error
    setTimeout(() => {
      try {
        editor.setEditorState(editor.parseEditorState(json));
      } catch (error) {
        console.error("Error parsing initial JSON content:", error);
      }
    }, 0);
    // No cleanup needed
  }, [editor, json]);
  return null;
}

interface CustomInsertCommandsPluginProps {
  openEmbedModal: (
    type: "tweet" | "youtube" | "image" | "inlineimage",
    onSubmit: (url: string) => void
  ) => void;
}

function CustomInsertCommandsPlugin({
  openEmbedModal,
}: CustomInsertCommandsPluginProps) {
  const [editor] = useLexicalComposerContext();
  React.useEffect(() => {
    // Helper to remove "/" TextNode if present at selection
    function removeSlashTrigger() {
      editor.update(() => {
        const selection = $getSelection();
        if (selection && selection.isCollapsed && selection.isCollapsed()) {
          const nodes = selection.getNodes();
          if (nodes.length === 1) {
            const node = nodes[0];
            if (
              typeof node.getTextContent === "function" &&
              node.getTextContent() === "/"
            ) {
              node.remove();
            }
          }
        }
      });
    }
    // Poll
    const removePoll = editor.registerCommand(
      INSERT_POLL_COMMAND,
      () => {
        editor.update(() => {
          $insertNodeToNearestRoot(
            $createPollNode("Your question?", [
              { text: "Option 1", uid: "1", votes: [] },
              { text: "Option 2", uid: "2", votes: [] },
            ])
          );
        });
        removeSlashTrigger();
        return true;
      },
      0
    );
    // Sticky
    const removeSticky = editor.registerCommand(
      INSERT_STICKY_COMMAND,
      () => {
        editor.update(() => {
          $insertNodeToNearestRoot(new StickyNode("", STICKY_COLORS[0]));
        });
        removeSlashTrigger();
        return true;
      },
      0
    );
    // Excalidraw
    const removeExcalidraw = editor.registerCommand(
      INSERT_EXCALIDRAW_COMMAND,
      () => {
        editor.update(() => {
          $insertNodeToNearestRoot($createExcalidrawNode(""));
        });
        removeSlashTrigger();
        return true;
      },
      0
    );
    // Table (3x3)
    const removeTable = editor.registerCommand(
      INSERT_TABLE_COMMAND,
      () => {
        editor.update(() => {
          const selection = $getSelection();
          if (selection) {
            const table = new TableNode();
            for (let i = 0; i < 3; i++) {
              const row = new TableRowNode();
              for (let j = 0; j < 3; j++) {
                row.append(new TableCellNode());
              }
              table.append(row);
            }
            selection.insertNodes([table]);
          }
        });
        removeSlashTrigger();
        return true;
      },
      0
    );
    // Tweet
    const removeTweet = editor.registerCommand(
      INSERT_TWEET_COMMAND,
      () => {
        openEmbedModal("tweet", (url: string) => {
          $insertNodeToNearestRoot(new TweetNode(url));
          removeSlashTrigger();
        });
        return true;
      },
      0
    );
    // YouTube
    const removeYouTube = editor.registerCommand(
      INSERT_YOUTUBE_COMMAND,
      () => {
        openEmbedModal("youtube", (url: string) => {
          $insertNodeToNearestRoot(new YouTubeNode(url));
          removeSlashTrigger();
        });
        return true;
      },
      0
    );
    // Image
    const removeImage = editor.registerCommand(
      INSERT_IMAGE_COMMAND,
      () => {
        openEmbedModal("image", (url: string) => {
          $insertNodeToNearestRoot(new ImageNode(url, "Image"));
          removeSlashTrigger();
        });
        return true;
      },
      0
    );
    // Inline Image
    const removeInlineImage = editor.registerCommand(
      INSERT_INLINE_IMAGE_COMMAND,
      () => {
        openEmbedModal("inlineimage", (url: string) => {
          $insertNodeToNearestRoot(new InlineImageNode(url, "Inline Image"));
          removeSlashTrigger();
        });
        return true;
      },
      0
    );
    // HR
    const removeHR = editor.registerCommand(
      INSERT_HR_COMMAND,
      () => {
        editor.update(() => {
          const selection = $getSelection();
          if (selection) {
            selection.insertNodes([new HorizontalRuleNode()]);
          }
        });
        removeSlashTrigger();
        return true;
      },
      0
    );
    // Collapsible
    const removeCollapsible = editor.registerCommand(
      createCommand("INSERT_COLLAPSIBLE_COMMAND"),
      () => {
        editor.update(() => {
          $insertNodeToNearestRoot(new CollapsibleContainerNode(false));
        });
        removeSlashTrigger();
        return true;
      },
      0
    );
    return () => {
      removePoll();
      removeSticky();
      removeExcalidraw();
      removeTable();
      removeTweet();
      removeYouTube();
      removeImage();
      removeInlineImage();
      removeHR();
      removeCollapsible();
    };
  }, [editor, openEmbedModal]);
  return null;
}

// Slash command options for typeahead
const SLASH_OPTIONS = [
  {
    key: "paragraph",
    label: "Paragraph",
    description: "Insert a new paragraph",
    action: (editor: LexicalEditor) => {
      editor.dispatchCommand(INSERT_PARAGRAPH_COMMAND, undefined);
    },
    setRefElement: () => {},
  },
  {
    key: "heading-1",
    label: "Heading 1",
    description: "Insert heading level 1",
    action: () => {
      alert("Heading 1 action (implement block transform)");
    },
    setRefElement: () => {},
  },
  {
    key: "image-block",
    label: "Image",
    description: "Insert a block image",
    action: (editor: LexicalEditor) => {
      editor.update(() => {
        $insertNodeToNearestRoot(
          new ImageNode("https://example.com/image.jpg", "Image")
        );
      });
    },
    setRefElement: () => {},
  },
  {
    key: "image-inline",
    label: "Inline Image",
    description: "Insert an inline image",
    action: (editor: LexicalEditor) => {
      editor.update(() => {
        $insertNodeToNearestRoot(
          new InlineImageNode("https://example.com/image.jpg", "Inline Image")
        );
      });
    },
    setRefElement: () => {},
  },
  {
    key: "poll",
    label: "Poll",
    description: "Insert a poll block",
    action: (editor: LexicalEditor) => {
      editor.update(() => {
        $insertNodeToNearestRoot(
          $createPollNode("Your question?", [
            { text: "Option 1", uid: "1", votes: [] },
            { text: "Option 2", uid: "2", votes: [] },
          ])
        );
      });
    },
    setRefElement: () => {},
  },
  {
    key: "excalidraw",
    label: "Excalidraw",
    description: "Insert an Excalidraw drawing",
    action: (editor: LexicalEditor) => {
      editor.update(() => {
        $insertNodeToNearestRoot($createExcalidrawNode(""));
      });
    },
    setRefElement: () => {},
  },
  {
    key: "sticky",
    label: "Sticky Note",
    description: "Insert a sticky note",
    action: (editor: LexicalEditor) => {
      editor.update(() => {
        $insertNodeToNearestRoot(new StickyNode("", STICKY_COLORS[0]));
      });
    },
    setRefElement: () => {},
  },
  {
    key: "pagebreak",
    label: "Page Break",
    description: "Insert a page break",
    action: (editor: LexicalEditor) => {
      editor.update(() => {
        $insertNodeToNearestRoot(new PageBreakNode());
      });
    },
    setRefElement: () => {},
  },
  {
    key: "layoutcontainer",
    label: "Layout Container",
    description: "Insert a layout container",
    action: (editor: LexicalEditor) => {
      editor.update(() => {
        $insertNodeToNearestRoot(new LayoutContainerNode());
      });
    },
    setRefElement: () => {},
  },
  {
    key: "layoutitem",
    label: "Layout Item",
    description: "Insert a layout item",
    action: (editor: LexicalEditor) => {
      editor.update(() => {
        $insertNodeToNearestRoot(new LayoutItemNode());
      });
    },
    setRefElement: () => {},
  },
  {
    key: "tweet",
    label: "Tweet",
    description: "Insert a tweet embed",
    action: (editor: LexicalEditor) => {
      editor.update(() => {
        $insertNodeToNearestRoot(
          new TweetNode("https://twitter.com/example/status/123")
        );
      });
    },
    setRefElement: () => {},
  },
  {
    key: "youtube",
    label: "YouTube",
    description: "Insert a YouTube video",
    action: (editor: LexicalEditor) => {
      editor.update(() => {
        $insertNodeToNearestRoot(
          new YouTubeNode("https://youtube.com/watch?v=abc123")
        );
      });
    },
    setRefElement: () => {},
  },
  {
    key: "collapsible-container",
    label: "Collapsible Section",
    description: "Insert a collapsible section",
    action: (editor: LexicalEditor) => {
      editor.update(() => {
        $insertNodeToNearestRoot(new CollapsibleContainerNode(false));
      });
    },
    setRefElement: () => {},
  },
  {
    key: "hashtag",
    label: "Hashtag",
    description: "Insert a hashtag",
    action: (editor: LexicalEditor) => {
      editor.update(() => {
        $insertNodeToNearestRoot(new HashtagNode("#example"));
      });
    },
    setRefElement: () => {},
  },
];

function SlashTypeaheadMenu() {
  const triggerFn = useBasicTypeaheadTriggerMatch("/", { minLength: 0 });
  const [editor] = useLexicalComposerContext();
  return (
    <LexicalTypeaheadMenuPlugin
      options={SLASH_OPTIONS}
      triggerFn={triggerFn}
      onSelectOption={(option, _textNode, closeMenu) => {
        option.action(editor);
        closeMenu();
      }}
      onQueryChange={() => {}}
      menuRenderFn={(
        _anchorElementRef,
        { selectedIndex, options, selectOptionAndCleanUp }
      ) =>
        options.length > 0 ? (
          <div
            className="fixed z-[9999] bg-white border-2 border-primary shadow-lg rounded-md mt-2 w-64"
            role="menu"
            aria-label="Slash command menu"
          >
            {options.map((option, i) => (
              <div
                key={option.key}
                className={`px-4 py-2 cursor-pointer ${
                  i === selectedIndex ? "bg-muted" : ""
                }`}
                onMouseDown={() => selectOptionAndCleanUp(option)}
                role="menuitem"
                tabIndex={-1}
                aria-current={i === selectedIndex ? "true" : undefined}
              >
                <strong>{option.label}</strong>
                {option.description && (
                  <span className="ml-2 text-muted-foreground text-xs">
                    {option.description}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : null
      }
    />
  );
}

export default function PostEditor({
  initialContentJSON,
  placeholder = "Share your thoughts...",
  onContentChange,
}: PostEditorProps) {
  // Store initial content only once
  const [initialContent] = useState(initialContentJSON);
  // GIF picker feature disabled in this build

  // Modal state for embed URLs
  const [embedModal, setEmbedModal] = useState<{
    type: "tweet" | "youtube" | "image" | "inlineimage";
    open: boolean;
    onSubmit: (url: string) => void;
  } | null>(null);

  const initialConfig: InitialConfigType = {
    namespace: "LnkedPostEditor",
    onError: lexicalEditorOnError,
    nodes: editorNodes,
    theme: {
      paragraph: "editor-paragraph",
      quote: "editor-quote",
      heading: {
        h1: "editor-heading-h1",
        h2: "editor-heading-h2",
        h3: "editor-heading-h3",
      },
      code: "editor-code",
      list: {
        ul: "editor-list-ul",
        ol: "editor-list-ol",
        listitem: "editor-list-item",
      },
      link: "link",
      placeholder: "editor-placeholder",
    },
  };

  const handleOnChange = (editorState: import("lexical").EditorState) => {
    const json = JSON.stringify(editorState.toJSON());
    onContentChange?.(json);
  };

  // Helper to open the modal
  const openEmbedModal = (
    type: "tweet" | "youtube" | "image" | "inlineimage",
    onSubmit: (url: string) => void
  ) => {
    setEmbedModal({ type, open: true, onSubmit });
  };

  // Helper to close the modal
  const closeEmbedModal = () => setEmbedModal(null);

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="flex flex-col h-full">
        <Toolbar />
        <div className="relative flex-1 overflow-visible">
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="editor-input w-full min-h-[24rem] border border-border rounded-md p-4 prose dark:prose-invert focus:outline-none" />
            }
            placeholder={
              <div className="editor-placeholder">{placeholder}</div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <ListPlugin />
          <LinkPlugin />
          <AutoLinkPlugin matchers={MATCHERS} />
          <CodeHighlightPlugin />
          <OnChangePlugin onChange={handleOnChange} ignoreSelectionChange />
          <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
          <TablePlugin />
          {/* Only load initial content once on mount */}
          {initialContent && <LoadInitialJsonPlugin json={initialContent} />}
          <CustomInsertCommandsPlugin openEmbedModal={openEmbedModal} />
          <FloatingLinkEditorPlugin />
          <SlashTypeaheadMenu />
          <EmbedUrlModal
            open={!!embedModal?.open}
            label={
              embedModal?.type === "tweet"
                ? "Enter Tweet URL"
                : embedModal?.type === "youtube"
                  ? "Enter YouTube URL"
                  : embedModal?.type === "image"
                    ? "Enter Image URL"
                    : embedModal?.type === "inlineimage"
                      ? "Enter Inline Image URL"
                      : "Enter URL"
            }
            onSubmit={(url) => {
              embedModal?.onSubmit(url);
              closeEmbedModal();
            }}
            onCancel={closeEmbedModal}
          />
        </div>
      </div>
    </LexicalComposer>
  );
}
