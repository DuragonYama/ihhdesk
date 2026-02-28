import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Send, Clock, CheckCircle, AlertCircle, FlaskConical, Info } from 'lucide-react';
import { api } from '../utils/api';
import type {
  User,
  BatchPushRequest,
  BatchPushResponse,
  DailyReminderConfig,
} from '../types/api';

type Tab = 'send' | 'reminder';

export default function Notifications() {
  const [activeTab, setActiveTab] = useState<Tab>('send');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Meldingen</h1>
        <p className="text-gray-400 mt-1">Verstuur push-notificaties naar medewerkers of configureer de dagelijkse herinnering</p>
      </div>

      {/* Tab bar */}
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
          onClick={() => setActiveTab('reminder')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition flex-1 sm:flex-none justify-center ${
            activeTab === 'reminder'
              ? 'bg-ofa-red text-white'
              : 'text-gray-400 hover:text-white hover:bg-neutral-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          Dagelijkse Herinnering
        </button>
      </div>

      {activeTab === 'send' ? <BatchSendTab /> : <DailyReminderTab />}
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
      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-900/20 border border-blue-800 rounded-lg px-4 py-3 text-blue-300 text-sm">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>Medewerkers ontvangen alleen push-notificaties als ze dit hebben geaccepteerd in de medewerkers-app.</p>
      </div>

      <div className="bg-ofa-bg rounded-lg border border-neutral-800 p-4 md:p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {result && (
            <PushResultBanner result={result} onDismiss={() => setResult(null)} />
          )}

          {/* Employee selection */}
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

          {/* Recipient counter */}
          <div className="bg-ofa-bg-dark border border-neutral-700 rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-gray-300 text-sm font-medium">Geselecteerde ontvangers</span>
            <span className="text-xl font-bold text-ofa-red">{selectedIds.length}</span>
          </div>

          {/* Title */}
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

          {/* Message */}
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
// Tab 2: Daily reminder configuration
// ---------------------------------------------------------------------------

function DailyReminderTab() {
  const queryClient = useQueryClient();
  const [testResult, setTestResult] = useState<BatchPushResponse | null>(null);

  const { data: config, isLoading } = useQuery({
    queryKey: ['reminder-config'],
    queryFn: async () => {
      const res = await api.get<DailyReminderConfig>('/api/notifications/reminder');
      return res.data;
    },
  });

  const [form, setForm] = useState<DailyReminderConfig>({
    is_enabled: false,
    send_time: '07:30',
    title: 'Vergeet niet in te klokken!',
    message: 'Goedemorgen! Vergeet niet in te klokken vandaag.',
  });

  const [synced, setSynced] = useState(false);
  if (config && !synced) {
    setForm(config);
    setSynced(true);
  }

  const saveMutation = useMutation({
    mutationFn: async (data: DailyReminderConfig) => {
      const res = await api.put<DailyReminderConfig>('/api/notifications/reminder', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminder-config'] });
      setSynced(false);
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Fout bij opslaan configuratie');
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<BatchPushResponse>('/api/notifications/reminder/test');
      return res.data;
    },
    onSuccess: (data) => setTestResult(data),
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Fout bij testverzending');
    },
  });

  if (isLoading) {
    return (
      <div className="bg-ofa-bg rounded-lg border border-neutral-800 p-6 flex items-center justify-center">
        <p className="text-gray-400">Laden...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-900/20 border border-blue-800 rounded-lg px-4 py-3 text-blue-300 text-sm">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>De herinnering wordt verstuurd naar medewerkers die ingepland staan voor vandaag en push-notificaties hebben geaccepteerd.</p>
      </div>

      <div className="bg-ofa-bg rounded-lg border border-neutral-800 p-4 md:p-6">
        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-6">
          {saveMutation.isSuccess && (
            <div className="flex items-center gap-3 bg-green-900/30 border border-green-700 rounded-lg px-4 py-3 text-green-400 text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              Instellingen opgeslagen
            </div>
          )}

          {testResult && (
            <PushResultBanner result={testResult} onDismiss={() => setTestResult(null)} />
          )}

          {/* Enable toggle */}
          <div className="flex items-center justify-between gap-4 bg-ofa-bg-dark border border-neutral-700 rounded-lg px-4 py-3">
            <div>
              <p className="text-white font-medium text-sm">Herinnering inschakelen</p>
              <p className="text-gray-500 text-xs mt-0.5">Dagelijkse push aan ingeplande medewerkers</p>
            </div>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, is_enabled: !f.is_enabled }))}
              className={`relative w-12 h-6 rounded-full transition flex-shrink-0 ${
                form.is_enabled ? 'bg-ofa-red' : 'bg-neutral-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  form.is_enabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Send time */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Verzenddtijd</label>
            <input
              type="time"
              value={form.send_time}
              onChange={(e) => setForm((f) => ({ ...f, send_time: e.target.value }))}
              className="w-full sm:w-48 px-4 py-2.5 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red"
            />
            <p className="text-gray-500 text-xs mt-1">Server draait in UTC — pas de tijd hierop aan indien nodig</p>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Titel</label>
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
            <label className="block text-sm font-medium text-gray-300 mb-2">Bericht</label>
            <textarea
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              required
              rows={4}
              className="w-full px-4 py-2.5 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-ofa-red resize-none"
            />
          </div>

          {config?.updated_at && (
            <p className="text-gray-600 text-xs">
              Laatst bijgewerkt: {new Date(config.updated_at).toLocaleString('nl-NL')}
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-between">
            <button
              type="button"
              onClick={() => { setTestResult(null); testMutation.mutate(); }}
              disabled={testMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition justify-center"
            >
              <FlaskConical className="w-4 h-4" />
              {testMutation.isPending ? 'Bezig...' : 'Test versturen'}
            </button>

            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="flex items-center gap-2 px-6 py-2.5 bg-ofa-red hover:bg-ofa-red-hover disabled:bg-neutral-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition justify-center"
            >
              <CheckCircle className="w-4 h-4" />
              {saveMutation.isPending ? 'Opslaan...' : 'Instellingen Opslaan'}
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
      <button onClick={onDismiss} className="text-current opacity-60 hover:opacity-100 text-lg leading-none flex-shrink-0">
        ×
      </button>
    </div>
  );
}
