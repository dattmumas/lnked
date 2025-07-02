'use client';

import { textblockTypeInputRule } from '@tiptap/core';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Mention from '@tiptap/extension-mention';
import Placeholder from '@tiptap/extension-placeholder';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableOfContents from '@tiptap/extension-table-of-contents';
import TableRow from '@tiptap/extension-table-row';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Typography from '@tiptap/extension-typography';
import Underline from '@tiptap/extension-underline';
import Youtube from '@tiptap/extension-youtube';
import { ReactRenderer, useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import css from 'highlight.js/lib/languages/css';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import typescript from 'highlight.js/lib/languages/typescript';
import jsx from 'highlight.js/lib/languages/xml';
import { createLowlight } from 'lowlight';
import { useRouter } from 'next/navigation';
import React, {
  useEffect,
  useMemo,
  useRef,
  useCallback,
  useState,
} from 'react';
import tippy, { type Instance, type Props } from 'tippy.js';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';

import {
  EditorContext,
  createReadOnlyEditor,
} from '@/components/editor/EditorContext';
import { EditorMenuBar } from '@/components/editor/EditorMenuBar';
import { SlashCommand } from '@/components/editor/extensions/SlashCommand';
import { slashCommandItems } from '@/components/editor/extensions/slashCommandItems';
import SlashCommandMenu from '@/components/editor/SlashCommandMenu';
import { useEnhancedAutosave } from '@/hooks/posts/useEnhancedAutosave';
import { usePostEditor } from '@/hooks/posts/usePostEditor';
import { useUser } from '@/hooks/useUser';
import { AUTO_SAVE_DEBOUNCE_MS } from '@/lib/constants/post-editor';
import { draftService } from '@/lib/services/draft-service';
import { uploadImage } from '@/lib/services/file-upload-service';
import { usePostEditorStore } from '@/lib/stores/post-editor-v2-store';

import type { Editor as CoreEditor } from '@tiptap/core';

import './tiptap-editor.css';

const lowlight = createLowlight();

// Register languages for syntax highlighting
lowlight.register('javascript', javascript);
lowlight.register('typescript', typescript);
lowlight.register('jsx', jsx);
lowlight.register('tsx', jsx); // TSX uses same highlighter as JSX
lowlight.register('css', css);
lowlight.register('json', json);
lowlight.register('markdown', markdown);

// Lightweight throttle without this-alias to satisfy eslint/no-this-alias
function throttle<TArgs extends unknown[], TReturn>(
  func: (...args: TArgs) => TReturn,
  delay: number,
): ((...args: TArgs) => void) & { cancel: () => void; flush: () => void } {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastArgs: TArgs | null = null;

  const throttled = ((...args: TArgs) => {
    lastArgs = args;

    if (timeoutId === null) {
      timeoutId = setTimeout(() => {
        if (lastArgs !== null) {
          func(...lastArgs);
        }
        timeoutId = null;
        lastArgs = null;
      }, delay);
    }
  }) as ((...args: TArgs) => void) & { cancel: () => void; flush: () => void };

  throttled.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
      lastArgs = null;
    }
  };

  throttled.flush = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      if (lastArgs !== null) {
        func(...lastArgs);
      }
      timeoutId = null;
      lastArgs = null;
    }
  };

  return throttled;
}

interface RichTextEditorProps {
  postId?: string;
}

// Image node attributes used while uploading
interface UploadingImageAttrs {
  src: string;
  alt?: string;
  title?: string;
  'data-uploading'?: 'true' | 'error' | null;
}

// Minimal typing for TipTap suggestion lifecycle
interface SuggestionProps {
  editor: CoreEditor;
  range: { from: number; to: number };
  clientRect?: (() => DOMRect | null) | null;
  [key: string]: unknown;
}

// Error Boundary for WebSocket Provider
class WebSocketErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('WebSocket Provider Error:', error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Helper to extract first image file from drag or clipboard
function getImageFile(e: DragEvent | ClipboardEvent): File | null {
  // @ts-expect-error ProseMirror uses non-standard clipboard vs dataTransfer types
  const dt: DataTransfer | null = e.clipboardData ?? e.dataTransfer ?? null;

  if (!dt) return null;

  const fromFiles = Array.from(dt.files || []).find((f) =>
    f.type.startsWith('image/'),
  );
  if (fromFiles) {
    return fromFiles;
  }

  const item = Array.from(dt.items || []).find(
    (i) => i.kind === 'file' && i.type.startsWith('image/'),
  );

  if (item) {
    const file = item.getAsFile();
    return file;
  }

  return null;
}

export default function RichTextEditor({ postId }: RichTextEditorProps) {
  const {
    formData,
    updateFormData,
    originalData,
    isDirty,
    selectedCollectives,
    collectiveSharingSettings,
  } = usePostEditorStore();
  const { user } = useUser();
  const router = useRouter();

  // State for navigation-triggered draft saving
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<
    (() => void) | null
  >(null);

  // Get tenant ID - use collective_id if present, otherwise use author_id as personal tenant
  const tenantId = formData.collective_id || user?.id || '';

  // Hook for saving to posts table
  const { savePost } = usePostEditor(postId);

  // Handlers for save draft modal
  const handleSaveDraft = useCallback(async () => {
    if (!user?.id || !formData.id) return;

    setIsSavingDraft(true);
    try {
      // Save to posts table as draft
      await savePost();

      // Clean up local draft since it's now saved to posts table
      await draftService.deleteDraft(formData.id);

      // Proceed with navigation
      if (pendingNavigation) {
        pendingNavigation();
        setPendingNavigation(null);
      }
      setShowSaveModal(false);
    } catch (error) {
      console.error('Failed to save draft:', error);
      // Don't navigate on error - let user try again
    } finally {
      setIsSavingDraft(false);
    }
  }, [user?.id, formData.id, savePost, pendingNavigation]);

  const handleDiscardDraft = useCallback(async () => {
    if (formData.id) {
      // Clean up local draft
      await draftService.deleteDraft(formData.id);
    }

    // Proceed with navigation
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
    setShowSaveModal(false);
  }, [formData.id, pendingNavigation]);

  const handleCancelNavigation = useCallback(() => {
    setPendingNavigation(null);
    setShowSaveModal(false);
  }, []);

  // Function to handle navigation attempts
  const handleNavigationAttempt = useCallback(
    (navigationFn: () => void) => {
      // Check if there are unsaved changes
      const hasContent = Boolean(
        formData.title?.trim() ||
          formData.content?.trim() ||
          (formData.contentJson &&
            Object.keys(formData.contentJson).length > 1),
      );

      if (hasContent && isDirty) {
        // Show modal to confirm saving
        setPendingNavigation(() => navigationFn);
        setShowSaveModal(true);
      } else {
        // No unsaved changes, navigate directly
        navigationFn();
      }
    },
    [formData.title, formData.content, formData.contentJson, isDirty],
  );

  const tippyInstancesRef = useRef<Set<Instance<Props>>>(new Set());
  const editorRef = useRef<CoreEditor | null>(null);
  const pendingUploadsRef = useRef<Array<() => void>>([]);

  // Refs to access current state
  const userRef = useRef(user);
  const formDataRef = useRef(formData);

  // Update refs when state changes
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // When user becomes available, retry any pending uploads
  useEffect(() => {
    if (userRef.current?.id && pendingUploadsRef.current.length > 0) {
      const uploads = [...pendingUploadsRef.current];
      pendingUploadsRef.current = [];
      uploads.forEach((upload) => upload());
    }
  }, [user?.id]);

  // Generate unique user info for collaboration
  const collaborationUser = useMemo(() => {
    const colors = [
      '#58CC02',
      '#CE82FF',
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#96CEB4',
      '#FFEAA7',
      '#DDA0DD',
    ];
    const names = [
      'Alice',
      'Bob',
      'Carol',
      'Dave',
      'Eve',
      'Frank',
      'Grace',
      'Henry',
    ];
    const userId = Math.floor(Math.random() * names.length);
    return {
      name: names[userId] || 'Anonymous',
      color: colors[userId] || '#58CC02',
    };
  }, []);

  // Throttle store updates to avoid excessive re-renders on fast typing
  const scheduleAutosave = useMemo(
    () =>
      throttle(() => {
        triggerAutoSaveRef.current?.();
      }, AUTO_SAVE_DEBOUNCE_MS),
    [],
  );

  // Setup Y.js document and provider for collaboration (only if collab enabled and have an ID)
  const ydoc = useMemo(() => new Y.Doc(), []);
  const provider = useMemo(() => {
    if (!postId) return null;

    try {
      const collabUrl = process.env['NEXT_PUBLIC_COLLAB_SERVER_URL'];

      // Only create provider if we have a valid collaboration server URL
      if (!collabUrl) {
        console.info(
          'Collaboration server URL not configured. Running in offline mode.',
        );
        return null;
      }

      return new WebsocketProvider(collabUrl, `post-${postId}`, ydoc);
    } catch (error) {
      console.error('Failed to create WebSocket provider:', error);
      return null;
    }
  }, [postId, ydoc]);

  // Use enhanced autosave with offline support and content hashing (LOCAL ONLY)
  const enhancedAutosave = useEnhancedAutosave({
    formData,
    debounceMs: AUTO_SAVE_DEBOUNCE_MS,
    enableOffline: true,
  });

  // Modified autosave - only saves locally, not to posts table
  const triggerAutoSave = useCallback(() => {
    if (!user?.id || !formData.id) {
      console.warn('Cannot autosave: missing user or post ID');
      return;
    }

    const currentContent = formData.content ?? '';
    const currentTitle = formData.title ?? '';

    // Validate that we have something to save
    if (!currentTitle.trim() && !currentContent.trim()) {
      return;
    }

    // Only trigger local saving (IndexedDB + draft sync)
    enhancedAutosave.triggerSave();
  }, [
    formData.id,
    formData.title,
    formData.content,
    user?.id,
    enhancedAutosave.triggerSave,
  ]);

  // Store trigger function in a ref so it's always available
  const triggerAutoSaveRef = useRef(triggerAutoSave);
  triggerAutoSaveRef.current = triggerAutoSave;

  // Configure TipTap extensions
  const extensions = useMemo(() => {
    const ext = [
      StarterKit.configure({
        codeBlock: false, // We'll use CodeBlockLowlight instead
        // Ensure lists are enabled
        bulletList: {
          HTMLAttributes: {
            class: 'bullet-list',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'ordered-list',
          },
        },
        listItem: {
          HTMLAttributes: {
            class: 'list-item',
          },
        },
      }),
      // Text styling extensions - must come before Color and FontFamily
      TextStyle,
      Color.configure({
        types: ['textStyle'],
      }),
      FontFamily.configure({
        types: ['textStyle'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline underline-offset-4',
        },
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Placeholder.configure({
        placeholder: 'What are you thinking?',
        showOnlyWhenEditable: true,
        showOnlyCurrent: false,
        includeChildren: true,
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'beef-task-list',
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'beef-task-list-item',
        },
      }),
      Image.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            'data-uploading': {
              default: null,
              parseHTML: (element: HTMLElement) =>
                element.getAttribute('data-uploading'),
              renderHTML: (attributes: Record<string, unknown>) => {
                if (!attributes['data-uploading']) return {};
                return { 'data-uploading': attributes['data-uploading'] };
              },
            },
            'data-id': {
              default: null,
              parseHTML: (element: HTMLElement) =>
                element.getAttribute('data-id'),
              renderHTML: (attributes: Record<string, unknown>) => {
                if (!attributes['data-id']) return {};
                return { 'data-id': attributes['data-id'] };
              },
            },
          };
        },
      }).configure({
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto',
        },
      }),
      CodeBlockLowlight.extend({
        addInputRules() {
          return [
            textblockTypeInputRule({
              find: /^```([a-z]+)?[\s\n]$/,
              type: this.type,
              getAttributes: (match) => ({
                language: match[1],
              }),
            }),
          ];
        },
      }).configure({
        lowlight,
        HTMLAttributes: {
          // Apply class to the <pre> element
          spellcheck: 'false',
          class: 'code-block',
        },
      }),
      Youtube.configure({
        // Use responsive aspect ratio via CSS
        width: 640,
        height: 360,
        HTMLAttributes: {
          class: 'rounded-lg overflow-hidden aspect-video w-full max-w-full',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-auto w-full',
        },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border p-2 font-bold bg-muted',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'border p-2',
        },
      }),
      TableOfContents.configure({
        // Basic configuration - will generate TOC from headings
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      Subscript,
      Superscript,
      Typography.configure({
        // Configure smart typography
        openDoubleQuote: '"',
        closeDoubleQuote: '"',
        openSingleQuote: "'",
        closeSingleQuote: "'",
        ellipsis: '…',
        emDash: '—',
      }),
      // BubbleMenu will be added later with proper component integration
      // Mentions
      Mention.configure({
        HTMLAttributes: {
          class: 'mention text-primary',
        },
        suggestion: {
          char: '@',
          allowSpaces: false,
          items: ({ query }: { query: string }) => {
            // Example: static suggestions (replace with API call to fetch users)
            const users = [
              { id: 'u1', label: 'Alice' },
              { id: 'u2', label: 'Bob' },
            ];
            return users.filter((u) =>
              u.label.toLowerCase().startsWith(query.toLowerCase()),
            );
          },
          command: (params: unknown) => {
            const { editor, range, props } = params as {
              editor: CoreEditor;
              range: { from: number; to: number };
              props: { label: string | null };
            };
            if (props.label) {
              editor
                .chain()
                .focus()
                .deleteRange(range)
                .insertContent(`@${props.label} `)
                .run();
            }
          },
          render: () => {
            let component: ReactRenderer | null = null;
            let tippyInstance: Instance<Props> | null = null;

            return {
              onStart: (raw: unknown) => {
                const props = raw as SuggestionProps;
                component = new ReactRenderer(SlashCommandMenu, {
                  props,
                  editor: props.editor,
                });

                if (!props.clientRect) {
                  return;
                }

                tippyInstance = tippy(document.body, {
                  getReferenceClientRect: () => {
                    if (!props.clientRect) return null;
                    const rect = props.clientRect();
                    return rect || null;
                  },
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start',
                  hideOnClick: false,
                  // Ensure proper z-index
                  zIndex: 9999,
                } as Partial<Props>);

                if (tippyInstance) {
                  tippyInstancesRef.current.add(tippyInstance);
                  tippyInstance.show();
                }
              },
              onUpdate(raw: unknown) {
                const props = raw as SuggestionProps;
                component?.updateProps(props);

                // Update tippy position when suggestion updates
                if (tippyInstance && props.clientRect) {
                  tippyInstance.setProps({
                    getReferenceClientRect: () => {
                      if (!props.clientRect) return null;
                      const rect = props.clientRect();
                      return rect || null;
                    },
                  } as Partial<Props>);
                }
              },
              onKeyDown(raw: unknown) {
                const props = raw as { event: KeyboardEvent };
                if (props.event.key === 'Escape') {
                  if (component) {
                    component.destroy();
                    component = null;
                  }
                  if (tippyInstance) {
                    tippyInstancesRef.current.delete(tippyInstance);
                    tippyInstance.destroy();
                    tippyInstance = null;
                  }
                  return true;
                }
                // Check if component ref has onKeyDown method
                const componentRef = component?.ref as {
                  onKeyDown?: (p: { event: KeyboardEvent }) => boolean;
                } | null;
                const result = componentRef?.onKeyDown?.(props) || false;
                return result;
              },
              onExit() {
                if (component) {
                  component.destroy();
                  component = null;
                }
                if (tippyInstance) {
                  tippyInstancesRef.current.delete(tippyInstance);
                  tippyInstance.destroy();
                  tippyInstance = null;
                }
              },
            };
          },
        } satisfies Record<string, unknown>,
      }),
      // Slash commands
      SlashCommand.configure({
        suggestion: {
          char: '/',
          items: ({ query }: { query: string }) => {
            const filteredItems = slashCommandItems.filter((item) =>
              item.title.toLowerCase().includes(query.toLowerCase()),
            );
            return filteredItems;
          },
          command: (params: unknown) => {
            const { editor, range, props } = params as {
              editor: CoreEditor;
              range: { from: number; to: number };
              props: {
                command: (p: {
                  editor: CoreEditor;
                  range: { from: number; to: number };
                }) => void;
              };
            };
            props.command({ editor, range });
          },
          render: () => {
            let component: ReactRenderer | null = null;
            let tippyInstance: Instance<Props> | null = null;

            return {
              onStart: (raw: unknown) => {
                const props = raw as SuggestionProps;
                component = new ReactRenderer(SlashCommandMenu, {
                  props,
                  editor: props.editor,
                });

                if (!props.clientRect) {
                  return;
                }

                tippyInstance = tippy(document.body, {
                  getReferenceClientRect: () => {
                    if (!props.clientRect) return null;
                    const rect = props.clientRect();
                    return rect || null;
                  },
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start',
                  hideOnClick: false,
                  // Ensure proper z-index
                  zIndex: 9999,
                } as Partial<Props>);

                if (tippyInstance) {
                  tippyInstancesRef.current.add(tippyInstance);
                  tippyInstance.show();
                }
              },
              onUpdate(raw: unknown) {
                const props = raw as SuggestionProps;
                component?.updateProps(props);

                // Update tippy position when suggestion updates
                if (tippyInstance && props.clientRect) {
                  tippyInstance.setProps({
                    getReferenceClientRect: () => {
                      if (!props.clientRect) return null;
                      const rect = props.clientRect();
                      return rect || null;
                    },
                  } as Partial<Props>);
                }
              },
              onKeyDown(raw: unknown) {
                const props = raw as { event: KeyboardEvent };
                if (props.event.key === 'Escape') {
                  if (component) {
                    component.destroy();
                    component = null;
                  }
                  if (tippyInstance) {
                    tippyInstancesRef.current.delete(tippyInstance);
                    tippyInstance.destroy();
                    tippyInstance = null;
                  }
                  return true;
                }
                // Forward keydown events to the component for arrow key navigation
                const componentRef = component?.ref as {
                  onKeyDown?: (p: { event: KeyboardEvent }) => boolean;
                } | null;
                const result = componentRef?.onKeyDown?.(props) || false;
                return result;
              },
              onExit() {
                if (component) {
                  component.destroy();
                  component = null;
                }
                if (tippyInstance) {
                  tippyInstancesRef.current.delete(tippyInstance);
                  tippyInstance.destroy();
                  tippyInstance = null;
                }
              },
            } satisfies Record<string, unknown>;
          },
        } satisfies Record<string, unknown>,
      }),
    ];

    if (postId && provider) {
      ext.push(Collaboration.configure({ document: ydoc }));
      ext.push(
        CollaborationCursor.configure({
          provider,
          user: collaborationUser,
        }),
      );
    }

    return ext;
  }, [postId, provider, ydoc, collaborationUser]);

  // Initialize the TipTap editor
  const editor = useEditor(
    {
      extensions,
      content: formData.content || '',
      immediatelyRender: false, // Required to prevent SSR hydration mismatches
      onCreate: ({ editor }) => {
        editorRef.current = editor;
      },
      onDestroy: () => {
        editorRef.current = null;
      },
      onUpdate: ({ editor }) => {
        try {
          const json = editor.getJSON();
          updateFormData({ contentJson: json, content: editor.getHTML() });
          scheduleAutosave();
        } catch (error) {
          console.error('Failed to update content:', error);
        }
      },
      editorProps: {
        attributes: {
          'aria-label': 'Post content',
          class:
            'prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert focus:outline-none max-w-none',
        },
        handlePaste: (_v, ev) => {
          const file = getImageFile(ev);
          if (!file) return false;
          insertAndUploadFile(file);
          ev.preventDefault();
          return true;
        },
        handleDrop: (_v, ev) => {
          const file = getImageFile(ev);

          if (!file) return false;

          insertAndUploadFile(file);
          ev.preventDefault();
          return true;
        },
        handleKeyDown: (view, event) => {
          // Prevent Tab from exiting the editor
          if (event.key === 'Tab') {
            event.preventDefault();

            // Insert 3 spaces for indentation
            const { state, dispatch } = view;
            const { tr } = state;
            dispatch(tr.insertText('   '));
            return true;
          }

          // Let other keys (including arrow keys and enter) pass through
          // This allows slash command menu navigation to work
          return false;
        },
      },
    },
    [extensions, scheduleAutosave, updateFormData],
  );

  // Load existing content from JSON (primary) or HTML (fallback) once data is ready
  useEffect(() => {
    if (editor && originalData && !isDirty) {
      if (originalData.contentJson) {
        editor.commands.setContent(originalData.contentJson, false);
      } else if (originalData.content) {
        editor.commands.setContent(originalData.content, false);
      }
    }
  }, [editor, originalData, isDirty]);

  // One-time hydration when formData becomes available after async draft load
  const hasHydratedRef = useRef(false);

  useEffect(() => {
    if (!editor || hasHydratedRef.current) return;

    if (formData.contentJson) {
      editor.commands.setContent(formData.contentJson, false);
      hasHydratedRef.current = true;
    } else if (formData.content?.trim()) {
      editor.commands.setContent(formData.content, false);
      hasHydratedRef.current = true;
    }
  }, [editor, formData.contentJson, formData.content]);

  // Flush pending updates on both component unmount *and* hard page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      scheduleAutosave.flush();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);

      // Final flush before React unmount completes
      scheduleAutosave.flush();

      // Clean up all tippy instances
      tippyInstancesRef.current.forEach((instance) => {
        instance.destroy();
      });
      tippyInstancesRef.current.clear();

      // Clean up provider
      provider?.destroy();
    };
  }, [scheduleAutosave, provider]);

  // Helper to insert placeholder and upload actual image
  const insertAndUploadFile = useCallback(
    (file: File) => {
      const currentEditor = editorRef.current;

      if (!currentEditor) {
        // Retry after a short delay in case editor is still initializing
        setTimeout(() => {
          if (editorRef.current) {
            insertAndUploadFile(file);
          }
        }, 100);
        return;
      }

      const tempUrl = URL.createObjectURL(file);
      const tempId = crypto.randomUUID();

      // Client-side size validation (5 MB limit)
      if (file.size > 5 * 1024 * 1024) {
        console.error('❌ Image exceeds 5 MB limit');
        URL.revokeObjectURL(tempUrl);
        return;
      }

      // Always insert placeholder first
      const imageAttrs = {
        src: tempUrl,
        alt: file.name,
        'data-uploading': 'true',
        'data-id': tempId,
      };

      currentEditor.chain().focus().setImage(imageAttrs).run();

      // Verify the image was inserted with correct attributes
      setTimeout(() => {
        const verifyEditor = editorRef.current;
        if (verifyEditor) {
          verifyEditor.state.doc.descendants((node, pos) => {
            if (node.type.name === 'image') {
              // Silent verification - no logging needed
            }
          });
        }
      }, 50);

      // Function to attempt upload when ready
      const attemptUpload = () => {
        // Get current user and formData from refs
        const currentUser = userRef.current;
        const currentFormData = formDataRef.current;

        if (!currentUser?.id || !currentFormData.id) {
          if (!currentUser?.id) {
            pendingUploadsRef.current.push(attemptUpload);
            return;
          } else {
            setTimeout(attemptUpload, 1000);
            return;
          }
        }

        uploadImage({
          file,
          userId: currentUser.id,
          draftId: currentFormData.id,
        })
          .then((publicUrl) => {
            let found = false;

            // Walk the doc; update only the node with matching tempId
            const updateEditor = editorRef.current;
            if (updateEditor) {
              updateEditor.state.doc.descendants((node, pos) => {
                if (found) return false; // early exit

                if (node.type.name === 'image') {
                  const nodeId = (
                    node.attrs as UploadingImageAttrs & { 'data-id'?: string }
                  )['data-id'];

                  if (nodeId === tempId) {
                    updateEditor
                      .chain()
                      .focus()
                      .command(({ tr }) => {
                        // Update attributes directly in the transaction
                        const currentAttrs =
                          node.attrs as UploadingImageAttrs & {
                            'data-id'?: string;
                          };
                        const { 'data-id': _, ...nodeAttrs } = {
                          ...currentAttrs,
                          src: publicUrl,
                          'data-uploading': null,
                        };
                        tr.setNodeMarkup(pos, undefined, nodeAttrs);
                        return true;
                      })
                      .run();
                    found = true;
                    return false; // stop traversal
                  }
                }
                return true;
              });
            }

            if (!found) {
              console.warn(
                '❌ Uploaded image node not found; something moved it.',
                { tempId, totalImageNodes: 'counted above' },
              );
            }
          })
          .catch((err) => {
            console.error('❌ Image upload failed', {
              error: err,
              tempId,
              fileName: file.name,
            });

            // Mark the node with matching tempId as error
            const errorEditor = editorRef.current;
            if (errorEditor) {
              errorEditor.state.doc.descendants((node, pos) => {
                if (
                  node.type.name === 'image' &&
                  (node.attrs as UploadingImageAttrs & { 'data-id'?: string })[
                    'data-id'
                  ] === tempId
                ) {
                  errorEditor
                    .chain()
                    .focus()
                    .command(({ tr }) => {
                      // Mark as error instead of removing, so user knows what happened
                      const nodeAttrs: UploadingImageAttrs & {
                        'data-id'?: string;
                      } = {
                        ...(node.attrs as UploadingImageAttrs & {
                          'data-id'?: string;
                        }),
                        'data-uploading': 'error',
                      };
                      tr.setNodeMarkup(pos, undefined, nodeAttrs);
                      return true;
                    })
                    .run();
                }
              });
            }
          })
          .finally(() => {
            URL.revokeObjectURL(tempUrl);
          });
      };

      // Start upload attempt
      attemptUpload();
    },
    [], // Empty dependency array since we're using refs
  );

  if (!editor) {
    return (
      <div className="rounded-lg p-4 text-sm text-muted-foreground animate-pulse bg-card">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
          <span>Loading editor…</span>
        </div>
      </div>
    );
  }

  return (
    <WebSocketErrorBoundary
      fallback={
        <div className="rounded-lg p-4 text-sm text-red-500 bg-red-50 border border-red-200">
          Failed to connect to collaboration server. Editor will work in offline
          mode.
        </div>
      }
    >
      <EditorContext.Provider value={createReadOnlyEditor(editor)}>
        <div className="editor">
          <EditorMenuBar />
          <div className="p-4">
            <EditorContent
              editor={editor}
              className="tiptap max-w-none [&>div]:min-h-[200px] [&>div:focus]:outline-none [&>div:focus-visible]:outline-none"
            />
          </div>
        </div>
      </EditorContext.Provider>
    </WebSocketErrorBoundary>
  );
}
