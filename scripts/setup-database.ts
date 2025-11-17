#!/usr/bin/env tsx
/**
 * Script to setup Supabase database schema
 * Run with: npx tsx scripts/setup-database.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

console.log('🔧 Setting up Supabase database schema...');
console.log(`📡 Connecting to: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Read schema SQL file
const schemaPath = path.join(__dirname, '../supabase/schema.sql');
const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

// Split SQL into individual statements (simple split by semicolon)
const statements = schemaSql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

async function executeSchema() {
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';

    // Skip comments
    if (statement.startsWith('--') || statement.startsWith('/*')) {
      continue;
    }

    console.log(`[${i + 1}/${statements.length}] Executing...`);

    try {
      // Use Supabase's RPC to execute raw SQL
      const { data, error } = await supabase.rpc('exec_sql', { sql: statement });

      if (error) {
        // If RPC doesn't exist, we need to use REST API directly
        console.log(`⚠️  RPC method not available, using REST API...`);

        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'apikey': supabaseServiceKey!,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sql: statement }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
      }

      console.log(`✅ Success\n`);
    } catch (err) {
      console.error(`❌ Error executing statement ${i + 1}:`);
      console.error(statement.substring(0, 100) + '...');
      console.error(err);
      console.log('');
    }
  }
}

executeSchema()
  .then(() => {
    console.log('\n✅ Database schema setup complete!');
    console.log('You can now run the initial sync to populate data.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
  });
