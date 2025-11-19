'use client';

import { useState, useEffect } from 'react';

export interface FilterValues {
  canal?: string;
  motivo?: string;
  responsavel?: string;
  devolveu?: string;
  startDate?: string;
  endDate?: string;
  affiliate?: string;
}

interface FilterOptions {
  canais: string[];
  motivos: string[];
  responsaveis: string[];
}

interface ReportFiltersProps {
  filters: FilterValues;
  filterOptions: FilterOptions;
  onFiltersChange: (filters: FilterValues) => void;
  onApply: () => void;
  onClear: () => void;
}

export default function ReportFilters({
  filters,
  filterOptions,
  onFiltersChange,
  onApply,
  onClear,
}: ReportFiltersProps) {
  const [localFilters, setLocalFilters] = useState<FilterValues>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleChange = (key: keyof FilterValues, value: string) => {
    const newFilters = { ...localFilters, [key]: value || undefined };
    setLocalFilters(newFilters);
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    onApply();
  };

  const handleClear = () => {
    setLocalFilters({});
    onClear();
  };

  return (
    <div className="glass rounded-xl p-6 mb-6">
      <h3 className="text-lg font-semibold text-white mb-4">Filtros</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Canal */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Canal</label>
          <select
            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            value={localFilters.canal || ''}
            onChange={(e) => handleChange('canal', e.target.value)}
          >
            <option value="">Todos</option>
            {filterOptions.canais.map((canal) => (
              <option key={canal} value={canal}>
                {canal}
              </option>
            ))}
          </select>
        </div>

        {/* Motivo */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Motivo</label>
          <select
            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            value={localFilters.motivo || ''}
            onChange={(e) => handleChange('motivo', e.target.value)}
          >
            <option value="">Todos</option>
            {filterOptions.motivos.map((motivo) => (
              <option key={motivo} value={motivo}>
                {motivo}
              </option>
            ))}
          </select>
        </div>

        {/* Responsável */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Responsável</label>
          <select
            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            value={localFilters.responsavel || ''}
            onChange={(e) => handleChange('responsavel', e.target.value)}
          >
            <option value="">Todos</option>
            {filterOptions.responsaveis.map((resp) => (
              <option key={resp} value={resp}>
                {resp}
              </option>
            ))}
          </select>
        </div>

        {/* Devolveu */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Devolveu</label>
          <select
            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            value={localFilters.devolveu || ''}
            onChange={(e) => handleChange('devolveu', e.target.value)}
          >
            <option value="">Todos</option>
            <option value="true">Sim</option>
            <option value="false">Não</option>
          </select>
        </div>

        {/* Data Início */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Data Início</label>
          <input
            type="date"
            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            value={localFilters.startDate || ''}
            onChange={(e) => handleChange('startDate', e.target.value)}
          />
        </div>

        {/* Data Fim */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Data Fim</label>
          <input
            type="date"
            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            value={localFilters.endDate || ''}
            onChange={(e) => handleChange('endDate', e.target.value)}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={handleApply}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
        >
          Aplicar Filtros
        </button>
        <button
          onClick={handleClear}
          className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium transition-colors"
        >
          Limpar
        </button>
      </div>
    </div>
  );
}
