import { NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user === null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Try to get personal tenant id via RPC
  const { data: tenantIdData } = await supabase.rpc(
    'get_user_personal_tenant',
    {
      target_user_id: user.id,
    },
  );

  let tenantId: string | null = tenantIdData ?? null;

  if (!tenantId) {
    // Create if missing
    await supabase.rpc('create_personal_tenant_for_user', {
      user_id: user.id,
    });
    const { data: newId } = await supabase.rpc('get_user_personal_tenant', {
      target_user_id: user.id,
    });
    tenantId = newId ?? null;
  }

  if (!tenantId) {
    return NextResponse.json(
      { error: 'Unable to determine personal tenant' },
      { status: 500 },
    );
  }

  // Set cookie via response
  const res = NextResponse.json({ tenant_id: tenantId });
  res.cookies.set('personal_tenant_id', tenantId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
