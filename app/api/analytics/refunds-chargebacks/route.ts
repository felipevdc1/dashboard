/**
 * API Route: Analytics - Refunds and Chargebacks
 *
 * Returns comprehensive analytics about refunds and chargebacks including:
 * - Timeline (by month)
 * - Cohort analysis
 * - Breakdown by affiliate
 * - Breakdown by product
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  calculateTimeline,
  calculateCohortAnalysis,
  calculateByAffiliate,
  calculateByProduct,
} from '@/lib/analytics/refunds-chargebacks';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get('months') || '12');

    console.log(`📊 Fetching refunds/chargebacks analytics for last ${months} months...`);
    const startTime = Date.now();

    // Calculate start date (N months ago)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Fetch all orders from last N months
    // Need wider range to capture old orders with recent refunds/chargebacks
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch orders', message: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ Fetched ${orders?.length || 0} orders`);

    // Calculate analytics
    const timeline = calculateTimeline(orders || [], months);
    const cohortAnalysis = calculateCohortAnalysis(orders || [], months);
    const byAffiliate = calculateByAffiliate(orders || []);
    const byProduct = calculateByProduct(orders || []);

    const duration = Date.now() - startTime;
    console.log(`⚡ Analytics calculated in ${duration}ms`);

    return NextResponse.json({
      timeline,
      cohortAnalysis,
      byAffiliate,
      byProduct,
      _meta: {
        months,
        ordersTotal: orders?.length || 0,
        duration,
      },
    });
  } catch (error: any) {
    console.error('Error in refunds-chargebacks analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
