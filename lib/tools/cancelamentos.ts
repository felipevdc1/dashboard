/**
 * Cancelamentos Generator Utilities
 * TypeScript port of gerar_cancelamentos.py
 */

import Papa from 'papaparse';

// Tipos
interface OrderRow {
  [key: string]: string;
}

interface ParsedNotes {
  [key: string]: string;
}

interface CancelamentoRow {
  'Data Compra': string;
  'Data Cancelamento': string;
  Order: string;
  Email: string;
  'Tipo de cancelamento': string;
  'Valor Reembolsado': string;
  Canal: string;
  Motivo: string;
  'Responsável': string;
  'Devolveu?': string;
  'Evidência/Detalhes': string;
}

// Lista oficial de motivos
const MOTIVOS_VALIDOS = [
  'Não listado',
  'Teste',
  'Desistência',
  'Saúde / Contraindicação médica',
  'Cobrança / Pedido indevido',
  'Paypal - Atraso',
  'Problema de entrega',
  'Divergência de oferta',
  'Desconfiança',
  'Compra duplicada',
  'Produto',
  'Atraso envio',
  'Upsell sem querer',
  'Medo "recorrencia"',
  'Produto errado',
  'Amazon',
  'Devolvido ao remetente',
  'Atraso na entrega',
  'Taxa alfandega',
  'Não viu resultado',
  'Colaterais',
  'Gupta / Golpe',
];

// Mapeamento de variações
const MOTIVO_MAP: Record<string, string> = {
  'desistencia': 'Desistência',
  'desistência': 'Desistência',
  'nao viu resultado': 'Não viu resultado',
  'não viu resultado': 'Não viu resultado',
  'nao listad': 'Não listado',
  'saude': 'Saúde / Contraindicação médica',
  'saúde': 'Saúde / Contraindicação médica',
  'contraindicacao': 'Saúde / Contraindicação médica',
  'contraindicação': 'Saúde / Contraindicação médica',
  'cobranca': 'Cobrança / Pedido indevido',
  'cobrança': 'Cobrança / Pedido indevido',
  'pedido indevido': 'Cobrança / Pedido indevido',
  'problema de entrega': 'Problema de entrega',
  'divergencia de oferta': 'Divergência de oferta',
  'divergência de oferta': 'Divergência de oferta',
  'desconfianca': 'Desconfiança',
  'desconfiança': 'Desconfiança',
  'compra duplicada': 'Compra duplicada',
  'produto errado': 'Produto errado',
  'upsell sem querer': 'Upsell sem querer',
  'paypal - atraso': 'Paypal - Atraso',
  'atraso envio': 'Atraso envio',
  'atraso na entrega': 'Atraso na entrega',
  'taxa alfandega': 'Taxa alfandega',
  'taxa alfândega': 'Taxa alfandega',
  'colaterais': 'Colaterais',
  'gupta / golpe': 'Gupta / Golpe',
  'amazon': 'Amazon',
};

/**
 * Remove símbolos de valor e converte para float
 */
function limparValor(valor: string | number): number | null {
  if (typeof valor === 'number') return valor;
  if (!valor) return null;

  // Remove tudo exceto números, vírgula, ponto e -
  let limpo = String(valor).replace(/[^0-9,.\-]/g, '');
  limpo = limpo.replace(',', '.');

  const num = parseFloat(limpo);
  return isNaN(num) ? null : num;
}

/**
 * Parse campo "Notas do pedido" (multilinha) para objeto
 */
function parseNotas(texto: string): ParsedNotes {
  const res: ParsedNotes = {};
  if (!texto) return res;

  const linhas = texto.split('\n');
  for (const linha of linhas) {
    if (linha.includes(':')) {
      const [key, ...valParts] = linha.split(':');
      const val = valParts.join(':').trim();
      res[key.trim()] = val;
    }
  }

  return res;
}

/**
 * Normaliza motivo para uma das opções oficiais
 */
function normalizarMotivo(m: string): string {
  if (!m) return 'Não listado';

  const raw = m.trim();
  if (MOTIVOS_VALIDOS.includes(raw)) return raw;

  const low = raw.toLowerCase();
  for (const [key, canon] of Object.entries(MOTIVO_MAP)) {
    if (low.includes(key)) return canon;
  }

  return 'Não listado';
}

/**
 * Normaliza responsável
 */
function normalizarResponsavel(r: string): string {
  if (!r) return 'Sem contato';

  const raw = r.trim();
  const opcoes = ['Cartpanda Call', 'Cartpanda', 'Suporte MH', 'Sem contato'];
  if (opcoes.includes(raw)) return raw;

  const low = raw.toLowerCase();
  if (low.includes('call')) return 'Cartpanda Call';
  if (low.includes('suporte') || low.includes('mh')) return 'Suporte MH';
  if (low.includes('cartpanda')) return 'Cartpanda';
  if (low.includes('sem contato')) return 'Sem contato';

  return 'Sem contato';
}

/**
 * Extrai dados das notas do pedido
 */
function extrairNotas(rows: OrderRow[]): Map<string, Partial<CancelamentoRow>> {
  const result = new Map<string, Partial<CancelamentoRow>>();

  for (const row of rows) {
    const orderNum = row['Número do pedido'] || '';
    const notasText = row['Notas do pedido'] || '';
    const parsed = parseNotas(notasText);

    result.set(orderNum, {
      Canal: parsed['Canal'] || '',
      Motivo: normalizarMotivo(parsed['Motivo'] || ''),
      'Responsável': normalizarResponsavel(
        parsed['Responsável'] || parsed['Responsavel'] || parsed['Contato'] || ''
      ),
      'Devolveu?': parsed['Devolveu'] || '',
      'Evidência/Detalhes': parsed['Evidência/Detalhes'] || parsed['Evidencia/Detalhes'] || parsed['Obs'] || '',
    });
  }

  return result;
}

/**
 * Processa dados de reembolso
 */
function processarReembolso(rows: OrderRow[]): CancelamentoRow[] {
  const result: CancelamentoRow[] = [];

  for (const row of rows) {
    const valorPago = limparValor(row['Pago pelo cliente']);
    const valorRef = limparValor(row['Valor reembolsado']);

    let tipo = 'Reembolso Parcial';
    if (valorRef !== null && valorPago !== null && valorRef >= valorPago) {
      tipo = 'Reembolso Total';
    }

    result.push({
      'Data Compra': row['Data do pedido (Fixado)'] || '',
      'Data Cancelamento': row['Refund Date'] || '',
      Order: row['Número do pedido'] || '',
      Email: row['Email'] || '',
      'Tipo de cancelamento': tipo,
      'Valor Reembolsado': valorRef !== null ? valorRef.toFixed(2).replace('.', ',') : '',
      Canal: '',
      Motivo: '',
      'Responsável': '',
      'Devolveu?': '',
      'Evidência/Detalhes': '',
    });
  }

  return result;
}

/**
 * Processa dados de chargeback
 */
function processarChargeback(rows: OrderRow[]): CancelamentoRow[] {
  const result: CancelamentoRow[] = [];

  for (const row of rows) {
    const valorPago = limparValor(row['Pago pelo cliente']);

    result.push({
      'Data Compra': row['Data do pedido (Fixado)'] || '',
      'Data Cancelamento': row['Chargeback Date'] || '',
      Order: row['Número do pedido'] || '',
      Email: row['Email'] || '',
      'Tipo de cancelamento': 'Chargeback',
      'Valor Reembolsado': valorPago !== null ? valorPago.toFixed(2).replace('.', ',') : '',
      Canal: '',
      Motivo: '',
      'Responsável': '',
      'Devolveu?': '',
      'Evidência/Detalhes': '',
    });
  }

  return result;
}

/**
 * Gera planilha de cancelamentos
 */
export async function gerarCancelamentos(
  reembolsoCSV: string,
  chargebackCSV: string
): Promise<string> {
  // Parse CSVs
  const reembolsoData = Papa.parse<OrderRow>(reembolsoCSV, {
    header: true,
    skipEmptyLines: true,
  });

  const chargebackData = Papa.parse<OrderRow>(chargebackCSV, {
    header: true,
    skipEmptyLines: true,
  });

  if (reembolsoData.errors.length > 0 || chargebackData.errors.length > 0) {
    throw new Error('Erro ao processar CSV');
  }

  // Processar dados
  const cancelamentosRef = processarReembolso(reembolsoData.data);
  const cancelamentosCb = processarChargeback(chargebackData.data);

  // Unir
  const todosCancel = [...cancelamentosRef, ...cancelamentosCb];

  // Extrair notas
  const notasRef = extrairNotas(reembolsoData.data);
  const notasCb = extrairNotas(chargebackData.data);
  const todasNotas = new Map([...notasRef, ...notasCb]);

  // Mesclar dados
  const final: CancelamentoRow[] = todosCancel.map((cancel) => {
    const notas = todasNotas.get(cancel.Order) || {};
    return {
      ...cancel,
      ...notas,
    };
  });

  // Gerar CSV final
  const csv = Papa.unparse(final, {
    quotes: true,
    delimiter: ',',
    header: true,
  });

  // Adicionar BOM para Excel reconhecer UTF-8
  return '\uFEFF' + csv;
}
