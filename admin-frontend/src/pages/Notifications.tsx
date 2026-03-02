import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell, Send, Clock, CheckCircle, AlertCircle,
  FlaskConical, Info, Plus, Pencil, Trash2, X,
} from 'lucide-react';
import { api } from '../utils/api';
import type {
  User,
  BatchPushRequest,
  BatchPushResponse,
  ScheduledNotification,
  ScheduledNotificationCreate,
} from '../types/api';

type Tab = 'send' | 'scheduled';

// JS-style days: 0=Sun, 1=Mon, …, 6=Sat
const DAY_LABELS: Record<number, string> = {
  0: 'Zo', 1: 'Ma', 2: 'Di', 3: 'Wo', 4: 'Do', 5: 'Vr', 6: 'Za',
};
// Display order: Mon → Sun
const ALL_DAYS = [1, 2, 3, 4, 5, 6, 0];

export default function Notifications() {
  const [activeTab, setActiveTab] = useState<Tab>('send');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Meldingen</h1>
        <p className="text-gray-400 mt-1">
          Verstuur push-notificaties naar medewerkers of beheer geplande herinneringen
        </p>
      </div>

      <div className="flex gap-1 bg-ofa-bg border border-neutral-800 rounded-lg p-1 w-full sm:w-fit">
        <button
          onClick={() => setActiveTab('send')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition flex-1 sm:flex-none justify-center ${
            activeTab === 'send'
              ? 'bg-ofa-red text-white'
              : 'text-gray-400 hover:text-white hover:bg-neutral-800'
          }`}
        >
          <Send className="w-4 h-4" />
          Verstuur Bericht
        </button>
        <button
          onClick={() => setActiveTab('scheduled')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition flex-1 sm:flex-none justify-center ${
            activeTab === 'scheduled'
              ? 'bg-ofa-red text-white'
              : 'text-gray-400 hover:text-white hover:bg-neutral-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          Geplande Herinneringen
        </button>
      </div>

      {activeTab === 'send' ? <BatchSendTab /> : <ScheduledRemindersTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 1: Batch push notification
// ---------------------------------------------------------------------------

function BatchSendTab() {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<BatchPushResponse | null>(null);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get<User[]>('/api/users');
      return res.data;
    },
  });

  const activeEmployees = useMemo(
    () => users.filter((u) => u.role === 'employee' && u.is_active),
    [users]
  );

  const allSelected =
    activeEmployees.length > 0 && selectedIds.length === activeEmployees.length;

  const handleToggleAll = (checked: boolean) =>
    setSelectedIds(checked ? activeEmployees.map((e) => e.id) : []);

  const handleToggle = (id: number, checked: boolean) =>
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));

  const sendMutation = useMutation({
    mutationFn: async (data: BatchPushRequest) => {
      const res = await api.post<BatchPushResponse>('/api/notifications/send', data);
      return res.data;
    },
    onSuccess: (data) => {
      setResult(data);
      if (data.success && data.failed_endpoints.length === 0) {
        setSelectedIds([]);
        setTitle('');
        setMessage('');
      }
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail;
      setResult(null);
      alert(detail || 'Fout bij verzenden notificaties');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    sendMutation.mutate({ employee_ids: selectedIds, title, message });
  };

  const canSubmit = selectedIds.length > 0 && title.trim() && message.trim() && !sendMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 bg-blue-900/20 border border-blue-800 rounded-lg px-4 py-3 text-blue-300 text-sm">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>Medewerkers ontvangen alleen push-notificaties als ze dit hebben geaccepteerd in de medewerkers-app.</p>
      </div>

      <div className="bg-ofa-bg rounded-lg border border-neutral-800 p-4 md:p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {result && (
            <PushResultBanner result={result} onDismiss={() => setResult(null)} />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Medewerkers</label>

            <label className="flex items-center gap-3 py-2.5 px-3 bg-ofa-bg-dark border border-neutral-700 rounded-lg mb-2 hover:bg-neutral-800 cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => handleToggleAll(e.target.checked)}
                className="w-4 h-4 flex-shrink-0"
              />
              <span className="text-white font-medium text-sm">Alle medewerkers</span>
              <span className="ml-auto text-xs text-gray-500">{activeEmployees.length}</span>
            </label>

            <div className="max-h-52 overflow-y-auto bg-ofa-bg-dark border border-neutral-700 rounded-lg divide-y divide-neutral-800">
              {activeEmployees.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">Geen actieve medewerkers gevonden</p>
              ) : (
                activeEmployees.map((emp) => (
                  <label
                    key={emp.id}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-800 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(emp.id)}
                      onChange={(e) => handleToggle(emp.id, e.target.checked)}
                      className="w-4 h-4 flex-shrink-0"
                    />
                    <span className="text-white text-sm">{emp.username}</span>
                    <span className="text-gray-500 text-xs truncate ml-auto">{emp.email}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="bg-ofa-bg-dark border border-neutral-700 rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-gray-300 text-sm font-medium">Geselecteerde ontvangers</span>
            <span className="text-xl font-bold text-ofa-red">{selectedIds.length}</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Titel <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Voer titel in"
              className="w-full px-4 py-2.5 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-ofa-red"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Bericht <span className="text-red-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={5}
              placeholder="Voer bericht in"
              className="w-full px-4 py-2.5 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-ofa-red resize-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex items-center gap-2 px-6 py-3 bg-ofa-red hover:bg-ofa-red-hover disabled:bg-neutral-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition w-full sm:w-auto justify-center"
            >
              <Bell className="w-4 h-4" />
              {sendMutation.isPending ? 'Verzenden...' : 'Push Versturen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 2: Scheduled reminders (list + create/edit modal)
// ---------------------------------------------------------------------------

const DEFAULT_FORM: ScheduledNotificationCreate = {
  title: '',
  message: '',
  send_time: '07:30',
  days_of_week: [1, 2, 3, 4, 5],
  is_active: true,
  target_type: 'all_scheduled',
  target_employee_ids: null,
};

function ScheduledRemindersTab() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduledNotification | null>(null);
  const [testResults, setTestResults] = useState<Record<number, BatchPushResponse>>({});
  const [testingId, setTestingId] = useState<number | null>(null);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['scheduled-notifications'],
    queryFn: async () => {
      const res = await api.get<ScheduledNotification[]>('/api/notifications/scheduled');
      return res.data;
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get<User[]>('/api/users');
      return res.data;
    },
  });

  const activeEmployees = useMemo(
    () => users.filter((u) => u.role === 'employee' && u.is_active),
    [users]
  );

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/notifications/scheduled/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-notifications'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Fout bij verwijderen');
    },
  });

  const testMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.post<BatchPushResponse>(`/api/notifications/scheduled/${id}/test`);
      return { id, result: res.data };
    },
    onSuccess: ({ id, result }) => {
      setTestResults((prev) => ({ ...prev, [id]: result }));
      setTestingId(null);
    },
    onError: (err: any) => {
      setTestingId(null);
      alert(err.response?.data?.detail || 'Fout bij testverzending');
    },
  });

  const handleEdit = (notif: ScheduledNotification) => {
    setEditing(notif);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleClose = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleTest = (id: number) => {
    setTestResults((prev) => { const r = { ...prev }; delete r[id]; return r; });
    setTestingId(id);
    testMutation.mutate(id);
  };

  const handleDelete = (notif: ScheduledNotification) => {
    if (confirm(`Herinnering "${notif.title}" verwijderen?`)) {
      deleteMutation.mutate(notif.id);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-ofa-bg rounded-lg border border-neutral-800 p-6 flex items-center justify-center">
        <p className="text-gray-400">Laden...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 bg-blue-900/20 border border-blue-800 rounded-lg px-4 py-3 text-blue-300 text-sm">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>
          Geplande herinneringen worden automatisch verstuurd naar medewerkers die push-notificaties hebben geaccepteerd.
        </p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-ofa-red hover:bg-ofa-red-hover text-white font-medium rounded-lg transition text-sm"
        >
          <Plus className="w-4 h-4" />
          Nieuwe Herinnering
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="bg-ofa-bg rounded-lg border border-neutral-800 p-8 text-center">
          <Clock className="w-8 h-8 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Geen geplande herinneringen</p>
          <p className="text-gray-600 text-sm mt-1">Maak een nieuwe herinnering aan om te beginnen.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <ScheduledNotificationCard
              key={notif.id}
              notif={notif}
              testResult={testResults[notif.id] ?? null}
              isTestLoading={testingId === notif.id}
              onEdit={() => handleEdit(notif)}
              onDelete={() => handleDelete(notif)}
              onTest={() => handleTest(notif.id)}
              onDismissResult={() =>
                setTestResults((prev) => { const r = { ...prev }; delete r[notif.id]; return r; })
              }
            />
          ))}
        </div>
      )}

      {modalOpen && (
        <NotificationModal
          editing={editing}
          employees={activeEmployees}
          onClose={handleClose}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['scheduled-notifications'] });
            handleClose();
          }}
        />
      )}
    </div>
  );
}

function ScheduledNotificationCard({
  notif,
  testResult,
  isTestLoading,
  onEdit,
  onDelete,
  onTest,
  onDismissResult,
}: {
  notif: ScheduledNotification;
  testResult: BatchPushResponse | null;
  isTestLoading: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onTest: () => void;
  onDismissResult: () => void;
}) {
  const sortOrder = [1, 2, 3, 4, 5, 6, 0];
  const dayStr = [...notif.days_of_week]
    .sort((a, b) => sortOrder.indexOf(a) - sortOrder.indexOf(b))
    .map((d) => DAY_LABELS[d])
    .join(', ');

  const targetStr =
    notif.target_type === 'specific_users'
      ? `Specifieke medewerkers (${notif.target_employee_ids?.length ?? 0})`
      : 'Alle ingeplande medewerkers';

  return (
    <div
      className={`bg-ofa-bg rounded-lg border p-4 ${
        notif.is_active ? 'border-neutral-700' : 'border-neutral-800 opacity-60'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                notif.is_active ? 'bg-green-500' : 'bg-gray-600'
              }`}
            />
            <h3 className="text-white font-medium truncate">{notif.title}</h3>
          </div>
          <p className="text-gray-400 text-sm line-clamp-2 mb-2">{notif.message}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            <span>
              <Clock className="w-3 h-3 inline mr-1" />
              {notif.send_time}
            </span>
            <span>{dayStr || 'Geen dagen'}</span>
            <span>{targetStr}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onTest}
            disabled={isTestLoading}
            title="Test versturen"
            className="p-2 text-gray-400 hover:text-white hover:bg-neutral-700 rounded-md transition disabled:opacity-50"
          >
            <FlaskConical className="w-4 h-4" />
          </button>
          <button
            onClick={onEdit}
            title="Bewerken"
            className="p-2 text-gray-400 hover:text-white hover:bg-neutral-700 rounded-md transition"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            title="Verwijderen"
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-md transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {testResult && (
        <div className="mt-3">
          <PushResultBanner result={testResult} onDismiss={onDismissResult} />
        </div>
      )}
    </div>
  );
}

function NotificationModal({
  editing,
  employees,
  onClose,
  onSaved,
}: {
  editing: ScheduledNotification | null;
  employees: User[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ScheduledNotificationCreate>(
    editing
      ? {
          title: editing.title,
          message: editing.message,
          send_time: editing.send_time,
          days_of_week: editing.days_of_week,
          is_active: editing.is_active,
          target_type: editing.target_type,
          target_employee_ids: editing.target_employee_ids,
        }
      : { ...DEFAULT_FORM }
  );

  const saveMutation = useMutation({
    mutationFn: async (data: ScheduledNotificationCreate) => {
      if (editing) {
        await api.put(`/api/notifications/scheduled/${editing.id}`, data);
      } else {
        await api.post('/api/notifications/scheduled', data);
      }
    },
    onSuccess: onSaved,
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Fout bij opslaan');
    },
  });

  const toggleDay = (day: number) => {
    setForm((f) => ({
      ...f,
      days_of_week: f.days_of_week.includes(day)
        ? f.days_of_week.filter((d) => d !== day)
        : [...f.days_of_week, day],
    }));
  };

  const toggleEmployee = (id: number) => {
    setForm((f) => {
      const ids = f.target_employee_ids ?? [];
      return {
        ...f,
        target_employee_ids: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: ScheduledNotificationCreate = {
      ...form,
      target_employee_ids: form.target_type === 'specific_users' ? form.target_employee_ids : null,
    };
    saveMutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-ofa-bg border border-neutral-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <h2 className="text-white font-semibold">
            {editing ? 'Herinnering Bewerken' : 'Nieuwe Herinnering'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Active toggle */}
          <div className="flex items-center justify-between gap-4 bg-ofa-bg-dark border border-neutral-700 rounded-lg px-4 py-3">
            <p className="text-white text-sm font-medium">Actief</p>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
              className={`relative w-12 h-6 rounded-full transition flex-shrink-0 ${
                form.is_active ? 'bg-ofa-red' : 'bg-neutral-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  form.is_active ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Titel <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
              className="w-full px-4 py-2.5 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-ofa-red"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Bericht <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              required
              rows={3}
              className="w-full px-4 py-2.5 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-ofa-red resize-none"
            />
          </div>

          {/* Send time */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Verzenddtijd</label>
            <input
              type="time"
              value={form.send_time}
              onChange={(e) => setForm((f) => ({ ...f, send_time: e.target.value }))}
              className="w-full sm:w-40 px-4 py-2.5 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
            />
            <p className="text-gray-500 text-xs mt-1">
              Server draait in UTC — pas de tijd hierop aan indien nodig
            </p>
          </div>

          {/* Days of week */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Dagen</label>
            <div className="flex flex-wrap gap-2">
              {ALL_DAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                    form.days_of_week.includes(day)
                      ? 'bg-ofa-red text-white'
                      : 'bg-ofa-bg-dark border border-neutral-700 text-gray-400 hover:text-white'
                  }`}
                >
                  {DAY_LABELS[day]}
                </button>
              ))}
            </div>
          </div>

          {/* Target type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Doelgroep</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="target_type"
                  checked={form.target_type === 'all_scheduled'}
                  onChange={() =>
                    setForm((f) => ({ ...f, target_type: 'all_scheduled', target_employee_ids: null }))
                  }
                  className="w-4 h-4"
                />
                <span className="text-white text-sm">Alle ingeplande medewerkers</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="target_type"
                  checked={form.target_type === 'specific_users'}
                  onChange={() =>
                    setForm((f) => ({
                      ...f,
                      target_type: 'specific_users',
                      target_employee_ids: f.target_employee_ids ?? [],
                    }))
                  }
                  className="w-4 h-4"
                />
                <span className="text-white text-sm">Specifieke medewerkers</span>
              </label>
            </div>
          </div>

          {/* Employee multi-select */}
          {form.target_type === 'specific_users' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Medewerkers selecteren
              </label>
              <div className="max-h-40 overflow-y-auto bg-ofa-bg-dark border border-neutral-700 rounded-lg divide-y divide-neutral-800">
                {employees.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">Geen actieve medewerkers</p>
                ) : (
                  employees.map((emp) => (
                    <label
                      key={emp.id}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-800 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={(form.target_employee_ids ?? []).includes(emp.id)}
                        onChange={() => toggleEmployee(emp.id)}
                        className="w-4 h-4 flex-shrink-0"
                      />
                      <span className="text-white text-sm">{emp.username}</span>
                      <span className="text-gray-500 text-xs truncate ml-auto">{emp.email}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-neutral-700 hover:bg-neutral-600 text-white font-medium rounded-lg transition"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="flex-1 px-4 py-2.5 bg-ofa-red hover:bg-ofa-red-hover disabled:bg-neutral-700 text-white font-medium rounded-lg transition"
            >
              {saveMutation.isPending ? 'Opslaan...' : editing ? 'Wijzigingen Opslaan' : 'Aanmaken'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared result banner
// ---------------------------------------------------------------------------

function PushResultBanner({
  result,
  onDismiss,
}: {
  result: BatchPushResponse;
  onDismiss: () => void;
}) {
  const allOk = result.success && result.failed_endpoints.length === 0;

  return (
    <div
      className={`flex items-start gap-3 rounded-lg px-4 py-3 text-sm border ${
        allOk
          ? 'bg-green-900/30 border-green-700 text-green-400'
          : 'bg-red-900/30 border-red-700 text-red-400'
      }`}
    >
      {allOk ? (
        <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      ) : (
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      )}
      <div className="flex-1">
        {result.total_recipients === 0 ? (
          <p>Geen actieve push-abonnementen gevonden voor de geselecteerde medewerkers.</p>
        ) : allOk ? (
          <p>{result.successful_count}/{result.total_recipients} push-notificaties succesvol verzonden</p>
        ) : (
          <p>
            {result.successful_count}/{result.total_recipients} verzonden.
            {result.failed_endpoints.length > 0 && (
              <> {result.failed_endpoints.length} mislukt.</>
            )}
          </p>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="text-current opacity-60 hover:opacity-100 text-lg leading-none flex-shrink-0"
      >
        ×
      </button>
    </div>
  );
}
