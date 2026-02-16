import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Activity, Palmtree, FileText } from 'lucide-react';
import { api } from '../utils/api';
import type { Absence } from '../types/api';

export default function Absences() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Fetch user's absences
  const { data: absences = [], isLoading } = useQuery({
    queryKey: ['absences', 'mine'],
    queryFn: async () => {
      const response = await api.get<Absence[]>('/api/absences/my-absences');
      return response.data;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/absences/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      setDeletingId(null);
      alert('Verlof geannuleerd');
    },
    onError: (error: any) => {
      alert(error.response?.data?.detail || 'Fout bij annuleren');
      setDeletingId(null);
    },
  });

  const handleDelete = (id: number) => {
    if (confirm('Weet je zeker dat je dit verlof wilt annuleren?')) {
      setDeletingId(id);
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold text-white mb-4">Verlof</h1>
        <p className="text-gray-400">Laden...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Request button */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Verlof</h1>
        <button
          onClick={() => navigate('/absences/request')}
          className="px-4 py-2 bg-ofa-red hover:bg-ofa-red-hover text-white rounded-lg transition"
        >
          Aanvragen
        </button>
      </div>

      {/* Absences List */}
      {absences.length === 0 ? (
        <div className="bg-ofa-bg border border-neutral-800 rounded-lg p-6">
          <p className="text-gray-400 text-center">Geen verlofaanvragen</p>
          <button
            onClick={() => navigate('/absences/request')}
            className="mt-4 w-full py-3 bg-ofa-red hover:bg-ofa-red-hover text-white rounded-lg transition"
          >
            Verlof Aanvragen
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {absences.map((absence) => (
            <AbsenceCard
              key={absence.id}
              absence={absence}
              onDelete={handleDelete}
              isDeleting={deletingId === absence.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AbsenceCard({
  absence,
  onDelete,
  isDeleting
}: {
  absence: Absence;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sick': return <Activity className="w-5 h-5 text-blue-400" />;
      case 'vacation': return <Palmtree className="w-5 h-5 text-green-400" />;
      case 'personal': return <FileText className="w-5 h-5 text-purple-400" />;
      default: return null;
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-400 bg-green-900/30 border-green-500';
      case 'rejected': return 'text-red-400 bg-red-900/30 border-red-500';
      case 'pending': return 'text-yellow-400 bg-yellow-900/30 border-yellow-500';
      default: return 'text-gray-400 bg-neutral-800 border-neutral-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Goedgekeurd';
      case 'rejected': return 'Afgewezen';
      case 'pending': return 'In afwachting';
      default: return status;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const canDelete = absence.status === 'pending';

  return (
    <div className="bg-ofa-bg border border-neutral-800 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            {getTypeIcon(absence.type)}
            {getTypeLabel(absence.type)}
          </p>
          <p className="text-sm text-gray-400">
            {formatDate(absence.start_date)}
            {absence.end_date && ` - ${formatDate(absence.end_date)}`}
          </p>
        </div>
        <span className={`px-3 py-1 text-sm rounded-full border ${getStatusColor(absence.status)}`}>
          {getStatusLabel(absence.status)}
        </span>
      </div>

      {absence.reason && (
        <div className="bg-neutral-800 rounded p-3 mb-3">
          <p className="text-sm text-gray-400 mb-1">Reden:</p>
          <p className="text-white text-sm">{absence.reason}</p>
        </div>
      )}

      {absence.admin_notes && (
        <div className="bg-neutral-800 rounded p-3 mb-3">
          <p className="text-sm text-gray-400 mb-1">Notitie van admin:</p>
          <p className="text-white text-sm">{absence.admin_notes}</p>
        </div>
      )}

      {canDelete && (
        <button
          onClick={() => onDelete(absence.id)}
          disabled={isDeleting}
          className="w-full py-2 bg-red-600 hover:bg-red-700 disabled:bg-neutral-700 text-white rounded-lg transition"
        >
          {isDeleting ? 'Annuleren...' : 'Annuleren'}
        </button>
      )}
    </div>
  );
}
