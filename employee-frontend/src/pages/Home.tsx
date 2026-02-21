import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Activity, Palmtree, FileText, Clock as ClockIcon, CheckCircle, XCircle, Euro, MapPin, Car, Home as HomeIcon } from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import type { MyBalance, Absence, TeamStatus } from '../types/api';

// Helper functions
function formatDateNL(date: Date): string {
  const days = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
  const months = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function calculateHours(clockIn: string | null | undefined, clockOut?: string | null): number {
  if (!clockIn) return 0; // No clock in = 0 hours

  const start = new Date(`2000-01-01T${clockIn}`);
  const end = clockOut ? new Date(`2000-01-01T${clockOut}`) : new Date();
  const diff = end.getTime() - start.getTime();
  const hours = diff / 1000 / 60 / 60;
  return Math.max(0, hours); // Return raw hours, formatting will handle display
}

function formatHoursMinutes(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}u ${m}m`;
}

function getCurrentWeek() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const monday = new Date(today);
  monday.setDate(today.getDate() - daysFromMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0]
  };
}

// Clock Status Card Component
function ClockStatusCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showClockInOptions, setShowClockInOptions] = useState(false);
  const [clockInOptions, setClockInOptions] = useState({ came_by_car: false, work_from_home: false, parking_cost: '', km_driven: '' });

  // Check if today is a scheduled work day
  const today = new Date().getDay();
  const isScheduledToday = user?.work_days?.includes(today) || false;

  // ALL HOOKS MUST BE DECLARED FIRST - UNCONDITIONALLY

  // Check for absence today
  const { data: todayAbsence } = useQuery({
    queryKey: ['my-absences', 'today'],
    queryFn: async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const response = await api.get('/api/absences/my-absences');
        const absences = response.data;

        // Find absence covering today
        const absence = absences.find((a: Absence) => {
          const start = new Date(a.start_date);
          const end = a.end_date ? new Date(a.end_date) : new Date('2099-12-31');
          const todayDate = new Date(today);
          return a.status === 'approved' && todayDate >= start && todayDate <= end;
        });

        return absence || null;
      } catch (error) {
        console.error('Error fetching absence:', error);
        return null;
      }
    },
  });

  // Check for clock event today
  const { data: todayEvent, isLoading, error } = useQuery({
    queryKey: ['clock', 'today'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/clock/today');
        return response.data;
      } catch (err: any) {
        if (err.response?.status === 404) {
          return null;
        }
        throw err;
      }
    },
  });

  // Clock in mutation
  const clockInMutation = useMutation({
    mutationFn: async (options: { came_by_car: boolean; work_from_home: boolean; parking_cost: string; km_driven: string }) => {
      const response = await api.post('/api/clock/in', {
        came_by_car: options.came_by_car,
        work_from_home: options.work_from_home,
        parking_cost: options.came_by_car && options.parking_cost ? parseFloat(options.parking_cost) : null,
        km_driven: options.came_by_car && options.km_driven ? parseFloat(options.km_driven) : null,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clock', 'today'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
    },
  });

  // ALL HOOKS DECLARED ✅ - NOW CONDITIONAL RETURNS ARE OK

  // If on sick leave or vacation
  if (todayAbsence) {
    const getAbsenceIcon = () => {
      if (todayAbsence.type === 'sick') return <Activity className="w-12 h-12 text-blue-400" />;
      if (todayAbsence.type === 'vacation') return <Palmtree className="w-12 h-12 text-green-400" />;
      return <FileText className="w-12 h-12 text-purple-400" />;
    };

    const absenceLabel =
      todayAbsence.type === 'sick' ? 'Ziek' :
      todayAbsence.type === 'vacation' ? 'Vakantie' :
      'Persoonlijk Verlof';

    return (
      <div className="bg-ofa-bg border border-neutral-800 rounded-lg p-6">
        <div className="flex flex-col items-center text-center">
          {getAbsenceIcon()}
          <p className="text-lg font-semibold text-white mt-3">{absenceLabel}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-ofa-bg border border-neutral-800 rounded-lg p-6">
        <p className="text-gray-400 text-center">Laden...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-ofa-bg border border-neutral-800 rounded-lg p-6">
        <p className="text-red-400 text-center">Fout bij laden</p>
      </div>
    );
  }

  // No clock event today
  if (!todayEvent) {
    if (!isScheduledToday) {
      // Not scheduled - show info
      return (
        <div className="bg-ofa-bg border border-neutral-800 rounded-lg p-6">
          <p className="text-gray-400 text-center">Geen werkdag vandaag</p>
        </div>
      );
    }

    // Scheduled but not clocked in - show BIG clock in button
    return (
      <div className="bg-ofa-bg border border-neutral-800 rounded-lg p-6">
        <button
          onClick={() => setShowClockInOptions(true)}
          disabled={clockInMutation.isPending}
          className="w-full h-20 bg-green-600 hover:bg-green-700 disabled:bg-neutral-700 text-white text-xl font-bold rounded-lg transition"
        >
          {clockInMutation.isPending ? 'Inklokken...' : 'Inklokken'}
        </button>

        {showClockInOptions && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-ofa-bg border border-neutral-800 rounded-lg p-6 max-w-sm w-full">
              <h3 className="text-xl font-bold text-white mb-4">Inklokken</h3>

              <div className="space-y-3 mb-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clockInOptions.came_by_car}
                    onChange={(e) => setClockInOptions({
                      ...clockInOptions,
                      came_by_car: e.target.checked,
                      work_from_home: e.target.checked ? false : clockInOptions.work_from_home,
                      parking_cost: '',
                      km_driven: '',
                    })}
                    className="w-5 h-5"
                  />
                  <span className="text-white flex items-center gap-2"><Car className="w-4 h-4" /> Met auto gekomen</span>
                </label>

                {clockInOptions.came_by_car && (
                  <div className="ml-8 space-y-3">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Parkeerkosten (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={clockInOptions.parking_cost}
                        onChange={(e) => setClockInOptions({ ...clockInOptions, parking_cost: e.target.value })}
                        placeholder="0.00"
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:border-ofa-red focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Kilometers gereden</label>
                      <input
                        type="number"
                        step="0.1"
                        value={clockInOptions.km_driven}
                        onChange={(e) => setClockInOptions({ ...clockInOptions, km_driven: e.target.value })}
                        placeholder="0.0"
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:border-ofa-red focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clockInOptions.work_from_home}
                    onChange={(e) => setClockInOptions({
                      ...clockInOptions,
                      work_from_home: e.target.checked,
                      came_by_car: e.target.checked ? false : clockInOptions.came_by_car,
                    })}
                    className="w-5 h-5"
                  />
                  <span className="text-white flex items-center gap-2"><HomeIcon className="w-4 h-4" /> Thuiswerken</span>
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowClockInOptions(false); setClockInOptions({ came_by_car: false, work_from_home: false, parking_cost: '', km_driven: '' }); }}
                  className="flex-1 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition"
                >
                  Annuleren
                </button>
                <button
                  onClick={() => {
                    clockInMutation.mutate(clockInOptions);
                    setShowClockInOptions(false);
                    setClockInOptions({ came_by_car: false, work_from_home: false, parking_cost: '', km_driven: '' });
                  }}
                  className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                >
                  Inklokken
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Has clock event - show status
  if (todayEvent.status === 'pending') {
    return (
      <div className="bg-ofa-bg border border-neutral-800 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-2">
          <ClockIcon className="w-6 h-6 text-yellow-400" />
          <h2 className="text-lg font-semibold text-white">Wacht op goedkeuring</h2>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Starttijd</span>
            <span className="text-white font-mono">{todayEvent.clock_in?.substring(0, 5)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Eindtijd</span>
            <span className="text-white font-mono">{todayEvent.clock_out?.substring(0, 5)}</span>
          </div>
        </div>
      </div>
    );
  }

  // Approved clock event
  const hours = calculateHours(todayEvent.clock_in, todayEvent.clock_out);

  return (
    <div className="bg-ofa-bg border border-neutral-800 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle className="w-6 h-6 text-green-400" />
        <h2 className="text-lg font-semibold text-white">Ingeklokt</h2>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Starttijd</span>
          <span className="text-white font-mono">{todayEvent.clock_in?.substring(0, 5)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Eindtijd</span>
          <span className="text-white font-mono">{todayEvent.clock_out?.substring(0, 5)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Gewerkt</span>
          <span className="text-2xl font-bold text-green-400">
            {formatHoursMinutes(hours)}
          </span>
        </div>
        {todayEvent.work_from_home && (
          <div className="flex items-center gap-2 text-sm text-purple-400 pt-1">
            <HomeIcon className="w-4 h-4" /> Thuiswerken
          </div>
        )}
        {todayEvent.came_by_car && (
          <div className="flex items-center gap-2 text-sm text-gray-400 pt-1">
            <Car className="w-4 h-4" /> Met auto
          </div>
        )}
      </div>
    </div>
  );
}

// Week Stats Card Component
function WeekStatsCard() {
  const { user } = useAuth();
  const week = getCurrentWeek();

  const { data: balance, isLoading, error } = useQuery({
    queryKey: ['balance', 'week', week.start],
    queryFn: async () => {
      const response = await api.get<MyBalance>('/api/reports/balance/me', {
        params: {
          start_date: week.start,
          end_date: week.end,
        },
      });
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="bg-ofa-bg border border-neutral-800 rounded-lg p-6">
        <div className="text-gray-400">Laden...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-ofa-bg border border-neutral-800 rounded-lg p-6">
        <div className="text-red-400">Fout bij laden weekoverzicht</div>
      </div>
    );
  }

  const totalWorked = balance?.total_hours_worked || 0;  // Use actual hours from backend
  const balanceHours = balance?.balance || 0;
  const expectedHours = user?.expected_weekly_hours || 0;

  return (
    <div className="bg-ofa-bg border border-neutral-800 rounded-lg p-6 space-y-4">
      <h2 className="text-base font-semibold text-white mb-4">Deze Week</h2>
      <div className="border-t border-neutral-700 pt-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Gewerkt</span>
          <span className="text-2xl font-bold text-white">{formatHoursMinutes(totalWorked)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Verwacht</span>
          <span className="text-2xl font-bold text-white">{formatHoursMinutes(expectedHours)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Saldo</span>
          <span className={`text-2xl font-bold ${balanceHours >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {balanceHours > 0 ? '+' : ''}{formatHoursMinutes(Math.abs(balanceHours))}
          </span>
        </div>

        {balance && (balance.total_parking > 0 || balance.total_km > 0) && (
          <div className="border-t border-neutral-700 pt-3 space-y-2">
            {balance.total_parking > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400 flex items-center gap-2">
                  <Euro className="w-4 h-4" /> Parkeren
                </span>
                <span className="text-base text-white">€{balance.total_parking.toFixed(2)}</span>
              </div>
            )}
            {balance.total_km > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400 flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Kilometers
                </span>
                <span className="text-base text-white">{balance.total_km} km</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Team Today Card Component
function TeamTodayCard() {
  const { data: teamStatus, isLoading } = useQuery({
    queryKey: ['team', 'today'],
    queryFn: async () => {
      try {
        const response = await api.get<TeamStatus>('/api/employees/team-today');
        return response.data;
      } catch (error) {
        console.error('[TEAM QUERY] Error:', error);
        return { date: new Date().toISOString().split('T')[0], team: [] };
      }
    },
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  if (isLoading || !teamStatus) {
    return null;
  }

  const team = teamStatus.team;

  // Count by status
  const present = team.filter((m: any) => m.status === 'present').length;
  const notClocked = team.filter((m: any) => m.status === 'not_clocked').length;
  const sick = team.filter((m: any) => m.status === 'sick').length;
  const vacation = team.filter((m: any) => m.status === 'vacation').length;
  const personal = team.filter((m: any) => m.status === 'personal').length;

  const totalOnLeave = sick + vacation + personal;
  const total = team.length;

  if (total === 0) {
    return (
      <div className="bg-ofa-bg border border-neutral-800 rounded-lg p-6">
        <h2 className="text-base font-semibold text-white mb-4">Team Vandaag</h2>
        <p className="text-gray-400 text-sm text-center py-4">
          Niemand ingeroosterd vandaag
        </p>
      </div>
    );
  }

  return (
    <div className="bg-ofa-bg border border-neutral-800 rounded-lg p-6">
      <h2 className="text-base font-semibold text-white mb-4">
        Team Vandaag ({total})
      </h2>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-green-900/30 border border-green-500 rounded-lg p-3">
          <p className="text-xs text-green-200">Ingeklokt</p>
          <p className="text-2xl font-bold text-green-400">{present}</p>
        </div>

        {notClocked > 0 && (
          <div className="bg-red-900/30 border border-red-500 rounded-lg p-3">
            <p className="text-xs text-red-200">Niet ingeklokt</p>
            <p className="text-2xl font-bold text-red-400">{notClocked}</p>
          </div>
        )}

        {totalOnLeave > 0 && (
          <div className="bg-blue-900/30 border border-blue-500 rounded-lg p-3">
            <p className="text-xs text-blue-200">Met Verlof</p>
            <p className="text-2xl font-bold text-blue-400">{totalOnLeave}</p>
          </div>
        )}
      </div>

      {/* Team members list */}
      <div className="space-y-2">
        {team.map((member: any) => (
          <div
            key={member.id}
            className="flex items-center justify-between py-2 border-b border-neutral-800 last:border-0"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-ofa-red flex items-center justify-center text-white text-sm font-bold">
                {member.username.charAt(0).toUpperCase()}
              </div>
              <span className="text-white text-sm">{member.username}</span>
            </div>

            <div className="text-right">
              {member.status === 'present' && (
                <div>
                  <span className="text-green-400 text-xs flex items-center gap-1 justify-end">
                    <CheckCircle className="w-3 h-3" /> Ingeklokt
                  </span>
                  {member.clock_in && (
                    <p className="text-xs text-gray-400 font-mono">
                      {member.clock_in}{member.clock_out ? ` – ${member.clock_out}` : ''}
                    </p>
                  )}
                  {member.work_from_home && (
                    <p className="text-xs text-purple-400 flex items-center gap-1 justify-end mt-0.5">
                      <HomeIcon className="w-3 h-3" /> Thuis
                    </p>
                  )}
                </div>
              )}
              {member.status === 'not_clocked' && (
                <span className="text-red-400 text-xs flex items-center gap-1 justify-end">
                  <XCircle className="w-3 h-3" /> Niet ingeklokt
                </span>
              )}
              {member.status === 'sick' && (
                <span className="text-blue-400 text-xs flex items-center gap-1 justify-end">
                  <Activity className="w-3 h-3" /> Ziek
                </span>
              )}
              {member.status === 'vacation' && (
                <span className="text-blue-400 text-xs flex items-center gap-1 justify-end">
                  <Palmtree className="w-3 h-3" /> Vakantie
                </span>
              )}
              {member.status === 'personal' && (
                <span className="text-blue-400 text-xs flex items-center gap-1 justify-end">
                  <FileText className="w-3 h-3" /> Persoonlijk
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Main Dashboard Component
export default function Home() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-gray-400">{formatDateNL(new Date())}</p>
      </div>

      {/* My Clock Status Card */}
      <ClockStatusCard />

      {/* My Week Stats Card */}
      <WeekStatsCard />

      {/* Team Today Card */}
      <TeamTodayCard />
    </div>
  );
}
