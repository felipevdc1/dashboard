/**
 * Affiliate Selector Component
 *
 * Dropdown with search functionality to select any affiliate from the database
 * Uses React Portal to escape stacking context issues
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import useSWR from 'swr';
import type { AffiliateMetrics } from '@/lib/affiliates/types';
import { formatCurrency } from '@/lib/shared/utils';

interface AffiliateSelectorProps {
  value: string | null; // Selected affiliate ID
  onChange: (affiliateId: string | null, affiliate: AffiliateMetrics | null) => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AffiliateSelector({ value, onChange }: AffiliateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  const buttonRef = useRef<HTMLButtonElement>(null);

  // Calculate dropdown position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8, // 8px gap below button
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [isOpen]);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch affiliates with search
  const searchQuery = debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : '';
  const { data, error, isLoading } = useSWR(
    isOpen ? `/api/affiliates${searchQuery}` : null,
    fetcher
  );

  const affiliates: AffiliateMetrics[] = data?.affiliates || [];

  // Find selected affiliate
  const selectedAffiliate = value
    ? affiliates.find((aff) => aff.id === value) || null
    : null;

  const handleSelect = (affiliate: AffiliateMetrics) => {
    onChange(affiliate.id, affiliate);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    onChange(null, null);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="glass glass-hover rounded-lg px-4 py-2 text-sm flex items-center gap-2 min-w-[250px] justify-between w-full"
      >
        <span className="flex items-center gap-2">
          <span>👤</span>
          <span>
            {selectedAffiliate ? (
              <span className="flex items-center gap-2">
                <span className="font-semibold">{selectedAffiliate.name}</span>
                <span className="text-xs text-gray-500">({selectedAffiliate.email})</span>
              </span>
            ) : (
              <span className="text-gray-400">Selecionar afiliado...</span>
            )}
          </span>
        </span>
        <span className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {/* Portal: Render dropdown in document.body to escape stacking context */}
      {isOpen && typeof window !== 'undefined' && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[9998] bg-black/20"
            onClick={() => {
              setIsOpen(false);
              setSearchTerm('');
            }}
          />

          {/* Dropdown Content */}
          <div
            className="fixed z-[9999] w-96 glass rounded-xl shadow-2xl overflow-hidden animate-fade-in"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              minWidth: `${dropdownPosition.width}px`
            }}
          >
            {/* Search Input */}
            <div className="p-4 border-b border-gray-700/50">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome ou email..."
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                autoFocus
              />
            </div>

            {/* Affiliates List */}
            <div className="max-h-96 overflow-y-auto">
              {isLoading && (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-spin inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full" />
                  <span className="ml-2">Carregando...</span>
                </div>
              )}

              {error && (
                <div className="p-4 text-center text-danger-400">
                  Erro ao carregar afiliados
                </div>
              )}

              {!isLoading && !error && affiliates.length === 0 && (
                <div className="p-4 text-center text-gray-500">
                  {searchTerm ? 'Nenhum afiliado encontrado' : 'Nenhum afiliado disponível'}
                </div>
              )}

              {!isLoading && !error && affiliates.length > 0 && (
                <div className="py-2">
                  {/* Clear Selection Option */}
                  {value && (
                    <button
                      onClick={handleClear}
                      className="w-full px-4 py-3 text-left hover:bg-gray-800/50 transition-colors border-b border-gray-700/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-700/50 flex items-center justify-center text-gray-400">
                          ✕
                        </div>
                        <div>
                          <div className="font-semibold text-gray-400">Limpar seleção</div>
                          <div className="text-xs text-gray-500">Ver todos os afiliados</div>
                        </div>
                      </div>
                    </button>
                  )}

                  {/* Affiliates */}
                  {affiliates.map((affiliate) => (
                    <button
                      key={affiliate.id}
                      onClick={() => handleSelect(affiliate)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-800/50 transition-colors ${
                        value === affiliate.id ? 'bg-primary-600/10 border-l-2 border-primary-500' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                          {affiliate.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">{affiliate.name}</div>
                          <div className="text-xs text-gray-500 truncate">{affiliate.email}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400">{affiliate.sales.total} vendas</div>
                          <div className="text-xs text-warning-400 font-semibold">
                            {formatCurrency(affiliate.sales.revenue)}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Info */}
            {!isLoading && !error && affiliates.length > 0 && (
              <div className="p-3 border-t border-gray-700/50 text-xs text-gray-500 text-center">
                {affiliates.length} afiliado{affiliates.length !== 1 ? 's' : ''} encontrado{affiliates.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
