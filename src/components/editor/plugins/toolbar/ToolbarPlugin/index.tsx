/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */


import {
  $isCodeNode,
  CODE_LANGUAGE_FRIENDLY_NAME_MAP,
  CODE_LANGUAGE_MAP,
  getLanguageFriendlyName,
} from '@lexical/code';
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $isListNode, ListNode } from '@lexical/list';
import { INSERT_EMBED_COMMAND } from '@lexical/react/LexicalAutoEmbedPlugin';
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode';
import { $isHeadingNode } from '@lexical/rich-text';
import {
  $getSelectionStyleValueForProperty,
  $isParentElementRTL,
  $patchStyleText,
} from '@lexical/selection';
import { $isTableNode, $isTableSelection } from '@lexical/table';
import {
  $findMatchingParent,
  $getNearestNodeOfType,
  $isEditorIsNestedEditor,
  IS_APPLE,
  mergeRegister,
} from '@lexical/utils';
import {
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isRootOrShadowRoot,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  ElementFormatType,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  HISTORIC_TAG,
  INDENT_CONTENT_COMMAND,
  LexicalEditor,
  NodeKey,
  OUTDENT_CONTENT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
} from 'lexical';
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  Undo2,
  Redo2,
  Code as CodeIcon,
  Link as LinkIcon,
} from 'lucide-react';
import { Dispatch, useCallback, useEffect, useState } from 'react';

import {
  blockTypeToBlockName,
  useToolbarState,
} from '../../../context/ToolbarContext';
import useModal from '../../../hooks/useModal';
import catTypingGif from '../../../images/cat-typing.gif';
import { $createStickyNode } from '../../../nodes/interactive/StickyNode';
import DropDown, { DropDownItem } from '../../../ui/overlays/DropDown';
import DropdownColorPicker from '../../../ui/overlays/DropdownColorPicker';
import { getSelectedNode } from '../../../utils/dom/getSelectedNode';
import { sanitizeUrl } from '../../../utils/media/url';
import { SHORTCUTS } from '../../input/ShortcutsPlugin/shortcuts';
import { INSERT_COLLAPSIBLE_COMMAND } from '../../interactive/CollapsiblePlugin';
import { InsertEquationDialog } from '../../interactive/EquationsPlugin';
import { InsertPollDialog } from '../../interactive/PollPlugin';
import { EmbedConfigs } from '../../layout/AutoEmbedPlugin';
import InsertLayoutDialog from '../../layout/LayoutPlugin/InsertLayoutDialog';
import { INSERT_PAGE_BREAK } from '../../layout/PageBreakPlugin';
import { InsertTableDialog } from '../../layout/TablePlugin';
import { INSERT_EXCALIDRAW_COMMAND } from '../../media/ExcalidrawPlugin';
import {
  INSERT_IMAGE_COMMAND,
  InsertImageDialog,
  InsertImagePayload,
} from '../../media/ImagesPlugin';
import { InsertInlineImageDialog } from '../../media/InlineImagePlugin';

import FontSize from './fontSize';
import {
  clearFormatting,
  formatBulletList,
  formatCheckList,
  formatCode,
  formatHeading,
  formatNumberedList,
  formatParagraph,
  formatQuote,
} from './utils';

import type { JSX } from 'react';

function getCodeLanguageOptions(): [string, string][] {
  const options: [string, string][] = [];

  for (const [lang, friendlyName] of Object.entries(
    CODE_LANGUAGE_FRIENDLY_NAME_MAP,
  )) {
    options.push([lang, friendlyName]);
  }

  return options;
}

const CODE_LANGUAGE_OPTIONS = getCodeLanguageOptions();

const FONT_FAMILY_OPTIONS: [string, string][] = [
  ['Arial', 'Arial'],
  ['Courier New', 'Courier New'],
  ['Georgia', 'Georgia'],
  ['Times New Roman', 'Times New Roman'],
  ['Trebuchet MS', 'Trebuchet MS'],
  ['Verdana', 'Verdana'],
];

const FONT_SIZE_OPTIONS: [string, string][] = [
  ['10px', '10px'],
  ['11px', '11px'],
  ['12px', '12px'],
  ['13px', '13px'],
  ['14px', '14px'],
  ['15px', '15px'],
  ['16px', '16px'],
  ['17px', '17px'],
  ['18px', '18px'],
  ['19px', '19px'],
  ['20px', '20px'],
];

const ELEMENT_FORMAT_OPTIONS: {
  [key in Exclude<ElementFormatType, ''>]: {
    icon: string;
    iconRTL: string;
    name: string;
  };
} = {
  center: {
    icon: 'center-align',
    iconRTL: 'center-align',
    name: 'Center Align',
  },
  end: {
    icon: 'right-align',
    iconRTL: 'left-align',
    name: 'End Align',
  },
  justify: {
    icon: 'justify-align',
    iconRTL: 'justify-align',
    name: 'Justify Align',
  },
  left: {
    icon: 'left-align',
    iconRTL: 'left-align',
    name: 'Left Align',
  },
  right: {
    icon: 'right-align',
    iconRTL: 'right-align',
    name: 'Right Align',
  },
  start: {
    icon: 'left-align',
    iconRTL: 'right-align',
    name: 'Start Align',
  },
};

function dropDownActiveClass(active: boolean) {
  if (active) {
    return 'active dropdown-item-active';
  } else {
    return '';
  }
}

function BlockFormatDropDown({
  editor,
  blockType,
  rootType,
  disabled = false,
}: {
  blockType: keyof typeof blockTypeToBlockName;
  rootType: 'root' | 'table';
  editor: LexicalEditor;
  disabled?: boolean;
}): JSX.Element {
  void rootType; // Parameter required by interface but not used in current implementation

  // Memoize format functions
  const handleFormatParagraph = useCallback(() => {
    formatParagraph(editor);
  }, [editor]);

  const handleFormatH1 = useCallback(() => {
    formatHeading(editor, blockType, 'h1');
  }, [editor, blockType]);

  const handleFormatH2 = useCallback(() => {
    formatHeading(editor, blockType, 'h2');
  }, [editor, blockType]);

  const handleFormatH3 = useCallback(() => {
    formatHeading(editor, blockType, 'h3');
  }, [editor, blockType]);

  const handleFormatNumberedList = useCallback(() => {
    formatNumberedList(editor, blockType);
  }, [editor, blockType]);

  const handleFormatBulletList = useCallback(() => {
    formatBulletList(editor, blockType);
  }, [editor, blockType]);

  const handleFormatCheckList = useCallback(() => {
    formatCheckList(editor, blockType);
  }, [editor, blockType]);

  const handleFormatQuote = useCallback(() => {
    formatQuote(editor, blockType);
  }, [editor, blockType]);

  const handleFormatCode = useCallback(() => {
    formatCode(editor, blockType);
  }, [editor, blockType]);

  return (
    <DropDown
      disabled={disabled}
      buttonClassName="toolbar-item block-controls"
      buttonIconClassName={`icon block-type ${blockType}`}
      buttonLabel={blockTypeToBlockName[blockType]}
      buttonAriaLabel="Formatting options for text style"
    >
      <DropDownItem
        className={
          `item wide ${dropDownActiveClass(blockType === 'paragraph')}`
        }
        onClick={handleFormatParagraph}
      >
        <div className="icon-text-container">
          <i className="icon paragraph" />
          <span className="text">Normal</span>
        </div>
        <span className="shortcut">{SHORTCUTS.NORMAL}</span>
      </DropDownItem>
      <DropDownItem
        className={`item wide ${dropDownActiveClass(blockType === 'h1')}`}
        onClick={handleFormatH1}
      >
        <div className="icon-text-container">
          <i className="icon h1" />
          <span className="text">Heading 1</span>
        </div>
        <span className="shortcut">{SHORTCUTS.HEADING1}</span>
      </DropDownItem>
      <DropDownItem
        className={`item wide ${dropDownActiveClass(blockType === 'h2')}`}
        onClick={handleFormatH2}
      >
        <div className="icon-text-container">
          <i className="icon h2" />
          <span className="text">Heading 2</span>
        </div>
        <span className="shortcut">{SHORTCUTS.HEADING2}</span>
      </DropDownItem>
      <DropDownItem
        className={`item wide ${dropDownActiveClass(blockType === 'h3')}`}
        onClick={handleFormatH3}
      >
        <div className="icon-text-container">
          <i className="icon h3" />
          <span className="text">Heading 3</span>
        </div>
        <span className="shortcut">{SHORTCUTS.HEADING3}</span>
      </DropDownItem>
      <DropDownItem
        className={`item wide ${dropDownActiveClass(blockType === 'number')}`}
        onClick={handleFormatNumberedList}
      >
        <div className="icon-text-container">
          <i className="icon numbered-list" />
          <span className="text">Numbered List</span>
        </div>
        <span className="shortcut">{SHORTCUTS.NUMBERED_LIST}</span>
      </DropDownItem>
      <DropDownItem
        className={`item wide ${dropDownActiveClass(blockType === 'bullet')}`}
        onClick={handleFormatBulletList}
      >
        <div className="icon-text-container">
          <i className="icon bullet-list" />
          <span className="text">Bullet List</span>
        </div>
        <span className="shortcut">{SHORTCUTS.BULLET_LIST}</span>
      </DropDownItem>
      <DropDownItem
        className={`item wide ${dropDownActiveClass(blockType === 'check')}`}
        onClick={handleFormatCheckList}
      >
        <div className="icon-text-container">
          <i className="icon check-list" />
          <span className="text">Check List</span>
        </div>
        <span className="shortcut">{SHORTCUTS.CHECK_LIST}</span>
      </DropDownItem>
      <DropDownItem
        className={`item wide ${dropDownActiveClass(blockType === 'quote')}`}
        onClick={handleFormatQuote}
      >
        <div className="icon-text-container">
          <i className="icon quote" />
          <span className="text">Quote</span>
        </div>
        <span className="shortcut">{SHORTCUTS.QUOTE}</span>
      </DropDownItem>
      <DropDownItem
        className={`item wide ${dropDownActiveClass(blockType === 'code')}`}
        onClick={handleFormatCode}
      >
        <div className="icon-text-container">
          <i className="icon code" />
          <span className="text">Code Block</span>
        </div>
        <span className="shortcut">{SHORTCUTS.CODE_BLOCK}</span>
      </DropDownItem>
    </DropDown>
  );
}

function Divider(): JSX.Element {
  return <div className="divider" />;
}

function FontDropDown({
  editor,
  value,
  style,
  disabled = false,
}: {
  editor: LexicalEditor;
  value: string;
  style: string;
  disabled?: boolean;
}): JSX.Element {
  const handleClick = useCallback(
    (option: string) => {
      editor.update(() => {
        const selection = $getSelection();
        if (selection !== null) {
          $patchStyleText(selection, {
            [style]: option,
          });
        }
      });
    },
    [editor, style],
  );

  // Create memoized click handler factory
  const createClickHandler = useCallback(
    (option: string) => () => handleClick(option),
    [handleClick],
  );

  const buttonAriaLabel =
    style === 'font-family'
      ? 'Formatting options for font family'
      : 'Formatting options for font size';

  return (
    <DropDown
      disabled={disabled}
      buttonClassName={`toolbar-item ${style}`}
      buttonLabel={value}
      buttonIconClassName={
        style === 'font-family' ? 'icon block-type font-family' : ''
      }
      buttonAriaLabel={buttonAriaLabel}
    >
      {(style === 'font-family' ? FONT_FAMILY_OPTIONS : FONT_SIZE_OPTIONS).map(
        ([option, text]) => (
          <DropDownItem
            className={`item ${dropDownActiveClass(value === option)} ${
              style === 'font-size' ? 'fontsize-item' : ''
            }`}
            onClick={createClickHandler(option)}
            key={option}
          >
            <span className="text">{text}</span>
          </DropDownItem>
        ),
      )}
    </DropDown>
  );
}

function ElementFormatDropdown({
  editor,
  value,
  isRTL,
  disabled = false,
}: {
  editor: LexicalEditor;
  value: ElementFormatType;
  isRTL: boolean;
  disabled: boolean;
}) {
  const formatOption = ELEMENT_FORMAT_OPTIONS[value || 'left'];

  // Memoize format functions
  const handleAlignLeft = useCallback(() => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left');
  }, [editor]);

  const handleAlignCenter = useCallback(() => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center');
  }, [editor]);

  const handleAlignRight = useCallback(() => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right');
  }, [editor]);

  const handleAlignJustify = useCallback(() => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify');
  }, [editor]);

  const handleAlignStart = useCallback(() => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'start');
  }, [editor]);

  const handleAlignEnd = useCallback(() => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'end');
  }, [editor]);

  const handleOutdent = useCallback(() => {
    editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined);
  }, [editor]);

  const handleIndent = useCallback(() => {
    editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined);
  }, [editor]);

  return (
    <DropDown
      disabled={disabled}
      buttonLabel={formatOption.name}
      buttonIconClassName={`icon ${
        isRTL ? formatOption.iconRTL : formatOption.icon
      }`}
      buttonClassName="toolbar-item spaced alignment"
      buttonAriaLabel="Formatting options for text alignment"
    >
      <DropDownItem onClick={handleAlignLeft} className="item wide">
        <div className="icon-text-container">
          <i className="icon left-align" />
          <span className="text">Left Align</span>
        </div>
        <span className="shortcut">{SHORTCUTS.LEFT_ALIGN}</span>
      </DropDownItem>
      <DropDownItem onClick={handleAlignCenter} className="item wide">
        <div className="icon-text-container">
          <i className="icon center-align" />
          <span className="text">Center Align</span>
        </div>
        <span className="shortcut">{SHORTCUTS.CENTER_ALIGN}</span>
      </DropDownItem>
      <DropDownItem onClick={handleAlignRight} className="item wide">
        <div className="icon-text-container">
          <i className="icon right-align" />
          <span className="text">Right Align</span>
        </div>
        <span className="shortcut">{SHORTCUTS.RIGHT_ALIGN}</span>
      </DropDownItem>
      <DropDownItem onClick={handleAlignJustify} className="item wide">
        <div className="icon-text-container">
          <i className="icon justify-align" />
          <span className="text">Justify Align</span>
        </div>
        <span className="shortcut">{SHORTCUTS.JUSTIFY_ALIGN}</span>
      </DropDownItem>
      <DropDownItem onClick={handleAlignStart} className="item wide">
        <i
          className={`icon ${
            isRTL
              ? ELEMENT_FORMAT_OPTIONS.start.iconRTL
              : ELEMENT_FORMAT_OPTIONS.start.icon
          }`}
        />
        <span className="text">Start Align</span>
      </DropDownItem>
      <DropDownItem onClick={handleAlignEnd} className="item wide">
        <i
          className={`icon ${
            isRTL
              ? ELEMENT_FORMAT_OPTIONS.end.iconRTL
              : ELEMENT_FORMAT_OPTIONS.end.icon
          }`}
        />
        <span className="text">End Align</span>
      </DropDownItem>
      <Divider />
      <DropDownItem onClick={handleOutdent} className="item wide">
        <div className="icon-text-container">
          <i className={`icon ${isRTL ? 'indent' : 'outdent'}`} />
          <span className="text">Outdent</span>
        </div>
        <span className="shortcut">{SHORTCUTS.OUTDENT}</span>
      </DropDownItem>
      <DropDownItem onClick={handleIndent} className="item wide">
        <div className="icon-text-container">
          <i className={`icon ${isRTL ? 'outdent' : 'indent'}`} />
          <span className="text">Indent</span>
        </div>
        <span className="shortcut">{SHORTCUTS.INDENT}</span>
      </DropDownItem>
    </DropDown>
  );
}

export default function ToolbarPlugin({
  editor,
  activeEditor,
  setActiveEditor,
  setIsLinkEditMode,
}: {
  editor: LexicalEditor;
  activeEditor: LexicalEditor;
  setActiveEditor: Dispatch<LexicalEditor>;
  setIsLinkEditMode: Dispatch<boolean>;
}): JSX.Element {
  const [selectedElementKey, setSelectedElementKey] = useState<NodeKey | null>(
    null,
  );
  const [modal, showModal] = useModal();
  const [isEditable, setIsEditable] = useState(() => editor.isEditable());
  const { toolbarState, updateToolbarState } = useToolbarState();

  const $updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      if (activeEditor !== editor && $isEditorIsNestedEditor(activeEditor)) {
        const rootElement = activeEditor.getRootElement();
        updateToolbarState(
          'isImageCaption',
          Boolean(rootElement?.parentElement?.classList.contains(
            'image-caption-container',
          )),
        );
      } else {
        updateToolbarState('isImageCaption', false);
      }

      const anchorNode = selection.anchor.getNode();
      let element =
        anchorNode.getKey() === 'root'
          ? anchorNode
          : $findMatchingParent(anchorNode, (e) => {
              const parent = e.getParent();
              return parent !== null && $isRootOrShadowRoot(parent);
            });

      if (element === null) {
        element = anchorNode.getTopLevelElementOrThrow();
      }

      const elementKey = element.getKey();
      const elementDOM = activeEditor.getElementByKey(elementKey);

      updateToolbarState('isRTL', $isParentElementRTL(selection));

      // Update links
      const node = getSelectedNode(selection);
      const parent = node.getParent();
      const isLink = $isLinkNode(parent) || $isLinkNode(node);
      updateToolbarState('isLink', isLink);

      const tableNode = $findMatchingParent(node, $isTableNode);
      if ($isTableNode(tableNode)) {
        updateToolbarState('rootType', 'table');
      } else {
        updateToolbarState('rootType', 'root');
      }

      if (elementDOM !== null) {
        setSelectedElementKey(elementKey);
        if ($isListNode(element)) {
          const parentList = $getNearestNodeOfType<ListNode>(
            anchorNode,
            ListNode,
          );
          const type = parentList
            ? parentList.getListType()
            : element.getListType();

          updateToolbarState('blockType', type);
        } else {
          const type = $isHeadingNode(element)
            ? element.getTag()
            : element.getType();
          if (type in blockTypeToBlockName) {
            updateToolbarState(
              'blockType',
              type as keyof typeof blockTypeToBlockName,
            );
          }
          if ($isCodeNode(element)) {
            const language =
              element.getLanguage() as keyof typeof CODE_LANGUAGE_MAP;
            updateToolbarState(
              'codeLanguage',
              language ? CODE_LANGUAGE_MAP[language] || language : '',
            );
            return;
          }
        }
      }
      // Handle buttons
      updateToolbarState(
        'fontColor',
        $getSelectionStyleValueForProperty(selection, 'color', '#000'),
      );
      updateToolbarState(
        'bgColor',
        $getSelectionStyleValueForProperty(
          selection,
          'background-color',
          '#fff',
        ),
      );
      updateToolbarState(
        'fontFamily',
        $getSelectionStyleValueForProperty(selection, 'font-family', 'Arial'),
      );
      let matchingParent;
      if ($isLinkNode(parent)) {
        // If node is a link, we need to fetch the parent paragraph node to set format
        matchingParent = $findMatchingParent(
          node,
          (parentNode) => $isElementNode(parentNode) && !parentNode.isInline(),
        );
      }

      // If matchingParent is a valid node, pass it's format type
      updateToolbarState(
        'elementFormat',
        $isElementNode(matchingParent)
          ? matchingParent.getFormatType()
          : $isElementNode(node)
            ? node.getFormatType()
            : parent?.getFormatType() || 'left',
      );
    }
    if ($isRangeSelection(selection) || $isTableSelection(selection)) {
      // Update text format
      updateToolbarState('isBold', selection.hasFormat('bold'));
      updateToolbarState('isItalic', selection.hasFormat('italic'));
      updateToolbarState('isUnderline', selection.hasFormat('underline'));
      updateToolbarState(
        'isStrikethrough',
        selection.hasFormat('strikethrough'),
      );
      updateToolbarState('isSubscript', selection.hasFormat('subscript'));
      updateToolbarState('isSuperscript', selection.hasFormat('superscript'));
      updateToolbarState('isHighlight', selection.hasFormat('highlight'));
      updateToolbarState('isCode', selection.hasFormat('code'));
      updateToolbarState(
        'fontSize',
        $getSelectionStyleValueForProperty(selection, 'font-size', '15px'),
      );
      updateToolbarState('isLowercase', selection.hasFormat('lowercase'));
      updateToolbarState('isUppercase', selection.hasFormat('uppercase'));
      updateToolbarState('isCapitalize', selection.hasFormat('capitalize'));
    }
  }, [activeEditor, editor, updateToolbarState]);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      (_payload, newEditor) => {
        setActiveEditor(newEditor);
        $updateToolbar();
        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    );
  }, [editor, $updateToolbar, setActiveEditor]);

  useEffect(() => {
    activeEditor.getEditorState().read(() => {
      $updateToolbar();
    });
  }, [activeEditor, $updateToolbar]);

  useEffect(() => {
    return mergeRegister(
      editor.registerEditableListener((editable) => {
        setIsEditable(editable);
      }),
      activeEditor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          $updateToolbar();
        });
      }),
      activeEditor.registerCommand<boolean>(
        CAN_UNDO_COMMAND,
        (payload) => {
          updateToolbarState('canUndo', payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      activeEditor.registerCommand<boolean>(
        CAN_REDO_COMMAND,
        (payload) => {
          updateToolbarState('canRedo', payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
    );
  }, [$updateToolbar, activeEditor, editor, updateToolbarState]);

  const applyStyleText = useCallback(
    (styles: Record<string, string>, skipHistoryStack?: boolean) => {
      activeEditor.update(
        () => {
          const selection = $getSelection();
          if (selection !== null) {
            $patchStyleText(selection, styles);
          }
        },
        skipHistoryStack ? { tag: HISTORIC_TAG } : {},
      );
    },
    [activeEditor],
  );

  const onFontColorSelect = useCallback(
    (value: string, skipHistoryStack: boolean) => {
      applyStyleText({ color: value }, skipHistoryStack);
    },
    [applyStyleText],
  );

  const onBgColorSelect = useCallback(
    (value: string, skipHistoryStack: boolean) => {
      applyStyleText({ 'background-color': value }, skipHistoryStack);
    },
    [applyStyleText],
  );

  const insertLink = useCallback(() => {
    if (!toolbarState.isLink) {
      setIsLinkEditMode(true);
      activeEditor.dispatchCommand(
        TOGGLE_LINK_COMMAND,
        sanitizeUrl('https://'),
      );
    } else {
      setIsLinkEditMode(false);
      activeEditor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
  }, [activeEditor, setIsLinkEditMode, toolbarState.isLink]);

  const onCodeLanguageSelect = useCallback(
    (value: string) => {
      activeEditor.update(() => {
        if (selectedElementKey !== null) {
          const node = $getNodeByKey(selectedElementKey);
          if ($isCodeNode(node)) {
            node.setLanguage(value);
          }
        }
      });
    },
    [activeEditor, selectedElementKey],
  );

  // Create memoized click handler factory for code language selection
  const createCodeLanguageClickHandler = useCallback(
    (value: string) => () => onCodeLanguageSelect(value),
    [onCodeLanguageSelect],
  );

  const insertGifOnClick = useCallback(
    (payload: InsertImagePayload) => {
      activeEditor.dispatchCommand(INSERT_IMAGE_COMMAND, payload);
    },
    [activeEditor],
  );

  // Memoize all button handlers
  const handleUndo = useCallback(() => {
    activeEditor.dispatchCommand(UNDO_COMMAND, undefined);
  }, [activeEditor]);

  const handleRedo = useCallback(() => {
    activeEditor.dispatchCommand(REDO_COMMAND, undefined);
  }, [activeEditor]);

  const handleFormatBold = useCallback(() => {
    activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
  }, [activeEditor]);

  const handleFormatItalic = useCallback(() => {
    activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
  }, [activeEditor]);

  const handleFormatUnderline = useCallback(() => {
    activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
  }, [activeEditor]);

  const handleFormatCode = useCallback(() => {
    activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code');
  }, [activeEditor]);

  const handleFormatLowercase = useCallback(() => {
    activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'lowercase');
  }, [activeEditor]);

  const handleFormatUppercase = useCallback(() => {
    activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'uppercase');
  }, [activeEditor]);

  const handleFormatCapitalize = useCallback(() => {
    activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'capitalize');
  }, [activeEditor]);

  const handleFormatStrikethrough = useCallback(() => {
    activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
  }, [activeEditor]);

  const handleFormatSubscript = useCallback(() => {
    activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'subscript');
  }, [activeEditor]);

  const handleFormatSuperscript = useCallback(() => {
    activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'superscript');
  }, [activeEditor]);

  const handleFormatHighlight = useCallback(() => {
    activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'highlight');
  }, [activeEditor]);

  const handleClearFormatting = useCallback(() => {
    clearFormatting(activeEditor);
  }, [activeEditor]);

  const handleInsertHorizontalRule = useCallback(() => {
    activeEditor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined);
  }, [activeEditor]);

  const handleInsertPageBreak = useCallback(() => {
    activeEditor.dispatchCommand(INSERT_PAGE_BREAK, undefined);
  }, [activeEditor]);

  const handleInsertImage = useCallback(() => {
    showModal('Insert Image', (onClose) => (
      <InsertImageDialog activeEditor={activeEditor} onClose={onClose} />
    ));
  }, [activeEditor, showModal]);

  const handleInsertInlineImage = useCallback(() => {
    showModal('Insert Inline Image', (onClose) => (
      <InsertInlineImageDialog activeEditor={activeEditor} onClose={onClose} />
    ));
  }, [activeEditor, showModal]);

  const handleInsertGif = useCallback(() => {
    insertGifOnClick({
      altText: 'Cat typing on a laptop',
      src: catTypingGif.src,
    });
  }, [insertGifOnClick]);

  const handleInsertExcalidraw = useCallback(() => {
    activeEditor.dispatchCommand(INSERT_EXCALIDRAW_COMMAND, undefined);
  }, [activeEditor]);

  const handleInsertTable = useCallback(() => {
    showModal('Insert Table', (onClose) => (
      <InsertTableDialog activeEditor={activeEditor} onClose={onClose} />
    ));
  }, [activeEditor, showModal]);

  const handleInsertPoll = useCallback(() => {
    showModal('Insert Poll', (onClose) => (
      <InsertPollDialog activeEditor={activeEditor} onClose={onClose} />
    ));
  }, [activeEditor, showModal]);

  const handleInsertColumnsLayout = useCallback(() => {
    showModal('Insert Columns Layout', (onClose) => (
      <InsertLayoutDialog activeEditor={activeEditor} onClose={onClose} />
    ));
  }, [activeEditor, showModal]);

  const handleInsertEquation = useCallback(() => {
    showModal('Insert Equation', (onClose) => (
      <InsertEquationDialog activeEditor={activeEditor} onClose={onClose} />
    ));
  }, [activeEditor, showModal]);

  const handleInsertStickyNote = useCallback(() => {
    editor.update(() => {
      const root = $getRoot();
      const stickyNode = $createStickyNode(0, 0);
      root.append(stickyNode);
    });
  }, [editor]);

  const handleInsertCollapsible = useCallback(() => {
    editor.dispatchCommand(INSERT_COLLAPSIBLE_COMMAND, undefined);
  }, [editor]);

  const handleInsertEmbed = useCallback(
    (embedType: string) => {
      activeEditor.dispatchCommand(INSERT_EMBED_COMMAND, embedType);
    },
    [activeEditor],
  );

  // Create memoized click handler factory for embed insertion
  const createEmbedClickHandler = useCallback(
    (embedType: string) => () => handleInsertEmbed(embedType),
    [handleInsertEmbed],
  );

  const canViewerSeeInsertDropdown = !toolbarState.isImageCaption;
  const canViewerSeeInsertCodeButton = !toolbarState.isImageCaption;

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button
          disabled={!toolbarState.canUndo || !isEditable}
          onClick={handleUndo}
          title={IS_APPLE ? 'Undo (⌘Z)' : 'Undo (Ctrl+Z)'}
          type="button"
          className="toolbar-item spaced"
          aria-label="Undo"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          disabled={!toolbarState.canRedo || !isEditable}
          onClick={handleRedo}
          title={IS_APPLE ? 'Redo (⇧⌘Z)' : 'Redo (Ctrl+Y)'}
          type="button"
          className="toolbar-item"
          aria-label="Redo"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>
      <Divider />
      {toolbarState.blockType in blockTypeToBlockName &&
        activeEditor === editor && (
          <div className="toolbar-group">
            <BlockFormatDropDown
              disabled={!isEditable}
              blockType={toolbarState.blockType}
              rootType={toolbarState.rootType}
              editor={activeEditor}
            />
          </div>
        )}
      {toolbarState.blockType in blockTypeToBlockName &&
        activeEditor === editor && <Divider />}
      {toolbarState.blockType === 'code' ? (
        <DropDown
          disabled={!isEditable}
          buttonClassName="toolbar-item code-language"
          buttonLabel={getLanguageFriendlyName(toolbarState.codeLanguage)}
          buttonAriaLabel="Select language"
        >
          {CODE_LANGUAGE_OPTIONS.map(([value, name]) => {
            return (
              <DropDownItem
                className={`item ${dropDownActiveClass(
                  value === toolbarState.codeLanguage,
                )}`}
                onClick={createCodeLanguageClickHandler(value)}
                key={value}
              >
                <span className="text">{name}</span>
              </DropDownItem>
            );
          })}
        </DropDown>
      ) : (
        <>
          <div className="toolbar-group">
            <FontDropDown
              disabled={!isEditable}
              style="font-family"
              value={toolbarState.fontFamily}
              editor={activeEditor}
            />
            <Divider />
            <FontSize
              selectionFontSize={toolbarState.fontSize.slice(0, -2)}
              editor={activeEditor}
              disabled={!isEditable}
            />
          </div>
          <Divider />
          <div className="toolbar-group">
            <button
              disabled={!isEditable}
              onClick={handleFormatBold}
              className={
                `toolbar-item spaced ${toolbarState.isBold ? 'active' : ''}`
              }
              title={`Bold (${SHORTCUTS.BOLD})`}
              type="button"
              aria-label={`Format text as bold. Shortcut: ${SHORTCUTS.BOLD}`}
            >
              <BoldIcon className="w-4 h-4" />
            </button>
            <button
              disabled={!isEditable}
              onClick={handleFormatItalic}
              className={
                `toolbar-item spaced ${toolbarState.isItalic ? 'active' : ''}`
              }
              title={`Italic (${SHORTCUTS.ITALIC})`}
              type="button"
              aria-label={`Format text as italics. Shortcut: ${SHORTCUTS.ITALIC}`}
            >
              <ItalicIcon className="w-4 h-4" />
            </button>
            <button
              disabled={!isEditable}
              onClick={handleFormatUnderline}
              className={
                `toolbar-item spaced ${ 
                toolbarState.isUnderline ? 'active' : ''}`
              }
              title={`Underline (${SHORTCUTS.UNDERLINE})`}
              type="button"
              aria-label={`Format text to underlined. Shortcut: ${SHORTCUTS.UNDERLINE}`}
            >
              <UnderlineIcon className="w-4 h-4" />
            </button>
            {canViewerSeeInsertCodeButton && (
              <button
                disabled={!isEditable}
                onClick={handleFormatCode}
                className={
                  `toolbar-item spaced ${toolbarState.isCode ? 'active' : ''}`
                }
                title={`Insert code block (${SHORTCUTS.INSERT_CODE_BLOCK})`}
                type="button"
                aria-label="Insert code block"
              >
                <CodeIcon className="w-4 h-4" />
              </button>
            )}
            <button
              disabled={!isEditable}
              onClick={insertLink}
              className={
                `toolbar-item spaced ${toolbarState.isLink ? 'active' : ''}`
              }
              aria-label="Insert link"
              title={`Insert link (${SHORTCUTS.INSERT_LINK})`}
              type="button"
            >
              <LinkIcon className="w-4 h-4" />
            </button>
            <DropdownColorPicker
              disabled={!isEditable}
              buttonClassName="toolbar-item color-picker"
              buttonAriaLabel="Formatting text color"
              buttonIconClassName="icon font-color"
              color={toolbarState.fontColor}
              onChange={onFontColorSelect}
              title="text color"
            />
            <DropdownColorPicker
              disabled={!isEditable}
              buttonClassName="toolbar-item color-picker"
              buttonAriaLabel="Formatting background color"
              buttonIconClassName="icon bg-color"
              color={toolbarState.bgColor}
              onChange={onBgColorSelect}
              title="bg color"
            />
            <DropDown
              disabled={!isEditable}
              buttonClassName="toolbar-item spaced"
              buttonLabel=""
              buttonAriaLabel="Formatting options for additional text styles"
              buttonIconClassName="icon dropdown-more"
            >
              <DropDownItem
                onClick={handleFormatLowercase}
                className={
                  `item wide ${dropDownActiveClass(toolbarState.isLowercase)}`
                }
                title="Lowercase"
                aria-label="Format text to lowercase"
              >
                <div className="icon-text-container">
                  <i className="icon lowercase" />
                  <span className="text">Lowercase</span>
                </div>
                <span className="shortcut">{SHORTCUTS.LOWERCASE}</span>
              </DropDownItem>
              <DropDownItem
                onClick={handleFormatUppercase}
                className={
                  `item wide ${dropDownActiveClass(toolbarState.isUppercase)}`
                }
                title="Uppercase"
                aria-label="Format text to uppercase"
              >
                <div className="icon-text-container">
                  <i className="icon uppercase" />
                  <span className="text">Uppercase</span>
                </div>
                <span className="shortcut">{SHORTCUTS.UPPERCASE}</span>
              </DropDownItem>
              <DropDownItem
                onClick={handleFormatCapitalize}
                className={
                  `item wide ${dropDownActiveClass(toolbarState.isCapitalize)}`
                }
                title="Capitalize"
                aria-label="Format text to capitalize"
              >
                <div className="icon-text-container">
                  <i className="icon capitalize" />
                  <span className="text">Capitalize</span>
                </div>
                <span className="shortcut">{SHORTCUTS.CAPITALIZE}</span>
              </DropDownItem>
              <DropDownItem
                onClick={handleFormatStrikethrough}
                className={
                  `item wide ${ 
                  dropDownActiveClass(toolbarState.isStrikethrough)}`
                }
                title="Strikethrough"
                aria-label="Format text with a strikethrough"
              >
                <div className="icon-text-container">
                  <i className="icon strikethrough" />
                  <span className="text">Strikethrough</span>
                </div>
                <span className="shortcut">{SHORTCUTS.STRIKETHROUGH}</span>
              </DropDownItem>
              <DropDownItem
                onClick={handleFormatSubscript}
                className={
                  `item wide ${dropDownActiveClass(toolbarState.isSubscript)}`
                }
                title="Subscript"
                aria-label="Format text with a subscript"
              >
                <div className="icon-text-container">
                  <i className="icon subscript" />
                  <span className="text">Subscript</span>
                </div>
                <span className="shortcut">{SHORTCUTS.SUBSCRIPT}</span>
              </DropDownItem>
              <DropDownItem
                onClick={handleFormatSuperscript}
                className={
                  `item wide ${dropDownActiveClass(toolbarState.isSuperscript)}`
                }
                title="Superscript"
                aria-label="Format text with a superscript"
              >
                <div className="icon-text-container">
                  <i className="icon superscript" />
                  <span className="text">Superscript</span>
                </div>
                <span className="shortcut">{SHORTCUTS.SUPERSCRIPT}</span>
              </DropDownItem>
              <DropDownItem
                onClick={handleFormatHighlight}
                className={
                  `item wide ${dropDownActiveClass(toolbarState.isHighlight)}`
                }
                title="Highlight"
                aria-label="Format text with a highlight"
              >
                <div className="icon-text-container">
                  <i className="icon highlight" />
                  <span className="text">Highlight</span>
                </div>
              </DropDownItem>
              <DropDownItem
                onClick={handleClearFormatting}
                className="item wide"
                title="Clear text formatting"
                aria-label="Clear all text formatting"
              >
                <div className="icon-text-container">
                  <i className="icon clear" />
                  <span className="text">Clear Formatting</span>
                </div>
                <span className="shortcut">{SHORTCUTS.CLEAR_FORMATTING}</span>
              </DropDownItem>
            </DropDown>
          </div>
          {canViewerSeeInsertDropdown && (
            <>
              <Divider />
              <DropDown
                disabled={!isEditable}
                buttonClassName="toolbar-item spaced"
                buttonLabel="Insert"
                buttonAriaLabel="Insert specialized editor node"
                buttonIconClassName="icon plus"
              >
                <DropDownItem
                  onClick={handleInsertHorizontalRule}
                  className="item"
                >
                  <i className="icon horizontal-rule" />
                  <span className="text">Horizontal Rule</span>
                </DropDownItem>
                <DropDownItem onClick={handleInsertPageBreak} className="item">
                  <i className="icon page-break" />
                  <span className="text">Page Break</span>
                </DropDownItem>
                <DropDownItem onClick={handleInsertImage} className="item">
                  <i className="icon image" />
                  <span className="text">Image</span>
                </DropDownItem>
                <DropDownItem
                  onClick={handleInsertInlineImage}
                  className="item"
                >
                  <i className="icon image" />
                  <span className="text">Inline Image</span>
                </DropDownItem>
                <DropDownItem onClick={handleInsertGif} className="item">
                  <i className="icon gif" />
                  <span className="text">GIF</span>
                </DropDownItem>
                <DropDownItem onClick={handleInsertExcalidraw} className="item">
                  <i className="icon diagram-2" />
                  <span className="text">Excalidraw</span>
                </DropDownItem>
                <DropDownItem onClick={handleInsertTable} className="item">
                  <i className="icon table" />
                  <span className="text">Table</span>
                </DropDownItem>
                <DropDownItem onClick={handleInsertPoll} className="item">
                  <i className="icon poll" />
                  <span className="text">Poll</span>
                </DropDownItem>
                <DropDownItem
                  onClick={handleInsertColumnsLayout}
                  className="item"
                >
                  <i className="icon columns" />
                  <span className="text">Columns Layout</span>
                </DropDownItem>

                <DropDownItem onClick={handleInsertEquation} className="item">
                  <i className="icon equation" />
                  <span className="text">Equation</span>
                </DropDownItem>
                <DropDownItem onClick={handleInsertStickyNote} className="item">
                  <i className="icon sticky" />
                  <span className="text">Sticky Note</span>
                </DropDownItem>
                <DropDownItem
                  onClick={handleInsertCollapsible}
                  className="item"
                >
                  <i className="icon caret-right" />
                  <span className="text">Collapsible container</span>
                </DropDownItem>
                {EmbedConfigs.map((embedConfig) => (
                  <DropDownItem
                    key={embedConfig.type}
                    onClick={createEmbedClickHandler(embedConfig.type)}
                    className="item"
                  >
                    {embedConfig.icon}
                    <span className="text">{embedConfig.contentName}</span>
                  </DropDownItem>
                ))}
              </DropDown>
            </>
          )}
        </>
      )}
      <Divider />
      <div className="toolbar-group">
        <ElementFormatDropdown
          disabled={!isEditable}
          value={toolbarState.elementFormat}
          editor={activeEditor}
          isRTL={toolbarState.isRTL}
        />
      </div>

      {modal}
    </div>
  );
}
