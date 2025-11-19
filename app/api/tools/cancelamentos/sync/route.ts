/**
 * API Route: POST /api/tools/cancelamentos/sync
 *
 * Sincroniza dados processados pela ferramenta de cancelamentos
 * diretamente para a tabela order_notes no Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { gerarCancelamentos } from '@/lib/tools/cancelamentos';
import { createClient } from '@supabase/supabase-js';
import Papa from 'papaparse';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface SyncStats {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  errorDetails: Array<{ orderNumber: string; error: string }>;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Parse form data
    const formData = await request.formData();
    const reembolsoFile = formData.get('reembolso') as File;
    const chargebackFile = formData.get('chargeback') as File;

    if (!reembolsoFile || !chargebackFile) {
      return NextResponse.json(
        { error: 'Arquivos de reembolso e chargeback são obrigatórios' },
        { status: 400 }
      );
    }

    // Validate file types
    if (!reembolsoFile.name.endsWith('.csv') || !chargebackFile.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Apenas arquivos CSV são permitidos' },
        { status: 400 }
      );
    }

    // 2. Read file contents
    const reembolsoText = await reembolsoFile.text();
    const chargebackText = await chargebackFile.text();

    // 3. Process CSVs using existing logic
    console.log('📊 Processando CSVs...');
    const csvResult = await gerarCancelamentos(reembolsoText, chargebackText);

    // 4. Parse generated CSV
    const finalData = Papa.parse(csvResult, {
      header: true,
      skipEmptyLines: true,
    });

    if (!finalData.data || finalData.data.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum dado encontrado nos CSVs' },
        { status: 400 }
      );
    }

    // 5. Connect to Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 6. Process each row and insert into order_notes
    const stats: SyncStats = {
      total: finalData.data.length,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      errorDetails: [],
    };

    console.log(`📝 Processando ${stats.total} registros...`);

    for (const row of finalData.data as any[]) {
      const orderNumber = row['Order'];

      if (!orderNumber) {
        stats.skipped++;
        continue;
      }

      try {
        // 6.1. Lookup order_id by order_number
        const { data: order, error: lookupError } = await supabase
          .from('orders')
          .select('id')
          .eq('order_number', orderNumber)
          .single();

        if (lookupError || !order) {
          stats.skipped++;
          stats.errorDetails.push({
            orderNumber,
            error: 'Order não encontrado no banco de dados',
          });
          continue;
        }

        // 6.2. Check if note already exists
        const { data: existingNote } = await supabase
          .from('order_notes')
          .select('order_id')
          .eq('order_id', order.id)
          .single();

        // 6.3. Prepare note data
        const noteData = {
          order_id: order.id,
          canal: row['Canal'] || null,
          motivo: row['Motivo'] || null,
          responsavel: row['Responsável'] || null,
          devolveu: row['Devolveu?'] === 'Sim' ? true : row['Devolveu?'] === 'Não' ? false : null,
          observacoes: row['Evidência/Detalhes'] || null,
          tipo: (row['Tipo de cancelamento'] || '').includes('Chargeback')
            ? ('chargeback' as const)
            : ('refund' as const),
          source: 'tools_import' as const,
        };

        // 6.4. UPSERT into order_notes
        const { error: upsertError } = await supabase
          .from('order_notes')
          .upsert(noteData, {
            onConflict: 'order_id',
          });

        if (upsertError) {
          stats.errors++;
          stats.errorDetails.push({
            orderNumber,
            error: upsertError.message,
          });
          console.error(`❌ Erro ao inserir order ${orderNumber}:`, upsertError.message);
        } else {
          if (existingNote) {
            stats.updated++;
            console.log(`✏️  Atualizado: order ${orderNumber}`);
          } else {
            stats.inserted++;
            console.log(`✅ Inserido: order ${orderNumber}`);
          }
        }
      } catch (err: any) {
        stats.errors++;
        stats.errorDetails.push({
          orderNumber,
          error: err.message || 'Erro desconhecido',
        });
        console.error(`❌ Erro ao processar order ${orderNumber}:`, err);
      }
    }

    // 7. Return results
    console.log('\n📊 RESUMO DA SINCRONIZAÇÃO:');
    console.log(`   Total: ${stats.total}`);
    console.log(`   ✅ Inseridos: ${stats.inserted}`);
    console.log(`   ✏️  Atualizados: ${stats.updated}`);
    console.log(`   ⊘ Pulados: ${stats.skipped}`);
    console.log(`   ❌ Erros: ${stats.errors}`);

    return NextResponse.json(
      {
        success: true,
        stats: {
          total: stats.total,
          inserted: stats.inserted,
          updated: stats.updated,
          skipped: stats.skipped,
          errors: stats.errors,
        },
        errorDetails: stats.errorDetails.slice(0, 10), // Return first 10 errors
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Erro ao processar sincronização:', error);
    return NextResponse.json(
      {
        error: 'Erro ao processar sincronização',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
