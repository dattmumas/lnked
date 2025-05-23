const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Use service role key from environment or prompt user
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error(
    '   NEXT_PUBLIC_SUPABASE_URL:',
    SUPABASE_URL ? '✅' : '❌ Missing',
  );
  console.error(
    '   SUPABASE_SERVICE_ROLE_KEY:',
    SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌ Missing',
  );
  process.exit(1);
}

async function executeSQL(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({ sql }),
  });

  if (!response.ok) {
    // Try alternative direct SQL execution
    const sqlResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sql',
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
      body: sql,
    });

    if (!sqlResponse.ok) {
      throw new Error(`SQL execution failed: ${sqlResponse.statusText}`);
    }
    return await sqlResponse.text();
  }

  return await response.json();
}

async function applyRLSFixes() {
  console.log('🔧 Applying RLS policy fixes...');

  // Key fixes to apply manually
  const fixes = [
    // Drop problematic policies first
    `DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;`,
    `DROP POLICY IF EXISTS "Conversation admins can manage participants" ON public.conversation_participants;`,

    // Create safe policies
    `CREATE POLICY "Users can add themselves to conversations" ON public.conversation_participants FOR INSERT WITH CHECK (auth.uid() = user_id);`,

    `CREATE POLICY "Users can update their own participant record" ON public.conversation_participants FOR UPDATE USING (auth.uid() = user_id);`,

    `CREATE POLICY "Participants can view all participants in their conversations" ON public.conversation_participants FOR SELECT USING (auth.uid() IN (SELECT cp.user_id FROM public.conversation_participants cp WHERE cp.conversation_id = public.conversation_participants.conversation_id));`,

    // User sync function
    `CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$ BEGIN INSERT INTO public.users (id, full_name, avatar_url, updated_at) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.raw_user_meta_data->>'avatar_url', NOW()) ON CONFLICT (id) DO UPDATE SET full_name = COALESCE(EXCLUDED.full_name, public.users.full_name), avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url), updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql SECURITY DEFINER;`,

    // Sync current users
    `INSERT INTO public.users (id, full_name, updated_at) SELECT au.id, COALESCE(au.raw_user_meta_data->>'full_name', au.email), NOW() FROM auth.users au WHERE NOT EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = au.id) ON CONFLICT (id) DO NOTHING;`,
  ];

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let successCount = 0;

  for (let i = 0; i < fixes.length; i++) {
    const sql = fixes[i];
    console.log(`Executing fix ${i + 1}/${fixes.length}...`);

    try {
      await executeSQL(sql);
      successCount++;
      console.log(`✅ Fix ${i + 1} applied successfully`);
    } catch (err) {
      console.log(`⚠️  Fix ${i + 1} failed: ${err.message}`);
    }
  }

  console.log(`\n🎉 Applied ${successCount}/${fixes.length} fixes`);

  // Verify the fix worked
  console.log('\n🔍 Verifying fixes...');

  const tables = [
    'conversations',
    'conversation_participants',
    'messages',
    'message_reactions',
    'message_read_receipts',
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: accessible`);
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }
}

applyRLSFixes().catch(console.error);
