import { NextRequest, NextResponse } from 'next/server';
import { gerarCancelamentos } from '@/lib/tools/cancelamentos';

export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData();
    const reembolsoFile = formData.get('reembolso') as File;
    const chargebackFile = formData.get('chargeback') as File;

    if (!reembolsoFile || !chargebackFile) {
      return NextResponse.json(
        { error: 'Ambos os arquivos são obrigatórios' },
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

    // Read file contents
    const reembolsoText = await reembolsoFile.text();
    const chargebackText = await chargebackFile.text();

    // Process
    const csvResult = await gerarCancelamentos(reembolsoText, chargebackText);

    // Return as downloadable file
    return new NextResponse(csvResult, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="CANCELAMENTOS_FINAL.csv"',
      },
    });
  } catch (error) {
    console.error('Erro ao processar cancelamentos:', error);
    return NextResponse.json(
      {
        error: 'Erro ao processar arquivos',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
