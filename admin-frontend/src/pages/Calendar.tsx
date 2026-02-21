import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import type { CalendarEvent, CompanyHoliday, EventCategory, CreateCategoryRequest, CreateEventRequest, CreateHolidayRequest, User } from '../types/api';
import BulkAbsenceModal from '../components/BulkAbsenceModal';

// Month names for Dutch locale
const MONTH_NAMES = [
  'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
];

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showHolidays, setShowHolidays] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [showCategories, setShowCategories] = useState(false);
  const [showBulkAbsenceModal, setShowBulkAbsenceModal] = useState(false);

  // Fetch data
  const { data: events = [] } = useQuery({
    queryKey: ['calendar', 'events'],
    queryFn: async () => {
      const response = await api.get<CalendarEvent[]>('/api/calendar/events');
      return response.data;
    },
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ['calendar', 'holidays'],
    queryFn: async () => {
      const response = await api.get<CompanyHoliday[]>('/api/calendar/holidays');
      return response.data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['calendar', 'categories'],
    queryFn: async () => {
      const response = await api.get<EventCategory[]>('/api/calendar/categories');
      return response.data;
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get<User[]>('/api/users');
      return response.data;
    },
  });

  // Filter events and holidays for current month
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

  const monthEvents = events.filter(event => {
    const eventDate = new Date(event.date);
    return eventDate >= monthStart && eventDate <= monthEnd;
  });

  const monthHolidays = holidays.filter(holiday => {
    const holidayDate = new Date(holiday.date);
    return holidayDate >= monthStart && holidayDate <= monthEnd;
  });

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleMonthChange = (newDate: Date) => {
    setCurrentMonth(newDate);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Kalender</h1>
          <p className="text-gray-400 mt-1">Evenementen en bedrijfsvakanties</p>
        </div>
        <button
          onClick={() => setShowBulkAbsenceModal(true)}
          className="w-full sm:w-auto px-4 py-2.5 bg-ofa-red hover:bg-ofa-red-hover text-white rounded-lg transition font-medium min-h-[44px]"
        >
          + Massa Verlof
        </button>
      </div>

      {/* Calendar Grid */}
      <CalendarGrid
        currentMonth={currentMonth}
        events={monthEvents}
        holidays={monthHolidays}
        categories={categories}
        onPrevMonth={prevMonth}
        onNextMonth={nextMonth}
        onMonthChange={handleMonthChange}
      />

      {/* Holidays Management */}
      <HolidaysSection
        holidays={monthHolidays}
        currentMonth={currentMonth}
        isOpen={showHolidays}
        onToggle={() => setShowHolidays(!showHolidays)}
      />

      {/* Events Management */}
      <EventsSection
        events={monthEvents}
        currentMonth={currentMonth}
        categories={categories}
        users={users}
        isOpen={showEvents}
        onToggle={() => setShowEvents(!showEvents)}
      />

      {/* Categories Management */}
      <CategoriesSection
        categories={categories}
        isOpen={showCategories}
        onToggle={() => setShowCategories(!showCategories)}
      />

      {/* Bulk Absence Modal */}
      {showBulkAbsenceModal && (
        <BulkAbsenceModal
          users={users}
          onClose={() => setShowBulkAbsenceModal(false)}
          onSuccess={() => setShowBulkAbsenceModal(false)}
        />
      )}
    </div>
  );
}

// Calendar Grid Component
function CalendarGrid({
  currentMonth,
  events,
  holidays,
  categories,
  onPrevMonth,
  onNextMonth,
  onMonthChange,
}: {
  currentMonth: Date;
  events: CalendarEvent[];
  holidays: CompanyHoliday[];
  categories: EventCategory[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onMonthChange: (newDate: Date) => void;
}) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const currentYear = new Date().getFullYear();

  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Adjust for Monday start (0 = Monday, 6 = Sunday)
  const startDay = firstDay === 0 ? 6 : firstDay - 1;

  // Build calendar days
  const days = [];
  
  // Empty cells before month starts
  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }
  
  // Days of month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  // Get events/holidays for a specific day
  const getDayItems = (day: number | null) => {
    if (!day) return { events: [], holidays: [] };
    
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    const dayEvents = events.filter(e => e.date === dateStr);
    const dayHolidays = holidays.filter(h => h.date === dateStr);
    
    return { events: dayEvents, holidays: dayHolidays };
  };

  return (
    <div className="bg-ofa-bg rounded-lg border border-neutral-800 p-3 md:p-6">
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-4 md:mb-6 gap-2 md:gap-4">
        {/* Left arrow - fixed width */}
        <button
          onClick={onPrevMonth}
          className="w-12 h-12 flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition"
        >
          ◀
        </button>

        {/* Center dropdowns - flex gap */}
        <div className="flex items-center gap-3">
          <select
            value={month}
            onChange={(e) => {
              const newMonth = new Date(year, Number(e.target.value), 1);
              onMonthChange(newMonth);
            }}
            className="px-4 py-2.5 bg-ofa-bg border border-neutral-700 rounded-lg text-white text-lg font-bold focus:outline-none focus:border-ofa-red hover:bg-neutral-800 transition cursor-pointer appearance-none pr-10"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23fff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
              backgroundPosition: 'right 0.5rem center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '1.5em 1.5em',
            }}
          >
            {MONTH_NAMES.map((name, index) => (
              <option key={index} value={index} className="bg-ofa-bg text-white">
                {name}
              </option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => {
              const newMonth = new Date(Number(e.target.value), month, 1);
              onMonthChange(newMonth);
            }}
            className="px-4 py-2.5 bg-ofa-bg border border-neutral-700 rounded-lg text-white text-lg font-bold focus:outline-none focus:border-ofa-red hover:bg-neutral-800 transition cursor-pointer appearance-none pr-10"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23fff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
              backgroundPosition: 'right 0.5rem center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '1.5em 1.5em',
            }}
          >
            {Array.from({ length: 11 }, (_, i) => currentYear - 5 + i).map((y) => (
              <option key={y} value={y} className="bg-ofa-bg text-white">
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Right arrow - fixed width matching left */}
        <button
          onClick={onNextMonth}
          className="w-12 h-12 flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition"
        >
          ▶
        </button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {/* Day headers */}
        {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map((day) => (
          <div key={day} className="text-center text-gray-400 font-medium py-1 md:py-2 text-xs md:text-sm">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {days.map((day, index) => {
          const { events: dayEvents, holidays: dayHolidays } = getDayItems(day);
          const isToday = day && new Date().toDateString() === new Date(year, month, day).toDateString();

          return (
            <div
              key={index}
              className={`min-h-14 md:min-h-24 p-1 md:p-2 border border-neutral-700 rounded-lg ${
                day ? 'bg-neutral-900' : 'bg-transparent border-transparent'
              } ${isToday ? 'ring-2 ring-ofa-red' : ''}`}
            >
              {day && (
                <>
                  <div className={`text-xs md:text-sm font-medium mb-0.5 md:mb-1 ${isToday ? 'text-ofa-red' : 'text-white'}`}>
                    {day}
                  </div>
                  
                  {/* Holidays */}
                  {dayHolidays.map((holiday) => (
                    <div
                      key={holiday.id}
                      className="text-xs bg-purple-600 text-white px-2 py-1 rounded mb-1 truncate"
                      title={holiday.name}
                    >
                      {/* ICON: Holiday icon */}
                      {holiday.name}
                    </div>
                  ))}

                  {/* Events */}
                  {dayEvents.map((event) => {
                    const category = categories.find(c => c.id === event.category_id);
                    const isPending = event.status === 'pending';
                    
                    return (
                      <div
                        key={event.id}
                        className={`text-xs px-2 py-1 rounded mb-1 truncate ${
                          isPending ? 'border-2 border-dashed' : ''
                        }`}
                        style={{
                          backgroundColor: category?.color ? `${category.color}40` : '#374151',
                          borderColor: category?.color || '#6b7280',
                          color: category?.color || '#9ca3af'
                        }}
                        title={`${event.title}${isPending ? ' (Wachtend)' : ''}`}
                      >
                        {event.title}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-purple-600 rounded"></div>
          <span>Bedrijfsvakantie</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-dashed border-gray-400 rounded"></div>
          <span>Wachtend evenement</span>
        </div>
      </div>
    </div>
  );
}

// Holidays Section
function HolidaysSection({
  holidays,
  currentMonth,
  isOpen,
  onToggle,
}: {
  holidays: CompanyHoliday[];
  currentMonth: Date;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/calendar/holidays/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar', 'holidays'] });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (year: number) => {
      const response = await api.post(`/api/calendar/holidays/import-dutch/${year}`);
      return response.data;
    },
    onSuccess: (data) => {
      alert(`${data.created} Nederlandse feestdagen geïmporteerd voor ${data.year}${data.skipped > 0 ? ` (${data.skipped} overgeslagen)` : ''}`);
      queryClient.invalidateQueries({ queryKey: ['calendar', 'holidays'] });
    },
  });

  const handleImport = () => {
    const year = currentMonth.getFullYear();
    if (confirm(`Alle officiële Nederlandse feestdagen importeren voor ${year}?`)) {
      importMutation.mutate(year);
    }
  };

  const sortedHolidays = [...holidays].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const monthName = MONTH_NAMES[currentMonth.getMonth()];
  const year = currentMonth.getFullYear();

  return (
    <div className="bg-ofa-bg rounded-lg border border-neutral-800 overflow-hidden">
      <div className="px-4 md:px-6 py-3 md:py-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <button
          onClick={onToggle}
          className="flex items-center gap-3 hover:opacity-80 transition"
        >
          <span className="text-xl">{isOpen ? '▼' : '▶'}</span>
          <h2 className="text-base md:text-lg font-bold text-white">
            Bedrijfsvakanties - {monthName} {year}
          </h2>
          <span className="px-3 py-1 bg-purple-600 rounded-full text-white text-sm font-medium">
            {holidays.length}
          </span>
        </button>

        <div className="flex gap-2 sm:ml-auto flex-wrap">
          <button
            onClick={handleImport}
            disabled={importMutation.isPending}
            className="flex-1 sm:flex-none px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-700 text-white rounded-lg transition text-sm min-h-[40px]"
          >
            {importMutation.isPending ? 'Importeren...' : `NL Feestdagen ${currentMonth.getFullYear()}`}
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="flex-1 sm:flex-none px-3 py-2 bg-ofa-red hover:bg-ofa-red-hover text-white rounded-lg transition text-sm min-h-[40px]"
          >
            + Vakantie
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="px-6 pb-6">
          {sortedHolidays.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Geen bedrijfsvakanties</p>
          ) : (
            <div className="grid gap-3">
              {sortedHolidays.map((holiday) => (
                <div
                  key={holiday.id}
                  className="bg-neutral-800 p-4 rounded-lg flex items-center justify-between"
                >
                  <div>
                    <p className="text-white font-medium">{holiday.name}</p>
                    <p className="text-gray-400 text-sm">{formatDateNL(holiday.date)}</p>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Vakantie "${holiday.name}" verwijderen?`)) {
                        deleteMutation.mutate(holiday.id);
                      }
                    }}
                    className="p-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded transition"
                    title="Verwijderen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showModal && <CreateHolidayModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

// Events Section
function EventsSection({
  events,
  currentMonth,
  categories,
  users,
  isOpen,
  onToggle,
}: {
  events: CalendarEvent[];
  currentMonth: Date;
  categories: EventCategory[];
  users: User[];
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [eventFilter, setEventFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/calendar/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar', 'events'] });
    },
  });

  // Month-scoped filter logic
  const today = new Date().toISOString().split('T')[0];
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString().split('T')[0];
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString().split('T')[0];

  const filteredEvents = events.filter(event => {
    // First filter by current month (already done by parent, but defensive)
    if (event.date < monthStart || event.date > monthEnd) return false;

    // Then filter by past/upcoming/all within the month
    if (eventFilter === 'all') return true;
    if (eventFilter === 'upcoming') return event.date >= today;
    if (eventFilter === 'past') return event.date < today;
    return true;
  });

  const sortedEvents = [...filteredEvents].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const monthName = MONTH_NAMES[currentMonth.getMonth()];
  const year = currentMonth.getFullYear();

  return (
    <div className="bg-ofa-bg rounded-lg border border-neutral-800 overflow-hidden">
      <div className="px-4 md:px-6 py-3 md:py-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <button
          onClick={onToggle}
          className="flex items-center gap-3 hover:opacity-80 transition"
        >
          <span className="text-xl">{isOpen ? '▼' : '▶'}</span>
          <h2 className="text-base md:text-lg font-bold text-white">
            Evenementen - {monthName} {year}
          </h2>
          <span className="px-3 py-1 bg-ofa-red rounded-full text-white text-sm font-medium">
            {filteredEvents.length}
          </span>
        </button>

        <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value as 'all' | 'upcoming' | 'past')}
            className="flex-1 sm:flex-none px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm min-h-[40px]"
          >
            <option value="upcoming">Aankomend</option>
            <option value="all">Alles</option>
            <option value="past">Verleden</option>
          </select>
          <button
            onClick={() => setShowModal(true)}
            className="flex-1 sm:flex-none px-3 py-2 bg-ofa-red hover:bg-ofa-red-hover text-white rounded-lg transition text-sm min-h-[40px]"
          >
            + Evenement
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="px-6 pb-6">
          {sortedEvents.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Geen evenementen</p>
          ) : (
            <div className="grid gap-3">
              {sortedEvents.map((event) => {
                const category = categories.find(c => c.id === event.category_id);
                
                return (
                  <div
                    key={event.id}
                    className="bg-neutral-800 p-4 rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-white font-medium">{event.title}</h3>
                          {event.status === 'pending' && (
                            <span className="px-2 py-1 bg-yellow-900/30 text-yellow-400 text-xs rounded">
                              Wachtend
                            </span>
                          )}
                          {event.visibility === 'specific' && (
                            <span className="px-2 py-1 bg-blue-900/30 text-blue-400 text-xs rounded">
                              Specifiek
                            </span>
                          )}
                        </div>
                        {category && (
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: category.color }}
                            ></div>
                            <span className="text-gray-400 text-sm">{category.name}</span>
                          </div>
                        )}
                        <p className="text-gray-400 text-sm">{formatDateNL(event.date)}</p>
                        {event.description && (
                          <p className="text-gray-400 text-sm mt-2">{event.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingEvent(event)}
                          className="px-3 py-1 bg-neutral-700 hover:bg-neutral-600 text-white rounded transition"
                        >
                          Bewerken
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Evenement "${event.title}" verwijderen?`)) {
                              deleteMutation.mutate(event.id);
                            }
                          }}
                          className="p-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded transition"
                          title="Verwijderen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <CreateEventModal
          categories={categories}
          users={users}
          onClose={() => setShowModal(false)}
        />
      )}

      {editingEvent && (
        <EditEventModal
          event={editingEvent}
          categories={categories}
          users={users}
          onClose={() => setEditingEvent(null)}
        />
      )}
    </div>
  );
}

// Categories Section
function CategoriesSection({
  categories,
  isOpen,
  onToggle,
}: {
  categories: EventCategory[];
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/calendar/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar', 'categories'] });
    },
  });

  return (
    <div className="bg-ofa-bg rounded-lg border border-neutral-800 overflow-hidden">
      <div className="px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-3">
        <button
          onClick={onToggle}
          className="flex items-center gap-3 hover:opacity-80 transition"
        >
          <span className="text-xl">{isOpen ? '▼' : '▶'}</span>
          <h2 className="text-base md:text-lg font-bold text-white">Categorieën</h2>
          <span className="px-3 py-1 bg-ofa-red rounded-full text-white text-sm font-medium">
            {categories.length}
          </span>
        </button>

        <button
          onClick={() => setShowModal(true)}
          className="px-3 py-2 bg-ofa-red hover:bg-ofa-red-hover text-white rounded-lg transition text-sm min-h-[40px]"
        >
          + Categorie
        </button>
      </div>

      {isOpen && (
        <div className="px-6 pb-6">
          {categories.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Geen categorieën</p>
          ) : (
            <div className="grid gap-3">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="bg-neutral-800 p-4 rounded-lg flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: category.color }}
                    ></div>
                    <span className="text-white font-medium">{category.name}</span>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Categorie "${category.name}" verwijderen?`)) {
                        deleteMutation.mutate(category.id);
                      }
                    }}
                    className="p-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded transition"
                    title="Verwijderen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showModal && <CreateCategoryModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

// Create Holiday Modal
function CreateHolidayModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState<CreateHolidayRequest>({
    name: '',
    date: '',
  });
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: CreateHolidayRequest) => {
      await api.post('/api/calendar/holidays', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar', 'holidays'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-ofa-bg rounded-lg max-w-md w-full p-6 border border-neutral-800">
        <h2 className="text-xl font-bold text-white mb-4">Nieuwe Bedrijfsvakantie</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Naam
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Bijv. Kerstmis"
              className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Datum
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
              className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
            />
          </div>

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
              {createMutation.isPending ? 'Aanmaken...' : 'Aanmaken'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Create Event Modal
function CreateEventModal({
  categories,
  users,
  onClose,
}: {
  categories: EventCategory[];
  users: User[];
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<CreateEventRequest>({
    title: '',
    description: '',
    category_id: undefined,
    date: '',
    time_start: '',
    time_end: '',
    visibility: 'all',
    assigned_user_ids: [],
  });
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: CreateEventRequest) => {
      await api.post('/api/calendar/events', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar', 'events'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = { ...formData };
    if (!submitData.description) delete submitData.description;
    if (!submitData.time_start) delete submitData.time_start;
    if (!submitData.time_end) delete submitData.time_end;
    createMutation.mutate(submitData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-ofa-bg rounded-lg max-w-md w-full p-6 border border-neutral-800 my-8">
        <h2 className="text-xl font-bold text-white mb-4">Nieuw Evenement</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Titel
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="Bijv. Team Meeting"
              className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Beschrijving (optioneel)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Categorie (optioneel)
            </label>
            <select
              value={formData.category_id || ''}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
            >
              <option value="">Geen categorie</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
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
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
              className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Start Tijd (optioneel)
              </label>
              <input
                type="time"
                value={formData.time_start}
                onChange={(e) => setFormData({ ...formData, time_start: e.target.value })}
                className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Eind Tijd (optioneel)
              </label>
              <input
                type="time"
                value={formData.time_end}
                onChange={(e) => setFormData({ ...formData, time_end: e.target.value })}
                className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Zichtbaarheid
            </label>
            <select
              value={formData.visibility}
              onChange={(e) => setFormData({ ...formData, visibility: e.target.value as 'all' | 'specific' })}
              className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
            >
              <option value="all">Alle medewerkers</option>
              <option value="specific">Specifieke medewerkers</option>
            </select>
          </div>

          {formData.visibility === 'specific' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Selecteer Medewerkers
              </label>
              <div className="max-h-40 overflow-y-auto bg-ofa-bg-dark border border-neutral-700 rounded-lg p-3">
                {users.filter(u => u.role === 'employee' && u.is_active).map((user) => (
                  <label key={user.id} className="flex items-center gap-2 py-1 hover:bg-neutral-800 px-2 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.assigned_user_ids?.includes(user.id)}
                      onChange={(e) => {
                        const ids = formData.assigned_user_ids || [];
                        if (e.target.checked) {
                          setFormData({ ...formData, assigned_user_ids: [...ids, user.id] });
                        } else {
                          setFormData({ ...formData, assigned_user_ids: ids.filter(id => id !== user.id) });
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-white text-sm">{user.username}</span>
                  </label>
                ))}
              </div>
            </div>
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
              {createMutation.isPending ? 'Aanmaken...' : 'Aanmaken'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Event Modal (similar to Create but with PATCH)
function EditEventModal({
  event,
  categories,
  users,
  onClose,
}: {
  event: CalendarEvent;
  categories: EventCategory[];
  users: User[];
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    title: event.title,
    description: event.description || '',
    category_id: event.category_id || null,
    date: event.date,
    time_start: event.time_start || '',
    time_end: event.time_end || '',
    visibility: event.visibility as 'all' | 'specific',
    assigned_user_ids: [] as number[],
  });
  const queryClient = useQueryClient();

  // Fetch event details to get assigned users
  const { data: eventDetails } = useQuery({
    queryKey: ['event-details', event.id],
    queryFn: async () => {
      const response = await api.get(`/api/calendar/events/${event.id}`);
      return response.data;
    },
  });

  // Update formData when eventDetails is loaded
  useEffect(() => {
    if (eventDetails?.assigned_users) {
      setFormData(prev => ({
        ...prev,
        assigned_user_ids: eventDetails.assigned_users || []
      }));
    }
  }, [eventDetails]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      await api.patch(`/api/calendar/events/${event.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar', 'events'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData: any = { ...formData };
    if (!submitData.description) submitData.description = null;
    if (!submitData.time_start) submitData.time_start = null;
    if (!submitData.time_end) submitData.time_end = null;
    updateMutation.mutate(submitData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-ofa-bg rounded-lg max-w-md w-full p-6 border border-neutral-800 my-8">
        <h2 className="text-xl font-bold text-white mb-4">Evenement Bewerken</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Titel</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Beschrijving</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Categorie</label>
            <select
              value={formData.category_id || ''}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value ? Number(e.target.value) : null })}
              className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
            >
              <option value="">Geen categorie</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Datum</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
              className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Zichtbaarheid
            </label>
            <select
              value={formData.visibility}
              onChange={(e) => setFormData({ ...formData, visibility: e.target.value as 'all' | 'specific' })}
              className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
            >
              <option value="all">Alle medewerkers</option>
              <option value="specific">Specifieke medewerkers</option>
            </select>
          </div>

          {formData.visibility === 'specific' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Selecteer Medewerkers
              </label>
              <div className="max-h-40 overflow-y-auto bg-ofa-bg-dark border border-neutral-700 rounded-lg p-3">
                {users.filter(u => u.role === 'employee' && u.is_active).map((user) => (
                  <label key={user.id} className="flex items-center gap-2 py-1 hover:bg-neutral-800 px-2 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.assigned_user_ids?.includes(user.id)}
                      onChange={(e) => {
                        const ids = formData.assigned_user_ids || [];
                        if (e.target.checked) {
                          setFormData({ ...formData, assigned_user_ids: [...ids, user.id] });
                        } else {
                          setFormData({ ...formData, assigned_user_ids: ids.filter(id => id !== user.id) });
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-white text-sm">{user.username}</span>
                  </label>
                ))}
              </div>
            </div>
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

// Create Category Modal
function CreateCategoryModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState<CreateCategoryRequest>({
    name: '',
    color: '#3b82f6',
  });
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: CreateCategoryRequest) => {
      await api.post('/api/calendar/categories', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar', 'categories'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-ofa-bg rounded-lg max-w-md w-full p-6 border border-neutral-800">
        <h2 className="text-xl font-bold text-white mb-4">Nieuwe Categorie</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Naam
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Bijv. Team Meeting"
              className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Kleur
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-20 h-10 rounded border border-neutral-700 cursor-pointer"
              />
              <input
                type="text"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                placeholder="#3b82f6"
                className="flex-1 px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red font-mono"
              />
            </div>
          </div>

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
              {createMutation.isPending ? 'Aanmaken...' : 'Aanmaken'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Helper function
function formatDateNL(dateStr: string): string {
  const date = new Date(dateStr);
  const months = [
    'januari', 'februari', 'maart', 'april', 'mei', 'juni',
    'juli', 'augustus', 'september', 'oktober', 'november', 'december'
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}