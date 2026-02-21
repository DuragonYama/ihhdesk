import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Home as HomeIcon } from 'lucide-react';
import { api } from '../utils/api';
import type { MyBalance } from '../types/api';

export default function Balance() {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Calculate month start and end dates
  const getMonthRange = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();

    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0); // Last day of month

    const formatDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    return {
      start: formatDate(start),
      end: formatDate(end)
    };
  };

  const monthRange = getMonthRange(currentDate);

  // Fetch balance data for current month
  const { data: balance, isLoading } = useQuery({
    queryKey: ['balance', 'me', monthRange.start, monthRange.end],
    queryFn: async () => {
      const response = await api.get<MyBalance>('/api/reports/balance/me', {
        params: {
          start_date: monthRange.start,
          end_date: monthRange.end
        }
      });
      return response.data;
    },
  });

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isCurrentMonth = () => {
    const now = new Date();
    return currentDate.getMonth() === now.getMonth() &&
           currentDate.getFullYear() === now.getFullYear();
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}u ${m}m`;
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold text-white mb-4">Saldo</h1>
        <p className="text-gray-400">Laden...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with month navigation */}
      <div>
        <h1 className="text-xl font-bold text-white mb-4">Saldo</h1>

        <div className="flex items-center justify-between gap-3">
          <button
            onClick={goToPreviousMonth}
            className="px-4 py-2 bg-ofa-bg border border-neutral-700 hover:border-neutral-600 text-white rounded-lg transition"
          >
            ← Vorige
          </button>

          <div className="text-center">
            <p className="text-lg font-semibold text-white capitalize">
              {formatMonthYear(currentDate)}
            </p>
            {!isCurrentMonth() && (
              <button
                onClick={goToToday}
                className="text-sm text-ofa-red hover:text-ofa-red-hover mt-1"
              >
                Ga naar vandaag
              </button>
            )}
          </div>

          <button
            onClick={goToNextMonth}
            className="px-4 py-2 bg-ofa-bg border border-neutral-700 hover:border-neutral-600 text-white rounded-lg transition"
          >
            Volgende →
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Hours Worked */}
        <div className="bg-ofa-bg border border-neutral-800 rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-1">Gewerkt</p>
          <p className="text-2xl font-bold text-white">
            {formatHours(balance?.total_hours_worked || 0)}
          </p>
        </div>

        {/* Expected Hours */}
        <div className="bg-ofa-bg border border-neutral-800 rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-1">Verwacht</p>
          <p className="text-2xl font-bold text-white">
            {balance?.expected_weekly_hours ?
              `${balance.expected_weekly_hours}u/week` : '-'}
          </p>
        </div>

        {/* Balance */}
        <div className="col-span-2 bg-ofa-bg border border-neutral-800 rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-1">Saldo</p>
          <p className={`text-3xl font-bold ${
            (balance?.balance || 0) >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {balance?.balance ?
              `${balance.balance >= 0 ? '+' : ''}${formatHours(Math.abs(balance.balance))}` :
              '0u 0m'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {balance?.balance && balance.balance >= 0 ? 'Extra uren' : 'Tekort uren'}
          </p>
        </div>
      </div>

      {/* Car & Costs */}
      <div className="bg-ofa-bg border border-neutral-800 rounded-lg p-6">
        <h2 className="text-base font-semibold text-white mb-4">Auto & Kosten</h2>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">💶 Parkeerkosten</span>
            <span className="text-white font-medium">
              €{(balance?.total_parking || 0).toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-400">📍 Kilometers</span>
            <span className="text-white font-medium">
              {balance?.total_km || 0} km
            </span>
          </div>
        </div>
      </div>

      {/* Week Breakdown */}
      {balance?.details && balance.details.length > 0 && (
        <div className="bg-ofa-bg border border-neutral-800 rounded-lg p-6">
          <h2 className="text-base font-semibold text-white mb-4">Details</h2>

          <div className="space-y-2 text-sm">
            {balance.details.map((detail: any, index: number) => {
              const date = new Date(detail.date);
              const dayName = date.toLocaleDateString('nl-NL', { weekday: 'short' });
              const dayDate = date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });

              // Skip off days and days with no activity
              if (detail.type === 'off_day') return null;

              return (
                <div key={index} className="flex justify-between items-center py-2 border-b border-neutral-800 last:border-0">
                  <div>
                    <p className="text-white capitalize">{dayName} {dayDate}</p>
                    <p className="text-xs text-gray-500">{getTypeLabel(detail.type)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${
                      detail.balance_change >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {detail.balance_change >= 0 ? '+' : ''}{formatHours(Math.abs(detail.balance_change))}
                    </p>
                    {detail.work_from_home && (
                      <p className="text-xs text-purple-400 flex items-center gap-1 justify-end"><HomeIcon className="w-3 h-3" /> Thuis</p>
                    )}
                    {detail.came_by_car && (
                      <p className="text-xs text-gray-400">🚗 Auto</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'worked': 'Gewerkt',
    'scheduled_deficit': 'Niet ingeklokt',
    'unscheduled_work': 'Extra werk',
    'sick_first': 'Ziek (1e dag)',
    'sick_continuation': 'Ziek',
    'vacation': 'Vakantie',
    'personal_leave': 'Persoonlijk verlof',
    'company_holiday': 'Feestdag'
  };
  return labels[type] || type;
}
