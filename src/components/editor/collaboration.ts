// @ts-nocheck
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {WebsocketProvider} from 'y-websocket';
import {Doc} from 'yjs';

// Define a complete Provider type to match the expected Lexical interface
type Provider = {
  connect: () => void;
  disconnect: () => void;
  destroy: () => void;
  awareness: any;
  doc: Doc;
  // Event handling methods expected by Lexical
  on: (event: string, handler: (...args: any[]) => void) => void;
  off: (event: string, handler: (...args: any[]) => void) => void;
};

const url = new URL(window.location.href);
const params = new URLSearchParams(url.search);
const WEBSOCKET_ENDPOINT =
  params.get('collabEndpoint') || 'ws://localhost:1234';
const WEBSOCKET_SLUG = 'playground';
const WEBSOCKET_ID = params.get('collabId') || '0';

// parent dom -> child doc
export function createWebsocketProvider(
  id: string,
  yjsDocMap: Map<string, Doc>,
): Provider {
  let doc = yjsDocMap.get(id);

  if (doc === undefined) {
    doc = new Doc();
    yjsDocMap.set(id, doc);
  } else {
    doc.load();
  }

  // WebsocketProvider implements the Provider interface
  return new WebsocketProvider(
    WEBSOCKET_ENDPOINT,
    `${WEBSOCKET_SLUG}/${WEBSOCKET_ID}/${id}`,
    doc,
    {
      connect: false,
    },
  ) as Provider;
}
