import { NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  getOrCreateExpressAccount,
  createAccountLink,
} from '@/services/stripe/userOnboarding';

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  try {
    const accountId = await getOrCreateExpressAccount(user.id);

    // ------------------------------------------------------------------
    // Determine absolute base URL for return / refresh links.
    // 1. Prefer NEXT_PUBLIC_SITE_URL when it starts with http(s)://
    // 2. Fallback to the origin of the incoming request (dev env)
    // 3. Fail fast if neither is absolute (prevents invalid_return_url)
    // ------------------------------------------------------------------
    const envBase = process.env['NEXT_PUBLIC_SITE_URL'];
    const trimmedEnv =
      typeof envBase === 'string' ? envBase.replace(/\/$/, '') : undefined;

    const isAbsolute = (val?: string): val is string =>
      typeof val === 'string' && /^(https?:)\/\//i.test(val);

    const fallbackOrigin = new URL(req.url).origin;

    const base = isAbsolute(trimmedEnv) ? trimmedEnv : fallbackOrigin;

    if (!isAbsolute(base)) {
      return NextResponse.json(
        { error: 'NEXT_PUBLIC_SITE_URL env var is missing or invalid' },
        { status: 500 },
      );
    }

    const returnUrl = `${base}/settings/user/billing`;
    const url = await createAccountLink(accountId, returnUrl);

    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
