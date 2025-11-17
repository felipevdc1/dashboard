#!/usr/bin/env tsx
/**
 * Initial sync script - Loads all CartPanda orders into Supabase
 * Run with: npx tsx scripts/initial-sync.ts
 *
 * This script calls the /api/sync endpoint to perform the initial data load.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function runInitialSync() {
  console.log('🚀 Starting initial sync...');
  console.log(`📡 API URL: ${API_URL}/api/sync\n`);

  try {
    // First, check sync status
    console.log('📊 Checking current sync status...');
    const statusResponse = await fetch(`${API_URL}/api/sync`);
    const statusData = await statusResponse.json();

    if (!statusResponse.ok) {
      console.error('❌ Failed to check sync status:', statusData.message);
      process.exit(1);
    }

    console.log(`   Current database records: ${statusData.status.totalOrders}`);
    console.log(`   Last sync: ${statusData.status.lastSyncAt || 'Never'}\n`);

    // Confirm before proceeding
    if (statusData.status.totalOrders > 0) {
      console.log('⚠️  Database already contains orders. This will update existing records.');
      console.log('   Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Run the sync
    console.log('🔄 Starting sync from CartPanda to Supabase...');
    const startTime = Date.now();

    // Create abort controller with 5 minute timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes

    const syncResponse = await fetch(`${API_URL}/api/sync`, {
      method: 'POST',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const syncData = await syncResponse.json();

    if (!syncResponse.ok) {
      console.error('❌ Sync failed:', syncData.message);
      process.exit(1);
    }

    const duration = Date.now() - startTime;

    console.log('\n✅ Sync completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Fetched from CartPanda: ${syncData.stats.fetched} orders`);
    console.log(`   Synced to Supabase:     ${syncData.stats.synced} orders`);
    console.log(`   Duration:               ${Math.round(duration / 1000)}s`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Check final status
    console.log('\n📊 Verifying final database status...');
    const finalStatusResponse = await fetch(`${API_URL}/api/sync`);
    const finalStatusData = await finalStatusResponse.json();

    if (finalStatusResponse.ok) {
      console.log(`   ✅ Total records in database: ${finalStatusData.status.totalOrders}`);
      console.log(`   ✅ Last sync: ${finalStatusData.status.lastSyncAt}`);
    }

    console.log('\n🎉 Initial sync complete! Your dashboard now uses Supabase for data.');
    console.log('💡 Tip: Set up a cron job to run this sync periodically (e.g., every 15 minutes)');

  } catch (error) {
    console.error('\n❌ Sync failed with error:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
    }
    process.exit(1);
  }
}

// Run the sync
runInitialSync()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
