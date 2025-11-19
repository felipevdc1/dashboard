/**
 * Script para importar "Notas do pedido" dos CSVs da CartPanda
 *
 * Lê os CSVs de REEMBOLSO e CHARGEBACK e extrai as notas estruturadas
 * (Canal, Motivo, Responsável, Devolveu, Obs) para a tabela order_notes
 */

import { createClient } from '@supabase/supabase-js';
import Papa from 'papaparse';
import fs from 'fs';
import path from 'path';
import type { OrderNote, ParsedNotes, ImportStats } from '../lib/reports/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Parse "Notas do pedido" field
 * Formato esperado:
 * " Canal: Manifestsuccess
 *   Motivo: Desistência
 *   Responsável: Sem contato
 *   Devolveu: Sim
 *   Obs: Cliente não quis aguardar"
 */
function parseNotes(notesField: string): ParsedNotes {
  if (!notesField || notesField.trim() === '') {
    return {
      canal: null,
      motivo: null,
      responsavel: null,
      devolveu: null,
      observacoes: null,
    };
  }

  const canal = notesField.match(/Canal:\s*(.+?)(?:\n|$)/i)?.[1]?.trim() || null;
  const motivo = notesField.match(/Motivo:\s*(.+?)(?:\n|$)/i)?.[1]?.trim() || null;
  const responsavel = notesField.match(/Responsável:\s*(.+?)(?:\n|$)/i)?.[1]?.trim() || null;
  const devoleuStr = notesField.match(/Devolveu:\s*(.+?)(?:\n|$)/i)?.[1]?.trim() || null;
  const devolveu = devoleuStr ? (devoleuStr.toLowerCase() === 'sim') : null;
  const observacoes = notesField.match(/Obs:\s*(.+?)$/is)?.[1]?.trim() || null;

  return {
    canal,
    motivo,
    responsavel,
    devolveu,
    observacoes,
  };
}

/**
 * Import notes from a CSV file
 */
async function importFromCSV(
  filePath: string,
  tipo: 'refund' | 'chargeback'
): Promise<ImportStats> {
  console.log(`\n📂 Importando ${tipo} de: ${path.basename(filePath)}`);

  const stats: ImportStats = {
    totalRows: 0,
    successfulImports: 0,
    skipped: 0,
    errors: 0,
    notFoundOrders: 0,
    emptyNotes: 0,
  };

  // Read CSV file
  const fileContent = fs.readFileSync(filePath, 'utf-8');

  // Parse CSV
  const result = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
  });

  stats.totalRows = result.data.length;
  console.log(`✓ Total de linhas: ${stats.totalRows}`);

  const notesToInsert: OrderNote[] = [];

  for (const row of result.data as any[]) {
    const orderId = parseInt(row['Id de pedido']);
    const notesField = row['Notas do pedido'];

    if (isNaN(orderId)) {
      stats.errors++;
      continue;
    }

    // Parse notes
    const parsed = parseNotes(notesField);

    // Skip if all fields are null (empty note)
    if (!parsed.canal && !parsed.motivo && !parsed.responsavel && parsed.devolveu === null && !parsed.observacoes) {
      stats.emptyNotes++;
      continue;
    }

    notesToInsert.push({
      order_id: orderId,
      canal: parsed.canal,
      motivo: parsed.motivo,
      responsavel: parsed.responsavel,
      devolveu: parsed.devolveu,
      observacoes: parsed.observacoes,
      tipo,
      source: 'csv_import',
    });
  }

  console.log(`✓ Notas para inserir: ${notesToInsert.length}`);
  console.log(`⊘ Notas vazias: ${stats.emptyNotes}`);

  // Insert in batches of 100
  const batchSize = 100;
  for (let i = 0; i < notesToInsert.length; i += batchSize) {
    const batch = notesToInsert.slice(i, i + batchSize);

    const { error, count } = await supabase
      .from('order_notes')
      .upsert(batch, {
        onConflict: 'order_id',
        count: 'exact',
      });

    if (error) {
      console.error(`❌ Erro no batch ${i / batchSize + 1}:`, error.message);
      stats.errors += batch.length;
    } else {
      stats.successfulImports += count || batch.length;
      console.log(`✓ Batch ${Math.floor(i / batchSize) + 1}: ${count || batch.length} notas inseridas`);
    }
  }

  return stats;
}

/**
 * Main import function
 */
async function main() {
  console.log('🚀 Iniciando importação de Notas CartPanda\n');
  console.log('═'.repeat(60));

  const baseDir = path.join(process.cwd(), 'relatorios cartpanda');

  // Find CSV files
  const files = fs.readdirSync(baseDir);
  const refundFile = files.find(f => f.includes('REEMBOLSO'));
  const chargebackFile = files.find(f => f.includes('CHARGEBACK'));

  if (!refundFile || !chargebackFile) {
    console.error('❌ Arquivos CSV não encontrados!');
    console.error(`Procurando em: ${baseDir}`);
    process.exit(1);
  }

  console.log(`✓ Arquivo REEMBOLSO: ${refundFile}`);
  console.log(`✓ Arquivo CHARGEBACK: ${chargebackFile}`);
  console.log('═'.repeat(60));

  // Import refunds
  const refundStats = await importFromCSV(
    path.join(baseDir, refundFile),
    'refund'
  );

  // Import chargebacks
  const chargebackStats = await importFromCSV(
    path.join(baseDir, chargebackFile),
    'chargeback'
  );

  // Summary
  console.log('\n');
  console.log('═'.repeat(60));
  console.log('📊 RESUMO FINAL\n');

  console.log('REEMBOLSOS:');
  console.log(`  Total de linhas: ${refundStats.totalRows}`);
  console.log(`  ✅ Importadas: ${refundStats.successfulImports}`);
  console.log(`  ⊘ Notas vazias: ${refundStats.emptyNotes}`);
  console.log(`  ❌ Erros: ${refundStats.errors}\n`);

  console.log('CHARGEBACKS:');
  console.log(`  Total de linhas: ${chargebackStats.totalRows}`);
  console.log(`  ✅ Importadas: ${chargebackStats.successfulImports}`);
  console.log(`  ⊘ Notas vazias: ${chargebackStats.emptyNotes}`);
  console.log(`  ❌ Erros: ${chargebackStats.errors}\n`);

  const totalImported = refundStats.successfulImports + chargebackStats.successfulImports;
  console.log(`🎉 Total de notas importadas: ${totalImported}`);
  console.log('═'.repeat(60));
}

main().catch(console.error);
