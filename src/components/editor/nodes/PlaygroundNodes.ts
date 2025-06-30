/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { HashtagNode } from '@lexical/hashtag';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { ListItemNode, ListNode } from '@lexical/list';
import { MarkNode } from '@lexical/mark';
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';

import { EmojiNode } from './interactive/EmojiNode';
import { EquationNode } from './interactive/EquationNode';
import { ExcalidrawNode } from './interactive/ExcalidrawNode';
import { MentionNode } from './interactive/MentionNode';
import { PollNode } from './interactive/PollNode';
import { StickyNode } from './interactive/StickyNode';
import { LayoutContainerNode } from './layout/LayoutContainerNode';
import { LayoutItemNode } from './layout/LayoutItemNode';
import { PageBreakNode } from './layout/PageBreakNode';
import { FigmaNode } from './media/FigmaNode';
import { ImageNode } from './media/ImageNode';
import { InlineImageNode } from './media/InlineImageNode/InlineImageNode';
import { YouTubeNode } from './media/YouTubeNode';
import { TweetNode } from './text/TweetNode';
import { SpecialTextNode } from './text/SpecialTextNode';
import { CollapsibleContainerNode } from '../plugins/interactive/CollapsiblePlugin/CollapsibleContainerNode';
import { CollapsibleContentNode } from '../plugins/interactive/CollapsiblePlugin/CollapsibleContentNode';
import { CollapsibleTitleNode } from '../plugins/interactive/CollapsiblePlugin/CollapsibleTitleNode';

import type { Klass, LexicalNode } from 'lexical';

const PlaygroundNodes: Array<Klass<LexicalNode>> = [
  HeadingNode,
  ListNode,
  ListItemNode,
  QuoteNode,
  CodeNode,
  CodeHighlightNode,
  TableNode,
  TableCellNode,
  TableRowNode,
  HashtagNode,
  AutoLinkNode,
  LinkNode,
  MarkNode,
  HorizontalRuleNode,
  EmojiNode,
  EquationNode,
  ExcalidrawNode,
  MentionNode,
  PollNode,
  StickyNode,
  LayoutContainerNode,
  LayoutItemNode,
  PageBreakNode,
  FigmaNode,
  ImageNode,
  InlineImageNode,
  YouTubeNode,
  TweetNode,
  SpecialTextNode,
  CollapsibleContainerNode,
  CollapsibleContentNode,
  CollapsibleTitleNode,
];

export default PlaygroundNodes;
