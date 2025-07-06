// Web Worker: encodes image pixel data to BlurHash
// Dedicated worker runs in its own scope; we type the incoming message for safety.

import { encode } from 'blurhash';

interface BlurJob {
  id: number;
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

interface BlurResult {
  id: number;
  hash: string;
}

self.onmessage = (e: MessageEvent<BlurJob>): void => {
  const { id, data, width, height } = e.data;
  // Ensure the pixel buffer is the expected type.
  const pixels: Uint8ClampedArray =
    data instanceof Uint8ClampedArray ? data : new Uint8ClampedArray(data);
  const hash = encode(pixels, width, height, 4, 4);
  self.postMessage({ id, hash } as BlurResult);
};
