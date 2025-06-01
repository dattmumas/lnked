/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

export function setDomHiddenUntilFound(dom: HTMLElement): void {
  // @ts-expect-error - hidden property accepts 'until-found' value in modern browsers
  dom.hidden = 'until-found';
}

export function domOnBeforeMatch(dom: HTMLElement, callback: () => void): void {
  // @ts-expect-error - onbeforematch is a newer DOM API not yet in TypeScript types
  dom.onbeforematch = callback;
}
