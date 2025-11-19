/**
 * Tools Page
 *
 * Collection of utility tools for data processing and analysis
 */

'use client';

import { useState } from 'react';

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  status: 'active' | 'coming_soon';
}

const tools: Tool[] = [
  {
    id: 'cancelamentos',
    name: 'Gerador de Cancelamentos',
    description: 'Processa arquivos de reembolso e chargeback, gerando uma planilha unificada com análise completa de motivos e responsáveis',
    icon: '📊',
    category: 'Processamento de Dados',
    status: 'active',
  },
  // Adicione mais ferramentas aqui no futuro
];

export default function FerramentasPage() {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-3 gradient-text">Ferramentas</h1>
        <p className="text-gray-400 text-lg">
          Utilit\u00e1rios para processamento e an\u00e1lise de dados
        </p>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setSelectedTool(tool.id)}
            className={`
              glass glass-hover p-6 rounded-2xl text-left
              transition-all duration-200
              ${
                selectedTool === tool.id
                  ? 'border-2 border-primary-500 shadow-lg shadow-primary-500/20'
                  : 'border border-gray-800/50'
              }
            `}
          >
            {/* Icon */}
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-purple-600/20 flex items-center justify-center text-2xl mb-4">
              {tool.icon}
            </div>

            {/* Content */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-bold text-lg">{tool.name}</h3>
                {tool.status === 'coming_soon' && (
                  <span className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded-full">
                    Em breve
                  </span>
                )}
              </div>

              <p className="text-gray-400 text-sm mb-3">{tool.description}</p>

              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-primary-500/10 text-primary-400 text-xs rounded-lg">
                  {tool.category}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Tool Content Area */}
      {selectedTool && (
        <div className="mt-8">
          {selectedTool === 'cancelamentos' && <CancelamentosGenerator />}
        </div>
      )}
    </div>
  );
}

/**
 * Cancelamentos Generator Component
 */
function CancelamentosGenerator() {
  const [reembolsoFile, setReembolsoFile] = useState<File | null>(null);
  const [chargebackFile, setChargebackFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  const handleProcess = async () => {
    if (!reembolsoFile || !chargebackFile) {
      alert('Por favor, selecione ambos os arquivos CSV');
      return;
    }

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('reembolso', reembolsoFile);
      formData.append('chargeback', chargebackFile);

      const response = await fetch('/api/tools/cancelamentos', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erro ao processar arquivos');
      }

      // Download do arquivo gerado
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'CANCELAMENTOS_FINAL.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert('Arquivo gerado com sucesso!');
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao processar arquivos. Verifique os arquivos e tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSync = async () => {
    if (!reembolsoFile || !chargebackFile) {
      alert('Por favor, selecione ambos os arquivos CSV');
      return;
    }

    setIsSyncing(true);
    setSyncResult(null);

    try {
      const formData = new FormData();
      formData.append('reembolso', reembolsoFile);
      formData.append('chargeback', chargebackFile);

      const response = await fetch('/api/tools/cancelamentos/sync', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao sincronizar dados');
      }

      setSyncResult(data);
      alert(
        `Sincronização concluída!\n\n` +
        `✅ Inseridos: ${data.stats.inserted}\n` +
        `✏️ Atualizados: ${data.stats.updated}\n` +
        `⊘ Pulados: ${data.stats.skipped}\n` +
        `❌ Erros: ${data.stats.errors}`
      );
    } catch (error: any) {
      console.error('Erro:', error);
      alert('Erro ao sincronizar dados: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-8 border border-gray-800/50">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Gerador de Cancelamentos</h2>
        <p className="text-gray-400">
          Fa\u00e7a upload dos arquivos CSV de reembolso e chargeback para gerar a planilha unificada
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Reembolso File */}
        <div>
          <label className="block text-sm font-semibold mb-2">
            Arquivo de Reembolso <span className="text-red-400">*</span>
          </label>
          <div className="glass rounded-xl p-6 border-2 border-dashed border-gray-700 hover:border-primary-500/50 transition-colors">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setReembolsoFile(e.target.files?.[0] || null)}
              className="hidden"
              id="reembolso-input"
            />
            <label
              htmlFor="reembolso-input"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <div className="text-4xl">\ud83d\udcc4</div>
              <p className="text-sm text-gray-400 text-center">
                {reembolsoFile ? reembolsoFile.name : 'Clique para selecionar'}
              </p>
            </label>
          </div>
        </div>

        {/* Chargeback File */}
        <div>
          <label className="block text-sm font-semibold mb-2">
            Arquivo de Chargeback <span className="text-red-400">*</span>
          </label>
          <div className="glass rounded-xl p-6 border-2 border-dashed border-gray-700 hover:border-primary-500/50 transition-colors">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setChargebackFile(e.target.files?.[0] || null)}
              className="hidden"
              id="chargeback-input"
            />
            <label
              htmlFor="chargeback-input"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <div className="text-4xl">\ud83d\udcc4</div>
              <p className="text-sm text-gray-400 text-center">
                {chargebackFile ? chargebackFile.name : 'Clique para selecionar'}
              </p>
            </label>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={handleProcess}
          disabled={!reembolsoFile || !chargebackFile || isProcessing || isSyncing}
          className={`
            px-6 py-4 rounded-xl font-semibold text-white
            transition-all duration-200
            ${
              !reembolsoFile || !chargebackFile || isProcessing || isSyncing
                ? 'bg-gray-700 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-primary-600 to-purple-600 hover:shadow-lg hover:shadow-primary-500/25'
            }
          `}
        >
          {isProcessing ? 'Processando...' : '📥 Baixar CSV'}
        </button>

        <button
          onClick={handleSync}
          disabled={!reembolsoFile || !chargebackFile || isProcessing || isSyncing}
          className={`
            px-6 py-4 rounded-xl font-semibold text-white
            transition-all duration-200
            ${
              !reembolsoFile || !chargebackFile || isProcessing || isSyncing
                ? 'bg-gray-700 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:shadow-lg hover:shadow-green-500/25'
            }
          `}
        >
          {isSyncing ? 'Sincronizando...' : '🔄 Sincronizar com Banco'}
        </button>
      </div>

      {/* Sync Result */}
      {syncResult && (
        <div className="mt-4 glass rounded-xl p-4 border border-green-500/30">
          <div className="flex items-start gap-3">
            <div className="text-2xl">✅</div>
            <div className="text-sm">
              <p className="font-semibold mb-2 text-green-400">Sincronização Concluída!</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-gray-300">
                <div>
                  <div className="text-xs text-gray-500">Total</div>
                  <div className="text-lg font-bold">{syncResult.stats.total}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Inseridos</div>
                  <div className="text-lg font-bold text-green-400">{syncResult.stats.inserted}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Atualizados</div>
                  <div className="text-lg font-bold text-blue-400">{syncResult.stats.updated}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Erros</div>
                  <div className="text-lg font-bold text-red-400">{syncResult.stats.errors}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-6 glass rounded-xl p-4 border border-blue-500/30">
        <div className="flex items-start gap-3">
          <div className="text-2xl">\u2139\ufe0f</div>
          <div className="text-sm text-gray-300">
            <p className="font-semibold mb-1">Arquivos esperados:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>REEMBOLSO_-_NOTAS.csv (ou similar)</li>
              <li>CHARGEBACK_-_NOTAS.csv (ou similar)</li>
            </ul>
            <p className="mt-2 text-gray-400">
              O arquivo gerado conter\u00e1: Data Compra, Data Cancelamento, Order, Email, Tipo de cancelamento, Valor Reembolsado, Canal, Motivo, Respons\u00e1vel, Devolveu?, Evid\u00eancia/Detalhes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
