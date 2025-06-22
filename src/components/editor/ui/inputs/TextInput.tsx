/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import React, { forwardRef, HTMLInputTypeAttribute } from 'react';

import type { JSX } from 'react';

import './Input.css';

type Props = Readonly<{
  'data-test-id'?: string;
  label: string;
  onChange: (val: string) => void;
  placeholder?: string;
  value: string;
  type?: HTMLInputTypeAttribute;
}>;

const TextInput = forwardRef<HTMLInputElement, Props>(function TextInput(
  {
    label,
    value,
    onChange,
    placeholder = '',
    'data-test-id': dataTestId,
    type = 'text',
  },
  ref,
): JSX.Element {
  return (
    <div className="Input__wrapper">
      <label className="Input__label">{label}</label>
      <input
        ref={ref}
        type={type}
        className="Input__input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        data-test-id={dataTestId}
      />
    </div>
  );
});

TextInput.displayName = 'TextInput';

export default TextInput;
