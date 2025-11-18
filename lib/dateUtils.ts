/**
 * Date utility functions for dashboard date ranges
 */

export type DatePreset =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'custom';

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  preset: DatePreset;
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get start of day
 */
function getStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of day
 */
function getEndOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Get start of week (Monday)
 */
function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Adjust when day is Sunday
  d.setDate(d.getDate() + diff);
  return getStartOfDay(d);
}

/**
 * Get end of week (Sunday)
 */
function getEndOfWeek(date: Date): Date {
  const d = getStartOfWeek(date);
  d.setDate(d.getDate() + 6);
  return getEndOfDay(d);
}

/**
 * Get start of month
 */
function getStartOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  return getStartOfDay(d);
}

/**
 * Get end of month
 */
function getEndOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return getEndOfDay(d);
}

/**
 * Get date range for today (using Brasilia timezone UTC-3)
 */
export function getTodayRange(): DateRange {
  // Get current time in Brasilia timezone (UTC-3)
  const now = new Date();
  const utcOffset = now.getTimezoneOffset() * 60000; // offset in ms
  const brasiliaOffset = -3 * 60 * 60000; // UTC-3 in ms
  const brasiliaTime = new Date(now.getTime() + utcOffset + brasiliaOffset);

  return {
    startDate: formatDateString(getStartOfDay(brasiliaTime)),
    endDate: formatDateString(getEndOfDay(brasiliaTime)),
    preset: 'today',
  };
}

/**
 * Get date range for yesterday
 */
export function getYesterdayRange(): DateRange {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return {
    startDate: formatDateString(getStartOfDay(yesterday)),
    endDate: formatDateString(getEndOfDay(yesterday)),
    preset: 'yesterday',
  };
}

/**
 * Get date range for this week
 */
export function getThisWeekRange(): DateRange {
  const today = new Date();
  return {
    startDate: formatDateString(getStartOfWeek(today)),
    endDate: formatDateString(getEndOfDay(today)),
    preset: 'this_week',
  };
}

/**
 * Get date range for last week
 */
export function getLastWeekRange(): DateRange {
  const today = new Date();
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);
  return {
    startDate: formatDateString(getStartOfWeek(lastWeek)),
    endDate: formatDateString(getEndOfWeek(lastWeek)),
    preset: 'last_week',
  };
}

/**
 * Get date range for this month
 */
export function getThisMonthRange(): DateRange {
  const today = new Date();
  return {
    startDate: formatDateString(getStartOfMonth(today)),
    endDate: formatDateString(getEndOfDay(today)),
    preset: 'this_month',
  };
}

/**
 * Get date range for last month
 */
export function getLastMonthRange(): DateRange {
  const today = new Date();
  const lastMonth = new Date(today);
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  return {
    startDate: formatDateString(getStartOfMonth(lastMonth)),
    endDate: formatDateString(getEndOfMonth(lastMonth)),
    preset: 'last_month',
  };
}

/**
 * Get date range by preset
 */
export function getDateRangeByPreset(preset: DatePreset): DateRange {
  switch (preset) {
    case 'today':
      return getTodayRange();
    case 'yesterday':
      return getYesterdayRange();
    case 'this_week':
      return getThisWeekRange();
    case 'last_week':
      return getLastWeekRange();
    case 'this_month':
      return getThisMonthRange();
    case 'last_month':
      return getLastMonthRange();
    default:
      return getTodayRange();
  }
}

/**
 * Get comparison period for the same duration before the selected range
 */
export function getComparisonPeriod(startDate: string, endDate: string): { start: string; end: string } {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Calculate duration in days
  const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  // Go back the same duration
  const comparisonEnd = new Date(start);
  comparisonEnd.setDate(comparisonEnd.getDate() - 1);

  const comparisonStart = new Date(comparisonEnd);
  comparisonStart.setDate(comparisonStart.getDate() - duration + 1);

  return {
    start: formatDateString(comparisonStart),
    end: formatDateString(comparisonEnd),
  };
}

/**
 * Format date range to display text
 */
export function formatDateRangeDisplay(startDate: string, endDate: string, preset: DatePreset): string {
  const presetLabels: Record<DatePreset, string> = {
    today: 'Hoje',
    yesterday: 'Ontem',
    this_week: 'Esta Semana',
    last_week: 'Semana Passada',
    this_month: 'Este Mês',
    last_month: 'Mês Passado',
    custom: 'Período Customizado',
  };

  if (preset !== 'custom') {
    return presetLabels[preset];
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  const formatter = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  });

  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

/**
 * Get current month and previous month ranges for chart comparison
 * Always returns these two months regardless of any filter
 */
export function getCurrentAndPreviousMonthRanges(): {
  currentMonth: { startDate: string; endDate: string };
  previousMonth: { startDate: string; endDate: string };
} {
  const today = new Date();

  // Current month: full month (1st to last day) - for fair comparison with previous month
  const currentMonth = {
    startDate: formatDateString(getStartOfMonth(today)),
    endDate: formatDateString(getEndOfMonth(today)),
  };

  // Previous month: 1st day until last day of previous month
  const lastMonthDate = new Date(today);
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);

  const previousMonth = {
    startDate: formatDateString(getStartOfMonth(lastMonthDate)),
    endDate: formatDateString(getEndOfMonth(lastMonthDate)),
  };

  return { currentMonth, previousMonth };
}
