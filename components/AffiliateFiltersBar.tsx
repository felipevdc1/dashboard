/**
 * Affiliate Filters Bar Component
 *
 * Provides filtering and search capabilities for the affiliates list
 */

import { useState } from 'react';
import type { AffiliateFilters } from '@/lib/affiliates/types';

interface AffiliateFiltersBarProps {
  filters: AffiliateFilters;
  onFiltersChange: (filters: AffiliateFilters) => void;
  onReset: () => void;
}

export default function AffiliateFiltersBar({
  filters,
  onFiltersChange,
  onReset,
}: AffiliateFiltersBarProps) {
  const [searchTerm, setSearchTerm] = useState(filters.search || '');

  const handleSearchClick = () => {
    onFiltersChange({ ...filters, search: searchTerm || undefined });
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    onFiltersChange({ ...filters, search: undefined });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchClick();
    }
  };

  const handleStatusToggle = (status: 'active' | 'inactive' | 'new') => {
    const currentStatuses = filters.status || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status];

    onFiltersChange({
      ...filters,
      status: newStatuses.length > 0 ? newStatuses : undefined,
    });
  };

  const handleQualityGradeToggle = (grade: 'A' | 'B' | 'C' | 'D' | 'F') => {
    const currentGrades = filters.qualityGrade || [];
    const newGrades = currentGrades.includes(grade)
      ? currentGrades.filter(g => g !== grade)
      : [...currentGrades, grade];

    onFiltersChange({
      ...filters,
      qualityGrade: newGrades.length > 0 ? newGrades : undefined,
    });
  };

  const handleSortChange = (sortBy: AffiliateFilters['sortBy']) => {
    const newSortOrder =
      filters.sortBy === sortBy && filters.sortOrder === 'desc' ? 'asc' : 'desc';

    onFiltersChange({
      ...filters,
      sortBy,
      sortOrder: newSortOrder,
    });
  };

  const hasActiveFilters =
    filters.status?.length ||
    filters.qualityGrade?.length ||
    filters.search ||
    filters.minSales ||
    filters.maxSales ||
    filters.minRevenue ||
    filters.maxRevenue;

  return (
    <div className="glass rounded-2xl p-6 space-y-6 border border-gray-800/50">
      <div>
        <h3 className="text-lg font-bold flex items-center gap-2 mb-1">
          <span className="text-xl">🔍</span>
          Filtros
        </h3>
        <p className="text-xs text-gray-500">Refine sua busca por afiliados</p>
      </div>

      {/* Search */}
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          Buscar Afiliado
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Nome, email ou slug..."
              className="w-full bg-gray-800/50 border border-gray-700 rounded-xl pl-4 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
          </div>
          <button
            onClick={handleSearchClick}
            className="px-4 py-2.5 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 text-white rounded-xl text-sm font-semibold transition-all hover:scale-105 shadow-lg flex items-center gap-2"
          >
            <span>🔍</span>
            Buscar
          </button>
          {searchTerm && (
            <button
              onClick={handleClearSearch}
              className="px-3 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-semibold transition-all"
              title="Limpar busca"
            >
              ✕
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1.5">
          Pressione Enter ou clique em Buscar
        </p>
      </div>

      {/* Sort By */}
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-3">
          Ordenar Por
        </label>
        <div className="flex flex-wrap gap-2">
          {(['revenue', 'sales', 'quality', 'commission', 'avgTicket'] as const).map(
            sortOption => (
              <button
                key={sortOption}
                onClick={() => handleSortChange(sortOption)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  filters.sortBy === sortOption
                    ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white shadow-lg shadow-primary-500/20 scale-105'
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/70 border border-gray-700'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span>{getSortLabel(sortOption)}</span>
                  {filters.sortBy === sortOption && (
                    <span className="text-xs">
                      {filters.sortOrder === 'desc' ? '↓' : '↑'}
                    </span>
                  )}
                </div>
              </button>
            )
          )}
        </div>
      </div>

      {/* Status Filter */}
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-3">Status</label>
        <div className="flex flex-wrap gap-2">
          {(['active', 'inactive', 'new'] as const).map(status => (
            <button
              key={status}
              onClick={() => handleStatusToggle(status)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                filters.status?.includes(status)
                  ? 'bg-success-600 text-white shadow-lg shadow-success-500/20 scale-105'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/70 border border-gray-700'
              }`}
            >
              {getStatusLabel(status)}
            </button>
          ))}
        </div>
      </div>

      {/* Quality Grade Filter */}
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-3">
          Nota de Qualidade
        </label>
        <div className="flex flex-wrap gap-2">
          {(['A', 'B', 'C', 'D', 'F'] as const).map(grade => (
            <button
              key={grade}
              onClick={() => handleQualityGradeToggle(grade)}
              className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
                filters.qualityGrade?.includes(grade)
                  ? `${getGradeColor(grade)} scale-110 shadow-lg`
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/70 border border-gray-700'
              }`}
            >
              {grade}
            </button>
          ))}
        </div>
      </div>

      {/* Reset Button */}
      {hasActiveFilters && (
        <div className="pt-4 border-t border-gray-700/50">
          <button
            onClick={onReset}
            className="w-full px-4 py-3 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white rounded-xl text-sm font-semibold transition-all hover:scale-105 shadow-lg flex items-center justify-center gap-2"
          >
            <span>✕</span>
            Limpar Todos os Filtros
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Get label for sort option
 */
function getSortLabel(sortBy: string): string {
  const labels: Record<string, string> = {
    revenue: 'Receita',
    sales: 'Vendas',
    quality: 'Qualidade',
    commission: 'Comissão',
    avgTicket: 'Ticket Médio',
    growth: 'Crescimento',
  };
  return labels[sortBy] || sortBy;
}

/**
 * Get label for status
 */
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: 'Ativo',
    inactive: 'Inativo',
    new: 'Novo',
  };
  return labels[status] || status;
}

/**
 * Get color for quality grade
 */
function getGradeColor(grade: string): string {
  const colors: Record<string, string> = {
    A: 'bg-success-600 text-white',
    B: 'bg-success-500 text-white',
    C: 'bg-warning-600 text-white',
    D: 'bg-warning-500 text-white',
    F: 'bg-danger-600 text-white',
  };
  return colors[grade] || 'bg-gray-600 text-white';
}
