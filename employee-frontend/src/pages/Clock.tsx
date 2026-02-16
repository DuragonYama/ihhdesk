import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import type { ClockEvent, ClockInRequest, UpdateClockEventRequest, CreateClockEventRequest, Absence } from '../types/api';

// Helper functions
function getCurrentWeek() {
  const today = new Date();
  const dayOfWeek = today.getDay();

  let daysBackToMonday;
  if (dayOfWeek === 0) {
    daysBackToMonday = 6;
  } else {
    daysBackToMonday = dayOfWeek - 1;
  }

  const monday = new Date(today);
  monday.setDate(today.getDate() - daysBackToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  // Format in LOCAL timezone, not UTC
  const formatDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const start = formatDate(monday);
  const end = formatDate(sunday);


  return { start, end };
}

function formatDateNL(date: Date): string {
  const days = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
  const day = days[date.getDay()];
  const dateNum = date.getDate();
  const month = date.getMonth() + 1;
  return `${day} ${dateNum}/${month}`;
}

function calculateHours(clockIn: string, clockOut: string): number {
  const start = new Date(`2000-01-01T${clockIn}`);
  const end = new Date(`2000-01-01T${clockOut}`);
  const diff = end.getTime() - start.getTime();
  const hours = diff / 1000 / 60 / 60;
  return Math.max(0, hours); // Return raw hours, formatting will handle display
}

function formatHoursMinutes(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}u ${m}m`;
}

function getCurrentWeekStart() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - daysFromMonday);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

function getCurrentWeekDays() {
  const today = new Date();
  const dayOfWeek = today.getDay();

  let daysBackToMonday;
  if (dayOfWeek === 0) {
    daysBackToMonday = 6;
  } else {
    daysBackToMonday = dayOfWeek - 1;
  }

  const monday = new Date(today);
  monday.setDate(today.getDate() - daysBackToMonday);
  monday.setHours(0, 0, 0, 0);

  const days = [];
  const dayNames = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);

    // Format in LOCAL timezone, not UTC
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const dayName = dayNames[date.getDay()];
    const dayNum = date.getDate();
    const monthNum = date.getMonth() + 1;

    const todayYear = today.getFullYear();
    const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
    const todayDay = String(today.getDate()).padStart(2, '0');
    const todayStr = `${todayYear}-${todayMonth}-${todayDay}`;

    days.push({
      date: dateStr,
      label: `${dayName} ${dayNum}/${monthNum}`,
      isToday: dateStr === todayStr
    });
  }


  return days;
}

function getDayStatus(
  date: string,
  clockEvent: ClockEvent | undefined,
  absences: Absence[],
  scheduledDays: number[]
): { type: string; label: string; color: string } {
  const dateObj = new Date(date);
  const weekday = dateObj.getDay();
  const isScheduled = scheduledDays.includes(weekday);


  // PRIORITY 1: If there's a clock event, show it (regardless of absence)
  if (clockEvent) {
    const hours = calculateHours(clockEvent.clock_in, clockEvent.clock_out);
    return {
      type: 'worked',
      label: `Gewerkt: ${formatHoursMinutes(hours)}`,
      color: 'text-green-400'
    };
  }

  // PRIORITY 2: Check for absence
  const absence = absences.find(a => {
    // Normalize dates to remove time component
    const start = new Date(a.start_date.split('T')[0]);
    const end = a.end_date ? new Date(a.end_date.split('T')[0]) : new Date('2099-12-31');
    const checkDate = new Date(date);
    return a.status === 'approved' && checkDate >= start && checkDate <= end;
  });

  if (absence) {
    return {
      type: 'absence',
      label: absence.type === 'sick' ? '🏥 Ziek' :
             absence.type === 'vacation' ? '🏖️ Vakantie' :
             '📋 Persoonlijk',
      color: 'text-blue-400'
    };
  }

  // PRIORITY 3: Check if not scheduled
  if (!isScheduled) {
    return {
      type: 'off',
      label: 'Vrije dag',
      color: 'text-gray-500'
    };
  }

  // PRIORITY 4: Scheduled but no clock event
  const isPast = dateObj < new Date(new Date().toDateString());
  if (isPast) {
    return {
      type: 'missed',
      label: 'Niet ingeklokt',
      color: 'text-red-400'
    };
  } else {
    return {
      type: 'future',
      label: 'Nog niet ingeklokt',
      color: 'text-gray-400'
    };
  }
}

// Non-Scheduled Day Modal
function NonScheduledModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: ClockInRequest) => void;
}) {
  const [reason, setReason] = useState('');
  const [cameByCar, setCameByCar] = useState(false);
  const [parkingCost, setParkingCost] = useState('');
  const [kmDriven, setKmDriven] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Reden is verplicht');
      return;
    }
    onSubmit({
      came_by_car: cameByCar,
      parking_cost: cameByCar && parkingCost ? parseFloat(parkingCost) : undefined,
      km_driven: cameByCar && kmDriven ? parseFloat(kmDriven) : undefined,
      reason: reason.trim(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-ofa-bg border border-neutral-800 rounded-lg p-6 max-w-md w-full">
        <h2 className="text-lg font-semibold text-white mb-4">
          ⚠️ Dit is geen geplande werkdag
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Waarom werk je vandaag? *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:border-ofa-red focus:outline-none"
              rows={3}
              required
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="car"
              checked={cameByCar}
              onChange={(e) => setCameByCar(e.target.checked)}
              className="w-4 h-4 bg-neutral-900 border-neutral-700 rounded"
            />
            <label htmlFor="car" className="ml-2 text-sm text-white">
              Met de auto gekomen
            </label>
          </div>

          {cameByCar && (
            <>
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Parkeerkosten (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={parkingCost}
                  onChange={(e) => setParkingCost(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:border-ofa-red focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Kilometers gereden
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={kmDriven}
                  onChange={(e) => setKmDriven(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:border-ofa-red focus:outline-none"
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition"
            >
              Annuleren
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-ofa-red hover:bg-ofa-red-hover text-white rounded-lg transition"
            >
              Aanvragen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Week Events Card
function WeekEventsCard({
  events,
  absences,
  scheduledDays,
  onEdit,
  onAdd,
}: {
  events: ClockEvent[];
  absences: Absence[];
  scheduledDays: number[];
  onEdit: (event: ClockEvent) => void;
  onAdd: (date: string) => void;
}) {
  const week = getCurrentWeekDays();
  const weekStart = getCurrentWeekStart();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  // Convert to date strings using LOCAL time (not UTC)
  const formatDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const weekStartStr = formatDate(weekStart);
  const weekEndStr = formatDate(weekEnd);

  return (
    <div className="bg-ofa-bg border border-neutral-800 rounded-lg p-6">
      <h2 className="text-base font-semibold text-white mb-4">Deze Week</h2>

      <div className="space-y-3">
        {week.map(({ date, label, isToday }) => {
          // Find clock event - normalize date format to ensure matching
          const clockEvent = events.find(e => {
            const eventDate = typeof e.date === 'string' ? e.date.split('T')[0] : e.date;
            return eventDate === date;
          });


          const status = getDayStatus(date, clockEvent, absences, scheduledDays);

          // Use string comparison - cleaner and no timezone issues
          const isInCurrentWeek = date >= weekStartStr && date <= weekEndStr;

          const canEdit = !!clockEvent && isInCurrentWeek;
          const canAdd = !clockEvent && isInCurrentWeek; // Allow adding hours on any day, even sick days


          return (
            <div
              key={date}
              className={`p-4 rounded-lg border ${
                isToday ? 'border-ofa-red bg-ofa-red/10' : 'border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">
                    {label} {isToday && '• Vandaag'}
                  </p>
                  <p className={`text-sm ${status.color} mt-1`}>
                    {status.label}
                  </p>
                  {clockEvent && status.type === 'worked' && (
                    <div className="flex gap-3 mt-1 text-xs text-gray-500">
                      <span>In: {clockEvent.clock_in}</span>
                      <span>Uit: {clockEvent.clock_out}</span>
                      {clockEvent.status === 'pending' && (
                        <span className="text-yellow-400">⏳ Pending</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {canAdd && (
                    <button
                      onClick={() => onAdd(date)}
                      className="px-3 py-1 bg-green-700 hover:bg-green-600 text-white text-sm rounded transition"
                    >
                      Toevoegen
                    </button>
                  )}

                  {canEdit && (
                    <button
                      onClick={() => onEdit(clockEvent)}
                      className="px-3 py-1 bg-neutral-700 hover:bg-neutral-600 text-white text-sm rounded transition"
                    >
                      Bewerken
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Create Clock Event Modal
function CreateClockEventModal({
  date,
  isScheduled,
  onClose,
}: {
  date: string;
  isScheduled: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  // Default work hours: 10:00 - 18:00 (8 hours)
  const defaultStart = '10:00';
  const defaultEnd = '18:00';

  const [formData, setFormData] = useState({
    clock_in: defaultStart,
    clock_out: defaultEnd,
    came_by_car: false,
    parking_cost: '',
    km_driven: '',
    reason: '',
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/api/clock/', {
        date: date,
        clock_in: data.clock_in + ':00',
        clock_out: data.clock_out + ':00',
        came_by_car: data.came_by_car,
        parking_cost: data.parking_cost ? parseFloat(data.parking_cost) : null,
        km_driven: data.km_driven ? parseFloat(data.km_driven) : null,
        reason: data.reason || null,
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.requires_approval) {
        alert('Aanvraag ingediend - admin moet goedkeuren');
      } else {
        alert('Uren toegevoegd!');
      }
      queryClient.invalidateQueries({ queryKey: ['clock'] });
      onClose();
    },
    onError: (error: any) => {
      alert(error.response?.data?.detail || 'Fout bij toevoegen');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isScheduled && !formData.reason.trim()) {
      alert('Reden is verplicht voor niet-geplande dagen');
      return;
    }

    createMutation.mutate(formData);
  };

  const dateObj = new Date(date);
  const dateLabel = dateObj.toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-ofa-bg rounded-lg max-w-md w-full p-6 border border-neutral-800">
        <h2 className="text-xl font-bold text-white mb-2">Uren Toevoegen</h2>
        <p className="text-gray-400 mb-4">{dateLabel}</p>

        {!isScheduled && (
          <div className="bg-yellow-900/30 border border-yellow-500 rounded p-3 mb-4">
            <p className="text-yellow-400 text-sm">
              ⚠️ Dit is geen geplande werkdag - admin moet goedkeuren
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Starttijd
              </label>
              <input
                type="time"
                value={formData.clock_in}
                onChange={(e) =>
                  setFormData({ ...formData, clock_in: e.target.value })
                }
                required
                className="w-full px-3 py-2 bg-ofa-bg-dark border border-neutral-700 rounded text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Eindtijd
              </label>
              <input
                type="time"
                value={formData.clock_out}
                onChange={(e) =>
                  setFormData({ ...formData, clock_out: e.target.value })
                }
                required
                className="w-full px-3 py-2 bg-ofa-bg-dark border border-neutral-700 rounded text-white"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.came_by_car}
                onChange={(e) =>
                  setFormData({ ...formData, came_by_car: e.target.checked })
                }
                className="w-4 h-4"
              />
              <span className="text-white text-sm">Met auto gekomen</span>
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
                  onChange={(e) =>
                    setFormData({ ...formData, parking_cost: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-ofa-bg-dark border border-neutral-700 rounded text-white"
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
                  onChange={(e) =>
                    setFormData({ ...formData, km_driven: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-ofa-bg-dark border border-neutral-700 rounded text-white"
                />
              </div>
            </>
          )}

          {!isScheduled && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Reden *
              </label>
              <input
                type="text"
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
                required
                placeholder="Waarom heb je deze dag gewerkt?"
                className="w-full px-3 py-2 bg-ofa-bg-dark border border-neutral-700 rounded text-white"
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded transition"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 px-4 py-2 bg-ofa-red hover:bg-ofa-red-hover disabled:bg-neutral-700 text-white rounded transition"
            >
              {createMutation.isPending ? 'Toevoegen...' : 'Toevoegen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Event Modal
function EditEventModal({
  event,
  onClose,
}: {
  event: ClockEvent;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [clockIn, setClockIn] = useState(event.clock_in);
  const [clockOut, setClockOut] = useState(event.clock_out);
  const [cameByCar, setCameByCar] = useState(event.came_by_car);
  const [parkingCost, setParkingCost] = useState(
    event.parking_cost?.toString() || ''
  );
  const [kmDriven, setKmDriven] = useState(event.km_driven?.toString() || '');

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateClockEventRequest) => {
      const response = await api.patch(`/api/clock/${event.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      alert('Bijgewerkt!');
      queryClient.invalidateQueries({ queryKey: ['clock'] });
      onClose();
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Fout bij bijwerken';
      alert(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      clock_in: clockIn,
      clock_out: clockOut,
      came_by_car: cameByCar,
      parking_cost: cameByCar && parkingCost ? parseFloat(parkingCost) : null,
      km_driven: cameByCar && kmDriven ? parseFloat(kmDriven) : null,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-ofa-bg border border-neutral-800 rounded-lg p-6 max-w-md w-full">
        <h2 className="text-lg font-semibold text-white mb-4">
          Event bewerken - {event.date}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Ingeklokt</label>
            <input
              type="time"
              value={clockIn}
              onChange={(e) => setClockIn(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:border-ofa-red focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Uitgeklokt</label>
            <input
              type="time"
              value={clockOut}
              onChange={(e) => setClockOut(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:border-ofa-red focus:outline-none"
              required
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="edit-car"
              checked={cameByCar}
              onChange={(e) => setCameByCar(e.target.checked)}
              className="w-4 h-4 bg-neutral-900 border-neutral-700 rounded"
            />
            <label htmlFor="edit-car" className="ml-2 text-sm text-white">
              Met de auto gekomen
            </label>
          </div>

          {cameByCar && (
            <>
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Parkeerkosten (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={parkingCost}
                  onChange={(e) => setParkingCost(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:border-ofa-red focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Kilometers gereden
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={kmDriven}
                  onChange={(e) => setKmDriven(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:border-ofa-red focus:outline-none"
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex-1 px-4 py-3 bg-ofa-red hover:bg-ofa-red-hover disabled:bg-neutral-700 text-white rounded-lg transition"
            >
              {updateMutation.isPending ? 'Bezig...' : 'Opslaan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Main Clock Component
export default function Clock() {
  const [showNonScheduledModal, setShowNonScheduledModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ClockEvent | null>(null);
  const [creatingEventForDate, setCreatingEventForDate] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch today's clock event
  const { data: todayEvent } = useQuery({
    queryKey: ['clock', 'today'],
    queryFn: async () => {
      try {
        const response = await api.get<ClockEvent>('/api/clock/today');
        return response.data;
      } catch (err: any) {
        if (err.response?.status === 404) return null;
        throw err;
      }
    },
  });

  // Fetch current week events
  const { data: weekEvents = [] } = useQuery({
    queryKey: ['clock', 'week'],
    queryFn: async () => {
      const week = getCurrentWeek();

      const response = await api.get<ClockEvent[]>('/api/clock/my-events');
      const allEvents = response.data;


      // Use string comparison instead of Date objects to avoid timezone issues
      const filtered = allEvents.filter(e => {
        const eventDate = typeof e.date === 'string' ? e.date.split('T')[0] : e.date;
        const inRange = eventDate >= week.start && eventDate <= week.end;


        return inRange;
      });

      return filtered;
    },
  });

  // Fetch absences
  const { data: myAbsences = [] } = useQuery({
    queryKey: ['absences', 'mine'],
    queryFn: async () => {
      const response = await api.get<Absence[]>('/api/absences/my-absences');
      return response.data;
    },
  });

  // Check if today is scheduled
  const today = new Date().getDay();
  const isScheduledToday = user?.work_days?.includes(today);

  // Debug logging

  // Clock in mutation
  const clockInMutation = useMutation({
    mutationFn: async (data: ClockInRequest) => {
      const response = await api.post('/api/clock/in', data);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.requires_approval) {
        alert('Aanvraag ingediend - admin moet goedkeuren');
      }
      queryClient.invalidateQueries({ queryKey: ['clock'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Fout bij inklokken';
      alert(message);
    },
  });

  // Clock out mutation
  const clockOutMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/clock/out');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clock'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Fout bij uitklokken';
      alert(message);
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Klok In/Uit</h1>

      {/* Current Week Events */}
      <WeekEventsCard
        events={weekEvents}
        absences={myAbsences}
        scheduledDays={user?.work_days || []}
        onEdit={setEditingEvent}
        onAdd={setCreatingEventForDate}
      />

      {/* Modals */}
      {showNonScheduledModal && (
        <NonScheduledModal
          onClose={() => setShowNonScheduledModal(false)}
          onSubmit={(data) => {
            clockInMutation.mutate(data);
            setShowNonScheduledModal(false);
          }}
        />
      )}

      {editingEvent && (
        <EditEventModal
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
        />
      )}

      {creatingEventForDate && (
        <CreateClockEventModal
          date={creatingEventForDate}
          isScheduled={
            user?.work_days?.includes(new Date(creatingEventForDate).getDay()) ||
            false
          }
          onClose={() => setCreatingEventForDate(null)}
        />
      )}
    </div>
  );
}
