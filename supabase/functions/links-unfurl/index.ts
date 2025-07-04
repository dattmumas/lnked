// supabase/functions/links-unfurl/index.ts
import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import * as cheerio from 'npm:cheerio@1.0.0-rc.12';

/* ------------------------------------------------------------------ */
/*  Shared headers                                                    */
/* ------------------------------------------------------------------ */
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers':
    'content-type, authorization, apikey, x-client-info',
} as const;

/* ------------------------------------------------------------------ */
/*  HTTP entrypoint                                                   */
/* ------------------------------------------------------------------ */
serve(async (req): Promise<Response> => {
  /* ---- 1. CORS pre-flight --------------------------------------- */
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  /* ---- 2. Allow only POST --------------------------------------- */
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  /* ---- 3. Parse body safely ------------------------------------- */
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { url } = (payload as Record<string, unknown>) ?? {};
  if (typeof url !== 'string' || url.trim() === '') {
    return json({ error: 'Missing url' }, 400);
  }

  /* ---- 4. Fetch HTML & extract ---------------------------------- */
  const html = await fetchHtml(url);
  if (html === null) {
    return json({ error: 'Failed to fetch url' }, 400);
  }

  const preview = extractMeta(html, url);
  return json(preview);
});

/* ------------------------------------------------------------------ */
/*  Helper functions                                                  */
/* ------------------------------------------------------------------ */
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS },
  });
}

async function fetchHtml(target: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8_000);

  try {
    const res = await fetch(target, {
      headers: {
        // Realistic UA avoids many basic bot blocks
        'user-agent':
          'Mozilla/5.0 (compatible; LnkedBot/1.0; +https://lnked.com/bot)',
      },
      signal: ctrl.signal,
    });

    if (!res.ok) return null;
    const type = res.headers.get('content-type') ?? '';
    if (!type.startsWith('text/')) return null;

    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function extractMeta(html: string, base: string) {
  const $ = cheerio.load(html);

  const absolute = (src: string | undefined | null) =>
    src ? new URL(src, base).toString() : null;

  return {
    url: base,
    title:
      $('meta[property="og:title"]').attr('content') ??
      $('meta[name="twitter:title"]').attr('content') ??
      $('title').text() ??
      null,
    description:
      $('meta[property="og:description"]').attr('content') ??
      $('meta[name="twitter:description"]').attr('content') ??
      $('meta[name="description"]').attr('content') ??
      null,
    image: absolute(
      $('meta[property="og:image"]').attr('content') ??
        $('meta[name="twitter:image"]').attr('content'),
    ),
    site:
      $('meta[property="og:site_name"]').attr('content') ??
      new URL(base).hostname,
  };
}
