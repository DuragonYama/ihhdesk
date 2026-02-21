import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';
import type { EmployeeBalance } from '../types/api';

interface BalanceResponse {
  period_start: string;
  period_end: string;
  employees: EmployeeBalance[];
}

export default function Reports() {
  const currentDate = new Date();
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1); // 1-12

  // Calculate start/end dates for selected month
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  // Fetch all employee balances
  const { data: balances = [], isLoading } = useQuery({
    queryKey: ['balances', 'all', year, month],
    queryFn: async () => {
      const response = await api.get<BalanceResponse>('/api/reports/balance/all', {
        params: { start_date: startDate, end_date: endDate },
      });
      return response.data.employees || [];
    },
  });

  const handleDownloadCSV = async () => {
    try {
      const response = await api.get('/api/exports/monthly-report', {
        params: { year, month },
        responseType: 'blob',
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rapport_${year}_${String(month).padStart(2, '0')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const months = [
    'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
    'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
  ];

  // Calculate totals
  const totals = balances.reduce(
    (acc: {
      extra_hours: number;
      missing_hours: number;
      balance: number;
      total_parking: number;
      total_km: number;
    }, balance: EmployeeBalance) => ({
      extra_hours: acc.extra_hours + balance.extra_hours,
      missing_hours: acc.missing_hours + balance.missing_hours,
      balance: acc.balance + balance.balance,
      total_parking: acc.total_parking + balance.total_parking,
      total_km: acc.total_km + balance.total_km,
    }),
    { extra_hours: 0, missing_hours: 0, balance: 0, total_parking: 0, total_km: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Rapporten</h1>
          <p className="text-gray-400 mt-1">{balances.length} medewerkers</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Month Selector */}
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="flex-1 sm:flex-none px-4 py-2 bg-ofa-bg border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red min-h-[44px]"
          >
            {months.map((monthName, index) => (
              <option key={index} value={index + 1}>
                {monthName}
              </option>
            ))}
          </select>

          {/* Year Selector */}
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="flex-1 sm:flex-none px-4 py-2 bg-ofa-bg border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red min-h-[44px]"
          >
            {[2024, 2025, 2026, 2027, 2028].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          {/* Download Button */}
          <button
            onClick={handleDownloadCSV}
            className="w-full sm:w-auto px-6 py-2 bg-ofa-red hover:bg-ofa-red-hover text-white rounded-lg font-medium transition flex items-center justify-center gap-2 min-h-[44px]"
          >
            <span>⬇</span>
            Download CSV
          </button>
        </div>
      </div>

      {/* Data Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Laden...</div>
        </div>
      ) : balances.length === 0 ? (
        <div className="bg-ofa-bg rounded-lg border border-neutral-800 p-12 text-center">
          <p className="text-gray-400">Geen gegevens voor deze periode</p>
        </div>
      ) : (
        <div className="bg-ofa-bg rounded-lg border border-neutral-800 overflow-hidden">
          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-neutral-800">
            {balances.map((balance: EmployeeBalance) => (
              <div key={balance.user_id} className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-ofa-red rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    {balance.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-medium">{balance.username}</p>
                    <p className="text-gray-500 text-xs">{balance.expected_weekly_hours}u/week verwacht</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-gray-500 text-xs">Balans</p>
                    <p className={`font-bold text-lg ${
                      balance.balance > 0 ? 'text-green-400' : balance.balance < 0 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {balance.balance > 0 ? '+' : ''}{balance.balance.toFixed(2)}u
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-neutral-800 rounded p-2">
                    <p className="text-gray-500 text-xs">Extra</p>
                    <p className="text-green-400 font-medium">{balance.extra_hours.toFixed(2)}u</p>
                  </div>
                  <div className="bg-neutral-800 rounded p-2">
                    <p className="text-gray-500 text-xs">Tekort</p>
                    <p className="text-red-400 font-medium">{balance.missing_hours.toFixed(2)}u</p>
                  </div>
                  <div className="bg-neutral-800 rounded p-2">
                    <p className="text-gray-500 text-xs">Parkeren</p>
                    <p className="text-gray-300">€{balance.total_parking.toFixed(2)}</p>
                  </div>
                  <div className="bg-neutral-800 rounded p-2">
                    <p className="text-gray-500 text-xs">KM / Vergoed</p>
                    <p className="text-gray-300">{balance.total_km.toFixed(1)} / €{(balance.total_km * 0.23).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
            {/* Mobile totals */}
            <div className="p-4 bg-neutral-800 space-y-2">
              <p className="text-white font-bold">TOTAAL</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">Extra</p>
                  <p className="text-green-400 font-medium">{totals.extra_hours.toFixed(2)}u</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Tekort</p>
                  <p className="text-red-400 font-medium">{totals.missing_hours.toFixed(2)}u</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Balans</p>
                  <p className={`font-bold ${totals.balance > 0 ? 'text-green-400' : totals.balance < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                    {totals.balance > 0 ? '+' : ''}{totals.balance.toFixed(2)}u
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Parkeren</p>
                  <p className="text-white">€{totals.total_parking.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">KM / Vergoed</p>
                  <p className="text-white">{totals.total_km.toFixed(1)} / €{(totals.total_km * 0.23).toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-800">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Medewerker</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">Verwacht (u/week)</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">Extra Uren</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">Tekort Uren</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">Balans</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">Parkeren (€)</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">KM</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">KM Vergoed (€)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {balances.map((balance: EmployeeBalance) => (
                  <tr key={balance.user_id} className="hover:bg-neutral-800/50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-ofa-red rounded-full flex items-center justify-center text-white font-bold">
                          {balance.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-white font-medium">{balance.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-400">{balance.expected_weekly_hours}</td>
                    <td className="px-6 py-4 text-right text-green-400">{balance.extra_hours.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right text-red-400">{balance.missing_hours.toFixed(2)}</td>
                    <td className={`px-6 py-4 text-right font-semibold ${
                      balance.balance > 0 ? 'text-green-400' : balance.balance < 0 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {balance.balance > 0 ? '+' : ''}{balance.balance.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-400">
                      €{balance.total_parking.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-400">{balance.total_km.toFixed(1)}</td>
                    <td className="px-6 py-4 text-right text-gray-400">
                      €{(balance.total_km * 0.23).toFixed(2)}
                    </td>
                  </tr>
                ))}

                {/* Totals Row */}
                <tr className="bg-neutral-800 font-bold">
                  <td className="px-6 py-4 text-white">TOTAAL</td>
                  <td className="px-6 py-4"></td>
                  <td className="px-6 py-4 text-right text-green-400">{totals.extra_hours.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right text-red-400">{totals.missing_hours.toFixed(2)}</td>
                  <td className={`px-6 py-4 text-right ${
                    totals.balance > 0 ? 'text-green-400' : totals.balance < 0 ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {totals.balance > 0 ? '+' : ''}{totals.balance.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right text-white">€{totals.total_parking.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right text-white">{totals.total_km.toFixed(1)}</td>
                  <td className="px-6 py-4 text-right text-white">€{(totals.total_km * 0.23).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}