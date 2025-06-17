import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfill TextEncoder/TextDecoder for environments that lack them
// @ts-ignore
if (typeof global.TextEncoder === 'undefined') {
  // @ts-ignore
  global.TextEncoder = TextEncoder as unknown as typeof global.TextEncoder;
}
// @ts-ignore
if (typeof global.TextDecoder === 'undefined') {
  // @ts-ignore
  global.TextDecoder = TextDecoder as unknown as typeof global.TextDecoder;
}

// Polyfill Fetch API Request/Response for Jest environment
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Request, Headers, Response } = require('node-fetch');
// @ts-ignore
global.Request = Request;
// @ts-ignore
global.Headers = Headers;
// @ts-ignore
global.Response = Response;

// Ensure global.Response static json helper exists (used by NextResponse)
if (typeof global.Response?.json !== 'function') {
  // eslint-disable-next-line no-param-reassign
  global.Response.json = (data: unknown, init: ResponseInit = {}) => {
    const headers = new global.Headers(init.headers);
    if (!headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }
    return new global.Response(JSON.stringify(data), {
      ...init,
      headers,
    });
  };
}
