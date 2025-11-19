/**
 * Query Helpers for Reports System
 *
 * Funções para buscar e filtrar notas de refunds/chargebacks
 * combinando dados da tabela order_notes com orders
 */

import { createClient } from '@supabase/supabase-js';
import type { OrderNote } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface OrderWithNote {
  // Order fields
  id: number;
  order_number: string;
  status: string;
  total_price: number;
  created_at: string;
  customer_email: string;
  customer_name: string;
  affiliate_name: string | null;
  affiliate_slug: string;
  // Refund fields (from JSONB)
  refund_amount?: number;
  refund_date?: string;
  // Chargeback fields
  chargeback_at?: string | null;
  // Note fields
  canal: string | null;
  motivo: string | null;
  responsavel: string | null;
  devolveu: boolean | null;
  observacoes: string | null;
}

export interface ReportFilters {
  tipo?: 'refund' | 'chargeback';
  canal?: string;
  motivo?: string;
  responsavel?: string;
  devolveu?: boolean;
  startDate?: string;
  endDate?: string;
  affiliate?: string;
  limit?: number;
  offset?: number;
}

export interface ReportSummary {
  totalCount: number;
  totalAmount: number;
  byCanal: Record<string, { count: number; amount: number }>;
  byMotivo: Record<string, { count: number; amount: number }>;
  byResponsavel: Record<string, { count: number; amount: number }>;
  devolucaoRate: number; // % de casos onde devolveu = true
}

/**
 * Busca refunds/chargebacks com notas
 */
export async function getOrdersWithNotes(
  filters: ReportFilters = {}
): Promise<{ data: OrderWithNote[]; count: number; error: any }> {
  let query = supabase
    .from('orders')
    .select(
      `
      id,
      order_number,
      status,
      total_price,
      created_at,
      customer_email,
      customer_name,
      affiliate_name,
      affiliate_slug,
      chargeback_at,
      refunds,
      order_notes!inner (
        canal,
        motivo,
        responsavel,
        devolveu,
        observacoes,
        tipo
      )
    `,
      { count: 'exact' }
    );

  // Filtro por tipo (refund ou chargeback)
  if (filters.tipo) {
    query = query.eq('order_notes.tipo', filters.tipo);
  }

  // Filtro por canal
  if (filters.canal) {
    query = query.eq('order_notes.canal', filters.canal);
  }

  // Filtro por motivo
  if (filters.motivo) {
    query = query.eq('order_notes.motivo', filters.motivo);
  }

  // Filtro por responsável
  if (filters.responsavel) {
    query = query.eq('order_notes.responsavel', filters.responsavel);
  }

  // Filtro por devolveu
  if (filters.devolveu !== undefined) {
    query = query.eq('order_notes.devolveu', filters.devolveu);
  }

  // Filtro por período
  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate);
  }

  // Filtro por afiliado
  if (filters.affiliate) {
    query = query.eq('affiliate_slug', filters.affiliate);
  }

  // Ordenação (mais recentes primeiro)
  query = query.order('created_at', { ascending: false });

  // Paginação
  if (filters.limit) {
    query = query.limit(filters.limit);
  }
  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    return { data: [], count: 0, error };
  }

  // Transform data to flatten order_notes
  const transformedData: OrderWithNote[] = (data || []).map((order: any) => {
    const note = Array.isArray(order.order_notes)
      ? order.order_notes[0]
      : order.order_notes;

    // Extract refund info from JSONB array
    let refundAmount = 0;
    let refundDate = null;

    if (order.refunds && Array.isArray(order.refunds) && order.refunds.length > 0) {
      const latestRefund = order.refunds[order.refunds.length - 1];
      refundAmount = parseFloat(latestRefund.total_amount?.replace(',', '.') || '0');
      refundDate = latestRefund.processed_at || latestRefund.created_at;
    }

    return {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      total_price: order.total_price,
      created_at: order.created_at,
      customer_email: order.customer_email,
      customer_name: order.customer_name,
      affiliate_name: order.affiliate_name,
      affiliate_slug: order.affiliate_slug,
      chargeback_at: order.chargeback_at,
      refund_amount: refundAmount,
      refund_date: refundDate,
      canal: note?.canal || null,
      motivo: note?.motivo || null,
      responsavel: note?.responsavel || null,
      devolveu: note?.devolveu || null,
      observacoes: note?.observacoes || null,
    };
  });

  return { data: transformedData, count: count || 0, error: null };
}

/**
 * Busca sumário agregado de refunds/chargebacks
 */
export async function getReportSummary(
  filters: ReportFilters = {}
): Promise<{ data: ReportSummary | null; error: any }> {
  const { data: orders, error } = await getOrdersWithNotes(filters);

  if (error) {
    return { data: null, error };
  }

  // Aggregate by canal
  const byCanal: Record<string, { count: number; amount: number }> = {};
  const byMotivo: Record<string, { count: number; amount: number }> = {};
  const byResponsavel: Record<string, { count: number; amount: number }> = {};

  let totalCount = 0;
  let totalAmount = 0;
  let devolucaoCount = 0;
  let devolucaoTotal = 0;

  orders.forEach((order) => {
    totalCount++;
    const amount = order.refund_amount || order.total_price || 0;
    totalAmount += amount;

    // By Canal
    const canal = order.canal || 'Sem canal';
    if (!byCanal[canal]) {
      byCanal[canal] = { count: 0, amount: 0 };
    }
    byCanal[canal].count++;
    byCanal[canal].amount += amount;

    // By Motivo
    const motivo = order.motivo || 'Sem motivo';
    if (!byMotivo[motivo]) {
      byMotivo[motivo] = { count: 0, amount: 0 };
    }
    byMotivo[motivo].count++;
    byMotivo[motivo].amount += amount;

    // By Responsável
    const responsavel = order.responsavel || 'Sem responsável';
    if (!byResponsavel[responsavel]) {
      byResponsavel[responsavel] = { count: 0, amount: 0 };
    }
    byResponsavel[responsavel].count++;
    byResponsavel[responsavel].amount += amount;

    // Devolução rate
    if (order.devolveu !== null) {
      devolucaoTotal++;
      if (order.devolveu === true) {
        devolucaoCount++;
      }
    }
  });

  const devolucaoRate = devolucaoTotal > 0 ? (devolucaoCount / devolucaoTotal) * 100 : 0;

  return {
    data: {
      totalCount,
      totalAmount,
      byCanal,
      byMotivo,
      byResponsavel,
      devolucaoRate,
    },
    error: null,
  };
}

/**
 * Busca valores únicos para filtros (dropdowns)
 */
export async function getFilterOptions(
  tipo?: 'refund' | 'chargeback'
): Promise<{
  canais: string[];
  motivos: string[];
  responsaveis: string[];
}> {
  let query = supabase
    .from('order_notes')
    .select('canal, motivo, responsavel, tipo');

  if (tipo) {
    query = query.eq('tipo', tipo);
  }

  const { data, error } = await query;

  if (error || !data) {
    return { canais: [], motivos: [], responsaveis: [] };
  }

  const canais = [...new Set(data.map((n) => n.canal).filter(Boolean))].sort() as string[];
  const motivos = [...new Set(data.map((n) => n.motivo).filter(Boolean))].sort() as string[];
  const responsaveis = [...new Set(data.map((n) => n.responsavel).filter(Boolean))].sort() as string[];

  return { canais, motivos, responsaveis };
}

/**
 * Busca uma nota específica por order_id
 */
export async function getOrderNote(
  orderId: number
): Promise<{ data: OrderNote | null; error: any }> {
  const { data, error } = await supabase
    .from('order_notes')
    .select('*')
    .eq('order_id', orderId)
    .single();

  return { data, error };
}
