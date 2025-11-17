#!/usr/bin/env tsx
/**
 * Script to run a specific SQL migration on Supabase
 * Usage: npx tsx scripts/run-migration.ts supabase/migrations/003_validation_logs.sql
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration(filePath: string) {
  console.log(`\n📝 Running migration: ${filePath}\n`);

  // Read SQL file
  const sqlContent = fs.readFileSync(filePath, 'utf-8');

  // Split into statements (simple split by semicolon + newline)
  const statements = sqlContent
    .split(';\n')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';
    const preview = statement.substring(0, 80).replace(/\n/g, ' ');

    process.stdout.write(`[${i + 1}/${statements.length}] ${preview}...`);

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement }) as any;

      if (error) {
        // Try direct query if RPC doesn't exist
        const { error: queryError } = await supabase.from('_sql').select('*').limit(0) as any;

        // If both fail, it's a real error
        console.log(' ❌');
        console.error(`   Error: ${error.message}`);
        errorCount++;
        continue;
      }

      console.log(' ✅');
      successCount++;
    } catch (err) {
      console.log(' ❌');
      console.error(`   Error:`, err);
      errorCount++;
    }
  }

  console.log(`\n📊 Results:`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
  console.log();

  if (errorCount > 0) {
    console.log('⚠️  Some statements failed. Check logs above.');
    console.log('💡 You may need to run these manually in Supabase SQL Editor.\n');
  } else {
    console.log('✅ Migration completed successfully!\n');
  }
}

// Get migration file from command line
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: npx tsx scripts/run-migration.ts <migration-file>');
  console.error('Example: npx tsx scripts/run-migration.ts supabase/migrations/003_validation_logs.sql');
  process.exit(1);
}

if (!fs.existsSync(migrationFile)) {
  console.error(`❌ File not found: ${migrationFile}`);
  process.exit(1);
}

runMigration(migrationFile)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
  });
