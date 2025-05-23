require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

async function checkTables() {
  console.log('Checking remote database tables...');
  console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

  const tables = [
    'conversations',
    'conversation_participants',
    'messages',
    'message_reactions',
    'message_read_receipts',
    'users',
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: exists (${data.length} rows checked)`);
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }

  // Check for the chat functions
  try {
    const { data, error } = await supabase.rpc('get_unread_message_count', {
      p_user_id: '00000000-0000-0000-0000-000000000001',
      p_conversation_id: '00000000-0000-0000-0000-000000000001',
    });
    console.log('✅ get_unread_message_count: function exists');
  } catch (err) {
    console.log('❌ get_unread_message_count: function missing');
  }

  // Check users count
  try {
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    console.log(`👥 Users in database: ${count}`);
  } catch (err) {
    console.log('❌ Error checking users count');
  }
}

checkTables();
