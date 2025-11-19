/**
 * Types for Reports System
 */

export interface OrderNote {
  order_id: number;
  canal: string | null;
  motivo: string | null;
  responsavel: string | null;
  devolveu: boolean | null;
  observacoes: string | null;
  tipo: 'refund' | 'chargeback';
  source: 'csv_import' | 'manual' | 'tools_import';
  created_at?: string;
  updated_at?: string;
}

export interface ParsedNotes {
  canal: string | null;
  motivo: string | null;
  responsavel: string | null;
  devolveu: boolean | null;
  observacoes: string | null;
}

export interface ImportStats {
  totalRows: number;
  successfulImports: number;
  skipped: number;
  errors: number;
  notFoundOrders: number;
  emptyNotes: number;
}
