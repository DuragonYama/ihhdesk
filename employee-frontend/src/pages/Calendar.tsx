import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Palmtree, FileText, Calendar as CalendarIcon, Clock, Sparkles, Activity } from 'lucide-react';
import { api } from '../utils/api';
import type { Absence } from '../types/api';

// Helper function to get icon for events
const getEventIcon = (event: any, size: string = 'w-5 h-5') => {
  if (event.type === 'absence') {
    if (event.subtype === 'sick') return <Activity className={`${size} text-red-400`} />;
    if (event.subtype === 'vacation') return <Palmtree className={`${size} text-green-400`} />;
    return <FileText className={`${size} text-purple-400`} />;
  }
  if (event.type === 'company_event') {
    if (event.status === 'pending') return <Clock className={`${size} text-yellow-400`} />;
    return <CalendarIcon className={`${size} text-blue-400`} />;
  }
  if (event.type === 'company_holiday') {
    return <Sparkles className={`${size} text-amber-400`} />;
  }
  return <CalendarIcon className={`${size} text-gray-400`} />;
};

export default function Calendar() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Get current month range
  const getMonthRange = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    
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

  // Fetch personal absences (all types including sick days)
  const { data: myAbsences = [] } = useQuery({
    queryKey: ['absences', 'mine', monthRange.start, monthRange.end],
    queryFn: async () => {
      const response = await api.get<Absence[]>('/api/absences/my-absences');
      const allAbsences = response.data;

      return allAbsences.filter((absence: Absence) => {
        if (absence.status !== 'approved') return false;

        const absenceStart = new Date(absence.start_date);
        const absenceEnd = absence.end_date ? new Date(absence.end_date) : absenceStart;
        const monthStart = new Date(monthRange.start);
        const monthEnd = new Date(monthRange.end);

        return absenceStart <= monthEnd && absenceEnd >= monthStart;
      });
    },
  });

  // Fetch company events
  const { data: companyEvents = [] } = useQuery({
    queryKey: ['calendar', 'events'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/calendar/events');
        return response.data;
      } catch (error) {
        console.error('Failed to fetch company events:', error);
        return [];
      }
    },
  });

  // Fetch company holidays
  const { data: companyHolidays = [] } = useQuery({
    queryKey: ['calendar', 'holidays'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/calendar/holidays');
        return response.data;
      } catch (error) {
        console.error('Failed to fetch company holidays:', error);
        return [];
      }
    },
  });

  // Combine all events into one array
  const allEvents = [
    // Personal absences (including sick days)
    ...myAbsences.map((absence: Absence) => ({
      id: `absence-${absence.id}`,
      type: 'absence',
      subtype: absence.type,
      title: absence.type === 'vacation' ? 'Vakantie' : absence.type === 'sick' ? 'Ziek' : 'Persoonlijk Verlof',
      start_date: absence.start_date,
      end_date: absence.end_date,
      description: absence.reason,
      category_color: absence.type === 'sick' ? '#ef4444' : absence.type === 'vacation' ? '#3b82f6' : '#a855f7',
      category_name: absence.type === 'vacation' ? 'Vakantie' : absence.type === 'sick' ? 'Ziek' : 'Persoonlijk'
    })),
    // Company events (now with category info from backend)
    ...companyEvents.map((event: any) => ({
      id: `event-${event.id}`,
      type: 'company_event',
      subtype: event.category_name || 'event',
      title: event.title,
      start_date: event.date,
      end_date: event.date,
      description: event.description,
      time_start: event.time_start,
      time_end: event.time_end,
      emoji: event.status === 'pending' ? '⏳' : '📅',
      category_id: event.category_id,
      category_name: event.category_name,
      category_color: event.category_color,
      status: event.status
    })),
    // Company holidays
    ...companyHolidays.map((holiday: any) => ({
      id: `holiday-${holiday.id}`,
      type: 'company_holiday',
      subtype: 'holiday',
      title: holiday.name,
      start_date: holiday.date,
      end_date: holiday.date,
      description: '',
      emoji: '🎉',
      category_color: '#10b981', // Green for holidays
      category_name: 'Feestdag'
    }))
  ];

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const days: (Date | null)[] = [];
    
    // Week starts on Monday
    const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    for (let i = 0; i < adjustedFirstDay; i++) {
      days.push(null);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();

  // Get ALL events for a day (not just first one)
  const getDayEvents = (date: Date) => {
    if (!date) return [];

    // Format in LOCAL timezone, not UTC (avoid day shift bug)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    return allEvents.filter((event) => {
      const start = new Date(event.start_date);
      const end = event.end_date ? new Date(event.end_date) : start;
      const checkDate = new Date(dateStr);

      return checkDate >= start && checkDate <= end;
    });
  };

  // Helper to convert hex color to rgba with opacity
  const hexToRgba = (hex: string, opacity: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  // Navigation
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDay(null);
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDay(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(null);
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header - Fixed */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-white">Kalender</h1>
          <button
            onClick={() => navigate('/suggest-event')}
            className="px-4 py-2 bg-ofa-red hover:bg-red-700 text-white rounded-lg text-sm font-medium transition"
          >
            + Evenement Voorstellen
          </button>
        </div>
        
        <div className="flex items-center justify-between gap-3 mb-4">
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
            <button
              onClick={goToToday}
              className="text-sm text-ofa-red hover:text-ofa-red-hover mt-1"
            >
              Vandaag
            </button>
          </div>
          
          <button
            onClick={goToNextMonth}
            className="px-4 py-2 bg-ofa-bg border border-neutral-700 hover:border-neutral-600 text-white rounded-lg transition"
          >
            Volgende →
          </button>
        </div>
      </div>

      {/* Calendar - Takes remaining space */}
      <div className="flex-1 px-4 pb-4 overflow-auto">
        <div className="bg-ofa-bg border border-neutral-800 rounded-lg p-3 h-full flex flex-col">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map((day) => (
              <div key={day} className="text-center text-sm font-semibold text-gray-400 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days - Flex grow */}
          <div className="grid grid-cols-7 gap-2 flex-1 content-start">
            {calendarDays.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="min-h-[60px]" />;
              }

              const events = getDayEvents(day);
              const hasEvents = events.length > 0;
              const today = isToday(day);
              const isSelected = selectedDay?.toDateString() === day.toDateString();

              const firstEventColor = hasEvents && events[0].category_color ? events[0].category_color : null;

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(day)}
                  className={`
                    min-h-[60px] rounded-lg flex flex-col items-center justify-start p-2 transition relative
                    ${today ? 'bg-ofa-red text-white font-bold ring-2 ring-ofa-red-hover' : 'text-gray-300'}
                    ${isSelected && !today ? 'ring-2 ring-ofa-red' : ''}
                    ${hasEvents ? 'border-2' : 'hover:bg-neutral-800 border border-neutral-700'}
                  `}
                  style={firstEventColor ? {
                    borderColor: firstEventColor,
                    backgroundColor: hexToRgba(firstEventColor, 0.25)
                  } : {}}
                >
                  <span className="text-base mb-1">{day.getDate()}</span>
                  {hasEvents && (
                    <div className="flex gap-1 flex-wrap justify-center">
                      {events.slice(0, 3).map((event, idx) => (
                        <span key={idx}>{getEventIcon(event, 'w-4 h-4')}</span>
                      ))}
                      {events.length > 3 && <span className="text-xs text-gray-300">+{events.length - 3}</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected day details - Modal overlay */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="bg-ofa-bg w-full rounded-t-2xl border-t border-neutral-800 p-6 max-h-[70vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                {selectedDay.toLocaleDateString('nl-NL', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long'
                })}
              </h2>
              <button
                onClick={() => setSelectedDay(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-800 text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {(() => {
              const events = getDayEvents(selectedDay);

              if (events.length === 0) {
                return (
                  <p className="text-gray-400 text-center py-8">
                    Geen evenementen op deze dag
                  </p>
                );
              }

              return (
                <div className="space-y-3">
                  {events.map((event, index) => {
                    const isPersonalEvent = event.type === 'absence';
                    const categoryColor = event.category_color || '#6b7280';

                    return (
                      <div
                        key={index}
                        className="flex items-start gap-4 p-4 rounded-lg border-2"
                        style={{
                          borderColor: categoryColor,
                          backgroundColor: hexToRgba(categoryColor, 0.15)
                        }}
                      >
                        <div className="mt-1">{getEventIcon(event, 'w-8 h-8')}</div>
                        <div className="flex-1">
                          {/* Category badge */}
                          {event.category_name && (
                            <div className="flex items-center gap-2 mb-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: categoryColor }}
                              />
                              <span className="text-xs text-gray-400 uppercase tracking-wide">
                                {event.category_name}
                              </span>
                              {event.status === 'pending' && (
                                <span className="text-xs bg-yellow-600/20 text-yellow-400 px-2 py-0.5 rounded">
                                  Wachtend
                                </span>
                              )}
                            </div>
                          )}

                          <p className="text-lg font-semibold text-white mb-1">
                            {event.title}
                          </p>
                          <p className="text-sm text-gray-400 mb-2">
                            {new Date(event.start_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })}
                            {event.end_date && event.end_date !== event.start_date && (
                              <> - {new Date(event.end_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })}</>
                            )}
                            {event.time_start && (
                              <> • {event.time_start.substring(0, 5)}</>
                            )}
                            {event.time_end && (
                              <> - {event.time_end.substring(0, 5)}</>
                            )}
                          </p>
                          {event.description && (
                            <p className="text-sm text-gray-300 mt-2">
                              <span className="text-gray-400">
                                {isPersonalEvent ? 'Reden: ' : 'Beschrijving: '}
                              </span>
                              {event.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
