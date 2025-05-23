require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

async function applyChatSchema() {
  console.log('Applying chat schema to remote database...');

  try {
    // Read the SQL file
    const sql = fs.readFileSync('apply-chat-to-remote.sql', 'utf8');

    // Split the SQL into individual statements (rough split)
    const statements = sql
      .split(/;\s*(?=CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|--)/g)
      .filter((stmt) => stmt.trim() && !stmt.trim().startsWith('--'))
      .map((stmt) => stmt.trim() + (stmt.trim().endsWith(';') ? '' : ';'));

    console.log(`Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);

        try {
          const { data, error } = await supabase.rpc('sql', {
            query: statement,
          });

          if (error) {
            console.log(`⚠️  Statement ${i + 1} warning/error:`, error.message);
            // Continue with other statements unless it's a critical error
            if (
              !error.message.includes('already exists') &&
              !error.message.includes('IF NOT EXISTS')
            ) {
              throw error;
            }
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.log(`❌ Failed to execute statement ${i + 1}:`, err.message);
          console.log('Statement:', statement.substring(0, 100) + '...');
          // Continue with other statements
        }
      }
    }

    console.log('\n🎉 Chat schema application completed!');

    // Verify the tables were created
    console.log('\nVerifying tables...');
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
          console.log(`✅ ${table}: exists and accessible`);
        }
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`);
      }
    }
  } catch (error) {
    console.error('❌ Failed to apply chat schema:', error.message);
  }
}

applyChatSchema();
