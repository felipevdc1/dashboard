/**
 * Affiliate Analytics Export Utilities
 *
 * Provides CSV and XLSX export functionality for affiliate analytics data
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type {
  AffiliateDetails,
  AffiliateAnalyticsResponse,
  AffiliateOrderItem,
} from '@/lib/affiliates/types';

/**
 * Export format types
 */
export type ExportFormat = 'csv' | 'xlsx';

/**
 * Export data structure for affiliate analytics
 */
interface AffiliateExportRow {
  'Pedido': string;
  'Data': string;
  'Status': string;
  'Cliente Nome': string;
  'Cliente Email': string;
  'Produto': string;
  'Quantidade': number;
  'Valor Total': string;
  'Comissão': string;
}

/**
 * Convert affiliate analytics data to export rows
 */
function convertToExportRows(
  data: AffiliateAnalyticsResponse
): AffiliateExportRow[] {
  const rows: AffiliateExportRow[] = [];

  data.orders.forEach((order: AffiliateOrderItem) => {
    // One row per line item
    order.line_items.forEach((item) => {
      rows.push({
        'Pedido': order.order_number || String(order.id),
        'Data': new Date(order.created_at).toLocaleString('pt-BR', {
          dateStyle: 'short',
          timeStyle: 'short',
        }),
        'Status': order.status || 'N/A',
        'Cliente Nome': `${order.customer.first_name} ${order.customer.last_name}`,
        'Cliente Email': order.customer.email,
        'Produto': item.title,
        'Quantidade': item.quantity,
        'Valor Total': `R$ ${parseFloat(order.total_price).toFixed(2)}`,
        'Comissão': `R$ ${parseFloat(order.affiliate_amount || '0').toFixed(2)}`,
      });
    });
  });

  return rows;
}

/**
 * Export affiliate analytics data to CSV
 */
export function exportToCSV(
  data: AffiliateAnalyticsResponse,
  affiliateName: string
): { content: string; filename: string } {
  const rows = convertToExportRows(data);

  // Convert to CSV using Papa Parse
  const csv = Papa.unparse(rows, {
    delimiter: ',',
    header: true,
    skipEmptyLines: true,
  });

  // Add UTF-8 BOM for Excel compatibility
  const csvWithBOM = '\uFEFF' + csv;

  // Generate filename
  const date = new Date().toISOString().split('T')[0];
  const safeName = affiliateName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Analytics_${safeName}_${date}.csv`;

  return {
    content: csvWithBOM,
    filename,
  };
}

/**
 * Export affiliate analytics data to XLSX (Excel)
 */
export function exportToXLSX(
  data: AffiliateAnalyticsResponse,
  affiliateName: string
): { buffer: ArrayBuffer; filename: string } {
  const rows = convertToExportRows(data);

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Create worksheet from data
  const ws = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  ws['!cols'] = [
    { wch: 15 }, // Pedido
    { wch: 18 }, // Data
    { wch: 12 }, // Status
    { wch: 25 }, // Cliente Nome
    { wch: 30 }, // Cliente Email
    { wch: 40 }, // Produto
    { wch: 10 }, // Quantidade
    { wch: 15 }, // Valor Total
    { wch: 15 }, // Comissão
  ];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');

  // Create summary sheet
  const summary = [
    { Métrica: 'Total de Pedidos', Valor: data.summary.total },
    { Métrica: 'Pedidos Pagos', Valor: data.summary.paid },
    { Métrica: 'Reembolsos', Valor: data.summary.refunded },
    { Métrica: 'Chargebacks', Valor: data.summary.chargebacks },
    { Métrica: 'Pendentes', Valor: data.summary.pending },
    { Métrica: 'Receita Total', Valor: `R$ ${data.summary.revenue.toFixed(2)}` },
    { Métrica: 'Comissão Total', Valor: `R$ ${data.summary.commission.toFixed(2)}` },
    { Métrica: '', Valor: '' },
    { Métrica: 'Afiliado', Valor: affiliateName },
    { Métrica: 'Email', Valor: data.affiliate.email },
    { Métrica: 'Data Exportação', Valor: new Date().toLocaleString('pt-BR') },
  ];

  const wsSummary = XLSX.utils.json_to_sheet(summary);
  wsSummary['!cols'] = [{ wch: 20 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo');

  // Write to buffer
  const buffer = XLSX.write(wb, {
    bookType: 'xlsx',
    type: 'array',
  });

  // Generate filename
  const date = new Date().toISOString().split('T')[0];
  const safeName = affiliateName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Analytics_${safeName}_${date}.xlsx`;

  return {
    buffer,
    filename,
  };
}

/**
 * Trigger download in browser
 */
export function downloadFile(
  content: string | ArrayBuffer,
  filename: string,
  mimeType: string
) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Main export function - handles both CSV and XLSX
 */
export function exportAffiliateAnalytics(
  data: AffiliateAnalyticsResponse,
  affiliateName: string,
  format: ExportFormat
) {
  if (format === 'csv') {
    const { content, filename } = exportToCSV(data, affiliateName);
    downloadFile(content, filename, 'text/csv;charset=utf-8;');
  } else if (format === 'xlsx') {
    const { buffer, filename } = exportToXLSX(data, affiliateName);
    downloadFile(buffer, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }
}
