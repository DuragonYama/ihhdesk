import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import type { TodayStatus, Absence } from '../types/api';

const TYPE_COLORS = {
  sick: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  personal: 'bg-green-500/20 text-green-400 border-green-500/30',
  vacation: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
};

const TYPE_NAMES_NL = {
  sick: 'Ziek',
  personal: 'Persoonlijk',
  vacation: 'Vakantie',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [showClockedIn, setShowClockedIn] = useState(true);
  const [showOnLeave, setShowOnLeave] = useState(true);
  const [showMissing, setShowMissing] = useState(false);

  // Fetch today's status
  const { data, isLoading } = useQuery({
    queryKey: ['today-status'],
    queryFn: async () => {
      const response = await api.get<TodayStatus>('/api/reports/today-status');
      return response.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch pending approvals count
  const { data: pendingAbsences = [] } = useQuery({
    queryKey: ['absences', 'pending'],
    queryFn: async () => {
      const response = await api.get<Absence[]>('/api/absences/pending');
      return response.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Laden...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Geen gegevens beschikbaar</div>
      </div>
    );
  }

  const pendingCount = pendingAbsences.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">Vandaag - {formatDateNL(data.date)}</p>
      </div>

      {/* Pending Approvals Alert */}
      {pendingCount > 0 && (
        <button
          onClick={() => navigate('/approvals')}
          className="w-full bg-red-900/30 border-2 border-red-500 rounded-lg p-4 hover:bg-red-900/50 transition"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-2xl">
                ⚠️
              </div>
              <div className="text-left">
                <p className="text-white font-bold text-lg">Wachtende Goedkeuringen</p>
                <p className="text-red-300 text-sm">
                  {pendingCount} {pendingCount === 1 ? 'aanvraag' : 'aanvragen'} wacht op jouw goedkeuring
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-4 py-2 bg-red-600 text-white rounded-full text-xl font-bold">
                {pendingCount}
              </span>
              <span className="text-red-300 text-2xl">→</span>
            </div>
          </div>
        </button>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Totaal Medewerkers"
          value={data.stats.total_employees}
          icon="👥"
          color="bg-neutral-800"
        />
        <StatCard
          title="Ingeklokt"
          value={data.stats.clocked_in}
          icon="✅"
          color="bg-green-900/30 border-green-500/30"
        />
        <StatCard
          title="Met Verlof"
          value={data.stats.on_leave}
          icon="🏥"
          color="bg-blue-900/30 border-blue-500/30"
        />
        <StatCard
          title="Verwacht maar Afwezig"
          value={data.stats.expected_missing}
          icon="⚠️"
          color="bg-yellow-900/30 border-yellow-500/30"
        />
      </div>

      {/* Clocked In Section */}
      {data.clocked_in.length > 0 && (
        <Section
          title="🟢 Ingeklokt Vandaag"
          count={data.clocked_in.length}
          isOpen={showClockedIn}
          onToggle={() => setShowClockedIn(!showClockedIn)}
        >
          <div className="grid gap-3">
            {data.clocked_in.map((employee) => (
              <div
                key={employee.user_id}
                className="bg-neutral-800 p-4 rounded-lg flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
                    {employee.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-medium">{employee.username}</p>
                    <p className="text-gray-400 text-sm">{employee.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white text-sm">
                    In: <span className="font-mono">{employee.clock_in}</span>
                  </p>
                  <p className="text-white text-sm">
                    Uit: <span className="font-mono">{employee.clock_out}</span>
                  </p>
                  {employee.came_by_car && (
                    <p className="text-gray-400 text-xs mt-1">🚗 Met auto</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* On Leave Section */}
      {data.on_leave.length > 0 && (
        <Section
          title="🔴 Met Verlof"
          count={data.on_leave.length}
          isOpen={showOnLeave}
          onToggle={() => setShowOnLeave(!showOnLeave)}
        >
          <div className="grid gap-3">
            {data.on_leave.map((employee) => (
              <div
                key={employee.user_id}
                className={`p-4 rounded-lg border ${TYPE_COLORS[employee.absence_type as keyof typeof TYPE_COLORS]}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-ofa-red rounded-full flex items-center justify-center text-white font-bold">
                      {employee.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-medium">{employee.username}</p>
                      <p className="text-gray-400 text-sm">{employee.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-neutral-900/50">
                      {TYPE_NAMES_NL[employee.absence_type as keyof typeof TYPE_NAMES_NL]}
                    </span>
                    <p className="text-gray-400 text-sm mt-2">
                      Sinds {formatDateNL(employee.start_date)}
                      {employee.end_date && ` t/m ${formatDateNL(employee.end_date)}`}
                    </p>
                  </div>
                </div>
                {employee.reason && (
                  <p className="text-gray-400 text-sm mt-3 pl-13">
                    <span className="font-medium">Reden:</span> {employee.reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Missing Section */}
      {data.expected_missing.length > 0 && (
        <Section
          title="⚠️ Verwacht maar Afwezig"
          count={data.expected_missing.length}
          isOpen={showMissing}
          onToggle={() => setShowMissing(!showMissing)}
        >
          <div className="grid gap-3">
            {data.expected_missing.map((employee) => (
              <div
                key={employee.user_id}
                className="bg-yellow-900/20 border border-yellow-500/30 p-4 rounded-lg flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-yellow-600 rounded-full flex items-center justify-center text-white font-bold">
                  {employee.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-medium">{employee.username}</p>
                  <p className="text-gray-400 text-sm">{employee.email}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Empty State */}
      {data.clocked_in.length === 0 && data.on_leave.length === 0 && data.expected_missing.length === 0 && (
        <div className="bg-ofa-bg rounded-lg border border-neutral-800 p-12 text-center">
          <p className="text-gray-400 text-lg">Geen activiteit vandaag</p>
        </div>
      )}
    </div>
  );
}

// Helper Components
function StatCard({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) {
  return (
    <div className={`${color} border border-neutral-700 rounded-lg p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">{title}</p>
          <p className="text-white text-3xl font-bold mt-2">{value}</p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );
}

function Section({
  title,
  count,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-ofa-bg rounded-lg border border-neutral-800 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-neutral-800/50 transition"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{isOpen ? '▼' : '▶'}</span>
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <span className="px-3 py-1 bg-ofa-red rounded-full text-white text-sm font-medium">
            {count}
          </span>
        </div>
      </button>
      {isOpen && <div className="px-6 pb-6">{children}</div>}
    </div>
  );
}

function formatDateNL(dateStr: string): string {
  const date = new Date(dateStr);
  const months = [
    'januari', 'februari', 'maart', 'april', 'mei', 'juni',
    'juli', 'augustus', 'september', 'oktober', 'november', 'december'
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}