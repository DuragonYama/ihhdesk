import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Activity, Palmtree, FileText, Car } from 'lucide-react';
import { api } from '../utils/api';
import { ApprovalModal } from '../components/ApprovalModal';
import { EditClockEventModal } from '../components/EditClockEventModal';
import { EditAbsenceModal } from '../components/EditAbsenceModal';
import { EditCalendarEventModal } from '../components/EditCalendarEventModal';

export default function Approvals() {

  // Fetch pending absences
  const { data: pendingAbsences = [] } = useQuery({
    queryKey: ['absences', 'pending'],
    queryFn: async () => {
      const response = await api.get('/api/absences/pending');
      return response.data;
    },
  });

  // Fetch pending clock events
  const { data: pendingClockEvents = [] } = useQuery({
    queryKey: ['clock', 'pending'],
    queryFn: async () => {
      const response = await api.get('/api/clock/pending');
      return response.data;
    },
  });

  // Fetch pending calendar events
  const { data: pendingEvents = [] } = useQuery({
    queryKey: ['events', 'pending'],
    queryFn: async () => {
      const response = await api.get('/api/calendar/events/pending');
      return response.data;
    },
  });

  const totalPending = pendingAbsences.length + pendingClockEvents.length + pendingEvents.length;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Goedkeuringen</h1>
        <p className="text-gray-400 mt-1">{totalPending} wachtende aanvragen</p>
      </div>

      {totalPending === 0 ? (
        <div className="bg-ofa-bg border border-neutral-800 rounded-lg p-8 text-center">
          <p className="text-gray-400">Geen openstaande aanvragen</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Clock Events Section */}
          {pendingClockEvents.length > 0 && (
            <ApprovalSection
              title="Klokregistraties"
              count={pendingClockEvents.length}
              items={pendingClockEvents}
              type="clock"
            />
          )}

          {/* Absences Section */}
          {pendingAbsences.length > 0 && (
            <ApprovalSection
              title="Afwezigheden"
              count={pendingAbsences.length}
              items={pendingAbsences}
              type="absence"
            />
          )}

          {/* Calendar Events Section */}
          {pendingEvents.length > 0 && (
            <ApprovalSection
              title="Evenementen"
              count={pendingEvents.length}
              items={pendingEvents}
              type="event"
            />
          )}
        </div>
      )}
    </div>
  );
}

function ApprovalSection({ title, count, items, type }: {
  title: string;
  count: number;
  items: any[];
  type: 'clock' | 'absence' | 'event';
}) {
  return (
    <div className="bg-ofa-bg border border-neutral-800 rounded-lg overflow-hidden">
      {/* Section Header */}
      <div className="px-4 md:px-6 py-4 border-b border-neutral-800 bg-ofa-bg-dark">
        <h2 className="text-lg md:text-xl font-semibold text-white">
          {title} ({count})
        </h2>
      </div>

      {/* Items */}
      <div className="divide-y divide-neutral-800">
        {items.map((item) => (
          type === 'clock' ? (
            <ClockEventCard key={item.id} event={item} />
          ) : type === 'absence' ? (
            <AbsenceCard key={item.id} absence={item} />
          ) : (
            <EventCard key={item.id} event={item} />
          )
        ))}
      </div>
    </div>
  );
}

function ClockEventCard({ event }: { event: any }) {
  const queryClient = useQueryClient();
  
  // Modal states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (notes?: string) => {
      const payload = notes ? { admin_notes: notes } : {};
      await api.patch(`/api/clock/${event.id}/approve`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clock'] });
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      setShowApproveModal(false);
    },
  });
  
  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async (notes?: string) => {
      await api.delete(`/api/clock/${event.id}`, { data: notes ? { admin_notes: notes } : {} });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clock'] });
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      setShowRejectModal(false);
    },
  });
  
  // Edit mutation
  const editMutation = useMutation({
    mutationFn: async (updates: any) => {
      await api.patch(`/api/clock/${event.id}/edit`, {
        clock_in: updates.clock_in + ':00',
        clock_out: updates.clock_out + ':00',
        came_by_car: updates.came_by_car,
        parking_cost: updates.parking_cost ? parseFloat(updates.parking_cost) : null,
        km_driven: updates.km_driven ? parseFloat(updates.km_driven) : null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clock'] });
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      setShowEditModal(false);
    },
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('nl-NL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const calculateHours = (clockIn: string, clockOut: string) => {
    const start = new Date(`2000-01-01T${clockIn}`);
    const end = new Date(`2000-01-01T${clockOut}`);
    const diff = end.getTime() - start.getTime();
    const hours = diff / 1000 / 60 / 60;
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}u ${m}m`;
  };

  return (
    <>
      <div className="p-4 md:p-6 hover:bg-ofa-bg-dark/50 transition">
        <div className="flex flex-col gap-4">
          {/* User info and details */}
          <div className="flex-1 space-y-3">
            {/* User */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-ofa-red flex items-center justify-center text-white font-bold">
                {event.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-white">{event.username}</p>
                <p className="text-sm text-gray-400">{formatDate(event.date)}</p>
              </div>
            </div>

            {/* Time details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-gray-400">Starttijd</p>
                <p className="text-white font-medium">{event.clock_in?.substring(0, 5)}</p>
              </div>
              <div>
                <p className="text-gray-400">Eindtijd</p>
                <p className="text-white font-medium">{event.clock_out?.substring(0, 5)}</p>
              </div>
              <div>
                <p className="text-gray-400">Uren</p>
                <p className="text-white font-medium">
                  {calculateHours(event.clock_in, event.clock_out)}
                </p>
              </div>
              {event.came_by_car && (
                <div>
                  <p className="text-gray-400">Auto</p>
                  <p className="text-white font-medium flex items-center gap-1">
                    <Car className="w-4 h-4" /> Ja
                  </p>
                </div>
              )}
            </div>

            {/* Reason */}
            {event.requested_reason && (
              <div className="bg-neutral-800 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Reden:</p>
                <p className="text-sm text-white">{event.requested_reason}</p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col md:flex-row gap-2">
            <button
              onClick={() => setShowApproveModal(true)}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition text-sm font-medium"
            >
              Goedkeuren
            </button>
            <button
              onClick={() => setShowEditModal(true)}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-medium"
            >
              Bewerken
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm font-medium"
            >
              Afwijzen
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showApproveModal && (
        <ApprovalModal
          title="Uurregistratie Goedkeuren"
          message={`Uurregistratie van ${event.username} voor ${formatDate(event.date)} goedkeuren?`}
          actionType="approve"
          onConfirm={(notes) => approveMutation.mutate(notes)}
          onCancel={() => setShowApproveModal(false)}
          isLoading={approveMutation.isPending}
        />
      )}
      
      {showRejectModal && (
        <ApprovalModal
          title="Uurregistratie Afwijzen"
          message={`Uurregistratie van ${event.username} voor ${formatDate(event.date)} afwijzen?`}
          actionType="reject"
          onConfirm={(notes) => rejectMutation.mutate(notes)}
          onCancel={() => setShowRejectModal(false)}
          isLoading={rejectMutation.isPending}
        />
      )}
      
      {showEditModal && (
        <EditClockEventModal
          event={event}
          onSave={(updates) => editMutation.mutate(updates)}
          onCancel={() => setShowEditModal(false)}
          isLoading={editMutation.isPending}
        />
      )}
    </>
  );
}


function AbsenceCard({ absence }: { absence: any }) {
  const queryClient = useQueryClient();
  
  // Modal states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (notes?: string) => {
      const payload = notes ? { admin_notes: notes } : {};
      await api.patch(`/api/absences/${absence.id}/approve`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      queryClient.invalidateQueries({ queryKey: ['clock'] });
      setShowApproveModal(false);
    },
  });
  
  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async (notes?: string) => {
      const payload = notes ? { admin_notes: notes } : {};
      await api.patch(`/api/absences/${absence.id}/reject`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      queryClient.invalidateQueries({ queryKey: ['clock'] });
      setShowRejectModal(false);
    },
  });
  
  // Edit mutation
  const editMutation = useMutation({
    mutationFn: async (updates: any) => {
      await api.patch(`/api/absences/${absence.id}/edit`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      queryClient.invalidateQueries({ queryKey: ['clock'] });
      setShowEditModal(false);
    },
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sick': return <Activity className="w-5 h-5 text-blue-400" />;
      case 'vacation': return <Palmtree className="w-5 h-5 text-green-400" />;
      case 'personal': return <FileText className="w-5 h-5 text-purple-400" />;
      default: return <FileText className="w-5 h-5 text-purple-400" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'sick': return 'Ziek';
      case 'vacation': return 'Vakantie';
      case 'personal': return 'Persoonlijk';
      default: return type;
    }
  };

  return (
    <>
      <div className="p-4 md:p-6 hover:bg-ofa-bg-dark/50 transition">
        <div className="flex flex-col gap-4">
          {/* User info and details */}
          <div className="flex-1 space-y-3">
            {/* User */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-ofa-red flex items-center justify-center text-white font-bold">
                {absence.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-white">{absence.username}</p>
                <p className="text-sm text-gray-400 flex items-center gap-2">
                  {getTypeIcon(absence.type)} {getTypeLabel(absence.type)}
                </p>
              </div>
            </div>

            {/* Date details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-gray-400">Startdatum</p>
                <p className="text-white font-medium">{formatDate(absence.start_date)}</p>
              </div>
              {absence.end_date && absence.end_date !== absence.start_date && (
                <div>
                  <p className="text-gray-400">Einddatum</p>
                  <p className="text-white font-medium">{formatDate(absence.end_date)}</p>
                </div>
              )}
            </div>

            {/* Reason */}
            {absence.reason && (
              <div className="bg-neutral-800 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Reden:</p>
                <p className="text-sm text-white">{absence.reason}</p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col md:flex-row gap-2">
            <button
              onClick={() => setShowApproveModal(true)}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition text-sm font-medium"
            >
              Goedkeuren
            </button>
            <button
              onClick={() => setShowEditModal(true)}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-medium"
            >
              Bewerken
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm font-medium"
            >
              Afwijzen
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showApproveModal && (
        <ApprovalModal
          title="Verlof Goedkeuren"
          message={`Verlofaanvraag van ${absence.username} goedkeuren?`}
          actionType="approve"
          onConfirm={(notes) => approveMutation.mutate(notes)}
          onCancel={() => setShowApproveModal(false)}
          isLoading={approveMutation.isPending}
        />
      )}
      
      {showRejectModal && (
        <ApprovalModal
          title="Verlof Afwijzen"
          message={`Verlofaanvraag van ${absence.username} afwijzen?`}
          actionType="reject"
          onConfirm={(notes) => rejectMutation.mutate(notes)}
          onCancel={() => setShowRejectModal(false)}
          isLoading={rejectMutation.isPending}
        />
      )}
      
      {showEditModal && (
        <EditAbsenceModal
          absence={absence}
          onSave={(updates) => editMutation.mutate(updates)}
          onCancel={() => setShowEditModal(false)}
          isLoading={editMutation.isPending}
        />
      )}
    </>
  );
}


function EventCard({ event }: { event: any }) {
  const queryClient = useQueryClient();

  // Modal states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (notes?: string) => {
      const payload = notes ? { admin_notes: notes } : {};
      await api.patch(`/api/calendar/events/${event.id}/approve`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      queryClient.invalidateQueries({ queryKey: ['clock'] });
      setShowApproveModal(false);
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async (notes?: string) => {
      const payload = notes ? { admin_notes: notes } : {};
      await api.patch(`/api/calendar/events/${event.id}/reject`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      queryClient.invalidateQueries({ queryKey: ['clock'] });
      setShowRejectModal(false);
    },
  });

  // Edit mutation
  const editMutation = useMutation({
    mutationFn: async (updates: any) => {
      await api.patch(`/api/calendar/events/${event.id}/edit`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      queryClient.invalidateQueries({ queryKey: ['clock'] });
      setShowEditModal(false);
    },
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('nl-NL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (time: string | null) => {
    if (!time) return null;
    return time.substring(0, 5);
  };

  return (
    <>
      <div className="p-4 md:p-6 hover:bg-ofa-bg-dark/50 transition">
        <div className="flex flex-col gap-4">
          {/* User info and details */}
          <div className="flex-1 space-y-3">
            {/* User */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-ofa-red flex items-center justify-center text-white font-bold">
                {event.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-white">{event.username}</p>
                <p className="text-sm text-gray-400">🗓️ Evenement</p>
              </div>
            </div>

            {/* Event details */}
            <div className="bg-neutral-800 rounded-lg p-4 space-y-2">
              <div>
                <p className="text-xs text-gray-400">Titel:</p>
                <p className="text-white font-medium">{event.title}</p>
              </div>

              {event.description && (
                <div>
                  <p className="text-xs text-gray-400">Beschrijving:</p>
                  <p className="text-sm text-white">{event.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <p className="text-xs text-gray-400">Datum</p>
                  <p className="text-sm text-white font-medium">{formatDate(event.date)}</p>
                </div>
                {event.time_start && (
                  <div>
                    <p className="text-xs text-gray-400">Tijd</p>
                    <p className="text-sm text-white font-medium">
                      {formatTime(event.time_start)}
                      {event.time_end && ` - ${formatTime(event.time_end)}`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col md:flex-row gap-2">
            <button
              onClick={() => setShowApproveModal(true)}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition text-sm font-medium"
            >
              Goedkeuren
            </button>
            <button
              onClick={() => setShowEditModal(true)}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-medium"
            >
              Bewerken
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm font-medium"
            >
              Afwijzen
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showApproveModal && (
        <ApprovalModal
          title="Evenement Goedkeuren"
          message={`Evenement "${event.title}" van ${event.username} goedkeuren?`}
          actionType="approve"
          onConfirm={(notes) => approveMutation.mutate(notes)}
          onCancel={() => setShowApproveModal(false)}
          isLoading={approveMutation.isPending}
        />
      )}

      {showRejectModal && (
        <ApprovalModal
          title="Evenement Afwijzen"
          message={`Evenement "${event.title}" van ${event.username} afwijzen?`}
          actionType="reject"
          onConfirm={(notes) => rejectMutation.mutate(notes)}
          onCancel={() => setShowRejectModal(false)}
          isLoading={rejectMutation.isPending}
        />
      )}

      {showEditModal && (
        <EditCalendarEventModal
          event={event}
          onSave={(updates) => editMutation.mutate(updates)}
          onCancel={() => setShowEditModal(false)}
          isLoading={editMutation.isPending}
        />
      )}
    </>
  );
}
