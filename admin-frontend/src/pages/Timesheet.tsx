import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import type { ClockEvent, CreateClockEventRequest, UpdateClockEventRequest, User } from '../types/api';

type DateRangeFilter = 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'custom';

export default function Timesheet() {
  const [selectedUserId, setSelectedUserId] = useState<number | 'all'>('all');
  const [dateRange, setDateRange] = useState<DateRangeFilter>('thisWeek');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch all users
  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get<User[]>('/api/users');
      return response.data;
    },
  });

  // Filter only active employees
  const activeEmployees = allUsers.filter(u => u.role === 'employee' && u.is_active);

  // Calculate date range
  const getDateRange = () => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (dateRange) {
      case 'thisWeek': {
        const dayOfWeek = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        startDate = monday;
        endDate = new Date(monday);
        endDate.setDate(monday.getDate() + 6);
        break;
      }
      case 'lastWeek': {
        const dayOfWeek = today.getDay();
        const lastMonday = new Date(today);
        lastMonday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) - 7);
        startDate = lastMonday;
        endDate = new Date(lastMonday);
        endDate.setDate(lastMonday.getDate() + 6);
        break;
      }
      case 'thisMonth': {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      }
      case 'lastMonth': {
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      }
      case 'custom': {
        startDate = customStartDate ? new Date(customStartDate) : new Date(0);
        endDate = customEndDate ? new Date(customEndDate) : new Date();
        break;
      }
      default:
        startDate = new Date(0);
        endDate = new Date();
    }

    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    };
  };

  const { start, end } = getDateRange();

  // Fetch all clock events in a single bulk query with date range
  const { data: allClockEvents = [], isLoading } = useQuery({
    queryKey: ['all-clock-events', start, end],
    queryFn: async () => {
      const response = await api.get<(ClockEvent & { username: string })[]>('/api/clock/all-events', {
        params: {
          start_date: start,
          end_date: end,
        },
      });
      return response.data;
    },
  });

  // Filter events by selected employee
  const filteredEvents = selectedUserId === 'all'
    ? allClockEvents
    : allClockEvents.filter(event => event.user_id === selectedUserId);

  // Filter employees
  const displayedEmployees = selectedUserId === 'all'
    ? activeEmployees
    : activeEmployees.filter(emp => emp.id === selectedUserId);

  const resetFilters = () => {
    setSelectedUserId('all');
    setDateRange('thisWeek');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Uurregistratie</h1>
        <p className="text-gray-400 mt-1">Bekijk en beheer uurregistraties per medewerker</p>
      </div>

      {/* Filters */}
      <div className="bg-ofa-bg rounded-lg border border-neutral-800 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Employee selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Medewerker
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
            >
              <option value="all">Alle medewerkers</option>
              {activeEmployees.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username}
                </option>
              ))}
            </select>
          </div>

          {/* Date range selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Periode
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRangeFilter)}
              className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
            >
              <option value="thisWeek">Deze week</option>
              <option value="lastWeek">Vorige week</option>
              <option value="thisMonth">Deze maand</option>
              <option value="lastMonth">Vorige maand</option>
              <option value="custom">Aangepast</option>
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex items-end gap-2">
            <button
              onClick={resetFilters}
              className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition"
            >
              Reset
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex-1 px-4 py-2 bg-ofa-red hover:bg-ofa-red-hover text-white rounded-lg transition"
            >
              + Toevoegen
            </button>
          </div>
        </div>

        {/* Custom date inputs */}
        {dateRange === 'custom' && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Van
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tot
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
              />
            </div>
          </div>
        )}
      </div>

      {/* Employee sections */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-ofa-bg rounded-lg border border-neutral-800 p-8 text-center text-gray-400">
            Laden...
          </div>
        ) : displayedEmployees.length === 0 ? (
          <div className="bg-ofa-bg rounded-lg border border-neutral-800 p-8 text-center text-gray-400">
            Geen medewerkers gevonden
          </div>
        ) : (
          displayedEmployees.map((employee) => {
            const employeeEvents = filteredEvents
              .filter(e => e.user_id === employee.id)
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            return (
              <EmployeeTimesheetSection
                key={employee.id}
                employee={employee}
                events={employeeEvents}
              />
            );
          })
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateClockEventModal
          users={activeEmployees}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}

// Employee Timesheet Section Component
function EmployeeTimesheetSection({
  employee,
  events,
}: {
  employee: User;
  events: (ClockEvent & { username: string })[];
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [editingEvent, setEditingEvent] = useState<(ClockEvent & { username: string }) | null>(null);

  // Calculate total hours
  const totalHours = events.reduce((sum, event) => {
    return sum + calculateHours(event.clock_in, event.clock_out);
  }, 0);

  return (
    <>
      <div className="bg-ofa-bg rounded-lg border border-neutral-800 overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-neutral-800/50 transition"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">{isExpanded ? '▼' : '▶'}</span>
            <h3 className="text-lg font-bold text-white">{employee.username}</h3>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              totalHours >= (employee.expected_weekly_hours || 0)
                ? 'bg-green-900/30 text-green-400'
                : totalHours > 0
                ? 'bg-yellow-900/30 text-yellow-400'
                : 'bg-gray-900/30 text-gray-400'
            }`}>
              {totalHours.toFixed(2)} uur
            </span>
          </div>
        </button>

        {/* Events list */}
        {isExpanded && (
          <div className="px-6 pb-6">
            {events.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Geen registraties in deze periode</p>
            ) : (
              <div className="space-y-3">
                {events.map((event) => {
                  const hours = calculateHours(event.clock_in, event.clock_out);
                  const kmCompensation = (event.km_driven || 0) * 0.23;

                  return (
                    <div
                      key={event.id}
                      className="bg-neutral-800 p-4 rounded-lg border-l-4 border-ofa-red"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          {/* Date */}
                          <div className="text-white font-medium">
                            {formatDateNL(event.date)}
                          </div>

                          {/* Time and hours */}
                          <div className="flex items-center gap-4 text-sm text-gray-400">
                            <span>
                              {event.clock_in.substring(0, 5)} → {event.clock_out.substring(0, 5)}
                            </span>
                            <span className="text-white font-medium">
                              ({hours.toFixed(2)} uur)
                            </span>
                          </div>

                          {/* Car info */}
                          <div className="flex items-center gap-4 text-sm">
                            {event.came_by_car ? (
                              <>
                                <span className="text-green-400">🚗 Auto</span>
                                {event.parking_cost && (
                                  <span className="text-gray-400">
                                    Parkeren: €{event.parking_cost.toFixed(2)}
                                  </span>
                                )}
                                {event.km_driven && (
                                  <span className="text-gray-400">
                                    KM: {event.km_driven.toFixed(1)} (€{kmCompensation.toFixed(2)})
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-500">Geen auto</span>
                            )}
                          </div>
                        </div>

                        {/* Action button */}
                        <button
                          onClick={() => setEditingEvent(event)}
                          className="px-3 py-1 bg-neutral-700 hover:bg-neutral-600 text-white rounded transition text-sm"
                        >
                          Bewerken
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingEvent && (
        <EditClockEventModal
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
        />
      )}
    </>
  );
}

// Helper functions
function calculateHours(clockIn: string, clockOut: string): number {
  const [inHours, inMinutes] = clockIn.split(':').map(Number);
  const [outHours, outMinutes] = clockOut.split(':').map(Number);

  const inTotalMinutes = inHours * 60 + inMinutes;
  const outTotalMinutes = outHours * 60 + outMinutes;

  const diffMinutes = outTotalMinutes - inTotalMinutes;
  return diffMinutes / 60;
}

function formatDateNL(dateStr: string): string {
  const date = new Date(dateStr);
  const months = [
    'jan', 'feb', 'mrt', 'apr', 'mei', 'jun',
    'jul', 'aug', 'sep', 'okt', 'nov', 'dec'
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

// Create Clock Event Modal
function CreateClockEventModal({
  users,
  onClose,
}: {
  users: User[];
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    user_id: users[0]?.id || 0,
    event_date: new Date().toISOString().split('T')[0],
    clock_in_time: '09:00',
    clock_out_time: '17:00',
    came_by_car: false,
    parking_cost: '',
    km_driven: '',
  });
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: CreateClockEventRequest) => {
      await api.post('/api/clock/create', null, {
        params: {
          user_id: data.user_id,
          event_date: data.event_date,
          clock_in_time: data.clock_in_time,
          clock_out_time: data.clock_out_time,
          came_by_car: data.came_by_car,
          parking_cost: data.parking_cost,
          km_driven: data.km_driven,
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-clock-events'] });
      onClose();
    },
    onError: (error: any) => {
      alert(error.response?.data?.detail || 'Fout bij aanmaken uurregistratie');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      user_id: formData.user_id,
      event_date: formData.event_date,
      clock_in_time: formData.clock_in_time,
      clock_out_time: formData.clock_out_time,
      came_by_car: formData.came_by_car,
      parking_cost: formData.parking_cost ? Number(formData.parking_cost) : null,
      km_driven: formData.km_driven ? Number(formData.km_driven) : null,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-ofa-bg rounded-lg max-w-md w-full p-6 border border-neutral-800 my-8">
        <h2 className="text-xl font-bold text-white mb-4">Uurregistratie Toevoegen</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Medewerker
            </label>
            <select
              value={formData.user_id}
              onChange={(e) => setFormData({ ...formData, user_id: Number(e.target.value) })}
              required
              className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Datum
            </label>
            <input
              type="date"
              value={formData.event_date}
              onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
              required
              className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                In
              </label>
              <input
                type="time"
                value={formData.clock_in_time}
                onChange={(e) => setFormData({ ...formData, clock_in_time: e.target.value })}
                required
                className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Uit
              </label>
              <input
                type="time"
                value={formData.clock_out_time}
                onChange={(e) => setFormData({ ...formData, clock_out_time: e.target.value })}
                required
                className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.came_by_car}
                onChange={(e) => setFormData({ ...formData, came_by_car: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-300">Met auto gekomen</span>
            </label>
          </div>

          {formData.came_by_car && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Parkeerkosten (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.parking_cost}
                  onChange={(e) => setFormData({ ...formData, parking_cost: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Kilometers
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.km_driven}
                  onChange={(e) => setFormData({ ...formData, km_driven: e.target.value })}
                  placeholder="0.0"
                  className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 px-4 py-2 bg-ofa-red hover:bg-ofa-red-hover disabled:bg-neutral-700 text-white rounded-lg transition"
            >
              {createMutation.isPending ? 'Toevoegen...' : 'Toevoegen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Clock Event Modal
function EditClockEventModal({
  event,
  onClose,
}: {
  event: ClockEvent & { username: string };
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    clock_in: event.clock_in.substring(0, 5),
    clock_out: event.clock_out.substring(0, 5),
    came_by_car: event.came_by_car,
    parking_cost: event.parking_cost?.toString() || '',
    km_driven: event.km_driven?.toString() || '',
  });
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateClockEventRequest) => {
      await api.patch(`/api/clock/${event.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-clock-events'] });
      onClose();
    },
    onError: (error: any) => {
      alert(error.response?.data?.detail || 'Fout bij bijwerken uurregistratie');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      clock_in: formData.clock_in,
      clock_out: formData.clock_out,
      came_by_car: formData.came_by_car,
      parking_cost: formData.parking_cost ? Number(formData.parking_cost) : null,
      km_driven: formData.km_driven ? Number(formData.km_driven) : null,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-ofa-bg rounded-lg max-w-md w-full p-6 border border-neutral-800 my-8">
        <h2 className="text-xl font-bold text-white mb-4">Uurregistratie Bewerken</h2>

        <div className="mb-4 p-3 bg-neutral-800 rounded-lg">
          <p className="text-sm text-gray-400">
            <span className="font-medium text-white">{event.username}</span> - {formatDateNL(event.date)}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                In
              </label>
              <input
                type="time"
                value={formData.clock_in}
                onChange={(e) => setFormData({ ...formData, clock_in: e.target.value })}
                required
                className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Uit
              </label>
              <input
                type="time"
                value={formData.clock_out}
                onChange={(e) => setFormData({ ...formData, clock_out: e.target.value })}
                required
                className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.came_by_car}
                onChange={(e) => setFormData({ ...formData, came_by_car: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-300">Met auto gekomen</span>
            </label>
          </div>

          {formData.came_by_car && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Parkeerkosten (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.parking_cost}
                  onChange={(e) => setFormData({ ...formData, parking_cost: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Kilometers
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.km_driven}
                  onChange={(e) => setFormData({ ...formData, km_driven: e.target.value })}
                  placeholder="0.0"
                  className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex-1 px-4 py-2 bg-ofa-red hover:bg-ofa-red-hover disabled:bg-neutral-700 text-white rounded-lg transition"
            >
              {updateMutation.isPending ? 'Opslaan...' : 'Opslaan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
