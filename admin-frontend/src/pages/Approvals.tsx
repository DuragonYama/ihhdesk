import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import type { Absence, ApproveRejectRequest } from '../types/api';

const TYPE_COLORS = {
  sick: 'bg-blue-500/20 text-blue-400',
  personal: 'bg-green-500/20 text-green-400',
  vacation: 'bg-cyan-500/20 text-cyan-400',
};

const TYPE_NAMES_NL = {
  sick: 'Ziek',
  personal: 'Persoonlijk',
  vacation: 'Vakantie',
};

export default function Approvals() {
  const [approvingAbsence, setApprovingAbsence] = useState<Absence | null>(null);
  const [rejectingAbsence, setRejectingAbsence] = useState<Absence | null>(null);
  const queryClient = useQueryClient();

  // Fetch pending absences
  const { data: absences = [], isLoading } = useQuery({
    queryKey: ['absences', 'pending'],
    queryFn: async () => {
      const response = await api.get<Absence[]>('/api/absences/pending');
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Laden...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Goedkeuringen</h1>
        <p className="text-gray-400 mt-1">{absences.length} wachtende aanvragen</p>
      </div>

      {/* Absences Table */}
      {absences.length === 0 ? (
        <div className="bg-ofa-bg rounded-lg border border-neutral-800 p-12 text-center">
          <p className="text-gray-400 text-lg">Geen wachtende aanvragen</p>
        </div>
      ) : (
        <div className="bg-ofa-bg rounded-lg border border-neutral-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-800">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Medewerker</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Type</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Datum</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Reden</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Aangemaakt</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {absences.map((absence) => (
                  <tr key={absence.id} className="hover:bg-neutral-800/50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-ofa-red rounded-full flex items-center justify-center text-white font-bold">
                          {absence.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-white font-medium">{absence.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${TYPE_COLORS[absence.type]}`}>
                        {TYPE_NAMES_NL[absence.type]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      {formatDateNL(absence.start_date)}
                      {absence.end_date && absence.end_date !== absence.start_date && (
                        <> t/m {formatDateNL(absence.end_date)}</>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-400 max-w-xs truncate">{absence.reason}</td>
                    <td className="px-6 py-4 text-gray-400">
                      {new Date(absence.created_at).toLocaleDateString('nl-NL')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setApprovingAbsence(absence)}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition"
                        >
                          Goedkeuren
                        </button>
                        <button
                          onClick={() => setRejectingAbsence(absence)}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition"
                        >
                          Afwijzen
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {approvingAbsence && (
        <ApproveModal
          absence={approvingAbsence}
          onClose={() => setApprovingAbsence(null)}
          onSuccess={() => {
            setApprovingAbsence(null);
            queryClient.invalidateQueries({ queryKey: ['absences', 'pending'] });
          }}
        />
      )}

      {/* Reject Modal */}
      {rejectingAbsence && (
        <RejectModal
          absence={rejectingAbsence}
          onClose={() => setRejectingAbsence(null)}
          onSuccess={() => {
            setRejectingAbsence(null);
            queryClient.invalidateQueries({ queryKey: ['absences', 'pending'] });
          }}
        />
      )}
    </div>
  );
}

// Helper function to format dates in Dutch
function formatDateNL(dateStr: string): string {
  const date = new Date(dateStr);
  const months = [
    'januari', 'februari', 'maart', 'april', 'mei', 'juni',
    'juli', 'augustus', 'september', 'oktober', 'november', 'december'
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

// Approve Modal Component
function ApproveModal({ absence, onClose, onSuccess }: { absence: Absence; onClose: () => void; onSuccess: () => void }) {
  const [message, setMessage] = useState('');
  const [useCustomMessage, setUseCustomMessage] = useState(false);

  const approveMutation = useMutation({
    mutationFn: async (data: ApproveRejectRequest) => {
      const response = await api.patch(`/api/absences/${absence.id}/approve`, data);
      return response.data;
    },
    onSuccess: () => {
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    approveMutation.mutate(useCustomMessage ? { message } : {});
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-ofa-bg rounded-lg max-w-md w-full p-6 border border-neutral-800">
        <h2 className="text-xl font-bold text-white mb-4">Aanvraag Goedkeuren</h2>

        <div className="mb-4 p-4 bg-neutral-800 rounded-lg">
          <p className="text-gray-400 text-sm">
            <span className="font-medium text-white">{absence.username}</span> - {TYPE_NAMES_NL[absence.type]}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {formatDateNL(absence.start_date)}
            {absence.end_date && absence.end_date !== absence.start_date && (
              <> t/m {formatDateNL(absence.end_date)}</>
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="custom_message"
              checked={useCustomMessage}
              onChange={(e) => setUseCustomMessage(e.target.checked)}
              className="w-4 h-4 text-ofa-red bg-ofa-bg-dark border-neutral-700 rounded"
            />
            <label htmlFor="custom_message" className="text-sm text-gray-300">
              Voeg persoonlijk bericht toe
            </label>
          </div>

          {useCustomMessage && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Bericht (optioneel)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red resize-none"
                placeholder="Bijvoorbeeld: Geniet van je vrije tijd!"
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={approveMutation.isPending}
              className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={approveMutation.isPending}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-neutral-700 text-white rounded-lg transition"
            >
              {approveMutation.isPending ? 'Goedkeuren...' : 'Goedkeuren'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Reject Modal Component
function RejectModal({ absence, onClose, onSuccess }: { absence: Absence; onClose: () => void; onSuccess: () => void }) {
  const [message, setMessage] = useState('');
  const [useCustomMessage, setUseCustomMessage] = useState(false);

  const rejectMutation = useMutation({
    mutationFn: async (data: ApproveRejectRequest) => {
      const response = await api.patch(`/api/absences/${absence.id}/reject`, data);
      return response.data;
    },
    onSuccess: () => {
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    rejectMutation.mutate(useCustomMessage ? { message } : {});
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-ofa-bg rounded-lg max-w-md w-full p-6 border border-neutral-800">
        <h2 className="text-xl font-bold text-white mb-4">Aanvraag Afwijzen</h2>

        <div className="mb-4 p-4 bg-neutral-800 rounded-lg">
          <p className="text-gray-400 text-sm">
            <span className="font-medium text-white">{absence.username}</span> - {TYPE_NAMES_NL[absence.type]}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {formatDateNL(absence.start_date)}
            {absence.end_date && absence.end_date !== absence.start_date && (
              <> t/m {formatDateNL(absence.end_date)}</>
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="custom_message_reject"
              checked={useCustomMessage}
              onChange={(e) => setUseCustomMessage(e.target.checked)}
              className="w-4 h-4 text-ofa-red bg-ofa-bg-dark border-neutral-700 rounded"
            />
            <label htmlFor="custom_message_reject" className="text-sm text-gray-300">
              Voeg reden toe
            </label>
          </div>

          {useCustomMessage && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Reden (optioneel)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 bg-ofa-bg-dark border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-ofa-red resize-none"
                placeholder="Bijvoorbeeld: We hebben je nodig in die periode."
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={rejectMutation.isPending}
              className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={rejectMutation.isPending}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-neutral-700 text-white rounded-lg transition"
            >
              {rejectMutation.isPending ? 'Afwijzen...' : 'Afwijzen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}