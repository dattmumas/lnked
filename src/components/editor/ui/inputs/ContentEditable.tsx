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

/* eslint-disable react/no-unstable-nested-components */

interface LexicalContentEditableProps {
  placeholder?: string | ((isEditable: boolean) => JSX.Element | null);
  readOnly?: boolean;
}

function ContentEditablePlaceholder({ placeholder }: { placeholder: string }) {
  return <div className="ContentEditable__placeholder">{placeholder}</div>;
}

export default function LexicalContentEditable({
  placeholder,
  readOnly = false,
}: LexicalContentEditableProps): JSX.Element {
  const hasPlaceholder = placeholder !== undefined;
  let contentEditableProps: Record<
    string,
    | string
    | ((isEditable: boolean) => JSX.Element | null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    | any
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
      spellCheck
      autoCorrect="on"
      autoCapitalize="on"
      readOnly={readOnly}
    />
  );
}
