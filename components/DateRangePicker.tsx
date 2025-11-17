'use client';

import { useState } from 'react';
import type { DateRange, DatePreset } from '@/lib/dateUtils';
import {
  getDateRangeByPreset,
  formatDateRangeDisplay,
  formatDateString,
} from '@/lib/dateUtils';

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customStart, setCustomStart] = useState(value.startDate);
  const [customEnd, setCustomEnd] = useState(value.endDate);

  const presets: { value: DatePreset; label: string }[] = [
    { value: 'today', label: 'Hoje' },
    { value: 'yesterday', label: 'Ontem' },
    { value: 'this_week', label: 'Esta Semana' },
    { value: 'last_week', label: 'Semana Passada' },
    { value: 'this_month', label: 'Este Mês' },
    { value: 'last_month', label: 'Mês Passado' },
  ];

  const handlePresetClick = (preset: DatePreset) => {
    const range = getDateRangeByPreset(preset);
    onChange(range);
    setIsOpen(false);
    setShowCustom(false);
  };

  const handleCustomApply = () => {
    onChange({
      startDate: customStart,
      endDate: customEnd,
      preset: 'custom',
    });
    setIsOpen(false);
    setShowCustom(false);
  };

  const getTodayString = () => {
    return formatDateString(new Date());
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="glass glass-hover rounded-lg px-4 py-2 text-sm flex items-center gap-2 min-w-[200px] justify-between"
      >
        <span className="flex items-center gap-2">
          <span>📅</span>
          <span>{formatDateRangeDisplay(value.startDate, value.endDate, value.preset)}</span>
        </span>
        <span className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false);
              setShowCustom(false);
            }}
          />

          {/* Dropdown Content */}
          <div className="absolute right-0 mt-2 w-80 glass rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
            {!showCustom ? (
              // Preset Options
              <div className="p-2">
                <div className="text-xs text-gray-400 px-3 py-2 font-semibold">
                  PERÍODOS RÁPIDOS
                </div>

                {presets.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handlePresetClick(preset.value)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                      value.preset === preset.value
                        ? 'bg-primary-600/20 text-primary-400'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}

                <div className="border-t border-white/5 my-2" />

                <button
                  onClick={() => setShowCustom(true)}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span>🗓️</span>
                    <span>Período Customizado</span>
                  </span>
                </button>
              </div>
            ) : (
              // Custom Date Picker
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Período Customizado</h3>
                  <button
                    onClick={() => setShowCustom(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-2">Data Inicial</label>
                    <input
                      type="date"
                      value={customStart}
                      max={getTodayString()}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full glass rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-2">Data Final</label>
                    <input
                      type="date"
                      value={customEnd}
                      min={customStart}
                      max={getTodayString()}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full glass rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                    />
                  </div>

                  <button
                    onClick={handleCustomApply}
                    disabled={!customStart || !customEnd || customStart > customEnd}
                    className="w-full px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors font-medium"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
