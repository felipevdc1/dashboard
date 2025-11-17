/**
 * Monitoring and Structured Logging
 *
 * Provides:
 * - Structured logging with context
 * - Alert webhooks (Discord/Slack)
 * - Metrics collection
 * - Error tracking
 */

import { syncLogger } from './logger';

export interface Alert {
  level: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  context?: Record<string, any>;
  timestamp: string;
}

export interface SyncMetrics {
  totalOrders: number;
  syncedOrders: number;
  failedBatches: number;
  retries: number;
  duration: number; // seconds
  source: 'cartpanda' | 'digistore24' | 'full' | 'incremental';
  startedAt: string;
  completedAt: string;
}

/**
 * Send alert to webhook (Discord/Slack)
 */
export async function sendAlert(alert: Alert): Promise<void> {
  const webhookUrl = process.env.ALERT_WEBHOOK_URL;

  if (!webhookUrl) {
    syncLogger.warn('ALERT_WEBHOOK_URL not configured - alert not sent', alert);
    return;
  }

  try {
    const payload = formatWebhookPayload(alert);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook returned ${response.status}`);
    }

    syncLogger.info('Alert sent successfully', { title: alert.title });
  } catch (error) {
    syncLogger.error('Failed to send alert', { error, alert });
  }
}

/**
 * Format alert for Discord/Slack webhook
 */
function formatWebhookPayload(alert: Alert): any {
  const color = {
    info: 3447003, // Blue
    warning: 16776960, // Yellow
    error: 16711680, // Red
    critical: 10038562, // Dark red
  }[alert.level];

  // Discord/Slack-compatible format
  return {
    embeds: [
      {
        title: `${getEmojiForLevel(alert.level)} ${alert.title}`,
        description: alert.message,
        color,
        fields: alert.context
          ? Object.entries(alert.context).map(([key, value]) => ({
              name: key,
              value: String(value),
              inline: true,
            }))
          : [],
        timestamp: alert.timestamp,
        footer: {
          text: 'Dashboard Sync Monitor',
        },
      },
    ],
  };
}

function getEmojiForLevel(level: Alert['level']): string {
  return {
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌',
    critical: '🔥',
  }[level];
}

/**
 * Monitor class for sync operations
 */
export class SyncMonitor {
  private metrics: Partial<SyncMetrics> = {};
  private startTime: number = 0;

  start(source: SyncMetrics['source']): void {
    this.startTime = Date.now();
    this.metrics = {
      source,
      startedAt: new Date().toISOString(),
      totalOrders: 0,
      syncedOrders: 0,
      failedBatches: 0,
      retries: 0,
    };

    syncLogger.info(`Sync started: ${source}`, this.metrics);
  }

  recordBatch(ordersCount: number, success: boolean): void {
    if (success) {
      this.metrics.syncedOrders = (this.metrics.syncedOrders || 0) + ordersCount;
    } else {
      this.metrics.failedBatches = (this.metrics.failedBatches || 0) + 1;
    }
  }

  recordRetry(): void {
    this.metrics.retries = (this.metrics.retries || 0) + 1;
  }

  async complete(totalOrders: number): Promise<void> {
    this.metrics.totalOrders = totalOrders;
    this.metrics.completedAt = new Date().toISOString();
    this.metrics.duration = (Date.now() - this.startTime) / 1000;

    const successRate =
      totalOrders > 0
        ? ((this.metrics.syncedOrders || 0) / totalOrders) * 100
        : 100;

    syncLogger.info('Sync completed', {
      ...this.metrics,
      successRate: `${successRate.toFixed(2)}%`,
    });

    // Alert on low success rate
    if (successRate < 95) {
      await sendAlert({
        level: 'warning',
        title: 'Sync Completed with Issues',
        message: `Success rate: ${successRate.toFixed(2)}%`,
        context: this.metrics as Record<string, any>,
        timestamp: new Date().toISOString(),
      });
    }

    // Alert on failures
    if ((this.metrics.failedBatches || 0) > 0) {
      await sendAlert({
        level: 'error',
        title: 'Sync Failed Batches',
        message: `${this.metrics.failedBatches} batches failed during sync`,
        context: this.metrics as Record<string, any>,
        timestamp: new Date().toISOString(),
      });
    }

    // Write metrics to file (optional)
    await this.writeMetricsFile();
  }

  async fail(error: Error): Promise<void> {
    this.metrics.completedAt = new Date().toISOString();
    this.metrics.duration = (Date.now() - this.startTime) / 1000;

    syncLogger.error('Sync failed', {
      ...this.metrics,
      error: error.message,
      stack: error.stack,
    });

    await sendAlert({
      level: 'critical',
      title: 'Sync FAILED',
      message: error.message,
      context: {
        ...this.metrics,
        errorStack: error.stack?.substring(0, 500) || '',
      } as Record<string, any>,
      timestamp: new Date().toISOString(),
    });
  }

  private async writeMetricsFile(): Promise<void> {
    if (typeof window !== 'undefined') return; // Skip in browser

    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      const metricsPath = path.join(process.cwd(), 'sync-metrics.json');
      const existingMetrics: SyncMetrics[] = [];

      try {
        const existingData = await fs.readFile(metricsPath, 'utf-8');
        existingMetrics.push(...JSON.parse(existingData));
      } catch {
        // File doesn't exist yet
      }

      // Keep only last 100 syncs
      existingMetrics.push(this.metrics as SyncMetrics);
      const recentMetrics = existingMetrics.slice(-100);

      await fs.writeFile(metricsPath, JSON.stringify(recentMetrics, null, 2));

      syncLogger.info('Metrics written to sync-metrics.json');
    } catch (error) {
      syncLogger.warn('Failed to write metrics file', { error });
    }
  }

  getMetrics(): Partial<SyncMetrics> {
    return { ...this.metrics };
  }
}

/**
 * Health check utilities
 */
export async function checkSupabaseConnection(): Promise<{
  status: 'healthy' | 'unhealthy';
  message: string;
  responseTime?: number;
}> {
  const startTime = Date.now();

  try {
    const { supabase } = await import('./supabase');

    const { error, count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    const responseTime = Date.now() - startTime;

    if (error) {
      return {
        status: 'unhealthy',
        message: `Supabase error: ${error.message}`,
      };
    }

    return {
      status: 'healthy',
      message: `${count || 0} orders in database`,
      responseTime,
    };
  } catch (error: any) {
    return {
      status: 'unhealthy',
      message: error.message || 'Connection failed',
    };
  }
}

export async function checkCartPandaAPI(): Promise<{
  status: 'healthy' | 'unhealthy';
  message: string;
  responseTime?: number;
}> {
  const startTime = Date.now();

  try {
    const { cartPandaClient } = await import('./cartpanda/client');

    const response = await cartPandaClient.getOrders({ per_page: 1 });

    const responseTime = Date.now() - startTime;

    // Check if response has orders
    if (!response || !response.orders) {
      return {
        status: 'unhealthy',
        message: 'API returned invalid response',
      };
    }

    return {
      status: 'healthy',
      message: `API responding (${response.orders.length} orders in sample)`,
      responseTime,
    };
  } catch (error: any) {
    return {
      status: 'unhealthy',
      message: error.message || 'API unreachable',
    };
  }
}

export async function checkLastSyncAge(): Promise<{
  status: 'healthy' | 'unhealthy';
  message: string;
  lastSyncHoursAgo?: number;
}> {
  try {
    const { supabase } = await import('./supabase');

    const { data, error } = await supabase
      .from('orders')
      .select('synced_at')
      .order('synced_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return {
        status: 'unhealthy',
        message: 'No synced orders found',
      };
    }

    const lastSyncTime = new Date((data as any).synced_at).getTime();
    const now = Date.now();
    const hoursAgo = (now - lastSyncTime) / (1000 * 60 * 60);

    // Alert if last sync > 25 hours ago (should run every 24h)
    if (hoursAgo > 25) {
      return {
        status: 'unhealthy',
        message: `Last sync was ${hoursAgo.toFixed(1)} hours ago`,
        lastSyncHoursAgo: hoursAgo,
      };
    }

    return {
      status: 'healthy',
      message: `Last sync ${hoursAgo.toFixed(1)} hours ago`,
      lastSyncHoursAgo: hoursAgo,
    };
  } catch (error: any) {
    return {
      status: 'unhealthy',
      message: error.message || 'Check failed',
    };
  }
}
