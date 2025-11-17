/**
 * Health Check Endpoint
 *
 * Verifica o status do sistema:
 * - Conexão Supabase
 * - API CartPanda
 * - Última sincronização
 * - Circuit breakers
 *
 * GET /api/health
 */

import { NextResponse } from 'next/server';
import {
  checkSupabaseConnection,
  checkCartPandaAPI,
  checkLastSyncAge,
} from '@/lib/monitoring';
import { globalCircuitBreakers } from '@/lib/retry';

export async function GET() {
  try {
    // Run health checks in parallel
    const [supabaseHealth, cartpandaHealth, syncAgeHealth] = await Promise.all([
      checkSupabaseConnection(),
      checkCartPandaAPI(),
      checkLastSyncAge(),
    ]);

    // Get circuit breaker states
    const circuitBreakers = {
      supabase: {
        state: globalCircuitBreakers.supabase.getState(),
        failures: globalCircuitBreakers.supabase.getFailureCount(),
      },
      cartpanda: {
        state: globalCircuitBreakers.cartpanda.getState(),
        failures: globalCircuitBreakers.cartpanda.getFailureCount(),
      },
    };

    // Determine overall status
    const isHealthy =
      supabaseHealth.status === 'healthy' &&
      cartpandaHealth.status === 'healthy' &&
      syncAgeHealth.status === 'healthy' &&
      circuitBreakers.supabase.state === 'CLOSED' &&
      circuitBreakers.cartpanda.state === 'CLOSED';

    const response = {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        supabase: supabaseHealth,
        cartpanda: cartpandaHealth,
        lastSync: syncAgeHealth,
      },
      circuitBreakers,
    };

    return NextResponse.json(response, {
      status: isHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        message: error.message || 'Health check failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
