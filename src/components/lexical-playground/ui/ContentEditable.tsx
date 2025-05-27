/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type { JSX } from 'react';

import './ContentEditable.css';

import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import * as React from 'react';

interface LexicalContentEditableProps {
  placeholder?: string | ((isEditable: boolean) => JSX.Element | null);
  readOnly?: boolean;
}

export default function LexicalContentEditable({
  placeholder,
  readOnly = false,
}: LexicalContentEditableProps): JSX.Element {
  const hasPlaceholder = placeholder !== undefined;
  let contentEditableProps: Record<
    string,
    React.RefObject<HTMLDivElement>
  > = {};
  if (hasPlaceholder) {
    if (typeof placeholder === 'function') {
      contentEditableProps = {
        placeholder,
      };
    } else {
      contentEditableProps = {
        'aria-placeholder': placeholder,
        placeholder: (isEditable: boolean) =>
          isEditable ? (
            <div className="ContentEditable__placeholder">{placeholder}</div>
          ) : null,
      };
    }
  }
  return (
    <ContentEditable
      className="ContentEditable__root"
      {...contentEditableProps}
      spellCheck={true}
      autoCorrect="on"
      autoCapitalize="on"
      readOnly={readOnly}
    />
  );
}
